using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Application.Abstractions.Documents;
public interface IOllamaDraftService
{
    Task<string> GenerateDraftAsync(
        string title,
        DateOnly periodStart,
        DateOnly periodEnd,
        string snapshotData,
        string? templateSchema,
        string? citations,
        CancellationToken ct = default);
}
