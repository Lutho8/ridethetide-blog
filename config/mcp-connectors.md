# MCP Connector Configuration

> Model Context Protocol connectors for external data access
> Last updated: 2026-06-08

---

## 1. Ahrefs MCP

**Purpose:** SEO data, rankings, backlinks, content gap analysis, Site Audit

```json
{
  "mcpServers": {
    "ahrefs": {
      "command": "npx",
      "args": ["-y", "@ahrefs/mcp-server"],
      "env": {
        "AHREFS_API_TOKEN": "${AHREFS_API_TOKEN}",
        "AHREFS_PROJECT_ID": "ridethetide-site"
      }
    }
  }
}
```

**Required Environment Variables:**
- `AHREFS_API_TOKEN` — Get from Ahrefs API dashboard (https://app.ahrefs.com/api)
- `AHREFS_PROJECT_ID` — Your Ahrefs project identifier

**Available Tools:**
- `get_organic_keywords` — Rankings data for any domain
- `get_backlinks` — Backlink profile analysis
- `get_content_gap` — Competitor content gap analysis
- `get_site_audit` — Technical SEO issues
- `get_domain_rating` — DR score tracking
- `get_organic_traffic` — Traffic estimates

**Usage in Content OS:**
```bash
# Content audit pipeline
node scripts/content-audit.js --source ahrefs

# Gap analysis
node scripts/gap-analysis.js --competitors "peptide-sciences.com,science.bio"
```

---

## 2. Google Search Console MCP

**Purpose:** Search performance data, indexing status, traffic decay detection

```json
{
  "mcpServers": {
    "gsc": {
      "command": "npx",
      "args": ["-y", "@google/mcp-search-console"],
      "env": {
        "GSC_CLIENT_ID": "${GSC_CLIENT_ID}",
        "GSC_CLIENT_SECRET": "${GSC_CLIENT_SECRET}",
        "GSC_REFRESH_TOKEN": "${GSC_REFRESH_TOKEN}",
        "GSC_SITE_URL": "https://blog.ridethetide.site/"
      }
    }
  }
}
```

**Required Environment Variables:**
- `GSC_CLIENT_ID` — OAuth 2.0 client ID from Google Cloud Console
- `GSC_CLIENT_SECRET` — OAuth 2.0 client secret
- `GSC_REFRESH_TOKEN` — OAuth refresh token (run auth flow once)
- `GSC_SITE_URL` — Your verified GSC property

**Setup Steps:**
1. Go to https://console.cloud.google.com/
2. Create project → Enable Search Console API
3. Create OAuth 2.0 credentials (Desktop app)
4. Run: `node scripts/gsc-auth.js` to get refresh token
5. Save refresh token to environment

**Available Tools:**
- `get_search_analytics` — Queries, clicks, impressions, CTR, position
- `get_indexing_status` — URL indexing coverage
- `get_sitemaps` — Sitemap submission status

**Usage in Content OS:**
```bash
# Traffic decay detection
node scripts/traffic-decay.js --days 90 --threshold -20

# Indexing audit
node scripts/indexing-audit.js
```

---

## 3. Gong MCP

**Purpose:** Extract customer language, common entities, n-grams from sales calls

```json
{
  "mcpServers": {
    "gong": {
      "command": "npx",
      "args": ["-y", "@gong/mcp-server"],
      "env": {
        "GONG_ACCESS_KEY": "${GONG_ACCESS_KEY}",
        "GONG_SECRET_KEY": "${GONG_SECRET_KEY}",
        "GONG_BASE_URL": "https://api.gong.io"
      }
    }
  }
}
```

**Required Environment Variables:**
- `GONG_ACCESS_KEY` — From Gong API settings
- `GONG_SECRET_KEY` — From Gong API settings

**Available Tools:**
- `get_calls` — List recorded calls with filters
- `get_call_transcript` — Full transcript text
- `get_call_highlights` — AI-generated highlights
- `get_stats` — Call volume, duration, talk ratios

**Usage in Content OS:**
```bash
# Extract customer language
node scripts/extract-language.js --source gong --days 30

# Generate n-gram report
node scripts/ngram-analysis.js --calls 100 --min-frequency 3
```

---

## 4. Intercom MCP

**Purpose:** Customer support conversations, common questions, feature requests

```json
{
  "mcpServers": {
    "intercom": {
      "command": "npx",
      "args": ["-y", "@intercom/mcp-server"],
      "env": {
        "INTERCOM_ACCESS_TOKEN": "${INTERCOM_ACCESS_TOKEN}",
        "INTERCOM_APP_ID": "${INTERCOM_APP_ID}"
      }
    }
  }
}
```

**Required Environment Variables:**
- `INTERCOM_ACCESS_TOKEN` — From Intercom Developer Hub
- `INTERCOM_APP_ID` — Your Intercom workspace ID

**Available Tools:**
- `get_conversations` — List conversations with filters
- `get_conversation_content` — Full conversation text
- `get_tags` — Tag usage analysis
- `get_contacts` — Customer segments

**Usage in Content OS:**
```bash
# Extract common questions
node scripts/extract-language.js --source intercom --days 30

# Feature request analysis
node scripts/feature-requests.js --conversations 500
```

---

## 5. Slack MCP

**Purpose:** Internal team language, customer feedback shared in channels

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
        "SLACK_TEAM_ID": "${SLACK_TEAM_ID}"
      }
    }
  }
}
```

**Required Environment Variables:**
- `SLACK_BOT_TOKEN` — From Slack API (xoxb-...)
- `SLACK_TEAM_ID` — Your Slack workspace ID

**Available Tools:**
- `get_channel_history` — Message history for a channel
- `search_messages` — Search across channels
- `get_user_info` — User details

**Usage in Content OS:**
```bash
# Extract feedback from #customer-feedback
node scripts/extract-language.js --source slack --channel customer-feedback --days 30
```

---

## 6. Brand Radar / AI Search Visibility

**Purpose:** Track AI search citations, brand mentions in AI answers

> Note: Brand Radar may not have a formal MCP yet. Use API directly.

```json
{
  "mcpServers": {
    "brandradar": {
      "command": "node",
      "args": ["scripts/mcp-brandradar.js"],
      "env": {
        "BRAND_RADAR_API_KEY": "${BRAND_RADAR_API_KEY}"
      }
    }
  }
}
```

**Required Environment Variables:**
- `BRAND_RADAR_API_KEY` — From Ahrefs Brand Radar

**Custom Tools (via wrapper script):**
- `get_ai_citations` — Brand mentions in AI search answers
- `get_visibility_score` — AI search visibility trend
- `get_competitor_citations` — Competitor AI mention comparison

**Usage in Content OS:**
```bash
# AI visibility audit
node scripts/ai-visibility.js --brand "Ride The Tide"
```

---

## 7. Firehose / News Aggregation

**Purpose:** Daily industry news, competitor content alerts

> Use RSS + custom parser or Ahrefs Content Explorer API

```json
{
  "mcpServers": {
    "firehose": {
      "command": "node",
      "args": ["scripts/mcp-firehose.js"],
      "env": {
        "AHREFS_API_TOKEN": "${AHREFS_API_TOKEN}",
        "FEEDLY_API_KEY": "${FEEDLY_API_KEY}"
      }
    }
  }
}
```

**Custom Tools:**
- `get_new_competitor_articles` — New articles from competitor list
- `get_industry_news` — Peptide/biohacking industry news
- `get_trending_topics` — Emerging topics in niche

**Usage in Content OS:**
```bash
# Daily firehose digest
node scripts/firehose-digest.js --email lutho@ridethetide.site
```

---

## 8. AI Content Helper (Kimi / Moonshot AI)

**Purpose:** Analyze content gaps, suggest improvements, update old claims

> **Primary:** Kimi (Moonshot AI) — OpenAI-compatible API, excellent for long-context content analysis.
> **Fallbacks:** OpenAI, Anthropic (Claude)

```json
{
  "mcpServers": {
    "aihelper": {
      "command": "node",
      "args": ["scripts/mcp-aihelper.cjs"],
      "env": {
        "KIMI_API_KEY": "${KIMI_API_KEY}",
        "KIMI_BASE_URL": "https://api.moonshot.cn/v1",
        "KIMI_MODEL": "moonshot-v1-32k",
        "OPENAI_API_KEY": "${OPENAI_API_KEY}",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

**Required Environment Variables:**
- `KIMI_API_KEY` — From https://platform.moonshot.cn/ (primary)
- `KIMI_BASE_URL` — `https://api.moonshot.cn/v1` (default)
- `KIMI_MODEL` — `moonshot-v1-32k` or `moonshot-v1-128k` (default: 32k)
- `OPENAI_API_KEY` — Fallback if Kimi unavailable
- `ANTHROPIC_API_KEY` — Fallback if both unavailable

**Custom Tools:**
- `analyze_content_gaps` — Compare article vs. top-ranking content
- `suggest_updates` — Find outdated claims/statistics
- `generate_improvements` — AI-suggested topic expansions
- `check_voice_compliance` — Verify article matches canonical voice

**Usage in Content OS:**
```bash
# Refresh single article
node scripts/refresh-articles.cjs --slug bpc-157-guide --dry-run

# Batch refresh top 10
node scripts/refresh-articles.cjs --top 10 --save-drafts
```

---

## Installation & Setup

### Step 1: Install MCP servers

```bash
# Ahrefs
npm install -g @ahrefs/mcp-server

# Google Search Console
npm install -g @google/mcp-search-console

# Gong
npm install -g @gong/mcp-server

# Intercom
npm install -g @intercom/mcp-server

# Slack
npm install -g @modelcontextprotocol/server-slack
```

### Step 2: Create `.env` file

```bash
cp config/.env.example .env
# Edit with your actual API keys
```

### Step 3: Test connections

```bash
node scripts/test-mcp-connections.js
```

### Step 4: Add to Claude/Cursor/IDE

Copy the relevant MCP server config into your IDE's MCP settings:
- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Cursor: `.cursor/mcp.json`
- VS Code: `.vscode/mcp.json`

---

## Security Notes

- Never commit `.env` files to Git
- Use GitHub Secrets for CI/CD
- Rotate API keys quarterly
- Use read-only tokens where possible
- Scope tokens to minimum required permissions
