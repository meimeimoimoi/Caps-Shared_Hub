namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>The price (whole VND, steps of 1,000) and delivery time in hours for one service.</summary>
public sealed record SetServiceRequest(long Fee, int TurnaroundHours);

/// <summary>The platform's share of one service, 0-99 percent.</summary>
public sealed record SetPlatformFeeRequest(int Percent);
