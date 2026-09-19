using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text.Json;

namespace CloudSafe.Api.Controllers;

[ApiController]
[Route("api/crypto")]
public class CryptoController : ControllerBase
{
    // ── POST /api/crypto/encrypt ────────────────────────────────────
    [HttpPost("encrypt")]
    [RequestSizeLimit(500 * 1024 * 1024)]
    public async Task<IActionResult> Encrypt(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { success = false, message = "Chưa chọn file" });

        await using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var plainBytes = ms.ToArray();

        // Sinh AES-256 key + IV ngẫu nhiên
        var aesKey = RandomNumberGenerator.GetBytes(32);
        var iv = RandomNumberGenerator.GetBytes(12);

        // Mã hóa file bằng AES-256-GCM
        var cipherBytes = new byte[plainBytes.Length];
        var authTag = new byte[16];
        using (var aesGcm = new AesGcm(aesKey, 16))
            aesGcm.Encrypt(iv, plainBytes, cipherBytes, authTag);

        // Sinh RSA-2048 key pair
        using var rsa = RSA.Create(2048);
        var privateKeyPem = rsa.ExportRSAPrivateKeyPem();

        // Mã hóa AES key bằng RSA Public Key
        var encryptedAesKey = rsa.Encrypt(aesKey, RSAEncryptionPadding.OaepSHA256);

        var keyJson = JsonSerializer.Serialize(new
        {
            originalName = file.FileName,
            mimeType = file.ContentType ?? "application/octet-stream",
            sizeBytes = plainBytes.Length,
            algorithm = "AES-256-GCM + RSA-OAEP-SHA256",
            encryptedAesKeyBase64 = Convert.ToBase64String(encryptedAesKey),
            ivBase64 = Convert.ToBase64String(iv),
            authTagBase64 = Convert.ToBase64String(authTag),
            privateKeyPem,
        }, new JsonSerializerOptions { WriteIndented = true });

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
    [HttpPost("decrypt")]
    [RequestSizeLimit(500 * 1024 * 1024)]
    public async Task<IActionResult> Decrypt(IFormFile encFile, IFormFile keyFile)
    {
        if (encFile is null || keyFile is null)
            return BadRequest(new { success = false, message = "Cần upload cả file.enc và file.key.json" });

        // ── 1. Parse key.json ──────────────────────────────────────
        await using var keyMs = new MemoryStream();
        await keyFile.CopyToAsync(keyMs);
        var keyJson = System.Text.Encoding.UTF8.GetString(keyMs.ToArray());

        KeyMeta meta;
        try
        {
            meta = JsonSerializer.Deserialize<KeyMeta>(keyJson,
                       new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                   ?? throw new Exception("File rỗng");

            if (string.IsNullOrWhiteSpace(meta.EncryptedAesKeyBase64))
                throw new Exception("Thiếu encryptedAesKeyBase64");
            if (string.IsNullOrWhiteSpace(meta.IvBase64))
                throw new Exception("Thiếu ivBase64");
            if (string.IsNullOrWhiteSpace(meta.AuthTagBase64))
                throw new Exception("Thiếu authTagBase64");
            if (string.IsNullOrWhiteSpace(meta.PrivateKeyPem))
                throw new Exception("Thiếu privateKeyPem");
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                success = false,
                stage = "parse_key_json",
                message = "❌ File key.json không hợp lệ: " + ex.Message
            });
        }

        // ── 2. Giải mã AES key bằng RSA Private Key ────────────────
        byte[] aesKey;
        try
        {
            using var rsa = RSA.Create();
            rsa.ImportFromPem(meta.PrivateKeyPem);
            var encAesKeyBytes = Convert.FromBase64String(meta.EncryptedAesKeyBase64);
            aesKey = rsa.Decrypt(encAesKeyBytes, RSAEncryptionPadding.OaepSHA256);
        }
        catch (FormatException)
        {
            return BadRequest(new
            {
                success = false,
                stage = "rsa_decrypt",
                message = "❌ RSA Private Key sai định dạng (không phải PEM hợp lệ)"
            });
        }
        catch (CryptographicException ex)
        {
            return BadRequest(new
            {
                success = false,
                stage = "rsa_decrypt",
                message = "❌ RSA giải mã thất bại — Private Key sai hoặc không khớp với file này. Chi tiết: " + ex.Message
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                success = false,
                stage = "rsa_decrypt",
                message = "❌ Lỗi RSA: " + ex.Message
            });
        }

        // ── 3. Giải mã file bằng AES key ───────────────────────────
        await using var encMs = new MemoryStream();
        await encFile.CopyToAsync(encMs);
        var cipherBytes = encMs.ToArray();

        byte[] plainBytes;
        try
        {
            var iv = Convert.FromBase64String(meta.IvBase64);
            var authTag = Convert.FromBase64String(meta.AuthTagBase64);

            if (iv.Length != 12)
                throw new Exception($"IV phải 12 bytes, nhận {iv.Length} bytes");
            if (authTag.Length != 16)
                throw new Exception($"AuthTag phải 16 bytes, nhận {authTag.Length} bytes");

            plainBytes = new byte[cipherBytes.Length];
            using var aesGcm = new AesGcm(aesKey, 16);
            aesGcm.Decrypt(iv, cipherBytes, authTag, plainBytes);
        }
        catch (CryptographicException)
        {
            // AES-GCM throw CryptographicException khi authTag không khớp
            // Tức là: file.enc bị sửa, hoặc key.json không thuộc về file.enc này
            return BadRequest(new
            {
                success = false,
                stage = "aes_decrypt",
                message = "❌ AES giải mã thất bại — file.enc và file.key.json không khớp nhau, hoặc file.enc đã bị chỉnh sửa"
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                success = false,
                stage = "aes_decrypt",
                message = "❌ Lỗi AES: " + ex.Message
            });
        }

        // ── 4. Trả về file gốc ─────────────────────────────────────
        var mimeType = meta.MimeType ?? "application/octet-stream";
        var originalName = meta.OriginalName ?? "decrypted_file";
        return File(plainBytes, mimeType, originalName);
    }

    // ── DTO ────────────────────────────────────────────────────────
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