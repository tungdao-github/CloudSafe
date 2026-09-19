import {
  FileProtectOutlined, UnlockOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert, Button, Card, Col, Progress, Row, Typography, message,
} from 'antd';
import React, { useState } from 'react';

const { Text } = Typography;

const DecryptPage: React.FC = () => {
  const [encFile, setEncFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const handleDecrypt = async () => {
    if (!encFile) { message.warning('Chưa chọn file .enc!'); return; }
    if (!keyFile) { message.warning('Chưa chọn file .key.json!'); return; }

    setLoading(true);
    setProgress(30);
    setDone(false);

    try {
      const formData = new FormData();
      formData.append('encFile', encFile);
      formData.append('keyFile', keyFile);

      setProgress(60);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch('/api/crypto/decrypt', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      setProgress(90);

      if (!res.ok) {
        let errMsg = 'Giải mã thất bại';
        try { const e = await res.json(); errMsg = e.message || errMsg; } catch {}
        throw new Error(errMsg);
      }

      // Server trả về file stream → tải về trực tiếp
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const fileName = match?.[1] || encFile.name.replace('.enc', '');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      setDone(true);
      message.success(`Giải mã thành công! Đã tải về: ${fileName}`);
    } catch (e: any) {
      message.error(e.message);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setEncFile(null); setKeyFile(null);
    setProgress(0); setDone(false);
  };

  return (
    <PageContainer title="🔓 Giải mã file" subTitle="Upload file.enc + file.key.json → tải về file gốc">
      <Row gutter={[24, 24]} justify="center">
        <Col xs={24} lg={14}>
          <Card title="📂 Upload 2 file để giải mã">
            <Alert type="info" showIcon style={{ marginBottom: 20 }}
              message="Cần đủ 2 file: file.enc (ciphertext) + file.key.json (chứa AES key & RSA private key)" />

            {/* Upload .enc */}
            <input type="file" id="encInput" style={{ display: 'none' }}
              onChange={e => setEncFile(e.target.files?.[0] ?? null)} />
            <div style={{ marginBottom: 12 }}>
              <Button icon={<FileProtectOutlined />} block size="large"
                onClick={() => document.getElementById('encInput')!.click()}>
                Chọn file .enc
              </Button>
              {encFile && (
                <Alert style={{ marginTop: 8 }} type="success" showIcon
                  message={<><Text strong>{encFile.name}</Text> — {(encFile.size / 1024).toFixed(1)} KB</>} />
              )}
            </div>

            {/* Upload .key.json */}
            <input type="file" id="keyInput" accept=".json" style={{ display: 'none' }}
              onChange={e => setKeyFile(e.target.files?.[0] ?? null)} />
            <div style={{ marginBottom: 20 }}>
              <Button icon={<FileProtectOutlined />} block size="large"
                onClick={() => document.getElementById('keyInput')!.click()}>
                Chọn file .key.json
              </Button>
              {keyFile && (
                <Alert style={{ marginTop: 8 }} type="success" showIcon
                  message={<><Text strong>{keyFile.name}</Text></>} />
              )}
            </div>

            <Button type="primary" size="large" block icon={<UnlockOutlined />}
              onClick={handleDecrypt} loading={loading}
              disabled={!encFile || !keyFile}
              style={{ height: 48, fontSize: 15 }}>
              {loading ? 'Đang giải mã...' : 'Giải mã & Tải về'}
            </Button>

            {progress > 0 && (
              <Progress percent={progress}
                status={done ? 'success' : loading ? 'active' : 'exception'}
                style={{ marginTop: 16 }} />
            )}

            {done && (
              <Alert type="success" showIcon style={{ marginTop: 16 }}
                message="Giải mã thành công! File gốc đã được tải về máy."
                action={<Button size="small" onClick={reset}>Giải mã file khác</Button>}
              />
            )}
          </Card>

          <Card title="ℹ️ Flow giải mã" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, lineHeight: 2 }}>
              1. Upload <Text code>file.enc</Text> + <Text code>file.key.json</Text><br />
              2. Server đọc RSA private key từ <Text code>key.json</Text><br />
              3. Server giải mã AES key bằng RSA private key<br />
              4. Server giải mã file bằng AES-256-GCM<br />
              5. Server trả về file gốc → trình duyệt tự tải về
            </div>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default DecryptPage;