using Caps.Common.Api;
using Caps.Workflow.Api;
using Caps.Workflow.Api.Configuration;
using Caps.Workflow.Infrastructure;
using Caps.Workflow.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var postgres =
    config.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");

builder.Services.AddCommonApi(config, "workflow");
builder.Services.AddWorkflowApplication();
builder.Services.AddWorkflowInfrastructure(postgres);
builder.Services.AddHealthChecks().AddDbContextCheck<WorkflowDbContext>("postgres");

var app = builder.Build();
app.UseWorkflowPipeline(postgres);
app.Run();
