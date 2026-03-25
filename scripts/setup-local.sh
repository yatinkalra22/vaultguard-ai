#!/usr/bin/env bash
# VaultGuard AI — Local Setup Script
# Usage: ./scripts/setup-local.sh

set -euo pipefail

echo "=== VaultGuard AI — Local Setup ==="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required. Run: npm install -g pnpm"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js 20+ required (found v${NODE_VERSION})"
  exit 1
fi

echo "Node.js $(node -v) detected"
echo "pnpm $(pnpm -v) detected"

# Install dependencies
echo ""
echo "Installing dependencies..."
pnpm install

# Check for env files
echo ""
if [ ! -f apps/web/.env.local ]; then
  echo "Warning: apps/web/.env.local not found"
  echo "  Copy .env.example and fill in your Auth0 + Supabase values:"
  echo "  cp .env.example apps/web/.env.local"
else
  echo "Frontend .env.local found"
fi

if [ ! -f apps/api/.env ]; then
  echo "Warning: apps/api/.env not found"
  echo "  Copy .env.example and fill in your Auth0 + Supabase values:"
  echo "  cp .env.example apps/api/.env"
else
  echo "Backend .env found"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Configure environment variables (see .env.example)"
echo "  2. Run scripts/setup-database.sql in Supabase SQL Editor"
echo "  3. Optionally run scripts/seed-database.sql for test data"
echo "  4. Start development: pnpm dev"
echo "     Web: http://localhost:3000"
echo "     API: http://localhost:4000"
