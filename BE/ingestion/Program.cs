using Caps.Common.Api;
using Caps.Common.Persistence;
using Caps.Ingestion.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCommonApi(builder.Configuration, "ingestion");

var pg =
    builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");

builder.Services.AddDbContext<IngestionDbContext>(o =>
    o.UseNpgsql(
        pg,
        npgsqlOptions =>
            npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory_Ingestion", "knowledge")
    )
);

builder.Services.AddHealthChecks().AddDbContextCheck<IngestionDbContext>("postgres");

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    DbInitializer.EnsureDatabaseCreated(pg, "knowledge");

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<IngestionDbContext>();
    db.Database.Migrate();
}

app.UseCommonApi();
app.Run();
