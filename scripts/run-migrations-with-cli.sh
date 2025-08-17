#!/bin/bash

# Run Supabase migrations using CLI
# This is the proper way to run migrations with Supabase

echo "🔄 Running Supabase migrations..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    echo "   Or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Link to your project (you'll need your project ref)
echo "🔗 Make sure you're linked to your Supabase project:"
echo "   supabase link --project-ref YOUR_PROJECT_REF"

# Run migrations
echo "📝 Running migrations..."
supabase db push

# Alternative: Reset and run all migrations
echo "🔄 Or to reset and run all migrations:"
echo "   supabase db reset"

echo "✅ Migration commands ready. Run them manually if needed."