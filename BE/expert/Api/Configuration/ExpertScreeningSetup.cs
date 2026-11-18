using Caps.Common.Security;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Infrastructure.Ai;
using Microsoft.Extensions.Options;

namespace Caps.Expert.Api.Configuration;

/// <summary>Configures the internal ai-service client and background Gate 1 screening worker.</summary>
public static class ExpertScreeningSetup
{
    /// <summary>Registers the CV screening HTTP client and optional background extraction worker.</summary>
    public static IServiceCollection AddExpertScreening(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        services.Configure<AiServiceOptions>(config.GetSection("AiService"));
        services.AddHttpClient<IAiCvScreeningClient, AiCvScreeningClient>(
            (sp, client) =>
            {
                var opts = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;
                var baseUrl = string.IsNullOrWhiteSpace(opts.BaseUrl)
                    ? "http://localhost:8000"
                    : opts.BaseUrl;
                client.BaseAddress = new Uri(baseUrl);
                client.Timeout = TimeSpan.FromSeconds(Math.Clamp(opts.TimeoutSeconds, 10, 600));
                if (!string.IsNullOrWhiteSpace(opts.InternalKey))
                {
                    client.DefaultRequestHeaders.Add(
                        RequireInternalKeyAttribute.Header,
                        opts.InternalKey
                    );
                }
            }
        );

        if (config.GetValue("Expert:ScreeningWorkerEnabled", true))
            services.AddHostedService<EvidenceScreeningWorker>();

        return services;
    }
}
