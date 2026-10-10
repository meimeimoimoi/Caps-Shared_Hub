using billing.Entities;
using billing.Entities.Stubs;
using Microsoft.EntityFrameworkCore;

namespace billing.Data;

public sealed class BillingDbContext(DbContextOptions<BillingDbContext> options) : DbContext(options)
{
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();
    public DbSet<CreditWallet> CreditWallets => Set<CreditWallet>();
    public DbSet<CreditLedger> CreditLedgers => Set<CreditLedger>();
    public DbSet<Escrow> Escrows => Set<Escrow>();
    public DbSet<Settlement> Settlements => Set<Settlement>();
    public DbSet<BankAccount> BankAccounts => Set<BankAccount>();
    public DbSet<PayoutTransaction> PayoutTransactions => Set<PayoutTransaction>();
    public DbSet<Dispute> Disputes => Set<Dispute>();

    // Cross-schema stubs
    public DbSet<UserStub> Users => Set<UserStub>();
    public DbSet<ReviewCaseStub> ReviewCases => Set<ReviewCaseStub>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("billing");

        // Stubs excluded from migrations
        modelBuilder.Entity<UserStub>(e =>
        {
            e.ToTable("users", "identity", t => t.ExcludeFromMigrations());
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
        });

        modelBuilder.Entity<ReviewCaseStub>(e =>
        {
            e.ToTable("review_case", "review", t => t.ExcludeFromMigrations());
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
        });

        // CreditWallet
        modelBuilder.Entity<CreditWallet>(e =>
        {
            e.ToTable("credit_wallet");
            e.HasKey(x => x.UserId);
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Balance).HasColumnName("balance").HasDefaultValue(0L);
            e.Property(x => x.Held).HasColumnName("held").HasDefaultValue(0L);
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()").IsRequired();

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .HasConstraintName("fk_credit_wallet_68");
        });

        // PaymentTransaction
        modelBuilder.Entity<PaymentTransaction>(e =>
        {
            e.ToTable("payment_transaction");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.ReviewCaseId).HasColumnName("review_case_id");
            e.Property(x => x.Purpose).HasColumnName("purpose").IsRequired();
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.Provider).HasColumnName("provider").HasDefaultValue("PAYOS").IsRequired();
            e.Property(x => x.OrderCode).HasColumnName("order_code").IsRequired();
            e.HasIndex(x => x.OrderCode).IsUnique();
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("PENDING").IsRequired();
            e.Property(x => x.PaidAt).HasColumnName("paid_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.UserId, x.Status }).HasDatabaseName("ix_payment_transaction_2");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .HasConstraintName("fk_payment_transaction_66");

            e.HasOne<ReviewCaseStub>()
                .WithMany()
                .HasForeignKey(x => x.ReviewCaseId)
                .HasConstraintName("fk_payment_transaction_67");
        });

        // CreditLedger
        modelBuilder.Entity<CreditLedger>(e =>
        {
            e.ToTable("credit_ledger");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.EntryType).HasColumnName("entry_type").IsRequired();
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.BalanceAfter).HasColumnName("balance_after");
            e.Property(x => x.IdempotencyKey).HasColumnName("idempotency_key").IsRequired();
            e.HasIndex(x => x.IdempotencyKey).IsUnique();
            e.Property(x => x.RefPaymentId).HasColumnName("ref_payment_id");
            e.Property(x => x.RefAiUsageId).HasColumnName("ref_ai_usage_id");
            e.Property(x => x.RefDocumentVersionId).HasColumnName("ref_document_version_id");
            e.Property(x => x.Note).HasColumnName("note");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();

            e.HasIndex(x => new { x.UserId, x.CreatedAt }).HasDatabaseName("ix_credit_ledger_2");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .HasConstraintName("fk_credit_ledger_69");

            e.HasOne(x => x.PaymentTransaction)
                .WithMany()
                .HasForeignKey(x => x.RefPaymentId)
                .HasConstraintName("fk_credit_ledger_70");
        });

        // Escrow
        modelBuilder.Entity<Escrow>(e =>
        {
            e.ToTable("escrow");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ReviewCaseId).HasColumnName("review_case_id");
            e.HasIndex(x => x.ReviewCaseId).IsUnique();
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("HELD").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()").IsRequired();

            e.HasOne<ReviewCaseStub>()
                .WithOne()
                .HasForeignKey<Escrow>(x => x.ReviewCaseId)
                .HasConstraintName("fk_escrow_56");
        });

        // Settlement
        modelBuilder.Entity<Settlement>(e =>
        {
            e.ToTable("settlement");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ReviewCaseId).HasColumnName("review_case_id");
            e.HasIndex(x => x.ReviewCaseId).IsUnique();
            e.Property(x => x.Reason).HasColumnName("reason").IsRequired();
            e.Property(x => x.UserRefundAmount).HasColumnName("user_refund_amount").HasDefaultValue(0L);
            e.Property(x => x.ExpertPayoutAmount).HasColumnName("expert_payout_amount").HasDefaultValue(0L);
            e.Property(x => x.PlatformFeeAmount).HasColumnName("platform_fee_amount").HasDefaultValue(0L);
            e.Property(x => x.SettledAt).HasColumnName("settled_at").HasDefaultValueSql("now()").IsRequired();

            e.HasOne<ReviewCaseStub>()
                .WithOne()
                .HasForeignKey<Settlement>(x => x.ReviewCaseId)
                .HasConstraintName("fk_settlement_57");
        });

        // BankAccount
        modelBuilder.Entity<BankAccount>(e =>
        {
            e.ToTable("bank_account");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.BankBin).HasColumnName("bank_bin").IsRequired();
            e.Property(x => x.BankName).HasColumnName("bank_name").IsRequired();
            e.Property(x => x.AccountNumberEnc).HasColumnName("account_number_enc").IsRequired();
            e.Property(x => x.AccountNumberHash).HasColumnName("account_number_hash").IsRequired();
            e.Property(x => x.AccountLast4).HasColumnName("account_last4").IsRequired();
            e.Property(x => x.AccountHolderName).HasColumnName("account_holder_name").IsRequired();
            e.Property(x => x.IsDefault).HasColumnName("is_default").HasDefaultValue(false);
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("UNVERIFIED").IsRequired();
            e.Property(x => x.RejectionReason).HasColumnName("rejection_reason");
            e.Property(x => x.VerifiedBy).HasColumnName("verified_by");
            e.Property(x => x.VerifiedAt).HasColumnName("verified_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()").IsRequired();

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .HasConstraintName("fk_bank_account_58");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.VerifiedBy)
                .HasConstraintName("fk_bank_account_59");
        });

        // PayoutTransaction
        modelBuilder.Entity<PayoutTransaction>(e =>
        {
            e.ToTable("payout_transaction");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.SettlementId).HasColumnName("settlement_id");
            e.Property(x => x.PayoutType).HasColumnName("payout_type").IsRequired();
            e.HasIndex(x => new { x.SettlementId, x.PayoutType }).IsUnique();
            e.Property(x => x.RecipientUserId).HasColumnName("recipient_user_id");
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.BankAccountId).HasColumnName("bank_account_id");
            e.Property(x => x.SnapBankBin).HasColumnName("snap_bank_bin");
            e.Property(x => x.SnapBankName).HasColumnName("snap_bank_name");
            e.Property(x => x.SnapAccountLast4).HasColumnName("snap_account_last4");
            e.Property(x => x.SnapHolderName).HasColumnName("snap_holder_name");
            e.Property(x => x.Provider).HasColumnName("provider").HasDefaultValue("PAYOS").IsRequired();
            e.Property(x => x.ProviderRef).HasColumnName("provider_ref");
            e.HasIndex(x => x.ProviderRef).IsUnique();
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("PENDING").IsRequired();
            e.Property(x => x.AttemptCount).HasColumnName("attempt_count").HasDefaultValue(0);
            e.Property(x => x.LastError).HasColumnName("last_error");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.CompletedAt).HasColumnName("completed_at");

            e.HasIndex(x => new { x.Status, x.CreatedAt }).HasDatabaseName("ix_payout_transaction_4");

            e.HasOne(x => x.Settlement)
                .WithMany(s => s.PayoutTransactions)
                .HasForeignKey(x => x.SettlementId)
                .HasConstraintName("fk_payout_transaction_60");

            e.HasOne(x => x.BankAccount)
                .WithMany()
                .HasForeignKey(x => x.BankAccountId)
                .HasConstraintName("fk_payout_transaction_61");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.RecipientUserId)
                .HasConstraintName("fk_payout_transaction_62");
        });

        // Dispute
        modelBuilder.Entity<Dispute>(e =>
        {
            e.ToTable("dispute");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ReviewCaseId).HasColumnName("review_case_id");
            e.HasIndex(x => x.ReviewCaseId).IsUnique();
            e.Property(x => x.RaisedBy).HasColumnName("raised_by");
            e.Property(x => x.Grounds).HasColumnName("grounds").IsRequired();
            e.Property(x => x.Evidence).HasColumnName("evidence").HasColumnType("jsonb");
            e.Property(x => x.ArbiterUserId).HasColumnName("arbiter_user_id");
            e.Property(x => x.SlaDueAt).HasColumnName("sla_due_at").IsRequired();
            e.Property(x => x.Outcome).HasColumnName("outcome");
            e.Property(x => x.ResolutionNote).HasColumnName("resolution_note");
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("OPEN").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
            e.Property(x => x.ResolvedAt).HasColumnName("resolved_at");

            e.HasOne<ReviewCaseStub>()
                .WithOne()
                .HasForeignKey<Dispute>(x => x.ReviewCaseId)
                .HasConstraintName("fk_dispute_63");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.RaisedBy)
                .HasConstraintName("fk_dispute_64");

            e.HasOne<UserStub>()
                .WithMany()
                .HasForeignKey(x => x.ArbiterUserId)
                .HasConstraintName("fk_dispute_65");
        });
    }
}
