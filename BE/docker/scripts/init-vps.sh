#!/bin/sh
# First-time VPS bootstrap: generates JWT RSA private key and SeaweedFS S3 config inside secrets/ from .env.
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DOCKER_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ENV_FILE="$DOCKER_DIR/.env"
SECRETS_DIR="$DOCKER_DIR/secrets"

if [ ! -f "$ENV_FILE" ]; then
    echo "Missing $ENV_FILE. Copy .env.example to .env and replace all placeholders first." >&2
    exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

JWT_KEY="$SECRETS_DIR/jwt-signing-key.pem"
if [ ! -f "$JWT_KEY" ]; then
    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$JWT_KEY"
    chmod 600 "$JWT_KEY"
    echo "Generated $JWT_KEY"
else
    echo "Keeping existing $JWT_KEY"
fi

S3_CONFIG="$SECRETS_DIR/seaweedfs-s3.json"
: "${SEAWEEDFS_ACCESS_KEY:?set SEAWEEDFS_ACCESS_KEY in .env}"
: "${SEAWEEDFS_SECRET_KEY:?set SEAWEEDFS_SECRET_KEY in .env}"

cat > "$S3_CONFIG" <<EOF
{
  "identities": [
    {
      "name": "caps-prod",
      "credentials": [
        {
          "accessKey": "${SEAWEEDFS_ACCESS_KEY}",
          "secretKey": "${SEAWEEDFS_SECRET_KEY}"
        }
      ],
      "actions": ["Admin", "Read", "Write", "List", "Tagging"]
    }
  ]
}
EOF
chmod 600 "$S3_CONFIG"
echo "Wrote $S3_CONFIG"
