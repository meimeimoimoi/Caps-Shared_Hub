namespace Caps.Expert.Domain.Applications;

/// <summary>
/// One statement the applicant agrees to when submitting, stored word for word with its language because the
/// wording may change later. The server owns the wording; the client only sends the code.
/// </summary>
public sealed record Declaration(string Code, string Language, string Text);

/// <summary>Codes of the statements an applicant can agree to.</summary>
public static class DeclarationCodes
{
    /// <summary>The information in the application is accurate and complete.</summary>
    public const string Accuracy = "ACCURACY";

    /// <summary>Professional ethics and confidentiality in one statement; supports EV-04 and EV-05.</summary>
    public const string ProfessionalConduct = "PROFESSIONAL_CONDUCT";
}
