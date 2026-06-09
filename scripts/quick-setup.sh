#!/bin/bash
# Quick MCP Setup Script for Ride The Tide Content OS
# Run this after filling in your API keys below

echo "🔌 Ride The Tide — Quick MCP Setup"
echo ""
echo "This script will create your .env file and test connections."
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "✅ .env file already exists"
else
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "✅ Created .env from .env.example"
    echo ""
    echo "📝 NEXT: Open .env in your editor and fill in these 3 critical keys:"
    echo "   1. OPENAI_API_KEY      → https://platform.openai.com/api-keys"
    echo "   2. AHREFS_API_TOKEN    → https://app.ahrefs.com/api"
    echo "   3. GSC_REFRESH_TOKEN   → Run: node scripts/gsc-auth.cjs"
    echo ""
    echo "After filling in, re-run this script."
    exit 0
fi

# Test connections
echo "🧪 Testing MCP connections..."
node scripts/test-mcp-connections.cjs

echo ""
echo "📋 Next steps based on results above:"
echo "   ✅ Connected = working"
echo "   ❌ Missing = add the key to .env"
echo "   🔐 Auth error = key is wrong or lacks permissions"
echo ""
echo "🚀 Once OpenAI + Ahrefs + GSC are connected, run:"
echo "   node scripts/content-audit.cjs"
echo "   node scripts/gap-analysis.cjs"
echo "   npm run os:serve"
