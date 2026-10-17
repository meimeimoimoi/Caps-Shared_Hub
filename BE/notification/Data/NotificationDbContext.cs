using Caps.Notification.Entities;
using Microsoft.EntityFrameworkCore;

namespace Caps.Notification.Data;

/// <summary>The notification service's database (schema notification): in-app notifications per account.</summary>
public sealed class NotificationDbContext(DbContextOptions<NotificationDbContext> options)
    : DbContext(options)
{
    public DbSet<UserNotification> Notifications => Set<UserNotification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("notification");

        // User ids are plain columns: users live in the auth service (no cross-service foreign keys)
        modelBuilder.Entity<UserNotification>(e =>
        {
            e.ToTable("user_notification");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.SourceEventId).HasColumnName("source_event_id");
            e.Property(x => x.Type).HasColumnName("type").HasMaxLength(64).IsRequired();
            e.Property(x => x.Data).HasColumnName("data").HasColumnType("jsonb").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.ReadAt).HasColumnName("read_at");
            e.Property(x => x.EmailSentAt).HasColumnName("email_sent_at");
            e.HasIndex(x => x.SourceEventId).IsUnique();
            // The bell lists an account's newest notifications first
            e.HasIndex(x => new { x.UserId, x.CreatedAt });
        });
    }
}
