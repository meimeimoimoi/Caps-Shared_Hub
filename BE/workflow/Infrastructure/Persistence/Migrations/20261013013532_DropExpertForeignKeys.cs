using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DropExpertForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The auth migration that dropped the old identity tables may have removed these already
            foreach (var constraint in new[] { "fk_review_case_44", "fk_review_case_45", "fk_review_case_46" })
                migrationBuilder.Sql(
                    $"ALTER TABLE review.review_case DROP CONSTRAINT IF EXISTS {constraint};"
                );

            migrationBuilder.DropIndex(
                name: "IX_review_case_service_offering_id",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropIndex(
                name: "IX_review_case_slot_id",
                schema: "review",
                table: "review_case");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_review_case_service_offering_id",
                schema: "review",
                table: "review_case",
                column: "service_offering_id");

            migrationBuilder.CreateIndex(
                name: "IX_review_case_slot_id",
                schema: "review",
                table: "review_case",
                column: "slot_id");
        }
    }
}
