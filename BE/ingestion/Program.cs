using Caps.Common.Api;
using Caps.Common.Persistence;
using Caps.Ingestion.Data;
using Caps.Ingestion.Services.Interface;
using Caps.Ingestion.Services;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var postgres = config.GetRequiredConnectionString("Postgres");

builder.Services.AddCommonApi(config, "ingestion");
builder.Services.AddServiceDatabase<IngestionDbContext>(postgres, "Ingestion", "knowledge");

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
app.Run();
