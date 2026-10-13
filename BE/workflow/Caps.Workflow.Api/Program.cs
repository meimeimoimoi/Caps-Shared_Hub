using Caps.Workflow.Api;
using Caps.Workflow.Infrastructure;
using Caps.Workflow.Infrastructure.Persistence;
using Caps.Common.Api;
using Caps.Common.Persistence;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var postgres = config.GetRequiredConnectionString("Postgres");

builder.Services.AddCommonApi(config, "workflow");
builder.Services.AddWorkflowApplication();
builder.Services.AddWorkflowInfrastructure(postgres);

var app = builder.Build();
app.MigrateInDevelopment<WorkflowDbContext>();
app.UseCommonApi();
app.Run();
