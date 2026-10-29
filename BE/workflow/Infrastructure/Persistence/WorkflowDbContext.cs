using Caps.Workflow.Domain.Review;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;

namespace Caps.Workflow.Infrastructure.Persistence;

/// <summary>The workflow service's database: documents and AI chats (schema workspace) and expert reviews (schema review).</summary>
public sealed class WorkflowDbContext(DbContextOptions<WorkflowDbContext> options)
    : DbContext(options)
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
    public DbSet<CaseMessage> CaseMessages => Set<CaseMessage>();
    public DbSet<CaseReadMarker> CaseReadMarkers => Set<CaseReadMarker>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("workspace");

        // User ids are plain columns: users live in the auth service,
        // so there are no cross-service foreign keys and each service migrates on its own.

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
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();
        });

        // TemplateVersion
        modelBuilder.Entity<TemplateVersion>(e =>
        {
            e.ToTable("template_version", "workspace");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TemplateId).HasColumnName("template_id");
            e.Property(x => x.VersionNo).HasColumnName("version_no");
            e.Property(x => x.FieldSchema)
                .HasColumnName("field_schema")
                .HasColumnType("jsonb")
                .IsRequired();
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("DRAFT").IsRequired();
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasIndex(x => new { x.TemplateId, x.VersionNo }).IsUnique();

            e.HasOne(x => x.Template)
                .WithMany(t => t.Versions)
                .HasForeignKey(x => x.TemplateId)
                .HasConstraintName("fk_template_version_24");
        });

        // Conversation
        modelBuilder.Entity<Conversation>(e =>
        {
            e.ToTable("conversation", "workspace");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Title).HasColumnName("title");
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();
            e.Property(x => x.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasIndex(x => new { x.UserId, x.UpdatedAt }).HasDatabaseName("ix_conversation_2");
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
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasIndex(x => new { x.ConversationId, x.CreatedAt })
                .HasDatabaseName("ix_chat_message_2");

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
            e.Property(x => x.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("now()")
                .IsRequired();
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
            e.Property(x => x.State)
                .HasColumnName("state")
                .HasDefaultValue("RESERVED")
                .IsRequired();
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();
            e.Property(x => x.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasIndex(x => new { x.UserId, x.State }).HasDatabaseName("ix_ai_usage_2");

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
            e.Property(x => x.Source)
                .HasColumnName("source")
                .HasDefaultValue("TEMPLATE")
                .IsRequired();
            e.Property(x => x.TemplateId).HasColumnName("template_id");
            e.Property(x => x.Title).HasColumnName("title").IsRequired();
            e.Property(x => x.PeriodStart).HasColumnName("period_start").IsRequired();
            e.Property(x => x.PeriodEnd).HasColumnName("period_end").IsRequired();
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("DRAFT").IsRequired();
            e.Property(x => x.VerifiedVersionId).HasColumnName("verified_version_id");
            e.Property(x => x.Metadata)
                .HasColumnName("metadata")
                .HasColumnType("jsonb")
                .HasDefaultValue("{}")
                .IsRequired();
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();
            e.Property(x => x.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasIndex(x => new { x.OwnerUserId, x.Status }).HasDatabaseName("ix_document_2");

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
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasIndex(x => new { x.DocumentId, x.VersionNo }).IsUnique();
            e.HasAlternateKey(x => new { x.DocumentId, x.Id });

            e.HasOne(x => x.Document)
                .WithMany(d => d.InputSnapshots)
                .HasForeignKey(x => x.DocumentId)
                .HasConstraintName("fk_input_snapshot_34");
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
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasIndex(x => new { x.DocumentId, x.VersionNo }).IsUnique();
            e.HasAlternateKey(x => new { x.DocumentId, x.Id });
            e.HasIndex(x => x.ReviewCaseId).HasDatabaseName("ix_document_version_6");

            e.HasOne(x => x.Document)
                .WithMany(d => d.Versions)
                .HasForeignKey(x => x.DocumentId)
                .HasConstraintName("fk_document_version_36");

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
            // Backs ReviewCase.Request: the frozen offer must stay valid
            e.ToTable(
                "review_case",
                "review",
                t =>
                    t.HasCheckConstraint(
                        "ck_case_offer",
                        "fee > 0 AND platform_fee_pct BETWEEN 0 AND 99 AND turnaround_hours BETWEEN 1 AND 720"
                            + " AND late_penalty_hours >= 0 AND late_penalty_pct >= 0"
                            + " AND platform_fee_pct + late_penalty_pct <= 100"
                            + " AND late_cancel_hours BETWEEN late_penalty_hours AND 720"
                            + " AND no_response_hours BETWEEN 1 AND 720"
                            + " AND no_response_refund_pct >= 0 AND no_response_expert_pct >= 0"
                            + " AND no_response_refund_pct + no_response_expert_pct <= 100"
                    )
            );
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.SourceVersionId).HasColumnName("source_version_id");
            e.Property(x => x.RequesterUserId).HasColumnName("requester_user_id");
            e.Property(x => x.ExpertProfileId).HasColumnName("expert_profile_id");
            e.Property(x => x.ExpertUserId).HasColumnName("expert_user_id");
            e.Property(x => x.SlotId).HasColumnName("slot_id");
            e.Property(x => x.ServiceOfferingId).HasColumnName("service_offering_id");
            e.Property(x => x.Fee).HasColumnName("fee");
            e.Property(x => x.PlatformFeePct).HasColumnName("platform_fee_pct");
            e.Property(x => x.TurnaroundHours).HasColumnName("turnaround_hours");
            e.Property(x => x.LatePenaltyHours).HasColumnName("late_penalty_hours");
            e.Property(x => x.LatePenaltyPct).HasColumnName("late_penalty_pct");
            e.Property(x => x.LateCancelHours).HasColumnName("late_cancel_hours");
            e.Property(x => x.NoResponseHours).HasColumnName("no_response_hours");
            e.Property(x => x.NoResponseRefundPct).HasColumnName("no_response_refund_pct");
            e.Property(x => x.NoResponseExpertPct).HasColumnName("no_response_expert_pct");
            e.Property(x => x.LateRefundPct).HasColumnName("late_refund_pct");
            e.Property(x => x.InfoRequestCount).HasColumnName("info_request_count");
            e.Property(x => x.ProblemDescription).HasColumnName("problem_description").IsRequired();
            e.Property(x => x.ExpectedOutcome).HasColumnName("expected_outcome");
            e.Property(x => x.Status)
                .HasColumnName("status")
                .HasDefaultValue("PENDING_EXPERT_RESPONSE")
                .IsRequired();
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
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();
            e.Property(x => x.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasAlternateKey(x => new { x.DocumentId, x.Id });
            e.HasIndex(x => new { x.ExpertProfileId, x.Status })
                .HasDatabaseName("ix_review_case_4");
            e.HasIndex(x => new { x.RequesterUserId, x.Status })
                .HasDatabaseName("ix_review_case_6");
            e.HasIndex(x => new { x.ExpertUserId, x.Status }).HasDatabaseName("ix_review_case_7");
            // One running case per document version and expert; a closed case frees the pair
            e.HasIndex(x => new { x.SourceVersionId, x.ExpertProfileId })
                .IsUnique()
                .HasFilter($"status IN ('{string.Join("', '", ReviewCase.OpenStatuses)}')")
                .HasDatabaseName("ux_review_case_open");

            e.HasOne<Document>()
                .WithMany()
                .HasForeignKey(x => x.DocumentId)
                .HasConstraintName("fk_review_case_42");

            // Expert, slot and offering ids belong to the expert service: plain columns, no cross-service FKs

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
            e.Property(x => x.Status)
                .HasColumnName("status")
                .HasDefaultValue("PENDING")
                .IsRequired();
            e.Property(x => x.Note).HasColumnName("note");
            e.Property(x => x.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

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
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasAlternateKey(x => new { x.ReviewCaseId, x.Id });
            e.HasIndex(x => new { x.ReviewCaseId, x.Status }).HasDatabaseName("ix_info_request_2");

            e.HasOne(x => x.ReviewCase)
                .WithMany(c => c.InfoRequests)
                .HasForeignKey(x => x.ReviewCaseId)
                .HasConstraintName("fk_info_request_49");
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
            e.Property(x => x.UploadedAt)
                .HasColumnName("uploaded_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasIndex(x => x.ReviewCaseId).HasDatabaseName("ix_review_attachment_2");

            e.HasOne(x => x.ReviewCase)
                .WithMany(c => c.Attachments)
                .HasForeignKey(x => x.ReviewCaseId)
                .HasConstraintName("fk_review_attachment_51");

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
            e.Property(x => x.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()")
                .IsRequired();

            e.HasIndex(x => new { x.ReviewCaseId, x.CreatedAt })
                .HasDatabaseName("ix_review_status_history_2");

            e.HasOne(x => x.ReviewCase)
                .WithMany(c => c.StatusHistories)
                .HasForeignKey(x => x.ReviewCaseId)
                .HasConstraintName("fk_review_status_history_54");
        });

        // CaseMessage
        modelBuilder.Entity<CaseMessage>(e =>
        {
            e.ToTable("case_message", "review");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ReviewCaseId).HasColumnName("review_case_id");
            e.Property(x => x.SenderUserId).HasColumnName("sender_user_id");
            e.Property(x => x.SenderRole)
                .HasColumnName("sender_role")
                .HasMaxLength(16)
                .IsRequired();
            e.Property(x => x.Content)
                .HasColumnName("content")
                .HasMaxLength(CaseMessage.MaxLength)
                .IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();

            e.HasIndex(x => new { x.ReviewCaseId, x.CreatedAt })
                .HasDatabaseName("ix_case_message_2");

            e.HasOne<ReviewCase>()
                .WithMany()
                .HasForeignKey(x => x.ReviewCaseId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_case_message_55");
        });

        // CaseReadMarker
        modelBuilder.Entity<CaseReadMarker>(e =>
        {
            e.ToTable("case_read_marker", "review");
            e.HasKey(x => new { x.ReviewCaseId, x.UserId });
            e.Property(x => x.ReviewCaseId).HasColumnName("review_case_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.LastReadMessageId).HasColumnName("last_read_message_id");
            e.Property(x => x.LastReadAt).HasColumnName("last_read_at").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();

            e.HasOne<ReviewCase>()
                .WithMany()
                .HasForeignKey(x => x.ReviewCaseId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_case_read_marker_56");
        });
    }
}
