using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpertPolicySettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "applied_min_years_experience",
                schema: "expert",
                table: "eligibility_check",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "policy_setting",
                schema: "expert",
                columns: table => new
                {
                    key = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    value = table.Column<int>(type: "integer", nullable: false),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_policy_setting", x => x.key);
                });

            migrationBuilder.CreateTable(
                name: "policy_setting_change",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    old_value = table.Column<int>(type: "integer", nullable: false),
                    new_value = table.Column<int>(type: "integer", nullable: false),
                    reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    changed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    changed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_policy_setting_change", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_policy_setting_change_changed_at",
                schema: "expert",
                table: "policy_setting_change",
                column: "changed_at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "policy_setting",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "policy_setting_change",
                schema: "expert");

            migrationBuilder.DropColumn(
                name: "applied_min_years_experience",
                schema: "expert",
                table: "eligibility_check");
        }
    }
}
