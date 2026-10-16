using Microsoft.IdentityModel.Tokens;

namespace Caps.Common.Security;

/// <summary>Keys a host trusts without downloading them; auth registers the public half of its signing keys.</summary>
public interface ILocalValidationKeys
{
    IEnumerable<SecurityKey> Keys { get; }
}
