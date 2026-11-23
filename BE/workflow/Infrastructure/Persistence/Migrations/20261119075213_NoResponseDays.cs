using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NoResponseDays : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_case_offer",
                schema: "review",
                table: "review_case");

            migrationBuilder.RenameColumn(
                name: "no_response_hours",
                schema: "review",
                table: "review_case",
                newName: "no_response_days");

            // Stored values were hours: 72 -> 3 working days, 24 -> 1, never below 1
            migrationBuilder.Sql(
                "UPDATE review.review_case SET no_response_days = GREATEST(1, CEIL(no_response_days / 24.0))"
            );

            migrationBuilder.AddCheckConstraint(
                name: "ck_case_offer",
                schema: "review",
                table: "review_case",
                sql: "fee > 0 AND platform_fee_pct BETWEEN 0 AND 99 AND turnaround_hours BETWEEN 1 AND 720 AND late_penalty_hours >= 0 AND late_penalty_pct BETWEEN 0 AND 100 AND late_cancel_hours BETWEEN late_penalty_hours AND 720 AND no_response_days BETWEEN 1 AND 30 AND no_response_refund_pct >= 0 AND no_response_expert_pct >= 0 AND no_response_refund_pct + no_response_expert_pct <= 100 AND no_delivery_refund_pct BETWEEN 0 AND 100");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_case_offer",
                schema: "review",
                table: "review_case");

            // Back to hours before the column is renamed: 3 working days -> 72 hours
            migrationBuilder.Sql(
                "UPDATE review.review_case SET no_response_days = no_response_days * 24"
            );

            migrationBuilder.RenameColumn(
                name: "no_response_days",
                schema: "review",
                table: "review_case",
                newName: "no_response_hours");

            migrationBuilder.AddCheckConstraint(
                name: "ck_case_offer",
                schema: "review",
                table: "review_case",
                sql: "fee > 0 AND platform_fee_pct BETWEEN 0 AND 99 AND turnaround_hours BETWEEN 1 AND 720 AND late_penalty_hours >= 0 AND late_penalty_pct BETWEEN 0 AND 100 AND late_cancel_hours BETWEEN late_penalty_hours AND 720 AND no_response_hours BETWEEN 1 AND 720 AND no_response_refund_pct >= 0 AND no_response_expert_pct >= 0 AND no_response_refund_pct + no_response_expert_pct <= 100 AND no_delivery_refund_pct BETWEEN 0 AND 100");
        }
    }
}
