namespace CloudSafe.Api.Models;

public class FileShare
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FileId { get; set; }
    public Guid SharedWithUserId { get; set; }
    public Guid SharedByUserId { get; set; }

    /// <summary>
    /// AES key re-encrypted with the recipient's RSA public key.
    /// Only the recipient can decrypt it with their private key.
    /// </summary>
    public string ReEncryptedAesKey { get; set; } = string.Empty;

    public DateTime SharedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }

    // Navigation
    public EncryptedFile File { get; set; } = null!;
    public User SharedWith { get; set; } = null!;
    public User SharedBy { get; set; } = null!;
}
