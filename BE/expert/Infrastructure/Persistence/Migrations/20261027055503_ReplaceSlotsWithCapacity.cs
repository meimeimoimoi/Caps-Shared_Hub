using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceSlotsWithCapacity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "availability_slot",
                schema: "expert");

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
                sql: "capacity BETWEEN 0 AND 20 AND active_cases >= 0");
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

            migrationBuilder.CreateTable(
                name: "availability_slot",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    end_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    start_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "OPEN")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_availability_slot", x => x.id);
                    table.ForeignKey(
                        name: "fk_availability_slot_profile",
                        column: x => x.expert_profile_id,
                        principalSchema: "expert",
                        principalTable: "expert_profile",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_availability_slot_open",
                schema: "expert",
                table: "availability_slot",
                columns: new[] { "expert_profile_id", "status", "start_at" });
        }
    }
}
