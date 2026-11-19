using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class LateRefundUpTo100 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_platform_fee_late_rule",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.AddCheckConstraint(
                name: "ck_platform_fee_late_rule",
                schema: "expert",
                table: "platform_fee",
                sql: "late_penalty_hours >= 0 AND late_penalty_percent BETWEEN 0 AND 100 AND late_cancel_hours BETWEEN late_penalty_hours AND 720");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_platform_fee_late_rule",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.AddCheckConstraint(
                name: "ck_platform_fee_late_rule",
                schema: "expert",
                table: "platform_fee",
                sql: "late_penalty_hours >= 0 AND late_penalty_percent >= 0 AND percent + late_penalty_percent <= 100 AND late_cancel_hours BETWEEN late_penalty_hours AND 720");
        }
    }
}
