import {
  CloudDownloadOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileProtectOutlined,
  FileWordOutlined,
  FileZipOutlined,
  LockOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Badge,
  Button,
  Col,
  Modal,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import React, { useRef, useState } from 'react';
import { decryptFile, loadPrivateKey, downloadBlob } from '@/utils/crypto';
import { request } from '@umijs/max';

const { Text } = Typography;

interface FileItem {
  id: string;
  originalName: string;
  fileSizeBytes: number;
  mimeType: string;
  algorithm: string;
  encryptedAesKey: string;
  iv: string;
  authTag: string;
  keyPairId: string;
  status: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

const fileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const icons: Record<string, React.ReactNode> = {
    pdf: <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />,
    xlsx: <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />,
    xls: <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />,
    docx: <FileWordOutlined style={{ color: '#1677ff', fontSize: 20 }} />,
    doc: <FileWordOutlined style={{ color: '#1677ff', fontSize: 20 }} />,
    zip: <FileZipOutlined style={{ color: '#fa8c16', fontSize: 20 }} />,
  };
  return icons[ext] || <FileProtectOutlined style={{ fontSize: 20 }} />;
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const FileListPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [decrypting, setDecrypting] = useState<string | null>(null);
  const [decryptProgress, setDecryptProgress] = useState(0);

  // ── THẬT: Decrypt & download ────────────────────────────────────
  const handleDecryptDownload = async (file: FileItem) => {
    setDecrypting(file.id);
    setDecryptProgress(5);
    try {
      // Step 1: Load private key từ IndexedDB
      const privateKey = await loadPrivateKey(file.keyPairId);
      if (!privateKey) {
        message.error(
          'Không tìm thấy private key trong trình duyệt này. Private key không thể khôi phục từ thiết bị khác.',
        );
        return;
      }
      setDecryptProgress(20);

      // Step 2: Download encrypted binary từ server
      const encResponse = await fetch(`/api/files/${file.id}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token') || ''}`,
        },
      });
      if (!encResponse.ok) throw new Error('Tải file thất bại');
      setDecryptProgress(55);

      const ciphertext = await encResponse.arrayBuffer();
      setDecryptProgress(70);

      // Step 3: Giải mã AES key + file (THẬT)
      const plaintext = await decryptFile(ciphertext, file.encryptedAesKey, file.iv, privateKey);
      setDecryptProgress(95);

      // Step 4: Tải về máy
      const blob = new Blob([plaintext], { type: file.mimeType || 'application/octet-stream' });
      downloadBlob(blob, file.originalName);

      setDecryptProgress(100);
      message.success(`Đã giải mã và tải về: ${file.originalName}`);
    } catch (err: any) {
      message.error(`Giải mã thất bại: ${err.message}`);
    } finally {
      setTimeout(() => {
        setDecrypting(null);
        setDecryptProgress(0);
      }, 600);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────
  const handleDelete = (file: FileItem) => {
    Modal.confirm({
      title: `Xóa "${file.originalName}"?`,
      content: 'File sẽ bị xóa vĩnh viễn khỏi server.',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        await request(`/api/files/${file.id}`, { method: 'DELETE' });
        message.success('Đã xóa file');
        actionRef.current?.reload();
      },
    });
  };

  const columns: ProColumns<FileItem>[] = [
    {
      title: 'Tên file',
      dataIndex: 'originalName',
      render: (_, record) => (
        <Space>
          {fileIcon(record.originalName)}
          <div>
            <Text strong style={{ fontSize: 13 }}>
              {record.originalName}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {formatSize(record.fileSizeBytes)} · {record.algorithm}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Chủ sở hữu',
      dataIndex: 'owner',
      width: 130,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (_, record) => {
        const map: Record<string, { color: 'success' | 'processing' | 'default'; label: string }> =
          {
            Encrypted: { color: 'success', label: 'Đã mã hóa' },
            Shared: { color: 'processing', label: 'Đã chia sẻ' },
          };
        const s = map[record.status] || { color: 'default', label: record.status };
        return <Badge status={s.color} text={s.label} />;
      },
    },
    {
      title: 'Ngày tải lên',
      dataIndex: 'createdAt',
      width: 150,
      render: (v) => new Date(v as string).toLocaleString('vi-VN'),
    },
    {
      title: 'Thao tác',
      valueType: 'option',
      width: 160,
      render: (_, record) => [
        decrypting === record.id ? (
          <Progress
            key="progress"
            type="circle"
            percent={decryptProgress}
            size={28}
            style={{ display: 'inline-flex' }}
          />
        ) : (
          <Tooltip key="download" title="Giải mã & tải về (thật)">
            <Button
              type="primary"
              size="small"
              icon={<UnlockOutlined />}
              onClick={() => handleDecryptDownload(record)}
            >
              Giải mã
            </Button>
          </Tooltip>
        ),
        <Tooltip key="share" title="Chia sẻ file">
          <Button size="small" icon={<ShareAltOutlined />} />
        </Tooltip>,
        <Tooltip key="delete" title="Xóa">
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Tooltip>,
      ],
    },
  ];

  return (
    <PageContainer title="Danh sách file mã hóa" subTitle="Giải mã thật bằng private key cục bộ">
      <ProTable<FileItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const res = await request<{ data: FileItem[]; total: number; success: boolean }>(
            '/api/files',
            {
              method: 'GET',
              params: {
                current: params.current,
                pageSize: params.pageSize,
                name: params.originalName,
              },
            },
          );
          return { data: res.data, total: res.total, success: res.success };
        }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        search={{ labelWidth: 'auto' }}
        toolBarRender={() => [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => actionRef.current?.reload()}
          >
            Làm mới
          </Button>,
        ]}
        summary={(data) => (
          <ProTable.Summary fixed>
            <ProTable.Summary.Row>
              <ProTable.Summary.Cell index={0} colSpan={2}>
                <Space size="large">
                  <Statistic
                    title="Tổng file"
                    value={data.length}
                    prefix={<LockOutlined />}
                    style={{ display: 'inline-block' }}
                  />
                  <Statistic
                    title="Dung lượng"
                    value={formatSize(data.reduce((s, f) => s + f.fileSizeBytes, 0))}
                    style={{ display: 'inline-block' }}
                  />
                </Space>
              </ProTable.Summary.Cell>
              <ProTable.Summary.Cell index={2} colSpan={3} />
            </ProTable.Summary.Row>
          </ProTable.Summary>
        )}
      />

      {/* Thông tin kỹ thuật */}
      <Row gutter={[16, 0]} style={{ marginTop: 16 }}>
        <Col>
          <Tag color="purple">AES-256-GCM</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {' '}
            File mã hóa bằng AES-GCM, auth tag 16 byte
          </Text>
        </Col>
        <Col>
          <Tag color="orange">RSA-OAEP</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {' '}
            AES key mã hóa bằng RSA public key, giải mã bằng private key cục bộ
          </Text>
        </Col>
        <Col>
          <Tag color="blue">IndexedDB</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {' '}
            Private key lưu trong trình duyệt, không lên server
          </Text>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default FileListPage;