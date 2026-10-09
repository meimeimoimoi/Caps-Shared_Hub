using Npgsql;

namespace Caps.Common.Database;

/// <summary>
/// Database bootstrapper responsible for zero-setup developer experience.
/// Checks and creates the PostgreSQL database, required extensions, and schemas.
/// </summary>
public static class DbInitializer
{
    public static void EnsureDatabaseCreated(string connectionString, string schemaName)
    {
        EnsureDatabaseCreated(connectionString, [schemaName]);
    }

    public static void EnsureDatabaseCreated(string connectionString, params string[] schemaNames)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new ArgumentException("Connection string cannot be null or empty.", nameof(connectionString));
        }

        var builder = new NpgsqlConnectionStringBuilder(connectionString);
        var targetDb = string.IsNullOrWhiteSpace(builder.Database) ? "shft_db" : builder.Database;

        // Step 1: Connect to default 'postgres' database to check/create target database
        builder.Database = "postgres";
        var adminConnString = builder.ConnectionString;

        using (var adminConn = new NpgsqlConnection(adminConnString))
        {
            adminConn.Open();

            using var checkCmd = new NpgsqlCommand("SELECT 1 FROM pg_database WHERE datname = @dbName;", adminConn);
            checkCmd.Parameters.AddWithValue("@dbName", targetDb);
            var exists = checkCmd.ExecuteScalar() != null;

            if (!exists)
            {
                var sanitizedDb = targetDb.Replace("\"", "\"\"");
                using var createCmd = new NpgsqlCommand($"CREATE DATABASE \"{sanitizedDb}\";", adminConn);
                createCmd.ExecuteNonQuery();
            }
        }

        // Step 2: Connect to target database, ensure extensions and schemas exist
        using (var targetConn = new NpgsqlConnection(connectionString))
        {
            targetConn.Open();

            using var extCmd = new NpgsqlCommand(@"
                CREATE EXTENSION IF NOT EXISTS ""btree_gist"";
                CREATE EXTENSION IF NOT EXISTS ""uuid-ossp"";", targetConn);
            extCmd.ExecuteNonQuery();

            foreach (var schema in schemaNames)
            {
                if (!string.IsNullOrWhiteSpace(schema))
                {
                    var sanitizedSchema = schema.Replace("\"", "\"\"");
                    using var schemaCmd = new NpgsqlCommand($"CREATE SCHEMA IF NOT EXISTS \"{sanitizedSchema}\";", targetConn);
                    schemaCmd.ExecuteNonQuery();
                }
            }
        }
    }
}
