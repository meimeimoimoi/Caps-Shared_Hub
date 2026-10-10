using Caps.Common.Database;
using Caps.Common.Extensions;
using Microsoft.EntityFrameworkCore;
using workflow.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCommonApi(builder.Configuration, "workflow");

var pg = builder.Configuration.GetConnectionString("Postgres")
    ?? builder.Configuration["ConnectionStrings:Postgres"]
    ?? "Host=localhost;Port=5432;Database=shft_db;Username=postgres;Password=postgres";

builder.Services.AddDbContext<WorkflowDbContext>(o =>
    o.UseNpgsql(pg, npgsqlOptions =>
        npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory_Workflow", "workspace")));

builder.Services.AddHealthChecks().AddDbContextCheck<WorkflowDbContext>("postgres");

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    DbInitializer.EnsureDatabaseCreated(pg, "workspace", "review");

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<WorkflowDbContext>();
    db.Database.Migrate();
}

app.UseCommonApi();
app.Run();
