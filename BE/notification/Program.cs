using Caps.Common.Api;
using Caps.Common.Messaging;
using Caps.Notification;
using Caps.Notification.Features.AuthEmails;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCommonApi(builder.Configuration, "notification");
builder.Services.AddNotificationEmail(builder.Configuration);
builder.Services.AddCapsMessaging(builder.Configuration, x => x.AddConsumer<AuthEmailConsumer>());
var app = builder.Build();
app.UseCommonApi();
app.Run();
