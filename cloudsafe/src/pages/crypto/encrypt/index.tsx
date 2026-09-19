import {
  FileProtectOutlined, LockOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert, Button, Card, Col, Progress, Row, Typography, message,
} from 'antd';
import React, { useState } from 'react';

const { Text } = Typography;

const EncryptPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    encFileName: string;
    keyFileName: string;
    encBase64: string;
    keyJsonBase64: string;
  } | null>(null);

  const handleEncrypt = async () => {
    if (!file) { message.warning('Chưa chọn file!'); return; }

    setLoading(true);
    setProgress(20);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress(40);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch('/api/crypto/encrypt', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      setProgress(80);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Server lỗi');
      }

      const data = await res.json();
      setResult(data);
      setProgress(100);
      message.success('Mã hóa thành công! Tải 2 file về bên dưới.');
    } catch (e: any) {
      message.error(e.message);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const downloadBase64 = (base64: string, fileName: string, mime: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteNumbers], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageContainer title="🔒 Mã hóa file" subTitle="Server mã hóa AES-256-GCM + RSA-OAEP, trả về 2 file">
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="📁 Chọn file cần mã hóa">
            <input type="file" id="encInput" style={{ display: 'none' }}
              onChange={e => { setFile(e.target.files?.[0] ?? null); setResult(null); setProgress(0); }} />
            <Button icon={<FileProtectOutlined />} block size="large"
              onClick={() => document.getElementById('encInput')!.click()}>
              Chọn file
            </Button>

            {file && (
              <Alert style={{ marginTop: 12 }} type="info" showIcon
                message={<><Text strong>{file.name}</Text> — {(file.size / 1024).toFixed(1)} KB</>} />
            )}

            <Button type="primary" size="large" block icon={<LockOutlined />}
              onClick={handleEncrypt} loading={loading}
              style={{ marginTop: 16, height: 48 }}>
              {loading ? 'Đang mã hóa...' : 'Mã hóa (Server-side)'}
            </Button>

            {progress > 0 && (
              <Progress percent={progress} status={progress === 100 ? 'success' : 'active'}
                style={{ marginTop: 12 }} />
            )}
          </Card>

          <Card style={{ marginTop: 16 }} title="ℹ️ Flow">
            <div style={{ fontSize: 13, lineHeight: 2 }}>
              1. Upload file gốc lên <Text code>/api/crypto/encrypt</Text><br />
              2. Server sinh AES-256 key + IV ngẫu nhiên<br />
              3. Server mã hóa file bằng AES-256-GCM<br />
              4. Server sinh RSA-2048 key pair<br />
              5. Server mã hóa AES key bằng RSA Public Key<br />
              6. Xóa file gốc khỏi server<br />
              7. Trả về <Text code>file.enc</Text> + <Text code>file.key.json</Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          {result ? (
            <Card title="✅ Mã hóa thành công — Tải 2 file về">
              <Alert type="warning" showIcon style={{ marginBottom: 16 }}
                message="⚠️ Lưu cả 2 file! Mất 1 trong 2 là không giải mã được." />

              <div style={{ padding: 16, background: '#e6f4ff', borderRadius: 8,
                border: '1px solid #91caff', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>📦 File mã hóa (ciphertext)</div>
                <Text code>{result.encFileName}</Text>
                <Button type="primary" icon={<DownloadOutlined />} block style={{ marginTop: 10 }}
                  onClick={() => downloadBase64(result.encBase64, result.encFileName, 'application/octet-stream')}>
                  Tải về {result.encFileName}
                </Button>
              </div>

              <div style={{ padding: 16, background: '#fff7e6', borderRadius: 8,
                border: '1px solid #ffc069' }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>🗝 File key (AES key + RSA private key)</div>
                <Text code>{result.keyFileName}</Text>
                <Button icon={<DownloadOutlined />} block style={{ marginTop: 10,
                  borderColor: '#fa8c16', color: '#fa8c16' }}
                  onClick={() => downloadBase64(result.keyJsonBase64, result.keyFileName, 'application/json')}>
                  Tải về {result.keyFileName}
                </Button>
              </div>

              <Alert type="info" showIcon style={{ marginTop: 16 }}
                message="Để giải mã: vào trang Giải mã → upload file.enc + file.key.json → tải về file gốc" />
            </Card>
          ) : (
            <Card style={{ height: '100%' }}>
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#8c8c8c' }}>
                <LockOutlined style={{ fontSize: 56, marginBottom: 16 }} />
                <div>Kết quả sẽ hiện ở đây sau khi mã hóa</div>
                <div style={{ marginTop: 16, fontSize: 12 }}>
                  Sau mã hóa nhận được 2 file:<br />
                  📦 <Text code>file.ext.enc</Text> — ciphertext<br />
                  🗝 <Text code>file.ext.key.json</Text> — key giải mã
                </div>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </PageContainer>
  );
};

export default EncryptPage;