using Caps.Common.Api;
using Caps.Common.Messaging;
using Caps.Common.Persistence;
using Caps.Ingestion.Configuration;
using Caps.Ingestion.Data;
using Caps.Ingestion.Realtime;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var postgres = config.GetRequiredConnectionString("Postgres");

builder.Services.AddCommonApi(config, "ingestion");
builder.Services.AddServiceDatabase<IngestionDbContext>(postgres, "Ingestion", "knowledge");
builder.Services.AddIngestionStorage(config, builder.Environment);
builder.Services.AddIngestionRealtime();

// Publishes requests for the Python crawler worker (crawler/worker.py); nothing is consumed here
builder.Services.AddCapsMessaging(config);
builder.Services.AddHandlersFromAssembly(typeof(Program).Assembly);

var app = builder.Build();
app.MigrateInDevelopment<IngestionDbContext>();
app.UseCommonApi();
app.MapHub<CrawlJobsHub>(IngestionRealtimeSetup.CrawlJobsHubPath);
app.Run();
