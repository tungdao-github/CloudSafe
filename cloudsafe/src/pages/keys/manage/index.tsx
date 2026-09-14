import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Modal,
  Row,
  Space,
  Statistic,
  Steps,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  message,
  Spin,
} from 'antd';
import React, { useEffect, useState } from 'react';
import {
  generateRsaKeyPair,
  storePrivateKey,
  deletePrivateKey,
} from '@/utils/crypto';
import { request } from '@umijs/max';

const { Title, Text, Paragraph } = Typography;

interface KeyPair {
  id: string;
  name: string;
  algorithm: string;
  keySize: number;
  createdAt: string;
  status: 'Active' | 'Revoked' | 'Expired';
  publicKeyFingerprint: string;
  usageCount: number;
  revokedAt?: string | null;
}

const KeyManagePage: React.FC = () => {
  const [generating, setGenerating] = useState(false);
  const [generateStep, setGenerateStep] = useState(-1);
  const [keys, setKeys] = useState<KeyPair[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load keys from API ──────────────────────────────────────────
  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await request<{ data: KeyPair[]; success: boolean }>('/api/keys', {
        method: 'GET',
      });
      if (res.success) setKeys(res.data);
    } catch {
      message.error('Không thể tải danh sách khóa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  // ── Generate RSA key pair (THẬT) ───────────────────────────────
  const generateNewKey = async () => {
    setGenerating(true);
    setGenerateStep(0);
    try {
      // Step 0: Init Web Crypto
      await new Promise((r) => setTimeout(r, 100));
      setGenerateStep(1);

      // Step 1: Generate RSA-OAEP 2048-bit key pair (thật)
      const { publicKeyPem, publicKeyFingerprint, privateKey } = await generateRsaKeyPair(2048);
      setGenerateStep(2);

      // Step 2: Register public key with server → get keyId back
      const res = await request<{ success: boolean; data: KeyPair }>('/api/keys', {
        method: 'POST',
        data: {
          publicKeyPem,
          publicKeyFingerprint,
          name: 'Khóa mới',
          keySize: 2048,
        },
      });

      if (!res.success) throw new Error('Server từ chối đăng ký khóa');
      const keyId = res.data.id;
      setGenerateStep(3);

      // Step 3: Save private key to IndexedDB (private key KHÔNG lên server)
      await storePrivateKey(keyId, privateKey);

      setKeys((prev) => [res.data, ...prev]);
      message.success('Đã tạo cặp khóa RSA-OAEP 2048-bit thành công!');
    } catch (err: any) {
      message.error(`Tạo khóa thất bại: ${err.message}`);
    } finally {
      setGenerating(false);
      setGenerateStep(-1);
    }
  };

  // ── Revoke key ──────────────────────────────────────────────────
  const revokeKey = (keyId: string) => {
    Modal.confirm({
      title: 'Thu hồi khóa?',
      icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
      content:
        'Sau khi thu hồi, các file mã hóa bằng khóa này sẽ KHÔNG thể giải mã được nữa. Hành động này không thể hoàn tác!',
      okText: 'Thu hồi',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await request(`/api/keys/${keyId}/revoke`, { method: 'PATCH' });
          await deletePrivateKey(keyId);
          setKeys((prev) =>
            prev.map((k) => (k.id === keyId ? { ...k, status: 'Revoked' as const } : k)),
          );
          message.warning('Đã thu hồi khóa và xóa private key cục bộ.');
        } catch {
          message.error('Thu hồi thất bại');
        }
      },
    });
  };

  // ── Export public key ───────────────────────────────────────────
  const exportPublicKey = async (keyId: string) => {
    try {
      const res = await request<{ data: { publicKeyPem: string } }>(
        `/api/keys/${keyId}/public`,
        { method: 'GET' },
      );
      const blob = new Blob([res.data.publicKeyPem], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cloudsafe-public-${keyId.slice(0, 8)}.pem`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Không thể xuất public key');
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { status: 'success' | 'error' | 'default'; label: string }> = {
      Active: { status: 'success', label: 'Đang hoạt động' },
      Expired: { status: 'error', label: 'Hết hạn' },
      Revoked: { status: 'error', label: 'Đã thu hồi' },
    };
    const s = map[status] || { status: 'default', label: status };
    return <Badge status={s.status} text={s.label} />;
  };

  return (
    <PageContainer
      title="Quản lý khóa mã hóa"
      subTitle="RSA Public/Private Key pairs — Private key chỉ lưu tại trình duyệt của bạn"
    >
      <Alert
        type="warning"
        showIcon
        icon={<ExclamationCircleOutlined />}
        message="Private key KHÔNG bao giờ rời khỏi thiết bị của bạn"
        description="CloudSafe chỉ lưu Public Key trên server. Private key được sinh bằng Web Crypto API và lưu trong IndexedDB của trình duyệt — không bao giờ được tải lên. Nếu mất private key, bạn sẽ không thể giải mã các file cũ."
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <>
                <KeyOutlined /> Cặp khóa RSA của bạn
              </>
            }
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                loading={generating}
                onClick={generateNewKey}
              >
                Tạo khóa mới
              </Button>
            }
          >
            {generating && (
              <Steps
                size="small"
                current={generateStep}
                style={{ marginBottom: 24 }}
                items={[
                  { title: 'Khởi tạo Web Crypto API' },
                  { title: 'Sinh RSA-OAEP 2048-bit (thật)' },
                  { title: 'Đăng ký public key lên server' },
                  { title: 'Lưu private key vào IndexedDB' },
                ]}
              />
            )}

            <Spin spinning={loading}>
              {keys.length === 0 && !loading && (
                <Alert
                  type="info"
                  message="Chưa có khóa nào"
                  description="Nhấn 'Tạo khóa mới' để sinh cặp RSA-OAEP đầu tiên."
                />
              )}

              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {keys.map((key) => (
                  <Card
                    key={key.id}
                    size="small"
                    style={{
                      borderColor: key.status === 'Active' ? '#52c41a' : '#d9d9d9',
                      opacity: key.status === 'Revoked' ? 0.6 : 1,
                    }}
                  >
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Space>
                          <SafetyCertificateOutlined
                            style={{
                              fontSize: 24,
                              color: key.status === 'Active' ? '#52c41a' : '#d9d9d9',
                            }}
                          />
                          <div>
                            <Title level={5} style={{ marginBottom: 2 }}>
                              {key.name}
                            </Title>
                            <Space size="small">
                              <Tag color="purple">{key.algorithm}</Tag>
                              <Tag color="blue">{key.keySize}-bit</Tag>
                              {statusBadge(key.status)}
                            </Space>
                          </div>
                        </Space>
                      </Col>
                      <Col>
                        <Space>
                          {key.status === 'Active' && (
                            <>
                              <Tooltip title="Xuất public key (.pem)">
                                <Button
                                  size="small"
                                  icon={<DownloadOutlined />}
                                  onClick={() => exportPublicKey(key.id)}
                                />
                              </Tooltip>
                              <Tooltip title="Sao chép fingerprint">
                                <Button
                                  size="small"
                                  icon={<CopyOutlined />}
                                  onClick={() => {
                                    navigator.clipboard.writeText(key.publicKeyFingerprint);
                                    message.success('Đã sao chép fingerprint!');
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title="Thu hồi khóa">
                                <Button
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => revokeKey(key.id)}
                                />
                              </Tooltip>
                            </>
                          )}
                        </Space>
                      </Col>
                    </Row>
                    <Divider style={{ margin: '12px 0' }} />
                    <Descriptions size="small" column={2}>
                      <Descriptions.Item label="Fingerprint">
                        <Text code style={{ fontSize: 11 }}>
                          {key.publicKeyFingerprint}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Ngày tạo">
                        {new Date(key.createdAt).toLocaleString('vi-VN')}
                      </Descriptions.Item>
                      <Descriptions.Item label="Lượt sử dụng">
                        {key.usageCount} file
                      </Descriptions.Item>
                      {key.revokedAt && (
                        <Descriptions.Item label="Ngày thu hồi">
                          {new Date(key.revokedAt).toLocaleString('vi-VN')}
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  </Card>
                ))}
              </Space>
            </Spin>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <>
                <LockOutlined /> Nguyên lý hoạt động
              </>
            }
            style={{ marginBottom: 16 }}
          >
            <Timeline
              items={[
                {
                  color: 'green',
                  children: (
                    <>
                      <Text strong>Đăng ký khóa</Text>
                      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
                        Web Crypto API sinh cặp RSA-OAEP 2048-bit. Public key gửi server. Private key
                        lưu IndexedDB — không bao giờ rời trình duyệt.
                      </Paragraph>
                    </>
                  ),
                },
                {
                  color: 'blue',
                  children: (
                    <>
                      <Text strong>Upload file</Text>
                      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
                        AES-256 key random → AES-GCM mã hóa file → RSA-OAEP mã hóa AES key →
                        upload (ciphertext + encrypted key + IV).
                      </Paragraph>
                    </>
                  ),
                },
                {
                  color: 'orange',
                  children: (
                    <>
                      <Text strong>Download file</Text>
                      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
                        Lấy private key từ IndexedDB → giải mã AES key → AES-GCM giải mã file →
                        file gốc.
                      </Paragraph>
                    </>
                  ),
                },
              ]}
            />
          </Card>

          <Card title="Thống kê">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Khóa hoạt động"
                  value={keys.filter((k) => k.status === 'Active').length}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<SafetyCertificateOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Đã thu hồi"
                  value={keys.filter((k) => k.status === 'Revoked').length}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
              <Col span={24}>
                <Statistic
                  title="Tổng file được bảo vệ"
                  value={keys.reduce((sum, k) => sum + k.usageCount, 0)}
                  prefix={<LockOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default KeyManagePage;