using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Auth.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AuditOutboxMessageType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "message_type",
                schema: "identity",
                table: "account_event_outbox",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "AccountStatusChangedEvent");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "message_type",
                schema: "identity",
                table: "account_event_outbox");
        }
    }
}
