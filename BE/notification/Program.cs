using Caps.Common.Api;
using Caps.Common.Messaging;
using Caps.Common.Persistence;
using Caps.Notification;
using Caps.Notification.Data;
using Caps.Notification.Features.AuthEmails;
using Caps.Notification.Features.ExpertDecisions;
using Caps.Notification.Features.Realtime;

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
        x.AddConsumer<RealtimeChangedConsumer>();
    }
);
var app = builder.Build();
app.MigrateInDevelopment<NotificationDbContext>();
app.UseCommonApi();
app.MapHub<NotificationHub>(NotificationHub.Path);
app.Run();
