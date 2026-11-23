using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Caps.Workflow.Application.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Caps.Workflow.Infrastructure.Storage;

/// <summary>S3-compatible storage settings ("Storage" section); SeaweedFS in development.</summary>
public sealed class StorageOptions
{
    /// <summary>S3 endpoint (SeaweedFS in dev). Leave empty to use real AWS S3 by Region.</summary>
    public string? ServiceUrl { get; set; }
    public string Region { get; set; } = "us-east-1";
    public string AccessKey { get; set; } = "";
    public string SecretKey { get; set; } = "";
    public string Bucket { get; set; } = "caps-review-attachments";

    /// <summary>Create the bucket if missing (enable in dev only).</summary>
    public bool CreateBucket { get; set; }
}

// ponytail: copy of the expert service's adapter; move both to common/Storage once the team agrees
public sealed class S3ObjectStorage : IObjectStorage, IDisposable
{
    private readonly AmazonS3Client client;
    private readonly StorageOptions o;
    private readonly SemaphoreSlim bucketLock = new(1, 1);
    private bool bucketReady;

    private readonly ILogger<S3ObjectStorage> logger;

    public S3ObjectStorage(IOptions<StorageOptions> options, ILogger<S3ObjectStorage> logger)
    {
        this.logger = logger;
        o = options.Value;
        var config = new AmazonS3Config
        {
            // Self-hosted S3 supports neither virtual-host buckets nor the new default checksums of SDK v4.
            ForcePathStyle = true,
            RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
            ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
            AuthenticationRegion = o.Region,
        };
        if (!string.IsNullOrEmpty(o.ServiceUrl))
            config.ServiceURL = o.ServiceUrl;
        else
            config.RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(o.Region);
        client = new AmazonS3Client(new BasicAWSCredentials(o.AccessKey, o.SecretKey), config);
    }

    private async Task EnsureBucket(CancellationToken ct)
    {
        if (bucketReady || !o.CreateBucket)
            return;
        await bucketLock.WaitAsync(ct);
        try
        {
            if (bucketReady)
                return;
            try
            {
                await client.PutBucketAsync(new PutBucketRequest { BucketName = o.Bucket }, ct);
            }
            catch (AmazonS3Exception e)
                when (e.ErrorCode is "BucketAlreadyOwnedByYou" or "BucketAlreadyExists") { }
            bucketReady = true;
        }
        finally
        {
            bucketLock.Release();
        }
    }

    public async Task PutAsync(string key, byte[] content, string contentType, CancellationToken ct)
    {
        await EnsureBucket(ct);
        await client.PutObjectAsync(
            new PutObjectRequest
            {
                BucketName = o.Bucket,
                Key = key,
                InputStream = new MemoryStream(content, writable: false),
                ContentType = contentType,
            },
            ct
        );
    }

    public async Task<Stream> OpenAsync(string key, CancellationToken ct)
    {
        await EnsureBucket(ct);
        var response = await client.GetObjectAsync(o.Bucket, key, ct);
        return response.ResponseStream;
    }

    public async Task DeleteQuietlyAsync(string key)
    {
        try
        {
            await EnsureBucket(CancellationToken.None);
            await client.DeleteObjectAsync(o.Bucket, key, CancellationToken.None);
        }
        catch (Exception e)
        {
            // An orphaned file only wastes space and leaks nothing; log it for later cleanup.
            logger.LogWarning(e, "Could not delete orphan attachment object {Key}", key);
        }
    }

    public void Dispose()
    {
        client.Dispose();
        bucketLock.Dispose();
    }
}
