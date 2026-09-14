export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        path: '/user/login',
        name: 'login',
        component: './user/login',
      },
      {
        path: '/user',
        redirect: '/user/login',
      },
      {
        name: 'register-result',
        icon: 'checkCircle',
        path: '/user/register-result',
        component: './user/register-result',
      },
      {
        name: 'register',
        icon: 'userAdd',
        path: '/user/register',
        component: './user/register',
      },
      {
        name: '404',
        component: './exception/404',
        path: '/user/*',
      },
    ],
  },
  {
    path: '/welcome',
    name: 'welcome',
    icon: 'home',
    component: './Welcome',
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    icon: 'dashboard',
    routes: [
      {
        path: '/dashboard',
        redirect: '/dashboard/analysis',
      },
      {
        name: 'analysis',
        icon: 'barChart',
        path: '/dashboard/analysis',
        component: './dashboard/analysis',
      },
      {
        name: 'monitor',
        icon: 'monitor',
        path: '/dashboard/monitor',
        component: './dashboard/monitor',
      },
      {
        name: 'workplace',
        icon: 'desktop',
        path: '/dashboard/workplace',
        component: './dashboard/workplace',
      },
    ],
  },
  {
    path: '/files',
    name: 'files',
    icon: 'cloudUpload',
    routes: [
      {
        path: '/files',
        redirect: '/files/upload',
      },
      {
        name: 'upload',
        icon: 'upload',
        path: '/files/upload',
        component: './files/upload',
      },
      {
        name: 'list',
        icon: 'fileProtect',
        path: '/files/list',
        component: './files/list',
      },
    ],
  },
  {
    path: '/keys',
    name: 'keys',
    icon: 'key',
    routes: [
      {
        path: '/keys',
        redirect: '/keys/manage',
      },
      {
        name: 'manage',
        icon: 'safety',
        path: '/keys/manage',
        component: './keys/manage',
      },
    ],
  },
  {
    name: 'Mã hóa / Giải mã',
    icon: 'lock',
    path: '/crypto',
    routes: [
      { name: '🔒 Mã hóa', path: '/crypto/encrypt', component: './crypto/encrypt', icon: 'lock' },
      { name: '🔓 Giải mã', path: '/crypto/decrypt', component: './crypto/decrypt', icon: 'unlock' },
    ],
  },
  {
    path: '/list',
    icon: 'table',
    name: 'list',
    routes: [
      {
        path: '/list',
        redirect: '/list/table-list',
      },
      {
        name: 'table-list',
        icon: 'table',
        path: '/list/table-list',
        component: './table-list',
      },
    ],
  },
  {
    name: 'account',
    icon: 'user',
    path: '/account',
    routes: [
      {
        path: '/account',
        redirect: '/account/center',
      },
      {
        name: 'center',
        icon: 'user',
        path: '/account/center',
        component: './account/center',
      },
      {
        name: 'settings',
        icon: 'setting',
        path: '/account/settings',
        component: './account/settings',
      },
    ],
  },
  {
    path: '/',
    redirect: '/welcome',
  },
  {
    component: './exception/404',
    path: '/*',
  },
];
