

'use client';
import {
  CopyOutlined, DownloadOutlined, FileProtectOutlined, UnlockOutlined, UploadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert, Button, Card, Col, Divider, Input,
  Progress, Row, Space, Steps, Tag, Tooltip, Typography, message,
} from 'antd';
import React, { useState } from 'react';
import {
  aesDecrypt, b64ToBuf, bufToHex, hexToBuf, importPrivateKey, rsaDecryptKey, bufToStr,
} from '@/utils/crypto';

const { TextArea } = Input;
const { Text } = Typography;

type Step = 'idle' | 'load' | 'rsa-decrypt' | 'aes-decrypt' | 'done' | 'error';

interface DecryptResult {
  isText: boolean;
  text?: string;
  blobUrl?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  aesKeyHex: string;
}

const DecryptPage: React.FC = () => {
  // Inputs
  const [encFile, setEncFile] = useState<File | null>(null);           // .enc file
  const [keyJson, setKeyJson] = useState<{                             // parsed .key.json
    encAesKeyB64: string; ivHex: string;
    originalName: string; mimeType: string; sizeBytes: number;
  } | null>(null);
  const [keyJsonRaw, setKeyJsonRaw] = useState('');
  const [privateKeyPem, setPrivateKeyPem] = useState('');

  // State
  const [step, setStep] = useState<Step>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DecryptResult | null>(null);
  const [error, setError] = useState('');

  const copy = (t: string) => { navigator.clipboard.writeText(t); message.success('Đã sao chép!'); };

  // ── Load .key.json ─────────────────────────────────────────────
  const loadKeyJson = (file: File) => {
    const r = new FileReader();
    r.onload = e => {
      try {
        const raw = e.target!.result as string;
        const data = JSON.parse(raw);
        if (!data.encAesKeyB64 || !data.ivHex) throw new Error('File .key.json không hợp lệ');
        setKeyJson({
          encAesKeyB64: data.encAesKeyB64,
          ivHex: data.ivHex,
          originalName: data.originalName ?? 'decrypted',
          mimeType: data.mimeType ?? 'application/octet-stream',
          sizeBytes: data.sizeBytes ?? 0,
        });
        setKeyJsonRaw(raw);
        message.success('Đã tải file .key.json!');
      } catch (err: any) {
        message.error('File .key.json không hợp lệ: ' + err.message);
      }
    };
    r.readAsText(file);
  };

  // ── Main decrypt ───────────────────────────────────────────────
  const handleDecrypt = async () => {
    setError(''); setResult(null);

    if (!encFile) { message.warning('Upload file .enc trước!'); return; }
    if (!keyJson) { message.warning('Upload file .key.json trước!'); return; }
    if (!privateKeyPem.trim()) { message.warning('Nhập RSA Private Key!'); return; }

    try {
      setStep('load'); setProgress(15);

      // Read .enc file
      const ciphertextBuf = await encFile.arrayBuffer();

      // Import RSA private key
      setStep('rsa-decrypt'); setProgress(30);
      let privKey: CryptoKey;
      try {
        privKey = await importPrivateKey(privateKeyPem.trim());
      } catch {
        throw new Error('RSA Private Key không hợp lệ — kiểm tra định dạng PEM');
      }

      // RSA decrypt → recover AES key
      setProgress(50);
      let aesKeyRaw: ArrayBuffer;
      try {
        aesKeyRaw = await rsaDecryptKey(b64ToBuf(keyJson.encAesKeyB64), privKey);
      } catch {
        throw new Error('Giải mã AES key thất bại — private key không khớp với public key đã mã hóa');
      }

      const aesKeyHex = bufToHex(aesKeyRaw);

      // AES-GCM decrypt
      setStep('aes-decrypt'); setProgress(70);
      let plaintext: ArrayBuffer;
      try {
        plaintext = await aesDecrypt(
          ciphertextBuf,
          new Uint8Array(hexToBuf(keyJson.ivHex)),
          aesKeyRaw,
        );
      } catch {
        throw new Error('Giải mã AES thất bại — file bị sửa đổi, IV sai, hoặc key không khớp');
      }

      setProgress(95);

      // Build result
      const isText = keyJson.mimeType.startsWith('text/') || keyJson.originalName.endsWith('.txt');
      let text: string | undefined;
      let blobUrl: string | undefined;

      if (isText) {
        try { text = bufToStr(plaintext); } catch { text = '(binary)'; }
      } else {
        const blob = new Blob([plaintext], { type: keyJson.mimeType });
        blobUrl = URL.createObjectURL(blob);
      }

      setResult({
        isText, text, blobUrl,
        fileName: keyJson.originalName,
        mimeType: keyJson.mimeType,
        sizeBytes: plaintext.byteLength,
        aesKeyHex,
      });
      setProgress(100); setStep('done');
      message.success('Giải mã thành công!');
    } catch (e: any) {
      setStep('error');
      setError(e.message);
      message.error(e.message);
    }
  };

  const stepItems = [
    { title: 'Đọc file .enc', description: 'Load ciphertext binary' },
    { title: 'RSA → AES Key', description: 'Private key giải mã AES key' },
    { title: 'AES-GCM Decrypt', description: 'Khôi phục dữ liệu gốc' },
    { title: 'Hoàn thành', description: 'Tải file về' },
  ];
  const stepIdx = { idle:-1,load:0,'rsa-decrypt':1,'aes-decrypt':2,done:3,error:3 }[step];
  const busy = ['load','rsa-decrypt','aes-decrypt'].includes(step);

  return (
    <PageContainer title="🔓 Giải mã" subTitle="Upload .enc + .key.json + RSA private key → tải về file gốc">
      <Row gutter={[20, 20]}>
        {/* ── LEFT: Inputs ── */}
        <Col xs={24} lg={13}>

          {/* Step 1: .enc file */}
          <Card title="① File mã hóa (.enc)" style={{ marginBottom: 16 }}
            extra={encFile && <Tag color="green">✓ {encFile.name}</Tag>}>
            <input type="file" id="encInput" accept=".enc" style={{ display: 'none' }}
              onChange={e => setEncFile(e.target.files?.[0] ?? null)} />
            <Button icon={<UploadOutlined />} block size="large"
              onClick={() => document.getElementById('encInput')!.click()}
              style={{ borderStyle: encFile ? 'solid' : 'dashed', borderColor: encFile ? '#52c41a' : undefined }}>
              {encFile ? `✓ ${encFile.name} (${(encFile.size/1024).toFixed(1)} KB)` : 'Upload file .enc'}
            </Button>
          </Card>

          {/* Step 2: .key.json */}
          <Card title="② File metadata giải mã (.key.json)" style={{ marginBottom: 16 }}
            extra={keyJson && <Tag color="orange">✓ loaded</Tag>}>
            <input type="file" id="keyJsonInput" accept=".json" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && loadKeyJson(e.target.files[0])} />
            <Button icon={<UploadOutlined />} block size="large"
              onClick={() => document.getElementById('keyJsonInput')!.click()}
              style={{ borderStyle: keyJson ? 'solid' : 'dashed', borderColor: keyJson ? '#fa8c16' : undefined }}>
              {keyJson ? `✓ ${keyJson.originalName}.key.json` : 'Upload file .key.json'}
            </Button>

            {keyJson && (
              <div style={{ marginTop: 10, padding: 10, background: '#fafafa', borderRadius: 6, fontSize: 11, fontFamily: 'monospace' }}>
                <div>originalName: <Text strong>{keyJson.originalName}</Text></div>
                <div>ivHex: <Text code>{keyJson.ivHex}</Text></div>
                <div>encAesKeyB64: <Text code>{keyJson.encAesKeyB64.slice(0,40)}...</Text></div>
              </div>
            )}

            <Divider style={{ margin: '12px 0' }}>hoặc nhập thủ công</Divider>
            <TextArea value={keyJsonRaw} onChange={e => {
              setKeyJsonRaw(e.target.value);
              try {
                const d = JSON.parse(e.target.value);
                if (d.encAesKeyB64 && d.ivHex) setKeyJson(d);
              } catch {}
            }} rows={4} placeholder='{ "encAesKeyB64": "...", "ivHex": "...", ... }'
              style={{ fontFamily: 'monospace', fontSize: 11 }} />
          </Card>

          {/* Step 3: Private key */}
          <Card title="③ RSA Private Key (.pem)" style={{ marginBottom: 16 }}>
            <input type="file" id="privKeyInput" accept=".pem,.txt" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = ev => setPrivateKeyPem(ev.target!.result as string);
                r.readAsText(f);
              }} />
            <Button icon={<UploadOutlined />} block style={{ marginBottom: 8 }}
              onClick={() => document.getElementById('privKeyInput')!.click()}>
              Upload private_key.pem
            </Button>
            <TextArea value={privateKeyPem} onChange={e => setPrivateKeyPem(e.target.value)}
              rows={7} placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
              style={{ fontFamily: 'monospace', fontSize: 11 }} />
          </Card>

          {/* Decrypt button */}
          <Button size="large" block icon={<UnlockOutlined />}
            onClick={handleDecrypt} loading={busy} disabled={busy}
            style={{ height: 48, fontSize: 15, background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}>
            {busy ? 'Đang giải mã...' : 'Giải mã'}
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

          {error && (
            <Alert type="error" showIcon style={{ marginTop: 14 }}
              message="Giải mã thất bại" description={error} />
          )}
        </Col>

        {/* ── RIGHT: Result ── */}
        <Col xs={24} lg={11}>
          {!result ? (
            <Card style={{ height: '100%' }}>
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
                <UnlockOutlined style={{ fontSize: 56, marginBottom: 16 }} />
                <div style={{ fontSize: 14, marginBottom: 24 }}>File gốc sẽ xuất hiện ở đây</div>
                <div style={{ textAlign: 'left', display: 'inline-block', fontSize: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Cần 3 thứ để giải mã:</div>
                  <div>① <Text code>.enc</Text> — file đã mã hóa (AES ciphertext)</div>
                  <div>② <Text code>.key.json</Text> — metadata (encrypted AES key + IV)</div>
                  <div>③ <Text code>private_key.pem</Text> — RSA private key</div>
                  <Divider style={{ margin: '12px 0' }} />
                  <div style={{ color: '#52c41a' }}>✅ Private key chỉ dùng tại trình duyệt</div>
                  <div style={{ color: '#52c41a' }}>✅ Không gửi gì lên server</div>
                </div>
              </div>
            </Card>
          ) : (
            <Card title={<><UnlockOutlined style={{ color: '#52c41a' }} /> Giải mã thành công!</>}>
              <Alert type="success" showIcon style={{ marginBottom: 16 }}
                message={`${result.sizeBytes.toLocaleString()} bytes khôi phục thành công`} />

              {/* AES key recovered */}
              <div style={{ padding: 12, background: '#fff7e6', borderRadius: 8, border: '1px solid #ffd591', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#ad6800', marginBottom: 4, fontWeight: 600 }}>
                  🔑 AES Key được giải mã bởi RSA
                  <Tooltip title="Copy"><CopyOutlined style={{ marginLeft: 6, cursor: 'pointer' }} onClick={() => copy(result.aesKeyHex)} /></Tooltip>
                </div>
                <Text code style={{ fontSize: 10, wordBreak: 'break-all' }}>{result.aesKeyHex}</Text>
              </div>

              <Divider />

              {/* Text output */}
              {result.isText && (
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 6 }}>
                    📄 Nội dung gốc
                    <Tooltip title="Copy">
                      <CopyOutlined style={{ marginLeft: 6, cursor: 'pointer', color: '#1677ff' }}
                        onClick={() => copy(result.text ?? '')} />
                    </Tooltip>
                  </div>
                  <TextArea value={result.text} readOnly rows={10}
                    style={{ fontFamily: 'monospace', fontSize: 12, background: '#f6ffed', borderColor: '#b7eb8f' }} />
                  <Button icon={<DownloadOutlined />} style={{ marginTop: 10 }} block
                    href={URL.createObjectURL(new Blob([result.text ?? ''], { type: 'text/plain' }))}
                    download={result.fileName}>
                    Tải về {result.fileName}
                  </Button>
                </div>
              )}

              {/* File output */}
              {!result.isText && result.blobUrl && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <FileProtectOutlined style={{ fontSize: 56, color: '#52c41a', marginBottom: 12 }} />
                  <div style={{ marginBottom: 6 }}>
                    <Text strong>{result.fileName}</Text>
                    <Tag style={{ marginLeft: 8 }}>{result.mimeType || 'binary'}</Tag>
                  </div>
                  <div style={{ color: '#8c8c8c', marginBottom: 20 }}>
                    {result.sizeBytes.toLocaleString()} bytes
                  </div>
                  <Button type="primary" size="large" icon={<DownloadOutlined />}
                    href={result.blobUrl} download={result.fileName}
                    style={{ background: '#52c41a', borderColor: '#52c41a', width: '100%', height: 48 }}>
                    Tải về {result.fileName}
                  </Button>
                </div>
              )}

              <Divider />
              <Space>
                <Tag color="green">AES-256-GCM ✓</Tag>
                <Tag color="orange">RSA-OAEP ✓</Tag>
                <Tag color="blue">AuthTag verified ✓</Tag>
              </Space>
            </Card>
          )}
        </Col>
      </Row>
    </PageContainer>
  );
};

export default DecryptPage;