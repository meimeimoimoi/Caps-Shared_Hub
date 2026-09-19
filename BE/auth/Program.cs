using auth.Data;
using auth.Services;
using auth.Services.Interface;
using Caps.Common.Extensions;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCommonApi(builder.Configuration, "auth");
builder.Services.AddScoped<IAuthService, AuthService>();

var pg = builder.Configuration.GetConnectionString("Postgres")
    ?? builder.Configuration["ConnectionStrings:Postgres"];
builder.Services.AddDbContext<AuthDbContext>(o => o.UseNpgsql(pg));
builder.Services.AddHealthChecks().AddDbContextCheck<AuthDbContext>("postgres");

var app = builder.Build();

// Dev-only: ensure schema exists without requiring `dotnet ef migrations` in arch phase.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    db.Database.EnsureCreated();
}

app.UseCommonApi();
app.Run();
