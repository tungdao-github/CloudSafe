'use client';
import {
  CopyOutlined, DownloadOutlined, FileProtectOutlined,
  LockOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert, Button, Card, Col, Divider, Progress,
  Row, Space, Steps, Tag, Tooltip, Typography, message,
} from 'antd';
import React, { useState } from 'react';

const { Text } = Typography;

type Step = 'idle' | 'uploading' | 'encrypting' | 'done' | 'error';

interface EncryptResult {
  encFileName: string;
  keyFileName: string;
  encBase64: string;
  keyJsonBase64: string;
  sizeBytes: number;
  keyPreview: {
    encryptedAesKeyBase64: string;
    ivBase64: string;
    authTagBase64: string;
    algorithm: string;
  };
}

const EncryptPage: React.FC = () => {
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<EncryptResult | null>(null);

  const copy = (text: string) => { navigator.clipboard.writeText(text); message.success('Đã sao chép!'); };

  const handleEncrypt = async () => {
    if (!inputFile) { message.warning('Chọn file trước!'); return; }

    setStep('uploading'); setProgress(15); setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', inputFile);

      setStep('encrypting'); setProgress(40);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch('/api/crypto/encrypt', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      setProgress(85);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Server lỗi');
      }

      const data = await res.json();

      // Parse key.json để hiển thị preview
      const keyJsonStr = atob(data.keyJsonBase64);
      const keyParsed = JSON.parse(keyJsonStr);

      setResult({
        encFileName: data.encFileName,
        keyFileName: data.keyFileName,
        encBase64: data.encBase64,
        keyJsonBase64: data.keyJsonBase64,
        sizeBytes: inputFile.size,
        keyPreview: {
          encryptedAesKeyBase64: keyParsed.encryptedAesKeyBase64,
          ivBase64: keyParsed.ivBase64,
          authTagBase64: keyParsed.authTagBase64,
          algorithm: keyParsed.algorithm,
        },
      });

      setProgress(100);
      setStep('done');
      message.success('Mã hóa thành công! Tải 2 file về bên phải.');
    } catch (e: any) {
      setStep('error');
      message.error(e.message);
    }
  };

  const downloadBase64 = (base64: string, fileName: string, mime: string) => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName; a.click();
    URL.revokeObjectURL(a.href);
  };

  const stepItems = [
    { title: 'Upload file', description: 'Gửi lên server' },
    { title: 'Sinh AES-256 Key', description: 'Key ngẫu nhiên + IV' },
    { title: 'AES-GCM Encrypt', description: 'Mã hóa toàn bộ file' },
    { title: 'RSA Encrypt AES Key', description: 'Bảo vệ AES key bằng RSA-2048' },
    { title: 'Hoàn thành', description: 'Tải 2 file về' },
  ];
  const stepIdx = { idle: -1, uploading: 0, encrypting: 2, done: 4, error: 4 }[step];
  const busy = ['uploading', 'encrypting'].includes(step);

  return (
    <PageContainer title="🔒 Mã hóa file" subTitle="Server mã hóa AES-256-GCM + RSA-OAEP-SHA256 — nhận về 2 file">
      <Row gutter={[20, 20]}>
        {/* ── LEFT ── */}
        <Col xs={24} lg={13}>
          {/* Chọn file */}
          <Card title="📁 File cần mã hóa" style={{ marginBottom: 16 }}>
            <input type="file" id="encFileInput" style={{ display: 'none' }}
              onChange={e => { setInputFile(e.target.files?.[0] ?? null); setResult(null); setStep('idle'); setProgress(0); }} />
            <Button icon={<FileProtectOutlined />} block size="large"
              onClick={() => document.getElementById('encFileInput')!.click()}
              style={{ borderStyle: inputFile ? 'solid' : 'dashed', borderColor: inputFile ? '#1677ff' : undefined }}>
              {inputFile ? `✓ ${inputFile.name}` : 'Chọn file (docx, pdf, zip, ...)'}
            </Button>
            {inputFile && (
              <Alert style={{ marginTop: 10 }} type="info" showIcon
                message={<><Text strong>{inputFile.name}</Text> — {(inputFile.size / 1024).toFixed(1)} KB — {inputFile.type || 'application/octet-stream'}</>} />
            )}
          </Card>

          {/* Giải thích flow */}
          <Card title="⚙️ Quy trình mã hóa (server-side)" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, lineHeight: 2.2 }}>
              <div>① Server sinh <Tag color="blue">AES-256 Key</Tag> + <Tag color="cyan">IV (nonce)</Tag> ngẫu nhiên</div>
              <div>② Dùng AES-256-GCM mã hóa file → <Tag color="geekblue">file.enc</Tag></div>
              <div>③ Server sinh cặp <Tag color="purple">RSA-2048</Tag> Public/Private Key</div>
              <div>④ Dùng RSA Public Key mã hóa AES Key → <Tag color="orange">encryptedAesKey</Tag></div>
              <div>⑤ Trả về <Tag color="geekblue">file.enc</Tag> + <Tag color="orange">file.key.json</Tag></div>
            </div>
            <Divider style={{ margin: '10px 0' }} />
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>
              🔐 Để giải mã cần cả 2 file — mất 1 trong 2 là không giải mã được
            </div>
          </Card>

          {/* Encrypt button */}
          <Button type="primary" size="large" block icon={<LockOutlined />}
            onClick={handleEncrypt} loading={busy} disabled={busy}
            style={{ height: 48, fontSize: 15 }}>
            {busy ? 'Đang mã hóa...' : 'Mã hóa file'}
          </Button>

          {/* Steps + Progress */}
          {step !== 'idle' && (
            <Card style={{ marginTop: 16 }}>
              <Steps size="small" current={stepIdx}
                status={step === 'error' ? 'error' : step === 'done' ? 'finish' : 'process'}
                items={stepItems} style={{ marginBottom: 14 }} />
              <Progress percent={progress}
                status={step === 'done' ? 'success' : step === 'error' ? 'exception' : 'active'} />
              {step === 'error' && (
                <Alert type="error" showIcon style={{ marginTop: 10 }}
                  message="Mã hóa thất bại — thử lại hoặc kiểm tra kết nối server" />
              )}
            </Card>
          )}
        </Col>

        {/* ── RIGHT: Result ── */}
        <Col xs={24} lg={11}>
          {!result ? (
            <Card style={{ height: '100%' }}>
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
                <LockOutlined style={{ fontSize: 56, marginBottom: 16 }} />
                <div style={{ fontSize: 14, marginBottom: 24 }}>Kết quả mã hóa sẽ hiện ở đây</div>
                <div style={{ textAlign: 'left', display: 'inline-block', fontSize: 12 }}>
                  <div style={{ marginBottom: 6 }}>Sau khi mã hóa nhận được 2 file:</div>
                  <div>📦 <Text strong>file.ext.enc</Text> — ciphertext (AES-GCM encrypted)</div>
                  <div>🗝 <Text strong>file.ext.key.json</Text> — chứa:</div>
                  <div style={{ paddingLeft: 16, color: '#595959' }}>• AES Key (đã mã hóa bởi RSA)</div>
                  <div style={{ paddingLeft: 16, color: '#595959' }}>• IV / nonce</div>
                  <div style={{ paddingLeft: 16, color: '#595959' }}>• Auth tag</div>
                  <div style={{ paddingLeft: 16, color: '#595959' }}>• RSA Private Key</div>
                  <Divider style={{ margin: '12px 0' }} />
                  <div>Để giải mã cần:</div>
                  <div>① File <Text code>.enc</Text></div>
                  <div>② File <Text code>.key.json</Text></div>
                </div>
              </div>
            </Card>
          ) : (
            <Card
              title={<><LockOutlined style={{ color: '#52c41a' }} /> Mã hóa thành công!</>}
              extra={<Button size="small" icon={<ReloadOutlined />}
                onClick={() => { setResult(null); setStep('idle'); setProgress(0); setInputFile(null); }}>Reset</Button>}
            >
              <Alert type="success" showIcon style={{ marginBottom: 16 }}
                message={
                  <Space>
                    <span>{result.sizeBytes.toLocaleString()} bytes</span>
                    <Tag color="blue">AES-256-GCM</Tag>
                    <Tag color="purple">RSA-OAEP-2048</Tag>
                  </Space>
                } />

              {/* Download .enc */}
              <div style={{ padding: 16, background: '#e6f4ff', borderRadius: 10, border: '1px solid #91caff', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>📦 File ciphertext (AES encrypted)</div>
                <div style={{ fontSize: 11, color: '#595959', marginBottom: 6, fontFamily: 'monospace' }}>
                  <Text code>{result.encFileName}</Text>
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 10, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {result.encBase64.slice(0, 72)}...
                </div>
                <Button type="primary" icon={<DownloadOutlined />} block
                  onClick={() => downloadBase64(result.encBase64, result.encFileName, 'application/octet-stream')}>
                  Tải về {result.encFileName}
                </Button>
              </div>

              {/* Download .key.json */}
              <div style={{ padding: 16, background: '#fff7e6', borderRadius: 10, border: '1px solid #ffc069', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>🗝 File key (RSA-encrypted AES key + IV)</div>
                <div style={{ fontSize: 11, color: '#595959', marginBottom: 6 }}>
                  <Text code>{result.keyFileName}</Text>
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4, fontFamily: 'monospace' }}>
                  <div>encryptedAesKey: <Text code>{result.keyPreview.encryptedAesKeyBase64.slice(0, 36)}...</Text></div>
                  <div>iv: <Text code>{result.keyPreview.ivBase64}</Text></div>
                  <div>authTag: <Text code>{result.keyPreview.authTagBase64}</Text></div>
                  <div>algo: <Text code>{result.keyPreview.algorithm}</Text></div>
                </div>
                <Button icon={<DownloadOutlined />} block
                  style={{ borderColor: '#fa8c16', color: '#fa8c16' }}
                  onClick={() => downloadBase64(result.keyJsonBase64, result.keyFileName, 'application/json')}>
                  Tải về {result.keyFileName}
                </Button>
              </div>

              <Alert type="warning" showIcon
                message="⚠️ Lưu cả 2 file! Mất 1 trong 2 là không giải mã được."
                style={{ marginBottom: 12 }} />

              <Alert type="info" showIcon
                message={<span>Vào trang <Text strong>Giải mã</Text> → upload <Text code>.enc</Text> + <Text code>.key.json</Text> → tải về file gốc</span>} />
            </Card>
          )}
        </Col>
      </Row>
    </PageContainer>
  );
};

export default EncryptPage;