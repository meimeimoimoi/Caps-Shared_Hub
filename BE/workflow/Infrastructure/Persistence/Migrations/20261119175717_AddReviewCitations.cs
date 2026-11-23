using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewCitations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string[]>(
                name: "citations",
                schema: "review",
                table: "review_case",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "citations",
                schema: "review",
                table: "review_case");
        }
    }
}
