using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpertCvScreening : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "assigned_group",
                schema: "expert",
                table: "expert_evidence",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "screening_run",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    application_id = table.Column<Guid>(type: "uuid", nullable: false),
                    submission_event_id = table.Column<Guid>(type: "uuid", nullable: true),
                    submission_number = table.Column<int>(type: "integer", nullable: false),
                    run_number = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    triggered_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    timeout_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    failure_reason = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    checked_file_count = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_screening_run", x => x.id);
                    table.ForeignKey(
                        name: "fk_screening_run_application",
                        column: x => x.application_id,
                        principalSchema: "expert",
                        principalTable: "expert_application",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "screening_event",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    application_id = table.Column<Guid>(type: "uuid", nullable: false),
                    screening_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    by_system = table.Column<bool>(type: "boolean", nullable: false),
                    event_type = table.Column<string>(type: "character varying(48)", maxLength: 48, nullable: false),
                    message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_screening_event", x => x.id);
                    table.ForeignKey(
                        name: "fk_screening_event_application",
                        column: x => x.application_id,
                        principalSchema: "expert",
                        principalTable: "expert_application",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_screening_event_run",
                        column: x => x.screening_run_id,
                        principalSchema: "expert",
                        principalTable: "screening_run",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "screening_point",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    screening_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    application_id = table.Column<Guid>(type: "uuid", nullable: false),
                    evidence_id = table.Column<Guid>(type: "uuid", nullable: true),
                    source = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    target_criterion = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    detail = table.Column<string>(type: "text", nullable: false),
                    suggested_request = table.Column<string>(type: "text", nullable: true),
                    metadata_json = table.Column<string>(type: "jsonb", nullable: true),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    resolution_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    resolved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    resolved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_screening_point", x => x.id);
                    table.ForeignKey(
                        name: "fk_screening_point_application",
                        column: x => x.application_id,
                        principalSchema: "expert",
                        principalTable: "expert_application",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_screening_point_evidence",
                        column: x => x.evidence_id,
                        principalSchema: "expert",
                        principalTable: "expert_evidence",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_screening_point_run",
                        column: x => x.screening_run_id,
                        principalSchema: "expert",
                        principalTable: "screening_run",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_screening_event_application",
                schema: "expert",
                table: "screening_event",
                columns: new[] { "application_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_screening_event_screening_run_id",
                schema: "expert",
                table: "screening_event",
                column: "screening_run_id");

            migrationBuilder.CreateIndex(
                name: "ix_screening_point_application",
                schema: "expert",
                table: "screening_point",
                column: "application_id");

            migrationBuilder.CreateIndex(
                name: "IX_screening_point_evidence_id",
                schema: "expert",
                table: "screening_point",
                column: "evidence_id");

            migrationBuilder.CreateIndex(
                name: "ix_screening_point_run",
                schema: "expert",
                table: "screening_point",
                columns: new[] { "screening_run_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_screening_run_application",
                schema: "expert",
                table: "screening_run",
                columns: new[] { "application_id", "started_at" });

            migrationBuilder.CreateIndex(
                name: "ix_screening_run_running",
                schema: "expert",
                table: "screening_run",
                column: "status",
                filter: "status = 'RUNNING'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "screening_event",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "screening_point",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "screening_run",
                schema: "expert");

            migrationBuilder.DropColumn(
                name: "assigned_group",
                schema: "expert",
                table: "expert_evidence");
        }
    }
}
