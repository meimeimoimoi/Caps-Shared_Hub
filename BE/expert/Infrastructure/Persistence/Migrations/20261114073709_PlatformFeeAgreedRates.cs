using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caps.Expert.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PlatformFeeAgreedRates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                schema: "expert",
                table: "platform_fee",
                columns: new[] { "id", "cancelled_at", "cancelled_by", "effective_from", "late_cancel_hours", "late_penalty_hours", "late_penalty_percent", "no_response_expert_percent", "no_response_hours", "no_response_refund_percent", "percent", "service_code", "set_by" },
                values: new object[] { new Guid("01929e3a-0000-7000-8000-000000000040"), null, null, new DateTimeOffset(new DateTime(2026, 11, 14, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 7, 0, 0, 0)), 24, 24, 50, 60, 72, 0, 40, "HUMAN_VERIFICATION", new Guid("00000000-0000-0000-0000-000000000000") });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                schema: "expert",
                table: "platform_fee",
                keyColumn: "id",
                keyValue: new Guid("01929e3a-0000-7000-8000-000000000040"));
        }
    }
}
