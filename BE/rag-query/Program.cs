using Caps.Common.Api;
using Caps.Common.Security;
using Caps.RagQuery.Options;
using Caps.RagQuery.Services;
using Caps.RagQuery.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCommonApi(builder.Configuration, "rag-query");

builder.Services.Configure<AiServiceOptions>(
    builder.Configuration.GetSection(AiServiceOptions.SectionName)
);

builder.Services.AddHttpClient<IChatAiClient, ChatAiClient>(
    (serviceProvider, httpClient) =>
    {
        var options =
            builder.Configuration.GetSection(AiServiceOptions.SectionName).Get<AiServiceOptions>()
            ?? new AiServiceOptions();

        httpClient.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
        httpClient.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
        httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
        if (!string.IsNullOrWhiteSpace(options.InternalKey))
        {
            httpClient.DefaultRequestHeaders.Add(
                RequireInternalKeyAttribute.Header,
                options.InternalKey
            );
        }
    }
);

builder.Services.AddControllers();

var app = builder.Build();

app.UseCommonApi();

app.MapControllers();

app.Run();
