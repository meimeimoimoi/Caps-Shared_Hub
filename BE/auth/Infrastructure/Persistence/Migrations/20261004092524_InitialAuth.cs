using System;
using System.Net;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace auth.Migrations
{
    /// <inheritdoc />
    public partial class InitialAuth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "identity");

            migrationBuilder.CreateTable(
                name: "permission",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_permission", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    full_name = table.Column<string>(type: "text", nullable: false),
                    phone = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "PENDING_VERIFICATION"),
                    email_verified_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "role_permission",
                schema: "identity",
                columns: table => new
                {
                    role_id = table.Column<Guid>(type: "uuid", nullable: false),
                    permission_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_permission", x => new { x.role_id, x.permission_id });
                    table.ForeignKey(
                        name: "fk_role_permission_3",
                        column: x => x.role_id,
                        principalSchema: "identity",
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_role_permission_4",
                        column: x => x.permission_id,
                        principalSchema: "identity",
                        principalTable: "permission",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "auth_refresh_token",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "text", nullable: false),
                    user_agent = table.Column<string>(type: "text", nullable: true),
                    ip_address = table.Column<IPAddress>(type: "inet", nullable: true),
                    issued_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    revoked_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    rotated_from = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auth_refresh_token", x => x.id);
                    table.ForeignKey(
                        name: "fk_auth_refresh_token_5",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_auth_refresh_token_6",
                        column: x => x.rotated_from,
                        principalSchema: "identity",
                        principalTable: "auth_refresh_token",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "business_profile",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_name = table.Column<string>(type: "text", nullable: false),
                    tax_code = table.Column<string>(type: "text", nullable: false),
                    address = table.Column<string>(type: "text", nullable: true),
                    representative = table.Column<string>(type: "text", nullable: true),
                    contact_email = table.Column<string>(type: "text", nullable: true),
                    contact_phone = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_business_profile", x => x.id);
                    table.ForeignKey(
                        name: "fk_business_profile_8",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "expert_profile",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    years_experience = table.Column<int>(type: "integer", nullable: true),
                    bio = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "SCREENING"),
                    service_status = table.Column<string>(type: "text", nullable: false, defaultValue: "INACTIVE"),
                    eligibility_note = table.Column<string>(type: "text", nullable: true),
                    turnaround_hours = table.Column<int>(type: "integer", nullable: true),
                    rating_avg = table.Column<decimal>(type: "numeric(3,2)", nullable: false, defaultValue: 0m),
                    rating_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    approved_by = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
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
                name: "user_roles",
                schema: "identity",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_roles", x => new { x.user_id, x.role_id });
                    table.ForeignKey(
                        name: "fk_user_roles_1",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_user_roles_2",
                        column: x => x.role_id,
                        principalSchema: "identity",
                        principalTable: "roles",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "verification_token",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    purpose = table.Column<string>(type: "text", nullable: false),
                    token_hash = table.Column<string>(type: "text", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    used_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    invalidated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_verification_token", x => x.id);
                    table.ForeignKey(
                        name: "fk_verification_token_7",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "availability_slot",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    start_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    end_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "OPEN"),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
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
                name: "expert_competency_assessment",
                schema: "identity",
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
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
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
                name: "expert_evidence",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    evidence_type = table.Column<string>(type: "text", nullable: false),
                    file_url = table.Column<string>(type: "text", nullable: false),
                    parsed_meta = table.Column<string>(type: "jsonb", nullable: true),
                    screening_flag = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
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
                });

            migrationBuilder.CreateTable(
                name: "service_offering",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_type = table.Column<string>(type: "text", nullable: false),
                    fee = table.Column<long>(type: "bigint", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
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

            migrationBuilder.CreateIndex(
                name: "ix_auth_refresh_token_2",
                schema: "identity",
                table: "auth_refresh_token",
                columns: new[] { "user_id", "expires_at" });

            migrationBuilder.CreateIndex(
                name: "IX_auth_refresh_token_rotated_from",
                schema: "identity",
                table: "auth_refresh_token",
                column: "rotated_from");

            migrationBuilder.CreateIndex(
                name: "IX_auth_refresh_token_token_hash",
                schema: "identity",
                table: "auth_refresh_token",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_availability_slot_2",
                schema: "identity",
                table: "availability_slot",
                columns: new[] { "expert_profile_id", "status", "start_at" });

            migrationBuilder.CreateIndex(
                name: "IX_business_profile_user_id",
                schema: "identity",
                table: "business_profile",
                column: "user_id",
                unique: true);

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
                name: "IX_permission_code",
                schema: "identity",
                table: "permission",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_role_permission_permission_id",
                schema: "identity",
                table: "role_permission",
                column: "permission_id");

            migrationBuilder.CreateIndex(
                name: "IX_roles_code",
                schema: "identity",
                table: "roles",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_service_offering_2",
                schema: "identity",
                table: "service_offering",
                columns: new[] { "expert_profile_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_user_roles_role_id",
                schema: "identity",
                table: "user_roles",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_verification_token_user_id",
                schema: "identity",
                table: "verification_token",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auth_refresh_token",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "availability_slot",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "business_profile",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "expert_competency_assessment",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "expert_evidence",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "role_permission",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "service_offering",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "user_roles",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "verification_token",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "permission",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "expert_profile",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "roles",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "users",
                schema: "identity");
        }
    }
}
