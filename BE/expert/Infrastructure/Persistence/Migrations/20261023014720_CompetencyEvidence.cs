using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CompetencyEvidence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "competency_description",
                schema: "expert",
                columns: table => new
                {
                    qualification_id = table.Column<Guid>(type: "uuid", nullable: false),
                    competency = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    text = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_competency_description", x => new { x.qualification_id, x.competency });
                    table.ForeignKey(
                        name: "fk_competency_description_qualification",
                        column: x => x.qualification_id,
                        principalSchema: "expert",
                        principalTable: "expert_service_qualification",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "competency_evidence_link",
                schema: "expert",
                columns: table => new
                {
                    evidence_id = table.Column<Guid>(type: "uuid", nullable: false),
                    competency = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    qualification_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_competency_evidence_link", x => new { x.evidence_id, x.competency });
                    table.ForeignKey(
                        name: "fk_competency_evidence_link_evidence",
                        column: x => x.evidence_id,
                        principalSchema: "expert",
                        principalTable: "expert_evidence",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_competency_evidence_link_qualification",
                        column: x => x.qualification_id,
                        principalSchema: "expert",
                        principalTable: "expert_service_qualification",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_competency_evidence_link_qualification",
                schema: "expert",
                table: "competency_evidence_link",
                column: "qualification_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "competency_description",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "competency_evidence_link",
                schema: "expert");
        }
    }
}
