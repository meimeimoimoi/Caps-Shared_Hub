using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpertPricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "turnaround_hours",
                schema: "expert",
                table: "service_offering",
                type: "integer",
                nullable: false,
                defaultValue: 48);

            migrationBuilder.CreateTable(
                name: "platform_fee",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    percent = table.Column<int>(type: "integer", nullable: false),
                    effective_from = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    set_by = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_platform_fee", x => x.id);
                    table.CheckConstraint("ck_platform_fee_percent", "percent BETWEEN 0 AND 99");
                });

            migrationBuilder.CreateIndex(
                name: "ux_offer_one_per_type",
                schema: "expert",
                table: "service_offering",
                columns: new[] { "expert_profile_id", "service_type" },
                unique: true,
                filter: "is_active");

            migrationBuilder.AddCheckConstraint(
                name: "ck_offering_values",
                schema: "expert",
                table: "service_offering",
                sql: "fee > 0 AND turnaround_hours BETWEEN 1 AND 720");

            migrationBuilder.CreateIndex(
                name: "ix_platform_fee_current",
                schema: "expert",
                table: "platform_fee",
                columns: new[] { "service_type", "effective_from" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "platform_fee",
                schema: "expert");

            migrationBuilder.DropIndex(
                name: "ux_offer_one_per_type",
                schema: "expert",
                table: "service_offering");

            migrationBuilder.DropCheckConstraint(
                name: "ck_offering_values",
                schema: "expert",
                table: "service_offering");

            migrationBuilder.DropColumn(
                name: "turnaround_hours",
                schema: "expert",
                table: "service_offering");
        }
    }
}
