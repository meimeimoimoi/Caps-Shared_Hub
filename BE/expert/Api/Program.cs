using Caps.Common.Api;
using Caps.Common.Persistence;
using Caps.Expert.Api;
using Caps.Expert.Api.Configuration;
using Caps.Expert.Infrastructure;
using Caps.Expert.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var env = builder.Environment;
var postgres = config.GetRequiredConnectionString("Postgres");

builder.Services.AddCommonApi(config, "expert");
builder.Services.AddExpertStorage(config, env);
builder.Services.AddExpertApplication();
builder.Services.AddExpertInfrastructure(postgres);

var app = builder.Build();
app.MigrateInDevelopment<ExpertDbContext>();
app.UseCommonApi();
app.Run();

/// <summary>Entry point type, public so integration tests can host the API.</summary>
public partial class Program;
