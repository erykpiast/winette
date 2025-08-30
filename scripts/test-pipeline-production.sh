#!/bin/bash

# Test LangChain pipeline with real production AI models (except image generation)
# This script uses real Claude 3.5 and GPT-5 models while mocking DALL-E to save costs

set -e

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo "📄 Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
    echo "✅ Environment variables loaded"
else
    echo "⚠️  No .env file found, using system environment variables"
fi
echo ""

echo "🔍 Checking required environment variables..."

# Check required environment variables
MISSING_VARS=()

if [ -z "$ANTHROPIC_API_KEY" ]; then
    MISSING_VARS+=("ANTHROPIC_API_KEY")
fi

if [ -z "$OPENAI_API_KEY" ]; then
    MISSING_VARS+=("OPENAI_API_KEY")
fi

# Optional but recommended for tracing
if [ -z "$LANGSMITH_API_KEY" ]; then
    echo "⚠️  Warning: LANGSMITH_API_KEY not set (tracing will be disabled)"
fi

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please set these in your .env file or export them before running."
    exit 1
fi

echo "✅ All required environment variables are set"
echo ""

# Set optional LangSmith configuration if API key is present
if [ -n "$LANGSMITH_API_KEY" ]; then
    export LANGSMITH_TRACING="true"
    export LANGSMITH_PROJECT="${LANGSMITH_PROJECT:-winette}"
    echo "📊 LangSmith tracing enabled (project: $LANGSMITH_PROJECT)"
else
    export LANGSMITH_TRACING="false"
fi

# Optional: Set custom label style (classic, modern, elegant, funky)
export LABEL_STYLE="${LABEL_STYLE:-elegant}"

echo "🚀 Running pipeline test with:"
echo "   - Real Claude 3.5 Haiku for text generation"
echo "   - Real GPT-5 for vision analysis"
echo "   - Mock DALL-E 3 for image generation (to save costs)"
echo "   - Label style: $LABEL_STYLE"
echo ""

# Run the test
npx tsx --tsconfig tsconfig.scripts.json scripts/test-langchain-pipeline-with-tracing.ts
