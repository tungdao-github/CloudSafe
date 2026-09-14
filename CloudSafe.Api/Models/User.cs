namespace CloudSafe.Api.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Avatar { get; set; }
    public string? Phone { get; set; }
    public string? Title { get; set; }
    public string? Signature { get; set; }
    public string? Group { get; set; }
    public string? Address { get; set; }
    public string Role { get; set; } = "user"; // user | admin
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<EncryptedFile> Files { get; set; } = [];
    public ICollection<RsaKeyPair> Keys { get; set; } = [];
    public ICollection<Notice> Notices { get; set; } = [];
}
