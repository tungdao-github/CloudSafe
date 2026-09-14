namespace CloudSafe.Api.Models;

public class Notice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Extra { get; set; }
    public string? Avatar { get; set; }
    public NoticeType Type { get; set; } = NoticeType.Notification;
    public NoticeStatus Status { get; set; } = NoticeStatus.Unread;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}

public enum NoticeType { Notification, Message, Event }
public enum NoticeStatus { Unread, Read }
