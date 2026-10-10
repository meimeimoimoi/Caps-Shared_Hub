using Microsoft.EntityFrameworkCore;
using workflow.Entities.Review;
using workflow.Entities.Stubs;
using workflow.Entities.Workspace;

namespace workflow.Data;

public sealed class WorkflowDbContext(DbContextOptions<WorkflowDbContext> options) : DbContext(options)
{
    // Workspace schema
    public DbSet<Template> Templates => Set<Template>();
    public DbSet<TemplateVersion> TemplateVersions => Set<TemplateVersion>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<AiQuota> AiQuotas => Set<AiQuota>();
    public DbSet<AiUsage> AiUsages => Set<AiUsage>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<InputSnapshot> InputSnapshots => Set<InputSnapshot>();
    public DbSet<DocumentVersion> DocumentVersions => Set<DocumentVersion>();

    // Review schema
    public DbSet<ReviewCase> ReviewCases => Set<ReviewCase>();
    public DbSet<ReviewTask> ReviewTasks => Set<ReviewTask>();
    public DbSet<InfoRequest> InfoRequests => Set<InfoRequest>();
    public DbSet<ReviewAttachment> ReviewAttachments => Set<ReviewAttachment>();
    public DbSet<ReviewStatusHistory> ReviewStatusHistories => Set<ReviewStatusHistory>();

    // Identity stubs (excluded from migrations)
    public DbSet<UserStub> Users => Set<UserStub>();
    public DbSet<ExpertProfileStub> ExpertProfiles => Set<ExpertProfileStub>();
    public DbSet<AvailabilitySlotStub> AvailabilitySlots => Set<AvailabilitySlotStub>();
    public DbSet<ServiceOfferingStub> ServiceOfferings => Set<ServiceOfferingStub>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("workspace");

        // Identity Stubs
        modelBuilder.Entity<UserStub>(e =>
        {
            e.ToTable("users", "identity", t => t.ExcludeFromMigrations());
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
        });

        modelBuilder.Entity<ExpertProfileStub>(e =>
        {
            e.ToTable("expert_profile", "identity", t => t.ExcludeFromMigrations());
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
        });

        modelBuilder.Entity<AvailabilitySlotStub>(e =>
        {
            e.ToTable("availability_slot", "identity", t => t.ExcludeFromMigrations());
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
        });

        modelBuilder.Entity<ServiceOfferingStub>(e =>
        {
            e.ToTable("service_offering", "identity", t => t.ExcludeFromMigrations());
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
        });

        // ------------------ WORKSPACE SCHEMA ------------------

        // Template
        modelBuilder.Entity<Template>(e =>
        {
            e.ToTable("template", "workspace");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Code).HasColumnName("code").IsRequired();
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Name).HasColumnName("name").IsRequired();
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
        });

        // TemplateVersion
        modelBuilder.Entity<TemplateVersion>(e =>
        {
            e.ToTable("template_version", "workspace");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TemplateId).HasColumnName("template_id");
            e.Property(x => x.VersionNo).HasColumnName("version_no");
            e.Property(x => x.FieldSchema).HasColumnName("field_schema").HasColumnType("jsonb").IsRequired();
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("DRAFT").IsRequired();
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.TemplateId, x.VersionNo }).IsUnique();

            e.HasOne(x => x.Template)
                .WithMany(t => t.Versions)
                .HasForeignKey(x => x.TemplateId)
                .HasConstraintName("fk_template_version_24");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.CreatedBy)
                .HasConstraintName("fk_template_version_25");
        });

        // Conversation
        modelBuilder.Entity<Conversation>(e =>
        {
            e.ToTable("conversation", "workspace");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Title).HasColumnName("title");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.UserId, x.UpdatedAt }).HasDatabaseName("ix_conversation_2");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_conversation_26");
        });

        // ChatMessage
        modelBuilder.Entity<ChatMessage>(e =>
        {
            e.ToTable("chat_message", "workspace");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ConversationId).HasColumnName("conversation_id");
            e.Property(x => x.Sender).HasColumnName("sender").IsRequired();
            e.Property(x => x.Content).HasColumnName("content").IsRequired();
            e.Property(x => x.PeriodStart).HasColumnName("period_start");
            e.Property(x => x.PeriodEnd).HasColumnName("period_end");
            e.Property(x => x.ScopeResult).HasColumnName("scope_result");
            e.Property(x => x.AnswerStatus).HasColumnName("answer_status");
            e.Property(x => x.Citations).HasColumnName("citations").HasColumnType("jsonb");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.ConversationId, x.CreatedAt }).HasDatabaseName("ix_chat_message_2");

            e.HasOne(x => x.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(x => x.ConversationId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_chat_message_27");
        });

        // AiQuota
        modelBuilder.Entity<AiQuota>(e =>
        {
            e.ToTable("ai_quota", "workspace");
            e.HasKey(x => x.UserId);
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Balance).HasColumnName("balance").HasDefaultValue(10);
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()").IsRequired();

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_ai_quota_28");
        });

        // AiUsage
        modelBuilder.Entity<AiUsage>(e =>
        {
            e.ToTable("ai_usage", "workspace");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.ConversationId).HasColumnName("conversation_id");
            e.Property(x => x.QuestionId).HasColumnName("question_id");
            e.Property(x => x.PaidWith).HasColumnName("paid_with").IsRequired();
            e.Property(x => x.CreditHold).HasColumnName("credit_hold").HasDefaultValue(0L);
            e.Property(x => x.State).HasColumnName("state").HasDefaultValue("RESERVED").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.UserId, x.State }).HasDatabaseName("ix_ai_usage_2");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .HasConstraintName("fk_ai_usage_29");

            e.HasOne(x => x.Conversation)
                .WithMany()
                .HasForeignKey(x => x.ConversationId)
                .HasConstraintName("fk_ai_usage_30");

            e.HasOne(x => x.Question)
                .WithMany()
                .HasForeignKey(x => x.QuestionId)
                .HasConstraintName("fk_ai_usage_31");
        });

        // Document
        modelBuilder.Entity<Document>(e =>
        {
            e.ToTable("document", "workspace");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.OwnerUserId).HasColumnName("owner_user_id");
            e.Property(x => x.Source).HasColumnName("source").HasDefaultValue("TEMPLATE").IsRequired();
            e.Property(x => x.TemplateId).HasColumnName("template_id");
            e.Property(x => x.Title).HasColumnName("title").IsRequired();
            e.Property(x => x.PeriodStart).HasColumnName("period_start").IsRequired();
            e.Property(x => x.PeriodEnd).HasColumnName("period_end").IsRequired();
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("DRAFT").IsRequired();
            e.Property(x => x.VerifiedVersionId).HasColumnName("verified_version_id");
            e.Property(x => x.Metadata).HasColumnName("metadata").HasColumnType("jsonb").HasDefaultValue("{}").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.OwnerUserId, x.Status }).HasDatabaseName("ix_document_2");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.OwnerUserId)
                .HasConstraintName("fk_document_32");

            e.HasOne(x => x.Template)
                .WithMany()
                .HasForeignKey(x => x.TemplateId)
                .HasConstraintName("fk_document_33");
        });

        // InputSnapshot
        modelBuilder.Entity<InputSnapshot>(e =>
        {
            e.ToTable("input_snapshot", "workspace");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.VersionNo).HasColumnName("version_no");
            e.Property(x => x.Data).HasColumnName("data").HasColumnType("jsonb").IsRequired();
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.DocumentId, x.VersionNo }).IsUnique();
            e.HasAlternateKey(x => new { x.DocumentId, x.Id });

            e.HasOne(x => x.Document)
                .WithMany(d => d.InputSnapshots)
                .HasForeignKey(x => x.DocumentId)
                .HasConstraintName("fk_input_snapshot_34");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.CreatedBy)
                .HasConstraintName("fk_input_snapshot_35");
        });

        // DocumentVersion
        modelBuilder.Entity<DocumentVersion>(e =>
        {
            e.ToTable("document_version", "workspace");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.VersionNo).HasColumnName("version_no");
            e.Property(x => x.VersionType).HasColumnName("version_type").IsRequired();
            e.Property(x => x.InputSnapshotId).HasColumnName("input_snapshot_id");
            e.Property(x => x.TemplateVersionId).HasColumnName("template_version_id");
            e.Property(x => x.Citations).HasColumnName("citations").HasColumnType("jsonb");
            e.Property(x => x.DraftAssessment).HasColumnName("draft_assessment");
            e.Property(x => x.ReviewCaseId).HasColumnName("review_case_id");
            e.Property(x => x.FileUrl).HasColumnName("file_url");
            e.Property(x => x.Content).HasColumnName("content").HasColumnType("jsonb").IsRequired();
            e.Property(x => x.ContentHash).HasColumnName("content_hash").IsRequired();
            e.Property(x => x.IsImmutable).HasColumnName("is_immutable");
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.DocumentId, x.VersionNo }).IsUnique();
            e.HasAlternateKey(x => new { x.DocumentId, x.Id });
            e.HasIndex(x => x.ReviewCaseId).HasDatabaseName("ix_document_version_6");

            e.HasOne(x => x.Document)
                .WithMany(d => d.Versions)
                .HasForeignKey(x => x.DocumentId)
                .HasConstraintName("fk_document_version_36");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.CreatedBy)
                .HasConstraintName("fk_document_version_37");

            e.HasOne(x => x.TemplateVersion)
                .WithMany()
                .HasForeignKey(x => x.TemplateVersionId)
                .HasConstraintName("fk_document_version_38");

            // Composite FK: (document_id, input_snapshot_id) -> input_snapshot (document_id, id)
            e.HasOne(x => x.InputSnapshot)
                .WithMany()
                .HasPrincipalKey(s => new { s.DocumentId, s.Id })
                .HasForeignKey(x => new { x.DocumentId, x.InputSnapshotId })
                .HasConstraintName("fk_document_version_39");
        });

        // Document (id, verified_version_id) -> DocumentVersion (document_id, id)
        modelBuilder.Entity<Document>(e =>
        {
            e.HasOne<DocumentVersion>()
                .WithMany()
                .HasPrincipalKey(v => new { v.DocumentId, v.Id })
                .HasForeignKey(d => new { d.Id, d.VerifiedVersionId })
                .HasConstraintName("fk_document_40");
        });

        // ------------------ REVIEW SCHEMA ------------------

        // ReviewCase
        modelBuilder.Entity<ReviewCase>(e =>
        {
            e.ToTable("review_case", "review");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.SourceVersionId).HasColumnName("source_version_id");
            e.Property(x => x.RequesterUserId).HasColumnName("requester_user_id");
            e.Property(x => x.ExpertProfileId).HasColumnName("expert_profile_id");
            e.Property(x => x.SlotId).HasColumnName("slot_id");
            e.Property(x => x.ServiceOfferingId).HasColumnName("service_offering_id");
            e.Property(x => x.Fee).HasColumnName("fee");
            e.Property(x => x.PlatformFeePct).HasColumnName("platform_fee_pct");
            e.Property(x => x.ProblemDescription).HasColumnName("problem_description").IsRequired();
            e.Property(x => x.ExpectedOutcome).HasColumnName("expected_outcome");
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("PENDING_EXPERT_RESPONSE").IsRequired();
            e.Property(x => x.Result).HasColumnName("result");
            e.Property(x => x.CannotVerifyReason).HasColumnName("cannot_verify_reason");
            e.Property(x => x.ReviewSummary).HasColumnName("review_summary");
            e.Property(x => x.DeclineReason).HasColumnName("decline_reason");
            e.Property(x => x.TerminationReason).HasColumnName("termination_reason");
            e.Property(x => x.ResponseDeadline).HasColumnName("response_deadline").IsRequired();
            e.Property(x => x.AcceptedAt).HasColumnName("accepted_at");
            e.Property(x => x.PaymentDeadline).HasColumnName("payment_deadline");
            e.Property(x => x.PaidAt).HasColumnName("paid_at");
            e.Property(x => x.StartDeadline).HasColumnName("start_deadline");
            e.Property(x => x.StartedAt).HasColumnName("started_at");
            e.Property(x => x.DeliveryDeadline).HasColumnName("delivery_deadline");
            e.Property(x => x.DeliveredAt).HasColumnName("delivered_at");
            e.Property(x => x.AcceptanceDeadline).HasColumnName("acceptance_deadline");
            e.Property(x => x.CompletedAt).HasColumnName("completed_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()").IsRequired();

            e.HasAlternateKey(x => new { x.DocumentId, x.Id });
            e.HasIndex(x => new { x.ExpertProfileId, x.Status }).HasDatabaseName("ix_review_case_4");
            e.HasIndex(x => new { x.RequesterUserId, x.Status }).HasDatabaseName("ix_review_case_6");

            e.HasOne<Document>()
                .WithMany()
                .HasForeignKey(x => x.DocumentId)
                .HasConstraintName("fk_review_case_42");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.RequesterUserId)
                .HasConstraintName("fk_review_case_43");

            e.HasOne<ExpertProfileStub>()
                .WithMany()
                .HasForeignKey(x => x.ExpertProfileId)
                .HasConstraintName("fk_review_case_44");

            e.HasOne<AvailabilitySlotStub>()
                .WithMany()
                .HasForeignKey(x => x.SlotId)
                .HasConstraintName("fk_review_case_45");

            e.HasOne<ServiceOfferingStub>()
                .WithMany()
                .HasForeignKey(x => x.ServiceOfferingId)
                .HasConstraintName("fk_review_case_46");

            // Composite FK: (document_id, source_version_id) -> document_version (document_id, id)
            e.HasOne<DocumentVersion>()
                .WithMany()
                .HasPrincipalKey(v => new { v.DocumentId, v.Id })
                .HasForeignKey(x => new { x.DocumentId, x.SourceVersionId })
                .HasConstraintName("fk_review_case_47");
        });

        // DocumentVersion (document_id, review_case_id) -> ReviewCase (document_id, id)
        modelBuilder.Entity<DocumentVersion>(e =>
        {
            e.HasOne<ReviewCase>()
                .WithMany()
                .HasPrincipalKey(r => new { r.DocumentId, r.Id })
                .HasForeignKey(v => new { v.DocumentId, v.ReviewCaseId })
                .HasConstraintName("fk_document_version_41");
        });

        // ReviewTask
        modelBuilder.Entity<ReviewTask>(e =>
        {
            e.ToTable("review_task", "review");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ReviewCaseId).HasColumnName("review_case_id");
            e.Property(x => x.TaskCode).HasColumnName("task_code").IsRequired();
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("PENDING").IsRequired();
            e.Property(x => x.Note).HasColumnName("note");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.ReviewCaseId, x.TaskCode }).IsUnique();

            e.HasOne(x => x.ReviewCase)
                .WithMany(c => c.ReviewTasks)
                .HasForeignKey(x => x.ReviewCaseId)
                .HasConstraintName("fk_review_task_48");
        });

        // InfoRequest
        modelBuilder.Entity<InfoRequest>(e =>
        {
            e.ToTable("info_request", "review");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ReviewCaseId).HasColumnName("review_case_id");
            e.Property(x => x.RequestedBy).HasColumnName("requested_by");
            e.Property(x => x.Message).HasColumnName("message").IsRequired();
            e.Property(x => x.DueAt).HasColumnName("due_at").IsRequired();
            e.Property(x => x.ResponseMessage).HasColumnName("response_message");
            e.Property(x => x.RespondedAt).HasColumnName("responded_at");
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("OPEN").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasAlternateKey(x => new { x.ReviewCaseId, x.Id });
            e.HasIndex(x => new { x.ReviewCaseId, x.Status }).HasDatabaseName("ix_info_request_2");

            e.HasOne(x => x.ReviewCase)
                .WithMany(c => c.InfoRequests)
                .HasForeignKey(x => x.ReviewCaseId)
                .HasConstraintName("fk_info_request_49");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.RequestedBy)
                .HasConstraintName("fk_info_request_50");
        });

        // ReviewAttachment
        modelBuilder.Entity<ReviewAttachment>(e =>
        {
            e.ToTable("review_attachment", "review");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ReviewCaseId).HasColumnName("review_case_id");
            e.Property(x => x.InfoRequestId).HasColumnName("info_request_id");
            e.Property(x => x.FileUrl).HasColumnName("file_url").IsRequired();
            e.Property(x => x.FileName).HasColumnName("file_name").IsRequired();
            e.Property(x => x.UploadedBy).HasColumnName("uploaded_by");
            e.Property(x => x.UploadedAt).HasColumnName("uploaded_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => x.ReviewCaseId).HasDatabaseName("ix_review_attachment_2");

            e.HasOne(x => x.ReviewCase)
                .WithMany(c => c.Attachments)
                .HasForeignKey(x => x.ReviewCaseId)
                .HasConstraintName("fk_review_attachment_51");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.UploadedBy)
                .HasConstraintName("fk_review_attachment_52");

            // Composite FK: (review_case_id, info_request_id) -> info_request (review_case_id, id)
            e.HasOne(x => x.InfoRequest)
                .WithMany(i => i.Attachments)
                .HasPrincipalKey(i => new { i.ReviewCaseId, i.Id })
                .HasForeignKey(x => new { x.ReviewCaseId, x.InfoRequestId })
                .HasConstraintName("fk_review_attachment_53");
        });

        // ReviewStatusHistory
        modelBuilder.Entity<ReviewStatusHistory>(e =>
        {
            e.ToTable("review_status_history", "review");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ReviewCaseId).HasColumnName("review_case_id");
            e.Property(x => x.FromStatus).HasColumnName("from_status");
            e.Property(x => x.ToStatus).HasColumnName("to_status").IsRequired();
            e.Property(x => x.ActorUserId).HasColumnName("actor_user_id");
            e.Property(x => x.Note).HasColumnName("note");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.ReviewCaseId, x.CreatedAt }).HasDatabaseName("ix_review_status_history_2");

            e.HasOne(x => x.ReviewCase)
                .WithMany(c => c.StatusHistories)
                .HasForeignKey(x => x.ReviewCaseId)
                .HasConstraintName("fk_review_status_history_54");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.ActorUserId)
                .HasConstraintName("fk_review_status_history_55");
        });
    }
}
