using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PricingPolicyRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_platform_fee_percent",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "cancelled_at",
                schema: "expert",
                table: "platform_fee",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "cancelled_by",
                schema: "expert",
                table: "platform_fee",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "service_offering_change",
                schema: "expert",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    offering_id = table.Column<Guid>(type: "uuid", nullable: false),
                    expert_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    old_fee = table.Column<long>(type: "bigint", nullable: true),
                    new_fee = table.Column<long>(type: "bigint", nullable: false),
                    old_turnaround_hours = table.Column<int>(type: "integer", nullable: true),
                    new_turnaround_hours = table.Column<int>(type: "integer", nullable: false),
                    changed_by = table.Column<Guid>(type: "uuid", nullable: false),
                    changed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_service_offering_change", x => x.id);
                    table.ForeignKey(
                        name: "fk_offering_change_offering",
                        column: x => x.offering_id,
                        principalSchema: "expert",
                        principalTable: "service_offering",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "expert",
                table: "platform_fee",
                columns: new[] { "id", "cancelled_at", "cancelled_by", "effective_from", "percent", "service_code", "set_by" },
                values: new object[] { new Guid("01929e3a-0000-7000-8000-000000000020"), null, null, new DateTimeOffset(new DateTime(2026, 10, 17, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), 20, "HUMAN_VERIFICATION", new Guid("00000000-0000-0000-0000-000000000000") });

            migrationBuilder.AddCheckConstraint(
                name: "ck_platform_fee_percent",
                schema: "expert",
                table: "platform_fee",
                sql: "percent BETWEEN 0 AND 50");

            migrationBuilder.CreateIndex(
                name: "ix_offering_change_history",
                schema: "expert",
                table: "service_offering_change",
                columns: new[] { "expert_profile_id", "service_code", "changed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_service_offering_change_offering_id",
                schema: "expert",
                table: "service_offering_change",
                column: "offering_id");

            // Price history is append-only: reject edits and deletes whatever role runs them
            migrationBuilder.Sql(
                """
                CREATE FUNCTION expert.reject_offering_change_edit() RETURNS trigger
                LANGUAGE plpgsql AS $$
                BEGIN
                    RAISE EXCEPTION 'service_offering_change is append-only';
                END;
                $$;
                CREATE TRIGGER trg_service_offering_change_append_only
                    BEFORE UPDATE OR DELETE ON expert.service_offering_change
                    FOR EACH ROW EXECUTE FUNCTION expert.reject_offering_change_edit();
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "DROP TRIGGER IF EXISTS trg_service_offering_change_append_only ON expert.service_offering_change;"
            );

            migrationBuilder.DropTable(
                name: "service_offering_change",
                schema: "expert");

            migrationBuilder.Sql("DROP FUNCTION IF EXISTS expert.reject_offering_change_edit();");

            migrationBuilder.DropCheckConstraint(
                name: "ck_platform_fee_percent",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.DeleteData(
                schema: "expert",
                table: "platform_fee",
                keyColumn: "id",
                keyValue: new Guid("01929e3a-0000-7000-8000-000000000020"));

            migrationBuilder.DropColumn(
                name: "cancelled_at",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.DropColumn(
                name: "cancelled_by",
                schema: "expert",
                table: "platform_fee");

            migrationBuilder.AddCheckConstraint(
                name: "ck_platform_fee_percent",
                schema: "expert",
                table: "platform_fee",
                sql: "percent BETWEEN 0 AND 99");
        }
    }
}
