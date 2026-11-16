using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PlatformFeeNoDeliveryRefund : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "no_delivery_refund_percent",
                schema: "expert",
                table: "platform_fee",
                type: "integer",
                nullable: false,
                // Rates set before this rule refunded a case nobody delivered in full
                defaultValue: 100);

            migrationBuilder.UpdateData(
                schema: "expert",
                table: "platform_fee",
                keyColumn: "id",
                keyValue: new Guid("01929e3a-0000-7000-8000-000000000020"),
                column: "no_delivery_refund_percent",
                value: 100);

            migrationBuilder.UpdateData(
                schema: "expert",
                table: "platform_fee",
                keyColumn: "id",
                keyValue: new Guid("01929e3a-0000-7000-8000-000000000040"),
                column: "no_delivery_refund_percent",
                value: 50);

            migrationBuilder.AddCheckConstraint(
                name: "ck_platform_fee_no_delivery_rule",
                schema: "expert",
                table: "platform_fee",
                sql: "no_delivery_refund_percent BETWEEN 0 AND 100");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_platform_fee_no_delivery_rule",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.DropColumn(
                name: "no_delivery_refund_percent",
                schema: "expert",
                table: "platform_fee");
        }
    }
}
