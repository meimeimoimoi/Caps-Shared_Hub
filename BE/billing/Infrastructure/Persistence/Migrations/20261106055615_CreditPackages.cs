using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Billing.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CreditPackages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "credits",
                schema: "billing",
                table: "payment_transaction",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            // Earlier top-ups bought one credit per VND; pending ones must still credit their amount when paid
            migrationBuilder.Sql("UPDATE billing.payment_transaction SET credits = amount;");

            migrationBuilder.CreateTable(
                name: "credit_package",
                schema: "billing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    credits = table.Column<long>(type: "bigint", nullable: false),
                    price = table.Column<long>(type: "bigint", nullable: true),
                    on_sale = table.Column<bool>(type: "boolean", nullable: false),
                    recommended = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_credit_package", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "credit_package",
                schema: "billing");

            migrationBuilder.DropColumn(
                name: "credits",
                schema: "billing",
                table: "payment_transaction");
        }
    }
}
