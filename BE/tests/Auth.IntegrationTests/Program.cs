using MassTransit;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using auth.Services;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using auth.Data;
using Caps.Common.Messaging;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

// Chỉ chạy trên DB test riêng. Không gửi email thật; đọc outbox đã mã hóa bằng key test.
var connection = Environment.GetEnvironmentVariable("AUTH_TEST_CONNECTION") ?? throw new Exception("AUTH_TEST_CONNECTION required.");
var keyPath = Environment.GetEnvironmentVariable("AUTH_TEST_KEYS") ?? throw new Exception("AUTH_TEST_KEYS required.");
var baseUrl = Environment.GetEnvironmentVariable("AUTH_TEST_URL") ?? "http://127.0.0.1:55190";
if (!new Npgsql.NpgsqlConnectionStringBuilder(connection).Database!.EndsWith("_test")) throw new Exception("Use a dedicated database ending _test.");
var options = new DbContextOptionsBuilder<AuthDbContext>().UseNpgsql(connection).Options;
var protector = DataProtectionProvider.Create(new DirectoryInfo(keyPath), x => x.SetApplicationName("caps-auth")).CreateProtector("AuthEmailOutbox.v1");
var passed = 0;
void Check(bool condition, string description) { if (!condition) throw new Exception("FAIL: " + description); Console.WriteLine("PASS: " + description); passed++; }
HttpClient Client() { var c = new HttpClient(new HttpClientHandler { UseCookies = false }) { BaseAddress = new Uri(baseUrl) }; c.DefaultRequestHeaders.Add("X-Caps-Client", "spa"); c.DefaultRequestHeaders.Add("Origin", "http://localhost:5173"); return c; }
async Task<(HttpResponseMessage Response, JsonElement Json)> Post(HttpClient c, string path, object body) { var r = await c.PostAsJsonAsync(path, body); var json = JsonDocument.Parse(await r.Content.ReadAsStringAsync()).RootElement.Clone(); return (r, json); }
string Access(JsonElement j) => j.GetProperty("data").GetProperty("accessToken").GetString()!;
string Refresh(HttpResponseMessage r) => r.Headers.GetValues("Set-Cookie").Single().Split(';')[0];
void Bearer(HttpClient c, string access) => c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", access);
async Task<string> EmailToken(string email, string purpose)
{
    await using var db = new AuthDbContext(options);
    var rows = await db.EmailOutbox.OrderByDescending(x => x.CreatedAt).ToListAsync();
    foreach (var row in rows) { var m = JsonSerializer.Deserialize<AuthEmailRequestedEvent>(protector.Unprotect(row.ProtectedPayload))!; if (m.Email == email && m.Purpose == purpose) return new Uri(m.Link).Query.Split("token=")[1]; }
    throw new Exception("Email outbox not found.");
}
using var c = Client();
var email = "flow-" + Guid.NewGuid().ToString("N") + "@caps.test";
var password = "Caps-auth-test-123!";
var reg = await Post(c, "/api/v1/auth/register", new { email, password, displayName = "Test User", role = "SYSTEM_ADMIN" });
Check(reg.Response.StatusCode == HttpStatusCode.OK, "register through YARP");
var userId = Guid.Parse(reg.Json.GetProperty("data").GetProperty("user").GetProperty("userId").GetString()!);
var initialAccess = Access(reg.Json); Bearer(c, initialAccess);
var initialRefresh = Refresh(reg.Response);
Check(reg.Response.Headers.GetValues("Set-Cookie").Single().Contains("httponly", StringComparison.OrdinalIgnoreCase), "refresh cookie HttpOnly");
await using (var db = new AuthDbContext(options)) {
    var u = await db.Users.FindAsync(userId);
    Check(u!.PasswordHash != password && u.PasswordHash.Length != 64, "password uses Identity hasher");
    Check(await db.UserRoles.Where(x => x.UserId == userId).Select(x => x.Role.Code).SingleAsync() == "USER", "register cannot self-assign admin");
    Check((await db.RefreshTokens.SingleAsync(x => x.UserId == userId)).TokenHash != initialRefresh.Split('=')[1], "refresh token stored as hash");
}
var dup = await Post(c, "/api/v1/auth/register", new { email = email.ToUpperInvariant(), password });
Check(dup.Response.StatusCode == HttpStatusCode.Conflict, "normalized duplicate rejected");
Check((await c.GetAsync("/api/v1/users/me")).IsSuccessStatusCode, "pending user can view own profile");
Check((await c.PutAsJsonAsync("/api/v1/users/me", new { displayName = "Changed" })).StatusCode == HttpStatusCode.Forbidden, "pending user denied business mutation");
var verify = await EmailToken(email, "VERIFY_EMAIL");
Check((await Post(c, "/api/v1/auth/verify-email", new { token = verify })).Response.IsSuccessStatusCode, "email verify activates user");
Check((await Post(c, "/api/v1/auth/verify-email", new { token = verify })).Response.StatusCode == HttpStatusCode.Unauthorized, "verification single use");
var login = await Post(c, "/api/v1/auth/login", new { email, password });
Check(login.Response.IsSuccessStatusCode, "active login");
var access = Access(login.Json); var cookie = Refresh(login.Response); Bearer(c, access);
Check((await c.PutAsJsonAsync("/api/v1/users/me", new { displayName = "Updated", phone = "+84901234567" })).IsSuccessStatusCode, "update own profile");
Check((await c.GetAsync("/api/v1/users/me/business-profile")).IsSuccessStatusCode, "get empty business profile");
Check((await c.PutAsJsonAsync("/api/v1/users/me/business-profile", new { companyName = "Caps", taxCode = "0123456789", address = "Test" })).IsSuccessStatusCode, "upsert business profile");
var bp = JsonDocument.Parse(await c.GetStringAsync("/api/v1/users/me/business-profile")).RootElement;
Check(bp.GetProperty("data").GetProperty("companyName").GetString() == "Caps", "read business profile");
c.DefaultRequestHeaders.Remove("Cookie"); c.DefaultRequestHeaders.Add("Cookie", cookie);
var refresh = await Post(c, "/api/v1/auth/refresh-token", new { });
Check(refresh.Response.IsSuccessStatusCode && Refresh(refresh.Response) != cookie, "refresh rotation");
var replay = await Post(c, "/api/v1/auth/refresh-token", new { });
Check(replay.Response.StatusCode == HttpStatusCode.Unauthorized, "refresh replay rejected");
Check((await c.GetAsync("/api/v1/users/me")).StatusCode == HttpStatusCode.Unauthorized, "replay revokes access via token version in auth service");
c.DefaultRequestHeaders.Remove("Cookie"); c.DefaultRequestHeaders.Authorization = null;
login = await Post(c, "/api/v1/auth/login", new { email, password }); Bearer(c, Access(login.Json)); cookie = Refresh(login.Response); c.DefaultRequestHeaders.Add("Cookie", cookie);
Check((await Post(c, "/api/v1/auth/logout", new { })).Response.IsSuccessStatusCode, "logout");
Check((await Post(c, "/api/v1/auth/refresh-token", new { })).Response.StatusCode == HttpStatusCode.Unauthorized, "logout refresh invalid");
c.DefaultRequestHeaders.Remove("Cookie"); c.DefaultRequestHeaders.Authorization = null;
Check((await Post(c, "/api/v1/auth/forgot-password", new { email })).Response.IsSuccessStatusCode, "forgot password");
var reset = await EmailToken(email, "RESET_PASSWORD");
Check((await Post(c, "/api/v1/auth/reset-password", new { token = reset, password = "New-caps-password-123!" })).Response.IsSuccessStatusCode, "reset password");
Check((await Post(c, "/api/v1/auth/reset-password", new { token = reset, password })).Response.StatusCode == HttpStatusCode.Unauthorized, "reset single use");
Check((await Post(c, "/api/v1/auth/login", new { email, password })).Response.StatusCode == HttpStatusCode.Unauthorized, "old password rejected");
Check((await Post(c, "/api/v1/auth/login", new { email, password = "New-caps-password-123!" })).Response.IsSuccessStatusCode, "new password works");
using var csrf = Client(); csrf.DefaultRequestHeaders.Remove("X-Caps-Client");
Check((await Post(csrf, "/api/v1/auth/refresh-token", new { })).Response.StatusCode == HttpStatusCode.Forbidden, "missing CSRF client header rejected");
Check((await c.GetAsync("/api/v1/users/me")).StatusCode == HttpStatusCode.Unauthorized, "anonymous me denied");
// Kiểm tra concurrency/expiry trực tiếp với PostgreSQL thật, không tiêu thụ quota HTTP.
var provider = DataProtectionProvider.Create(new DirectoryInfo(keyPath), x => x.SetApplicationName("caps-auth"));
var jwt = new Caps.Common.Security.JwtOptions("caps-auth", "caps-spa", "CHANGE_ME_dev_only_min_32_chars_1234567890");
auth.Services.AuthService Service(AuthDbContext db) => new(db, new Microsoft.AspNetCore.Identity.PasswordHasher<auth.Entities.User>(), jwt, Microsoft.Extensions.Options.Options.Create(new auth.Services.AuthOptions()), provider, TimeProvider.System);
async Task<int> Status(Func<Task> action) { try { await action(); return 200; } catch (auth.Services.AuthFailure e) { return e.Status; } }
var raceEmail = "race-" + Guid.NewGuid().ToString("N") + "@caps.test";
var registrations = await Task.WhenAll(Enumerable.Range(0, 2).Select(async _ => { await using var db = new AuthDbContext(options); return await Status(async () => { await Service(db).RegisterAsync(new(raceEmail, password), default); }); }));
Check(registrations.Order().SequenceEqual(new[] { 200, 409 }), "concurrent registration creates one user");
auth.DTOs.Responses.SessionResult racedSession;
await using (var db = new AuthDbContext(options)) racedSession = await Service(db).LoginAsync(new(raceEmail, password), default);
var rotations = await Task.WhenAll(Enumerable.Range(0, 2).Select(async _ => { await using var db = new AuthDbContext(options); return await Status(async () => { await Service(db).RefreshAsync(racedSession.RefreshToken, default); }); }));
Check(rotations.Order().SequenceEqual(new[] { 200, 401 }), "concurrent refresh accepts old token once");
await using (var db = new AuthDbContext(options)) Check(!await db.RefreshTokens.AnyAsync(x => x.UserId.ToString() == racedSession.Response.User.UserId && x.RevokedAt == null), "replay revokes remaining refresh sessions");
var raceVerify = await EmailToken(raceEmail, "VERIFY_EMAIL");
var verifications = await Task.WhenAll(Enumerable.Range(0, 2).Select(async _ => { await using var db = new AuthDbContext(options); return await Status(() => Service(db).VerifyAsync(raceVerify, default)); }));
Check(verifications.Order().SequenceEqual(new[] { 200, 401 }), "concurrent verification consumes token once");
var expiryEmail = "expiry-" + Guid.NewGuid().ToString("N") + "@caps.test";
auth.DTOs.Responses.SessionResult expiring;
await using (var db = new AuthDbContext(options)) expiring = await Service(db).RegisterAsync(new(expiryEmail, password), default);
var expiryToken = await EmailToken(expiryEmail, "VERIFY_EMAIL");
await using (var db = new AuthDbContext(options)) {
    var id = Guid.Parse(expiring.Response.User.UserId);
    await db.VerificationTokens.Where(x => x.UserId == id).ExecuteUpdateAsync(x => x.SetProperty(v => v.ExpiresAt, DateTimeOffset.UtcNow.AddMinutes(-1)));
    await db.RefreshTokens.Where(x => x.UserId == id).ExecuteUpdateAsync(x => x.SetProperty(v => v.ExpiresAt, DateTimeOffset.UtcNow.AddMinutes(-1)));
    Check(await Status(() => Service(db).VerifyAsync(expiryToken, default)) == 401, "expired verification rejected");
    Check(await Status(async () => { await Service(db).RefreshAsync(expiring.RefreshToken, default); }) == 401, "expired refresh rejected");
}
await using (var db = new AuthDbContext(options)) Check(await Status(() => Service(db).VerifyAsync(reset, default)) == 401, "reset token cannot verify email");
for (var i = 0; i < 5; i++) { await using var db = new AuthDbContext(options); await Status(async () => { await Service(db).LoginAsync(new(raceEmail, "Wrong-password-123!"), default); }); }
await using (var db = new AuthDbContext(options)) Check(await Status(async () => { await Service(db).LoginAsync(new(raceEmail, password), default); }) == 401, "lockout blocks correct password after repeated failure");
// Resend invalidates older links; kiểm tra bằng service để tránh quota HTTP.
var resendEmail = "resend-" + Guid.NewGuid().ToString("N") + "@caps.test";
auth.DTOs.Responses.SessionResult pending;
await using (var db = new AuthDbContext(options)) pending = await Service(db).RegisterAsync(new(resendEmail, password), default);
var oldVerify = await EmailToken(resendEmail, "VERIFY_EMAIL");
await using (var db = new AuthDbContext(options)) Check(await Status(() => Service(db).ResendAsync(Guid.Parse(pending.Response.User.UserId), default)) == 429, "resend cooldown");
await using (var db = new AuthDbContext(options)) await db.VerificationTokens.Where(x => x.UserId.ToString() == pending.Response.User.UserId).ExecuteUpdateAsync(x => x.SetProperty(v => v.CreatedAt, DateTimeOffset.UtcNow.AddMinutes(-2)));
Bearer(c, pending.Response.AccessToken);
Check((await Post(c, "/api/v1/auth/resend-verification", new { })).Response.IsSuccessStatusCode, "resend endpoint");
await using (var db = new AuthDbContext(options)) Check(await Status(() => Service(db).VerifyAsync(oldVerify, default)) == 401, "resend invalidates previous link");

// Broker in-memory và SMTP loopback giả lập: không gửi email ra ngoài.
await using var smtp = new LocalSmtpSink();
var services = new ServiceCollection();
services.AddLogging(); services.AddDbContext<AuthDbContext>(x => x.UseNpgsql(connection));
services.AddSingleton<IDataProtectionProvider>(provider);
services.AddSingleton<IConfiguration>(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Smtp:Host"] = "127.0.0.1", ["Smtp:Port"] = smtp.Port.ToString(), ["Smtp:EnableSsl"] = "false", ["Smtp:From"] = "test@caps.test" }).Build());
services.AddMassTransit(x => { x.AddConsumer<notification.Services.AuthEmailConsumer>(); x.UsingInMemory((ctx, cfg) => cfg.ConfigureEndpoints(ctx)); });
services.AddSingleton<AuthEmailPublisher>();
await using var sp = services.BuildServiceProvider();
var bus = sp.GetRequiredService<IBusControl>(); await bus.StartAsync();
var publisher = sp.GetRequiredService<AuthEmailPublisher>(); await publisher.StartAsync(default);
try {
    var body = await smtp.Message.Task.WaitAsync(TimeSpan.FromSeconds(20));
    var normalizedMail = body.Replace("\r\n", "\n");
    var split = normalizedMail.IndexOf("\n\n", StringComparison.Ordinal);
    var mailContent = normalizedMail[(split + 2)..];
    if (normalizedMail[..split].Contains("Content-Transfer-Encoding: base64", StringComparison.OrdinalIgnoreCase)) mailContent = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(mailContent));
    else { mailContent = mailContent.Replace("=\n", ""); mailContent = System.Text.RegularExpressions.Regex.Replace(mailContent, "=([0-9A-Fa-f]{2})", x => ((char)Convert.ToInt32(x.Groups[1].Value, 16)).ToString()); }
    Check(mailContent.Contains("Continue") && mailContent.Contains("token="), "encrypted outbox to broker consumer to SMTP");
    for (var i = 0; i < 30; i++) { await using var db = new AuthDbContext(options); if (await db.EmailOutbox.AnyAsync(x => x.SentAt != null && x.ProtectedPayload == "")) break; await Task.Delay(100); }
    await using var dbCheck = new AuthDbContext(options);
    Check(await dbCheck.EmailOutbox.AnyAsync(x => x.SentAt != null && x.ProtectedPayload == ""), "published outbox payload cleared");
} finally { await publisher.StopAsync(default); await bus.StopAsync(); }
Console.WriteLine($"{passed} HTTP/database/email assertions passed.");

sealed class LocalSmtpSink : IAsyncDisposable
{
    private readonly System.Net.Sockets.TcpListener listener = new(System.Net.IPAddress.Loopback, 0);
    private readonly CancellationTokenSource stop = new();
    private readonly Task running;
    public int Port => ((System.Net.IPEndPoint)listener.LocalEndpoint).Port;
    public TaskCompletionSource<string> Message { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public LocalSmtpSink() { listener.Start(); running = Run(); }
    private async Task Run()
    {
        try {
            while (!stop.IsCancellationRequested) {
                using var client = await listener.AcceptTcpClientAsync(stop.Token);
                using var stream = client.GetStream(); using var reader = new StreamReader(stream); using var writer = new StreamWriter(stream) { AutoFlush = true, NewLine = "\r\n" };
                await writer.WriteLineAsync("220 localhost test SMTP"); var body = new System.Text.StringBuilder(); var data = false;
                while (await reader.ReadLineAsync(stop.Token) is { } line) {
                    if (data) { if (line == ".") { data = false; Message.TrySetResult(body.ToString()); await writer.WriteLineAsync("250 accepted"); } else body.AppendLine(line); }
                    else if (line.StartsWith("EHLO")) await writer.WriteLineAsync("250 localhost");
                    else if (line == "DATA") { data = true; await writer.WriteLineAsync("354 send data"); }
                    else if (line == "QUIT") { await writer.WriteLineAsync("221 bye"); break; }
                    else await writer.WriteLineAsync("250 ok");
                }
            }
        } catch (OperationCanceledException) { }
    }
    public async ValueTask DisposeAsync() { stop.Cancel(); listener.Stop(); try { await running; } catch (ObjectDisposedException) { } stop.Dispose(); }
}

