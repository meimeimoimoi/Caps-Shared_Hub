using Caps.Common.Api;
using Caps.Common.Messaging;
using Caps.Common.Persistence;
using Caps.Ingestion.Configuration;
using Caps.Ingestion.Data;
using Caps.Ingestion.Realtime;
using Caps.Ingestion.Services;
using Caps.Ingestion.Services.Interfaces;

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

builder.Services.AddHttpClient<IAiServiceClient, AiServiceClient>(client =>
{
   var aiBaseUrl = builder.Configuration["AiService:BaseUrl"] ?? "http://localhost:5174";
   client.BaseAddress = new Uri(aiBaseUrl);
   client.Timeout = TimeSpan.FromMinutes(10); // Tăng timeout cho tác vụ embedding
});

builder.Services.AddScoped<IKnowledgeDocumentService, KnowledgeDocumentService>();

var app = builder.Build();
app.MigrateInDevelopment<IngestionDbContext>();
app.UseCommonApi();
app.MapHub<CrawlJobsHub>(IngestionRealtimeSetup.CrawlJobsHubPath);
app.Run();
