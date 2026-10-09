using billing.Data;
using Caps.Common.Database;
using Caps.Common.Extensions;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCommonApi(builder.Configuration, "billing");

var pg = builder.Configuration.GetConnectionString("Postgres")
    ?? builder.Configuration["ConnectionStrings:Postgres"]
    ?? "Host=localhost;Port=5432;Database=shft_db;Username=postgres;Password=postgres";

builder.Services.AddDbContext<BillingDbContext>(o =>
    o.UseNpgsql(pg, npgsqlOptions =>
        npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory_Billing", "billing")));

builder.Services.AddHealthChecks().AddDbContextCheck<BillingDbContext>("postgres");

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    DbInitializer.EnsureDatabaseCreated(pg, "billing");

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<BillingDbContext>();
    db.Database.Migrate();
}

app.UseCommonApi();
app.Run();
