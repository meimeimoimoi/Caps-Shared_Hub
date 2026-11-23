using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ViolationExcuseFiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "excuse_files",
                schema: "expert",
                table: "expert_violation",
                type: "jsonb",
                nullable: true);

            // Rows from before this column read as an empty file list, not a null one
            migrationBuilder.Sql(
                "UPDATE expert.expert_violation SET excuse_files = '[]' WHERE excuse_files IS NULL"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "excuse_files",
                schema: "expert",
                table: "expert_violation");
        }
    }
}
