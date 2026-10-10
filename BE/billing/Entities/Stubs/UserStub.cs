namespace billing.Entities.Stubs;

/// <summary>
/// Stub entity referencing the 'users' table in the 'identity' schema.
/// Excluded from billing migrations to enforce cross-schema foreign keys.
/// </summary>
public sealed class UserStub
{
    public Guid Id { get; set; }
}
