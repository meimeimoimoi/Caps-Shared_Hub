using Caps.Common.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCommonApi(builder.Configuration, "read");
var app = builder.Build();
app.UseCommonApi();
app.Run();
