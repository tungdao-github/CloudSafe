export const titles = [
  'Báo cáo Q1',
  'Tài liệu thiết kế',
  'Hợp đồng khách hàng',
  'Dữ liệu nghiên cứu',
  'Hồ sơ nhân sự',
  'Bản vẽ kỹ thuật',
  'Dữ liệu tài chính',
  'Tài liệu bảo mật',
];

export const avatars = [
  'https://gw.alipayobjects.com/zos/rmsportal/WdGqmHpayyMjiEhcKoVE.png',
  'https://gw.alipayobjects.com/zos/rmsportal/zOsKZmFRdUtvpqCImOVY.png',
  'https://gw.alipayobjects.com/zos/rmsportal/dURIMkkrRFpPgTuzkwnB.png',
  'https://gw.alipayobjects.com/zos/rmsportal/sfjbOqnsXXJgNCjCzDBL.png',
  'https://gw.alipayobjects.com/zos/rmsportal/siCrBXXhmvTQGWPNLBow.png',
  'https://gw.alipayobjects.com/zos/rmsportal/kZzEzemZyKLKFsojXItE.png',
  'https://gw.alipayobjects.com/zos/rmsportal/ComBAopevLwENQdKWiIn.png',
  'https://gw.alipayobjects.com/zos/rmsportal/nxkuOJlFJuAUhzlMTCEe.png',
];

export const covers = [
  'https://gw.alipayobjects.com/zos/rmsportal/uMfMFlvUuceEyPpotzlq.png',
  'https://gw.alipayobjects.com/zos/rmsportal/iZBVOIhGJiAnhplqjvZW.png',
  'https://gw.alipayobjects.com/zos/rmsportal/iXjVmWVHbCJAyqvDxdtx.png',
  'https://gw.alipayobjects.com/zos/rmsportal/gLaIAoVWTtLbBWZNYEMg.png',
];

export const desc = [
  'File đã được mã hóa AES-256-GCM và bảo vệ bởi RSA-OAEP',
  'Chỉ chủ sở hữu có private key mới giải mã được file này',
  'Dữ liệu được mã hóa hoàn toàn tại phía client trước khi tải lên',
  'Server không lưu trữ bất kỳ thông tin nào về nội dung file',
  'Bảo mật zero-knowledge — server không thể đọc dữ liệu của bạn',
];

export const user = [
  'Nguyễn Văn An',
  'Trần Thị Bình',
  'Lê Minh Cường',
  'Phạm Thị Dung',
  'Hoàng Văn Em',
  'Vũ Thị Phương',
  'Đặng Minh Tuấn',
  'Bùi Thị Hoa',
  'Đỗ Văn Khoa',
  'Ngô Thị Lan',
];

export const members = [
  {
    avatar: 'https://gw.alipayobjects.com/zos/rmsportal/ZiESqWwCXBRQoaPONSJe.png',
    name: 'Trần Thị Bình',
    id: 'member1',
  },
  {
    avatar: 'https://gw.alipayobjects.com/zos/rmsportal/tBOxZPlITHqwlGjsJWaF.png',
    name: 'Lê Minh Cường',
    id: 'member2',
  },
  {
    avatar: 'https://gw.alipayobjects.com/zos/rmsportal/sBxjgqiuHMGRkIjqlQCd.png',
    name: 'Phạm Thị Dung',
    id: 'member3',
  },
];

export const defaultUser = {
  name: 'Nguyễn Admin',
  avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
  userid: '00000001',
  email: 'admin@cloudsafe.vn',
  signature: 'Bảo mật dữ liệu là ưu tiên hàng đầu',
  title: 'Quản trị viên hệ thống',
  group: 'CloudSafe — Nhóm Bảo mật & Hạ tầng',
  tags: [
    { key: '0', label: 'Bảo mật' },
    { key: '1', label: 'Mã hóa' },
    { key: '2', label: 'Cloud' },
    { key: '3', label: 'Zero-Knowledge' },
    { key: '4', label: 'AES-256' },
    { key: '5', label: 'RSA-OAEP' },
  ],
  notifyCount: 12,
  unreadCount: 11,
  country: 'Vietnam',
  geographic: {
    province: { label: 'Hải Phòng', key: 'HP' },
    city: { label: 'Ngô Quyền', key: 'NQ' },
  },
  address: '215 Lạch Tray, Ngô Quyền, Hải Phòng',
  phone: '0225-3888888',
};

const statuses = ['active', 'exception', 'normal'];

export function fakeList(count: number) {
  const safeCount = Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
  const list = [];
  for (let i = 0; i < safeCount; i += 1) {
    list.push({
      id: `fake-list-${i}`,
      owner: user[i % user.length],
      title: titles[i % titles.length],
      avatar: avatars[i % avatars.length],
      cover:
        Math.floor(i / covers.length) % 2 === 0
          ? covers[i % covers.length]
          : covers[covers.length - 1 - (i % covers.length)],
      status: statuses[i % statuses.length],
      percent: Math.ceil(Math.random() * 50) + 50,
      logo: avatars[i % avatars.length],
      href: 'https://cloudsafe.vn',
      updatedAt: Date.now() - Math.floor(Math.random() * 1000000000),
      createdAt: Date.now() - Math.floor(Math.random() * 1000000000),
      subDescription: desc[i % desc.length],
      description:
        'File được mã hóa bằng AES-256-GCM tại phía client. Khóa AES được bảo vệ bởi RSA-OAEP. Server chỉ lưu dữ liệu đã mã hóa và không thể đọc nội dung.',
      activeUser: Math.floor(Math.random() * 10000) + 1000,
      newUser: Math.floor(Math.random() * 1000) + 100,
      star: Math.floor(Math.random() * 100) + 10,
      like: Math.floor(Math.random() * 100) + 10,
      message: Math.floor(Math.random() * 100) + 10,
      content:
        'CloudSafe bảo vệ dữ liệu của bạn bằng mã hóa lai AES+RSA. Toàn bộ quá trình mã hóa diễn ra tại trình duyệt — server không bao giờ thấy dữ liệu gốc.',
      members,
    });
  }
  return list;
}
