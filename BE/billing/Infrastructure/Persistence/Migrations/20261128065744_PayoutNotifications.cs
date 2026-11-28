using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Billing.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PayoutNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "recipient_email",
                schema: "billing",
                table: "payout_transaction",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "notification_outbox",
                schema: "billing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    message_type = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    payload = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    sent_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notification_outbox", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_notification_outbox_pending",
                schema: "billing",
                table: "notification_outbox",
                columns: new[] { "sent_at", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "notification_outbox",
                schema: "billing");

            migrationBuilder.DropColumn(
                name: "recipient_email",
                schema: "billing",
                table: "payout_transaction");
        }
    }
}
