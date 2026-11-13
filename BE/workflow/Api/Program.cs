using Caps.Common.Api;
using Caps.Common.Persistence;
using Caps.Workflow.Api;
using Caps.Workflow.Api.Configuration;
using Caps.Workflow.Api.Realtime;
using Caps.Workflow.Infrastructure;
using Caps.Workflow.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var postgres = config.GetRequiredConnectionString("Postgres");

builder.Services.AddCommonApi(config, "workflow");
builder.Services.AddWorkflowApplication();
builder.Services.AddWorkflowInfrastructure(postgres);
builder.Services.AddWorkflowServiceLinks(config);
builder.Services.AddWorkflowRealtime();
builder.Services.AddWorkflowStorage(config, builder.Environment);
builder.Services.AddWorkflowNotifications(config, builder.Environment);

var app = builder.Build();
app.MigrateInDevelopment<WorkflowDbContext>();
app.UseCommonApi();
app.MapHub<CaseChatHub>(WorkflowRealtimeSetup.CaseChatHubPath);
app.Run();
