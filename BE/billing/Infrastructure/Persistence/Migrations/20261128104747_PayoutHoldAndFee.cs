using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Billing.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PayoutHoldAndFee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "held_at",
                schema: "billing",
                table: "payout_transaction",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "held_by",
                schema: "billing",
                table: "payout_transaction",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "hold_reason",
                schema: "billing",
                table: "payout_transaction",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "hold_review_by",
                schema: "billing",
                table: "payout_transaction",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "released_at",
                schema: "billing",
                table: "payout_transaction",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "transfer_fee",
                schema: "billing",
                table: "payout_transaction",
                type: "bigint",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "held_at",
                schema: "billing",
                table: "payout_transaction");

            migrationBuilder.DropColumn(
                name: "held_by",
                schema: "billing",
                table: "payout_transaction");

            migrationBuilder.DropColumn(
                name: "hold_reason",
                schema: "billing",
                table: "payout_transaction");

            migrationBuilder.DropColumn(
                name: "hold_review_by",
                schema: "billing",
                table: "payout_transaction");

            migrationBuilder.DropColumn(
                name: "released_at",
                schema: "billing",
                table: "payout_transaction");

            migrationBuilder.DropColumn(
                name: "transfer_fee",
                schema: "billing",
                table: "payout_transaction");
        }
    }
}
