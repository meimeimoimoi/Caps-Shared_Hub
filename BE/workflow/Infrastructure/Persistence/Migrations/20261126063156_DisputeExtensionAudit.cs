using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DisputeExtensionAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "extended_at",
                schema: "review",
                table: "review_dispute",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "extended_by",
                schema: "review",
                table: "review_dispute",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "extension_reason",
                schema: "review",
                table: "review_dispute",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "extended_at",
                schema: "review",
                table: "review_dispute");

            migrationBuilder.DropColumn(
                name: "extended_by",
                schema: "review",
                table: "review_dispute");

            migrationBuilder.DropColumn(
                name: "extension_reason",
                schema: "review",
                table: "review_dispute");
        }
    }
}
