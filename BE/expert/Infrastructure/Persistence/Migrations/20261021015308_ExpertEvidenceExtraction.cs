using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpertEvidenceExtraction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "extracted_at",
                schema: "expert",
                table: "expert_evidence",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "extraction_status",
                schema: "expert",
                table: "expert_evidence",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "source_url",
                schema: "expert",
                table: "expert_evidence",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "extracted_at",
                schema: "expert",
                table: "expert_evidence");

            migrationBuilder.DropColumn(
                name: "extraction_status",
                schema: "expert",
                table: "expert_evidence");

            migrationBuilder.DropColumn(
                name: "source_url",
                schema: "expert",
                table: "expert_evidence");
        }
    }
}
