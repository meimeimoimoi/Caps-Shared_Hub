using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Auth.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveExpertTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Expert data now lives in the expert service (schema "expert"). CASCADE also drops
            // foreign keys other services still had on these tables (workflow's review_case).
            foreach (
                var table in new[]
                {
                    "expert_application_event",
                    "expert_evidence",
                    "expert_competency_assessment",
                    "service_offering",
                    "availability_slot",
                    "expert_application",
                    "expert_profile",
                }
            )
                migrationBuilder.Sql($"DROP TABLE IF EXISTS identity.{table} CASCADE;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "expert_profile",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    approved_by = table.Column<Guid>(type: "uuid", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    approved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    bio = table.Column<string>(type: "text", nullable: true),
                    birth_date = table.Column<DateOnly>(type: "date", nullable: true),
                    company = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    eligibility_note = table.Column<string>(type: "text", nullable: true),
                    fields = table.Column<string[]>(type: "text[]", nullable: false, defaultValueSql: "'{}'::text[]"),
                    highlights = table.Column<string>(type: "text", nullable: true),
                    location = table.Column<string>(type: "text", nullable: true),
                    rating_avg = table.Column<decimal>(type: "numeric(3,2)", nullable: false, defaultValue: 0m),
                    rating_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    service_status = table.Column<string>(type: "text", nullable: false, defaultValue: "INACTIVE"),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "SCREENING"),
                    title = table.Column<string>(type: "text", nullable: true),
                    turnaround_hours = table.Column<int>(type: "integer", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    years_experience = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_profile", x => x.id);
                    table.ForeignKey(
                        name: "fk_expert_profile_10",
                        column: x => x.approved_by,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_expert_profile_9",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "availability_slot",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    end_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    start_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "OPEN")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_availability_slot", x => x.id);
                    table.ForeignKey(
                        name: "fk_availability_slot_15",
                        column: x => x.expert_profile_id,
                        principalSchema: "identity",
                        principalTable: "expert_profile",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "expert_application",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    previous_application_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    decision_note = table.Column<string>(type: "text", nullable: true),
                    earliest_reapply_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "DRAFT"),
                    submitted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_application", x => x.id);
                    table.ForeignKey(
                        name: "fk_expert_application_previous",
                        column: x => x.previous_application_id,
                        principalSchema: "identity",
                        principalTable: "expert_application",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_expert_application_profile",
                        column: x => x.expert_profile_id,
                        principalSchema: "identity",
                        principalTable: "expert_profile",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "expert_competency_assessment",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    assessor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    c1_score = table.Column<short>(type: "smallint", nullable: false),
                    c2_score = table.Column<short>(type: "smallint", nullable: false),
                    c3_score = table.Column<short>(type: "smallint", nullable: false),
                    c4_score = table.Column<short>(type: "smallint", nullable: false),
                    c5_score = table.Column<short>(type: "smallint", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    decision = table.Column<string>(type: "text", nullable: false),
                    rationale = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_competency_assessment", x => x.id);
                    table.ForeignKey(
                        name: "fk_expert_competency_assessment_12",
                        column: x => x.expert_profile_id,
                        principalSchema: "identity",
                        principalTable: "expert_profile",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_expert_competency_assessment_13",
                        column: x => x.assessor_user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "service_offering",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    fee = table.Column<long>(type: "bigint", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    service_type = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_service_offering", x => x.id);
                    table.ForeignKey(
                        name: "fk_service_offering_14",
                        column: x => x.expert_profile_id,
                        principalSchema: "identity",
                        principalTable: "expert_profile",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "expert_application_event",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    application_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    from_status = table.Column<string>(type: "text", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    to_status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_application_event", x => x.id);
                    table.ForeignKey(
                        name: "fk_expert_application_event_actor",
                        column: x => x.actor_user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_expert_application_event_application",
                        column: x => x.application_id,
                        principalSchema: "identity",
                        principalTable: "expert_application",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "expert_evidence",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    application_id = table.Column<Guid>(type: "uuid", nullable: true),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    content_type = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    evidence_type = table.Column<string>(type: "text", nullable: false),
                    file_name = table.Column<string>(type: "text", nullable: true),
                    file_url = table.Column<string>(type: "text", nullable: false),
                    parsed_meta = table.Column<string>(type: "jsonb", nullable: true),
                    screening_flag = table.Column<string>(type: "text", nullable: true),
                    size_bytes = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_evidence", x => x.id);
                    table.ForeignKey(
                        name: "fk_expert_evidence_11",
                        column: x => x.expert_profile_id,
                        principalSchema: "identity",
                        principalTable: "expert_profile",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_expert_evidence_application",
                        column: x => x.application_id,
                        principalSchema: "identity",
                        principalTable: "expert_application",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_availability_slot_2",
                schema: "identity",
                table: "availability_slot",
                columns: new[] { "expert_profile_id", "status", "start_at" });

            migrationBuilder.CreateIndex(
                name: "IX_expert_application_previous_application_id",
                schema: "identity",
                table: "expert_application",
                column: "previous_application_id");

            migrationBuilder.CreateIndex(
                name: "ix_expert_application_queue",
                schema: "identity",
                table: "expert_application",
                columns: new[] { "status", "submitted_at" });

            migrationBuilder.CreateIndex(
                name: "ux_expert_application_open",
                schema: "identity",
                table: "expert_application",
                column: "expert_profile_id",
                unique: true,
                filter: "status NOT IN ('NOT_ELIGIBLE', 'REJECTED', 'APPROVED')");

            migrationBuilder.CreateIndex(
                name: "ix_expert_application_event",
                schema: "identity",
                table: "expert_application_event",
                columns: new[] { "application_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_expert_application_event_actor_user_id",
                schema: "identity",
                table: "expert_application_event",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_expert_competency_assessment_2",
                schema: "identity",
                table: "expert_competency_assessment",
                column: "expert_profile_id");

            migrationBuilder.CreateIndex(
                name: "IX_expert_competency_assessment_assessor_user_id",
                schema: "identity",
                table: "expert_competency_assessment",
                column: "assessor_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_expert_evidence_2",
                schema: "identity",
                table: "expert_evidence",
                column: "expert_profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_expert_evidence_application",
                schema: "identity",
                table: "expert_evidence",
                column: "application_id");

            migrationBuilder.CreateIndex(
                name: "ix_expert_marketplace_feed",
                schema: "identity",
                table: "expert_profile",
                columns: new[] { "status", "service_status" });

            migrationBuilder.CreateIndex(
                name: "IX_expert_profile_approved_by",
                schema: "identity",
                table: "expert_profile",
                column: "approved_by");

            migrationBuilder.CreateIndex(
                name: "IX_expert_profile_user_id",
                schema: "identity",
                table: "expert_profile",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_service_offering_2",
                schema: "identity",
                table: "service_offering",
                columns: new[] { "expert_profile_id", "is_active" });
        }
    }
}
