using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ViolationExcuseRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "excuse_declined_at",
                schema: "expert",
                table: "expert_violation",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "excuse_request",
                schema: "expert",
                table: "expert_violation",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "excuse_requested_at",
                schema: "expert",
                table: "expert_violation",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "excuse_declined_at",
                schema: "expert",
                table: "expert_violation");

            migrationBuilder.DropColumn(
                name: "excuse_request",
                schema: "expert",
                table: "expert_violation");

            migrationBuilder.DropColumn(
                name: "excuse_requested_at",
                schema: "expert",
                table: "expert_violation");
        }
    }
}
