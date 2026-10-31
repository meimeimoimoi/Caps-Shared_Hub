using System.Globalization;
using System.Text.Encodings.Web;
using Caps.Contracts;
using Caps.Notification.Email;

namespace Caps.Notification.Features.ExpertDecisions;

/// <summary>
/// Email telling an expert a Gate 1 or Gate 2 result. Same layout as the auth emails (tables + inline styles,
/// embedded logo); reviewer notes are shown so the applicant knows what to do next.
/// </summary>
public static class ExpertDecisionEmailTemplate
{
    private const string Brand = "Shared Hub";
    private const string Accent = "#cc4a00";
    private const string Ink = "#1c2833";
    private const string Body = "#4a4f57";
    private const string Line = "#ece6df";
    private const string Muted = "#7a7f87";
    private const string Font = "'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

    // Vietnam has no daylight saving time, so use a fixed UTC+7 regardless of the server time zone.
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>Subject, HTML and plain-text body of one email.</summary>
    public sealed record Content(string Subject, string Html, string Text);

    private sealed record Copy(string Subject, string Heading, string Intro, string Button);

    private static readonly Dictionary<string, string> CriterionNames = new()
    {
        ["EV-01"] = "Thông tin cá nhân",
        ["EV-02"] = "Lĩnh vực chuyên môn",
        ["EV-03"] = "Kinh nghiệm làm việc",
        ["EV-04"] = "Bằng cấp, chứng chỉ",
        ["EV-05"] = "Tài liệu minh chứng",
        ["EV-06"] = "Cam kết và điều khoản",
    };

    private static Copy For(string outcome, string? reapply) =>
        outcome switch
        {
            "ELIGIBLE" => new(
                $"Hồ sơ chuyên gia đã qua vòng xét duyệt điều kiện – {Brand}",
                "Hồ sơ của bạn đã đạt điều kiện",
                "Chúc mừng! Hồ sơ đăng ký chuyên gia của bạn đáp ứng các điều kiện ban đầu. Bước tiếp theo: nộp minh chứng năng lực trong Cổng chuyên gia.",
                "Mở Cổng chuyên gia"
            ),
            "NEED_MORE_INFORMATION" => new(
                $"Hồ sơ chuyên gia cần bổ sung thông tin – {Brand}",
                "Hồ sơ của bạn cần bổ sung",
                "Người xét duyệt cần thêm thông tin để đánh giá hồ sơ của bạn. Hãy xem các mục bên dưới và bổ sung trong hồ sơ.",
                "Bổ sung hồ sơ"
            ),
            _ => new(
                $"Kết quả xét duyệt hồ sơ chuyên gia – {Brand}",
                "Hồ sơ chưa đạt điều kiện",
                reapply == null
                    ? "Rất tiếc, hồ sơ đăng ký chuyên gia của bạn chưa đáp ứng các điều kiện ban đầu."
                    : $"Rất tiếc, hồ sơ đăng ký chuyên gia của bạn chưa đáp ứng các điều kiện ban đầu. Bạn có thể nộp hồ sơ mới từ ngày {reapply}.",
                "Xem kết quả"
            ),
        };

    private static readonly Dictionary<string, string> CompetencyNames = new()
    {
        ["C1"] = "Kiến thức Thuế TNDN phù hợp phạm vi dịch vụ",
        ["C2"] = "Rà soát và hiệu chỉnh AI Draft",
        ["C3"] = "Rà soát thông tin và bằng chứng",
        ["C4"] = "Phân tích và áp dụng quy định Thuế TNDN",
        ["C5"] = "Xét đoán nghề nghiệp và kết luận xác minh",
    };

    private static Copy ForCompetency(string outcome, string service, string? reapply) =>
        outcome switch
        {
            "PENDING_FINAL_APPROVAL" => new(
                $"Đã qua đánh giá năng lực dịch vụ {service} – {Brand}",
                "Bạn đã qua đánh giá năng lực",
                $"Chúc mừng! Bạn đã đạt đánh giá năng lực cho dịch vụ {service}. Hồ sơ đang chờ Quản trị hệ thống phê duyệt cuối.",
                "Xem tiến độ"
            ),
            "NEED_MORE_INFORMATION" => new(
                $"Cần bổ sung bằng chứng năng lực cho dịch vụ {service} – {Brand}",
                "Hồ sơ năng lực cần bổ sung",
                $"Người đánh giá cần thêm bằng chứng để đánh giá năng lực của bạn cho dịch vụ {service}. Hãy xem các mục bên dưới và bổ sung.",
                "Bổ sung bằng chứng"
            ),
            _ => new(
                $"Kết quả đánh giá năng lực dịch vụ {service} – {Brand}",
                "Chưa đạt đánh giá năng lực",
                reapply == null
                    ? $"Rất tiếc, bạn chưa đạt đánh giá năng lực cho dịch vụ {service}."
                    : $"Rất tiếc, bạn chưa đạt đánh giá năng lực cho dịch vụ {service}. Bạn có thể đăng ký lại dịch vụ này từ ngày {reapply}.",
                "Xem kết quả"
            ),
        };

    /// <summary>Gate 2 result for one service, listing the competencies to supplement or not met.</summary>
    public static Content Build(ExpertCompetencyDecidedEvent m, string link)
    {
        var copy = ForCompetency(m.Outcome, m.ServiceName, Day(m.EarliestReapplyAt));
        var issues = m
            .Issues.Select(i => new Issue(
                $"{i.Code} · {CompetencyNames.GetValueOrDefault(i.Code, i.Code)}",
                i.Result == "FAIL" ? "Chưa đạt" : "Cần bổ sung",
                i.Note
            ))
            .ToList();
        return Render(copy, m.DisplayName, m.Email, m.DecidedAt, link, issues);
    }

    /// <summary>
    /// Review cases reuse this layout: the expert asked the client something, and the case ends if they do not
    /// answer in time.
    /// </summary>
    public static Content Build(ReviewCaseInfoRequestedEvent m, string email, string link)
    {
        var due = m
            .DueAt.ToOffset(VietnamOffset)
            .ToString("HH:mm dd/MM/yyyy", CultureInfo.InvariantCulture);
        var copy = new Copy(
            $"Chuyên gia cần bạn bổ sung thông tin – {Brand}",
            "Chuyên gia cần bạn bổ sung thông tin",
            $"Chuyên gia đang rà soát hồ sơ của bạn và có câu hỏi bên dưới. Vui lòng trả lời trước {due}; quá hạn, hồ sơ sẽ kết thúc và bạn chỉ được hoàn một phần phí.",
            "Trả lời chuyên gia"
        );
        return Render(
            copy,
            "bạn",
            email,
            m.OccurredAt,
            link,
            [new Issue("Câu hỏi của chuyên gia", $"hạn {due}", m.Message)]
        );
    }

    private static Copy ForStatus(string status) =>
        status switch
        {
            "EXPERT_DECLINED" => new(
                $"Chuyên gia chưa nhận hồ sơ của bạn – {Brand}",
                "Chuyên gia chưa nhận hồ sơ",
                "Chuyên gia không thể nhận hồ sơ này. Toàn bộ phí đã được hoàn vào ví của bạn; bạn có thể chọn chuyên gia khác.",
                "Xem hồ sơ"
            ),
            "EXPERT_TIMEOUT" => new(
                $"Chuyên gia chưa phản hồi kịp – {Brand}",
                "Chuyên gia chưa phản hồi kịp",
                "Chuyên gia không phản hồi trong thời hạn. Toàn bộ phí đã được hoàn vào ví của bạn; bạn có thể chọn chuyên gia khác.",
                "Xem hồ sơ"
            ),
            "AWAITING_ACCEPTANCE" => new(
                $"Chuyên gia đã gửi kết quả rà soát – {Brand}",
                "Kết quả rà soát đã sẵn sàng",
                "Chuyên gia đã gửi kết quả. Hãy xem và xác nhận, hoặc gửi khiếu nại nếu kết quả chưa đạt, trước hạn ghi trong hồ sơ; quá hạn, hệ thống sẽ tự xác nhận.",
                "Xem kết quả"
            ),
            "DELIVERY_OVERDUE" => new(
                $"Hồ sơ quá hạn giao kết quả – {Brand}",
                "Chuyên gia không giao kết quả đúng hạn",
                "Chuyên gia không giao kết quả trong thời hạn cho phép. Toàn bộ phí đã được hoàn vào ví của bạn.",
                "Xem hồ sơ"
            ),
            "RESOLVED" => new(
                $"Khiếu nại của bạn đã có kết quả – {Brand}",
                "Khiếu nại đã được giải quyết",
                "Quản trị hệ thống đã xem xét khiếu nại của bạn. Số tiền hoàn (nếu có) đã vào ví; chi tiết ở trong hồ sơ.",
                "Xem kết quả"
            ),
            _ => new(
                $"Hồ sơ rà soát đã kết thúc – {Brand}",
                "Hồ sơ đã kết thúc",
                "Hồ sơ kết thúc vì chưa nhận được thông tin bổ sung đúng hạn. Phần phí được hoàn theo quy định đã vào ví của bạn.",
                "Xem hồ sơ"
            ),
        };

    /// <summary>A review case step the client must know about: a refund, a delivery to accept, or an ending.</summary>
    public static Content Build(ReviewCaseStatusChangedEvent m, string email, string link)
    {
        var issues = string.IsNullOrWhiteSpace(m.Note)
            ? new List<Issue>()
            : [new Issue("Ghi chú", "", m.Note)];
        return Render(ForStatus(m.ToStatus), "bạn", email, m.OccurredAt, link, issues);
    }

    /// <summary>Tells the operations inbox a client opened a dispute; it must be decided within 48 hours.</summary>
    public static Content BuildDisputeAlert(
        ReviewCaseStatusChangedEvent m,
        string email,
        string link
    )
    {
        var copy = new Copy(
            $"Có khiếu nại mới cần xử lý – {Brand}",
            "Có khiếu nại mới",
            "Một khách hàng vừa khiếu nại kết quả rà soát. Khiếu nại cần được quyết định trong 48 giờ.",
            "Mở khiếu nại"
        );
        return Render(copy, "Quản trị viên", email, m.OccurredAt, link, []);
    }

    private static (Copy Copy, string Label) ForAccess(string change, string service) =>
        change switch
        {
            "APPROVED" => (
                new(
                    $"Bạn được cung cấp dịch vụ {service} – {Brand}",
                    "Hồ sơ năng lực đã được phê duyệt",
                    $"Chúc mừng! Quản trị hệ thống đã phê duyệt để bạn cung cấp dịch vụ {service}. Bước tiếp theo là thiết lập giá dịch vụ.",
                    "Mở Cổng chuyên gia"
                ),
                "Đã phê duyệt"
            ),
            "RETURNED_FOR_REVIEW" => (
                new(
                    $"Hồ sơ năng lực dịch vụ {service} được đánh giá lại – {Brand}",
                    "Hồ sơ được chuyển đánh giá lại",
                    $"Quản trị hệ thống đã trả hồ sơ năng lực dịch vụ {service} về bước đánh giá năng lực. Bạn không cần làm gì thêm lúc này.",
                    "Xem hồ sơ"
                ),
                "Đánh giá lại"
            ),
            "SUSPENDED" => (
                new(
                    $"Dịch vụ {service} tạm ngưng – {Brand}",
                    "Dịch vụ của bạn đang tạm ngưng",
                    $"Dịch vụ {service} tạm thời không hiển thị trên Marketplace. Các hồ sơ đang thực hiện vẫn tiếp tục.",
                    "Xem chi tiết"
                ),
                "Tạm ngưng"
            ),
            _ => (
                new(
                    $"Dịch vụ {service} hoạt động trở lại – {Brand}",
                    "Dịch vụ của bạn đã được mở lại",
                    $"Quản trị hệ thống đã mở lại dịch vụ {service} cho bạn.",
                    "Mở Cổng chuyên gia"
                ),
                "Mở lại"
            ),
        };

    /// <summary>Final approval, return for review, suspension or reinstatement of one service.</summary>
    public static Content Build(ExpertServiceAccessChangedEvent m, string link)
    {
        var (copy, label) = ForAccess(m.Change, m.ServiceName);
        var issues = string.IsNullOrWhiteSpace(m.Note)
            ? new List<Issue>()
            : [new Issue(m.ServiceName, label, m.Note)];
        return Render(copy, m.DisplayName, m.Email, m.ChangedAt, link, issues);
    }

    private static string? Day(DateTimeOffset? at) =>
        at?.ToOffset(VietnamOffset).ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);

    private static Content Render(
        Copy copy,
        string name,
        string email,
        DateTimeOffset decidedAt,
        string link,
        IReadOnlyList<Issue> issues
    )
    {
        var year = decidedAt.ToOffset(VietnamOffset).Year;
        return new(
            copy.Subject,
            Html(copy, name, link, email, year, issues),
            Text(copy, name, link, email, year, issues)
        );
    }

    public static Content Build(ExpertEligibilityDecidedEvent m, string link)
    {
        var copy = For(m.Outcome, Day(m.EarliestReapplyAt));
        var issues = m
            .Issues.Select(i => new Issue(
                CriterionNames.GetValueOrDefault(i.Code, i.Code),
                i.Result == "FAIL" ? "Chưa đạt" : "Cần bổ sung",
                i.Note
            ))
            .ToList();
        return Render(copy, m.DisplayName, m.Email, m.DecidedAt, link, issues);
    }

    private sealed record Issue(string Name, string Result, string? Note);

    private static string Text(
        Copy c,
        string name,
        string link,
        string email,
        int year,
        IReadOnlyList<Issue> issues
    )
    {
        var list = string.Concat(
            issues.Select(i =>
                $"- {i.Name} ({i.Result}){(string.IsNullOrWhiteSpace(i.Note) ? "" : $": {i.Note}")}\n"
            )
        );
        return $"""
            {Brand} · {c.Heading}

            Chào {name},

            {c.Intro}

            {(list.Length == 0 ? "" : list + "\n")}{c.Button}: {link}

            —
            Email tự động gửi tới {email}, vui lòng không trả lời.
            © {year} {Brand}
            """;
    }

    private static string Html(
        Copy c,
        string name,
        string link,
        string email,
        int year,
        IReadOnlyList<Issue> issues
    )
    {
        var e = HtmlEncoder.Default;
        var rows = string.Concat(
            issues.Select(i =>
                $"""<tr><td style="padding:12px 0;border-top:1px solid {Line};text-align:left;font-size:14px;line-height:1.6;color:{Body};"><strong style="color:{Ink};">{e.Encode(
                    i.Name
                )}</strong> <span style="color:{Accent};">· {e.Encode(i.Result)}</span>{(
                    string.IsNullOrWhiteSpace(i.Note)
                        ? ""
                        : $"<br>{e.Encode(i.Note)}"
                )}</td></tr>"""
            )
        );
        var issueTable =
            rows.Length == 0
                ? ""
                : $"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;border-bottom:1px solid {Line};">{rows}</table>""";
        var href = e.Encode(link);
        // One centered column: logo, heading, greeting and result, reviewer notes, the action, small print
        return $"""
            <!doctype html>
            <html lang="vi">
            <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="color-scheme" content="light">
            <title>{e.Encode(c.Subject)}</title>
            </head>
            <body style="margin:0;padding:0;background:#f6f3ef;-webkit-text-size-adjust:100%;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f3ef;">
              <tr><td align="center" style="padding:40px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
                  <tr><td align="center" style="background:#ffffff;border-radius:12px;border:1px solid {Line};padding:36px 40px;font-family:{Font};text-align:center;">
                    <img src="cid:{EmailAssets.LogoContentId}" width="140" height="33" alt="{Brand}" style="display:block;margin:0 auto;border:0;outline:none;width:140px;height:auto;">
                    <h1 style="margin:32px 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:{Ink};">{e.Encode(
                c.Heading
            )}</h1>
                    <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:{Body};">Chào {e.Encode(name)},</p>
                    <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:{Body};">{e.Encode(
                c.Intro
            )}</p>
                    {issueTable}
                    <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
                      <td bgcolor="{Accent}" style="border-radius:8px;background:{Accent};">
                        <a href="{href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:{Font};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">{e.Encode(
                c.Button
            )}</a>
                      </td>
                    </tr></table>
                    <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:{Muted};">Nút không bấm được? Mở <a href="{href}" target="_blank" style="color:{Accent};text-decoration:underline;">liên kết này</a>.</p>
                  </td></tr>
                  <tr><td align="center" style="padding:20px 24px 0;font-family:{Font};font-size:12px;line-height:1.7;color:{Muted};">
                    Email tự động gửi tới {e.Encode(email)}, vui lòng không trả lời. © {year} {Brand}
                  </td></tr>
                </table>
              </td></tr>
            </table>
            </body>
            </html>
            """;
    }
}
