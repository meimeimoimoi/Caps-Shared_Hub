using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReviewCaseExtension : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<short>(
                name: "extension_days",
                schema: "review",
                table: "review_case",
                type: "smallint",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "extension_decided_at",
                schema: "review",
                table: "review_case",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "extension_decision",
                schema: "review",
                table: "review_case",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "extension_reason",
                schema: "review",
                table: "review_case",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "extension_requested_at",
                schema: "review",
                table: "review_case",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "extension_days",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "extension_decided_at",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "extension_decision",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "extension_reason",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "extension_requested_at",
                schema: "review",
                table: "review_case");
        }
    }
}
