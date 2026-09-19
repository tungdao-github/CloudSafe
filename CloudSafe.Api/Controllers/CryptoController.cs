using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text.Json;

namespace CloudSafe.Api.Controllers;

/// <summary>
/// Server-side encrypt / decrypt — không cần lưu DB, không cần JWT (tùy thầy bật [Authorize])
/// 
/// POST /api/crypto/encrypt   — upload file gốc → trả về file.enc + key.json
/// POST /api/crypto/decrypt   — upload file.enc + key.json → trả về file gốc
/// </summary>
[ApiController]
[Route("api/crypto")]
// Bỏ [Authorize] nếu muốn public, giữ lại nếu cần đăng nhập
// [Authorize]
public class CryptoController : ControllerBase
{
    // ── POST /api/crypto/encrypt ────────────────────────────────────
    // Form: file (IFormFile)
    // Response: ZIP gồm file.enc + key.json   HOẶC trả 2 header link tải riêng
    // Ở đây trả JSON có 2 field base64 để frontend tự tải — đơn giản nhất
    [HttpPost("encrypt")]
    [RequestSizeLimit(500 * 1024 * 1024)]
    public async Task<IActionResult> Encrypt(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { success = false, message = "Chưa chọn file" });

        // 1. Đọc file gốc
        await using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var plainBytes = ms.ToArray();

        // 2. Sinh AES-256 key + IV ngẫu nhiên
        var aesKey = RandomNumberGenerator.GetBytes(32); // 256-bit
        var iv = RandomNumberGenerator.GetBytes(12);     // 96-bit nonce cho GCM

        // 3. Mã hóa AES-256-GCM
        var cipherBytes = new byte[plainBytes.Length];
        var authTag = new byte[16];
        using (var aesGcm = new AesGcm(aesKey, 16))
        {
            aesGcm.Encrypt(iv, plainBytes, cipherBytes, authTag);
        }

        // 4. Sinh cặp RSA-2048
        using var rsa = RSA.Create(2048);
        var privateKeyPem = rsa.ExportRSAPrivateKeyPem();
        var publicKeyPem = rsa.ExportRSAPublicKeyPem();

        // 5. Mã hóa AES key bằng RSA-OAEP-SHA256
        var encryptedAesKey = rsa.Encrypt(aesKey, RSAEncryptionPadding.OaepSHA256);

        // 6. Build key.json
        var keyJson = JsonSerializer.Serialize(new
        {
            originalName = file.FileName,
            mimeType = file.ContentType ?? "application/octet-stream",
            sizeBytes = plainBytes.Length,
            algorithm = "AES-256-GCM + RSA-OAEP-SHA256",
            encryptedAesKeyBase64 = Convert.ToBase64String(encryptedAesKey),
            ivBase64 = Convert.ToBase64String(iv),
            authTagBase64 = Convert.ToBase64String(authTag),
            // Private key để giải mã — thầy có thể tách ra file riêng nếu muốn
            privateKeyPem,
        }, new JsonSerializerOptions { WriteIndented = true });

        // 7. Trả về JSON chứa 2 blob base64 — frontend dùng để tải về
        return Ok(new
        {
            success = true,
            encFileName = file.FileName + ".enc",
            keyFileName = file.FileName + ".key.json",
            encBase64 = Convert.ToBase64String(cipherBytes),
            keyJsonBase64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(keyJson)),
        });
    }

    // ── POST /api/crypto/decrypt ────────────────────────────────────
    // Form: encFile (IFormFile) — file .enc
    //       keyFile (IFormFile) — file .key.json (chứa privateKeyPem bên trong)
    // Response: file gốc (stream)
    [HttpPost("decrypt")]
    [RequestSizeLimit(500 * 1024 * 1024)]
    public async Task<IActionResult> Decrypt(IFormFile encFile, IFormFile keyFile)
    {
        if (encFile is null || keyFile is null)
            return BadRequest(new { success = false, message = "Cần upload cả file.enc và file.key.json" });

        // 1. Đọc key.json
        await using var keyMs = new MemoryStream();
        await keyFile.CopyToAsync(keyMs);
        var keyJson = System.Text.Encoding.UTF8.GetString(keyMs.ToArray());

        KeyMeta meta;
        try
        {
            meta = JsonSerializer.Deserialize<KeyMeta>(keyJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? throw new Exception("key.json rỗng");
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = "key.json không hợp lệ: " + ex.Message });
        }

        // 2. Đọc file .enc
        await using var encMs = new MemoryStream();
        await encFile.CopyToAsync(encMs);
        var cipherBytes = encMs.ToArray();

        // 3. Giải mã AES key bằng RSA private key
        byte[] aesKey;
        try
        {
            using var rsa = RSA.Create();
            rsa.ImportFromPem(meta.PrivateKeyPem);
            var encAesKey = Convert.FromBase64String(meta.EncryptedAesKeyBase64);
            aesKey = rsa.Decrypt(encAesKey, RSAEncryptionPadding.OaepSHA256);
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = "Giải mã RSA thất bại: " + ex.Message });
        }

        // 4. Giải mã AES-256-GCM
        byte[] plainBytes;
        try
        {
            var iv = Convert.FromBase64String(meta.IvBase64);
            var authTag = Convert.FromBase64String(meta.AuthTagBase64);
            plainBytes = new byte[cipherBytes.Length];
            using var aesGcm = new AesGcm(aesKey, 16);
            aesGcm.Decrypt(iv, cipherBytes, authTag, plainBytes);
        }
        catch (CryptographicException)
        {
            return BadRequest(new { success = false, message = "Giải mã AES thất bại — file bị sửa hoặc key sai" });
        }

        // 5. Trả về file gốc
        var mimeType = meta.MimeType ?? "application/octet-stream";
        var originalName = meta.OriginalName ?? "decrypted_file";
        return File(plainBytes, mimeType, originalName);
    }

    // ── DTO nội bộ ──────────────────────────────────────────────────
    private sealed class KeyMeta
    {
        public string OriginalName { get; set; } = "";
        public string MimeType { get; set; } = "application/octet-stream";
        public long SizeBytes { get; set; }
        public string EncryptedAesKeyBase64 { get; set; } = "";
        public string IvBase64 { get; set; } = "";
        public string AuthTagBase64 { get; set; } = "";
        public string PrivateKeyPem { get; set; } = "";
    }
}