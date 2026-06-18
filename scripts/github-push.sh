#!/bin/bash
# GitHub Push Helper for ridethetide-blog
# Run this script after creating a Personal Access Token

echo "🚀 GitHub Push Helper for ridethetide-blog"
echo ""
echo "This repo needs to be pushed to: https://github.com/Lutho8/ridethetide-blog"
echo ""

# Check if token is provided
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN not set"
    echo ""
    echo "Step 1: Create a GitHub Personal Access Token"
    echo "   → https://github.com/settings/tokens/new"
    echo "   → Select scopes: repo (full control)"
    echo "   → Generate token and COPY it immediately"
    echo ""
    echo "Step 2: Set the token in this terminal:"
    echo "   export GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE"
    echo ""
    echo "Step 3: Re-run this script"
    echo "   ./scripts/github-push.sh"
    echo ""
    echo "OR push manually with:"
    echo "   git push https://Lutho8:\$GITHUB_TOKEN@github.com/Lutho8/ridethetide-blog.git main"
    exit 1
fi

echo "✅ GITHUB_TOKEN detected"
echo ""

# Create repo via API if it doesn't exist
echo "📦 Checking if repo exists on GitHub..."
REPO_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/Lutho8/ridethetide-blog)

if [ "$REPO_EXISTS" = "404" ]; then
    echo "   Repo does not exist. Creating..."
    curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" \
         -H "Accept: application/vnd.github.v3+json" \
         https://api.github.com/user/repos \
         -d '{"name":"peptide-south-africa-blog","description":"Peptide South Africa - AI-Native Content OS Blog","private":false}' > /dev/null
    echo "   ✅ Repo created"
elif [ "$REPO_EXISTS" = "200" ]; then
    echo "   ✅ Repo already exists"
else
    echo "   ⚠️  Unexpected response: $REPO_EXISTS"
fi

# Push
echo ""
echo "📤 Pushing to GitHub..."
git remote set-url origin https://Lutho8:${GITHUB_TOKEN}@github.com/Lutho8/ridethetide-blog.git
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to https://github.com/Lutho8/ridethetide-blog"
    echo ""
    echo "Next steps:"
    echo "   1. Go to https://github.com/Lutho8/ridethetide-blog/settings/secrets/actions"
    echo "   2. Add CLOUDFLARE_API_TOKEN"
    echo "   3. Add CLOUDFLARE_ACCOUNT_ID"
    echo "   4. Go to https://dash.cloudflare.com/ → Pages → Create Project"
    echo "   5. Connect to GitHub repo and deploy"
else
    echo ""
    echo "❌ Push failed. Check your token has 'repo' scope."
fi
