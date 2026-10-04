using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ingestion.Migrations
{
    /// <inheritdoc />
    public partial class InitialIngestion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "knowledge");

            migrationBuilder.CreateTable(
                name: "crawl_job",
                schema: "knowledge",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trigger_type = table.Column<string>(type: "text", nullable: false),
                    triggered_by = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "RUNNING"),
                    docs_found = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    detail = table.Column<string>(type: "jsonb", nullable: true),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    finished_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crawl_job", x => x.id);
                    table.ForeignKey(
                        name: "fk_crawl_job_23",
                        column: x => x.triggered_by,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "legal_source",
                schema: "knowledge",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_number = table.Column<string>(type: "text", nullable: false),
                    doc_type = table.Column<string>(type: "text", nullable: false),
                    issuing_authority = table.Column<string>(type: "text", nullable: true),
                    title = table.Column<string>(type: "text", nullable: false),
                    metadata = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "{}"),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_legal_source", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "knowledge_document",
                schema: "knowledge",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    legal_source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_no = table.Column<int>(type: "integer", nullable: false),
                    source = table.Column<string>(type: "text", nullable: false),
                    crawl_job_id = table.Column<Guid>(type: "uuid", nullable: true),
                    uploaded_by = table.Column<Guid>(type: "uuid", nullable: true),
                    file_url = table.Column<string>(type: "text", nullable: false),
                    file_hash = table.Column<string>(type: "text", nullable: false),
                    content_json = table.Column<string>(type: "jsonb", nullable: true),
                    issued_date = table.Column<DateOnly>(type: "date", nullable: true),
                    effective_from = table.Column<DateOnly>(type: "date", nullable: true),
                    effective_to = table.Column<DateOnly>(type: "date", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "PENDING"),
                    rejection_reason = table.Column<string>(type: "text", nullable: true),
                    approved_by = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    indexed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    retry_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    last_error = table.Column<string>(type: "text", nullable: true),
                    metadata = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "{}"),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_knowledge_document", x => x.id);
                    table.ForeignKey(
                        name: "fk_knowledge_document_18",
                        column: x => x.legal_source_id,
                        principalSchema: "knowledge",
                        principalTable: "legal_source",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_knowledge_document_19",
                        column: x => x.crawl_job_id,
                        principalSchema: "knowledge",
                        principalTable: "crawl_job",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_knowledge_document_20",
                        column: x => x.uploaded_by,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_knowledge_document_21",
                        column: x => x.approved_by,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "legal_amendment",
                schema: "knowledge",
                columns: table => new
                {
                    amending_source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amended_source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    relation_type = table.Column<string>(type: "text", nullable: false, defaultValue: "AMENDS"),
                    affected_articles = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_legal_amendment", x => new { x.amending_source_id, x.amended_source_id });
                    table.ForeignKey(
                        name: "fk_legal_amendment_16",
                        column: x => x.amending_source_id,
                        principalSchema: "knowledge",
                        principalTable: "legal_source",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_legal_amendment_17",
                        column: x => x.amended_source_id,
                        principalSchema: "knowledge",
                        principalTable: "legal_source",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "kb_chunk",
                schema: "knowledge",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    knowledge_document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    chunk_index = table.Column<int>(type: "integer", nullable: false),
                    qdrant_point_id = table.Column<string>(type: "text", nullable: false),
                    article = table.Column<string>(type: "text", nullable: true),
                    clause = table.Column<string>(type: "text", nullable: true),
                    point = table.Column<string>(type: "text", nullable: true),
                    page = table.Column<int>(type: "integer", nullable: true),
                    effective_from = table.Column<DateOnly>(type: "date", nullable: true),
                    effective_to = table.Column<DateOnly>(type: "date", nullable: true),
                    metadata = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "{}"),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_kb_chunk", x => x.id);
                    table.ForeignKey(
                        name: "fk_kb_chunk_22",
                        column: x => x.knowledge_document_id,
                        principalSchema: "knowledge",
                        principalTable: "knowledge_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_crawl_job_triggered_by",
                schema: "knowledge",
                table: "crawl_job",
                column: "triggered_by");

            migrationBuilder.CreateIndex(
                name: "IX_kb_chunk_knowledge_document_id_chunk_index",
                schema: "knowledge",
                table: "kb_chunk",
                columns: new[] { "knowledge_document_id", "chunk_index" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_kb_chunk_qdrant_point_id",
                schema: "knowledge",
                table: "kb_chunk",
                column: "qdrant_point_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_knowledge_document_4",
                schema: "knowledge",
                table: "knowledge_document",
                columns: new[] { "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_knowledge_document_approved_by",
                schema: "knowledge",
                table: "knowledge_document",
                column: "approved_by");

            migrationBuilder.CreateIndex(
                name: "IX_knowledge_document_crawl_job_id",
                schema: "knowledge",
                table: "knowledge_document",
                column: "crawl_job_id");

            migrationBuilder.CreateIndex(
                name: "IX_knowledge_document_file_hash",
                schema: "knowledge",
                table: "knowledge_document",
                column: "file_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_knowledge_document_legal_source_id_version_no",
                schema: "knowledge",
                table: "knowledge_document",
                columns: new[] { "legal_source_id", "version_no" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_knowledge_document_uploaded_by",
                schema: "knowledge",
                table: "knowledge_document",
                column: "uploaded_by");

            migrationBuilder.CreateIndex(
                name: "IX_legal_amendment_amended_source_id",
                schema: "knowledge",
                table: "legal_amendment",
                column: "amended_source_id");

            migrationBuilder.CreateIndex(
                name: "IX_legal_source_document_number",
                schema: "knowledge",
                table: "legal_source",
                column: "document_number",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "kb_chunk",
                schema: "knowledge");

            migrationBuilder.DropTable(
                name: "legal_amendment",
                schema: "knowledge");

            migrationBuilder.DropTable(
                name: "knowledge_document",
                schema: "knowledge");

            migrationBuilder.DropTable(
                name: "legal_source",
                schema: "knowledge");

            migrationBuilder.DropTable(
                name: "crawl_job",
                schema: "knowledge");
        }
    }
}
