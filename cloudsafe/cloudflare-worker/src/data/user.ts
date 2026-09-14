import { defaultUser } from './common';

export const currentUser = {
  ...defaultUser,
  access: 'admin',
};

export const userList = [
  { key: '1', name: 'Nguyễn Văn An', age: 28, address: 'Hải Phòng, Việt Nam' },
  { key: '2', name: 'Trần Thị Bình', age: 32, address: 'Hà Nội, Việt Nam' },
  { key: '3', name: 'Lê Minh Cường', age: 25, address: 'TP. Hồ Chí Minh, Việt Nam' },
];
