using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpertVerificationStats : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_expert_capacity",
                schema: "expert",
                table: "expert_profile");

            migrationBuilder.AddColumn<int>(
                name: "delivered_count",
                schema: "expert",
                table: "expert_profile",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "verified_count",
                schema: "expert",
                table: "expert_profile",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddCheckConstraint(
                name: "ck_expert_capacity",
                schema: "expert",
                table: "expert_profile",
                sql: "capacity >= 0 AND active_cases >= 0 AND verified_count BETWEEN 0 AND delivered_count");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_expert_capacity",
                schema: "expert",
                table: "expert_profile");

            migrationBuilder.DropColumn(
                name: "delivered_count",
                schema: "expert",
                table: "expert_profile");

            migrationBuilder.DropColumn(
                name: "verified_count",
                schema: "expert",
                table: "expert_profile");

            migrationBuilder.AddCheckConstraint(
                name: "ck_expert_capacity",
                schema: "expert",
                table: "expert_profile",
                sql: "capacity >= 0 AND active_cases >= 0");
        }
    }
}
