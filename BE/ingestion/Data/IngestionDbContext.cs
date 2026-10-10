using ingestion.Entities;
using ingestion.Entities.Stubs;
using Microsoft.EntityFrameworkCore;

namespace ingestion.Data;

public sealed class IngestionDbContext(DbContextOptions<IngestionDbContext> options) : DbContext(options)
{
    public DbSet<LegalSource> LegalSources => Set<LegalSource>();
    public DbSet<LegalAmendment> LegalAmendments => Set<LegalAmendment>();
    public DbSet<KnowledgeDocument> KnowledgeDocuments => Set<KnowledgeDocument>();
    public DbSet<KbChunk> KbChunks => Set<KbChunk>();
    public DbSet<CrawlJob> CrawlJobs => Set<CrawlJob>();

    // Identity stub
    public DbSet<UserStub> Users => Set<UserStub>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("knowledge");

        // UserStub excluded from migrations
        modelBuilder.Entity<UserStub>(e =>
        {
            e.ToTable("users", "identity", t => t.ExcludeFromMigrations());
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
        });

        // LegalSource
        modelBuilder.Entity<LegalSource>(e =>
        {
            e.ToTable("legal_source");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.DocumentNumber).HasColumnName("document_number").IsRequired();
            e.HasIndex(x => x.DocumentNumber).IsUnique();
            e.Property(x => x.DocType).HasColumnName("doc_type").IsRequired();
            e.Property(x => x.IssuingAuthority).HasColumnName("issuing_authority");
            e.Property(x => x.Title).HasColumnName("title").IsRequired();
            e.Property(x => x.Metadata).HasColumnName("metadata").HasColumnType("jsonb").HasDefaultValue("{}").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
        });

        // LegalAmendment
        modelBuilder.Entity<LegalAmendment>(e =>
        {
            e.ToTable("legal_amendment");
            e.HasKey(x => new { x.AmendingSourceId, x.AmendedSourceId });
            e.Property(x => x.AmendingSourceId).HasColumnName("amending_source_id");
            e.Property(x => x.AmendedSourceId).HasColumnName("amended_source_id");
            e.Property(x => x.RelationType).HasColumnName("relation_type").HasDefaultValue("AMENDS").IsRequired();
            e.Property(x => x.AffectedArticles).HasColumnName("affected_articles").HasColumnType("jsonb");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasOne(x => x.AmendingSource)
                .WithMany(s => s.AmendingAmendments)
                .HasForeignKey(x => x.AmendingSourceId)
                .HasConstraintName("fk_legal_amendment_16");

            e.HasOne(x => x.AmendedSource)
                .WithMany(s => s.AmendedAmendments)
                .HasForeignKey(x => x.AmendedSourceId)
                .HasConstraintName("fk_legal_amendment_17");
        });

        // KnowledgeDocument
        modelBuilder.Entity<KnowledgeDocument>(e =>
        {
            e.ToTable("knowledge_document");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.LegalSourceId).HasColumnName("legal_source_id");
            e.Property(x => x.VersionNo).HasColumnName("version_no");
            e.Property(x => x.Source).HasColumnName("source").IsRequired();
            e.Property(x => x.CrawlJobId).HasColumnName("crawl_job_id");
            e.Property(x => x.UploadedBy).HasColumnName("uploaded_by");
            e.Property(x => x.FileUrl).HasColumnName("file_url").IsRequired();
            e.Property(x => x.FileHash).HasColumnName("file_hash").IsRequired();
            e.HasIndex(x => x.FileHash).IsUnique();
            e.Property(x => x.ContentJson).HasColumnName("content_json").HasColumnType("jsonb");
            e.Property(x => x.IssuedDate).HasColumnName("issued_date");
            e.Property(x => x.EffectiveFrom).HasColumnName("effective_from");
            e.Property(x => x.EffectiveTo).HasColumnName("effective_to");
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("PENDING").IsRequired();
            e.Property(x => x.RejectionReason).HasColumnName("rejection_reason");
            e.Property(x => x.ApprovedBy).HasColumnName("approved_by");
            e.Property(x => x.ApprovedAt).HasColumnName("approved_at");
            e.Property(x => x.IndexedAt).HasColumnName("indexed_at");
            e.Property(x => x.RetryCount).HasColumnName("retry_count").HasDefaultValue(0);
            e.Property(x => x.LastError).HasColumnName("last_error");
            e.Property(x => x.Metadata).HasColumnName("metadata").HasColumnType("jsonb").HasDefaultValue("{}").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.LegalSourceId, x.VersionNo }).IsUnique();
            e.HasIndex(x => new { x.Status, x.CreatedAt }).HasDatabaseName("ix_knowledge_document_4");

            e.HasOne(x => x.LegalSource)
                .WithMany(s => s.KnowledgeDocuments)
                .HasForeignKey(x => x.LegalSourceId)
                .HasConstraintName("fk_knowledge_document_18");

            e.HasOne(x => x.CrawlJob)
                .WithMany(j => j.KnowledgeDocuments)
                .HasForeignKey(x => x.CrawlJobId)
                .HasConstraintName("fk_knowledge_document_19");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.UploadedBy)
                .HasConstraintName("fk_knowledge_document_20");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.ApprovedBy)
                .HasConstraintName("fk_knowledge_document_21");
        });

        // KbChunk
        modelBuilder.Entity<KbChunk>(e =>
        {
            e.ToTable("kb_chunk");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.KnowledgeDocumentId).HasColumnName("knowledge_document_id");
            e.Property(x => x.ChunkIndex).HasColumnName("chunk_index");
            e.Property(x => x.QdrantPointId).HasColumnName("qdrant_point_id").IsRequired();
            e.HasIndex(x => x.QdrantPointId).IsUnique();
            e.Property(x => x.Article).HasColumnName("article");
            e.Property(x => x.Clause).HasColumnName("clause");
            e.Property(x => x.Point).HasColumnName("point");
            e.Property(x => x.Page).HasColumnName("page");
            e.Property(x => x.EffectiveFrom).HasColumnName("effective_from");
            e.Property(x => x.EffectiveTo).HasColumnName("effective_to");
            e.Property(x => x.Metadata).HasColumnName("metadata").HasColumnType("jsonb").HasDefaultValue("{}").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.KnowledgeDocumentId, x.ChunkIndex }).IsUnique();

            e.HasOne(x => x.KnowledgeDocument)
                .WithMany(d => d.Chunks)
                .HasForeignKey(x => x.KnowledgeDocumentId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_kb_chunk_22");
        });

        // CrawlJob
        modelBuilder.Entity<CrawlJob>(e =>
        {
            e.ToTable("crawl_job");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TriggerType).HasColumnName("trigger_type").IsRequired();
            e.Property(x => x.TriggeredBy).HasColumnName("triggered_by");
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("RUNNING").IsRequired();
            e.Property(x => x.DocsFound).HasColumnName("docs_found").HasDefaultValue(0);
            e.Property(x => x.Detail).HasColumnName("detail").HasColumnType("jsonb");
            e.Property(x => x.StartedAt).HasColumnName("started_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.FinishedAt).HasColumnName("finished_at");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.TriggeredBy)
                .HasConstraintName("fk_crawl_job_23");
        });
    }
}
