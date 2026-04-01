#!/usr/bin/env bash
# VaultGuard AI — Deploy Backend to Railway
# Usage: ./scripts/deploy-api.sh
#
# WHY: All deployments from scripts, not manual CLI commands.
# Railway CLI deploys from the current directory.
# Ref: docs/setup.md — "Backend → Railway"

set -euo pipefail

echo "=== VaultGuard AI — Deploy Backend ==="

# Check prerequisites
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required"; exit 1; }
command -v railway >/dev/null 2>&1 || { echo "Error: Railway CLI is required. Run: pnpm add -g @railway/cli"; exit 1; }

# Build check
echo ""
echo "Building backend..."
cd "$(dirname "$0")/../apps/api"
pnpm build

# Deploy
echo ""
echo "Deploying to Railway..."
railway up

echo ""
echo "=== Deploy Complete ==="
echo ""
echo "Post-deploy checklist:"
echo "  1. Set all env vars in Railway dashboard (see .env.example)"
echo "  2. Update FRONTEND_URL to Vercel production URL"
echo "  3. Update Auth0 callback URLs with Railway domain"
