using Caps.RagQuery.Services.Interface;
using Microsoft.AspNetCore.Mvc;
using rag_query.Services.Interface;
using static Caps.RagQuery.Dtos.RagQueryDtos;

namespace Caps.RagQuery.Controllers;

[ApiController]
[Route("api/v1/internal/rag")]
public class InternalRagController : ControllerBase
{
    private readonly IChatAiClient _chatAiClient;
    private readonly ILogger<InternalRagController> _logger;
    public InternalRagController(IChatAiClient chatAiClient, ILogger<InternalRagController> logger)
    {
        _chatAiClient = chatAiClient;
        _logger = logger;
    }

    /// <summary>
    /// Processes RAG queries received from internal services (e.g. Workflow service).
    /// </summary>
    [HttpPost("query")]
    [ProducesResponseType(typeof(RagQueryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    [ProducesResponseType(StatusCodes.Status504GatewayTimeout)]
    public async Task<IActionResult> Query([FromBody] RagQueryRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
        {
            return BadRequest(new { message = "Question field cannot be empty." });
        }

        try
        {
            var result = await _chatAiClient.QueryAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.GatewayTimeout)
        {
            return StatusCode(StatusCodes.Status504GatewayTimeout, new { message = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Error communicating with upstream AI service.");
            return StatusCode(StatusCodes.Status502BadGateway, new { message = "Failed to communicate with AI Service.", detail = ex.Message });
        }
    }
}
