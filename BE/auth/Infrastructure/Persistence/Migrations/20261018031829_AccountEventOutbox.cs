using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Auth.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AccountEventOutbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "account_event_outbox",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    payload = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    sent_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_account_event_outbox", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_account_event_outbox_pending",
                schema: "identity",
                table: "account_event_outbox",
                columns: new[] { "sent_at", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "account_event_outbox",
                schema: "identity");
        }
    }
}
