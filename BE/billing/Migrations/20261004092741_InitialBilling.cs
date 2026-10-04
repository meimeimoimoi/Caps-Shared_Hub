using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace billing.Migrations
{
    /// <inheritdoc />
    public partial class InitialBilling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "billing");

            migrationBuilder.CreateTable(
                name: "bank_account",
                schema: "billing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    bank_bin = table.Column<string>(type: "text", nullable: false),
                    bank_name = table.Column<string>(type: "text", nullable: false),
                    account_number_enc = table.Column<string>(type: "text", nullable: false),
                    account_number_hash = table.Column<string>(type: "text", nullable: false),
                    account_last4 = table.Column<string>(type: "text", nullable: false),
                    account_holder_name = table.Column<string>(type: "text", nullable: false),
                    is_default = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "UNVERIFIED"),
                    rejection_reason = table.Column<string>(type: "text", nullable: true),
                    verified_by = table.Column<Guid>(type: "uuid", nullable: true),
                    verified_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bank_account", x => x.id);
                    table.ForeignKey(
                        name: "fk_bank_account_58",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_bank_account_59",
                        column: x => x.verified_by,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "credit_wallet",
                schema: "billing",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    balance = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    held = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_credit_wallet", x => x.user_id);
                    table.ForeignKey(
                        name: "fk_credit_wallet_68",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dispute",
                schema: "billing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    raised_by = table.Column<Guid>(type: "uuid", nullable: false),
                    grounds = table.Column<string>(type: "text", nullable: false),
                    evidence = table.Column<string>(type: "jsonb", nullable: true),
                    arbiter_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    sla_due_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    outcome = table.Column<string>(type: "text", nullable: true),
                    resolution_note = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "OPEN"),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    resolved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dispute", x => x.id);
                    table.ForeignKey(
                        name: "fk_dispute_63",
                        column: x => x.review_case_id,
                        principalSchema: "review",
                        principalTable: "review_case",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_dispute_64",
                        column: x => x.raised_by,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_dispute_65",
                        column: x => x.arbiter_user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "escrow",
                schema: "billing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<long>(type: "bigint", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "HELD"),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_escrow", x => x.id);
                    table.ForeignKey(
                        name: "fk_escrow_56",
                        column: x => x.review_case_id,
                        principalSchema: "review",
                        principalTable: "review_case",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payment_transaction",
                schema: "billing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: true),
                    purpose = table.Column<string>(type: "text", nullable: false),
                    amount = table.Column<long>(type: "bigint", nullable: false),
                    provider = table.Column<string>(type: "text", nullable: false, defaultValue: "PAYOS"),
                    order_code = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "PENDING"),
                    paid_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_transaction", x => x.id);
                    table.ForeignKey(
                        name: "fk_payment_transaction_66",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_payment_transaction_67",
                        column: x => x.review_case_id,
                        principalSchema: "review",
                        principalTable: "review_case",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "settlement",
                schema: "billing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    user_refund_amount = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    expert_payout_amount = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    platform_fee_amount = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    settled_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_settlement", x => x.id);
                    table.ForeignKey(
                        name: "fk_settlement_57",
                        column: x => x.review_case_id,
                        principalSchema: "review",
                        principalTable: "review_case",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "credit_ledger",
                schema: "billing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entry_type = table.Column<string>(type: "text", nullable: false),
                    amount = table.Column<long>(type: "bigint", nullable: false),
                    balance_after = table.Column<long>(type: "bigint", nullable: false),
                    idempotency_key = table.Column<string>(type: "text", nullable: false),
                    ref_payment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    ref_ai_usage_id = table.Column<Guid>(type: "uuid", nullable: true),
                    ref_document_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_credit_ledger", x => x.id);
                    table.ForeignKey(
                        name: "fk_credit_ledger_69",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_credit_ledger_70",
                        column: x => x.ref_payment_id,
                        principalSchema: "billing",
                        principalTable: "payment_transaction",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "payout_transaction",
                schema: "billing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    settlement_id = table.Column<Guid>(type: "uuid", nullable: false),
                    payout_type = table.Column<string>(type: "text", nullable: false),
                    recipient_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<long>(type: "bigint", nullable: false),
                    bank_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    snap_bank_bin = table.Column<string>(type: "text", nullable: true),
                    snap_bank_name = table.Column<string>(type: "text", nullable: true),
                    snap_account_last4 = table.Column<string>(type: "text", nullable: true),
                    snap_holder_name = table.Column<string>(type: "text", nullable: true),
                    provider = table.Column<string>(type: "text", nullable: false, defaultValue: "PAYOS"),
                    provider_ref = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "PENDING"),
                    attempt_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    last_error = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payout_transaction", x => x.id);
                    table.ForeignKey(
                        name: "fk_payout_transaction_60",
                        column: x => x.settlement_id,
                        principalSchema: "billing",
                        principalTable: "settlement",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_payout_transaction_61",
                        column: x => x.bank_account_id,
                        principalSchema: "billing",
                        principalTable: "bank_account",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_payout_transaction_62",
                        column: x => x.recipient_user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_bank_account_user_id",
                schema: "billing",
                table: "bank_account",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_bank_account_verified_by",
                schema: "billing",
                table: "bank_account",
                column: "verified_by");

            migrationBuilder.CreateIndex(
                name: "ix_credit_ledger_2",
                schema: "billing",
                table: "credit_ledger",
                columns: new[] { "user_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_credit_ledger_idempotency_key",
                schema: "billing",
                table: "credit_ledger",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_credit_ledger_ref_payment_id",
                schema: "billing",
                table: "credit_ledger",
                column: "ref_payment_id");

            migrationBuilder.CreateIndex(
                name: "IX_dispute_arbiter_user_id",
                schema: "billing",
                table: "dispute",
                column: "arbiter_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_dispute_raised_by",
                schema: "billing",
                table: "dispute",
                column: "raised_by");

            migrationBuilder.CreateIndex(
                name: "IX_dispute_review_case_id",
                schema: "billing",
                table: "dispute",
                column: "review_case_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_escrow_review_case_id",
                schema: "billing",
                table: "escrow",
                column: "review_case_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_payment_transaction_2",
                schema: "billing",
                table: "payment_transaction",
                columns: new[] { "user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_payment_transaction_order_code",
                schema: "billing",
                table: "payment_transaction",
                column: "order_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_transaction_review_case_id",
                schema: "billing",
                table: "payment_transaction",
                column: "review_case_id");

            migrationBuilder.CreateIndex(
                name: "ix_payout_transaction_4",
                schema: "billing",
                table: "payout_transaction",
                columns: new[] { "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_payout_transaction_bank_account_id",
                schema: "billing",
                table: "payout_transaction",
                column: "bank_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_payout_transaction_provider_ref",
                schema: "billing",
                table: "payout_transaction",
                column: "provider_ref",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payout_transaction_recipient_user_id",
                schema: "billing",
                table: "payout_transaction",
                column: "recipient_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_payout_transaction_settlement_id_payout_type",
                schema: "billing",
                table: "payout_transaction",
                columns: new[] { "settlement_id", "payout_type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_settlement_review_case_id",
                schema: "billing",
                table: "settlement",
                column: "review_case_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "credit_ledger",
                schema: "billing");

            migrationBuilder.DropTable(
                name: "credit_wallet",
                schema: "billing");

            migrationBuilder.DropTable(
                name: "dispute",
                schema: "billing");

            migrationBuilder.DropTable(
                name: "escrow",
                schema: "billing");

            migrationBuilder.DropTable(
                name: "payout_transaction",
                schema: "billing");

            migrationBuilder.DropTable(
                name: "payment_transaction",
                schema: "billing");

            migrationBuilder.DropTable(
                name: "settlement",
                schema: "billing");

            migrationBuilder.DropTable(
                name: "bank_account",
                schema: "billing");
        }
    }
}
