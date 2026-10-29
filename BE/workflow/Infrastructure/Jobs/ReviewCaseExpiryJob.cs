using Caps.Common.Application;
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
}
