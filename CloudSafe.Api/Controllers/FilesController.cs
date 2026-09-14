using CloudSafe.Api.Data;
using CloudSafe.Api.DTOs;
using CloudSafe.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CloudSafe.Api.Controllers;

using FileShare = CloudSafe.Api.Models.FileShare;
[ApiController]
[Route("api/files")]
[Authorize]
public class FilesController(AppDbContext db, IWebHostEnvironment env, ILogger<FilesController> logger) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string StorageRoot => Path.Combine(env.ContentRootPath, "Storage");

    // ── POST /api/files/upload ──────────────────────────────────────
    // Client uploads: (1) encrypted binary via multipart, (2) metadata JSON
    [HttpPost("upload")]
    [RequestSizeLimit(500 * 1024 * 1024)] // 500MB
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile encryptedData,
        [FromForm] string originalName,
        [FromForm] string encryptedAesKey,
        [FromForm] string iv,
        [FromForm] string authTag,
        [FromForm] Guid keyPairId,
        [FromForm] string mimeType = "application/octet-stream",
        [FromForm] string algorithm = "AES-256-GCM")
    {
        // Verify key belongs to user
        var key = await db.RsaKeyPairs
            .FirstOrDefaultAsync(k => k.Id == keyPairId && k.OwnerId == CurrentUserId && k.Status == KeyStatus.Active);
        if (key is null)
            return BadRequest(new { success = false, message = "Khóa RSA không hợp lệ hoặc đã bị thu hồi" });

        // Persist encrypted binary to disk
        Directory.CreateDirectory(StorageRoot);
        var storageName = $"{Guid.NewGuid()}.enc";
        var storagePath = Path.Combine(StorageRoot, storageName);

        await using (var fs = System.IO.File.Create(storagePath))
            await encryptedData.CopyToAsync(fs);

        var file = new EncryptedFile
        {
            OwnerId = CurrentUserId,
            OriginalName = originalName,
            StoragePath = storageName,
            FileSizeBytes = encryptedData.Length,
            MimeType = mimeType,
            Algorithm = algorithm,
            EncryptedAesKey = encryptedAesKey,
            Iv = iv,
            AuthTag = authTag,
            KeyPairId = keyPairId
        };

        db.EncryptedFiles.Add(file);
        await db.SaveChangesAsync();

        // Create upload notification
        db.Notices.Add(new Notice
        {
            UserId = CurrentUserId,
            Title = $"Tải lên thành công: {originalName}",
            Type = NoticeType.Notification
        });
        await db.SaveChangesAsync();

        logger.LogInformation("File uploaded: {Name} by {UserId}", originalName, CurrentUserId);
        return Ok(new { success = true, data = ToDto(file, "") });
    }

    // ── GET /api/files ──────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int current = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? name = null,
        [FromQuery] int? status = null)
    {
        var q = db.EncryptedFiles
            .Include(f => f.Owner)
            .Where(f => f.OwnerId == CurrentUserId && f.Status != FileStatus.Deleted)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(name))
            q = q.Where(f => f.OriginalName.Contains(name));

        if (status.HasValue)
            q = q.Where(f => (int)f.Status == status.Value);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(f => f.CreatedAt)
            .Skip((current - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            data = items.Select(f => ToDto(f, f.Owner.Name)),
            total,
            success = true
        });
    }

    // ── GET /api/files/{id}/metadata ───────────────────────────────
    // Returns encrypted AES key + IV so client can decrypt locally
    [HttpGet("{id:guid}/metadata")]
    public async Task<IActionResult> GetMetadata(Guid id)
    {
        var file = await db.EncryptedFiles
            .Include(f => f.Owner)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (file is null) return NotFound();

        // Allow owner or shared-with user
        var hasAccess = file.OwnerId == CurrentUserId
            || await db.FileShares.AnyAsync(s => s.FileId == id && s.SharedWithUserId == CurrentUserId);

        if (!hasAccess) return Forbid();

        // If shared user → return their re-encrypted AES key
        string aesKey = file.EncryptedAesKey;
        if (file.OwnerId != CurrentUserId)
        {
            var share = await db.FileShares.FirstAsync(s => s.FileId == id && s.SharedWithUserId == CurrentUserId);
            aesKey = share.ReEncryptedAesKey;
        }

        return Ok(new
        {
            data = new
            {
                file.Id,
                file.OriginalName,
                file.MimeType,
                file.Algorithm,
                EncryptedAesKey = aesKey,
                file.Iv,
                file.AuthTag,
                file.FileSizeBytes
            }
        });
    }

    // ── GET /api/files/{id}/download ───────────────────────────────
    // Returns raw encrypted binary — client decrypts locally
    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var file = await db.EncryptedFiles.FirstOrDefaultAsync(f => f.Id == id);
        if (file is null) return NotFound();

        var hasAccess = file.OwnerId == CurrentUserId
            || await db.FileShares.AnyAsync(s => s.FileId == id && s.SharedWithUserId == CurrentUserId);
        if (!hasAccess) return Forbid();

        var path = Path.Combine(StorageRoot, file.StoragePath);
        if (!System.IO.File.Exists(path)) return NotFound(new { message = "File vật lý không tồn tại" });

        return PhysicalFile(path, "application/octet-stream", $"{file.Id}.enc");
    }

    // ── DELETE /api/files/{id} ──────────────────────────────────────
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var file = await db.EncryptedFiles.FirstOrDefaultAsync(f => f.Id == id && f.OwnerId == CurrentUserId);
        if (file is null) return NotFound();

        // Soft delete
        file.Status = FileStatus.Deleted;
        file.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Optionally remove physical file
        var path = Path.Combine(StorageRoot, file.StoragePath);
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);

        return Ok(new { success = true });
    }

    // ── POST /api/files/share ───────────────────────────────────────
    [HttpPost("share")]
    public async Task<IActionResult> Share([FromBody] ShareFileRequest req)
    {
        var file = await db.EncryptedFiles.FirstOrDefaultAsync(f => f.Id == req.FileId && f.OwnerId == CurrentUserId);
        if (file is null) return NotFound(new { message = "File không tồn tại hoặc bạn không có quyền chia sẻ" });

        var recipient = await db.Users.FindAsync(req.SharedWithUserId);
        if (recipient is null) return NotFound(new { message = "Người dùng nhận không tồn tại" });

        var exists = await db.FileShares.AnyAsync(s => s.FileId == req.FileId && s.SharedWithUserId == req.SharedWithUserId);
        if (exists) return BadRequest(new { message = "File đã được chia sẻ với người dùng này" });

        db.FileShares.Add(new FileShare
        {
            FileId = req.FileId,
            SharedWithUserId = req.SharedWithUserId,
            SharedByUserId = CurrentUserId,
            ReEncryptedAesKey = req.ReEncryptedAesKey,
            ExpiresAt = req.ExpiresAt
        });

        file.Status = FileStatus.Shared;

        db.Notices.Add(new Notice
        {
            UserId = req.SharedWithUserId,
            Title = $"{User.FindFirstValue("name")} đã chia sẻ file {file.OriginalName} cho bạn",
            Type = NoticeType.Message
        });

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ── Shared files received ───────────────────────────────────────
    [HttpGet("shared-with-me")]
    public async Task<IActionResult> SharedWithMe([FromQuery] int current = 1, [FromQuery] int pageSize = 10)
    {
        var q = db.FileShares
            .Include(s => s.File).ThenInclude(f => f.Owner)
            .Where(s => s.SharedWithUserId == CurrentUserId
                     && (s.ExpiresAt == null || s.ExpiresAt > DateTime.UtcNow))
            .AsNoTracking();

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(s => s.SharedAt).Skip((current - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new
        {
            data = items.Select(s => ToDto(s.File, s.File.Owner.Name)),
            total,
            success = true
        });
    }

    // ── Helper ─────────────────────────────────────────────────────
    private static FileDto ToDto(EncryptedFile f, string ownerName) => new(
        f.Id, f.OriginalName, f.FileSizeBytes, f.MimeType, f.Algorithm,
        f.EncryptedAesKey, f.Iv, f.AuthTag, f.KeyPairId,
        f.Status.ToString(), ownerName, f.CreatedAt, f.UpdatedAt
    );
}
