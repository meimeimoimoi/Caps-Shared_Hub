using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Billing.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BankAccountOwnerEmail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "owner_email",
                schema: "billing",
                table: "bank_account",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "owner_email",
                schema: "billing",
                table: "bank_account");
        }
    }
}
