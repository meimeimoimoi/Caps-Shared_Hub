using auth.Data;
using auth.Services;
using auth.Services.Interface;
using Caps.Common.Database;
using Caps.Common.Extensions;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCommonApi(builder.Configuration, "auth");
builder.Services.AddScoped<IAuthService, AuthService>();

var pg = builder.Configuration.GetConnectionString("Postgres")
    ?? builder.Configuration["ConnectionStrings:Postgres"]
    ?? "Host=localhost;Port=5432;Database=shft_db;Username=postgres;Password=postgres";

builder.Services.AddDbContext<AuthDbContext>(o =>
    o.UseNpgsql(pg, npgsqlOptions =>
        npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory_Auth", "identity")));

builder.Services.AddHealthChecks().AddDbContextCheck<AuthDbContext>("postgres");

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    DbInitializer.EnsureDatabaseCreated(pg, "identity");

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    db.Database.Migrate();
}

app.UseCommonApi();
app.Run();
