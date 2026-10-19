using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Profiles;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

/// <summary>
/// Tables of the expert service, all in the <c>expert</c> schema. User ids from the identity service are
/// plain columns: there are no foreign keys across services.
/// </summary>
public sealed class ExpertDbContext(DbContextOptions<ExpertDbContext> options) : DbContext(options)
{
    public const string Schema = "expert";

    public DbSet<ExpertProfile> ExpertProfiles => Set<ExpertProfile>();
    public DbSet<ExpertApplication> ExpertApplications => Set<ExpertApplication>();
    public DbSet<ExpertApplicationEvent> ExpertApplicationEvents => Set<ExpertApplicationEvent>();
    public DbSet<ExpertEvidence> ExpertEvidences => Set<ExpertEvidence>();
    public DbSet<ExpertCompetencyAssessment> ExpertCompetencyAssessments =>
        Set<ExpertCompetencyAssessment>();

    public DbSet<PlatformFee> PlatformFees => Set<PlatformFee>();

    public DbSet<ServiceOffering> ServiceOfferings => Set<ServiceOffering>();
    public DbSet<AvailabilitySlot> AvailabilitySlots => Set<AvailabilitySlot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);

        modelBuilder.Entity<ExpertProfile>(e =>
        {
            e.ToTable(
                "expert_profile",
                t =>
                    t.HasCheckConstraint(
                        "ck_expert_capacity",
                        "capacity >= 0 AND active_cases >= 0 AND verified_count BETWEEN 0 AND delivered_count"
                    )
            );
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.HasIndex(x => x.UserId).IsUnique().HasDatabaseName("ux_expert_profile_user");
            e.Property(x => x.DisplayName).HasColumnName("display_name").HasMaxLength(128);
            e.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(32);
            e.Property(x => x.YearsExperience).HasColumnName("years_experience");
            e.Property(x => x.Bio).HasColumnName("bio");
            e.Property(x => x.Title).HasColumnName("title");
            e.Property(x => x.Company).HasColumnName("company");
            e.Property(x => x.Location).HasColumnName("location");
            e.Property(x => x.BirthDate).HasColumnName("birth_date");
            e.Property(x => x.Fields)
                .HasColumnName("fields")
                .HasColumnType("text[]")
                .HasDefaultValueSql("'{}'::text[]")
                .IsRequired();
            e.Property(x => x.Highlights).HasColumnName("highlights");
            e.Property(x => x.Status).HasColumnName("status").IsRequired();
            e.Property(x => x.ServiceStatus)
                .HasColumnName("service_status")
                .HasDefaultValue("INACTIVE")
                .IsRequired();
            e.Property(x => x.Capacity).HasColumnName("capacity").HasDefaultValue(0);
            e.Property(x => x.ActiveCases).HasColumnName("active_cases").HasDefaultValue(0);
            e.Property(x => x.DeliveredCount).HasColumnName("delivered_count").HasDefaultValue(0);
            e.Property(x => x.VerifiedCount).HasColumnName("verified_count").HasDefaultValue(0);
            e.Property(x => x.EligibilityNote).HasColumnName("eligibility_note");
            e.Property(x => x.TurnaroundHours).HasColumnName("turnaround_hours");
            e.Property(x => x.RatingAvg)
                .HasColumnName("rating_avg")
                .HasColumnType("numeric(3,2)")
                .HasDefaultValue(0m);
            e.Property(x => x.RatingCount).HasColumnName("rating_count").HasDefaultValue(0);
            e.Property(x => x.ApprovedBy).HasColumnName("approved_by");
            e.Property(x => x.ApprovedAt).HasColumnName("approved_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();
            e.HasIndex(x => new { x.Status, x.ServiceStatus })
                .HasDatabaseName("ix_expert_marketplace_feed");
        });

        modelBuilder.Entity<ExpertApplication>(e =>
        {
            e.ToTable("expert_application");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ExpertProfileId).HasColumnName("expert_profile_id");
            e.Property(x => x.Status).HasColumnName("status").IsRequired();
            e.Property(x => x.SubmittedAt).HasColumnName("submitted_at");
            e.Property(x => x.DecidedAt).HasColumnName("decided_at");
            e.Property(x => x.DecisionNote).HasColumnName("decision_note");
            e.Property(x => x.PreviousApplicationId).HasColumnName("previous_application_id");
            e.Property(x => x.EarliestReapplyAt).HasColumnName("earliest_reapply_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();
            // Review queue filters by status and submission time
            e.HasIndex(x => new { x.Status, x.SubmittedAt })
                .HasDatabaseName("ix_expert_application_queue");
            // An expert can have only one open application at a time
            e.HasIndex(x => x.ExpertProfileId)
                .IsUnique()
                .HasFilter("status NOT IN ('NOT_ELIGIBLE', 'REJECTED', 'APPROVED')")
                .HasDatabaseName("ux_expert_application_open");
            e.HasOne(x => x.ExpertProfile)
                .WithMany(p => p.Applications)
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_expert_application_profile");
            e.HasOne<ExpertApplication>()
                .WithMany()
                .HasForeignKey(x => x.PreviousApplicationId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_expert_application_previous");
        });

        modelBuilder.Entity<ExpertApplicationEvent>(e =>
        {
            e.ToTable("expert_application_event");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ApplicationId).HasColumnName("application_id");
            e.Property(x => x.ActorUserId).HasColumnName("actor_user_id");
            e.Property(x => x.FromStatus).HasColumnName("from_status");
            e.Property(x => x.ToStatus).HasColumnName("to_status").IsRequired();
            e.Property(x => x.Note).HasColumnName("note");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.HasIndex(x => new { x.ApplicationId, x.CreatedAt })
                .HasDatabaseName("ix_expert_application_event");
            e.HasOne(x => x.Application)
                .WithMany(a => a.Events)
                .HasForeignKey(x => x.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_expert_application_event_application");
        });

        modelBuilder.Entity<ExpertEvidence>(e =>
        {
            e.ToTable("expert_evidence");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ExpertProfileId).HasColumnName("expert_profile_id");
            e.Property(x => x.ApplicationId).HasColumnName("application_id");
            e.Property(x => x.EvidenceType).HasColumnName("evidence_type").IsRequired();
            e.Property(x => x.FileUrl).HasColumnName("file_url").IsRequired();
            e.Property(x => x.FileName).HasColumnName("file_name").HasMaxLength(255).IsRequired();
            e.Property(x => x.ContentType).HasColumnName("content_type").IsRequired();
            e.Property(x => x.SizeBytes).HasColumnName("size_bytes");
            e.Property(x => x.ParsedMeta).HasColumnName("parsed_meta").HasColumnType("jsonb");
            e.Property(x => x.ScreeningFlag).HasColumnName("screening_flag");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.HasIndex(x => x.ExpertProfileId).HasDatabaseName("ix_expert_evidence_profile");
            e.HasIndex(x => x.ApplicationId).HasDatabaseName("ix_expert_evidence_application");
            e.HasOne<ExpertProfile>()
                .WithMany()
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_expert_evidence_profile");
            e.HasOne(x => x.Application)
                .WithMany(a => a.Evidences)
                .HasForeignKey(x => x.ApplicationId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_expert_evidence_application");
        });

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
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.HasIndex(x => x.ExpertProfileId)
                .HasDatabaseName("ix_expert_competency_assessment_profile");
            e.HasOne(x => x.ExpertProfile)
                .WithMany()
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_expert_competency_assessment_profile");
        });

        modelBuilder.Entity<ServiceOffering>(e =>
        {
            e.ToTable(
                "service_offering",
                t =>
                    t.HasCheckConstraint(
                        "ck_offering_values",
                        "fee > 0 AND turnaround_hours BETWEEN 1 AND 720"
                    )
            );
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ExpertProfileId).HasColumnName("expert_profile_id");
            e.Property(x => x.ServiceType).HasColumnName("service_type").IsRequired();
            e.Property(x => x.Fee).HasColumnName("fee");
            e.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.HasIndex(x => new { x.ExpertProfileId, x.IsActive })
                .HasDatabaseName("ix_service_offering_active");
            e.HasOne(x => x.ExpertProfile)
                .WithMany(p => p.ServiceOfferings)
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_service_offering_profile");
            e.Property(x => x.TurnaroundHours)
                .HasColumnName("turnaround_hours")
                .HasDefaultValue(48);
            // One active package per service per expert, even if two saves race
            e.HasIndex(x => new { x.ExpertProfileId, x.ServiceType })
                .IsUnique()
                .HasFilter("is_active")
                .HasDatabaseName("ux_offer_one_per_type");
        });

        modelBuilder.Entity<PlatformFee>(e =>
        {
            e.ToTable(
                "platform_fee",
                t => t.HasCheckConstraint("ck_platform_fee_percent", "percent BETWEEN 0 AND 99")
            );
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ServiceType)
                .HasColumnName("service_type")
                .HasMaxLength(50)
                .IsRequired();
            e.Property(x => x.Percent).HasColumnName("percent");
            e.Property(x => x.EffectiveFrom).HasColumnName("effective_from");
            e.Property(x => x.SetBy).HasColumnName("set_by");
            // "Current rate of a service" = latest effective_from per service_type
            e.HasIndex(x => new { x.ServiceType, x.EffectiveFrom })
                .HasDatabaseName("ix_platform_fee_current");
        });

        modelBuilder.Entity<AvailabilitySlot>(e =>
        {
            e.ToTable("availability_slot");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ExpertProfileId).HasColumnName("expert_profile_id");
            e.Property(x => x.StartAt).HasColumnName("start_at").IsRequired();
            e.Property(x => x.EndAt).HasColumnName("end_at").IsRequired();
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("OPEN").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.HasIndex(x => new
                {
                    x.ExpertProfileId,
                    x.Status,
                    x.StartAt,
                })
                .HasDatabaseName("ix_availability_slot_open");
            e.HasOne(x => x.ExpertProfile)
                .WithMany(p => p.AvailabilitySlots)
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_availability_slot_profile");
        });
    }
}
