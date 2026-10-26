using System.Security.Claims;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Ingestion.Dtos;
using Caps.Ingestion.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Metadata.Internal;

namespace Caps.Ingestion.Controllers
{
    [Route("api/v1/knowledge/documents")]
    [ApiController]
    [RequirePermission(Permission.KnowledgeManage)]
    public class KnowledgeDocumentController : ControllerBase
    {
        private readonly IKnowledgeDocumentService _docService;

        public KnowledgeDocumentController(IKnowledgeDocumentService docService)
        {
            _docService = docService;
        }

        /// <summary>
        /// Phê duyệt văn bản (PENDING -> APPROVED -> INDEXED vào Qdrant)
        /// </summary>
        [HttpPost("{id}/approve")]
        public async Task<ActionResult<DocumentActionResponseDto>> ApproveDocument(Guid id, CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            try
            {
               var result = await _docService.ApproveAsync(id, userId, cancellationToken);
               return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new {error = ex.Message});
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new {error = ex.Message});
            }
        }

        /// <summary>
        /// Thử lại việc Index vào Qdrant khi trạng thái là INDEX_FAILED
        /// </summary>
        [HttpPost("{id:guid}/retry-index")]
        public async Task<ActionResult<DocumentActionResponseDto>> RetryIndex(Guid id, CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            try
            {
               var result = await _docService.RetryIndexAsync(id, userId, cancellationToken);
               return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new {error = ex.Message});
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new {error = ex.Message});
            }
        }

        /// <summary>
        /// Lấy thông tin ID người dùng hiện tại từ JWT token
        /// </summary>
        private Guid GetCurrentUserId()
        {
            var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            return Guid.TryParse(sub, out var guid) ? guid : Guid.Empty;
        }
        
    }
}
