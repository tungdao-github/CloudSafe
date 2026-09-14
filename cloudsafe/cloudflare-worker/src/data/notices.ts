type NoticeItem =
  | {
      id: string;
      avatar: string;
      title: string;
      datetime: string;
      type: 'notification';
      read?: boolean;
    }
  | {
      id: string;
      avatar: string;
      title: string;
      description: string;
      datetime: string;
      type: 'message';
      clickClose?: boolean;
    }
  | {
      id: string;
      title: string;
      description: string;
      extra: string;
      status: 'todo' | 'urgent' | 'doing' | 'processing';
      type: 'event';
    };

export const notices: NoticeItem[] = [
  {
    id: '000000001',
    avatar: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/MSbDR4FR2MUAAAAAAAAAAAAAFl94AQBr',
    title: 'Bạn có 5 file mới được chia sẻ',
    datetime: '2024-09-10',
    type: 'notification',
  },
  {
    id: '000000002',
    avatar: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/hX-PTavYIq4AAAAAAAAAAAAAFl94AQBr',
    title: 'Khóa RSA sắp hết hạn sau 7 ngày',
    datetime: '2024-09-09',
    type: 'notification',
  },
  {
    id: '000000003',
    avatar: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/cnG1-YDUiDAAAAAAAAAAAAAAFl94AQBr',
    title: 'Tải lên thành công: Bao_cao_Q3.pdf',
    datetime: '2024-09-08',
    type: 'notification',
  },
  {
    id: '000000004',
    avatar: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/iQjMSJcTMDAAAAAAAAAAAAAFl94AQBr',
    title: 'Cảnh báo bảo mật: Đăng nhập từ thiết bị mới',
    datetime: '2024-09-07',
    type: 'notification',
    read: true,
  },
  {
    id: '000000005',
    avatar: 'https://gw.alipayobjects.com/zos/rmsportal/ThXAXghbEsBCCSDihZxY.png',
    title: 'Trần Thị Bình',
    description: 'Đã chia sẻ file Hop_dong_2024.pdf cho bạn',
    datetime: '2024-09-10',
    type: 'message',
    clickClose: true,
  },
  {
    id: '000000006',
    avatar: 'https://gw.alipayobjects.com/zos/rmsportal/fcHMVNCjPOsbUGdEduuv.jpeg',
    title: 'Lê Minh Cường',
    description: 'Yêu cầu truy cập file Du_lieu_nghien_cuu.zip',
    datetime: '2024-09-09',
    type: 'message',
  },
  {
    id: '000000007',
    title: 'Gia hạn khóa RSA',
    description: 'Khóa chính sắp hết hạn, cần gia hạn trước 17/09',
    extra: 'Khẩn cấp',
    status: 'urgent',
    type: 'event',
  },
  {
    id: '000000008',
    title: 'Sao lưu khóa private key',
    description: 'Chưa thực hiện sao lưu private key',
    extra: 'Chưa bắt đầu',
    status: 'todo',
    type: 'event',
  },
  {
    id: '000000009',
    title: 'Xem lại nhật ký truy cập',
    description: 'Kiểm tra log truy cập tháng 9',
    extra: 'Đang xử lý',
    status: 'doing',
    type: 'event',
  },
];
