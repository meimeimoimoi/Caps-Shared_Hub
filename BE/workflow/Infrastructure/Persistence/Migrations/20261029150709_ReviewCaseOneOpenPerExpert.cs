using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReviewCaseOneOpenPerExpert : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ux_review_case_open",
                schema: "review",
                table: "review_case",
                columns: new[] { "source_version_id", "expert_profile_id" },
                unique: true,
                filter: "status IN ('AWAITING_PAYMENT', 'PENDING_EXPERT_RESPONSE', 'IN_REVIEW', 'AWAITING_USER_INFORMATION', 'AWAITING_ACCEPTANCE')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_review_case_open",
                schema: "review",
                table: "review_case");
        }
    }
}
