/**
 * Proxy config — dev server tại localhost:8000
 * Tất cả /api/* → .NET 9 API tại localhost:5000
 *
 * Chạy .NET API: cd CloudSafe.Api && dotnet run
 * Chạy Frontend: npm run dev
 */
export default {
  dev: {
    '/api/': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
  test: {
    '/api/': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
  pre: {
    '/api/': {
      target: 'https://api.cloudsafe.vn',
      changeOrigin: true,
    },
  },
};
