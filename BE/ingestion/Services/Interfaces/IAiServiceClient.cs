using static Caps.Ingestion.Dtos.AiServiceDtos;

namespace Caps.Ingestion.Services.Interfaces;

public interface IAiServiceClient
{
    Task<AiIngestResponseDto> ChunkAndEmbedAsync(
        AiIngestRequestDto req,
        CancellationToken cancellationToken = default
    );
}
