using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PlatformFeeReason : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "reason",
                schema: "expert",
                table: "platform_fee",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.UpdateData(
                schema: "expert",
                table: "platform_fee",
                keyColumn: "id",
                keyValue: new Guid("01929e3a-0000-7000-8000-000000000020"),
                column: "reason",
                value: null);

            migrationBuilder.UpdateData(
                schema: "expert",
                table: "platform_fee",
                keyColumn: "id",
                keyValue: new Guid("01929e3a-0000-7000-8000-000000000040"),
                column: "reason",
                value: null);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "reason",
                schema: "expert",
                table: "platform_fee");
        }
    }
}
