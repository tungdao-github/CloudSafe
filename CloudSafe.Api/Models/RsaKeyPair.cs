namespace CloudSafe.Api.Models;

public class RsaKeyPair
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OwnerId { get; set; }
    public string Name { get; set; } = "Khóa chính";
    public int KeySize { get; set; } = 2048;
    public string Algorithm { get; set; } = "RSA-OAEP";

    /// <summary>Public key in PEM format — stored on server</summary>
    public string PublicKeyPem { get; set; } = string.Empty;

    /// <summary>SHA-256 fingerprint of the public key for display</summary>
    public string PublicKeyFingerprint { get; set; } = string.Empty;

    /// <summary>Private key is NEVER stored here — this is always null on server</summary>
    public string? PrivateKeyPem { get; set; } = null;

    public KeyStatus Status { get; set; } = KeyStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }

    // Navigation
    public User Owner { get; set; } = null!;
    public ICollection<EncryptedFile> Files { get; set; } = [];
}

public enum KeyStatus
{
    Active = 0,
    Revoked = 1,
    Expired = 2
}
