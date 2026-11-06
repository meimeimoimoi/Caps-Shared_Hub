using Caps.Workflow.Domain.Workspace;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Application.Abstractions;
public interface IAiUsageRepository
{
    Task AddAsync(AiUsage usage, CancellationToken ct = default);
}
