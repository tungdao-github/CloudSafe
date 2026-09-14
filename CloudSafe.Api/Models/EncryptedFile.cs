namespace CloudSafe.Api.Models;

public class EncryptedFile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OwnerId { get; set; }
    public string OriginalName { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty; // path on disk / blob key
    public long FileSizeBytes { get; set; }
    public string MimeType { get; set; } = "application/octet-stream";

    // Hybrid encryption metadata
    public string Algorithm { get; set; } = "AES-256-GCM";
    public string EncryptedAesKey { get; set; } = string.Empty;  // RSA-OAEP(AES key), Base64
    public string Iv { get; set; } = string.Empty;               // GCM nonce, Base64
    public string AuthTag { get; set; } = string.Empty;          // GCM auth tag, Base64
    public Guid KeyPairId { get; set; }                          // which RSA key was used

    public FileStatus Status { get; set; } = FileStatus.Encrypted;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User Owner { get; set; } = null!;
    public RsaKeyPair KeyPair { get; set; } = null!;
    public ICollection<FileShare> Shares { get; set; } = [];
}

public enum FileStatus
{
    Encrypted = 0,
    Shared = 1,
    Deleted = 2
}
