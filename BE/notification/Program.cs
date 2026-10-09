using Caps.Common.Extensions;
using Caps.Common.Messaging;
using notification.Services;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCommonApi(builder.Configuration, "notification");
builder.Services.AddCapsMessaging(builder.Configuration, x => x.AddConsumer<AuthEmailConsumer>());
var app = builder.Build();
app.UseCommonApi();
app.Run();
