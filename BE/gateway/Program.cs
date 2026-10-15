using Caps.Common.Api;
using Caps.Gateway.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCommonApi(builder.Configuration, "gateway");
builder.Services.AddGatewayRateLimits(builder.Configuration);
builder.Services.AddReverseProxy().LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();

app.UseCommonApi();

// After CORS (inside UseCommonApi), so a 429 still carries the CORS headers the browser needs to read it
app.UseRateLimiter();
app.MapReverseProxy();

app.Run();
