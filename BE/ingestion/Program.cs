using Caps.Common.Api;
using Caps.Common.Messaging;
using Caps.Common.Persistence;
using Caps.Ingestion.Configuration;
using Caps.Ingestion.Data;
using Caps.Ingestion.Realtime;
using Caps.Ingestion.Security;
using Caps.Ingestion.Services;
using Caps.Ingestion.Services.Interfaces;
using ingestion.Services.Interfaces;

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
    var aiBaseUrl = builder.Configuration["AiService:BaseUrl"] ?? "http://localhost:8000";
    var aiInternalKey = builder.Configuration["AiService:InternalKey"];
    client.BaseAddress = new Uri(aiBaseUrl);
    client.Timeout = TimeSpan.FromMinutes(10); // Extended timeout for chunking and embedding tasks
    if (!string.IsNullOrWhiteSpace(aiInternalKey))
    {
        client.DefaultRequestHeaders.Add(RequireInternalKeyAttribute.Header, aiInternalKey);
    }
});

builder.Services.AddScoped<IKnowledgeDocumentStore, EfKnowledgeDocumentStore>();
builder.Services.AddScoped<IKnowledgeDocumentService, KnowledgeDocumentService>();

var app = builder.Build();
app.MigrateInDevelopment<IngestionDbContext>();
app.UseCommonApi();
app.MapHub<CrawlJobsHub>(IngestionRealtimeSetup.CrawlJobsHubPath);
app.Run();
