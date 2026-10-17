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
    public DbSet<EligibilityCheck> EligibilityChecks => Set<EligibilityCheck>();
    public DbSet<ExpertCompetencyAssessment> ExpertCompetencyAssessments =>
        Set<ExpertCompetencyAssessment>();
    public DbSet<ServiceOffering> ServiceOfferings => Set<ServiceOffering>();
    public DbSet<ServiceCatalogItem> ServiceCatalog => Set<ServiceCatalogItem>();
    public DbSet<AvailabilitySlot> AvailabilitySlots => Set<AvailabilitySlot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);

        modelBuilder.Entity<ExpertProfile>(e =>
        {
            e.ToTable("expert_profile");
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
                .HasFilter("status NOT IN ('ELIGIBLE', 'NOT_ELIGIBLE', 'REJECTED', 'APPROVED')")
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

        modelBuilder.Entity<EligibilityCheck>(e =>
        {
            e.ToTable("eligibility_check");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ApplicationId).HasColumnName("application_id");
            e.Property(x => x.EventId).HasColumnName("event_id");
            e.Property(x => x.Criterion).HasColumnName("criterion").HasMaxLength(16).IsRequired();
            e.Property(x => x.Result).HasColumnName("result").HasMaxLength(32).IsRequired();
            e.Property(x => x.Note).HasColumnName("note");
            e.Property(x => x.ReviewerUserId).HasColumnName("reviewer_user_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            // One result per requirement in each decision
            e.HasIndex(x => new { x.EventId, x.Criterion })
                .IsUnique()
                .HasDatabaseName("ux_eligibility_check_decision");
            e.HasIndex(x => new { x.ApplicationId, x.CreatedAt })
                .HasDatabaseName("ix_eligibility_check_application");
            e.HasOne<ExpertApplication>()
                .WithMany()
                .HasForeignKey(x => x.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_eligibility_check_application");
            e.HasOne<ExpertApplicationEvent>()
                .WithMany()
                .HasForeignKey(x => x.EventId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_eligibility_check_event");
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

        modelBuilder.Entity<ServiceCatalogItem>(e =>
        {
            e.ToTable("service_catalog");
            e.HasKey(x => x.Code);
            e.Property(x => x.Code).HasColumnName("code").HasMaxLength(64);
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(128).IsRequired();
            e.Property(x => x.Status)
                .HasColumnName("status")
                .HasMaxLength(16)
                .HasDefaultValue(ServiceCatalogItem.Active)
                .IsRequired();
            e.Property(x => x.SortOrder).HasColumnName("sort_order");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.Ignore(x => x.IsActive);
            // MVP core service (overview: core Expert Service = HUMAN_VERIFICATION); more are added as rows
            e.HasData(
                new
                {
                    Code = "HUMAN_VERIFICATION",
                    Name = "Xác minh bởi chuyên gia",
                    Status = ServiceCatalogItem.Active,
                    SortOrder = 1,
                    CreatedAt = new DateTimeOffset(2026, 10, 17, 0, 0, 0, TimeSpan.Zero),
                }
            );
        });

        modelBuilder.Entity<ServiceOffering>(e =>
        {
            e.ToTable("service_offering");
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
