using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLateDeliveryRule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "late_cancel_hours",
                schema: "expert",
                table: "platform_fee",
                type: "integer",
                nullable: false,
                defaultValue: 72);

            migrationBuilder.AddColumn<int>(
                name: "late_penalty_hours",
                schema: "expert",
                table: "platform_fee",
                type: "integer",
                nullable: false,
                defaultValue: 24);

            migrationBuilder.AddColumn<int>(
                name: "late_penalty_percent",
                schema: "expert",
                table: "platform_fee",
                type: "integer",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.UpdateData(
                schema: "expert",
                table: "platform_fee",
                keyColumn: "id",
                keyValue: new Guid("01929e3a-0000-7000-8000-000000000020"),
                columns: new[] { "late_cancel_hours", "late_penalty_hours", "late_penalty_percent" },
                values: new object[] { 72, 24, 30 });

            migrationBuilder.AddCheckConstraint(
                name: "ck_platform_fee_late_rule",
                schema: "expert",
                table: "platform_fee",
                sql: "late_penalty_hours >= 0 AND late_penalty_percent >= 0 AND percent + late_penalty_percent <= 100 AND late_cancel_hours BETWEEN late_penalty_hours AND 720");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_platform_fee_late_rule",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.DropColumn(
                name: "late_cancel_hours",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.DropColumn(
                name: "late_penalty_hours",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.DropColumn(
                name: "late_penalty_percent",
                schema: "expert",
                table: "platform_fee");
        }
    }
}
