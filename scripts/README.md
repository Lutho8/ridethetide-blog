# Content Pipeline Scripts

This directory contains all AI-native content operation scripts.

## Scripts

| Script | Purpose | Trigger |
|--------|---------|---------|
| `seed-topics.js` | Generate article ideas from customer language + gap analysis | Manual / Weekly |
| `content-audit.js` | Pull Ahrefs + GSC data, flag decay, prioritize updates | Weekly (cron) |
| `refresh-articles.js` | Extract article, run AI Content Helper, save draft | Daily (cron) |
| `gap-analysis.js` | Find competitor topics we haven't covered | Weekly |
| `build-embeddings.js` | Crawl sitemap, generate vector embeddings | Monthly / On publish |
| `topic-drift.js` | Compare embeddings over time, flag topical drift | Monthly |
| `extract-language.js` | Pull Gong/Intercom/Slack, extract n-grams | Weekly |
| `firehose-digest.js` | Compile daily industry news + competitor alerts | Daily (cron) |
| `ai-visibility.js` | Check Brand Radar / AI search citations | Weekly |
| `traffic-decay.js` | GSC-based traffic decay detection | Weekly |
| `indexing-audit.js` | GSC indexing status check | Weekly |
| `dashboard-server.js` | Serve Content OS dashboard locally | Manual |
| `test-mcp-connections.js` | Verify all MCP connectors | On setup / Monthly |

## Environment Variables

All scripts read from `.env`:

```
AHREFS_API_TOKEN=...
GSC_CLIENT_ID=...
GSC_CLIENT_SECRET=...
GSC_REFRESH_TOKEN=...
GONG_ACCESS_KEY=...
GONG_SECRET_KEY=...
INTERCOM_ACCESS_TOKEN=...
SLACK_BOT_TOKEN=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
BRAND_RADAR_API_KEY=...
FEEDLY_API_KEY=...
```

## Usage

```bash
# Run full pipeline
npm run pipeline:full

# Individual scripts
npm run content:audit
npm run content:refresh
npm run content:gap
npm run embeddings:build
```
