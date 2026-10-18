using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpertServiceDeliverySla : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "delivery_sla_hours",
                schema: "expert",
                table: "service_catalog",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                schema: "expert",
                table: "service_catalog",
                keyColumn: "code",
                keyValue: "HUMAN_VERIFICATION",
                column: "delivery_sla_hours",
                value: 72);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "delivery_sla_hours",
                schema: "expert",
                table: "service_catalog");
        }
    }
}
