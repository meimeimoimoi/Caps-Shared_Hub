using System.Net;
using Caps.RagQuery.Controllers;
using Caps.RagQuery.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using static Caps.RagQuery.Dtos.RagQueryDtos;

namespace Caps.RagQuery.UnitTests;

public sealed class InternalRagControllerTests
{
    [Fact]
    public async Task Blank_question_returns_bad_request_without_calling_ai()
    {
        var ai = new FakeChatAiClient();
        var controller = new InternalRagController(ai, NullLogger<InternalRagController>.Instance);

        var action = await controller.Query(new RagQueryRequest("   "), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(action);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        Assert.Null(ai.LastRequest);
    }

    [Fact]
    public async Task Upstream_timeout_returns_504_gateway_timeout()
    {
        var ai = new FakeChatAiClient
        {
            Error = new HttpRequestException("Timed out", null, HttpStatusCode.GatewayTimeout),
        };
        var controller = new InternalRagController(ai, NullLogger<InternalRagController>.Instance);

        var action = await controller.Query(
            new RagQueryRequest("Thue TNDN?"),
            CancellationToken.None
        );

        var statusResult = Assert.IsType<ObjectResult>(action);
        Assert.Equal(StatusCodes.Status504GatewayTimeout, statusResult.StatusCode);
    }

    [Fact]
    public async Task Upstream_http_failure_returns_503_service_unavailable()
    {
        var ai = new FakeChatAiClient
        {
            Error = new HttpRequestException("Bad gateway", null, HttpStatusCode.BadGateway),
        };
        var controller = new InternalRagController(ai, NullLogger<InternalRagController>.Instance);

        var action = await controller.Query(
            new RagQueryRequest("Thue TNDN?"),
            CancellationToken.None
        );

        var statusResult = Assert.IsType<ObjectResult>(action);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, statusResult.StatusCode);
    }

    private sealed class FakeChatAiClient : IChatAiClient
    {
        public RagQueryRequest? LastRequest { get; private set; }
        public Exception? Error { get; set; }

        public Task<RagQueryResponse> QueryAsync(
            RagQueryRequest request,
            CancellationToken cancellationToken = default
        )
        {
            LastRequest = request;
            if (Error is not null)
            {
                throw Error;
            }
            return Task.FromResult(
                new RagQueryResponse("IN_SCOPE", "ANSWERED", null, null, "OK", [])
            );
        }
    }
}
