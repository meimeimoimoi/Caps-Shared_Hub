using Caps.Common.Api;
using Caps.Expert.Api;
using Caps.Expert.Api.Configuration;
using Caps.Expert.Infrastructure;
using Caps.Expert.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var env = builder.Environment;
var postgres =
    config.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");

builder.Services.AddCommonApi(config, "expert");
builder.Services.AddExpertSwagger();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddExpertStorage(config, env);
builder.Services.AddExpertApplication();
builder.Services.AddExpertInfrastructure(postgres);
builder.Services.AddHealthChecks().AddDbContextCheck<ExpertDbContext>("postgres");

var app = builder.Build();
app.UseExpertPipeline(postgres);
app.Run();

public partial class Program { }
