using Caps.Common.Api;
using Caps.Billing.Api;
using Caps.Billing.Api.Configuration;
using Caps.Billing.Infrastructure;
using Caps.Billing.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var postgres =
    config.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");

builder.Services.AddCommonApi(config, "billing");
builder.Services.AddBillingApplication();
builder.Services.AddBillingInfrastructure(postgres);
builder.Services.AddHealthChecks().AddDbContextCheck<BillingDbContext>("postgres");

var app = builder.Build();
app.UseBillingPipeline(postgres);
app.Run();
