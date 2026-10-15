using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Auth.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AuthGoogleLogin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "password_hash",
                schema: "identity",
                table: "users",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "google_subject",
                schema: "identity",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_google_subject",
                schema: "identity",
                table: "users",
                column: "google_subject",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_users_google_subject",
                schema: "identity",
                table: "users");

            migrationBuilder.DropColumn(
                name: "google_subject",
                schema: "identity",
                table: "users");

            migrationBuilder.AlterColumn<string>(
                name: "password_hash",
                schema: "identity",
                table: "users",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
