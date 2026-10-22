using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Pricing;
using Caps.Expert.Domain.Profiles;
using Caps.Expert.Domain.Qualifications;
using Caps.Expert.Infrastructure.Messaging;
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
    public DbSet<ExpertServiceQualification> Qualifications => Set<ExpertServiceQualification>();
    public DbSet<QualificationEvent> QualificationEvents => Set<QualificationEvent>();
    public DbSet<CompetencyAssessment> CompetencyAssessments => Set<CompetencyAssessment>();
    public DbSet<PlatformFee> PlatformFees => Set<PlatformFee>();
    public DbSet<ServiceOffering> ServiceOfferings => Set<ServiceOffering>();
    public DbSet<ServiceCatalogItem> ServiceCatalog => Set<ServiceCatalogItem>();
    public DbSet<NotificationOutboxEntry> NotificationOutbox => Set<NotificationOutboxEntry>();
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
            e.Property(x => x.ContactEmail).HasColumnName("contact_email").HasMaxLength(256);
            e.Property(x => x.AccountStatus).HasColumnName("account_status").HasMaxLength(32);
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
            e.Property(x => x.QualificationId).HasColumnName("qualification_id");
            e.Property(x => x.EvidenceType).HasColumnName("evidence_type").IsRequired();
            e.Property(x => x.FileUrl).HasColumnName("file_url").IsRequired();
            e.Property(x => x.FileName).HasColumnName("file_name").HasMaxLength(255).IsRequired();
            e.Property(x => x.ContentType).HasColumnName("content_type").IsRequired();
            e.Property(x => x.SizeBytes).HasColumnName("size_bytes");
            e.Property(x => x.ParsedMeta).HasColumnName("parsed_meta").HasColumnType("jsonb");
            e.Property(x => x.ScreeningFlag).HasColumnName("screening_flag");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.Property(x => x.SourceUrl).HasColumnName("source_url");
            e.Property(x => x.ExtractionStatus).HasColumnName("extraction_status");
            e.Property(x => x.ExtractedAt).HasColumnName("extracted_at");
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
            e.HasIndex(x => x.QualificationId).HasDatabaseName("ix_expert_evidence_qualification");
            e.HasOne<ExpertServiceQualification>()
                .WithMany()
                .HasForeignKey(x => x.QualificationId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_expert_evidence_qualification");
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

        modelBuilder.Entity<ExpertServiceQualification>(e =>
        {
            e.ToTable("expert_service_qualification");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ExpertProfileId).HasColumnName("expert_profile_id");
            e.Property(x => x.ServiceCode)
                .HasColumnName("service_code")
                .HasMaxLength(64)
                .IsRequired();
            e.Property(x => x.ApplicationId).HasColumnName("application_id");
            e.Property(x => x.Status).HasColumnName("status").HasMaxLength(32).IsRequired();
            e.Property(x => x.SubmittedAt).HasColumnName("submitted_at").IsRequired();
            e.Property(x => x.DecidedAt).HasColumnName("decided_at");
            e.Property(x => x.DecisionNote).HasColumnName("decision_note");
            e.Property(x => x.CompetencyReviewerUserId)
                .HasColumnName("competency_reviewer_user_id");
            e.Property(x => x.AcceptingRequests)
                .HasColumnName("accepting_requests")
                .HasDefaultValue(false);
            e.Property(x => x.PreviousQualificationId).HasColumnName("previous_qualification_id");
            e.Property(x => x.EarliestReapplyAt).HasColumnName("earliest_reapply_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();
            // Review queue filters by status and submission time
            e.HasIndex(x => new { x.Status, x.SubmittedAt })
                .HasDatabaseName("ix_expert_service_qualification_queue");
            // One qualification per Expert-Service pair until it fails (BR-E12)
            e.HasIndex(x => new { x.ExpertProfileId, x.ServiceCode })
                .IsUnique()
                .HasFilter("status <> 'FAIL'")
                .HasDatabaseName("ux_expert_service_qualification_active");
            e.HasOne(x => x.ExpertProfile)
                .WithMany()
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_expert_service_qualification_profile");
            e.HasOne<ServiceCatalogItem>()
                .WithMany()
                .HasForeignKey(x => x.ServiceCode)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_expert_service_qualification_service");
            e.HasOne<ExpertApplication>()
                .WithMany()
                .HasForeignKey(x => x.ApplicationId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_expert_service_qualification_application");
            e.HasOne<ExpertServiceQualification>()
                .WithMany()
                .HasForeignKey(x => x.PreviousQualificationId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_expert_service_qualification_previous");
        });

        modelBuilder.Entity<QualificationEvent>(e =>
        {
            e.ToTable("qualification_event");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.QualificationId).HasColumnName("qualification_id");
            e.Property(x => x.ActorUserId).HasColumnName("actor_user_id");
            e.Property(x => x.FromStatus).HasColumnName("from_status").HasMaxLength(32);
            e.Property(x => x.ToStatus).HasColumnName("to_status").HasMaxLength(32).IsRequired();
            e.Property(x => x.Note).HasColumnName("note");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.HasIndex(x => new { x.QualificationId, x.CreatedAt })
                .HasDatabaseName("ix_qualification_event");
            e.HasOne<ExpertServiceQualification>()
                .WithMany()
                .HasForeignKey(x => x.QualificationId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_qualification_event_qualification");
        });

        modelBuilder.Entity<CompetencyAssessment>(e =>
        {
            e.ToTable("competency_assessment");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.QualificationId).HasColumnName("qualification_id");
            e.Property(x => x.EventId).HasColumnName("event_id");
            e.Property(x => x.Competency).HasColumnName("competency").HasMaxLength(8).IsRequired();
            e.Property(x => x.Result).HasColumnName("result").HasMaxLength(32).IsRequired();
            e.Property(x => x.Note).HasColumnName("note").IsRequired();
            e.Property(x => x.ReviewerUserId).HasColumnName("reviewer_user_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            // One result per competency in each decision
            e.HasIndex(x => new { x.EventId, x.Competency })
                .IsUnique()
                .HasDatabaseName("ux_competency_assessment_decision");
            e.HasIndex(x => new { x.QualificationId, x.CreatedAt })
                .HasDatabaseName("ix_competency_assessment_qualification");
            e.HasOne<ExpertServiceQualification>()
                .WithMany()
                .HasForeignKey(x => x.QualificationId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_competency_assessment_qualification");
            e.HasOne<QualificationEvent>()
                .WithMany()
                .HasForeignKey(x => x.EventId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_competency_assessment_event");
            e.HasMany(x => x.Evidence)
                .WithOne()
                .HasForeignKey(x => x.AssessmentId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_competency_assessment_evidence_assessment");
        });

        modelBuilder.Entity<CompetencyAssessmentEvidence>(e =>
        {
            e.ToTable("competency_assessment_evidence");
            e.HasKey(x => new { x.AssessmentId, x.EvidenceId });
            e.Property(x => x.AssessmentId).HasColumnName("assessment_id");
            e.Property(x => x.EvidenceId).HasColumnName("evidence_id");
            e.HasIndex(x => x.EvidenceId).HasDatabaseName("ix_competency_assessment_evidence_file");
            e.HasOne<ExpertEvidence>()
                .WithMany()
                .HasForeignKey(x => x.EvidenceId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_competency_assessment_evidence_file");
        });

        modelBuilder.Entity<NotificationOutboxEntry>(e =>
        {
            e.ToTable("notification_outbox");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.MessageType)
                .HasColumnName("message_type")
                .HasMaxLength(128)
                .IsRequired();
            e.Property(x => x.Payload).HasColumnName("payload").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.Property(x => x.SentAt).HasColumnName("sent_at");
            // The publisher scans unsent rows in creation order
            e.HasIndex(x => new { x.SentAt, x.CreatedAt })
                .HasDatabaseName("ix_notification_outbox_pending");
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
            e.Property(x => x.DeliverySlaHours).HasColumnName("delivery_sla_hours");
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
                    DeliverySlaHours = 72,
                    SortOrder = 1,
                    CreatedAt = new DateTimeOffset(2026, 10, 17, 0, 0, 0, TimeSpan.Zero),
                }
            );
        });

        modelBuilder.Entity<PlatformFee>(e =>
        {
            e.ToTable(
                "platform_fee",
                t => t.HasCheckConstraint("ck_platform_fee_percent", "percent BETWEEN 0 AND 99")
            );
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ServiceCode)
                .HasColumnName("service_code")
                .HasMaxLength(64)
                .IsRequired();
            e.Property(x => x.Percent).HasColumnName("percent");
            e.Property(x => x.EffectiveFrom).HasColumnName("effective_from");
            e.Property(x => x.SetBy).HasColumnName("set_by");
            // "Current rate of a service" = latest effective_from per service_code
            e.HasIndex(x => new { x.ServiceCode, x.EffectiveFrom })
                .HasDatabaseName("ix_platform_fee_current");
            e.HasOne<ServiceCatalogItem>()
                .WithMany()
                .HasForeignKey(x => x.ServiceCode)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_platform_fee_service");
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
            e.Property(x => x.ServiceCode)
                .HasColumnName("service_code")
                .HasMaxLength(64)
                .IsRequired();
            e.Property(x => x.Fee).HasColumnName("fee");
            e.Property(x => x.TurnaroundHours).HasColumnName("turnaround_hours");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();
            // One offering per service per expert, even if two first saves race
            e.HasIndex(x => new { x.ExpertProfileId, x.ServiceCode })
                .IsUnique()
                .HasDatabaseName("ux_offering_one_per_service");
            e.HasOne<ExpertProfile>()
                .WithMany()
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_service_offering_profile");
            e.HasOne<ServiceCatalogItem>()
                .WithMany()
                .HasForeignKey(x => x.ServiceCode)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_service_offering_service");
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
