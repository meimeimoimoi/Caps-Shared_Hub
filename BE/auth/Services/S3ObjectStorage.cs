using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using auth.Services.Interface;
using Microsoft.Extensions.Options;

namespace auth.Services;

public sealed class StorageOptions
{
    /// <summary>Endpoint S3 (SeaweedFS khi dev). Để trống nếu dùng AWS S3 thật theo Region.</summary>
    public string? ServiceUrl { get; set; }
    public string Region { get; set; } = "us-east-1";
    public string AccessKey { get; set; } = "";
    public string SecretKey { get; set; } = "";
    public string Bucket { get; set; } = "caps-expert-evidence";

    /// <summary>Tự tạo bucket khi chưa có (chỉ nên bật khi dev).</summary>
    public bool CreateBucket { get; set; }
}

/// <summary>Lưu file qua API S3: SeaweedFS/MinIO khi dev, AWS S3 khi deploy (chỉ đổi cấu hình).</summary>
public sealed class S3ObjectStorage : IObjectStorage, IDisposable
{
    private readonly AmazonS3Client client;
    private readonly StorageOptions o;
    private readonly SemaphoreSlim bucketLock = new(1, 1);
    private bool bucketReady;

    public S3ObjectStorage(IOptions<StorageOptions> options)
    {
        o = options.Value;
        var config = new AmazonS3Config
        {
            // S3 tự host không hỗ trợ virtual-host bucket và checksum mặc định mới của SDK v4.
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

    public async Task DeleteAsync(string key, CancellationToken ct)
    {
        await EnsureBucket(ct);
        await client.DeleteObjectAsync(o.Bucket, key, ct);
    }

    public void Dispose()
    {
        client.Dispose();
        bucketLock.Dispose();
    }
}
