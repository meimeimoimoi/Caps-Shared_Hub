using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Ingestion.Migrations
{
    /// <inheritdoc />
    public partial class SyncIngestionModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "system_config",
                schema: "knowledge",
                columns: table => new
                {
                    key = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    value = table.Column<string>(type: "jsonb", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_system_config", x => x.key);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "system_config",
                schema: "knowledge");
        }
    }
}
