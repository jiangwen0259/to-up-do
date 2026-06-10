#!/bin/bash
set -e

echo "🧹 Cleaning old build artifacts..."
rm -rf dist .output

echo "🎨 Regenerating icons from icon.svg..."
node scripts/gen-icons.mjs

echo "📦 Bumping version..."
npm version patch --allow-dirty --no-git-tag-version

echo "🔨 Building..."
npx wxt build

echo "✅ Build complete! Output: dist/chrome-mv3/"
ls -la dist/chrome-mv3/
