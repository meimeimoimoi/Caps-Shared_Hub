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

// Expert availability (through the gateway) and the public marketplace (on the expert service directly:
// the gateway has no marketplace route yet). Names carry a run id so rows left by earlier runs never match.
const string availabilityPath = "/api/v1/experts/me/availability";
var expertRole = Guid.Parse("10000000-0000-0000-0000-000000000002");
using var market = new HttpClient { BaseAddress = new Uri(expertUrl) };
async Task Sql(FormattableString sql)
{
    await using var db = new AuthDbContext(options);
    await db.Database.ExecuteSqlInterpolatedAsync(sql);
}
Task<HttpResponseMessage> SetAvailability(HttpClient client, bool accepting, int capacity) =>
    client.PutAsJsonAsync(availabilityPath, new { accepting, capacity });
async Task<JsonElement[]> Market(string keyword, string query = "")
{
    var (_, json) = await ExpertCall(
        market.GetAsync($"/api/v1/marketplace/experts?keyword={keyword}{query}")
    );
    return json.GetProperty("data").GetProperty("items").EnumerateArray().ToArray();
}
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

// Two auth calls only (register, login): auth allows 30 requests a minute per address
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
    $"INSERT INTO identity.user_roles (user_id, role_id) VALUES ({expertUserId}, {expertRole})"
);
var expertLogin = await Post(
    expertClient,
    "/api/v1/auth/login",
    new { email = expertEmail, password }
);
Bearer(expertClient, Access(expertLogin.Json));

var notApproved = await ExpertCall(SetAvailability(expertClient, true, 3));
Check(
    notApproved.Status == HttpStatusCode.Forbidden
        && Code(notApproved.Json) == "NOT_APPROVED_FOR_SERVICE",
    "availability needs an approved expert profile"
);
var expertProfileId = Guid.NewGuid();
await Sql(
    $"INSERT INTO expert.expert_profile (id, user_id, display_name, status, created_at, updated_at) VALUES ({expertProfileId}, {expertUserId}, {"Market " + run}, 'APPROVED', now(), now())"
);
var notReady = await ExpertCall(SetAvailability(expertClient, true, 3));
Check(
    notReady.Status == HttpStatusCode.UnprocessableEntity
        && Code(notReady.Json) == "NOT_READY_TO_ACCEPT",
    "taking cases needs a service price and a turnaround"
);
Check(
    (await SetAvailability(expertClient, false, 3)).IsSuccessStatusCode,
    "pausing is allowed before the expert is ready"
);
await Sql($"UPDATE expert.expert_profile SET turnaround_hours = 48 WHERE id = {expertProfileId}");
await Sql(
    $"INSERT INTO expert.service_offering (id, expert_profile_id, service_type, fee, is_active, created_at) VALUES ({Guid.NewGuid()}, {expertProfileId}, 'cit-review', 700000, true, now())"
);
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

var listed = await Market(run);
Check(
    listed.Length == 1
        && listed[0].GetProperty("available").GetBoolean()
        && listed[0].GetProperty("fee").GetInt64() == 700000,
    "marketplace lists the expert taking cases with the service price"
);
await SetAvailability(expertClient, false, 3);
var paused = await Market(run);
Check(
    (await Market(run, "&openOnly=true")).Length == 0
        && paused.Length == 1
        && !paused[0].GetProperty("available").GetBoolean(),
    "a paused expert stays listed as unavailable and openOnly hides them"
);

// Ranking: A has a free slot and 90% VERIFIED, B a free slot and a better rating but 60% VERIFIED,
// C the best numbers but no free slot
var rank = Guid.NewGuid().ToString("N")[..10];
async Task<Guid> Seed(
    string name,
    int activeCases,
    int verified,
    int delivered,
    decimal rating,
    long fee
)
{
    var id = Guid.NewGuid();
    await Sql(
        $"INSERT INTO expert.expert_profile (id, user_id, display_name, status, service_status, turnaround_hours, capacity, active_cases, delivered_count, verified_count, rating_avg, rating_count, created_at, updated_at) VALUES ({id}, {Guid.NewGuid()}, {"Rank " + name + " " + rank}, 'APPROVED', 'ACTIVE', 48, 3, {activeCases}, {delivered}, {verified}, {rating}, 20, now(), now())"
    );
    await Sql(
        $"INSERT INTO expert.service_offering (id, expert_profile_id, service_type, fee, is_active, created_at) VALUES ({Guid.NewGuid()}, {id}, 'cit-review', {fee}, true, now())"
    );
    return id;
}
await Seed("A", activeCases: 0, verified: 9, delivered: 10, rating: 4.5m, fee: 800000);
await Seed("B", activeCases: 0, verified: 6, delivered: 10, rating: 5.0m, fee: 500000);
var expertC = await Seed(
    "C",
    activeCases: 3,
    verified: 19,
    delivered: 20,
    rating: 5.0m,
    fee: 1200000
);
Check(
    Names(await Market(rank)).SequenceEqual(["A", "B", "C"]),
    "recommended order: free slot and VERIFIED 80% first, full experts last"
);
Check(
    Names(await Market(rank, "&openOnly=true")).SequenceEqual(["A", "B"]),
    "openOnly keeps only experts with a free slot"
);
Check(
    Names(await Market(rank, "&sort=price")).SequenceEqual(["B", "A", "C"]),
    "price sort puts the cheapest first"
);
Check(
    (await Market(rank, "&serviceType=cit-review")).Length == 3
        && (await Market(rank, "&serviceType=not-sold")).Length == 0,
    "serviceType keeps only experts selling that service"
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
        && detailData.GetProperty("offerings").GetArrayLength() == 1,
    "expert profile shows availability, VERIFIED rate and service packages"
);
var missing = await ExpertCall(market.GetAsync($"/api/v1/marketplace/experts/{Guid.NewGuid()}"));
Check(
    missing.Status == HttpStatusCode.NotFound && Code(missing.Json) == "EXPERT_NOT_FOUND",
    "unknown expert profile is not found"
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
