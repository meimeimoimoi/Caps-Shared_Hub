using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class TemplateVersionTaxYear : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Every template published so far follows the Circular 89/2026 forms, so existing versions get 2026
            migrationBuilder.AddColumn<int>(
                name: "tax_year",
                schema: "workspace",
                table: "template_version",
                type: "integer",
                nullable: false,
                defaultValue: 2026);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "tax_year",
                schema: "workspace",
                table: "template_version");
        }
    }
}
