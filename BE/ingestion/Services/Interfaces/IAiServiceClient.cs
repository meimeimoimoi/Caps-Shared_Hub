using static Caps.Ingestion.Dtos.AiServiceDtos;

namespace ingestion.Services.Interfaces;

public interface IAiServiceClient
{
    Task<AiIngestResponseDto> ChunkAndEmbedAsync(
        AiIngestRequestDto req,
        CancellationToken cancellationToken = default
    );
}
