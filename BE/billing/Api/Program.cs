using Caps.Billing.Api;
using Caps.Billing.Api.Configuration;
using Caps.Billing.Infrastructure;
using Caps.Billing.Infrastructure.Persistence;
using Caps.Common.Api;
using Caps.Common.Persistence;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var postgres = config.GetRequiredConnectionString("Postgres");

builder.Services.AddCommonApi(config, "billing");
builder.Services.AddBillingSecrets(config, builder.Environment);
builder.Services.AddBillingPayments(config);
builder.Services.AddBillingApplication();
builder.Services.AddBillingInfrastructure(postgres);

var app = builder.Build();
app.MigrateInDevelopment<BillingDbContext>();
app.UseCommonApi();
app.Run();
