using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
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
                ("workspace.ai_quota", "fk_ai_quota_28"),
                ("workspace.ai_usage", "fk_ai_usage_29"),
                ("workspace.conversation", "fk_conversation_26"),
                ("workspace.document", "fk_document_32"),
                ("workspace.document_version", "fk_document_version_37"),
                ("review.info_request", "fk_info_request_50"),
                ("workspace.input_snapshot", "fk_input_snapshot_35"),
                ("review.review_attachment", "fk_review_attachment_52"),
                ("review.review_case", "fk_review_case_43"),
                ("review.review_status_history", "fk_review_status_history_55"),
                ("workspace.template_version", "fk_template_version_25"),
            })
                migrationBuilder.Sql($"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint};");

            migrationBuilder.DropIndex(
                name: "IX_template_version_created_by",
                schema: "workspace",
                table: "template_version");

            migrationBuilder.DropIndex(
                name: "IX_review_status_history_actor_user_id",
                schema: "review",
                table: "review_status_history");

            migrationBuilder.DropIndex(
                name: "IX_review_attachment_uploaded_by",
                schema: "review",
                table: "review_attachment");

            migrationBuilder.DropIndex(
                name: "IX_input_snapshot_created_by",
                schema: "workspace",
                table: "input_snapshot");

            migrationBuilder.DropIndex(
                name: "IX_info_request_requested_by",
                schema: "review",
                table: "info_request");

            migrationBuilder.DropIndex(
                name: "IX_document_version_created_by",
                schema: "workspace",
                table: "document_version");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_template_version_created_by",
                schema: "workspace",
                table: "template_version",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_review_status_history_actor_user_id",
                schema: "review",
                table: "review_status_history",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_review_attachment_uploaded_by",
                schema: "review",
                table: "review_attachment",
                column: "uploaded_by");

            migrationBuilder.CreateIndex(
                name: "IX_input_snapshot_created_by",
                schema: "workspace",
                table: "input_snapshot",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_info_request_requested_by",
                schema: "review",
                table: "info_request",
                column: "requested_by");

            migrationBuilder.CreateIndex(
                name: "IX_document_version_created_by",
                schema: "workspace",
                table: "document_version",
                column: "created_by");
        }
    }
}
