namespace rag_query.Services.Interface;

public interface IChatAiClient
{
    Task<PythonChatResponse> QueryAiAsync(string question, string? userTaxPeriod, CancellationToken ct = default);
}
