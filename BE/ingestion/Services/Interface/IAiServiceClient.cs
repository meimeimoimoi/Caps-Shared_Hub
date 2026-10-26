using static Caps.Ingestion.Dtos.AiServiceDtos;

namespace ingestion.Services.Interface;

public interface IAiServiceClient
{
    Task<AiIngestResponseDto> ChunkAndEmbedAsync(AiIngestRequestDto req, CancellationToken cancellationToken=default);
}
