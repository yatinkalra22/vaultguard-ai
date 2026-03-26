#!/usr/bin/env bash
# VaultGuard AI — Deploy Frontend to Vercel
# Usage: ./scripts/deploy-web.sh [--prod]
#
# WHY: All deployments from scripts, not manual CLI commands.
# This ensures consistent, repeatable deployments.
# Ref: docs/setup.md — "Frontend → Vercel"

set -euo pipefail

echo "=== VaultGuard AI — Deploy Frontend ==="

# Check prerequisites
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required"; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "Error: npx is required"; exit 1; }

# Parse args
PROD_FLAG=""
if [ "${1:-}" = "--prod" ]; then
  PROD_FLAG="--prod"
  echo "Deploying to PRODUCTION"
else
  echo "Deploying to PREVIEW (use --prod for production)"
fi

# Build check
echo ""
echo "Building frontend..."
cd "$(dirname "$0")/../apps/web"
pnpm build

# Deploy
echo ""
echo "Deploying to Vercel..."
npx vercel $PROD_FLAG

echo ""
echo "=== Deploy Complete ==="
echo ""
echo "Post-deploy checklist:"
echo "  1. Verify Auth0 callback URLs include the Vercel domain"
echo "  2. Set AUTH0_BASE_URL in Vercel env to the production URL"
echo "  3. Set NEXT_PUBLIC_API_URL to the Railway backend URL"
