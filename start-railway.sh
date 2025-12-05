#!/bin/sh
set -e

echo "🚀 Starting Peta Rawan Narkoba..."

# Create data directory if using Railway volume
if [ -n "$RAILWAY_VOLUME_MOUNT_PATH" ]; then
  echo "📁 Using Railway volume: $RAILWAY_VOLUME_MOUNT_PATH"
  mkdir -p "$RAILWAY_VOLUME_MOUNT_PATH/database"
else
  echo "📁 Using local data directory"
  mkdir -p /app/data
fi

# Start the application
echo "✅ Starting server..."
exec node server.js
