using System.ComponentModel.DataAnnotations;

namespace CloudSafe.Api.DTOs;

// ── Auth ──────────────────────────────────────────────────────────

public record LoginRequest(
    [Required] string Username,
    [Required] string Password,
    bool AutoLogin = false,
    string Type = "account"
);

public record LoginResult(
    string Status,       // "ok" | "error"
    string Type,
    string CurrentAuthority // "admin" | "user"
);

public record RegisterRequest(
    [Required][MinLength(3)] string Username,
    [Required][EmailAddress] string Email,
    [Required][MinLength(6)] string Password,
    string? Name = null
);

// ── User ──────────────────────────────────────────────────────────

public record CurrentUserDto(
    string UserId,
    string Name,
    string? Avatar,
    string Email,
    string? Phone,
    string? Title,
    string? Signature,
    string? Group,
    string? Address,
    string Access,  // "admin" | "user"
    int NotifyCount,
    int UnreadCount
);

public record UpdateUserRequest(
    string? Name,
    string? Email,
    string? Phone,
    string? Title,
    string? Signature,
    string? Group,
    string? Address
);

// ── File ──────────────────────────────────────────────────────────

public record UploadFileRequest(
    [Required] string OriginalName,
    [Required] string EncryptedAesKey,  // RSA-OAEP encrypted, Base64
    [Required] string Iv,               // GCM nonce, Base64
    [Required] string AuthTag,          // GCM auth tag, Base64
    [Required] Guid KeyPairId,
    long FileSizeBytes = 0,
    string MimeType = "application/octet-stream",
    string Algorithm = "AES-256-GCM"
);

public record FileDto(
    Guid Id,
    string OriginalName,
    long FileSizeBytes,
    string MimeType,
    string Algorithm,
    string EncryptedAesKey,
    string Iv,
    string AuthTag,
    Guid KeyPairId,
    string Status,
    string Owner,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record FileListResult(
    List<FileDto> Data,
    int Total,
    bool Success
);

public record ShareFileRequest(
    [Required] Guid FileId,
    [Required] Guid SharedWithUserId,
    [Required] string ReEncryptedAesKey,
    DateTime? ExpiresAt = null
);

// ── RSA Key ───────────────────────────────────────────────────────

public record RegisterKeyRequest(
    [Required] string PublicKeyPem,
    [Required] string PublicKeyFingerprint,
    string Name = "Khóa chính",
    int KeySize = 2048
);

public record KeyPairDto(
    Guid Id,
    string Name,
    string Algorithm,
    int KeySize,
    string PublicKeyFingerprint,
    string Status,
    int UsageCount,
    DateTime CreatedAt,
    DateTime? RevokedAt
);

// ── Notice ────────────────────────────────────────────────────────

public record NoticeDto(
    string Id,
    string? Avatar,
    string Title,
    string? Description,
    string? Extra,
    string Type,
    string? Status,
    bool Read,
    DateTime CreatedAt
);

public record NoticeListResult(
    List<NoticeDto> Data,
    int Total,
    bool Success
);

// ── Table (generic list) ──────────────────────────────────────────

public record TableItemDto(
    int Key,
    bool Disabled,
    string Name,
    string Owner,
    string Desc,
    int CallNo,
    int Status,
    string UpdatedAt,
    string CreatedAt,
    int Progress
);

public record TableListResult(
    List<TableItemDto> Data,
    int Total,
    bool Success
);

public record CreateTableItemRequest(
    [Required] string Name,
    string? Desc,
    string? Owner
);

// ── Shared response wrapper ───────────────────────────────────────

public record ApiResponse<T>(T Data, bool Success = true, string? Message = null);
public record PagedResult<T>(List<T> Data, int Total, bool Success = true);
