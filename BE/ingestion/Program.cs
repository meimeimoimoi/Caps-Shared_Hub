using Caps.Common.Database;
using Caps.Common.Extensions;
using ingestion.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCommonApi(builder.Configuration, "ingestion");

var pg = builder.Configuration.GetConnectionString("Postgres")
    ?? builder.Configuration["ConnectionStrings:Postgres"]
    ?? "Host=localhost;Port=5432;Database=shft_db;Username=postgres;Password=postgres";

builder.Services.AddDbContext<IngestionDbContext>(o =>
    o.UseNpgsql(pg, npgsqlOptions =>
        npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory_Ingestion", "knowledge")));

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
