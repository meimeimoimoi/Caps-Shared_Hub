using Caps.Auth.Api;
using Caps.Auth.Api.Configuration;
using Caps.Auth.Infrastructure;
using Caps.Auth.Infrastructure.Persistence;
using Caps.Common.Api;
using Caps.Common.Persistence;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var env = builder.Environment;
var postgres = config.GetRequiredConnectionString("Postgres");

builder.Services.AddCommonApi(config, "auth");
builder.Services.AddAuthSwagger();
builder.Services.AddAuthSettings(config, env);
builder.Services.AddAuthSecrets(config, env);
builder.Services.AddAuthEmail(config, env);
builder.Services.AddAuthApplication();
builder.Services.AddAuthInfrastructure(postgres);
builder.Services.AddAuthEdge(config);

var app = builder.Build();
app.MigrateInDevelopment<AuthDbContext>();
app.UseAuthPipeline();
app.Run();

/// <summary>Entry point type, public so integration tests can host the API.</summary>
public partial class Program;
