using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NoResponseDays : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_platform_fee_no_response_rule",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.RenameColumn(
                name: "no_response_hours",
                schema: "expert",
                table: "platform_fee",
                newName: "no_response_days");

            // Stored values were hours: 72 -> 3 working days, 24 -> 1, never below 1
            migrationBuilder.Sql(
                "UPDATE expert.platform_fee SET no_response_days = GREATEST(1, CEIL(no_response_days / 24.0))"
            );

            migrationBuilder.UpdateData(
                schema: "expert",
                table: "platform_fee",
                keyColumn: "id",
                keyValue: new Guid("01929e3a-0000-7000-8000-000000000020"),
                column: "no_response_days",
                value: 3);

            migrationBuilder.UpdateData(
                schema: "expert",
                table: "platform_fee",
                keyColumn: "id",
                keyValue: new Guid("01929e3a-0000-7000-8000-000000000040"),
                column: "no_response_days",
                value: 3);

            migrationBuilder.AddCheckConstraint(
                name: "ck_platform_fee_no_response_rule",
                schema: "expert",
                table: "platform_fee",
                sql: "no_response_days BETWEEN 1 AND 30 AND no_response_refund_percent >= 0 AND no_response_expert_percent >= 0 AND no_response_refund_percent + no_response_expert_percent <= 100");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_platform_fee_no_response_rule",
                schema: "expert",
                table: "platform_fee");

            // Back to hours before the column is renamed: 3 working days -> 72 hours
            migrationBuilder.Sql(
                "UPDATE expert.platform_fee SET no_response_days = no_response_days * 24"
            );

            migrationBuilder.RenameColumn(
                name: "no_response_days",
                schema: "expert",
                table: "platform_fee",
                newName: "no_response_hours");

            migrationBuilder.UpdateData(
                schema: "expert",
                table: "platform_fee",
                keyColumn: "id",
                keyValue: new Guid("01929e3a-0000-7000-8000-000000000020"),
                column: "no_response_hours",
                value: 72);

            migrationBuilder.UpdateData(
                schema: "expert",
                table: "platform_fee",
                keyColumn: "id",
                keyValue: new Guid("01929e3a-0000-7000-8000-000000000040"),
                column: "no_response_hours",
                value: 72);

            migrationBuilder.AddCheckConstraint(
                name: "ck_platform_fee_no_response_rule",
                schema: "expert",
                table: "platform_fee",
                sql: "no_response_hours BETWEEN 1 AND 720 AND no_response_refund_percent >= 0 AND no_response_expert_percent >= 0 AND no_response_refund_percent + no_response_expert_percent <= 100");
        }
    }
}
