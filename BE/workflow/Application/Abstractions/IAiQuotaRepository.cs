using Caps.Workflow.Domain.Workspace;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Application.Abstractions;
public interface IAiQuotaRepository
{
    Task<AiQuota?> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(AiQuota aiQuota, CancellationToken ct = default);
}
