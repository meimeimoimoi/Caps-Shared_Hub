using System.Text.Json;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Policies;
using Caps.Expert.Domain.Pricing;
using Caps.Expert.Domain.Profiles;
using Caps.Expert.Domain.Qualifications;
using Caps.Expert.Domain.Reviews;
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
    public DbSet<ExpertCaseSlot> ExpertCaseSlots => Set<ExpertCaseSlot>();
    public DbSet<ServiceOffering> ServiceOfferings => Set<ServiceOffering>();
    public DbSet<ServiceOfferingChange> ServiceOfferingChanges => Set<ServiceOfferingChange>();
    public DbSet<ServiceCatalogItem> ServiceCatalog => Set<ServiceCatalogItem>();
    public DbSet<NotificationOutboxEntry> NotificationOutbox => Set<NotificationOutboxEntry>();
    public DbSet<PolicySetting> PolicySettings => Set<PolicySetting>();
    public DbSet<PolicySettingChange> PolicySettingChanges => Set<PolicySettingChange>();
    public DbSet<ReviewClaimEvent> ReviewClaimEvents => Set<ReviewClaimEvent>();
    public DbSet<KnownReviewer> KnownReviewers => Set<KnownReviewer>();
    public DbSet<CompetencyEvidenceLink> CompetencyEvidenceLinks => Set<CompetencyEvidenceLink>();
    public DbSet<CompetencyDescription> CompetencyDescriptions => Set<CompetencyDescription>();

    private static readonly JsonSerializerOptions SnapshotJson = new(JsonSerializerDefaults.Web);

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
                        "capacity BETWEEN 0 AND 20 AND active_cases >= 0"
                    )
            );
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
            e.Property(x => x.Capacity).HasColumnName("capacity").HasDefaultValue(0);
            e.Property(x => x.ActiveCases).HasColumnName("active_cases").HasDefaultValue(0);
            e.Property(x => x.ApprovedBy).HasColumnName("approved_by");
            e.Property(x => x.ApprovedAt).HasColumnName("approved_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();
            e.HasIndex(x => new { x.Status, x.ServiceStatus })
                .HasDatabaseName("ix_expert_marketplace_feed");
        });

        modelBuilder.Entity<ExpertCaseSlot>(e =>
        {
            e.ToTable("expert_case_slot");
            e.HasKey(x => x.ReviewCaseId);
            e.Property(x => x.ReviewCaseId).HasColumnName("review_case_id");
            e.Property(x => x.ExpertProfileId).HasColumnName("expert_profile_id");
            e.Property(x => x.TakenAt).HasColumnName("taken_at");
            e.HasIndex(x => x.ExpertProfileId).HasDatabaseName("ix_expert_case_slot_profile");
            e.HasOne<ExpertProfile>()
                .WithMany()
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_expert_case_slot_profile");
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
            e.Property(x => x.ClaimedByUserId).HasColumnName("claimed_by_user_id");
            e.Property(x => x.ClaimedAt).HasColumnName("claimed_at");
            // Review queue filters by status and submission time
            e.HasIndex(x => new { x.Status, x.SubmittedAt })
                .HasDatabaseName("ix_expert_application_queue");
            // "Mine" filter of the review queue
            e.HasIndex(x => x.ClaimedByUserId)
                .HasFilter("claimed_by_user_id IS NOT NULL")
                .HasDatabaseName("ix_expert_application_claimed_by");
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
            // Written once on a submission and never changed, so a plain JSON conversion is enough
            e.Property(x => x.ProfileSnapshot)
                .HasColumnName("profile_snapshot")
                .HasColumnType("jsonb")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, SnapshotJson),
                    v => JsonSerializer.Deserialize<ProfileSnapshot>(v, SnapshotJson)
                );
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
            e.Property(x => x.AppliedMinYearsExperience)
                .HasColumnName("applied_min_years_experience");
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
            e.Property(x => x.ClaimedByUserId).HasColumnName("claimed_by_user_id");
            e.Property(x => x.ClaimedAt).HasColumnName("claimed_at");
            // Review queue filters by status and submission time
            e.HasIndex(x => new { x.Status, x.SubmittedAt })
                .HasDatabaseName("ix_expert_service_qualification_queue");
            // "Mine" filter of the review queue
            e.HasIndex(x => x.ClaimedByUserId)
                .HasFilter("claimed_by_user_id IS NOT NULL")
                .HasDatabaseName("ix_expert_service_qualification_claimed_by");
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
                t =>
                {
                    t.HasCheckConstraint("ck_platform_fee_percent", "percent BETWEEN 0 AND 50");
                    // The penalty comes out of the expert's share: never more than what the platform fee leaves
                    t.HasCheckConstraint(
                        "ck_platform_fee_late_rule",
                        "late_penalty_hours >= 0 AND late_penalty_percent >= 0 AND percent + late_penalty_percent <= 100 AND late_cancel_hours BETWEEN late_penalty_hours AND 720"
                    );
                    // The client's and the expert's shares of a no-response case; the platform keeps the rest
                    t.HasCheckConstraint(
                        "ck_platform_fee_no_response_rule",
                        "no_response_hours BETWEEN 1 AND 720 AND no_response_refund_percent >= 0 AND no_response_expert_percent >= 0 AND no_response_refund_percent + no_response_expert_percent <= 100"
                    );
                }
            );
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ServiceCode)
                .HasColumnName("service_code")
                .HasMaxLength(64)
                .IsRequired();
            e.Property(x => x.Percent).HasColumnName("percent");
            e.Property(x => x.LatePenaltyHours).HasColumnName("late_penalty_hours");
            e.Property(x => x.LatePenaltyPercent).HasColumnName("late_penalty_percent");
            e.Property(x => x.LateCancelHours).HasColumnName("late_cancel_hours");
            e.Property(x => x.NoResponseHours).HasColumnName("no_response_hours");
            e.Property(x => x.NoResponseRefundPercent).HasColumnName("no_response_refund_percent");
            e.Property(x => x.NoResponseExpertPercent).HasColumnName("no_response_expert_percent");
            e.Property(x => x.EffectiveFrom).HasColumnName("effective_from");
            e.Property(x => x.SetBy).HasColumnName("set_by");
            e.Property(x => x.CancelledAt).HasColumnName("cancelled_at");
            e.Property(x => x.CancelledBy).HasColumnName("cancelled_by");
            // "Current rate of a service" = latest effective_from per service_code
            e.HasIndex(x => new { x.ServiceCode, x.EffectiveFrom })
                .HasDatabaseName("ix_platform_fee_current");
            e.HasOne<ServiceCatalogItem>()
                .WithMany()
                .HasForeignKey(x => x.ServiceCode)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_platform_fee_service");
            // Starting rate of the MVP core service (overview: 20% platform commission), set by the system
            e.HasData(
                new
                {
                    Id = Guid.Parse("01929e3a-0000-7000-8000-000000000020"),
                    ServiceCode = "HUMAN_VERIFICATION",
                    Percent = 20,
                    LatePenaltyHours = 24,
                    LatePenaltyPercent = 30,
                    LateCancelHours = 72,
                    NoResponseHours = 72,
                    NoResponseRefundPercent = 50,
                    NoResponseExpertPercent = 30,
                    EffectiveFrom = new DateTimeOffset(2026, 10, 17, 0, 0, 0, TimeSpan.Zero),
                    SetBy = SystemActor.UserId,
                }
            );
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

        modelBuilder.Entity<ServiceOfferingChange>(e =>
        {
            // Append-only: a trigger created in the migration rejects UPDATE and DELETE
            e.ToTable("service_offering_change");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.OfferingId).HasColumnName("offering_id");
            e.Property(x => x.ExpertProfileId).HasColumnName("expert_profile_id");
            e.Property(x => x.ServiceCode)
                .HasColumnName("service_code")
                .HasMaxLength(64)
                .IsRequired();
            e.Property(x => x.OldFee).HasColumnName("old_fee");
            e.Property(x => x.NewFee).HasColumnName("new_fee");
            e.Property(x => x.OldTurnaroundHours).HasColumnName("old_turnaround_hours");
            e.Property(x => x.NewTurnaroundHours).HasColumnName("new_turnaround_hours");
            e.Property(x => x.ChangedBy).HasColumnName("changed_by");
            e.Property(x => x.ChangedAt).HasColumnName("changed_at").IsRequired();
            e.HasIndex(x => new
                {
                    x.ExpertProfileId,
                    x.ServiceCode,
                    x.ChangedAt,
                })
                .HasDatabaseName("ix_offering_change_history");
            e.HasOne<ServiceOffering>()
                .WithMany()
                .HasForeignKey(x => x.OfferingId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_offering_change_offering");
        });

        modelBuilder.Entity<PolicySetting>(e =>
        {
            e.ToTable("policy_setting");
            e.HasKey(x => x.Key);
            e.Property(x => x.Key).HasColumnName("key").HasMaxLength(64);
            e.Property(x => x.Value).HasColumnName("value");
            e.Property(x => x.UpdatedByUserId).HasColumnName("updated_by_user_id");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();
        });

        modelBuilder.Entity<PolicySettingChange>(e =>
        {
            e.ToTable("policy_setting_change");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Key).HasColumnName("key").HasMaxLength(64).IsRequired();
            e.Property(x => x.OldValue).HasColumnName("old_value");
            e.Property(x => x.NewValue).HasColumnName("new_value");
            e.Property(x => x.Reason)
                .HasColumnName("reason")
                .HasMaxLength(PolicySetting.MaxReasonLength)
                .IsRequired();
            e.Property(x => x.ChangedByUserId).HasColumnName("changed_by_user_id");
            e.Property(x => x.ChangedAt).HasColumnName("changed_at").IsRequired();
            e.HasIndex(x => x.ChangedAt).HasDatabaseName("ix_policy_setting_change_changed_at");
        });

        modelBuilder.Entity<ReviewClaimEvent>(e =>
        {
            e.ToTable("review_claim_event");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Gate).HasColumnName("gate").HasMaxLength(16).IsRequired();
            e.Property(x => x.ReviewId).HasColumnName("review_id");
            e.Property(x => x.Action).HasColumnName("action").HasMaxLength(16).IsRequired();
            e.Property(x => x.ActorUserId).HasColumnName("actor_user_id");
            e.Property(x => x.HolderUserId).HasColumnName("holder_user_id");
            e.Property(x => x.PreviousHolderUserId).HasColumnName("previous_holder_user_id");
            e.Property(x => x.Reason)
                .HasColumnName("reason")
                .HasMaxLength(ReviewClaimRules.MaxReasonLength);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.HasIndex(x => new
                {
                    x.Gate,
                    x.ReviewId,
                    x.CreatedAt,
                })
                .HasDatabaseName("ix_review_claim_event_review");
        });

        modelBuilder.Entity<CompetencyEvidenceLink>(e =>
        {
            e.ToTable("competency_evidence_link");
            e.HasKey(x => new { x.EvidenceId, x.Competency });
            e.Property(x => x.QualificationId).HasColumnName("qualification_id");
            e.Property(x => x.EvidenceId).HasColumnName("evidence_id");
            e.Property(x => x.Competency).HasColumnName("competency").HasMaxLength(8);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            e.HasIndex(x => x.QualificationId)
                .HasDatabaseName("ix_competency_evidence_link_qualification");
            // Removing a file removes the competencies it was tied to
            e.HasOne<ExpertEvidence>()
                .WithMany()
                .HasForeignKey(x => x.EvidenceId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_competency_evidence_link_evidence");
            e.HasOne<ExpertServiceQualification>()
                .WithMany()
                .HasForeignKey(x => x.QualificationId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_competency_evidence_link_qualification");
        });

        modelBuilder.Entity<CompetencyDescription>(e =>
        {
            e.ToTable("competency_description");
            e.HasKey(x => new { x.QualificationId, x.Competency });
            e.Property(x => x.QualificationId).HasColumnName("qualification_id");
            e.Property(x => x.Competency).HasColumnName("competency").HasMaxLength(8);
            e.Property(x => x.Text)
                .HasColumnName("text")
                .HasMaxLength(CompetencyEvidenceRules.MaxDescriptionLength)
                .IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();
            e.HasOne<ExpertServiceQualification>()
                .WithMany()
                .HasForeignKey(x => x.QualificationId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_competency_description_qualification");
        });

        modelBuilder.Entity<KnownReviewer>(e =>
        {
            e.ToTable("known_reviewer");
            e.HasKey(x => x.UserId);
            e.Property(x => x.UserId).HasColumnName("user_id").ValueGeneratedNever();
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(320);
            e.Property(x => x.LastSeenAt).HasColumnName("last_seen_at").IsRequired();
        });
    }
}
