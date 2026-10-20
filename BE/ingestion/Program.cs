using Caps.Common.Api;
using Caps.Common.Messaging;
using Caps.Common.Persistence;
using Caps.Ingestion.Data;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var postgres = config.GetRequiredConnectionString("Postgres");

builder.Services.AddCommonApi(config, "ingestion");
builder.Services.AddServiceDatabase<IngestionDbContext>(postgres, "Ingestion", "knowledge");

// Publishes requests for the Python crawler worker (crawler/worker.py); nothing is consumed here
builder.Services.AddCapsMessaging(config);
builder.Services.AddHandlersFromAssembly(typeof(Program).Assembly);

var app = builder.Build();
app.MigrateInDevelopment<IngestionDbContext>();
app.UseCommonApi();
app.Run();
