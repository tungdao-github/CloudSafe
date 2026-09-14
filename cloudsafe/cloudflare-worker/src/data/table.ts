export interface RuleListItem {
  key: number;
  disabled?: boolean;
  href: string;
  avatar: string;
  name: string;
  owner: string;
  desc: string;
  callNo: number;
  status: number;
  updatedAt: string;
  createdAt: string;
  progress: number;
}

const avatars = [
  'https://gw.alipayobjects.com/zos/rmsportal/eeHMaZBwmTvLdIwMfBpg.png',
  'https://gw.alipayobjects.com/zos/rmsportal/udxAbMEhpwthVVcjLXik.png',
];

const fileNames = [
  'Hop_dong_KH_2024.pdf',
  'Bao_cao_tai_chinh_Q3.xlsx',
  'Ho_so_nhan_su_thang_9.docx',
  'Du_lieu_nghien_cuu.zip',
  'Tai_lieu_thiet_ke_he_thong.pdf',
  'Danh_sach_khach_hang.csv',
  'Ket_qua_kiem_thu.docx',
  'Huong_dan_su_dung.pdf',
  'Bien_ban_hop_HDQT.docx',
  'Ke_hoach_kinh_doanh_2025.pptx',
];

const owners = [
  'Nguyễn Văn An',
  'Trần Thị Bình',
  'Lê Minh Cường',
  'Phạm Thị Dung',
  'Hoàng Văn Em',
];

const generateTableData = (count: number): RuleListItem[] => {
  const today = new Date().toISOString().split('T')[0];
  return Array.from({ length: count }, (_, i) => ({
    key: i,
    disabled: i % 6 === 0,
    href: 'https://cloudsafe.vn',
    avatar: avatars[i % 2],
    name: fileNames[i % fileNames.length],
    owner: owners[i % owners.length],
    desc: 'File đã được mã hóa AES-256-GCM + RSA-OAEP',
    callNo: Math.floor(Math.random() * 1000),
    status: Math.floor(Math.random() * 4),
    updatedAt: today,
    createdAt: today,
    progress: Math.ceil(Math.random() * 100),
  })).reverse();
};

export const tableListDataSource = generateTableData(100);
