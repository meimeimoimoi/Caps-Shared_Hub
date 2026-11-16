using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReviewCaseNoResponseRule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_case_offer",
                schema: "review",
                table: "review_case");

            migrationBuilder.AddColumn<short>(
                name: "no_response_expert_pct",
                schema: "review",
                table: "review_case",
                type: "smallint",
                nullable: false,
                defaultValue: (short)30);

            migrationBuilder.AddColumn<int>(
                name: "no_response_hours",
                schema: "review",
                table: "review_case",
                type: "integer",
                nullable: false,
                defaultValue: 72);

            migrationBuilder.AddColumn<short>(
                name: "no_response_refund_pct",
                schema: "review",
                table: "review_case",
                type: "smallint",
                nullable: false,
                defaultValue: (short)50);

            migrationBuilder.AddCheckConstraint(
                name: "ck_case_offer",
                schema: "review",
                table: "review_case",
                sql: "fee > 0 AND platform_fee_pct BETWEEN 0 AND 99 AND turnaround_hours BETWEEN 1 AND 720 AND late_penalty_hours >= 0 AND late_penalty_pct >= 0 AND platform_fee_pct + late_penalty_pct <= 100 AND late_cancel_hours BETWEEN late_penalty_hours AND 720 AND no_response_hours BETWEEN 1 AND 720 AND no_response_refund_pct >= 0 AND no_response_expert_pct >= 0 AND no_response_refund_pct + no_response_expert_pct <= 100");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_case_offer",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "no_response_expert_pct",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "no_response_hours",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "no_response_refund_pct",
                schema: "review",
                table: "review_case");

            migrationBuilder.AddCheckConstraint(
                name: "ck_case_offer",
                schema: "review",
                table: "review_case",
                sql: "fee > 0 AND platform_fee_pct BETWEEN 0 AND 99 AND turnaround_hours BETWEEN 1 AND 720 AND late_penalty_hours >= 0 AND late_penalty_pct >= 0 AND platform_fee_pct + late_penalty_pct <= 100 AND late_cancel_hours BETWEEN late_penalty_hours AND 720");
        }
    }
}
