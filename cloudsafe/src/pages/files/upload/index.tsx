import {
  CloudUploadOutlined,
  FileProtectOutlined,
  InfoCircleOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Progress,
  Row,
  Select,
  Space,
  Steps,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd';
import React, { useEffect, useState } from 'react';
import { encryptFile, importPublicKeyFromPem, bufToBase64 } from '@/utils/crypto';
import { request } from '@umijs/max';

const { Title, Text } = Typography;
const { Dragger } = Upload;

type UploadStatus = 'idle' | 'encrypting' | 'uploading' | 'done' | 'error';

interface KeyOption {
  id: string;
  name: string;
  publicKeyFingerprint: string;
  status: string;
}

const UploadPage: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [encryptedInfo, setEncryptedInfo] = useState<{
    encryptedAesKey: string;
    iv: string;
    authTag: string;
    originalSize: string;
    encryptedSize: string;
  } | null>(null);
  const [keys, setKeys] = useState<KeyOption[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string | undefined>();

  // ── Load active RSA keys ────────────────────────────────────────
  useEffect(() => {
    request<{ data: KeyOption[]; success: boolean }>('/api/keys', { method: 'GET' })
      .then((res) => {
        const activeKeys = res.data.filter((k) => k.status === 'Active');
        setKeys(activeKeys);
        if (activeKeys.length > 0) setSelectedKeyId(activeKeys[0].id);
      })
      .catch(() => message.error('Không thể tải danh sách khóa RSA'));
  }, []);

  // ── THẬT: Encrypt + Upload ──────────────────────────────────────
  const handleEncryptAndUpload = async (file: File) => {
    if (!selectedKeyId) {
      message.error('Vui lòng chọn khóa RSA trước');
      return;
    }

    setStatus('encrypting');
    setCurrentStep(0);
    setProgress(5);

    try {
      // Step 0: Lấy public key từ server
      const keyRes = await request<{ data: { publicKeyPem: string } }>(
        `/api/keys/${selectedKeyId}/public`,
        { method: 'GET' },
      );
      const publicKey = await importPublicKeyFromPem(keyRes.data.publicKeyPem);
      setProgress(15);
      setCurrentStep(1);

      // Step 1: Đọc file vào ArrayBuffer
      const fileBuffer = await file.arrayBuffer();
      setProgress(25);

      // Step 2: Mã hóa AES-256-GCM + RSA-OAEP (THẬT)
      setCurrentStep(2);
      const { ciphertext, encryptedAesKey, iv, authTag } = await encryptFile(
        fileBuffer,
        publicKey,
      );
      setProgress(65);

      // Step 3: Upload ciphertext lên server
      setStatus('uploading');
      setCurrentStep(3);

      const formData = new FormData();
      formData.append(
        'encryptedData',
        new Blob([ciphertext], { type: 'application/octet-stream' }),
        file.name + '.enc',
      );
      formData.append('originalName', file.name);
      formData.append('encryptedAesKey', encryptedAesKey);
      formData.append('iv', iv);
      formData.append('authTag', authTag);
      formData.append('keyPairId', selectedKeyId);
      formData.append('mimeType', file.type || 'application/octet-stream');
      formData.append('algorithm', 'AES-256-GCM');

      // Upload với XHR để track progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/files/upload');
        // Thêm JWT nếu dùng Bearer token
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = 65 + Math.round((e.loaded / e.total) * 34);
            setProgress(pct);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Server lỗi: ${xhr.status} – ${xhr.responseText}`));
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      setProgress(100);
      setCurrentStep(4);
      setStatus('done');

      setEncryptedInfo({
        encryptedAesKey: encryptedAesKey.slice(0, 24) + '...',
        iv: iv,
        authTag: authTag,
        originalSize: `${(file.size / 1024).toFixed(1)} KB`,
        encryptedSize: `${(ciphertext.byteLength / 1024).toFixed(1)} KB`,
      });

      message.success(`Đã mã hóa và tải lên thành công: ${file.name}`);
    } catch (err: any) {
      setStatus('error');
      message.error(`Thất bại: ${err.message}`);
    }
  };

  const handleUpload = () => {
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn file trước!');
      return;
    }
    const file = fileList[0].originFileObj as File;
    if (file) handleEncryptAndUpload(file);
  };

  const handleReset = () => {
    setFileList([]);
    setStatus('idle');
    setProgress(0);
    setCurrentStep(0);
    setEncryptedInfo(null);
  };

  const steps = [
    { title: 'Lấy public key', description: 'Fetch RSA public key từ server' },
    { title: 'Đọc file', description: 'Load file vào bộ nhớ' },
    { title: 'Mã hóa AES-256-GCM + RSA-OAEP', description: 'Web Crypto API thật' },
    { title: 'Tải lên server', description: 'Upload ciphertext + encrypted key' },
    { title: 'Hoàn thành', description: 'File đã được lưu an toàn' },
  ];

  return (
    <PageContainer
      title="Tải lên file mã hóa"
      subTitle="Mã hóa AES-256-GCM + RSA-OAEP thật tại trình duyệt trước khi tải lên"
    >
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <>
                <CloudUploadOutlined /> Chọn file
              </>
            }
          >
            <Alert
              type="info"
              showIcon
              icon={<LockOutlined />}
              message="Bảo mật Zero-Knowledge – Mã hóa thật"
              description="File được mã hóa hoàn toàn TẠI TRÌNH DUYỆT bằng Web Crypto API (AES-256-GCM + RSA-OAEP). Server chỉ nhận dữ liệu đã mã hóa — không bao giờ thấy nội dung gốc."
              style={{ marginBottom: 24 }}
            />

            {/* Key selector */}
            <div style={{ marginBottom: 16 }}>
              <Text strong>Chọn khóa RSA để mã hóa: </Text>
              {keys.length === 0 ? (
                <Alert
                  type="warning"
                  showIcon
                  message="Chưa có khóa RSA nào. Vui lòng tạo khóa tại trang Quản lý khóa."
                />
              ) : (
                <Select
                  value={selectedKeyId}
                  onChange={setSelectedKeyId}
                  style={{ width: '100%', marginTop: 8 }}
                  options={keys.map((k) => ({
                    value: k.id,
                    label: `${k.name} – ${k.publicKeyFingerprint}`,
                  }))}
                />
              )}
            </div>

            <Dragger
              fileList={fileList}
              beforeUpload={(file) => {
                setFileList([
                  {
                    ...file,
                    uid: file.name,
                    name: file.name,
                    originFileObj: file,
                  } as UploadFile,
                ]);
                return false;
              }}
              onRemove={() => {
                setFileList([]);
                setStatus('idle');
              }}
              disabled={status === 'encrypting' || status === 'uploading'}
            >
              <p className="ant-upload-drag-icon">
                <FileProtectOutlined style={{ fontSize: 48, color: '#1677ff' }} />
              </p>
              <p className="ant-upload-text">Kéo thả file vào đây hoặc nhấn để chọn</p>
              <p className="ant-upload-hint">
                Hỗ trợ mọi loại file. File sẽ được mã hóa AES-256-GCM trước khi tải lên.
              </p>
            </Dragger>

            {fileList.length > 0 && status === 'idle' && (
              <Button
                type="primary"
                size="large"
                icon={<LockOutlined />}
                onClick={handleUpload}
                disabled={!selectedKeyId || keys.length === 0}
                style={{ marginTop: 16, width: '100%' }}
              >
                Mã hóa & Tải lên (AES-256-GCM + RSA-OAEP thật)
              </Button>
            )}
          </Card>

          {(status === 'encrypting' || status === 'uploading' || status === 'done' || status === 'error') && (
            <Card title="Tiến trình" style={{ marginTop: 24 }}>
              <Steps
                current={currentStep}
                size="small"
                items={steps.map((s) => ({ title: s.title, description: s.description }))}
                style={{ marginBottom: 24 }}
              />
              <Progress
                percent={progress}
                status={
                  status === 'done'
                    ? 'success'
                    : status === 'error'
                    ? 'exception'
                    : 'active'
                }
                strokeColor={
                  status === 'done' ? '#52c41a' : status === 'error' ? '#ff4d4f' : '#1677ff'
                }
              />
              {status === 'encrypting' && (
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  🔐 Đang mã hóa tại trình duyệt bằng Web Crypto API...
                </Text>
              )}
              {status === 'uploading' && (
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  ☁️ Đang tải dữ liệu đã mã hóa lên server...
                </Text>
              )}
              {status === 'done' && (
                <>
                  <Alert
                    type="success"
                    showIcon
                    message="Tải lên thành công!"
                    description="File đã được mã hóa thật và lưu trữ an toàn trên server."
                    style={{ marginTop: 16 }}
                  />
                  <Button onClick={handleReset} style={{ marginTop: 12 }}>
                    Tải lên file khác
                  </Button>
                </>
              )}
              {status === 'error' && (
                <>
                  <Alert
                    type="error"
                    showIcon
                    message="Tải lên thất bại"
                    description="Vui lòng thử lại."
                    style={{ marginTop: 16 }}
                  />
                  <Button onClick={handleReset} style={{ marginTop: 12 }}>
                    Thử lại
                  </Button>
                </>
              )}
            </Card>
          )}

          {encryptedInfo && (
            <Card
              title={
                <>
                  <SafetyCertificateOutlined style={{ color: '#52c41a' }} /> Thông tin mã hóa thật
                </>
              }
              style={{ marginTop: 24 }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row>
                  <Col span={10}>
                    <Text type="secondary">Kích thước gốc:</Text>
                  </Col>
                  <Col span={14}>
                    <Tag color="blue">{encryptedInfo.originalSize}</Tag>
                  </Col>
                </Row>
                <Row>
                  <Col span={10}>
                    <Text type="secondary">Kích thước sau mã hóa:</Text>
                  </Col>
                  <Col span={14}>
                    <Tag color="purple">{encryptedInfo.encryptedSize}</Tag>
                  </Col>
                </Row>
                <Row>
                  <Col span={10}>
                    <Text type="secondary">Thuật toán:</Text>
                  </Col>
                  <Col span={14}>
                    <Tag color="purple">AES-256-GCM</Tag>
                    <Tag color="orange">RSA-OAEP</Tag>
                  </Col>
                </Row>
                <Row>
                  <Col span={10}>
                    <Text type="secondary">AES Key (RSA-encrypted, Base64):</Text>
                  </Col>
                  <Col span={14}>
                    <Text code style={{ wordBreak: 'break-all', fontSize: 11 }}>
                      {encryptedInfo.encryptedAesKey}
                    </Text>
                  </Col>
                </Row>
                <Row>
                  <Col span={10}>
                    <Text type="secondary">IV / Nonce (Base64):</Text>
                  </Col>
                  <Col span={14}>
                    <Text code style={{ fontSize: 11 }}>
                      {encryptedInfo.iv}
                    </Text>
                  </Col>
                </Row>
                <Row>
                  <Col span={10}>
                    <Text type="secondary">Auth Tag GCM (Base64):</Text>
                  </Col>
                  <Col span={14}>
                    <Text code style={{ fontSize: 11 }}>
                      {encryptedInfo.authTag}
                    </Text>
                  </Col>
                </Row>
              </Space>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <>
                <InfoCircleOutlined /> Quy trình Upload (thật)
              </>
            }
          >
            <Steps
              direction="vertical"
              size="small"
              current={99}
              items={[
                {
                  title: 'Fetch public key',
                  description: 'Lấy RSA public key từ /api/keys/{id}/public',
                  status: 'finish',
                },
                {
                  title: 'Sinh AES Key (thật)',
                  description: 'crypto.subtle.generateKey AES-GCM 256-bit ngẫu nhiên',
                  status: 'finish',
                },
                {
                  title: 'Mã hóa file (AES-256-GCM)',
                  description: 'crypto.subtle.encrypt → ciphertext + auth tag 16 byte',
                  status: 'finish',
                },
                {
                  title: 'Mã hóa khóa AES (RSA-OAEP)',
                  description: 'crypto.subtle.encrypt với public key → Base64',
                  status: 'finish',
                },
                {
                  title: 'Upload lên /api/files/upload',
                  description: 'FormData: ciphertext + encryptedAesKey + IV + authTag',
                  status: 'finish',
                },
              ]}
            />
          </Card>

          <Card title="Bảo mật" style={{ marginTop: 16 }}>
            <Space direction="vertical">
              <div>
                <Tag color="green">Web Crypto API</Tag>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  crypto.subtle — native browser, không thư viện ngoài
                </Text>
              </div>
              <div>
                <Tag color="purple">AES-256-GCM</Tag>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  256-bit key, 12-byte IV, 16-byte auth tag
                </Text>
              </div>
              <div>
                <Tag color="orange">RSA-OAEP SHA-256</Tag>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  2048-bit, bảo vệ AES key
                </Text>
              </div>
              <div>
                <Tag color="blue">Zero-Knowledge</Tag>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  Server nhận ciphertext, không đọc được
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default UploadPage;