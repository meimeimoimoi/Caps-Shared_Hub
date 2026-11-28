using System.Globalization;
using System.Text;
using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Payouts;

/// <summary>Staff export the payouts paid in [From, To) to match them against the monthly bank statement.</summary>
public sealed record ExportPaidPayoutsQuery(DateTimeOffset From, DateTimeOffset To);

/// <summary>A CSV file ready to download.</summary>
public sealed record PayoutCsvFile(byte[] Content, string FileName);

/// <summary>
/// One row per paid payout with what a statement line shows (bank transaction id, amount, time) and who
/// confirmed it. Times are Vietnam time, like the bank statement; UTF-8 with a BOM so Excel reads Vietnamese.
/// </summary>
public sealed class ExportPaidPayoutsHandler(IPayoutRepository payouts)
    : IQueryHandler<ExportPaidPayoutsQuery, PayoutCsvFile>
{
    public const int MaxDays = 366;
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    private static readonly string[] Header =
    [
        "payout_id",
        "case_id",
        "expert_user_id",
        "expert_email",
        "bank",
        "account_last4",
        "amount",
        "transfer_fee",
        "bank_ref",
        "transferred_at",
        "confirmed_by",
    ];

    public async Task<PayoutCsvFile> HandleAsync(ExportPaidPayoutsQuery query, CancellationToken ct)
    {
        if (query.To <= query.From || query.To - query.From > TimeSpan.FromDays(MaxDays))
            throw BillingErrors.PayoutExportRangeInvalid(MaxDays);

        var rows = await payouts.ListPaidAsync(query.From, query.To, ct);
        var csv = new StringBuilder();
        csv.AppendJoin(',', Header).Append("\r\n");
        foreach (var p in rows)
        {
            string[] cells =
            [
                p.Id.ToString(),
                p.Settlement.ReviewCaseId.ToString(),
                p.RecipientUserId.ToString(),
                p.RecipientEmail ?? "",
                p.SnapBankName ?? "",
                p.SnapAccountLast4 ?? "",
                p.Amount.ToString(CultureInfo.InvariantCulture),
                (p.TransferFee ?? 0).ToString(CultureInfo.InvariantCulture),
                p.ProviderRef ?? "",
                p.CompletedAt?.ToOffset(VietnamOffset)
                    .ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)
                    ?? "",
                ConfirmedBy(p)?.ToString() ?? "",
            ];
            csv.AppendJoin(',', cells.Select(Cell)).Append("\r\n");
        }

        var name = string.Create(
            CultureInfo.InvariantCulture,
            $"payouts_{query.From.ToOffset(VietnamOffset):yyyyMMdd}_{query.To.ToOffset(VietnamOffset):yyyyMMdd}.csv"
        );
        return new(
            [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(csv.ToString())],
            name
        );
    }

    /// <summary>
    /// The staff member who confirmed a manual transfer, or who sent the PayOS attempt that succeeded (PayOS
    /// reports the outcome itself, so that row has no actor).
    /// </summary>
    public static Guid? ConfirmedBy(PayoutTransaction p) =>
        p.History.LastOrDefault(h =>
            h.Status == PayoutStatus.Succeeded && h.ActorUserId != null
        )?.ActorUserId
        ?? p.History.LastOrDefault(h => h.Status == PayoutStatus.Processing)?.ActorUserId;

    /// <summary>Quotes when needed and defuses spreadsheet formulas (an emailed name could start with =).</summary>
    public static string Cell(string value)
    {
        if (value.Length > 0 && value[0] is '=' or '+' or '-' or '@' or '\t' or '\r')
            value = "'" + value;
        return value.IndexOfAny([',', '"', '\r', '\n']) >= 0
            ? "\"" + value.Replace("\"", "\"\"", StringComparison.Ordinal) + "\""
            : value;
    }
}
