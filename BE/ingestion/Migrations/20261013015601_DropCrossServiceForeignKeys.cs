using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ingestion.Migrations
{
    /// <inheritdoc />
    public partial class DropCrossServiceForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // New databases never create these (the initial migration no longer does), so drop only if present
            foreach (var (table, constraint) in new[]
            {
                ("knowledge.crawl_job", "fk_crawl_job_23"),
                ("knowledge.knowledge_document", "fk_knowledge_document_20"),
                ("knowledge.knowledge_document", "fk_knowledge_document_21"),
            })
                migrationBuilder.Sql($"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint};");

            migrationBuilder.DropIndex(
                name: "IX_knowledge_document_approved_by",
                schema: "knowledge",
                table: "knowledge_document");

            migrationBuilder.DropIndex(
                name: "IX_knowledge_document_uploaded_by",
                schema: "knowledge",
                table: "knowledge_document");

            migrationBuilder.DropIndex(
                name: "IX_crawl_job_triggered_by",
                schema: "knowledge",
                table: "crawl_job");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_knowledge_document_approved_by",
                schema: "knowledge",
                table: "knowledge_document",
                column: "approved_by");

            migrationBuilder.CreateIndex(
                name: "IX_knowledge_document_uploaded_by",
                schema: "knowledge",
                table: "knowledge_document",
                column: "uploaded_by");

            migrationBuilder.CreateIndex(
                name: "IX_crawl_job_triggered_by",
                schema: "knowledge",
                table: "crawl_job",
                column: "triggered_by");
        }
    }
}
