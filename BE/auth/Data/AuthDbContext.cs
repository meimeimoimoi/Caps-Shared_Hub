using auth.Entities;
using Microsoft.EntityFrameworkCore;

namespace auth.Data;

public sealed class AuthDbContext(DbContextOptions<AuthDbContext> options) : DbContext(options)
{
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<AuthRefreshToken> RefreshTokens => Set<AuthRefreshToken>();
    public DbSet<VerificationToken> VerificationTokens => Set<VerificationToken>();
    public DbSet<BusinessProfile> BusinessProfiles => Set<BusinessProfile>();
    public DbSet<ExpertProfile> ExpertProfiles => Set<ExpertProfile>();
    public DbSet<ExpertEvidence> ExpertEvidences => Set<ExpertEvidence>();
    public DbSet<ExpertCompetencyAssessment> ExpertCompetencyAssessments => Set<ExpertCompetencyAssessment>();
    public DbSet<ServiceOffering> ServiceOfferings => Set<ServiceOffering>();
    public DbSet<AvailabilitySlot> AvailabilitySlots => Set<AvailabilitySlot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("identity");

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
            e.Property(x => x.PasswordHash).HasColumnName("password_hash").IsRequired();
            e.Property(x => x.FullName).HasColumnName("full_name").IsRequired();
            e.Ignore(x => x.DisplayName);
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("PENDING_VERIFICATION").IsRequired();
            e.Property(x => x.EmailVerifiedAt).HasColumnName("email_verified_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()").IsRequired();
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
            e.Property(x => x.IssuedAt).HasColumnName("issued_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at").IsRequired();
            e.Property(x => x.RevokedAt).HasColumnName("revoked_at");
            e.Property(x => x.RotatedFrom).HasColumnName("rotated_from");

            e.HasIndex(x => new { x.UserId, x.ExpiresAt }).HasDatabaseName("ix_auth_refresh_token_2");

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
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasOne(x => x.User)
                .WithMany(u => u.VerificationTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_verification_token_7");
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
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()").IsRequired();

            e.HasOne(x => x.User)
                .WithOne(u => u.BusinessProfile)
                .HasForeignKey<BusinessProfile>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_business_profile_8");
        });

        // Expert Profile
        modelBuilder.Entity<ExpertProfile>(e =>
        {
            e.ToTable("expert_profile");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.HasIndex(x => x.UserId).IsUnique();
            e.Property(x => x.YearsExperience).HasColumnName("years_experience");
            e.Property(x => x.Bio).HasColumnName("bio");
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("SCREENING").IsRequired();
            e.Property(x => x.ServiceStatus).HasColumnName("service_status").HasDefaultValue("INACTIVE").IsRequired();
            e.Property(x => x.EligibilityNote).HasColumnName("eligibility_note");
            e.Property(x => x.TurnaroundHours).HasColumnName("turnaround_hours");
            e.Property(x => x.RatingAvg).HasColumnName("rating_avg").HasColumnType("numeric(3,2)").HasDefaultValue(0m);
            e.Property(x => x.RatingCount).HasColumnName("rating_count").HasDefaultValue(0);
            e.Property(x => x.ApprovedBy).HasColumnName("approved_by");
            e.Property(x => x.ApprovedAt).HasColumnName("approved_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.Status, x.ServiceStatus }).HasDatabaseName("ix_expert_marketplace_feed");

            e.HasOne(x => x.User)
                .WithOne(u => u.ExpertProfile)
                .HasForeignKey<ExpertProfile>(x => x.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_expert_profile_9");

            e.HasOne(x => x.Approver)
                .WithMany()
                .HasForeignKey(x => x.ApprovedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_expert_profile_10");
        });

        // Expert Evidence
        modelBuilder.Entity<ExpertEvidence>(e =>
        {
            e.ToTable("expert_evidence");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ExpertProfileId).HasColumnName("expert_profile_id");
            e.Property(x => x.EvidenceType).HasColumnName("evidence_type").IsRequired();
            e.Property(x => x.FileUrl).HasColumnName("file_url").IsRequired();
            e.Property(x => x.ParsedMeta).HasColumnName("parsed_meta").HasColumnType("jsonb");
            e.Property(x => x.ScreeningFlag).HasColumnName("screening_flag");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => x.ExpertProfileId).HasDatabaseName("ix_expert_evidence_2");

            e.HasOne(x => x.ExpertProfile)
                .WithMany(p => p.Evidences)
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_expert_evidence_11");
        });

        // Expert Competency Assessment
        modelBuilder.Entity<ExpertCompetencyAssessment>(e =>
        {
            e.ToTable("expert_competency_assessment");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ExpertProfileId).HasColumnName("expert_profile_id");
            e.Property(x => x.AssessorUserId).HasColumnName("assessor_user_id");
            e.Property(x => x.C1Score).HasColumnName("c1_score");
            e.Property(x => x.C2Score).HasColumnName("c2_score");
            e.Property(x => x.C3Score).HasColumnName("c3_score");
            e.Property(x => x.C4Score).HasColumnName("c4_score");
            e.Property(x => x.C5Score).HasColumnName("c5_score");
            e.Property(x => x.Rationale).HasColumnName("rationale").IsRequired();
            e.Property(x => x.Decision).HasColumnName("decision").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => x.ExpertProfileId).HasDatabaseName("ix_expert_competency_assessment_2");

            e.HasOne(x => x.ExpertProfile)
                .WithMany(p => p.Assessments)
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_expert_competency_assessment_12");

            e.HasOne(x => x.Assessor)
                .WithMany()
                .HasForeignKey(x => x.AssessorUserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_expert_competency_assessment_13");
        });

        // Service Offering
        modelBuilder.Entity<ServiceOffering>(e =>
        {
            e.ToTable("service_offering");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ExpertProfileId).HasColumnName("expert_profile_id");
            e.Property(x => x.ServiceType).HasColumnName("service_type").IsRequired();
            e.Property(x => x.Fee).HasColumnName("fee");
            e.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.ExpertProfileId, x.IsActive }).HasDatabaseName("ix_service_offering_2");

            e.HasOne(x => x.ExpertProfile)
                .WithMany(p => p.ServiceOfferings)
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_service_offering_14");
        });

        // Availability Slot
        modelBuilder.Entity<AvailabilitySlot>(e =>
        {
            e.ToTable("availability_slot");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ExpertProfileId).HasColumnName("expert_profile_id");
            e.Property(x => x.StartAt).HasColumnName("start_at").IsRequired();
            e.Property(x => x.EndAt).HasColumnName("end_at").IsRequired();
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("OPEN").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.ExpertProfileId, x.Status, x.StartAt }).HasDatabaseName("ix_availability_slot_2");

            e.HasOne(x => x.ExpertProfile)
                .WithMany(p => p.AvailabilitySlots)
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_availability_slot_15");
        });
    }
}
