using Npgsql;

namespace Caps.Common.Persistence;

/// <summary>
/// Development bootstrapper: creates the database, extensions and schemas that are still missing.
/// </summary>
/// <remarks>
/// Each step checks for the object first and only creates what is missing. A restricted service role cannot create databases, extensions or schemas, but by then they all exist,
/// so it passes through. With an admin connection everything is created on first run (zero setup).
/// </remarks>
public static class DbInitializer
{
    private static readonly string[] Extensions = ["btree_gist", "uuid-ossp"];

    public static void EnsureDatabaseCreated(string connectionString, string schemaName)
    {
        EnsureDatabaseCreated(connectionString, [schemaName]);
    }

    public static void EnsureDatabaseCreated(string connectionString, params string[] schemaNames)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new ArgumentException(
                "Connection string cannot be null or empty.",
                nameof(connectionString)
            );
        }

        var builder = new NpgsqlConnectionStringBuilder(connectionString);
        var targetDb = string.IsNullOrWhiteSpace(builder.Database) ? "shft_db" : builder.Database;

        // Step 1: Connect to the default 'postgres' database to check/create the target database
        builder.Database = "postgres";
        using (var adminConn = new NpgsqlConnection(builder.ConnectionString))
        {
            adminConn.Open();
            if (!Exists(adminConn, "SELECT 1 FROM pg_database WHERE datname = @name;", targetDb))
                ExecuteCreate(adminConn, $"CREATE DATABASE {Quote(targetDb)};");
        }

        // Step 2: Connect to the target database, ensure extensions and schemas exist
        using var targetConn = new NpgsqlConnection(connectionString);
        targetConn.Open();

        foreach (var extension in Extensions)
        {
            if (!Exists(targetConn, "SELECT 1 FROM pg_extension WHERE extname = @name;", extension))
                ExecuteCreate(targetConn, $"CREATE EXTENSION IF NOT EXISTS {Quote(extension)};");
        }

        // CREATE SCHEMA IF NOT EXISTS still requires CREATE on the database, so check first
        foreach (var schema in schemaNames.Where(s => !string.IsNullOrWhiteSpace(s)))
        {
            if (!Exists(targetConn, "SELECT 1 FROM pg_namespace WHERE nspname = @name;", schema))
                ExecuteCreate(targetConn, $"CREATE SCHEMA IF NOT EXISTS {Quote(schema)};");
        }
    }

    private static bool Exists(NpgsqlConnection conn, string sql, string name)
    {
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@name", name);
        return cmd.ExecuteScalar() != null;
    }

    // Errors raised when another service created the same object between our check and our CREATE
    // (e.g. auth and expert starting together against an empty database). IF NOT EXISTS does not
    // cover this: concurrent creators can still hit the catalog's unique index.
    private static readonly HashSet<string> AlreadyExistsStates =
    [
        PostgresErrorCodes.UniqueViolation,
        PostgresErrorCodes.DuplicateDatabase,
        PostgresErrorCodes.DuplicateSchema,
        PostgresErrorCodes.DuplicateObject,
    ];

    private static void ExecuteCreate(NpgsqlConnection conn, string sql)
    {
        try
        {
            using var cmd = new NpgsqlCommand(sql, conn);
            cmd.ExecuteNonQuery();
        }
        catch (PostgresException ex) when (AlreadyExistsStates.Contains(ex.SqlState))
        {
            // Lost the race to a concurrent creator; the object exists now
        }
    }

    private static string Quote(string identifier) => $"\"{identifier.Replace("\"", "\"\"")}\"";
}
