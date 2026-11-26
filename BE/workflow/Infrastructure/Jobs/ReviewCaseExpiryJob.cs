using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain.Review;
using Caps.Workflow.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Caps.Workflow.Infrastructure.Jobs;

/// <summary>
/// Every minute, expires the review cases whose deadline passed, each in its own scope so one failure (billing
/// down) does not stop the rest; a failed case stays overdue and the next run retries it.
/// </summary>
public sealed class ReviewCaseExpiryJob(
    IServiceScopeFactory scopes,
    TimeProvider clock,
    ILogger<ReviewCaseExpiryJob> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1), clock);
        do
        {
            // Each run tries every overdue case once, so a case billing keeps refusing cannot starve the others
            await RemindAsync(stoppingToken);
            await AlertOverdueDisputesAsync(stoppingToken);
            var tried = new List<Guid>();
            while (await FindOverdueAsync(tried, stoppingToken) is { Count: > 0 } batch)
            {
                foreach (var id in batch)
                {
                    await ExpireAsync(id, stoppingToken);
                    tried.Add(id);
                }
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    // Two instances may pick the same case: the handler locks the row, so the second finds nothing overdue
    private async Task<List<Guid>> FindOverdueAsync(List<Guid> tried, CancellationToken ct)
    {
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<WorkflowDbContext>();
            var now = clock.GetUtcNow();
            return await db
                .Database.SqlQuery<Guid>(
                    $"""
                    SELECT c.id AS "Value" FROM review.review_case c
                    WHERE ((c.status = {ReviewCaseStatus.AwaitingPayment} AND c.payment_deadline <= {now})
                        OR (c.status = {ReviewCaseStatus.PendingExpertResponse} AND c.response_deadline <= {now})
                        OR (c.status = {ReviewCaseStatus.AwaitingAcceptance} AND c.acceptance_deadline <= {now})
                        -- ponytail: continuous hours end no later than working hours, so this finds a superset;
                        -- ExpireIfOverdue decides with the calendar. Store cancel_at if the re-checks ever cost
                        OR (c.status = {ReviewCaseStatus.InReview}
                            AND c.delivery_deadline + make_interval(hours => c.late_cancel_hours) <= {now})
                        OR (c.status = {ReviewCaseStatus.AwaitingUserInformation} AND EXISTS (
                            SELECT 1 FROM review.info_request r
                            WHERE r.review_case_id = c.id AND r.status = {InfoRequest.Open} AND r.due_at <= {now})))
                      AND c.id <> ALL({tried.ToArray()})
                    LIMIT 100
                    """
                )
                .ToListAsync(ct);
        }
        catch (Exception e) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(e, "Overdue review cases could not be read; retrying next minute.");
            return [];
        }
    }

    private async Task ExpireAsync(Guid reviewCaseId, CancellationToken ct)
    {
        try
        {
            using var scope = scopes.CreateScope();
            var handler = scope.ServiceProvider.GetRequiredService<
                ICommandHandler<ExpireReviewCaseCommand>
            >();
            await handler.HandleAsync(new(reviewCaseId), ct);
        }
        catch (Exception e) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(
                e,
                "Review case {ReviewCaseId} could not be expired; retrying next minute.",
                reviewCaseId
            );
        }
    }

    // Marks and reads the due cases in one statement, so two instances never remind the same case twice.
    private async Task RemindAsync(CancellationToken ct)
    {
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<WorkflowDbContext>();
            var events = scope.ServiceProvider.GetRequiredService<IReviewCaseEvents>();
            var now = clock.GetUtcNow();
            // The mark and the outbox rows commit together: a reminder is sent exactly when its case is marked
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var due = await db
                .Database.SqlQuery<DueReminder>(
                    $"""
                    UPDATE review.review_case SET reminder_sent_at = {now}
                    WHERE status = {ReviewCaseStatus.PendingExpertResponse}
                        AND reminder_sent_at IS NULL
                        AND response_deadline > {now}
                        AND response_deadline - make_interval(hours => {ReviewCase.ReminderHours}) <= {now}
                    RETURNING id AS "Id", expert_user_id AS "ExpertUserId", response_deadline AS "ResponseDeadline"
                    """
                )
                .ToListAsync(ct);
            foreach (var r in due)
            {
                await events.ResponseDueAsync(
                    r.Id,
                    r.ExpertUserId,
                    r.ResponseDeadline,
                    r.ExpertEmail,
                    ct
                );
            }
            // The same column marks the client's reminder: one sent before the delivery belongs to the expert
            var accepting = await db
                .Database.SqlQuery<DueAcceptance>(
                    $"""
                    UPDATE review.review_case SET reminder_sent_at = {now}
                    WHERE status = {ReviewCaseStatus.AwaitingAcceptance}
                        AND (reminder_sent_at IS NULL OR reminder_sent_at < delivered_at)
                        AND acceptance_deadline > {now}
                        AND acceptance_deadline - make_interval(hours => {ReviewCase.ReminderHours}) <= {now}
                    RETURNING id AS "Id", expert_user_id AS "ExpertUserId", response_deadline AS "ResponseDeadline",
                        expert_email AS "ExpertEmail"
                    """
                )
                .ToListAsync(ct);
            foreach (var a in accepting)
            {
                await events.AcceptanceDueAsync(
                    a.Id,
                    a.RequesterUserId,
                    a.RequesterEmail,
                    a.AcceptanceDeadline,
                    ct
                );
            }

            // The expert's statement window: one reminder per dispute, a few hours before it ends
            var explaining = await db
                .Database.SqlQuery<DueStatement>(
                    $"""
                    UPDATE review.review_dispute d SET statement_reminder_sent_at = {now}
                    FROM review.review_case c
                    Where c.id = d.review_case_id
                        AND d.status = {ReviewDispute.Open}
                        AND d.expert_statement IS NULL
                        AND d.statement_reminder_sent_at IS NULL
                        AND d.statement_due_by > {now}
                        AND d.statement_due_by - make_interval(hours => {ReviewCase.ReminderHours}) <= {now}
                    RETURNING d.review_case_id AS "ReviewCaseId", c.expert_user_id AS "ExpertUserId",
                        d.statement_due_by AS "StatementDueBy"
                    """
                )
                .ToListAsync(ct);
            foreach (var s in explaining)
            {
                await events.StatementDueAsync(
                    s.ReviewCaseId,
                    s.ExpertUserId,
                    s.StatementDueBy,
                    ct
                );
            }
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (Exception e) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(e, "Response reminders could not be sent; retrying next minute.");
        }
    }

    // Marks and reads the overdue disputes in one statement, so two instances never alert the same deadline twice
    private async Task AlertOverdueDisputesAsync(CancellationToken ct)
    {
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<WorkflowDbContext>();
            var events = scope.ServiceProvider.GetRequiredService<IReviewCaseEvents>();
            var now = clock.GetUtcNow();
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            // Repeats every 24 hours until decided; an extension clears the mark, so its deadline alerts as first
            var overdue = await db
                .Database.SqlQuery<OverdueDispute>(
                    $"""
                    WITH due AS (
                        SELECT review_case_id, overdue_alerted_at IS NULL AS first
                        FROM review.review_dispute
                        WHERE status = {ReviewDispute.Open}
                            AND decide_by <= {now}
                            AND (overdue_alerted_at IS NULL OR overdue_alerted_at <= {now} - interval '1 day')
                        FOR UPDATE
                    )
                    UPDATE review.review_dispute d SET overdue_alerted_at = {now}
                    FROM due, review.review_case c
                    WHERE d.review_case_id = due.review_case_id AND c.id = d.review_case_id
                    RETURNING d.review_case_id AS "ReviewCaseId", c.requester_user_id AS "RequesterUserId",
                        c.expert_user_id AS "ExpertUserId", d.decide_by AS "DecideBy",
                        d.extended AS "Extended", due.first AS "First"
                    """
                )
                .ToListAsync(ct);
            foreach (var d in overdue)
            {
                await events.DisputeOverdueAsync(
                    d.ReviewCaseId,
                    d.RequesterUserId,
                    d.ExpertUserId,
                    d.DecideBy,
                    d.Extended,
                    d.First,
                    ct
                );
            }
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (Exception e) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(e, "Overdue dispute alerts could not be sent; retrying next minute.");
        }
    }

    private sealed class DueReminder
    {
        public Guid Id { get; init; }
        public Guid ExpertUserId { get; init; }
        public DateTimeOffset ResponseDeadline { get; init; }
        public string? ExpertEmail { get; init; }
    }

    private sealed class DueAcceptance
    {
        public Guid Id { get; init; }
        public Guid RequesterUserId { get; init; }
        public string? RequesterEmail { get; init; }
        public DateTimeOffset AcceptanceDeadline { get; init; }
    }

    private sealed class OverdueDispute
    {
        public Guid ReviewCaseId { get; init; }
        public Guid RequesterUserId { get; init; }
        public Guid ExpertUserId { get; init; }
        public DateTimeOffset DecideBy { get; init; }
        public bool Extended { get; init; }
        public bool First { get; init; }
    }

    private sealed class DueStatement
    {
        public Guid ReviewCaseId { get; init; }
        public Guid ExpertUserId { get; init; }
        public DateTimeOffset StatementDueBy { get; init; }
    }
}
