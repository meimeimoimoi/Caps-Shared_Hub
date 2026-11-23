using Caps.Notification.Entities;
using Microsoft.EntityFrameworkCore;

namespace Caps.Notification.Data;

/// <summary>The notification service's database (schema notification): in-app notifications per account.</summary>
public sealed class NotificationDbContext(DbContextOptions<NotificationDbContext> options)
    : DbContext(options)
{
    public DbSet<UserNotification> Notifications => Set<UserNotification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

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

        // Ids of other services' records are plain columns, as above
        modelBuilder.Entity<AuditLog>(e =>
        {
            e.ToTable("audit_log");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            e.Property(x => x.Service).HasColumnName("service").HasMaxLength(32).IsRequired();
            e.Property(x => x.EntityType)
                .HasColumnName("entity_type")
                .HasMaxLength(64)
                .IsRequired();
            e.Property(x => x.EntityId).HasColumnName("entity_id");
            e.Property(x => x.Action).HasColumnName("action").HasMaxLength(64).IsRequired();
            e.Property(x => x.ActorUserId).HasColumnName("actor_user_id");
            e.Property(x => x.Detail).HasColumnName("detail").HasColumnType("jsonb");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            // The admin list is newest first, filtered by record or by actor
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => new { x.EntityType, x.EntityId });
            e.HasIndex(x => new { x.ActorUserId, x.CreatedAt });
        });
    }
}
