'use client';
import {
  CopyOutlined, DownloadOutlined, FileProtectOutlined,
  UnlockOutlined, UploadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert, Button, Card, Col, Divider,
  Progress, Row, Space, Steps, Tag, Tooltip, Typography, message,
} from 'antd';
import React, { useState } from 'react';

const { Text } = Typography;

type Step = 'idle' | 'uploading' | 'rsa-decrypt' | 'aes-decrypt' | 'done' | 'error';

interface KeyMeta {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  algorithm: string;
  encryptedAesKeyBase64: string;
  ivBase64: string;
  authTagBase64: string;
}

const DecryptPage: React.FC = () => {
  const [encFile, setEncFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [keyMeta, setKeyMeta] = useState<KeyMeta | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [errorStage, setErrorStage] = useState('');

  // Parse key.json khi chọn file để hiển thị preview
  const loadKeyFile = (file: File) => {
    setKeyFile(file);
    const r = new FileReader();
    r.onload = e => {
      try {
        const parsed = JSON.parse(e.target!.result as string);
        setKeyMeta(parsed);
        message.success('Đã đọc file .key.json!');
      } catch {
        message.error('File .key.json không hợp lệ');
      }
    };
    r.readAsText(file);
  };

  const handleDecrypt = async () => {
    if (!encFile) { message.warning('Chưa chọn file .enc!'); return; }
    if (!keyFile) { message.warning('Chưa chọn file .key.json!'); return; }

    setError(''); setErrorStage(''); setDone(false);
    setStep('uploading'); setProgress(20);

    try {
      const formData = new FormData();
      formData.append('encFile', encFile);
      formData.append('keyFile', keyFile);

      setStep('rsa-decrypt'); setProgress(40);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch('/api/crypto/decrypt', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      setStep('aes-decrypt'); setProgress(75);

      if (!res.ok) {
        const err = await res.json();
        setErrorStage(err.stage || '');
        throw new Error(err.message || 'Giải mã thất bại');
      }

      // Stream file về
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
      const fileName = match?.[1] || keyMeta?.originalName || encFile.name.replace('.enc', '');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = decodeURIComponent(fileName); a.click();
      URL.revokeObjectURL(url);

      setProgress(100); setStep('done'); setDone(true);
      message.success(`Giải mã thành công! Đã tải về: ${fileName}`);
    } catch (e: any) {
      setStep('error');
      setError(e.message);
      message.error(e.message);
    }
  };

  const reset = () => {
    setEncFile(null); setKeyFile(null); setKeyMeta(null);
    setStep('idle'); setProgress(0); setDone(false);
    setError(''); setErrorStage('');
  };

  const stepItems = [
    { title: 'Upload file', description: 'Gửi .enc + .key.json lên server' },
    { title: 'RSA → AES Key', description: 'Private key giải mã AES key' },
    { title: 'AES-GCM Decrypt', description: 'Khôi phục file gốc' },
    { title: 'Hoàn thành', description: 'Tải file về máy' },
  ];
  const stepIdx = { idle: -1, uploading: 0, 'rsa-decrypt': 1, 'aes-decrypt': 2, done: 3, error: 3 }[step];
  const busy = ['uploading', 'rsa-decrypt', 'aes-decrypt'].includes(step);

  const stageLabel: Record<string, string> = {
    parse_key_json: '① Đọc file key.json',
    rsa_decrypt:    '② Giải mã RSA → AES Key',
    aes_decrypt:    '③ Giải mã AES → File gốc',
  };

  return (
    <PageContainer title="🔓 Giải mã file" subTitle="Upload file.enc + file.key.json → server giải mã → tải về file gốc">
      <Row gutter={[20, 20]}>
        {/* ── LEFT: Inputs ── */}
        <Col xs={24} lg={13}>

          {/* Step 1: .enc */}
          <Card title="① File mã hóa (.enc)" style={{ marginBottom: 16 }}
            extra={encFile && <Tag color="green">✓ {encFile.name}</Tag>}>
            <input type="file" id="encInput" accept=".enc" style={{ display: 'none' }}
              onChange={e => setEncFile(e.target.files?.[0] ?? null)} />
            <Button icon={<UploadOutlined />} block size="large"
              onClick={() => document.getElementById('encInput')!.click()}
              style={{ borderStyle: encFile ? 'solid' : 'dashed', borderColor: encFile ? '#52c41a' : undefined }}>
              {encFile
                ? `✓ ${encFile.name} (${(encFile.size / 1024).toFixed(1)} KB)`
                : 'Upload file .enc (ciphertext)'}
            </Button>
          </Card>

          {/* Step 2: .key.json */}
          <Card title="② File key (.key.json)" style={{ marginBottom: 16 }}
            extra={keyMeta && <Tag color="orange">✓ loaded</Tag>}>
            <input type="file" id="keyJsonInput" accept=".json" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && loadKeyFile(e.target.files[0])} />
            <Button icon={<UploadOutlined />} block size="large"
              onClick={() => document.getElementById('keyJsonInput')!.click()}
              style={{ borderStyle: keyMeta ? 'solid' : 'dashed', borderColor: keyMeta ? '#fa8c16' : undefined }}>
              {keyMeta ? `✓ ${keyMeta.originalName}.key.json` : 'Upload file .key.json'}
            </Button>

            {keyMeta && (
              <div style={{ marginTop: 10, padding: 10, background: '#fafafa', borderRadius: 6, fontSize: 11, fontFamily: 'monospace' }}>
                <div>originalName: <Text strong>{keyMeta.originalName}</Text></div>
                <div>algorithm: <Text code>{keyMeta.algorithm}</Text></div>
                <div>iv: <Text code>{keyMeta.ivBase64}</Text></div>
                <div>authTag: <Text code>{keyMeta.authTagBase64}</Text></div>
                <div>encryptedAesKey: <Text code>{keyMeta.encryptedAesKeyBase64?.slice(0, 40)}...</Text></div>
                <div>sizeBytes: <Text strong>{keyMeta.sizeBytes?.toLocaleString()}</Text></div>
              </div>
            )}
          </Card>

          {/* Decrypt button */}
          <Button size="large" block icon={<UnlockOutlined />}
            onClick={handleDecrypt} loading={busy} disabled={busy || !encFile || !keyFile}
            style={{ height: 48, fontSize: 15, background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}>
            {busy ? 'Đang giải mã...' : 'Giải mã & Tải về'}
          </Button>

          {/* Steps + Progress */}
          {step !== 'idle' && (
            <Card style={{ marginTop: 16 }}>
              <Steps size="small" current={stepIdx}
                status={step === 'error' ? 'error' : step === 'done' ? 'finish' : 'process'}
                items={stepItems} style={{ marginBottom: 14 }} />
              <Progress percent={progress}
                status={step === 'done' ? 'success' : step === 'error' ? 'exception' : 'active'} />
            </Card>
          )}

          {/* Error chi tiết */}
          {error && (
            <Alert type="error" showIcon style={{ marginTop: 14 }}
              message={errorStage ? `Lỗi tại bước: ${stageLabel[errorStage] || errorStage}` : 'Giải mã thất bại'}
              description={error} />
          )}
        </Col>

        {/* ── RIGHT: Result / hướng dẫn ── */}
        <Col xs={24} lg={11}>
          {!done ? (
            <Card style={{ height: '100%' }}>
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
                <UnlockOutlined style={{ fontSize: 56, marginBottom: 16 }} />
                <div style={{ fontSize: 14, marginBottom: 24 }}>File gốc sẽ tải về tự động</div>
                <div style={{ textAlign: 'left', display: 'inline-block', fontSize: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Quy trình server giải mã:</div>
                  <div>① Đọc <Text code>privateKeyPem</Text> từ .key.json</div>
                  <div>② RSA Private Key giải mã → lấy lại <Tag color="blue" style={{fontSize:11}}>AES Key</Tag></div>
                  <div>③ AES-256-GCM + IV + AuthTag giải mã <Text code>.enc</Text></div>
                  <div>④ Trả về stream file gốc → trình duyệt tự tải</div>
                  <Divider style={{ margin: '12px 0' }} />
                  <div style={{ color: '#cf1322' }}>❌ RSA key sai → không lấy được AES key</div>
                  <div style={{ color: '#cf1322' }}>❌ File .enc bị sửa → authTag fail</div>
                  <div style={{ color: '#cf1322' }}>❌ Dùng key.json của file khác → fail</div>
                </div>
              </div>
            </Card>
          ) : (
            <Card title={<><UnlockOutlined style={{ color: '#52c41a' }} /> Giải mã thành công!</>}>
              <Alert type="success" showIcon style={{ marginBottom: 16 }}
                message={
                  <Space>
                    <span>File <Text strong>{keyMeta?.originalName}</Text> đã tải về</span>
                  </Space>
                } />

              <div style={{ padding: 14, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f', marginBottom: 14 }}>
                <div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600, color: '#389e0d' }}>
                  ✅ Xác thực toàn vẹn (AuthTag)
                </div>
                <div style={{ fontSize: 11, color: '#595959' }}>
                  AES-256-GCM xác minh <Text code>{keyMeta?.authTagBase64}</Text> khớp — file không bị sửa đổi
                </div>
              </div>

              <Space wrap>
                <Tag color="green">AES-256-GCM ✓</Tag>
                <Tag color="purple">RSA-OAEP-2048 ✓</Tag>
                <Tag color="blue">AuthTag verified ✓</Tag>
              </Space>

              <Divider />
              <Button block onClick={reset}>Giải mã file khác</Button>
            </Card>
          )}
        </Col>
      </Row>
    </PageContainer>
  );
};

export default DecryptPage;