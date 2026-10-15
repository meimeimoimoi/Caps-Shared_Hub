using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialExpert : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "expert");

            migrationBuilder.CreateTable(
                name: "expert_profile",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    display_name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    phone = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    years_experience = table.Column<int>(type: "integer", nullable: true),
                    bio = table.Column<string>(type: "text", nullable: true),
                    title = table.Column<string>(type: "text", nullable: true),
                    company = table.Column<string>(type: "text", nullable: true),
                    location = table.Column<string>(type: "text", nullable: true),
                    birth_date = table.Column<DateOnly>(type: "date", nullable: true),
                    fields = table.Column<string[]>(type: "text[]", nullable: false, defaultValueSql: "'{}'::text[]"),
                    highlights = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    service_status = table.Column<string>(type: "text", nullable: false, defaultValue: "INACTIVE"),
                    eligibility_note = table.Column<string>(type: "text", nullable: true),
                    turnaround_hours = table.Column<int>(type: "integer", nullable: true),
                    rating_avg = table.Column<decimal>(type: "numeric(3,2)", nullable: false, defaultValue: 0m),
                    rating_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    approved_by = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_profile", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "availability_slot",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    start_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    end_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "OPEN"),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_availability_slot", x => x.id);
                    table.ForeignKey(
                        name: "fk_availability_slot_profile",
                        column: x => x.expert_profile_id,
                        principalSchema: "expert",
                        principalTable: "expert_profile",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "expert_application",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    submitted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    decision_note = table.Column<string>(type: "text", nullable: true),
                    previous_application_id = table.Column<Guid>(type: "uuid", nullable: true),
                    earliest_reapply_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_application", x => x.id);
                    table.ForeignKey(
                        name: "fk_expert_application_previous",
                        column: x => x.previous_application_id,
                        principalSchema: "expert",
                        principalTable: "expert_application",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_expert_application_profile",
                        column: x => x.expert_profile_id,
                        principalSchema: "expert",
                        principalTable: "expert_profile",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

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
                    rationale = table.Column<string>(type: "text", nullable: false),
                    decision = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
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

            migrationBuilder.CreateTable(
                name: "service_offering",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_type = table.Column<string>(type: "text", nullable: false),
                    fee = table.Column<long>(type: "bigint", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_service_offering", x => x.id);
                    table.ForeignKey(
                        name: "fk_service_offering_profile",
                        column: x => x.expert_profile_id,
                        principalSchema: "expert",
                        principalTable: "expert_profile",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "expert_application_event",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    application_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_status = table.Column<string>(type: "text", nullable: true),
                    to_status = table.Column<string>(type: "text", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_application_event", x => x.id);
                    table.ForeignKey(
                        name: "fk_expert_application_event_application",
                        column: x => x.application_id,
                        principalSchema: "expert",
                        principalTable: "expert_application",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "expert_evidence",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    application_id = table.Column<Guid>(type: "uuid", nullable: false),
                    evidence_type = table.Column<string>(type: "text", nullable: false),
                    file_url = table.Column<string>(type: "text", nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    content_type = table.Column<string>(type: "text", nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    parsed_meta = table.Column<string>(type: "jsonb", nullable: true),
                    screening_flag = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_evidence", x => x.id);
                    table.ForeignKey(
                        name: "fk_expert_evidence_application",
                        column: x => x.application_id,
                        principalSchema: "expert",
                        principalTable: "expert_application",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_expert_evidence_profile",
                        column: x => x.expert_profile_id,
                        principalSchema: "expert",
                        principalTable: "expert_profile",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_availability_slot_open",
                schema: "expert",
                table: "availability_slot",
                columns: new[] { "expert_profile_id", "status", "start_at" });

            migrationBuilder.CreateIndex(
                name: "IX_expert_application_previous_application_id",
                schema: "expert",
                table: "expert_application",
                column: "previous_application_id");

            migrationBuilder.CreateIndex(
                name: "ix_expert_application_queue",
                schema: "expert",
                table: "expert_application",
                columns: new[] { "status", "submitted_at" });

            migrationBuilder.CreateIndex(
                name: "ux_expert_application_open",
                schema: "expert",
                table: "expert_application",
                column: "expert_profile_id",
                unique: true,
                filter: "status NOT IN ('NOT_ELIGIBLE', 'REJECTED', 'APPROVED')");

            migrationBuilder.CreateIndex(
                name: "ix_expert_application_event",
                schema: "expert",
                table: "expert_application_event",
                columns: new[] { "application_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_expert_competency_assessment_profile",
                schema: "expert",
                table: "expert_competency_assessment",
                column: "expert_profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_expert_evidence_application",
                schema: "expert",
                table: "expert_evidence",
                column: "application_id");

            migrationBuilder.CreateIndex(
                name: "ix_expert_evidence_profile",
                schema: "expert",
                table: "expert_evidence",
                column: "expert_profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_expert_marketplace_feed",
                schema: "expert",
                table: "expert_profile",
                columns: new[] { "status", "service_status" });

            migrationBuilder.CreateIndex(
                name: "ux_expert_profile_user",
                schema: "expert",
                table: "expert_profile",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_service_offering_active",
                schema: "expert",
                table: "service_offering",
                columns: new[] { "expert_profile_id", "is_active" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "availability_slot",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "expert_application_event",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "expert_competency_assessment",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "expert_evidence",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "service_offering",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "expert_application",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "expert_profile",
                schema: "expert");
        }
    }
}
