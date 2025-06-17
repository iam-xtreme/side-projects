#!/bin/bash
set -e

APP_NAME="NoteApp"
RELEASE_DIR="release"

echo "🧹 Cleaning release folder..."
if [ -d "$RELEASE_DIR" ]; then
  rm -rf "$RELEASE_DIR"
  echo "✅ Cleaned existing release folder"
fi

echo "🔧 Building frontend with Vite..."
npm run build

echo "📦 Packaging Electron app..."

PLATFORM=$(uname)

# Ensure release folder exists
mkdir -p "$RELEASE_DIR"

if [[ "$PLATFORM" == "Darwin" ]]; then
  npx electron-builder --mac

  echo "📁 Moving macOS builds to $RELEASE_DIR"
  mv dist/*.dmg "$RELEASE_DIR" 2>/dev/null || true
  mv dist/*.zip "$RELEASE_DIR" 2>/dev/null || true

elif [[ "$PLATFORM" == "Linux" ]]; then
  npx electron-builder --linux

  echo "📁 Moving Linux builds to $RELEASE_DIR"
  mv dist/*.AppImage "$RELEASE_DIR" 2>/dev/null || true
  mv dist/*.deb "$RELEASE_DIR" 2>/dev/null || true
  mv dist/*.tar.* "$RELEASE_DIR" 2>/dev/null || true

else
  echo "❌ Unsupported OS: $PLATFORM"
  exit 1
fi

# Optional: Zip all builds in release folder
echo "📦 Zipping release files..."
cd "$RELEASE_DIR"
for file in *; do
  zip -r "${file%.*}.zip" "$file" >/dev/null && echo "✅ Zipped $file"
done
cd ..

echo "✅ Build complete. Release files are in ./$RELEASE_DIR/"
