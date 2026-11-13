using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.SignalR;

namespace Caps.Ingestion.Realtime;

/// <summary>Server-to-client only: pushes crawl job changes to knowledge admins.</summary>
[RequirePermission(Permission.KnowledgeManage)]
public sealed class CrawlJobsHub : Hub;
