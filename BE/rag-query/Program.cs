using Caps.Common.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCommonApi(builder.Configuration, "rag-query");
var app = builder.Build();
app.UseCommonApi();
app.Run();
