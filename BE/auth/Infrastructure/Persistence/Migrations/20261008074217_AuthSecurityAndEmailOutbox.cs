using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace auth.Migrations
{
    /// <inheritdoc />
    public partial class AuthSecurityAndEmailOutbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "failed_login_attempts",
                schema: "identity",
                table: "users",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "lockout_end",
                schema: "identity",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "token_version",
                schema: "identity",
                table: "users",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "auth_email_outbox",
                schema: "identity",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProtectedPayload = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Attempts = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auth_email_outbox", x => x.Id);
                });

            migrationBuilder.InsertData(
                schema: "identity",
                table: "roles",
                columns: new[] { "id", "code", "name" },
                values: new object[,]
                {
                    { new Guid("10000000-0000-0000-0000-000000000001"), "USER", "USER" },
                    { new Guid("10000000-0000-0000-0000-000000000002"), "EXPERT", "EXPERT" },
                    { new Guid("10000000-0000-0000-0000-000000000003"), "AUTHOR_REVIEWER", "AUTHOR_REVIEWER" },
                    { new Guid("10000000-0000-0000-0000-000000000004"), "KNOWLEDGE_ADMIN", "KNOWLEDGE_ADMIN" },
                    { new Guid("10000000-0000-0000-0000-000000000005"), "SYSTEM_ADMIN", "SYSTEM_ADMIN" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                schema: "identity",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_auth_email_outbox_SentAt",
                schema: "identity",
                table: "auth_email_outbox",
                column: "SentAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auth_email_outbox",
                schema: "identity");

            migrationBuilder.DropIndex(
                name: "IX_users_email",
                schema: "identity",
                table: "users");

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "roles",
                keyColumn: "id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "roles",
                keyColumn: "id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "roles",
                keyColumn: "id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "roles",
                keyColumn: "id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000004"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "roles",
                keyColumn: "id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000005"));

            migrationBuilder.DropColumn(
                name: "failed_login_attempts",
                schema: "identity",
                table: "users");

            migrationBuilder.DropColumn(
                name: "lockout_end",
                schema: "identity",
                table: "users");

            migrationBuilder.DropColumn(
                name: "token_version",
                schema: "identity",
                table: "users");
        }
    }
}
