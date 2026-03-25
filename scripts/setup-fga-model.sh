#!/usr/bin/env bash
# VaultGuard AI — Deploy FGA Authorization Model
# Usage: ./scripts/setup-fga-model.sh
#
# Prerequisites:
#   - FGA CLI: brew install openfga/tap/fga
#   - Environment variables: FGA_STORE_ID, FGA_CLIENT_ID, FGA_CLIENT_SECRET
#
# WHY: Authorization model defines who can do what in VaultGuard.
# Only org admins can approve remediations. Members can view but not act.
# See: https://docs.fga.dev/modeling/getting-started

set -euo pipefail

echo "=== VaultGuard AI — FGA Model Setup ==="

# Check for FGA CLI
command -v fga >/dev/null 2>&1 || {
  echo "Error: FGA CLI required. Install with: brew install openfga/tap/fga"
  exit 1
}

# Create model file
MODEL_FILE=$(mktemp /tmp/vaultguard-fga-model.XXXXXX.fga)
cat > "$MODEL_FILE" << 'EOF'
model
  schema 1.1

type user

type organization
  relations
    define admin: [user]
    define member: [user] or admin

type integration
  relations
    define owner: [organization]
    define can_connect: admin from owner
    define can_disconnect: admin from owner

type remediation
  relations
    define owner: [organization]
    define can_approve: admin from owner
    define can_reject: admin from owner
EOF

echo "Model file created at $MODEL_FILE"
echo ""
echo "Contents:"
cat "$MODEL_FILE"
echo ""

# Write the model
if [ -n "${FGA_STORE_ID:-}" ]; then
  echo "Writing model to FGA store: $FGA_STORE_ID"
  fga model write --store-id "$FGA_STORE_ID" --file "$MODEL_FILE"
  echo "Model deployed successfully!"
else
  echo "FGA_STORE_ID not set — model file created but not deployed."
  echo "To deploy manually:"
  echo "  fga model write --store-id YOUR_STORE_ID --file $MODEL_FILE"
fi

rm -f "$MODEL_FILE"
