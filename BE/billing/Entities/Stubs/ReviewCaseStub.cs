namespace billing.Entities.Stubs;

/// <summary>
/// Stub entity referencing the 'review_case' table in the 'review' schema.
/// Excluded from billing migrations to enforce cross-schema foreign keys.
/// </summary>
public sealed class ReviewCaseStub
{
    public Guid Id { get; set; }
}
