using CloudSafe.Api.Data;
using CloudSafe.Api.DTOs;
using CloudSafe.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CloudSafe.Api.Controllers;

[ApiController]
[Route("api/keys")]
[Authorize]
public class KeysController(AppDbContext db, ILogger<KeysController> logger) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ── GET /api/keys ──────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var keys = await db.RsaKeyPairs
            .Where(k => k.OwnerId == CurrentUserId)
            .OrderByDescending(k => k.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        // Count files per key
        var usageCounts = await db.EncryptedFiles
            .Where(f => f.OwnerId == CurrentUserId)
            .GroupBy(f => f.KeyPairId)
            .Select(g => new { KeyId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.KeyId, x => x.Count);

        var dtos = keys.Select(k => new KeyPairDto(
            Id: k.Id,
            Name: k.Name,
            Algorithm: k.Algorithm,
            KeySize: k.KeySize,
            PublicKeyFingerprint: k.PublicKeyFingerprint,
            Status: k.Status.ToString(),
            UsageCount: usageCounts.GetValueOrDefault(k.Id),
            CreatedAt: k.CreatedAt,
            RevokedAt: k.RevokedAt
        ));

        return Ok(new { data = dtos, success = true });
    }

    // ── POST /api/keys ─────────────────────────────────────────────
    // Client generates RSA key pair in browser (Web Crypto API),
    // sends only the PUBLIC key here. Private key stays in browser.
    [HttpPost]
    public async Task<IActionResult> Register([FromBody] RegisterKeyRequest req)
    {
        // Validate it looks like a PEM public key
        if (!req.PublicKeyPem.Contains("PUBLIC KEY"))
            return BadRequest(new { success = false, message = "PublicKeyPem không hợp lệ" });

        var key = new RsaKeyPair
        {
            OwnerId = CurrentUserId,
            Name = req.Name,
            KeySize = req.KeySize,
            PublicKeyPem = req.PublicKeyPem,
            PublicKeyFingerprint = req.PublicKeyFingerprint
        };

        db.RsaKeyPairs.Add(key);
        await db.SaveChangesAsync();

        logger.LogInformation("RSA key registered: {KeyId} for user {UserId}", key.Id, CurrentUserId);
        return Ok(new
        {
            success = true,
            data = new KeyPairDto(
                key.Id, key.Name, key.Algorithm, key.KeySize,
                key.PublicKeyFingerprint, key.Status.ToString(), 0,
                key.CreatedAt, null)
        });
    }

    // ── GET /api/keys/{id}/public ──────────────────────────────────
    // Any authenticated user can fetch another user's public key (for sharing)
    [HttpGet("{id:guid}/public")]
    public async Task<IActionResult> GetPublicKey(Guid id)
    {
        var key = await db.RsaKeyPairs
            .Where(k => k.Id == id && k.Status == KeyStatus.Active)
            .Select(k => new { k.Id, k.PublicKeyPem, k.PublicKeyFingerprint, k.Algorithm, k.KeySize })
            .FirstOrDefaultAsync();

        if (key is null) return NotFound();
        return Ok(new { data = key });
    }

    // ── GET /api/keys/user/{userId}/active ─────────────────────────
    // Get active public key of any user (needed for re-encryption on share)
    [HttpGet("user/{userId:guid}/active")]
    public async Task<IActionResult> GetUserActiveKey(Guid userId)
    {
        var key = await db.RsaKeyPairs
            .Where(k => k.OwnerId == userId && k.Status == KeyStatus.Active)
            .OrderByDescending(k => k.CreatedAt)
            .Select(k => new { k.Id, k.PublicKeyPem, k.PublicKeyFingerprint })
            .FirstOrDefaultAsync();

        if (key is null) return NotFound(new { message = "Người dùng chưa đăng ký khóa RSA" });
        return Ok(new { data = key });
    }

    // ── PATCH /api/keys/{id}/revoke ────────────────────────────────
    [HttpPatch("{id:guid}/revoke")]
    public async Task<IActionResult> Revoke(Guid id)
    {
        var key = await db.RsaKeyPairs
            .FirstOrDefaultAsync(k => k.Id == id && k.OwnerId == CurrentUserId);

        if (key is null) return NotFound();
        if (key.Status == KeyStatus.Revoked)
            return BadRequest(new { success = false, message = "Khóa đã bị thu hồi" });

        key.Status = KeyStatus.Revoked;
        key.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        logger.LogWarning("RSA key revoked: {KeyId} by {UserId}", id, CurrentUserId);
        return Ok(new { success = true });
    }

    // ── PATCH /api/keys/{id}/rename ────────────────────────────────
    [HttpPatch("{id:guid}/rename")]
    public async Task<IActionResult> Rename(Guid id, [FromBody] RenameKeyRequest req)
    {
        var key = await db.RsaKeyPairs
            .FirstOrDefaultAsync(k => k.Id == id && k.OwnerId == CurrentUserId);
        if (key is null) return NotFound();

        key.Name = req.Name;
        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }
}

public record RenameKeyRequest([System.ComponentModel.DataAnnotations.Required] string Name);
