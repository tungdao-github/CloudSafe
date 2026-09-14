import { PageContainer } from '@ant-design/pro-components';
import {
  CloudUploadOutlined,
  KeyOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  SecurityScanOutlined,
} from '@ant-design/icons';
import { useModel } from '@umijs/max';
import { Button, Card, Col, Row, Space, Steps, Tag, Timeline, Typography } from 'antd';
import React from 'react';

const { Title, Paragraph, Text } = Typography;

const Welcome: React.FC = () => {
  const { initialState } = useModel('@@initialState');

  return (
    <PageContainer title="CloudSafe — Mã hóa dữ liệu đám mây" subTitle="Hệ thống lưu trữ Zero-Knowledge với mã hóa lai AES-256-GCM + RSA-OAEP">
      <Row gutter={[24, 24]}>
        {/* Hero */}
        <Col span={24}>
          <Card style={{ background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)', border: 'none' }}>
            <Row align="middle" gutter={[24, 24]}>
              <Col xs={24} md={16}>
                <Space direction="vertical">
                  <Title level={2} style={{ color: '#fff', marginBottom: 8 }}>
                    🔐 Dữ liệu của bạn — chỉ bạn mới đọc được
                  </Title>
                  <Paragraph style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, marginBottom: 16 }}>
                    CloudSafe mã hóa mọi file tại trình duyệt trước khi tải lên. Server chỉ thấy dữ liệu đã mã hóa.
                    Không có private key — không giải mã được.
                  </Paragraph>
                  <Space>
                    <Button type="default" size="large" icon={<CloudUploadOutlined />} href="/files/upload" style={{ background: '#fff', borderColor: '#fff' }}>
                      Tải lên file ngay
                    </Button>
                    <Button size="large" icon={<KeyOutlined />} href="/keys/manage" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.5)', color: '#fff' }}>
                      Quản lý khóa
                    </Button>
                  </Space>
                </Space>
              </Col>
              <Col xs={24} md={8} style={{ textAlign: 'center' }}>
                <SecurityScanOutlined style={{ fontSize: 120, color: 'rgba(255,255,255,0.3)' }} />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Feature cards */}
        <Col xs={24} sm={8}>
          <Card hoverable style={{ textAlign: 'center', height: '100%' }}>
            <LockOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
            <Title level={4}>AES-256-GCM</Title>
            <Paragraph type="secondary">
              Mã hóa nội dung file bằng AES-256 với chế độ GCM có xác thực tích hợp.
              Nhanh, mạnh và đảm bảo tính toàn vẹn dữ liệu.
            </Paragraph>
            <Tag color="blue">Mã hóa đối xứng</Tag>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable style={{ textAlign: 'center', height: '100%' }}>
            <SafetyCertificateOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
            <Title level={4}>RSA-OAEP</Title>
            <Paragraph type="secondary">
              Khóa AES được bảo vệ bởi RSA-OAEP. Chỉ người có private key
              tương ứng mới giải mã được khóa AES và đọc file.
            </Paragraph>
            <Tag color="green">Mã hóa bất đối xứng</Tag>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable style={{ textAlign: 'center', height: '100%' }}>
            <SecurityScanOutlined style={{ fontSize: 48, color: '#fa8c16', marginBottom: 16 }} />
            <Title level={4}>Zero-Knowledge</Title>
            <Paragraph type="secondary">
              Server không bao giờ biết nội dung file. Private key chỉ tồn tại
              tại thiết bị của bạn — không bao giờ được tải lên.
            </Paragraph>
            <Tag color="orange">Server không đọc được</Tag>
          </Card>
        </Col>

        {/* Upload workflow */}
        <Col xs={24} md={12}>
          <Card title="🔒 Quy trình Upload (Mã hóa)">
            <Steps
              direction="vertical"
              size="small"
              current={99}
              items={[
                { title: 'Chọn file', description: 'Người dùng chọn file cần lưu trữ', status: 'finish' },
                { title: 'Sinh AES key ngẫu nhiên', description: 'crypto.getRandomValues(new Uint8Array(32))', status: 'finish' },
                { title: 'Mã hóa file (AES-GCM)', description: 'File → AES-256-GCM → Ciphertext + IV', status: 'finish' },
                { title: 'Mã hóa AES key (RSA-OAEP)', description: 'AES key → RSA Public Key → Encrypted Key', status: 'finish' },
                { title: 'Upload lên server', description: 'Ciphertext + Encrypted AES Key + IV', status: 'finish' },
              ]}
            />
          </Card>
        </Col>

        {/* Download workflow */}
        <Col xs={24} md={12}>
          <Card title="🔓 Quy trình Download (Giải mã)">
            <Steps
              direction="vertical"
              size="small"
              current={99}
              items={[
                { title: 'Tải về từ server', description: 'Ciphertext + Encrypted AES Key + IV', status: 'finish' },
                { title: 'Giải mã AES key (RSA)', description: 'Encrypted Key → RSA Private Key → AES Key', status: 'finish' },
                { title: 'Giải mã file (AES-GCM)', description: 'Ciphertext + IV + AES Key → File gốc', status: 'finish' },
                { title: 'Tải về thiết bị', description: 'File gốc sẵn sàng sử dụng', status: 'finish' },
              ]}
            />
          </Card>
        </Col>

        {/* Tech stack */}
        <Col span={24}>
          <Card title="🛠️ Công nghệ sử dụng">
            <Row gutter={[16, 16]}>
              {[
                { label: 'Web Crypto API', desc: 'Mã hóa tại trình duyệt', color: 'blue' },
                { label: 'AES-256-GCM', desc: 'Mã hóa dữ liệu', color: 'purple' },
                { label: 'RSA-OAEP 2048-bit', desc: 'Bảo vệ khóa AES', color: 'green' },
                { label: 'React + Ant Design Pro', desc: 'Frontend', color: 'cyan' },
                { label: 'Node.js + Express', desc: 'Backend API', color: 'orange' },
                { label: 'MongoDB / PostgreSQL', desc: 'Database', color: 'geekblue' },
              ].map((tech) => (
                <Col key={tech.label} xs={12} sm={8} md={4}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Tag color={tech.color} style={{ marginBottom: 4 }}>{tech.label}</Tag>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{tech.desc}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Welcome;
