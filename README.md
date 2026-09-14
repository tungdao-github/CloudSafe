# 🔐 CloudSafe — Mã hóa dữ liệu đám mây AES-256-GCM + RSA-OAEP

## Cấu trúc project

```
/
├── CloudSafe.Api/          ← .NET 9 Web API
│   ├── Controllers/        ← AuthController, FilesController, KeysController, ...
│   ├── Models/             ← User, EncryptedFile, RsaKeyPair, FileShare, Notice
│   ├── Data/               ← AppDbContext (EF Core)
│   ├── DTOs/               ← Request/Response records
│   ├── Services/           ← JwtService
│   ├── Middleware/         ← ErrorHandlingMiddleware
│   ├── Migrations/         ← EF Core migrations
│   ├── Program.cs          ← Minimal API setup
│   └── appsettings.json
│
└── cloudsafe/              ← Ant Design Pro frontend (React/UmiJS)
    ├── src/
    │   ├── pages/
    │   │   ├── Welcome.tsx
    │   │   ├── files/upload/     ← Trang upload + mã hóa
    │   │   ├── files/list/       ← Danh sách file đã mã hóa
    │   │   └── keys/manage/      ← Quản lý RSA key pair
    │   ├── services/
    │   │   └── ant-design-pro/api.ts  ← Gọi .NET API
    │   └── locales/              ← Tiếng Việt
    └── config/
        ├── routes.ts
        └── proxy.ts             ← /api/* → localhost:5000
```

---

## 🚀 Cách chạy

### 1. Yêu cầu

- .NET 9 SDK
- SQL Server (hoặc SQL Server Express / LocalDB)
- Node.js 18+

---

### 2. Chạy .NET API

```bash
cd CloudSafe.Api

# Cập nhật connection string trong appsettings.Development.json
# "DefaultConnection": "Server=localhost;Database=CloudSafeDb_Dev;..."

# Apply migration → tạo DB + seed admin
dotnet ef database update

# Hoặc nếu chưa có migration:
dotnet ef migrations add InitialCreate
dotnet ef database update

# Chạy API
dotnet run
# → http://localhost:5000
# → Swagger: http://localhost:5000/swagger
```

**Tài khoản mặc định:**
- Username: `admin`
- Password: `ant.design`

---

### 3. Chạy Frontend

```bash
cd cloudsafe

npm install
npm run dev
# → http://localhost:8000
# → Tự động proxy /api/* → http://localhost:5000
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/login/account` | Đăng nhập → JWT |
| POST | `/api/login/outLogin` | Đăng xuất |
| POST | `/api/register/account` | Đăng ký tài khoản mới |

### User
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/currentUser` | Lấy thông tin user hiện tại |
| PUT | `/api/currentUser` | Cập nhật profile |

### Files (🔒 cần JWT)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/files/upload` | Upload file đã mã hóa (multipart) |
| GET | `/api/files` | Danh sách file của user |
| GET | `/api/files/{id}/metadata` | Lấy encrypted AES key + IV để giải mã |
| GET | `/api/files/{id}/download` | Tải về file binary đã mã hóa |
| DELETE | `/api/files/{id}` | Xóa file |
| POST | `/api/files/share` | Chia sẻ file với user khác |
| GET | `/api/files/shared-with-me` | File được chia sẻ cho mình |

### RSA Keys (🔒 cần JWT)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/keys` | Danh sách key pair của user |
| POST | `/api/keys` | Đăng ký public key (private key lưu ở browser) |
| GET | `/api/keys/{id}/public` | Lấy public key |
| GET | `/api/keys/user/{userId}/active` | Public key active của user khác (dùng khi share) |
| PATCH | `/api/keys/{id}/revoke` | Thu hồi key |
| PATCH | `/api/keys/{id}/rename` | Đổi tên key |

### Notices (🔒 cần JWT)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/notices` | Danh sách thông báo |
| PATCH | `/api/notices/{id}/read` | Đánh dấu đã đọc |
| PATCH | `/api/notices/read-all` | Đánh dấu tất cả đã đọc |

### Dashboard (🔒 cần JWT)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/dashboard/stats` | Thống kê tổng quan |
| GET | `/api/dashboard/fake_analysis_chart_data` | Dữ liệu biểu đồ |
| GET | `/api/dashboard/project/notice` | Dự án gần đây |
| GET | `/api/dashboard/activities` | Hoạt động gần đây |

### Generic Table
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/rule?current=1&pageSize=10` | Danh sách dạng bảng |
| POST | `/api/rule` | Thêm/sửa/xóa |

---

## 🔐 Luồng mã hóa

### Upload
```
Browser:
1. crypto.getRandomValues(32 bytes) → AES-256 key
2. crypto.subtle.encrypt("AES-GCM", aesKey, fileBuffer) → ciphertext + authTag + iv
3. crypto.subtle.encrypt("RSA-OAEP", rsaPublicKey, aesKey) → encryptedAesKey (Base64)

POST /api/files/upload (multipart):
  - encryptedData: [binary ciphertext]
  - originalName, encryptedAesKey, iv, authTag, keyPairId

Server: lưu binary file + metadata. Không bao giờ đọc được nội dung.
```

### Download
```
GET /api/files/{id}/metadata → { encryptedAesKey, iv, authTag }
GET /api/files/{id}/download → [binary ciphertext]

Browser:
1. crypto.subtle.decrypt("RSA-OAEP", rsaPrivateKey, encryptedAesKey) → aesKey
2. crypto.subtle.decrypt("AES-GCM", aesKey, ciphertext, { iv, additionalData: authTag }) → plaintext
3. Tải về file gốc
```

---

## 🛡️ Bảo mật

- **Private key KHÔNG bao giờ rời browser** — lưu trong Web Crypto API / IndexedDB
- **Server Zero-Knowledge** — chỉ lưu ciphertext và encrypted AES key
- **JWT HttpOnly Cookie** — chống XSS
- **BCrypt** — hash password với salt
- **EF Core parameterized queries** — chống SQL Injection
- **CORS** — chỉ cho phép domain đã cấu hình

---

## 🗄️ Database Schema

```
Users (Id, Username, Email, PasswordHash, Name, Role, ...)
  ├── RsaKeyPairs (Id, OwnerId→Users, PublicKeyPem, Fingerprint, Status)
  ├── EncryptedFiles (Id, OwnerId→Users, KeyPairId→RsaKeyPairs, EncryptedAesKey, Iv, AuthTag, StoragePath)
  │     └── FileShares (Id, FileId→EncryptedFiles, SharedWithUserId→Users, ReEncryptedAesKey)
  └── Notices (Id, UserId→Users, Title, Type, Status)
```
