using Caps.Common.Api;
using Caps.Cronjob.Jobs.MonthlyCrawl;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCommonApi(builder.Configuration, "cronjob");
builder.Services.AddMonthlyCrawl();
var app = builder.Build();
app.UseCommonApi();
app.Run();
