using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Caps.Auth.Api;
using Caps.Auth.Application;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.EmailVerification;
using Caps.Auth.Application.Features.Sessions;
using Caps.Auth.Infrastructure;
using Caps.Auth.Infrastructure.Email;
using Caps.Auth.Infrastructure.Persistence;
using Caps.Auth.Infrastructure.Security;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Contracts;
using Caps.Notification;
using MassTransit;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

// Runs only against a dedicated test DB. Sends no real email; reads the encrypted outbox with the test key.
var connection =
    Environment.GetEnvironmentVariable("AUTH_TEST_CONNECTION")
    ?? throw new Exception("AUTH_TEST_CONNECTION required.");
var keyPath =
    Environment.GetEnvironmentVariable("AUTH_TEST_KEYS")
    ?? throw new Exception("AUTH_TEST_KEYS required.");
var baseUrl = Environment.GetEnvironmentVariable("AUTH_TEST_URL") ?? "http://127.0.0.1:55190";
var authUrl = Environment.GetEnvironmentVariable("AUTH_TEST_AUTH_URL") ?? "http://127.0.0.1:55194";
var expertUrl =
    Environment.GetEnvironmentVariable("AUTH_TEST_EXPERT_URL") ?? "http://127.0.0.1:55198";
var jwtKeyPath =
    Environment.GetEnvironmentVariable("AUTH_TEST_JWT_KEY")
    ?? throw new Exception("AUTH_TEST_JWT_KEY required.");
if (!new Npgsql.NpgsqlConnectionStringBuilder(connection).Database!.EndsWith("_test"))
    throw new Exception("Use a dedicated database ending _test.");
var options = new DbContextOptionsBuilder<AuthDbContext>().UseNpgsql(connection).Options;
var protector = DataProtectionProvider
    .Create(new DirectoryInfo(keyPath), x => x.SetApplicationName("caps-auth"))
    .CreateProtector("AuthEmailOutbox.v1");
var passed = 0;
void Check(bool condition, string description)
{
    if (!condition)
        throw new Exception("FAIL: " + description);
    Console.WriteLine("PASS: " + description);
    passed++;
}
HttpClient Client()
{
    var c = new HttpClient(new HttpClientHandler { UseCookies = false })
    {
        BaseAddress = new Uri(baseUrl),
    };
    c.DefaultRequestHeaders.Add("X-Caps-Client", "spa");
    c.DefaultRequestHeaders.Add("Origin", "http://localhost:5173");
    return c;
}
async Task<(HttpResponseMessage Response, JsonElement Json)> Post(
    HttpClient c,
    string path,
    object body
)
{
    var r = await c.PostAsJsonAsync(path, body);
    var json = JsonDocument.Parse(await r.Content.ReadAsStringAsync()).RootElement.Clone();
    return (r, json);
}
string Access(JsonElement j) => j.GetProperty("data").GetProperty("accessToken").GetString()!;
string Refresh(HttpResponseMessage r) => r.Headers.GetValues("Set-Cookie").Single().Split(';')[0];
void Bearer(HttpClient c, string access) =>
    c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", access);
async Task<string> EmailToken(string email, string purpose)
{
    await using var db = new AuthDbContext(options);
    var rows = await db.EmailOutbox.OrderByDescending(x => x.CreatedAt).ToListAsync();
    foreach (var row in rows)
    {
        var m = JsonSerializer.Deserialize<AuthEmailRequestedEvent>(
            protector.Unprotect(row.ProtectedPayload)
        )!;
        if (m.Email == email && m.Purpose == purpose)
            return new Uri(m.Link).Fragment.Split("token=")[1];
    }
    throw new Exception("Email outbox not found.");
}
async Task<string> EmailCode(string email)
{
    await using var db = new AuthDbContext(options);
    var rows = await db.EmailOutbox.OrderByDescending(x => x.CreatedAt).ToListAsync();
    foreach (var row in rows)
    {
        var m = JsonSerializer.Deserialize<AuthEmailRequestedEvent>(
            protector.Unprotect(row.ProtectedPayload)
        )!;
        if (m.Email == email && m.Code != null)
            return m.Code;
    }
    throw new Exception("Verification code not found.");
}
using var c = Client();
var email = "flow-" + Guid.NewGuid().ToString("N") + "@caps.test";
var password = "Caps-auth-test-123!";
var reg = await Post(
    c,
    "/api/v1/auth/register",
    new
    {
        email,
        password,
        displayName = "Test User",
        role = "SYSTEM_ADMIN",
    }
);
Check(reg.Response.StatusCode == HttpStatusCode.OK, "register through YARP");
var userId = Guid.Parse(
    reg.Json.GetProperty("data").GetProperty("user").GetProperty("userId").GetString()!
);
var initialAccess = Access(reg.Json);
Bearer(c, initialAccess);
var initialRefresh = Refresh(reg.Response);
Check(
    reg.Response.Headers.GetValues("Set-Cookie")
        .Single()
        .Contains("httponly", StringComparison.OrdinalIgnoreCase),
    "refresh cookie HttpOnly"
);
await using (var db = new AuthDbContext(options))
{
    var u = await db.Users.FindAsync(userId);
    Check(
        u!.PasswordHash != password && u.PasswordHash!.Length != 64,
        "password uses Identity hasher"
    );
    Check(
        await db.UserRoles.Where(x => x.UserId == userId).Select(x => x.Role.Code).SingleAsync()
            == "USER",
        "register cannot self-assign admin"
    );
    Check(
        (await db.RefreshTokens.SingleAsync(x => x.UserId == userId)).TokenHash
            != initialRefresh.Split('=')[1],
        "refresh token stored as hash"
    );
}
var dup = await Post(
    c,
    "/api/v1/auth/register",
    new { email = email.ToUpperInvariant(), password }
);
Check(dup.Response.StatusCode == HttpStatusCode.Conflict, "normalized duplicate rejected");
Check(
    (await c.GetAsync("/api/v1/users/me")).IsSuccessStatusCode,
    "pending user can view own profile"
);
Check(
    (await c.PutAsJsonAsync("/api/v1/users/me", new { displayName = "Changed" })).StatusCode
        == HttpStatusCode.Forbidden,
    "pending user denied business mutation"
);
var verify = await EmailToken(email, "VERIFY_EMAIL");
Check(
    (await Post(c, "/api/v1/auth/verify-email", new { token = verify }))
        .Response
        .IsSuccessStatusCode,
    "email verify activates user"
);
Check(
    (await Post(c, "/api/v1/auth/verify-email", new { token = verify })).Response.StatusCode
        == HttpStatusCode.Unauthorized,
    "verification single use"
);
var login = await Post(c, "/api/v1/auth/login", new { email, password });
Check(login.Response.IsSuccessStatusCode, "active login");
var access = Access(login.Json);
var cookie = Refresh(login.Response);
Bearer(c, access);

// RS256: the header names the key, auth publishes only its public part, forged tokens are rejected
var tokenHeader = JsonDocument
    .Parse(Base64UrlEncoder.Decode(access.Split('.')[0]))
    .RootElement.Clone();
Check(tokenHeader.GetProperty("alg").GetString() == "RS256", "access token signed with RS256");
var kid = tokenHeader.GetProperty("kid").GetString();
using (var direct = new HttpClient { BaseAddress = new Uri(authUrl) })
{
    var jwks = JsonDocument
        .Parse(await direct.GetStringAsync("/.well-known/jwks.json"))
        .RootElement.Clone();
    Check(
        jwks.GetProperty("keys")
            .EnumerateArray()
            .Any(k => k.GetProperty("kid").GetString() == kid && !k.TryGetProperty("d", out _)),
        "JWKS publishes the signing key without private parts"
    );
}
string Forge(string alg, string signature) =>
    Base64UrlEncoder.Encode($"{{\"alg\":\"{alg}\",\"typ\":\"JWT\",\"kid\":\"{kid}\"}}")
    + "."
    + access.Split('.')[1]
    + "."
    + signature;
var unsigned = Forge("none", "");
var hs256Body = Forge("HS256", "").TrimEnd('.');

// Signed with the former shared HS256 key that every service used to hold
var hs256 =
    hs256Body
    + "."
    + Base64UrlEncoder.Encode(
        new System.Security.Cryptography.HMACSHA256(
            System.Text.Encoding.UTF8.GetBytes("CHANGE_ME_dev_only_min_32_chars_1234567890")
        ).ComputeHash(System.Text.Encoding.ASCII.GetBytes(hs256Body))
    );
foreach (var (forged, name) in new[] { (hs256, "HS256"), (unsigned, "alg none") })
{
    using var attacker = Client();
    Bearer(attacker, forged);
    Check(
        (await attacker.GetAsync("/api/v1/users/me")).StatusCode == HttpStatusCode.Unauthorized,
        $"{name} token rejected by auth"
    );
    Check(
        (await attacker.GetAsync("/api/v1/experts/me/application")).StatusCode
            == HttpStatusCode.Unauthorized,
        $"{name} token rejected on the expert route"
    );
}
Check(
    (
        await c.PutAsJsonAsync(
            "/api/v1/users/me",
            new { displayName = "Updated", phone = "+84901234567" }
        )
    ).IsSuccessStatusCode,
    "update own profile"
);
Check(
    (await c.GetAsync("/api/v1/users/me/business-profile")).IsSuccessStatusCode,
    "get empty business profile"
);
Check(
    (
        await c.PutAsJsonAsync(
            "/api/v1/users/me/business-profile",
            new
            {
                companyName = "Caps",
                taxCode = "0123456789",
                address = "Test",
            }
        )
    ).IsSuccessStatusCode,
    "upsert business profile"
);
var bp = JsonDocument
    .Parse(await c.GetStringAsync("/api/v1/users/me/business-profile"))
    .RootElement;
Check(
    bp.GetProperty("data").GetProperty("companyName").GetString() == "Caps",
    "read business profile"
);
c.DefaultRequestHeaders.Remove("Cookie");
c.DefaultRequestHeaders.Add("Cookie", cookie);
var refresh = await Post(c, "/api/v1/auth/refresh-token", new { });
Check(
    refresh.Response.IsSuccessStatusCode && Refresh(refresh.Response) != cookie,
    "refresh rotation"
);
var replay = await Post(c, "/api/v1/auth/refresh-token", new { });
Check(replay.Response.StatusCode == HttpStatusCode.Unauthorized, "refresh replay rejected");
Check(
    (await c.GetAsync("/api/v1/users/me")).StatusCode == HttpStatusCode.Unauthorized,
    "replay revokes access via token version in auth service"
);
c.DefaultRequestHeaders.Remove("Cookie");
c.DefaultRequestHeaders.Authorization = null;
login = await Post(c, "/api/v1/auth/login", new { email, password });
Bearer(c, Access(login.Json));
cookie = Refresh(login.Response);
c.DefaultRequestHeaders.Add("Cookie", cookie);
const string expertMe = "/api/v1/experts/me/application";
Check(
    (await c.GetAsync(expertMe)).StatusCode != HttpStatusCode.Unauthorized,
    "expert accepts the session before logout"
);
Check((await Post(c, "/api/v1/auth/logout", new { })).Response.IsSuccessStatusCode, "logout");

// Revocation is shared through Redis: expert rejects the signed-out token without asking auth
Check(
    (await c.GetAsync(expertMe)).StatusCode == HttpStatusCode.Unauthorized,
    "logout revokes the access token at expert immediately"
);
Check(
    (await c.GetAsync("/api/v1/users/me")).StatusCode == HttpStatusCode.Unauthorized,
    "logout revokes the access token at auth immediately"
);
Check(
    (await Post(c, "/api/v1/auth/refresh-token", new { })).Response.StatusCode
        == HttpStatusCode.Unauthorized,
    "logout refresh invalid"
);
c.DefaultRequestHeaders.Remove("Cookie");
c.DefaultRequestHeaders.Authorization = null;
Check(
    (await Post(c, "/api/v1/auth/forgot-password", new { email })).Response.IsSuccessStatusCode,
    "forgot password"
);
var reset = await EmailToken(email, "RESET_PASSWORD");
Check(
    (
        await Post(
            c,
            "/api/v1/auth/reset-password",
            new { token = reset, password = "New-caps-password-123!" }
        )
    )
        .Response
        .IsSuccessStatusCode,
    "reset password"
);
Check(
    (await Post(c, "/api/v1/auth/reset-password", new { token = reset, password }))
        .Response
        .StatusCode == HttpStatusCode.Unauthorized,
    "reset single use"
);
Check(
    (await Post(c, "/api/v1/auth/login", new { email, password })).Response.StatusCode
        == HttpStatusCode.Unauthorized,
    "old password rejected"
);
Check(
    (await Post(c, "/api/v1/auth/login", new { email, password = "New-caps-password-123!" }))
        .Response
        .IsSuccessStatusCode,
    "new password works"
);

// Change password: other devices are signed out, but an old device refreshing must not kick out the new session.
const string changedPassword = "Changed-caps-password-123!";
using var deviceA = Client();
using var deviceB = Client();
var loginA = await Post(
    deviceA,
    "/api/v1/auth/login",
    new { email, password = "New-caps-password-123!" }
);
var loginB = await Post(
    deviceB,
    "/api/v1/auth/login",
    new { email, password = "New-caps-password-123!" }
);
Bearer(deviceA, Access(loginA.Json));
deviceA.DefaultRequestHeaders.Add("Cookie", Refresh(loginA.Response));
Check(
    (
        await Post(
            deviceA,
            "/api/v1/auth/change-password",
            new { currentPassword = "Wrong-caps-password-1!", newPassword = changedPassword }
        )
    )
        .Response
        .StatusCode == HttpStatusCode.BadRequest,
    "change password requires current password"
);
var change = await Post(
    deviceA,
    "/api/v1/auth/change-password",
    new { currentPassword = "New-caps-password-123!", newPassword = changedPassword }
);
Check(change.Response.IsSuccessStatusCode, "change password");
Bearer(deviceB, Access(loginB.Json));
Check(
    (await deviceB.GetAsync(expertMe)).StatusCode == HttpStatusCode.Unauthorized,
    "change password revokes other devices' access tokens at expert"
);
using (var changed = Client())
{
    Bearer(changed, Access(change.Json));
    Check(
        (await changed.GetAsync(expertMe)).StatusCode != HttpStatusCode.Unauthorized,
        "the new session after a password change works at expert"
    );
}
deviceB.DefaultRequestHeaders.Authorization = null;
deviceB.DefaultRequestHeaders.Add("Cookie", Refresh(loginB.Response));
Check(
    (await Post(deviceB, "/api/v1/auth/refresh-token", new { })).Response.StatusCode
        == HttpStatusCode.Unauthorized,
    "change password signs out other devices"
);
deviceA.DefaultRequestHeaders.Remove("Cookie");
deviceA.DefaultRequestHeaders.Add("Cookie", Refresh(change.Response));
Check(
    (await Post(deviceA, "/api/v1/auth/refresh-token", new { })).Response.IsSuccessStatusCode,
    "stale device refresh does not revoke the new session"
);

// Avatar: format detected from content, served publicly through a versioned URL.
Bearer(deviceA, Access(change.Json));
var png = Convert.FromBase64String(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
);
async Task<HttpResponseMessage> PutAvatar(byte[] bytes)
{
    var file = new ByteArrayContent(bytes);
    file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
    var form = new MultipartFormDataContent { { file, "file", "avatar.png" } };
    return await deviceA.PutAsync("/api/v1/users/me/avatar", form);
}
var avatar = await PutAvatar(png);
var avatarUrl = JsonDocument
    .Parse(await avatar.Content.ReadAsStringAsync())
    .RootElement.GetProperty("data")
    .GetProperty("avatarUrl")
    .GetString()!;
Check(
    avatar.IsSuccessStatusCode && avatarUrl.StartsWith($"/api/v1/users/{userId}/avatar"),
    "upload avatar"
);
using var anonymous = Client();
var served = await anonymous.GetAsync(avatarUrl);
Check(
    served.IsSuccessStatusCode
        && served.Content.Headers.ContentType?.MediaType == "image/png"
        && (await served.Content.ReadAsByteArrayAsync()).SequenceEqual(png),
    "avatar served anonymously"
);
Check(
    (await PutAvatar("<svg onload=alert(1)>"u8.ToArray())).StatusCode == HttpStatusCode.BadRequest,
    "avatar type sniffed from content, not trusted from header"
);
Check(
    (await deviceA.DeleteAsync("/api/v1/users/me/avatar")).IsSuccessStatusCode
        && (await anonymous.GetAsync(avatarUrl)).StatusCode == HttpStatusCode.NotFound,
    "remove avatar"
);

// Expert availability, service pricing and platform fees (through the gateway) and the public marketplace
// (on the expert service directly: the gateway has no marketplace route yet). Names and service codes carry a
// run id so rows left by earlier runs never match.
const string availabilityPath = "/api/v1/experts/me/availability";
const string myServicesPath = "/api/v1/experts/me/services";
const string platformFeesPath = "/api/v1/experts/admin/platform-fees";
var expertRole = Guid.Parse("10000000-0000-0000-0000-000000000002");
var adminRole = Guid.Parse("10000000-0000-0000-0000-000000000005");
using var market = new HttpClient { BaseAddress = new Uri(expertUrl) };
async Task Sql(FormattableString sql)
{
    await using var db = new AuthDbContext(options);
    await db.Database.ExecuteSqlInterpolatedAsync(sql);
}

// The query must name its single column "Value"
async Task<int> Count(FormattableString sql)
{
    await using var db = new AuthDbContext(options);
    return await db.Database.SqlQuery<int>(sql).SingleAsync();
}
Task<HttpResponseMessage> SetAvailability(HttpClient client, bool accepting, int capacity) =>
    client.PutAsJsonAsync(availabilityPath, new { accepting, capacity });
async Task<JsonElement> MarketPage(string keyword, string query = "")
{
    var (_, json) = await ExpertCall(
        market.GetAsync($"/api/v1/marketplace/experts?keyword={keyword}{query}")
    );
    return json.GetProperty("data");
}
async Task<JsonElement[]> Market(string keyword, string query = "") =>
    (await MarketPage(keyword, query)).GetProperty("items").EnumerateArray().ToArray();
string[] Names(JsonElement[] items) =>
    items.Select(i => i.GetProperty("displayName").GetString()!.Split(' ')[1]).ToArray();

Check(
    (
        await anonymous.PutAsJsonAsync(availabilityPath, new { accepting = true, capacity = 3 })
    ).StatusCode == HttpStatusCode.Unauthorized,
    "availability needs a session"
);
Check(
    (await SetAvailability(deviceA, true, 3)).StatusCode == HttpStatusCode.Forbidden,
    "availability needs the ServiceManage permission"
);
Check(
    (await anonymous.GetAsync(myServicesPath)).StatusCode == HttpStatusCode.Unauthorized
        && (await deviceA.GetAsync(myServicesPath)).StatusCode == HttpStatusCode.Forbidden,
    "service pricing needs a session and the ServiceManage permission"
);
Check(
    (await anonymous.GetAsync(platformFeesPath)).StatusCode == HttpStatusCode.Unauthorized
        && (await deviceA.GetAsync(platformFeesPath)).StatusCode == HttpStatusCode.Forbidden,
    "platform fees need a session and the PricingManage permission"
);

// Two auth calls only (register, login): auth allows 30 requests a minute per address. Both roles are
// granted before the login so one token carries ServiceManage (EXPERT) and PricingManage (SYSTEM_ADMIN).
var run = Guid.NewGuid().ToString("N")[..10];
using var expertClient = Client();
var expertEmail = $"market-{run}@caps.test";
var expertReg = await Post(
    expertClient,
    "/api/v1/auth/register",
    new
    {
        email = expertEmail,
        password,
        displayName = "Market Expert",
    }
);
var expertUserId = Guid.Parse(
    expertReg.Json.GetProperty("data").GetProperty("user").GetProperty("userId").GetString()!
);
await Sql(
    $"UPDATE identity.users SET status = 'ACTIVE', email_verified_at = now() WHERE id = {expertUserId}"
);
await Sql(
    $"INSERT INTO identity.user_roles (user_id, role_id) VALUES ({expertUserId}, {expertRole}), ({expertUserId}, {adminRole})"
);
var expertLogin = await Post(
    expertClient,
    "/api/v1/auth/login",
    new { email = expertEmail, password }
);
Bearer(expertClient, Access(expertLogin.Json));
Task<HttpResponseMessage> PutService(string serviceType, long fee, int turnaroundHours) =>
    expertClient.PutAsJsonAsync($"{myServicesPath}/{serviceType}", new { fee, turnaroundHours });
Task<HttpResponseMessage> PutPlatformFee(string serviceType, int percent) =>
    expertClient.PutAsJsonAsync($"{platformFeesPath}/{serviceType}", new { percent });
var svc = $"svc-{run}";
var svc2 = $"svc2-{run}";
var svc3 = $"svc3-{run}";

// Platform fees (admin)
var feeTooHigh = await ExpertCall(PutPlatformFee(svc, 100));
var feeNegative = await ExpertCall(PutPlatformFee(svc, -1));
Check(
    feeTooHigh.Status == HttpStatusCode.BadRequest
        && Code(feeTooHigh.Json) == "PLATFORM_FEE_INVALID"
        && Code(feeNegative.Json) == "PLATFORM_FEE_INVALID",
    "platform fee must be between 0 and 99 percent"
);
var feeBadCode = await ExpertCall(PutPlatformFee($"svc%20{run}", 20));
Check(
    feeBadCode.Status == HttpStatusCode.BadRequest
        && Code(feeBadCode.Json) == "SERVICE_TYPE_INVALID",
    "platform fee rejects a malformed service code"
);

// Expert side before approval: the profile check comes before any other rule
var notApproved = await ExpertCall(SetAvailability(expertClient, true, 3));
Check(
    notApproved.Status == HttpStatusCode.Forbidden
        && Code(notApproved.Json) == "NOT_APPROVED_FOR_SERVICE",
    "availability needs an approved expert profile"
);
var pricingNotApproved = await ExpertCall(PutService($"bad%20{run}", 1, 0));
Check(
    pricingNotApproved.Status == HttpStatusCode.Forbidden
        && Code(pricingNotApproved.Json) == "NOT_APPROVED_FOR_SERVICE",
    "service pricing checks approval before anything else"
);
var expertProfileId = Guid.NewGuid();
await Sql(
    $"INSERT INTO expert.expert_profile (id, user_id, display_name, status, created_at, updated_at) VALUES ({expertProfileId}, {expertUserId}, {"Market " + run}, 'APPROVED', now(), now())"
);
var unpriced = await Market(run);
Check(
    unpriced.Length == 1 && unpriced[0].GetProperty("fee").ValueKind == JsonValueKind.Null,
    "an approved expert without services is listed with no price"
);
var notReady = await ExpertCall(SetAvailability(expertClient, true, 3));
Check(
    notReady.Status == HttpStatusCode.UnprocessableEntity
        && Code(notReady.Json) == "NOT_READY_TO_ACCEPT",
    "taking cases needs a service price"
);
Check(
    (await SetAvailability(expertClient, false, 3)).IsSuccessStatusCode,
    "pausing is allowed before the expert is ready"
);

// Service pricing: errors come in order (format, service opened, then price and time)
var noServices = await ExpertCall(expertClient.GetAsync(myServicesPath));
Check(
    noServices.Status == HttpStatusCode.OK
        && noServices.Json.GetProperty("data").GetArrayLength() == 0,
    "an expert without services gets an empty list"
);
var badCode = await ExpertCall(PutService($"svc%20{run}", 1, 0));
Check(
    badCode.Status == HttpStatusCode.BadRequest && Code(badCode.Json) == "SERVICE_TYPE_INVALID",
    "service pricing rejects a malformed service code first"
);
var notOpened = await ExpertCall(PutService(svc, 1, 0));
Check(
    notOpened.Status == HttpStatusCode.NotFound && Code(notOpened.Json) == "SERVICE_TYPE_UNKNOWN",
    "a service the administrator has not opened cannot be priced"
);
var opened = await ExpertCall(PutPlatformFee(svc.ToUpperInvariant(), 20));
Check(
    opened.Status == HttpStatusCode.OK
        && opened.Json.GetProperty("data").GetProperty("serviceType").GetString() == svc
        && opened.Json.GetProperty("data").GetProperty("percent").GetInt32() == 20,
    "admin opens a service with a normalized code and a percent"
);
var badFee = await ExpertCall(PutService(svc, 150_500, 48));
var badTurnaround = await ExpertCall(PutService(svc, 1_000_000, 721));
Check(
    Code(badFee.Json) == "FEE_INVALID" && Code(badTurnaround.Json) == "TURNAROUND_INVALID",
    "service price and turnaround are validated"
);
var created = await ExpertCall(PutService(svc, 1_000_000, 48));
var createdData = created.Json.GetProperty("data");
Check(
    created.Status == HttpStatusCode.OK
        && createdData.GetProperty("platformFeePercent").GetInt32() == 20
        && createdData.GetProperty("netAmount").GetInt64() == 800_000,
    "expert prices a service and sees the net amount after the platform fee"
);
var repriced = await ExpertCall(PutService(svc.ToUpperInvariant(), 1_200_000, 24));
var repricedData = repriced.Json.GetProperty("data");
Check(
    repricedData.GetProperty("id").GetGuid() == createdData.GetProperty("id").GetGuid()
        && repricedData.GetProperty("serviceType").GetString() == svc
        && repricedData.GetProperty("netAmount").GetInt64() == 960_000,
    "repricing the same service (any letter case) updates the same package"
);

// A new percent is a new history row; the expert's net amount follows the current one
Check((await PutPlatformFee(svc, 25)).IsSuccessStatusCode, "admin raises the platform fee");
Check(
    await Count(
        $"SELECT count(*)::int AS \"Value\" FROM expert.platform_fee WHERE service_type = {svc} AND set_by = {expertUserId}"
    ) == 2,
    "platform fee changes are kept as history with the admin who set them"
);
var feeList = (await ExpertCall(expertClient.GetAsync(platformFeesPath)))
    .Json.GetProperty("data")
    .EnumerateArray()
    .ToArray();
var feeCodes = feeList.Select(f => f.GetProperty("serviceType").GetString()!).ToArray();
Check(
    feeList.Count(f => f.GetProperty("serviceType").GetString() == svc) == 1
        && feeList
            .Single(f => f.GetProperty("serviceType").GetString() == svc)
            .GetProperty("percent")
            .GetInt32() == 25
        && feeCodes.SequenceEqual(feeCodes.Order(StringComparer.Ordinal)),
    "platform fee list shows one current rate per service, sorted by code"
);
Check(
    (await PutPlatformFee(svc2, 0)).IsSuccessStatusCode,
    "a platform fee of 0 percent is allowed"
);
Check((await PutService(svc2, 500_000, 48)).IsSuccessStatusCode, "expert prices a second service");
Check(
    (await PutPlatformFee(svc2, 99)).IsSuccessStatusCode,
    "a platform fee of 99 percent is allowed"
);
var mine = (await ExpertCall(expertClient.GetAsync(myServicesPath)))
    .Json.GetProperty("data")
    .EnumerateArray()
    .ToArray();
long NetOf(string serviceType) =>
    mine.Single(m => m.GetProperty("serviceType").GetString() == serviceType)
        .GetProperty("netAmount")
        .GetInt64();
Check(
    mine.Length == 2 && NetOf(svc) == 900_000 && NetOf(svc2) == 5_000,
    "expert's services list each package with the current percent and net amount"
);

// Two first saves of one service at once: never a 500, never two active packages
Check((await PutPlatformFee(svc3, 10)).IsSuccessStatusCode, "admin opens a third service");
var raced = await Task.WhenAll(PutService(svc3, 700_000, 48), PutService(svc3, 700_000, 48));
Check(
    raced.All(r => r.StatusCode is HttpStatusCode.OK or HttpStatusCode.Conflict)
        && await Count(
            $"SELECT count(*)::int AS \"Value\" FROM expert.service_offering WHERE expert_profile_id = {expertProfileId} AND service_type = {svc3} AND is_active"
        ) == 1,
    "concurrent first saves of a service leave exactly one active package"
);

// An inactive package never counts for price or profile
await Sql(
    $"INSERT INTO expert.service_offering (id, expert_profile_id, service_type, fee, turnaround_hours, is_active, created_at) VALUES ({Guid.NewGuid()}, {expertProfileId}, {"old-" + run}, 10000, 1, false, now())"
);

// Availability now that the expert sells something
var badCapacity = await ExpertCall(SetAvailability(expertClient, true, 0));
Check(
    badCapacity.Status == HttpStatusCode.BadRequest && Code(badCapacity.Json) == "CAPACITY_INVALID",
    "capacity must be between 1 and 20"
);
var accepting = await ExpertCall(SetAvailability(expertClient, true, 3));
var acceptingData = accepting.Json.GetProperty("data");
Check(
    accepting.Status == HttpStatusCode.OK
        && acceptingData.GetProperty("accepting").GetBoolean()
        && acceptingData.GetProperty("capacity").GetInt32() == 3
        && acceptingData.GetProperty("activeCases").GetInt32() == 0,
    "expert turns taking cases on"
);

// Marketplace view of this expert: svc 1,200,000/24h, svc2 500,000/48h, svc3 700,000/48h, one inactive package
var listed = await Market(run);
Check(
    listed.Length == 1
        && listed[0].GetProperty("available").GetBoolean()
        && listed[0].GetProperty("fee").GetInt64() == 500_000
        && listed[0].GetProperty("turnaroundHours").GetInt32() == 24,
    "without a service the card shows the lowest price and the fastest delivery"
);
var chosen = await Market(run, $"&serviceType={svc.ToUpperInvariant()}");
Check(
    chosen.Length == 1
        && chosen[0].GetProperty("fee").GetInt64() == 1_200_000
        && chosen[0].GetProperty("turnaroundHours").GetInt32() == 24,
    "with a service (any letter case) the card shows that service's price and delivery"
);
Check(
    (await Market(run, $"&serviceType={svc}&maxTurnaroundHours=24")).Length == 1
        && (await Market(run, $"&serviceType={svc}&maxTurnaroundHours=23")).Length == 0
        && (await Market(run, $"&serviceType={svc}&maxTurnaroundHours=0")).Length == 1,
    "maxTurnaroundHours keeps deliveries within the limit and ignores zero"
);
using var signedInMarket = new HttpClient { BaseAddress = new Uri(expertUrl) };
Bearer(signedInMarket, Access(expertLogin.Json));
Check(
    (
        await signedInMarket.GetAsync($"/api/v1/marketplace/experts?keyword={run}")
    ).IsSuccessStatusCode,
    "marketplace works with or without a session"
);
var ownProfile = await ExpertCall(
    market.GetAsync($"/api/v1/marketplace/experts/{expertProfileId}")
);
var ownData = ownProfile.Json.GetProperty("data");
var offeredFees = ownData
    .GetProperty("offerings")
    .EnumerateArray()
    .Select(o => o.GetProperty("fee").GetInt64())
    .ToArray();
Check(
    ownProfile.Status == HttpStatusCode.OK
        && offeredFees.SequenceEqual([500_000L, 700_000L, 1_200_000L])
        && ownData.GetProperty("offerings")[2].GetProperty("turnaroundHours").GetInt32() == 24,
    "expert profile lists active packages cheapest first, each with its delivery time"
);
Check(
    !ownData.TryGetProperty("phone", out _)
        && !ownData.TryGetProperty("birthDate", out _)
        && !ownData.TryGetProperty("userId", out _),
    "public expert profile hides personal details"
);
await SetAvailability(expertClient, false, 3);
var paused = await Market(run);
Check(
    (await Market(run, "&openOnly=true")).Length == 0
        && paused.Length == 1
        && !paused[0].GetProperty("available").GetBoolean(),
    "a paused expert stays listed as unavailable and openOnly hides them"
);

// Ranking: A free slot 90% VERIFIED 4.5; D free slot exactly 80% over exactly 5 cases 4.0; E free slot 5.0
// but only 4 cases (rate not counted yet); B free slot 5.0 but 60%; C best numbers but full; F not approved.
var rank = Guid.NewGuid().ToString("N")[..10];
var titleToken = Guid.NewGuid().ToString("N")[..10];
async Task<Guid> Seed(
    string name,
    int activeCases,
    int verified,
    int delivered,
    decimal rating,
    long fee,
    int turnaround,
    string status = "APPROVED",
    string? title = null,
    string[]? fields = null
)
{
    var id = Guid.NewGuid();
    await Sql(
        $"INSERT INTO expert.expert_profile (id, user_id, display_name, title, fields, status, service_status, capacity, active_cases, delivered_count, verified_count, rating_avg, rating_count, created_at, updated_at) VALUES ({id}, {Guid.NewGuid()}, {"Rank " + name + " " + rank}, {title ?? ""}, {fields ?? Array.Empty<string>()}, {status}, 'ACTIVE', 3, {activeCases}, {delivered}, {verified}, {rating}, 20, now(), now())"
    );
    await Sql(
        $"INSERT INTO expert.service_offering (id, expert_profile_id, service_type, fee, turnaround_hours, is_active, created_at) VALUES ({Guid.NewGuid()}, {id}, 'cit-review', {fee}, {turnaround}, true, now())"
    );
    return id;
}
await Seed(
    "A",
    activeCases: 0,
    verified: 9,
    delivered: 10,
    rating: 4.5m,
    fee: 800_000,
    turnaround: 24,
    title: "Lead auditor " + titleToken,
    fields: ["CORPORATE_INCOME_TAX"]
);
await Seed(
    "B",
    activeCases: 0,
    verified: 6,
    delivered: 10,
    rating: 5.0m,
    fee: 500_000,
    turnaround: 48
);
var expertC = await Seed(
    "C",
    activeCases: 3,
    verified: 19,
    delivered: 20,
    rating: 5.0m,
    fee: 1_200_000,
    turnaround: 12
);
await Seed(
    "D",
    activeCases: 0,
    verified: 4,
    delivered: 5,
    rating: 4.0m,
    fee: 900_000,
    turnaround: 72
);
await Seed(
    "E",
    activeCases: 0,
    verified: 4,
    delivered: 4,
    rating: 5.0m,
    fee: 600_000,
    turnaround: 36
);
var expertF = await Seed(
    "F",
    activeCases: 0,
    verified: 9,
    delivered: 10,
    rating: 5.0m,
    fee: 100_000,
    turnaround: 1,
    status: "SUBMITTED"
);
var ranked = await Market(rank);
Check(
    Names(ranked).SequenceEqual(["A", "D", "E", "B", "C"]),
    "recommended order: free slot and VERIFIED 80% over 5+ cases first, full experts last, unapproved hidden"
);
Check(
    ranked[1].GetProperty("verifiedRate").GetInt32() == 80
        && ranked[2].GetProperty("verifiedRate").ValueKind == JsonValueKind.Null,
    "VERIFIED rate shows from 5 cases on and is null before"
);
Check(
    Names(await Market(rank, "&openOnly=true")).SequenceEqual(["A", "D", "E", "B"]),
    "openOnly keeps only experts with a free slot"
);
Check(
    Names(await Market(rank, "&sort=price")).SequenceEqual(["B", "E", "A", "D", "C"]),
    "price sort puts the cheapest first"
);
Check(
    Names(await Market(rank, "&sort=turnaround")).SequenceEqual(["C", "A", "E", "B", "D"]),
    "turnaround sort puts the fastest delivery first"
);
var byRating = Names(await Market(rank, "&sort=rating"));
Check(
    byRating[..3].Order().SequenceEqual(["B", "C", "E"]) && byRating[3..].SequenceEqual(["A", "D"]),
    "rating sort puts the best rated first"
);
Check(
    Names(
            await Market(
                rank,
                "&serviceType=cit-review&openOnly=true&maxTurnaroundHours=40&sort=price"
            )
        )
        .SequenceEqual(["E", "A"]),
    "filters combine: service, free slot, delivery limit and price order"
);
Check(
    (await Market(rank, "&serviceType=cit-review")).Length == 5
        && (await Market(rank, "&serviceType=not-sold")).Length == 0,
    "serviceType keeps only experts selling that service"
);
Check(
    Names(await Market(titleToken)).SequenceEqual(["A"])
        && Names(await Market(titleToken.ToUpperInvariant())).SequenceEqual(["A"])
        && Names(await Market(titleToken[2..8])).SequenceEqual(["A"])
        && (await Market(Guid.NewGuid().ToString("N"))).Length == 0,
    "keyword matches the title, ignores letter case, matches part of a word and can find nothing"
);
Check(
    Names(await Market(rank, "&field=CORPORATE_INCOME_TAX")).SequenceEqual(["A"])
        && (await Market(rank, "&field=corporate_income_tax")).Length == 0,
    "field matches the exact expertise code"
);
var page1 = await MarketPage(rank, "&pageSize=2&page=1");
var page2 = await MarketPage(rank, "&pageSize=2&page=2");
var page3 = await MarketPage(rank, "&pageSize=2&page=3");
Check(
    Names(page1.GetProperty("items").EnumerateArray().ToArray()).SequenceEqual(["A", "D"])
        && page1.GetProperty("hasMore").GetBoolean()
        && Names(page2.GetProperty("items").EnumerateArray().ToArray()).SequenceEqual(["E", "B"])
        && page2.GetProperty("hasMore").GetBoolean()
        && Names(page3.GetProperty("items").EnumerateArray().ToArray()).SequenceEqual(["C"])
        && !page3.GetProperty("hasMore").GetBoolean(),
    "pages never repeat or skip an expert and hasMore marks the last page"
);
Check(
    Names(await Market(rank, "&page=0&pageSize=2")).SequenceEqual(["A", "D"])
        && (await Market(rank, "&pageSize=0")).Length == 1
        && (await Market(rank, "&pageSize=100")).Length == 5,
    "page below 1 means the first page and the page size is clamped"
);
Check(
    (await market.GetAsync($"/api/v1/marketplace/experts?keyword={rank}&sort=abc")).StatusCode
        == HttpStatusCode.BadRequest,
    "unknown sort is rejected"
);
var detail = await ExpertCall(market.GetAsync($"/api/v1/marketplace/experts/{expertC}"));
var detailData = detail.Json.GetProperty("data");
Check(
    detail.Status == HttpStatusCode.OK
        && !detailData.GetProperty("available").GetBoolean()
        && detailData.GetProperty("verifiedRate").GetInt32() == 95
        && detailData.GetProperty("offerings").GetArrayLength() == 1
        && detailData.GetProperty("offerings")[0].GetProperty("turnaroundHours").GetInt32() == 12,
    "expert profile shows availability, VERIFIED rate and service packages"
);
var unapproved = await ExpertCall(market.GetAsync($"/api/v1/marketplace/experts/{expertF}"));
var missing = await ExpertCall(market.GetAsync($"/api/v1/marketplace/experts/{Guid.NewGuid()}"));
Check(
    unapproved.Status == HttpStatusCode.NotFound
        && Code(unapproved.Json) == "EXPERT_NOT_FOUND"
        && missing.Status == HttpStatusCode.NotFound
        && Code(missing.Json) == "EXPERT_NOT_FOUND"
        && (await market.GetAsync("/api/v1/marketplace/experts/not-a-guid")).StatusCode
            == HttpStatusCode.NotFound,
    "unknown or unapproved expert profiles are not found"
);

// Expert application (applicant side): files live in private storage; submitting requires a verified email.
const string expertBase = "/api/v1/experts/me/application";
var pdf = "%PDF-1.4\n%%EOF\n"u8.ToArray();
async Task<(HttpStatusCode Status, JsonElement Json)> ExpertCall(Task<HttpResponseMessage> request)
{
    var response = await request;
    var body = await response.Content.ReadAsStringAsync();
    return (
        response.StatusCode,
        body.Length == 0 ? default : JsonDocument.Parse(body).RootElement.Clone()
    );
}
Task<HttpResponseMessage> Upload(HttpClient client, string code, byte[] bytes)
{
    var file = new ByteArrayContent(bytes);
    file.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
    var form = new MultipartFormDataContent
    {
        { new StringContent(code), "code" },
        { file, "file", "evidence.pdf" },
    };
    return client.PostAsync(expertBase + "/evidence", form);
}
string Code(JsonElement j) => j.TryGetProperty("code", out var c) ? c.GetString() ?? "" : "";

using var applicant = Client();
var pendingReg = await Post(
    applicant,
    "/api/v1/auth/register",
    new { email = "applicant-" + Guid.NewGuid().ToString("N") + "@caps.test", password }
);
Bearer(applicant, Access(pendingReg.Json));
var pendingUpload = await ExpertCall(Upload(applicant, "CV", pdf));
Check(
    pendingUpload.Status == HttpStatusCode.OK
        && pendingUpload.Json.GetProperty("data").GetProperty("status").GetString() == "DRAFT",
    "unverified applicant can save a draft with files"
);
var pendingSubmit = await ExpertCall(applicant.PostAsync(expertBase + "/submit", null));
Check(
    pendingSubmit.Status == HttpStatusCode.Forbidden
        && Code(pendingSubmit.Json) == "EMAIL_NOT_VERIFIED",
    "expert application submit requires a verified email"
);
var draftSupplement = await ExpertCall(Upload(applicant, "SUPPLEMENT", pdf));
Check(
    draftSupplement.Status == HttpStatusCode.BadRequest
        && Code(draftSupplement.Json) == "SUPPLEMENT_NOT_REQUESTED",
    "supplementary files are only accepted when more information is requested"
);

var fakeUpload = await ExpertCall(Upload(deviceA, "EV-01", "<svg onload=alert(1)>"u8.ToArray()));
Check(
    fakeUpload.Status == HttpStatusCode.BadRequest
        && Code(fakeUpload.Json) == "EVIDENCE_INVALID_TYPE",
    "evidence type sniffed from content"
);
Check(
    (await ExpertCall(deviceA.PostAsync(expertBase + "/submit", null))).Status
        == HttpStatusCode.NotFound,
    "submit without an application returns not found"
);
await deviceA.PutAsJsonAsync(expertBase, new { yearsExperience = 8 });
var incomplete = await ExpertCall(deviceA.PostAsync(expertBase + "/submit", null));
Check(
    incomplete.Status == HttpStatusCode.BadRequest
        && Code(incomplete.Json) == "APPLICATION_INCOMPLETE",
    "expert application requires CV and mandatory fields"
);
var cv = await ExpertCall(Upload(deviceA, "CV", pdf));
var cvId = cv.Json.GetProperty("data").GetProperty("evidence")[0].GetProperty("id").GetString();
var draft = await ExpertCall(
    deviceA.PutAsJsonAsync(
        expertBase,
        new
        {
            phone = "0901234567",
            yearsExperience = 8,
            fields = new[] { "CORPORATE_INCOME_TAX" },
        }
    )
);
Check(
    draft.Status == HttpStatusCode.OK
        && draft.Json.GetProperty("data").GetProperty("canSubmit").GetBoolean(),
    "complete draft can be submitted"
);
var submitted = await ExpertCall(deviceA.PostAsync(expertBase + "/submit", null));
Check(
    submitted.Status == HttpStatusCode.OK
        && submitted.Json.GetProperty("data").GetProperty("status").GetString() == "SUBMITTED",
    "submit expert application"
);
var lockedEdit = await ExpertCall(deviceA.PutAsJsonAsync(expertBase, new { yearsExperience = 1 }));
Check(
    lockedEdit.Status == HttpStatusCode.Conflict && Code(lockedEdit.Json) == "APPLICATION_LOCKED",
    "submitted application cannot be edited"
);
var ownFile = await deviceA.GetAsync($"{expertBase}/evidence/{cvId}/file");
Check(
    ownFile.IsSuccessStatusCode
        && (await ownFile.Content.ReadAsByteArrayAsync()).SequenceEqual(pdf),
    "applicant can download own evidence"
);
Check(
    (await applicant.GetAsync($"{expertBase}/evidence/{cvId}/file")).StatusCode
        == HttpStatusCode.NotFound,
    "another user cannot open the evidence"
);

// Verify email with the 6-digit code (applicant is still pending verification)
var applicantEmail = pendingReg
    .Json.GetProperty("data")
    .GetProperty("user")
    .GetProperty("email")
    .GetString()!;
var otp = await EmailCode(applicantEmail);
var wrongCode = await Post(
    applicant,
    "/api/v1/auth/verify-email-code",
    new { code = otp == "000000" ? "111111" : "000000" }
);
Check(
    wrongCode.Response.StatusCode == HttpStatusCode.BadRequest
        && Code(wrongCode.Json) == "CODE_INVALID",
    "wrong verification code rejected"
);
var rightCode = await Post(applicant, "/api/v1/auth/verify-email-code", new { code = otp });
Check(
    rightCode.Response.IsSuccessStatusCode
        && rightCode.Json.GetProperty("data").GetProperty("user").GetProperty("status").GetString()
            == "ACTIVE",
    "verification code activates the account and returns an active session"
);
var disposable = await Post(
    applicant,
    "/api/v1/auth/register",
    new { email = "someone@mailinator.com", password }
);
Check(
    disposable.Response.StatusCode == HttpStatusCode.BadRequest
        && Code(disposable.Json) == "EMAIL_DISPOSABLE",
    "disposable email domains are rejected at registration"
);
using var csrf = Client();
csrf.DefaultRequestHeaders.Remove("X-Caps-Client");
Check(
    (await Post(csrf, "/api/v1/auth/refresh-token", new { })).Response.StatusCode
        == HttpStatusCode.Forbidden,
    "missing CSRF client header rejected"
);
Check(
    (await c.GetAsync("/api/v1/users/me")).StatusCode == HttpStatusCode.Unauthorized,
    "anonymous me denied"
);

// Check concurrency/expiry directly against real PostgreSQL without using the HTTP quota.
var provider = DataProtectionProvider.Create(
    new DirectoryInfo(keyPath),
    x => x.SetApplicationName("caps-auth")
);
var jwt = new Caps.Common.Security.JwtOptions();

// Same key file as the running auth service (Development generates it there on first start)
var signingKeys = JwtSigningKeys.Load(new JwtSigningOptions { DevKeyPath = jwtKeyPath }, true);

// Same composition as the API: handlers resolved from DI, one scope (and DbContext) per call
var core = new ServiceCollection();
core.AddSingleton(jwt);
core.AddSingleton(signingKeys);
core.AddLogging();

// Same Redis as the running services, so in-process revocations are visible to them
core.AddCapsSessionRevocation(
    new ConfigurationBuilder()
        .AddInMemoryCollection(
            new Dictionary<string, string?> { ["ConnectionStrings:Redis"] = "127.0.0.1:6379" }
        )
        .Build()
);
core.AddSingleton<IDataProtectionProvider>(provider);
core.AddSingleton(TimeProvider.System);
core.AddSingleton(Microsoft.Extensions.Options.Options.Create(new AuthOptions()));
core.AddSingleton<Caps.Auth.Application.Abstractions.IEmailDomainPolicy, AllowAllEmails>();
core.AddAuthApplication();
core.AddAuthInfrastructure(connection);
await using var coreServices = core.BuildServiceProvider();
T Fresh<T>()
    where T : notnull => coreServices.CreateScope().ServiceProvider.GetRequiredService<T>();
Task<SessionResult> RegisterAsync(string email, string pwd) =>
    Fresh<ICommandHandler<RegisterCommand, SessionResult>>()
        .HandleAsync(new(email, pwd, null), default);
Task<SessionResult> LoginAsync(string email, string pwd) =>
    Fresh<ICommandHandler<LoginCommand, SessionResult>>().HandleAsync(new(email, pwd), default);
Task<SessionResult> RefreshAsync(string token) =>
    Fresh<ICommandHandler<RefreshSessionCommand, SessionResult>>().HandleAsync(new(token), default);
Task VerifyAsync(string token) =>
    Fresh<ICommandHandler<VerifyEmailCommand>>().HandleAsync(new(token), default);
Task ResendAsync(Guid userId) =>
    Fresh<ICommandHandler<ResendVerificationCommand>>().HandleAsync(new(userId), default);
async Task<int> Status(Func<Task> action)
{
    try
    {
        await action();
        return 200;
    }
    catch (Caps.Common.Domain.AppException e)
    {
        return Caps.Common.Api.ApiErrors.StatusCodeOf(e.Type);
    }
}
var raceEmail = "race-" + Guid.NewGuid().ToString("N") + "@caps.test";
var registrations = await Task.WhenAll(
    Enumerable
        .Range(0, 2)
        .Select(async _ =>
        {
            await using var db = new AuthDbContext(options);
            return await Status(async () =>
            {
                await RegisterAsync(raceEmail, password);
            });
        })
);
Check(
    registrations.Order().SequenceEqual(new[] { 200, 409 }),
    "concurrent registration creates one user"
);
Caps.Auth.Application.DTOs.Responses.SessionResult racedSession;
await using (var db = new AuthDbContext(options))
    racedSession = await LoginAsync(raceEmail, password);
var rotations = await Task.WhenAll(
    Enumerable
        .Range(0, 2)
        .Select(async _ =>
        {
            await using var db = new AuthDbContext(options);
            return await Status(async () =>
            {
                await RefreshAsync(racedSession.RefreshToken);
            });
        })
);
Check(
    rotations.Order().SequenceEqual(new[] { 200, 401 }),
    "concurrent refresh accepts old token once"
);
await using (var db = new AuthDbContext(options))
    Check(
        !await db.RefreshTokens.AnyAsync(x =>
            x.UserId.ToString() == racedSession.Response.User.UserId && x.RevokedAt == null
        ),
        "replay revokes remaining refresh sessions"
    );
var raceVerify = await EmailToken(raceEmail, "VERIFY_EMAIL");
var verifications = await Task.WhenAll(
    Enumerable
        .Range(0, 2)
        .Select(async _ =>
        {
            await using var db = new AuthDbContext(options);
            return await Status(() => VerifyAsync(raceVerify));
        })
);
Check(
    verifications.Order().SequenceEqual(new[] { 200, 401 }),
    "concurrent verification consumes token once"
);
var expiryEmail = "expiry-" + Guid.NewGuid().ToString("N") + "@caps.test";
Caps.Auth.Application.DTOs.Responses.SessionResult expiring;
await using (var db = new AuthDbContext(options))
    expiring = await RegisterAsync(expiryEmail, password);
var expiryToken = await EmailToken(expiryEmail, "VERIFY_EMAIL");
await using (var db = new AuthDbContext(options))
{
    var id = Guid.Parse(expiring.Response.User.UserId);
    await db
        .VerificationTokens.Where(x => x.UserId == id)
        .ExecuteUpdateAsync(x =>
            x.SetProperty(v => v.ExpiresAt, DateTimeOffset.UtcNow.AddMinutes(-1))
        );
    await db
        .RefreshTokens.Where(x => x.UserId == id)
        .ExecuteUpdateAsync(x =>
            x.SetProperty(v => v.ExpiresAt, DateTimeOffset.UtcNow.AddMinutes(-1))
        );
    Check(await Status(() => VerifyAsync(expiryToken)) == 401, "expired verification rejected");
    Check(
        await Status(async () =>
        {
            await RefreshAsync(expiring.RefreshToken);
        }) == 401,
        "expired refresh rejected"
    );
}
await using (var db = new AuthDbContext(options))
    Check(await Status(() => VerifyAsync(reset)) == 401, "reset token cannot verify email");
for (var i = 0; i < 5; i++)
{
    await using var db = new AuthDbContext(options);
    await Status(async () =>
    {
        await LoginAsync(raceEmail, "Wrong-password-123!");
    });
}
await using (var db = new AuthDbContext(options))
    Check(
        await Status(async () =>
        {
            await LoginAsync(raceEmail, password);
        }) == 401,
        "lockout blocks correct password after repeated failure"
    );

// Resend invalidates older links; checked through the service to avoid the HTTP quota.
var resendEmail = "resend-" + Guid.NewGuid().ToString("N") + "@caps.test";
Caps.Auth.Application.DTOs.Responses.SessionResult pending;
await using (var db = new AuthDbContext(options))
    pending = await RegisterAsync(resendEmail, password);
var oldVerify = await EmailToken(resendEmail, "VERIFY_EMAIL");
await using (var db = new AuthDbContext(options))
    Check(
        await Status(() => ResendAsync(Guid.Parse(pending.Response.User.UserId))) == 429,
        "resend cooldown"
    );
await using (var db = new AuthDbContext(options))
    await db
        .VerificationTokens.Where(x => x.UserId.ToString() == pending.Response.User.UserId)
        .ExecuteUpdateAsync(x =>
            x.SetProperty(v => v.CreatedAt, DateTimeOffset.UtcNow.AddMinutes(-2))
        );
Bearer(c, pending.Response.AccessToken);
Check(
    (await Post(c, "/api/v1/auth/resend-verification", new { })).Response.IsSuccessStatusCode,
    "resend endpoint"
);
await using (var db = new AuthDbContext(options))
    Check(await Status(() => VerifyAsync(oldVerify)) == 401, "resend invalidates previous link");

// In-memory broker and fake loopback SMTP: no email leaves the machine.
await using var smtp = new LocalSmtpSink();
var services = new ServiceCollection();
services.AddLogging();
services.AddDbContext<AuthDbContext>(x => x.UseNpgsql(connection));
services.AddSingleton<IDataProtectionProvider>(provider);
var smtpConfig = new ConfigurationBuilder()
    .AddInMemoryCollection(
        new Dictionary<string, string?>
        {
            ["Smtp:Host"] = "127.0.0.1",
            ["Smtp:Port"] = smtp.Port.ToString(),
            ["Smtp:EnableSsl"] = "false",
            ["Smtp:From"] = "test@caps.test",
        }
    )
    .Build();
services.AddSingleton<IConfiguration>(smtpConfig);
services.AddNotificationEmail(smtpConfig);
services.AddMassTransit(x =>
{
    x.AddConsumer<Caps.Notification.Features.AuthEmails.AuthEmailConsumer>();
    x.UsingInMemory((ctx, cfg) => cfg.ConfigureEndpoints(ctx));
});
services.AddSingleton<AuthEmailPublisher>();
await using var sp = services.BuildServiceProvider();
var bus = sp.GetRequiredService<IBusControl>();
await bus.StartAsync();
var publisher = sp.GetRequiredService<AuthEmailPublisher>();
await publisher.StartAsync(default);
try
{
    var body = await smtp.Message.Task.WaitAsync(TimeSpan.FromSeconds(20));
    var normalizedMail = body.Replace("\r\n", "\n");
    // Emails are multipart (plain text, HTML, embedded logo): decode each text part with its own encoding.
    static string DecodePart(string part)
    {
        var split = part.IndexOf("\n\n", StringComparison.Ordinal);
        if (split < 0)
            return part;
        var headers = part[..split];
        var content = part[(split + 2)..];
        if (
            headers.Contains(
                "Content-Transfer-Encoding: base64",
                StringComparison.OrdinalIgnoreCase
            )
        )
            return headers.Contains("Content-Type: text", StringComparison.OrdinalIgnoreCase)
                ? System.Text.Encoding.UTF8.GetString(
                    Convert.FromBase64String(string.Concat(content.Split('\n')).Trim())
                )
                : "";
        if (headers.Contains("quoted-printable", StringComparison.OrdinalIgnoreCase))
            return System.Text.RegularExpressions.Regex.Replace(
                content.Replace("=\n", ""),
                "=([0-9A-Fa-f]{2})",
                x => ((char)Convert.ToInt32(x.Groups[1].Value, 16)).ToString()
            );
        return content;
    }
    var mailContent = string.Join(
        "\n",
        System
            .Text.RegularExpressions.Regex.Split(normalizedMail, "\n--[^\n]+\n")
            .Select(DecodePart)
    );
    Check(
        mailContent.Contains("Shared Hub") && mailContent.Contains("token="),
        "encrypted outbox to broker consumer to SMTP"
    );
    for (var i = 0; i < 30; i++)
    {
        await using var db = new AuthDbContext(options);
        if (await db.EmailOutbox.AnyAsync(x => x.SentAt != null && x.ProtectedPayload == ""))
            break;
        await Task.Delay(100);
    }
    await using var dbCheck = new AuthDbContext(options);
    Check(
        await dbCheck.EmailOutbox.AnyAsync(x => x.SentAt != null && x.ProtectedPayload == ""),
        "published outbox payload cleared"
    );
}
finally
{
    await publisher.StopAsync(default);
    await bus.StopAsync();
}
Console.WriteLine($"{passed} HTTP/database/email assertions passed.");

sealed class LocalSmtpSink : IAsyncDisposable
{
    private readonly System.Net.Sockets.TcpListener listener = new(
        System.Net.IPAddress.Loopback,
        0
    );
    private readonly CancellationTokenSource stop = new();
    private readonly Task running;
    public int Port => ((System.Net.IPEndPoint)listener.LocalEndpoint).Port;
    public TaskCompletionSource<string> Message { get; } =
        new(TaskCreationOptions.RunContinuationsAsynchronously);

    public LocalSmtpSink()
    {
        listener.Start();
        running = Run();
    }

    private async Task Run()
    {
        try
        {
            while (!stop.IsCancellationRequested)
            {
                using var client = await listener.AcceptTcpClientAsync(stop.Token);
                using var stream = client.GetStream();
                using var reader = new StreamReader(stream);
                using var writer = new StreamWriter(stream) { AutoFlush = true, NewLine = "\r\n" };
                await writer.WriteLineAsync("220 localhost test SMTP");
                var body = new System.Text.StringBuilder();
                var data = false;
                while (await reader.ReadLineAsync(stop.Token) is { } line)
                {
                    if (data)
                    {
                        if (line == ".")
                        {
                            data = false;
                            Message.TrySetResult(body.ToString());
                            await writer.WriteLineAsync("250 accepted");
                        }
                        else
                            body.AppendLine(line);
                    }
                    else if (line.StartsWith("EHLO"))
                        await writer.WriteLineAsync("250 localhost");
                    else if (line == "DATA")
                    {
                        data = true;
                        await writer.WriteLineAsync("354 send data");
                    }
                    else if (line == "QUIT")
                    {
                        await writer.WriteLineAsync("221 bye");
                        break;
                    }
                    else
                        await writer.WriteLineAsync("250 ok");
                }
            }
        }
        catch (OperationCanceledException) { }
    }

    public async ValueTask DisposeAsync()
    {
        stop.Cancel();
        listener.Stop();
        try
        {
            await running;
        }
        catch (ObjectDisposedException) { }
        stop.Dispose();
    }
}

/// <summary>DNS checks are covered over HTTP; in-process runs only need sign-up to proceed.</summary>
sealed class AllowAllEmails : Caps.Auth.Application.Abstractions.IEmailDomainPolicy
{
    public Task EnsureDeliverableAsync(string email, CancellationToken ct) => Task.CompletedTask;
}
