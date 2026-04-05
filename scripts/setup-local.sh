#!/usr/bin/env bash
# VaultGuard AI — Local Setup Script
# Usage: ./scripts/setup-local.sh
#
# WHY: Single script to go from clone to running locally.
# Checks prerequisites, installs deps, validates env, builds both apps.
# Ref: docs/setup.md — "Step 9 — Run Locally"

set -euo pipefail

echo "=== VaultGuard AI — Local Setup ==="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required. Run: npm install -g pnpm"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "Error: git is required"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js 20+ required (found v${NODE_VERSION})"
  exit 1
fi

echo "Node.js $(node -v) detected"
echo "pnpm $(pnpm -v) detected"

# Navigate to repo root
cd "$(dirname "$0")/.."

# Install dependencies
echo ""
echo "Installing dependencies..."
pnpm install

# Check for env files
echo ""
ENV_OK=true

if [ ! -f apps/web/.env.local ]; then
  echo "Warning: apps/web/.env.local not found"
  echo "  Create it from the frontend template:"
  echo "    cp apps/web/.env.example apps/web/.env.local"
  echo "    # Then fill in your keys — see docs/FRONTEND_ENV_SETUP.md"
  ENV_OK=false
else
  echo "Frontend .env.local found"
fi

if [ ! -f apps/api/.env ]; then
  echo "Warning: apps/api/.env not found"
  echo "  Create it from the backend template:"
  echo "    cp apps/api/.env.example apps/api/.env"
  echo "    # Then fill in your keys — see docs/BACKEND_ENV_SETUP.md"
  ENV_OK=false
else
  echo "Backend .env found"
fi

# Build check
echo ""
echo "Building backend..."
cd apps/api && pnpm build && cd ../..
echo "Backend build OK"

echo ""
echo "Building frontend..."
cd apps/web && pnpm build && cd ../..
echo "Frontend build OK"

echo ""
echo "=== Setup Complete ==="
echo ""

if [ "$ENV_OK" = false ]; then
  echo "ACTION REQUIRED: Configure environment variables before starting."
  echo "  See apps/web/.env.example and apps/api/.env.example for required values."
  echo ""
fi

echo "Next steps:"
echo "  1. Configure environment variables (see apps/web/.env.example & apps/api/.env.example)"
echo "  2. Set up Auth0 tenant (see docs/setup.md)"
echo "  3. Run scripts/setup-database.sql in Supabase SQL Editor"
echo "  4. Optionally run scripts/seed-database.sql for test data"
echo "  5. Deploy FGA model: ./scripts/setup-fga-model.sh"
echo "  6. Start development: pnpm dev"
echo "     Web: http://localhost:3000"
echo "     API: http://localhost:4000"
