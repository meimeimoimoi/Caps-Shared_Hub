using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace auth.Migrations
{
    /// <inheritdoc />
    public partial class AuthPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE identity.users SET email = lower(btrim(email)); CREATE UNIQUE INDEX ix_users_email_normalized ON identity.users (lower(btrim(email))); INSERT INTO identity.user_roles (user_id, role_id) SELECT u.id, r.id FROM identity.users u CROSS JOIN identity.roles r WHERE r.code = 'USER' AND NOT EXISTS (SELECT 1 FROM identity.user_roles ur WHERE ur.user_id = u.id);");
            migrationBuilder.InsertData(
                schema: "identity",
                table: "permission",
                columns: new[] { "id", "code", "description" },
                values: new object[,]
                {
                    { new Guid("20000000-0000-0000-0000-000000000001"), "profile:read", "profile:read" },
                    { new Guid("20000000-0000-0000-0000-000000000002"), "profile:write", "profile:write" },
                    { new Guid("20000000-0000-0000-0000-000000000003"), "business:read", "business:read" },
                    { new Guid("20000000-0000-0000-0000-000000000004"), "business:write", "business:write" }
                });

            migrationBuilder.InsertData(
                schema: "identity",
                table: "role_permission",
                columns: new[] { "permission_id", "role_id" },
                values: new object[,]
                {
                    { new Guid("20000000-0000-0000-0000-000000000001"), new Guid("10000000-0000-0000-0000-000000000001") },
                    { new Guid("20000000-0000-0000-0000-000000000002"), new Guid("10000000-0000-0000-0000-000000000001") },
                    { new Guid("20000000-0000-0000-0000-000000000003"), new Guid("10000000-0000-0000-0000-000000000001") },
                    { new Guid("20000000-0000-0000-0000-000000000004"), new Guid("10000000-0000-0000-0000-000000000001") }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX identity.ix_users_email_normalized;");
            migrationBuilder.DeleteData(
                schema: "identity",
                table: "role_permission",
                keyColumns: new[] { "permission_id", "role_id" },
                keyValues: new object[] { new Guid("20000000-0000-0000-0000-000000000001"), new Guid("10000000-0000-0000-0000-000000000001") });

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "role_permission",
                keyColumns: new[] { "permission_id", "role_id" },
                keyValues: new object[] { new Guid("20000000-0000-0000-0000-000000000002"), new Guid("10000000-0000-0000-0000-000000000001") });

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "role_permission",
                keyColumns: new[] { "permission_id", "role_id" },
                keyValues: new object[] { new Guid("20000000-0000-0000-0000-000000000003"), new Guid("10000000-0000-0000-0000-000000000001") });

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "role_permission",
                keyColumns: new[] { "permission_id", "role_id" },
                keyValues: new object[] { new Guid("20000000-0000-0000-0000-000000000004"), new Guid("10000000-0000-0000-0000-000000000001") });

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "permission",
                keyColumn: "id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "permission",
                keyColumn: "id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "permission",
                keyColumn: "id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "permission",
                keyColumn: "id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000004"));
        }
    }
}
