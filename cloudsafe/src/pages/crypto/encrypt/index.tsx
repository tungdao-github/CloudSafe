'use client';
import {
  CopyOutlined, DownloadOutlined, FileProtectOutlined,
  KeyOutlined, LockOutlined, ReloadOutlined, UploadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert, Button, Card, Col, Divider, Input,
  Progress, Radio, Row, Space, Steps, Tag, Tooltip,
  Typography, Upload, message,
} from 'antd';
import React, { useState } from 'react';
import {
  aesEncrypt, bufToB64, bufToHex, generateRsaKeyPair,
  importPublicKey, rsaEncryptKey, strToBuf,
} from '@/utils/crypto';

const { TextArea } = Input;
const { Text } = Typography;

type Mode = 'text' | 'file';
type Step = 'idle' | 'aes-keygen' | 'aes-encrypt' | 'rsa-encrypt' | 'done' | 'error';

interface EncryptResult {
  // File .enc — ciphertext binary
  ciphertextBytes: Uint8Array;
  ciphertextB64: string;
  // File .key.json — metadata để giải mã
  encAesKeyB64: string;
  ivHex: string;
  aesKeyHex: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

const EncryptPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('text');
  const [inputText, setInputText] = useState('');
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [publicKeyPem, setPublicKeyPem] = useState('');
  const [genKeysResult, setGenKeysResult] = useState<{ pub: string; priv: string } | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<EncryptResult | null>(null);

  const copy = (text: string) => { navigator.clipboard.writeText(text); message.success('Đã sao chép!'); };

  // ── Generate RSA key pair ──────────────────────────────────────
  const handleGenKeys = async () => {
    message.loading({ content: 'Đang sinh khóa RSA-2048...', key: 'gk' });
    try {
      const kp = await generateRsaKeyPair(2048);
      setGenKeysResult({ pub: kp.publicKeyPem, priv: kp.privateKeyPem });
      setPublicKeyPem(kp.publicKeyPem);
      message.success({ content: 'Sinh khóa thành công!', key: 'gk' });
    } catch (e: any) {
      message.error({ content: e.message, key: 'gk' });
    }
  };

  // ── Encrypt ────────────────────────────────────────────────────
  const handleEncrypt = async () => {
    if (mode === 'text' && !inputText.trim()) { message.warning('Nhập văn bản!'); return; }
    if (mode === 'file' && !inputFile) { message.warning('Chọn file!'); return; }
    if (!publicKeyPem.trim()) { message.warning('Nhập RSA Public Key!'); return; }

    setStep('aes-keygen'); setProgress(10); setResult(null);
    try {
      // Import public key
      let pubKey: CryptoKey;
      try { pubKey = await importPublicKey(publicKeyPem.trim()); }
      catch { throw new Error('Public key không hợp lệ — kiểm tra định dạng PEM'); }

      // Get data
      setStep('aes-encrypt'); setProgress(30);
      const data: ArrayBuffer = mode === 'text'
        ? strToBuf(inputText)
        : await inputFile!.arrayBuffer();

      // AES-256-GCM encrypt
      const aes = await aesEncrypt(data);
      setProgress(65);

      // RSA-OAEP encrypt AES key
      setStep('rsa-encrypt'); setProgress(75);
      const encAesKey = await rsaEncryptKey(aes.aesKeyRaw, pubKey);

      setProgress(100);
      setStep('done');
      setResult({
        ciphertextBytes: new Uint8Array(aes.ciphertext),
        ciphertextB64: bufToB64(aes.ciphertext),
        encAesKeyB64: bufToB64(encAesKey),
        ivHex: aes.ivHex,
        aesKeyHex: aes.aesKeyHex,
        originalName: mode === 'file' ? inputFile!.name : 'plaintext.txt',
        mimeType: mode === 'file' ? (inputFile!.type || 'application/octet-stream') : 'text/plain',
        sizeBytes: data.byteLength,
      });
      message.success('Mã hóa thành công! Tải 2 file bên phải về.');
    } catch (e: any) {
      setStep('error');
      message.error(e.message);
    }
  };

  // ── Download .enc file (binary ciphertext) ─────────────────────
  const downloadEnc = () => {
    if (!result) return;
    const blob = new Blob([result.ciphertextBytes], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = result.originalName + '.enc';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Download .key.json (metadata để giải mã) ───────────────────
  const downloadKeyJson = () => {
    if (!result) return;
    const payload = JSON.stringify({
      originalName: result.originalName,
      mimeType: result.mimeType,
      sizeBytes: result.sizeBytes,
      algorithm: 'AES-256-GCM + RSA-OAEP-SHA256',
      encAesKeyB64: result.encAesKeyB64,   // RSA-encrypted AES key
      ivHex: result.ivHex,                  // nonce
    }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = result.originalName + '.key.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Download private key ───────────────────────────────────────
  const downloadPrivKey = () => {
    if (!genKeysResult) return;
    const blob = new Blob([genKeysResult.priv], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'private_key.pem';
    a.click();
  };

  const stepItems = [
    { title: 'Sinh AES-256 Key', description: 'crypto.subtle.generateKey' },
    { title: 'AES-GCM Encrypt', description: 'Mã hóa dữ liệu' },
    { title: 'RSA Encrypt AES Key', description: 'Bảo vệ AES key bằng RSA' },
    { title: 'Hoàn thành', description: 'Tải file về' },
  ];
  const stepIdx = { idle:-1,'aes-keygen':0,'aes-encrypt':1,'rsa-encrypt':2,done:3,error:3 }[step];
  const busy = ['aes-keygen','aes-encrypt','rsa-encrypt'].includes(step);

  return (
    <PageContainer title="🔒 Mã hóa" subTitle="AES-256-GCM + RSA-OAEP — pure client-side, tải về file .enc">
      <Row gutter={[20, 20]}>
        {/* ── LEFT ── */}
        <Col xs={24} lg={13}>
          {/* Mode toggle */}
          <Card style={{ marginBottom: 16 }}>
            <Radio.Group value={mode} onChange={e => { setMode(e.target.value); setResult(null); setStep('idle'); }}>
              <Radio.Button value="text">📝 Văn bản</Radio.Button>
              <Radio.Button value="file">📁 File</Radio.Button>
            </Radio.Group>
          </Card>

          {/* Input data */}
          <Card title={mode === 'text' ? '📝 Văn bản cần mã hóa' : '📁 File cần mã hóa'} style={{ marginBottom: 16 }}>
            {mode === 'text' ? (
              <TextArea value={inputText} onChange={e => setInputText(e.target.value)}
                rows={5} placeholder="Nhập nội dung cần mã hóa..." style={{ fontFamily: 'monospace' }} />
            ) : (
              <div>
                <input type="file" id="encFileInput" style={{ display: 'none' }}
                  onChange={e => setInputFile(e.target.files?.[0] ?? null)} />
                <Button icon={<FileProtectOutlined />} block size="large"
                  onClick={() => document.getElementById('encFileInput')!.click()}>
                  Chọn file
                </Button>
                {inputFile && (
                  <Alert style={{ marginTop: 10 }} type="info" showIcon
                    message={<><Text strong>{inputFile.name}</Text> — {(inputFile.size / 1024).toFixed(1)} KB</>} />
                )}
              </div>
            )}
          </Card>

          {/* RSA Public Key input */}
          <Card title="🔑 RSA Public Key"
            extra={<Button size="small" icon={<KeyOutlined />} onClick={handleGenKeys}>Sinh khóa mới</Button>}
            style={{ marginBottom: 16 }}>

            {genKeysResult && (
              <Alert type="warning" showIcon style={{ marginBottom: 12 }}
                message="⚠️ Lưu Private Key ngay — chỉ hiển thị một lần!"
                description={
                  <Space>
                    <Button size="small" icon={<CopyOutlined />}
                      onClick={() => copy(genKeysResult.priv)}>Copy Private Key</Button>
                    <Button size="small" icon={<DownloadOutlined />}
                      onClick={downloadPrivKey}>Tải private_key.pem</Button>
                  </Space>
                }
              />
            )}

            <TextArea value={publicKeyPem} onChange={e => setPublicKeyPem(e.target.value)}
              rows={6} placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
              style={{ fontFamily: 'monospace', fontSize: 11 }} />
          </Card>

          {/* Encrypt button */}
          <Button type="primary" size="large" block icon={<LockOutlined />}
            onClick={handleEncrypt} loading={busy} disabled={busy} style={{ height: 48, fontSize: 15 }}>
            {busy ? 'Đang mã hóa...' : 'Mã hóa'}
          </Button>

          {/* Progress */}
          {step !== 'idle' && (
            <Card style={{ marginTop: 16 }}>
              <Steps size="small" current={stepIdx} status={step === 'error' ? 'error' : 'process'}
                items={stepItems} style={{ marginBottom: 14 }} />
              <Progress percent={progress}
                status={step === 'done' ? 'success' : step === 'error' ? 'exception' : 'active'} />
            </Card>
          )}
        </Col>

        {/* ── RIGHT: Result ── */}
        <Col xs={24} lg={11}>
          {!result ? (
            <Card style={{ height: '100%' }}>
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#8c8c8c' }}>
                <LockOutlined style={{ fontSize: 56, marginBottom: 16 }} />
                <div style={{ fontSize: 14, marginBottom: 24 }}>Kết quả mã hóa sẽ hiện ở đây</div>
                <div style={{ textAlign: 'left', display: 'inline-block', fontSize: 12 }}>
                  <div style={{ marginBottom: 6 }}>Sau khi mã hóa bạn nhận được:</div>
                  <div>📦 <Text strong>file.ext.enc</Text> — ciphertext binary</div>
                  <div>🗝 <Text strong>file.ext.key.json</Text> — metadata giải mã</div>
                  <Divider style={{ margin: '12px 0' }} />
                  <div>Để giải mã cần:</div>
                  <div>① File <Text code>.enc</Text></div>
                  <div>② File <Text code>.key.json</Text></div>
                  <div>③ RSA Private Key (<Text code>.pem</Text>)</div>
                </div>
              </div>
            </Card>
          ) : (
            <Card
              title={<><LockOutlined style={{ color: '#52c41a' }} /> Mã hóa thành công!</>}
              extra={<Button size="small" icon={<ReloadOutlined />} onClick={() => { setResult(null); setStep('idle'); setProgress(0); }}>Reset</Button>}
            >
              <Alert type="success" showIcon style={{ marginBottom: 20 }}
                message={`${result.sizeBytes.toLocaleString()} bytes → AES-256-GCM + RSA-OAEP-2048`} />

              {/* Download .enc */}
              <div style={{ padding: 16, background: '#e6f4ff', borderRadius: 10, border: '1px solid #91caff', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>📦 File ciphertext (binary)</div>
                <div style={{ fontSize: 12, color: '#595959', marginBottom: 10 }}>
                  <Text code>{result.originalName}.enc</Text>
                  {' '}— {Math.ceil(result.sizeBytes * 1.01 / 1024).toFixed(1)} KB
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 10, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {result.ciphertextB64.slice(0, 80)}...
                </div>
                <Button type="primary" icon={<DownloadOutlined />} onClick={downloadEnc} block>
                  Tải về {result.originalName}.enc
                </Button>
              </div>

              {/* Download .key.json */}
              <div style={{ padding: 16, background: '#fff7e6', borderRadius: 10, border: '1px solid #ffc069', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>🗝 File metadata giải mã</div>
                <div style={{ fontSize: 12, color: '#595959', marginBottom: 10 }}>
                  <Text code>{result.originalName}.key.json</Text> — chứa encrypted AES key + IV
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 10 }}>
                  <div>encAesKeyB64: {result.encAesKeyB64.slice(0, 40)}...</div>
                  <div>ivHex: {result.ivHex}</div>
                </div>
                <Button icon={<DownloadOutlined />} onClick={downloadKeyJson} block style={{ borderColor: '#fa8c16', color: '#fa8c16' }}>
                  Tải về {result.originalName}.key.json
                </Button>
              </div>

              {/* AES key (display only) */}
              <div style={{ padding: 14, background: '#fff1f0', borderRadius: 10, border: '1px solid #ff7875' }}>
                <div style={{ fontWeight: 600, color: '#cf1322', marginBottom: 6 }}>
                  🔑 AES Key gốc (256-bit) — CHỈ HIỂN THỊ LẦN NÀY
                  <Tooltip title="Copy">
                    <CopyOutlined style={{ marginLeft: 8, cursor: 'pointer' }} onClick={() => copy(result.aesKeyHex)} />
                  </Tooltip>
                </div>
                <Text code style={{ fontSize: 10, wordBreak: 'break-all' }}>{result.aesKeyHex}</Text>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 6 }}>
                  Key này đã được mã hóa bằng RSA và lưu trong file .key.json. Không cần lưu riêng.
                </div>
              </div>

              <Divider />
              <Alert type="info" showIcon
                message="Bước tiếp theo"
                description={
                  <div>
                    Vào trang <Text strong>Giải mã</Text> → upload file <Text code>.enc</Text> + <Text code>.key.json</Text> + nhập RSA private key → tải về file gốc.
                  </div>
                }
              />
            </Card>
          )}
        </Col>
      </Row>
    </PageContainer>
  );
};

export default EncryptPage;