using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNoResponseRule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "no_response_expert_percent",
                schema: "expert",
                table: "platform_fee",
                type: "integer",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.AddColumn<int>(
                name: "no_response_hours",
                schema: "expert",
                table: "platform_fee",
                type: "integer",
                nullable: false,
                defaultValue: 72);

            migrationBuilder.AddColumn<int>(
                name: "no_response_refund_percent",
                schema: "expert",
                table: "platform_fee",
                type: "integer",
                nullable: false,
                defaultValue: 50);

            migrationBuilder.UpdateData(
                schema: "expert",
                table: "platform_fee",
                keyColumn: "id",
                keyValue: new Guid("01929e3a-0000-7000-8000-000000000020"),
                columns: new[] { "no_response_expert_percent", "no_response_hours", "no_response_refund_percent" },
                values: new object[] { 30, 72, 50 });

            migrationBuilder.AddCheckConstraint(
                name: "ck_platform_fee_no_response_rule",
                schema: "expert",
                table: "platform_fee",
                sql: "no_response_hours BETWEEN 1 AND 720 AND no_response_refund_percent >= 0 AND no_response_expert_percent >= 0 AND no_response_refund_percent + no_response_expert_percent <= 100");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_platform_fee_no_response_rule",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.DropColumn(
                name: "no_response_expert_percent",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.DropColumn(
                name: "no_response_hours",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.DropColumn(
                name: "no_response_refund_percent",
                schema: "expert",
                table: "platform_fee");
        }
    }
}
