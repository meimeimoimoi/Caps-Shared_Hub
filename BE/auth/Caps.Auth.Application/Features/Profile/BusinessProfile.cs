using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain;
using Caps.Auth.Domain.Users;
using Caps.Common.Application;
using BusinessProfileEntity = Caps.Auth.Domain.Business.BusinessProfile;

namespace Caps.Auth.Application.Features.Profile;

public sealed record GetBusinessProfileQuery(Guid UserId);

public sealed record UpdateBusinessProfileCommand(
    Guid UserId,
    string CompanyName,
    string TaxCode,
    string? Address,
    string? Representative,
    string? ContactEmail,
    string? ContactPhone
);

public sealed class GetBusinessProfileHandler(
    IUserRepository users,
    IBusinessProfileRepository profiles
) : IQueryHandler<GetBusinessProfileQuery, BusinessResponse?>
{
    public async Task<BusinessResponse?> HandleAsync(
        GetBusinessProfileQuery query,
        CancellationToken ct
    )
    {
        await BusinessAccess.EnsureAsync(users, query.UserId, ct);
        var profile = await profiles.GetAsync(query.UserId, ct);
        return profile == null ? null : BusinessAccess.ToResponse(profile);
    }
}

public sealed class UpdateBusinessProfileHandler(
    IUserRepository users,
    IBusinessProfileRepository profiles,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<UpdateBusinessProfileCommand, BusinessResponse>
{
    public async Task<BusinessResponse> HandleAsync(
        UpdateBusinessProfileCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await users.GetLockedAsync(command.UserId, ct);
        await BusinessAccess.EnsureAsync(users, command.UserId, ct);
        var profile = await profiles.GetAsync(command.UserId, ct);
        if (profile == null)
        {
            profile = new BusinessProfileEntity { UserId = command.UserId };
            profiles.Add(profile);
        }
        profile.Update(
            command.CompanyName,
            command.TaxCode,
            command.Address,
            command.Representative,
            command.ContactEmail,
            command.ContactPhone,
            clock.GetUtcNow()
        );
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return BusinessAccess.ToResponse(profile);
    }
}

/// <summary>Business profiles belong to active customer accounts (USER role) only.</summary>
internal static class BusinessAccess
{
    public static async Task EnsureAsync(IUserRepository users, Guid userId, CancellationToken ct)
    {
        AccountGuards.EnsureActive(await users.GetAsync(userId, ct));
        if (!await users.HasRoleAsync(userId, RoleCodes.User, ct))
            throw AuthErrors.UserRoleRequired();
    }

    public static BusinessResponse ToResponse(BusinessProfileEntity b) =>
        new(b.CompanyName, b.TaxCode, b.Address, b.Representative, b.ContactEmail, b.ContactPhone);
}
