using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Billing.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EscrowHold : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_bank_account_number",
                schema: "billing",
                table: "bank_account");

            migrationBuilder.AddColumn<Guid>(
                name: "user_id",
                schema: "billing",
                table: "escrow",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_escrow_user_id",
                schema: "billing",
                table: "escrow",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ux_bank_account_number",
                schema: "billing",
                table: "bank_account",
                columns: new[] { "user_id", "bank_bin", "account_number_hash" },
                unique: true,
                filter: "deleted_at IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_escrow_user_id",
                schema: "billing",
                table: "escrow");

            migrationBuilder.DropIndex(
                name: "ux_bank_account_number",
                schema: "billing",
                table: "bank_account");

            migrationBuilder.DropColumn(
                name: "user_id",
                schema: "billing",
                table: "escrow");

            migrationBuilder.CreateIndex(
                name: "ux_bank_account_number",
                schema: "billing",
                table: "bank_account",
                columns: new[] { "user_id", "account_number_hash" },
                unique: true,
                filter: "deleted_at IS NULL");
        }
    }
}
