using Caps.Auth.Api;
using Caps.Auth.Api.Configuration;
using Caps.Auth.Infrastructure;
using Caps.Auth.Infrastructure.Persistence;
using Caps.Common.Api;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var env = builder.Environment;
var postgres =
    config.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");

builder.Services.AddCommonApi(config, "auth");
builder.Services.AddAuthSwagger();
builder.Services.AddAuthSettings(config, env);
builder.Services.AddAuthSecrets(config, env);
builder.Services.AddAuthEmail(config, env);
builder.Services.AddExpertApplications(config, env);
builder.Services.AddAuthApplication();
builder.Services.AddAuthInfrastructure(postgres);
builder.Services.AddHealthChecks().AddDbContextCheck<AuthDbContext>("postgres");
builder.Services.AddAuthEdge(config);

var app = builder.Build();
app.UseAuthPipeline(postgres);
app.Run();

public partial class Program { }
