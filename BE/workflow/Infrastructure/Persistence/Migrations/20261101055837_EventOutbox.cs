using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EventOutbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "event_outbox",
                schema: "review",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    message_type = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    payload = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    sent_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_outbox", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_event_outbox_unsent",
                schema: "review",
                table: "event_outbox",
                column: "created_at",
                filter: "sent_at IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "event_outbox",
                schema: "review");
        }
    }
}
