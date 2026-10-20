using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Billing.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DropCrossServiceForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // New databases never create these (the initial migration no longer does), so drop only if present
            foreach (var (table, constraint) in new[]
            {
                ("billing.bank_account", "fk_bank_account_58"),
                ("billing.bank_account", "fk_bank_account_59"),
                ("billing.credit_ledger", "fk_credit_ledger_69"),
                ("billing.credit_wallet", "fk_credit_wallet_68"),
                ("billing.dispute", "fk_dispute_63"),
                ("billing.dispute", "fk_dispute_64"),
                ("billing.dispute", "fk_dispute_65"),
                ("billing.escrow", "fk_escrow_56"),
                ("billing.payment_transaction", "fk_payment_transaction_66"),
                ("billing.payment_transaction", "fk_payment_transaction_67"),
                ("billing.payout_transaction", "fk_payout_transaction_62"),
                ("billing.settlement", "fk_settlement_57"),
            })
                migrationBuilder.Sql($"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint};");

            migrationBuilder.DropIndex(
                name: "IX_dispute_raised_by",
                schema: "billing",
                table: "dispute");

            migrationBuilder.DropIndex(
                name: "IX_bank_account_verified_by",
                schema: "billing",
                table: "bank_account");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_dispute_raised_by",
                schema: "billing",
                table: "dispute",
                column: "raised_by");

            migrationBuilder.CreateIndex(
                name: "IX_bank_account_verified_by",
                schema: "billing",
                table: "bank_account",
                column: "verified_by");
        }
    }
}
