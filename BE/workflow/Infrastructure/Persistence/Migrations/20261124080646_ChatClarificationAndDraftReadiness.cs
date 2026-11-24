using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ChatClarificationAndDraftReadiness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "draft_issues",
                schema: "workspace",
                table: "document_version",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "clarification_deadline",
                schema: "workspace",
                table: "chat_message",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "clarification_resolved_at",
                schema: "workspace",
                table: "chat_message",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "clarification_round",
                schema: "workspace",
                table: "chat_message",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "closure_reason",
                schema: "workspace",
                table: "chat_message",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "missing_information_summary",
                schema: "workspace",
                table: "chat_message",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "root_question_id",
                schema: "workspace",
                table: "chat_message",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_chat_message_clarification_due",
                schema: "workspace",
                table: "chat_message",
                column: "clarification_deadline",
                filter: "answer_status = 'NEED_CLARIFICATION' AND clarification_resolved_at IS NULL AND clarification_deadline IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_chat_message_clarification_due",
                schema: "workspace",
                table: "chat_message");

            migrationBuilder.DropColumn(
                name: "draft_issues",
                schema: "workspace",
                table: "document_version");

            migrationBuilder.DropColumn(
                name: "clarification_deadline",
                schema: "workspace",
                table: "chat_message");

            migrationBuilder.DropColumn(
                name: "clarification_resolved_at",
                schema: "workspace",
                table: "chat_message");

            migrationBuilder.DropColumn(
                name: "clarification_round",
                schema: "workspace",
                table: "chat_message");

            migrationBuilder.DropColumn(
                name: "closure_reason",
                schema: "workspace",
                table: "chat_message");

            migrationBuilder.DropColumn(
                name: "missing_information_summary",
                schema: "workspace",
                table: "chat_message");

            migrationBuilder.DropColumn(
                name: "root_question_id",
                schema: "workspace",
                table: "chat_message");
        }
    }
}
