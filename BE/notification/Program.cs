using Caps.Common.Api;
using Caps.Common.Messaging;
using Caps.Common.Persistence;
using Caps.Notification;
using Caps.Notification.Data;
using Caps.Notification.Features.AuditLogs;
using Caps.Notification.Features.AuthEmails;
using Caps.Notification.Features.ExpertDecisions;
using Caps.Notification.Features.Payouts;
using Caps.Notification.Features.Realtime;
using Caps.Notification.Features.ReviewCases;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCommonApi(builder.Configuration, "notification");
builder.Services.AddNotificationEmail(builder.Configuration);
builder.Services.AddNotificationInbox(builder.Configuration);
builder.Services.AddNotificationRealtime();
builder.Services.AddCapsMessaging(
    builder.Configuration,
    x =>
    {
        x.AddConsumer<AuthEmailConsumer>();
        x.AddConsumer<ExpertEligibilityDecidedConsumer>();
        x.AddConsumer<ExpertCompetencyDecidedConsumer>();
        x.AddConsumer<ExpertServiceAccessChangedConsumer>();
        x.AddConsumer<PlatformFeeChangeAnnouncedConsumer>();
        x.AddConsumer<ExpertPriceOutOfRangeConsumer>();
        x.AddConsumer<ExpertPayoutNoticeConsumer>();
        x.AddConsumer<PayoutDigestConsumer>();
        x.AddConsumer<RealtimeChangedConsumer>();
        x.AddConsumer<ReviewCaseRequestedConsumer>();
        x.AddConsumer<ReviewCaseInfoRequestedConsumer>();
        x.AddConsumer<ReviewCaseAcceptanceDueConsumer>();
        x.AddConsumer<ReviewCaseStatusChangedConsumer>();
        x.AddConsumer<ReviewCaseResponseDueConsumer>();
        x.AddConsumer<ReviewCaseStatementDueConsumer>();
        x.AddConsumer<ReviewCaseDisputeOverdueConsumer>();
        x.AddConsumer<ReviewCaseDisputeExtendedConsumer>();
        x.AddConsumer<ReviewCaseExtensionRequestedConsumer>();
        x.AddConsumer<ReviewCaseExtensionDecidedConsumer>();
        x.AddConsumer<ExpertExcuseRequestedConsumer>();
        x.AddConsumer<ExpertViolationRecordedConsumer>();
        x.AddConsumer<AuditRecordedConsumer>();
    }
);
var app = builder.Build();
app.MigrateInDevelopment<NotificationDbContext>();
app.UseCommonApi();
app.MapHub<NotificationHub>(NotificationHub.Path);
app.Run();
