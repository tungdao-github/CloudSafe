using CloudSafe.Api.Data;
using CloudSafe.Api.DTOs;
using CloudSafe.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CloudSafe.Api.Controllers;

// ── Notices ────────────────────────────────────────────────────────

[ApiController]
[Route("api/notices")]
[Authorize]
public class NoticesController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/notices
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var notices = await db.Notices
            .Where(n => n.UserId == CurrentUserId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(20)
            .AsNoTracking()
            .ToListAsync();

        var dtos = notices.Select(n => new NoticeDto(
            Id: n.Id.ToString(),
            Avatar: n.Avatar,
            Title: n.Title,
            Description: n.Description,
            Extra: n.Extra,
            Type: n.Type.ToString().ToLower(),
            Status: n.Type == NoticeType.Event ? "todo" : null,
            Read: n.Status == NoticeStatus.Read,
            CreatedAt: n.CreatedAt
        ));

        return Ok(new NoticeListResult(dtos.ToList(), notices.Count, true));
    }

    // PATCH /api/notices/{id}/read
    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var notice = await db.Notices.FirstOrDefaultAsync(n => n.Id == id && n.UserId == CurrentUserId);
        if (notice is null) return NotFound();
        notice.Status = NoticeStatus.Read;
        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // PATCH /api/notices/read-all
    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await db.Notices
            .Where(n => n.UserId == CurrentUserId && n.Status == NoticeStatus.Unread)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.Status, NoticeStatus.Read));
        return Ok(new { success = true });
    }
}

// ── Table (Rule) list — matches Ant Design Pro /api/rule ───────────

[ApiController]
[Route("api/rule")]
[Authorize]
public class RuleController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/rule?current=1&pageSize=10
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int current = 1, [FromQuery] int pageSize = 10, [FromQuery] string? name = null)
    {
        // Map EncryptedFiles → TableItemDto format for the generic table page
        var q = db.EncryptedFiles
            .Include(f => f.Owner)
            .Where(f => f.OwnerId == CurrentUserId && f.Status != FileStatus.Deleted)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(name))
            q = q.Where(f => f.OriginalName.Contains(name));

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(f => f.CreatedAt)
            .Skip((current - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select((f, i) => new TableItemDto(
            Key: i,
            Disabled: false,
            Name: f.OriginalName,
            Owner: f.Owner.Name,
            Desc: $"Mã hóa {f.Algorithm} — {FormatBytes(f.FileSizeBytes)}",
            CallNo: (int)(f.FileSizeBytes / 1024),
            Status: (int)f.Status,
            UpdatedAt: f.UpdatedAt.ToString("yyyy-MM-dd HH:mm"),
            CreatedAt: f.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
            Progress: 100
        ));

        return Ok(new TableListResult(dtos.ToList(), total, true));
    }

    // POST /api/rule  (body: { method: "post"|"update"|"delete", ... })
    [HttpPost]
    public async Task<IActionResult> Mutate([FromBody] RuleMutateRequest req)
    {
        switch (req.Method)
        {
            case "post":
                // Create a placeholder encrypted file record
                var file = new EncryptedFile
                {
                    OwnerId = CurrentUserId,
                    OriginalName = req.Name ?? "Tệp mới",
                    StoragePath = "",
                    Algorithm = "AES-256-GCM",
                    EncryptedAesKey = "",
                    Iv = "",
                    AuthTag = "",
                    KeyPairId = Guid.Empty
                };
                db.EncryptedFiles.Add(file);
                await db.SaveChangesAsync();
                return Ok(new { success = true, data = new { file.Id, file.OriginalName } });

            case "update":
                return Ok(new { success = true });

            case "delete":
                if (req.Key.HasValue)
                {
                    // soft delete by index is impractical; use /api/files/{id} DELETE instead
                }
                return Ok(new { success = true });

            default:
                return BadRequest(new { success = false, message = "Method không hợp lệ" });
        }
    }

    private static string FormatBytes(long bytes) =>
        bytes switch
        {
            < 1024 => $"{bytes} B",
            < 1024 * 1024 => $"{bytes / 1024.0:F1} KB",
            < 1024 * 1024 * 1024 => $"{bytes / 1024.0 / 1024:F1} MB",
            _ => $"{bytes / 1024.0 / 1024 / 1024:F1} GB"
        };
}

public record RuleMutateRequest(string Method, string? Name = null, string? Desc = null, int? Key = null);
