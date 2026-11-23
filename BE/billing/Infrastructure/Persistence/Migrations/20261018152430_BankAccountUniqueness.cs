using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Billing.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BankAccountUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ux_bank_account_default",
                schema: "billing",
                table: "bank_account",
                column: "user_id",
                unique: true,
                filter: "is_default AND deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ux_bank_account_number",
                schema: "billing",
                table: "bank_account",
                columns: new[] { "user_id", "account_number_hash" },
                unique: true,
                filter: "deleted_at IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_bank_account_default",
                schema: "billing",
                table: "bank_account");

            migrationBuilder.DropIndex(
                name: "ux_bank_account_number",
                schema: "billing",
                table: "bank_account");
        }
    }
}
