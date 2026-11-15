using Caps.Common.Api;
using Caps.Gateway.RateLimiting;
using Caps.Gateway.Security;

var builder = WebApplication.CreateBuilder(args);

builder.HideServerHeader();
builder.Services.AddGatewayForwardedHeaders(builder.Configuration);
builder.Services.AddCommonApi(builder.Configuration, "gateway");
builder.Services.AddGatewayRateLimits(builder.Configuration);
builder.Services.AddReverseProxy().LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();

app.UseForwardedHeaders();
app.UseSecurityHeaders();
app.UseCommonApi();

// After CORS (inside UseCommonApi), so a 429 still carries the CORS headers the browser needs to read it
app.UseRateLimiter();
app.MapReverseProxy();

app.Run();
