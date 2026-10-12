using System.Threading.RateLimiting;
using Caps.Auth.Api;
using Caps.Auth.Api.Middleware;
using Caps.Auth.Api.Swagger;
using Caps.Auth.Application;
using Caps.Auth.Application.Abstractions;
using Caps.Auth.Domain.Users;
using Caps.Auth.Infrastructure;
using Caps.Auth.Infrastructure.Email;
using Caps.Auth.Infrastructure.Experts;
using Caps.Auth.Infrastructure.Persistence;
using Caps.Auth.Infrastructure.Storage;
using Caps.Common.Api;
using Caps.Common.Messaging;
using Caps.Common.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCommonApi(builder.Configuration, "auth");
builder.Services.AddSwaggerGen(o =>
{
    o.AddSecurityDefinition(
        "Bearer",
        new Microsoft.OpenApi.Models.OpenApiSecurityScheme
        {
            Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
        }
    );
    o.AddSecurityRequirement(
        new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
        {
            [
                new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Reference = new Microsoft.OpenApi.Models.OpenApiReference
                    {
                        Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                        Id = "Bearer",
                    },
                }
            ] = Array.Empty<string>(),
        }
    );
    o.OperationFilter<SwaggerClientHeaderFilter>();
});
builder.Services.AddScoped<IExpertApplicationService, ExpertApplicationService>();
builder.Services.AddMemoryCache();
builder.Services.Configure<EmailPolicyOptions>(builder.Configuration.GetSection("EmailPolicy"));
builder.Services.AddSingleton<IEmailDomainPolicy, EmailDomainPolicy>();
builder
    .Services.AddOptions<StorageOptions>()
    .Bind(builder.Configuration.GetSection("Storage"))
    .Validate(
        x => !string.IsNullOrEmpty(x.AccessKey) && !string.IsNullOrEmpty(x.SecretKey),
        "Storage:AccessKey and Storage:SecretKey are required."
    )
    .Validate(
        x => builder.Environment.IsDevelopment() || !x.CreateBucket,
        "Storage:CreateBucket may only be enabled in Development."
    )
    .ValidateOnStart();
builder.Services.AddSingleton<IObjectStorage, S3ObjectStorage>();
builder.Services.AddSingleton(TimeProvider.System);
builder
    .Services.AddOptions<AuthOptions>()
    .Bind(builder.Configuration.GetSection("Auth"))
    .Validate(
        x =>
            x.AccessMinutes > 0
            && x.AccessMinutes <= 60
            && x.RefreshDays > 0
            && x.MaxFailedAttempts > 0
            && x.LockoutMinutes > 0
            && x.EmailCooldownSeconds > 0
            && x.VerificationMinutes > 0
            && x.ResetMinutes > 0,
        "Invalid Auth expiration or security options."
    )
    .Validate(
        x =>
            Uri.TryCreate(x.FrontendUrl, UriKind.Absolute, out var u)
            && (u.Scheme == "http" || u.Scheme == "https"),
        "Auth:FrontendUrl must be absolute."
    )
    .Validate(
        x => builder.Environment.IsDevelopment() || x.SecureCookie,
        "Secure cookies are required outside Development."
    )
    .ValidateOnStart();
var dataProtection = builder.Services.AddDataProtection().SetApplicationName("caps-auth");
var keys = builder.Configuration["Auth:DataProtectionKeysPath"];
if (!string.IsNullOrEmpty(keys))
    dataProtection.PersistKeysToFileSystem(new DirectoryInfo(keys));
if (!builder.Environment.IsDevelopment() && string.IsNullOrEmpty(keys))
    throw new InvalidOperationException(
        "Auth:DataProtectionKeysPath is required for durable email outbox keys."
    );
if (
    !builder.Environment.IsDevelopment()
    && (builder.Configuration["Jwt:Key"]?.StartsWith("CHANGE_ME") != false)
)
    throw new InvalidOperationException("Configure a real Jwt:Key outside Development.");
if (builder.Configuration.GetValue("Auth:EmailPublisherEnabled", true))
{
    builder.Services.AddCapsMessaging(builder.Configuration);
    builder.Services.AddHostedService<AuthEmailPublisher>();
}
else if (!builder.Environment.IsDevelopment())
    throw new InvalidOperationException("Email publishing may only be disabled in Development.");
var pg =
    builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");
builder.Services.AddAuthApplication();
builder.Services.AddAuthInfrastructure(pg);
builder.Services.AddHealthChecks().AddDbContextCheck<AuthDbContext>("postgres");
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    foreach (
        var proxy in builder.Configuration.GetSection("Auth:KnownProxies").Get<string[]>() ?? []
    )
        o.KnownProxies.Add(System.Net.IPAddress.Parse(proxy));
});
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        context.Request.Path.StartsWithSegments("/api/v1/auth")
            ? RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 30,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                }
            )
            : RateLimitPartition.GetNoLimiter("other")
    );
});
var app = builder.Build();
if (app.Environment.IsDevelopment() && builder.Configuration.GetValue("Auth:ApplyMigrations", true))
{
    DbInitializer.EnsureDatabaseCreated(pg, "identity");
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AuthDbContext>().Database.Migrate();
}
app.UseForwardedHeaders();
app.UseRouting();
app.UseAuthentication();
app.UseMiddleware<AuthBoundaryMiddleware>();
app.UseRateLimiter();
app.UseCommonApi();
app.Run();

public partial class Program { }
