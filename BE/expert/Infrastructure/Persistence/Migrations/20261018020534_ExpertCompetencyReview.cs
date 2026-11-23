using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpertCompetencyReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "expert_competency_assessment",
                schema: "expert");

            migrationBuilder.AddColumn<Guid>(
                name: "qualification_id",
                schema: "expert",
                table: "expert_evidence",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "expert_service_qualification",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    application_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    submitted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    decision_note = table.Column<string>(type: "text", nullable: true),
                    competency_reviewer_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    previous_qualification_id = table.Column<Guid>(type: "uuid", nullable: true),
                    earliest_reapply_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_service_qualification", x => x.id);
                    table.ForeignKey(
                        name: "fk_expert_service_qualification_application",
                        column: x => x.application_id,
                        principalSchema: "expert",
                        principalTable: "expert_application",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_expert_service_qualification_previous",
                        column: x => x.previous_qualification_id,
                        principalSchema: "expert",
                        principalTable: "expert_service_qualification",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_expert_service_qualification_profile",
                        column: x => x.expert_profile_id,
                        principalSchema: "expert",
                        principalTable: "expert_profile",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_expert_service_qualification_service",
                        column: x => x.service_code,
                        principalSchema: "expert",
                        principalTable: "service_catalog",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "qualification_event",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    qualification_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    to_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qualification_event", x => x.id);
                    table.ForeignKey(
                        name: "fk_qualification_event_qualification",
                        column: x => x.qualification_id,
                        principalSchema: "expert",
                        principalTable: "expert_service_qualification",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "competency_assessment",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    qualification_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    competency = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    result = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    note = table.Column<string>(type: "text", nullable: false),
                    reviewer_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_competency_assessment", x => x.id);
                    table.ForeignKey(
                        name: "fk_competency_assessment_event",
                        column: x => x.event_id,
                        principalSchema: "expert",
                        principalTable: "qualification_event",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_competency_assessment_qualification",
                        column: x => x.qualification_id,
                        principalSchema: "expert",
                        principalTable: "expert_service_qualification",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "competency_assessment_evidence",
                schema: "expert",
                columns: table => new
                {
                    assessment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    evidence_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_competency_assessment_evidence", x => new { x.assessment_id, x.evidence_id });
                    table.ForeignKey(
                        name: "fk_competency_assessment_evidence_assessment",
                        column: x => x.assessment_id,
                        principalSchema: "expert",
                        principalTable: "competency_assessment",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_competency_assessment_evidence_file",
                        column: x => x.evidence_id,
                        principalSchema: "expert",
                        principalTable: "expert_evidence",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_expert_evidence_qualification",
                schema: "expert",
                table: "expert_evidence",
                column: "qualification_id");

            migrationBuilder.CreateIndex(
                name: "ix_competency_assessment_qualification",
                schema: "expert",
                table: "competency_assessment",
                columns: new[] { "qualification_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ux_competency_assessment_decision",
                schema: "expert",
                table: "competency_assessment",
                columns: new[] { "event_id", "competency" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_competency_assessment_evidence_file",
                schema: "expert",
                table: "competency_assessment_evidence",
                column: "evidence_id");

            migrationBuilder.CreateIndex(
                name: "IX_expert_service_qualification_application_id",
                schema: "expert",
                table: "expert_service_qualification",
                column: "application_id");

            migrationBuilder.CreateIndex(
                name: "IX_expert_service_qualification_previous_qualification_id",
                schema: "expert",
                table: "expert_service_qualification",
                column: "previous_qualification_id");

            migrationBuilder.CreateIndex(
                name: "ix_expert_service_qualification_queue",
                schema: "expert",
                table: "expert_service_qualification",
                columns: new[] { "status", "submitted_at" });

            migrationBuilder.CreateIndex(
                name: "IX_expert_service_qualification_service_code",
                schema: "expert",
                table: "expert_service_qualification",
                column: "service_code");

            migrationBuilder.CreateIndex(
                name: "ux_expert_service_qualification_active",
                schema: "expert",
                table: "expert_service_qualification",
                columns: new[] { "expert_profile_id", "service_code" },
                unique: true,
                filter: "status <> 'FAIL'");

            migrationBuilder.CreateIndex(
                name: "ix_qualification_event",
                schema: "expert",
                table: "qualification_event",
                columns: new[] { "qualification_id", "created_at" });

            migrationBuilder.AddForeignKey(
                name: "fk_expert_evidence_qualification",
                schema: "expert",
                table: "expert_evidence",
                column: "qualification_id",
                principalSchema: "expert",
                principalTable: "expert_service_qualification",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_expert_evidence_qualification",
                schema: "expert",
                table: "expert_evidence");

            migrationBuilder.DropTable(
                name: "competency_assessment_evidence",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "competency_assessment",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "qualification_event",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "expert_service_qualification",
                schema: "expert");

            migrationBuilder.DropIndex(
                name: "ix_expert_evidence_qualification",
                schema: "expert",
                table: "expert_evidence");

            migrationBuilder.DropColumn(
                name: "qualification_id",
                schema: "expert",
                table: "expert_evidence");

            migrationBuilder.CreateTable(
                name: "expert_competency_assessment",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assessor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    c1_score = table.Column<short>(type: "smallint", nullable: false),
                    c2_score = table.Column<short>(type: "smallint", nullable: false),
                    c3_score = table.Column<short>(type: "smallint", nullable: false),
                    c4_score = table.Column<short>(type: "smallint", nullable: false),
                    c5_score = table.Column<short>(type: "smallint", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    decision = table.Column<string>(type: "text", nullable: false),
                    rationale = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_competency_assessment", x => x.id);
                    table.ForeignKey(
                        name: "fk_expert_competency_assessment_profile",
                        column: x => x.expert_profile_id,
                        principalSchema: "expert",
                        principalTable: "expert_profile",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_expert_competency_assessment_profile",
                schema: "expert",
                table: "expert_competency_assessment",
                column: "expert_profile_id");
        }
    }
}
