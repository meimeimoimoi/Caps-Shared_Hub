using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AiPrices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // A switch row saved before this migration keeps the prices it was charging (the AiBilling defaults)
            migrationBuilder.AddColumn<long>(
                name: "chat_credit_cost",
                schema: "workspace",
                table: "ai_billing_switch",
                type: "bigint",
                nullable: false,
                defaultValue: 1_000L);

            migrationBuilder.AddColumn<long>(
                name: "draft_credit_cost",
                schema: "workspace",
                table: "ai_billing_switch",
                type: "bigint",
                nullable: false,
                defaultValue: 2_000L);

            migrationBuilder.AddColumn<int>(
                name: "initial_free_quota",
                schema: "workspace",
                table: "ai_billing_switch",
                type: "integer",
                nullable: false,
                defaultValue: 10);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "chat_credit_cost",
                schema: "workspace",
                table: "ai_billing_switch");

            migrationBuilder.DropColumn(
                name: "draft_credit_cost",
                schema: "workspace",
                table: "ai_billing_switch");

            migrationBuilder.DropColumn(
                name: "initial_free_quota",
                schema: "workspace",
                table: "ai_billing_switch");
        }
    }
}
