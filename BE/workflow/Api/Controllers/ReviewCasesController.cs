using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Workflow.Api.DTOs.Requests;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.Attachments;
using Caps.Workflow.Application.Features.ReviewCases;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Workflow.Api.Controllers;

/// <summary>
/// Review cases between a client and an expert: request, prepay, accept or decline, questions, delivery
/// and acceptance. Only the two parties see a case; to anyone else it does not exist.
/// </summary>
[ApiController, Authorize, Route("api/v1/review-cases")]
public sealed class ReviewCasesController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Returns the caller's cases as client or expert, newest first.</summary>
    /// <response code="200">The cases (may be empty).</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListMyReviewCaseQuery, ReviewCaseResponse[]> handler,
        CancellationToken ct
    )
    {
        var cases = await handler.HandleAsync(new(UserId), ct);
        return Ok(ApiResponse<ReviewCaseResponse[]>.Ok(cases));
    }

    /// <summary>Returns one case.</summary>
    /// <response code="200">The case.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND (also when the caller is not a party).</response>
    [HttpGet("{caseId:guid}")]
    public async Task<IActionResult> Get(
        Guid caseId,
        [FromServices] IQueryHandler<GetReviewCaseQuery, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>What booking an expert's service would cost the client in each case, in VND.</summary>
    /// <remarks>
    /// Read from the offer a booking would freeze now: a late or missed delivery, an unanswered question and
    /// an upheld dispute. The platform fee and the expert's share are not returned.
    /// </remarks>
    /// <response code="200">The client's terms.</response>
    /// <response code="400">serviceCode is missing.</response>
    /// <response code="404">EXPERT_SERVICE_UNAVAILABLE: the expert does not sell this service now.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE: the expert service cannot be reached.</response>
    [HttpGet("terms")]
    public async Task<IActionResult> Terms(
        [FromQuery] Guid expertProfileId,
        [FromQuery] string serviceCode,
        [FromServices]
            IQueryHandler<GetBookingTermsQuery, ReviewCaseResponse.ClientTermsResponse> handler,
        CancellationToken ct
    )
    {
        var terms = await handler.HandleAsync(new(expertProfileId, serviceCode), ct);
        return Ok(ApiResponse<ReviewCaseResponse.ClientTermsResponse>.Ok(terms));
    }

    /// <summary>Requests a review of one document version; the case waits 15 minutes for payment.</summary>
    /// <remarks>Price, platform fee and turnaround are read from the expert service and frozen on the case.</remarks>
    /// <response code="200">The case, AWAITING_PAYMENT.</response>
    /// <response code="400">TEXT_REQUIRED or TEXT_TOO_LONG.</response>
    /// <response code="404">DOCUMENT_NOT_FOUND or EXPERT_SERVICE_UNAVAILABLE.</response>
    /// <response code="409">REVIEW_CASE_ALREADY_OPEN: this version already has an open case with the expert.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE: the expert service cannot be reached.</response>
    [HttpPost]
    public async Task<IActionResult> Create(
        RequestReviewRequest r,
        [FromServices] ICommandHandler<RequestReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(r.ToCommand(UserId, currentUser.Email), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>Pays the case fee from the client's credits; the expert then has 24 hours to answer.</summary>
    /// <response code="200">The case, PENDING_EXPERT_RESPONSE.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID or CASE_DEADLINE_PASSED.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE or SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("{caseId:guid}/pay"), RequireSessionCheck]
    public async Task<IActionResult> Pay(
        Guid caseId,
        [FromServices] ICommandHandler<PayReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The expert accepts a paid request; the delivery deadline starts now.</summary>
    /// <response code="200">The case, IN_REVIEW.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND (also when the caller is not the case's expert).</response>
    /// <response code="409">CASE_STATUS_INVALID or CASE_DEADLINE_PASSED.</response>
    [HttpPost("{caseId:guid}/accept")]
    public async Task<IActionResult> Accept(
        Guid caseId,
        [FromServices] ICommandHandler<AcceptReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The expert declines a paid request; the client is refunded in full.</summary>
    /// <response code="200">The case, EXPERT_DECLINED.</response>
    /// <response code="400">TEXT_REQUIRED or TEXT_TOO_LONG (reason).</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE or SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("{caseId:guid}/decline"), RequireSessionCheck]
    public async Task<IActionResult> Decline(
        Guid caseId,
        DeclineReviewRequest r,
        [FromServices] ICommandHandler<DeclineReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId, r.Reason), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The expert gives up a case they accepted but have not delivered; the client is refunded in full.</summary>
    /// <remarks>Allowed in IN_REVIEW and AWAITING_USER_INFORMATION. The case ends EXPERT_DECLINED with the note EXPERT_WITHDREW and the expert's slot is freed.</remarks>
    /// <response code="200">The case, EXPERT_DECLINED.</response>
    /// <response code="400">TEXT_REQUIRED or TEXT_TOO_LONG (reason).</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID: not accepted yet, already delivered or over.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE or SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("{caseId:guid}/expert-withdraw"), RequireSessionCheck]
    public async Task<IActionResult> ExpertWithdraw(
        Guid caseId,
        DeclineReviewRequest r,
        [FromServices] ICommandHandler<ExpertWithdrawReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId, r.Reason), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The client withdraws a request the expert has not answered yet.</summary>
    /// <remarks>Unpaid: the case is CANCELLED_UNPAID. Paid: it is WITHDRAWN and the fee is refunded in full.</remarks>
    /// <response code="200">The case, CANCELLED_UNPAID or WITHDRAWN.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND (also for the expert).</response>
    /// <response code="409">CASE_STATUS_INVALID: the expert already accepted or the case is over.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE or SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("{caseId:guid}/withdraw"), RequireSessionCheck]
    public async Task<IActionResult> Withdraw(
        Guid caseId,
        [FromServices] ICommandHandler<WithdrawReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The expert asks the client for missing information; the review pauses.</summary>
    /// <response code="200">The case, AWAITING_USER_INFORMATION.</response>
    /// <response code="400">TEXT_REQUIRED or TEXT_TOO_LONG.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    // <response code="409">CASE_STATUS_INVALID or INFO_REQUEST_LIMIT (asked twice already).</response>
    [HttpPost("{caseId:guid}/request-information")]
    public async Task<IActionResult> RequestInformation(
        Guid caseId,
        CaseTextRequest r,
        [FromServices] ICommandHandler<RequestInformationCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId, r.Message), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The expert asks the client for 1–2 more working days before the delivery deadline.</summary>
    /// <remarks>Once per case. Nothing changes until the client accepts; without an answer the deadline stays.</remarks>
    /// <response code="200">The case with the pending extension.</response>
    /// <response code="400">EXTENSION_DAYS_INVALID, TEXT_REQUIRED or TEXT_TOO_LONG.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID, CASE_DEADLINE_PASSED or EXTENSION_ALREADY_REQUESTED.</response>
    [HttpPost("{caseId:guid}/extension")]
    public async Task<IActionResult> RequestExtension(
        Guid caseId,
        ExtensionRequest r,
        [FromServices] ICommandHandler<RequestExtensionCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId, r.Days, r.Reason), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The client accepts the extension; the delivery deadline moves by the days asked.</summary>
    /// <response code="200">The case with its new delivery deadline.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">EXTENSION_NOT_PENDING, CASE_STATUS_INVALID or CASE_DEADLINE_PASSED.</response>
    [HttpPost("{caseId:guid}/extension/accept")]
    public async Task<IActionResult> AcceptExtension(
        Guid caseId,
        [FromServices] ICommandHandler<DecideExtensionCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId, true), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The client declines the extension; the delivery deadline stays.</summary>
    /// <response code="200">The case, deadline unchanged.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">EXTENSION_NOT_PENDING, CASE_STATUS_INVALID or CASE_DEADLINE_PASSED.</response>
    [HttpPost("{caseId:guid}/extension/decline")]
    public async Task<IActionResult> DeclineExtension(
        Guid caseId,
        [FromServices] ICommandHandler<DecideExtensionCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId, false), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The client answers the expert's question; the delivery deadline moves back by the wait.</summary>
    /// <response code="200">The case, IN_REVIEW.</response>
    /// <response code="400">TEXT_REQUIRED or TEXT_TOO_LONG.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID or INFO_REQUEST_CLOSED.</response>
    [HttpPost("{caseId:guid}/provide-information")]
    public async Task<IActionResult> ProvideInformation(
        Guid caseId,
        CaseTextRequest r,
        [FromServices] ICommandHandler<ProvideInformationCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId, r.Message), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The expert saves a draft of the revised document while reviewing.</summary>
    /// <remarks>Replaces the previous draft. The client sees it only after delivery; delivering without a revision sends this draft.</remarks>
    /// <response code="200">The case with the saved draft.</response>
    /// <response code="400">REVISED_CONTENT_INVALID.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID (only IN_REVIEW or AWAITING_USER_INFORMATION).</response>
    [HttpPost("{caseId:guid}/revisions")]
    public async Task<IActionResult> SaveRevision(
        Guid caseId,
        SaveRevisionRequest r,
        [FromServices] ICommandHandler<SaveRevisionCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(
            new(UserId, caseId, r.RevisedContent?.GetRawText()),
            ct
        );
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The expert delivers the result; the client has 72 hours to confirm, then it auto-confirms.</summary>
    /// <response code="200">The case, AWAITING_ACCEPTANCE.</response>
    /// <response code="400">RESULT_INVALID, TEXT_REQUIRED, TEXT_TOO_LONG or REVISED_CONTENT_INVALID or ATTESTATION_REQUIRED or CITATIONS_INVALID.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID or CASE_DEADLINE_PASSED (past the late cancel hours).</response>
    [HttpPost("{caseId:guid}/deliver")]
    public async Task<IActionResult> Deliver(
        Guid caseId,
        DeliverReviewRequest r,
        [FromServices] ICommandHandler<DeliverReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(
            new(
                UserId,
                caseId,
                r.Result,
                r.Summary,
                r.CannotVerifyReason,
                r.Citations,
                r.Attested,
                r.RevisedContent?.GetRawText()
            ),
            ct
        );
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The client accepts the result; the expert is paid minus the platform fee.</summary>
    /// <response code="200">The case, COMPLETED.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE or SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("{caseId:guid}/confirm"), RequireSessionCheck]
    public async Task<IActionResult> Confirm(
        Guid caseId,
        [FromServices] ICommandHandler<ConfirmReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The client rates the expert once the case is over (COMPLETED, AUTO_CONFIRMED or RESOLVED).</summary>
    /// <remarks>Once per case, cannot be changed; it counts into the expert's marketplace rating.</remarks>
    /// <response code="200">The rated case.</response>
    /// <response code="400">RATING_INVALID or TEXT_TOO_LONG.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND (also for the expert).</response>
    /// <response code="409">RATING_CLOSED or RATING_EXISTS.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE.</response>
    [HttpPost("{caseId:guid}/rating")]
    public async Task<IActionResult> Rate(
        Guid caseId,
        RateReviewRequest request,
        [FromServices] ICommandHandler<RateReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(
            new(UserId, caseId, request.Stars, request.Comment),
            ct
        );
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>Downloads the uploaded file the case reviews.</summary>
    /// <remarks>Client always; expert once the case is paid. Versions built in the app have no file.</remarks>
    /// <response code="200">The file bytes.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND or ATTACHMENT_NOT_FOUND.</response>
    [HttpGet("{caseId:guid}/source-file")]
    public async Task<IActionResult> SourceFile(
        Guid caseId,
        [FromServices] IQueryHandler<OpenSourceFileQuery, AttachmentFile> handler,
        CancellationToken ct
    )
    {
        var file = await handler.HandleAsync(new(UserId, caseId), ct);
        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.CacheControl = "private, no-store";
        return File(file.Content, file.ContentType, file.FileName);
    }
}
