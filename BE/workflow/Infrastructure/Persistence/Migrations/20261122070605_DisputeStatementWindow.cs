using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DisputeStatementWindow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "statement_due_by",
                schema: "review",
                table: "review_dispute",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "statement_reminder_sent_at",
                schema: "review",
                table: "review_dispute",
                type: "timestamp with time zone",
                nullable: true);

            // Disputes opened before the window existed get one day from their opening (weekends not skipped)
            migrationBuilder.Sql(
                "UPDATE review.review_dispute SET statement_due_by = opened_at + interval '1 day'"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "statement_due_by",
                schema: "review",
                table: "review_dispute");

            migrationBuilder.DropColumn(
                name: "statement_reminder_sent_at",
                schema: "review",
                table: "review_dispute");
        }
    }
}
