using CloudSafe.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CloudSafe.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<EncryptedFile> EncryptedFiles { get; set; } = null!;
    public DbSet<RsaKeyPair> RsaKeyPairs { get; set; } = null!;
    public DbSet<Api.Models.FileShare> FileShares { get; set; } = null!;
    public DbSet<Notice> Notices { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        // ── User ─────────────────────────────────────────────────────────────
        b.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Username).IsUnique();
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Username).HasMaxLength(64).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.Property(x => x.Name).HasMaxLength(128).IsRequired();
            e.Property(x => x.Role).HasMaxLength(32).IsRequired();
        });

        // ── EncryptedFile ─────────────────────────────────────────────────────
        b.Entity<EncryptedFile>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.OriginalName).HasMaxLength(512).IsRequired();
            e.Property(x => x.Algorithm).HasMaxLength(32).IsRequired();
            e.Property(x => x.MimeType).HasMaxLength(128).IsRequired();
            e.HasOne(x => x.Owner)
             .WithMany(u => u.Files)
             .HasForeignKey(x => x.OwnerId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.KeyPair)
             .WithMany(k => k.Files)
             .HasForeignKey(x => x.KeyPairId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── RsaKeyPair ────────────────────────────────────────────────────────
        b.Entity<RsaKeyPair>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(128).IsRequired();
            e.Property(x => x.Algorithm).HasMaxLength(32).IsRequired();
            e.Property(x => x.PublicKeyFingerprint).HasMaxLength(128).IsRequired();
            e.Ignore(x => x.PrivateKeyPem);
            e.HasOne(x => x.Owner)
             .WithMany(u => u.Keys)
             .HasForeignKey(x => x.OwnerId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── FileShare ─────────────────────────────────────────────────────────
        b.Entity<Api.Models.FileShare>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.File)
             .WithMany(f => f.Shares)
             .HasForeignKey(x => x.FileId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SharedWith)
             .WithMany()
             .HasForeignKey(x => x.SharedWithUserId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.SharedBy)
             .WithMany()
             .HasForeignKey(x => x.SharedByUserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Notice ────────────────────────────────────────────────────────────
        b.Entity<Notice>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(256).IsRequired();
            e.HasOne(x => x.User)
             .WithMany(u => u.Notices)
             .HasForeignKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Seed admin ────────────────────────────────────────────────────────
        // BCrypt hash của "ant.design" — pre-computed, không gọi BCrypt tại design-time
        const string adminPasswordHash = "$2a$11$9c9NJmFcFbMV9R5za7fmXuEIQ2FbV.YxSCF.9bCPfzO4M7PvMmQ2a";

        b.Entity<User>().HasData(new User
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            Username = "admin",
            PasswordHash = adminPasswordHash,
            Email = "admin@cloudsafe.vn",
            Name = "Nguyễn Admin",
            Title = "Quản trị viên hệ thống",
            Signature = "Bảo mật dữ liệu là ưu tiên hàng đầu",
            Group = "CloudSafe — Nhóm Bảo mật & Hạ tầng",
            Address = "215 Lạch Tray, Ngô Quyền, Hải Phòng",
            Phone = "0225-3888888",
            Role = "admin",
            CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}
