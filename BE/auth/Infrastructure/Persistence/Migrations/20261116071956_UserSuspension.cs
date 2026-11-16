using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Auth.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UserSuspension : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "suspended_at",
                schema: "identity",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "suspended_by",
                schema: "identity",
                table: "users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "suspended_reason",
                schema: "identity",
                table: "users",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "suspended_at",
                schema: "identity",
                table: "users");

            migrationBuilder.DropColumn(
                name: "suspended_by",
                schema: "identity",
                table: "users");

            migrationBuilder.DropColumn(
                name: "suspended_reason",
                schema: "identity",
                table: "users");
        }
    }
}
