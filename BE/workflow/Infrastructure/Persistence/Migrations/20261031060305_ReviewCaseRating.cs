using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReviewCaseRating : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "rated_at",
                schema: "review",
                table: "review_case",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<short>(
                name: "rating",
                schema: "review",
                table: "review_case",
                type: "smallint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "rating_comment",
                schema: "review",
                table: "review_case",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "rated_at",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "rating",
                schema: "review",
                table: "review_case");

            migrationBuilder.DropColumn(
                name: "rating_comment",
                schema: "review",
                table: "review_case");
        }
    }
}
