using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ServiceOfferingsAndPlatformFees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pricing_event",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "service_pricing_version",
                schema: "expert");

            migrationBuilder.CreateTable(
                name: "platform_fee",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    percent = table.Column<int>(type: "integer", nullable: false),
                    effective_from = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    set_by = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_platform_fee", x => x.id);
                    table.CheckConstraint("ck_platform_fee_percent", "percent BETWEEN 0 AND 99");
                    table.ForeignKey(
                        name: "fk_platform_fee_service",
                        column: x => x.service_code,
                        principalSchema: "expert",
                        principalTable: "service_catalog",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "service_offering",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    fee = table.Column<long>(type: "bigint", nullable: false),
                    turnaround_hours = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_service_offering", x => x.id);
                    table.CheckConstraint("ck_offering_values", "fee > 0 AND turnaround_hours BETWEEN 1 AND 720");
                    table.ForeignKey(
                        name: "fk_service_offering_profile",
                        column: x => x.expert_profile_id,
                        principalSchema: "expert",
                        principalTable: "expert_profile",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_service_offering_service",
                        column: x => x.service_code,
                        principalSchema: "expert",
                        principalTable: "service_catalog",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_platform_fee_current",
                schema: "expert",
                table: "platform_fee",
                columns: new[] { "service_code", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "IX_service_offering_service_code",
                schema: "expert",
                table: "service_offering",
                column: "service_code");

            migrationBuilder.CreateIndex(
                name: "ux_offering_one_per_service",
                schema: "expert",
                table: "service_offering",
                columns: new[] { "expert_profile_id", "service_code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "platform_fee",
                schema: "expert");

            migrationBuilder.DropTable(
                name: "service_offering",
                schema: "expert");

            migrationBuilder.CreateTable(
                name: "service_pricing_version",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<long>(type: "bigint", nullable: false),
                    auto_approved = table.Column<bool>(type: "boolean", nullable: false),
                    change_percent = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    decided_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    decision_note = table.Column<string>(type: "text", nullable: true),
                    effective_from = table.Column<DateOnly>(type: "date", nullable: false),
                    effective_to = table.Column<DateOnly>(type: "date", nullable: true),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qualification_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    sequence = table.Column<int>(type: "integer", nullable: false),
                    service_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    submitted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_service_pricing_version", x => x.id);
                    table.ForeignKey(
                        name: "fk_service_pricing_version_qualification",
                        column: x => x.qualification_id,
                        principalSchema: "expert",
                        principalTable: "expert_service_qualification",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pricing_event",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    action = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    pricing_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qualification_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pricing_event", x => x.id);
                    table.ForeignKey(
                        name: "fk_pricing_event_version",
                        column: x => x.pricing_version_id,
                        principalSchema: "expert",
                        principalTable: "service_pricing_version",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_pricing_event_pricing_version_id",
                schema: "expert",
                table: "pricing_event",
                column: "pricing_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_pricing_event_qualification",
                schema: "expert",
                table: "pricing_event",
                columns: new[] { "qualification_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_service_pricing_version_queue",
                schema: "expert",
                table: "service_pricing_version",
                columns: new[] { "status", "submitted_at" });

            migrationBuilder.CreateIndex(
                name: "ux_service_pricing_version_open",
                schema: "expert",
                table: "service_pricing_version",
                column: "qualification_id",
                unique: true,
                filter: "status IN ('DRAFT', 'RETURN_FOR_REVISION', 'PENDING_APPROVAL')");

            migrationBuilder.CreateIndex(
                name: "ux_service_pricing_version_sequence",
                schema: "expert",
                table: "service_pricing_version",
                columns: new[] { "qualification_id", "sequence" },
                unique: true);
        }
    }
}
