using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpertCapacity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "active_cases",
                schema: "expert",
                table: "expert_profile",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "capacity",
                schema: "expert",
                table: "expert_profile",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddCheckConstraint(
                name: "ck_expert_capacity",
                schema: "expert",
                table: "expert_profile",
                sql: "capacity >= 0 AND active_cases >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_expert_capacity",
                schema: "expert",
                table: "expert_profile");

            migrationBuilder.DropColumn(
                name: "active_cases",
                schema: "expert",
                table: "expert_profile");

            migrationBuilder.DropColumn(
                name: "capacity",
                schema: "expert",
                table: "expert_profile");
        }
    }
}
