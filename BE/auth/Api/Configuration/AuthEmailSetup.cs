using Caps.Auth.Application.Abstractions;
using Caps.Auth.Infrastructure.Email;
using Caps.Auth.Infrastructure.Messaging;
using Caps.Common.Messaging;

namespace Caps.Auth.Api.Configuration;

/// <summary>Email deliverability checks and publishing queued emails to RabbitMQ.</summary>
public static class AuthEmailSetup
{
    /// <summary>Deliverability check at sign-up and the outbox publisher that hands emails to RabbitMQ.</summary>
    public static IServiceCollection AddAuthEmail(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment env
    )
    {
        services.AddMemoryCache();
        services.Configure<EmailPolicyOptions>(config.GetSection("EmailPolicy"));
        services.AddSingleton<IEmailDomainPolicy, EmailDomainPolicy>();
        if (config.GetValue("Auth:EmailPublisherEnabled", true))
        {
            services.AddCapsMessaging(config);
            services.AddHostedService<AuthEmailPublisher>();
            // Account status changes share the broker connection (expert keeps a copy for the Marketplace)
            services.AddHostedService<AccountEventPublisher>();
        }
        else if (!env.IsDevelopment())
        {
            throw new InvalidOperationException(
                "Email publishing may only be disabled in Development."
            );
        }

        return services;
    }
}
