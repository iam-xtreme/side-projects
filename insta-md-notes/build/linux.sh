#!/bin/bash

set -e

echo "🔧 Building frontend with Vite..."
npm run build

echo "📦 Building Electron app for Linux..."
npx electron-builder --config electron-builder.json --linux
