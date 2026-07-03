#!/bin/sh
set -e

echo "⏳ Running database migrations..."
npx typeorm migration:run -d dist/data-source.js
echo "✅ Migrations complete"

echo "🚀 Starting application..."
exec node dist/main.js
