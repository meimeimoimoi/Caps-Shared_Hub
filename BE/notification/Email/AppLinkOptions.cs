using System.ComponentModel.DataAnnotations;

namespace Caps.Notification.Email;

/// <summary>Where the web app runs, so emails can link back to it.</summary>
public sealed class AppLinkOptions
{
    [Required, Url]
    public string WebBaseUrl { get; set; } = default!;

    public string Link(string path) => WebBaseUrl.TrimEnd('/') + path;
}
