using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReviewCaseLateRule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_case_offer",
                schema: "review",
                table: "review_case");

            migrationBuilder.AddColumn<int>(
                name: "info_request_count",
                schema: "review",
                table: "review_case",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "late_cancel_hours",
                schema: "review",
                table: "review_case",
                type: "integer",
                nullable: false,
                defaultValue: 72);

            migrationBuilder.AddColumn<int>(
                name: "late_penalty_hours",
                schema: "review",
                table: "review_case",
                type: "integer",
                nullable: false,
                defaultValue: 24);

            migrationBuilder.AddColumn<short>(
                name: "late_penalty_pct",
                schema: "review",
                table: "review_case",
                type: "smallint",
                nullable: false,
                defaultValue: (short)30);

            migrationBuilder.AddColumn<short>(
                name: "late_refund_pct",
                schema: "review",
                table: "review_case",
                type: "smallint",
                nullable: false,
                defaultValue: (short)0);

            migrationBuilder.AddCheckConstraint(
                name: "ck_case_offer",
                schema: "review",
                table: "review_case",
                sql: "fee > 0 AND platform_fee_pct BETWEEN 0 AND 99 AND turnaround_hours BETWEEN 1 AND 720 AND late_penalty_hours >= 0 AND late_penalty_pct >= 0 AND platform_fee_pct + late_penalty_pct <= 100 AND late_cancel_hours BETWEEN late_penalty_hours AND 720");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_case_offer",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "info_request_count",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "late_cancel_hours",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "late_penalty_hours",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "late_penalty_pct",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "late_refund_pct",
                schema: "review",
                table: "review_case");

            migrationBuilder.AddCheckConstraint(
                name: "ck_case_offer",
                schema: "review",
                table: "review_case",
                sql: "fee > 0 AND platform_fee_pct BETWEEN 0 AND 99 AND turnaround_hours BETWEEN 1 AND 720");
        }
    }
}
