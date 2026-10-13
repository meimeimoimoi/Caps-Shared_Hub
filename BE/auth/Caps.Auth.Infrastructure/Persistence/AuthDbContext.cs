using Caps.Auth.Domain.Business;
using Caps.Auth.Domain.Sessions;
using Caps.Auth.Domain.Users;
using Caps.Auth.Domain.Verification;
using Microsoft.EntityFrameworkCore;

namespace Caps.Auth.Infrastructure.Persistence;

public sealed class AuthDbContext(DbContextOptions<AuthDbContext> options) : DbContext(options)
{
    public DbSet<AuthEmailOutbox> EmailOutbox => Set<AuthEmailOutbox>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<AuthRefreshToken> RefreshTokens => Set<AuthRefreshToken>();
    public DbSet<VerificationToken> VerificationTokens => Set<VerificationToken>();
    public DbSet<BusinessProfile> BusinessProfiles => Set<BusinessProfile>();
    public DbSet<UserAvatar> UserAvatars => Set<UserAvatar>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("identity");

        modelBuilder.Entity<AuthEmailOutbox>(e =>
        {
            e.ToTable("auth_email_outbox");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.SentAt);
        });
        var codes = new[]
        {
            "USER",
            "EXPERT",
            "AUTHOR_REVIEWER",
            "KNOWLEDGE_ADMIN",
            "SYSTEM_ADMIN",
        };
        for (var i = 0; i < codes.Length; i++)
            modelBuilder
                .Entity<Role>()
                .HasData(
                    new Role
                    {
                        Id = Guid.Parse($"10000000-0000-0000-0000-{i + 1:000000000000}"),
                        Code = codes[i],
                        Name = codes[i],
                    }
                );
        var permissionCodes = new[]
        {
            "profile:read",
            "profile:write",
            "business:read",
            "business:write",
        };
        for (var i = 0; i < permissionCodes.Length; i++)
        {
            var permissionId = Guid.Parse($"20000000-0000-0000-0000-{i + 1:000000000000}");
            modelBuilder
                .Entity<Permission>()
                .HasData(
                    new Permission
                    {
                        Id = permissionId,
                        Code = permissionCodes[i],
                        Description = permissionCodes[i],
                    }
                );
            modelBuilder
                .Entity<RolePermission>()
                .HasData(
                    new RolePermission
                    {
                        RoleId = Guid.Parse("10000000-0000-0000-0000-000000000001"),
                        PermissionId = permissionId,
                    }
                );
        }
        // Roles
        modelBuilder.Entity<Role>(e =>
        {
            e.ToTable("roles");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Code).HasColumnName("code").IsRequired();
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Name).HasColumnName("name").IsRequired();
        });

        // Users
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Email).HasColumnName("email").IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.FailedLoginAttempts).HasColumnName("failed_login_attempts");
            e.Property(x => x.LockoutEnd).HasColumnName("lockout_end");
            e.Property(x => x.TokenVersion).HasColumnName("token_version");
            e.Property(x => x.PasswordHash).HasColumnName("password_hash").IsRequired();
            e.Property(x => x.FullName).HasColumnName("full_name").IsRequired();
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Status)
                .HasColumnName("status")
                .HasDefaultValue("PENDING_VERIFICATION")
                .IsRequired();
            e.Property(x => x.EmailVerifiedAt).HasColumnName("email_verified_at");
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();
            e.Property(x => x.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("now()")
                .IsRequired();
        });

        // User Roles
        modelBuilder.Entity<UserRole>(e =>
        {
            e.ToTable("user_roles");
            e.HasKey(x => new { x.UserId, x.RoleId });
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.RoleId).HasColumnName("role_id");

            e.HasOne(x => x.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_user_roles_1");

            e.HasOne(x => x.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(x => x.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_user_roles_2");
        });

        // Permission
        modelBuilder.Entity<Permission>(e =>
        {
            e.ToTable("permission");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Code).HasColumnName("code").IsRequired();
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Description).HasColumnName("description");
        });

        // Role Permission
        modelBuilder.Entity<RolePermission>(e =>
        {
            e.ToTable("role_permission");
            e.HasKey(x => new { x.RoleId, x.PermissionId });
            e.Property(x => x.RoleId).HasColumnName("role_id");
            e.Property(x => x.PermissionId).HasColumnName("permission_id");

            e.HasOne(x => x.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(x => x.RoleId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_role_permission_3");

            e.HasOne(x => x.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(x => x.PermissionId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_role_permission_4");
        });

        // Auth Refresh Token
        modelBuilder.Entity<AuthRefreshToken>(e =>
        {
            e.ToTable("auth_refresh_token");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.TokenHash).HasColumnName("token_hash").IsRequired();
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.Property(x => x.UserAgent).HasColumnName("user_agent");
            e.Property(x => x.IpAddress).HasColumnName("ip_address").HasColumnType("inet");
            e.Property(x => x.IssuedAt)
                .HasColumnName("issued_at")
                .HasDefaultValueSql("now()")
                .IsRequired();
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at").IsRequired();
            e.Property(x => x.RevokedAt).HasColumnName("revoked_at");
            e.Property(x => x.RotatedFrom).HasColumnName("rotated_from");

            e.HasIndex(x => new { x.UserId, x.ExpiresAt })
                .HasDatabaseName("ix_auth_refresh_token_2");

            e.HasOne(x => x.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_auth_refresh_token_5");

            e.HasOne(x => x.RotatedFromToken)
                .WithMany(t => t.RotatedToTokens)
                .HasForeignKey(x => x.RotatedFrom)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_auth_refresh_token_6");
        });

        // Verification Token
        modelBuilder.Entity<VerificationToken>(e =>
        {
            e.ToTable("verification_token");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Purpose).HasColumnName("purpose").IsRequired();
            e.Property(x => x.TokenHash).HasColumnName("token_hash").IsRequired();
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at").IsRequired();
            e.Property(x => x.UsedAt).HasColumnName("used_at");
            e.Property(x => x.InvalidatedAt).HasColumnName("invalidated_at");
            e.Property(x => x.AttemptCount).HasColumnName("attempt_count").HasDefaultValue(0);
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasOne(x => x.User)
                .WithMany(u => u.VerificationTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_verification_token_7");
        });

        // User Avatar
        modelBuilder.Entity<UserAvatar>(e =>
        {
            e.ToTable("user_avatar");
            e.HasKey(x => x.UserId);
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.ContentType).HasColumnName("content_type").IsRequired();
            e.Property(x => x.Data).HasColumnName("data").IsRequired();
            e.Property(x => x.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasOne(x => x.User)
                .WithOne()
                .HasForeignKey<UserAvatar>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_user_avatar_user");
        });

        // Business Profile
        modelBuilder.Entity<BusinessProfile>(e =>
        {
            e.ToTable("business_profile");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.HasIndex(x => x.UserId).IsUnique();
            e.Property(x => x.CompanyName).HasColumnName("company_name").IsRequired();
            e.Property(x => x.TaxCode).HasColumnName("tax_code").IsRequired();
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.Representative).HasColumnName("representative");
            e.Property(x => x.ContactEmail).HasColumnName("contact_email");
            e.Property(x => x.ContactPhone).HasColumnName("contact_phone");
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();
            e.Property(x => x.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasOne(x => x.User)
                .WithOne(u => u.BusinessProfile)
                .HasForeignKey<BusinessProfile>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_business_profile_8");
        });
    }
}
