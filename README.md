# Ride The Tide — AI-Native Content OS

> Fully AI-native blog and content operations platform.
> Built with Astro, hosted on GitHub, deployed to Cloudflare Pages.

---

## 🚀 Quick Start

```bash
# Clone and enter directory
cd ridethetide-blog

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
ridethetide-blog/
├── src/
│   ├── content/
│   │   ├── blog/           # Blog articles (markdown)
│   │   ├── peptides/       # Peptide deep-dives
│   │   ├── guides/         # Protocol guides
│   │   └── categories/     # Category pages
│   ├── layouts/            # Astro layouts
│   ├── pages/              # Astro pages (routes)
│   ├── components/         # Reusable components
│   └── styles/             # Global CSS + Tailwind
├── public/                 # Static assets
├── scripts/                # Content OS pipeline scripts
├── config/                 # Source of truth + MCP configs
├── content-os/             # Reports, audits, drafts, embeddings
│   ├── reports/            # Gap analysis, drift reports
│   ├── audits/             # Content audit outputs
│   ├── drafts/             # AI-refreshed article drafts
│   ├── seeds/              # Seed keywords, customer language
│   └── embeddings/         # Vector embeddings for articles
├── .github/workflows/      # CI/CD for Cloudflare Pages
└── package.json
```

## 🎯 Content OS Workflows

### Terminal Commands

| Command | What It Does |
|---------|-------------|
| `npm run content:seed` | Generate article ideas from customer language + gap analysis |
| `npm run content:audit` | Pull Ahrefs + GSC data, flag decay, prioritize updates |
| `npm run content:refresh` | AI Content Helper — refresh top articles, save drafts |
| `npm run content:gap` | Find competitor topics we haven't covered |
| `npm run embeddings:build` | Crawl sitemap, generate vector embeddings |
| `npm run embeddings:drift` | Detect topical drift over time |
| `npm run os:serve` | Start Content OS dashboard locally |
| `npm run pipeline:full` | Run all audits + gap + drift in sequence |

### Dashboard

```bash
# Start the dashboard
npm run os:serve

# Open http://localhost:3000
```

The dashboard shows:
- KPI cards (articles, audit status, AI visibility, priority actions)
- MCP connector status
- Priority action list
- Recent reports
- Quick action buttons to run pipelines

## 🔌 MCP Connectors

See [`config/mcp-connectors.md`](config/mcp-connectors.md) for full setup.

| Service | Purpose | Status |
|---------|---------|--------|
| Ahrefs | SEO data, rankings, backlinks, gap analysis | 🔴 Not connected |
| Google Search Console | Traffic, indexing, decay detection | 🔴 Not connected |
| Gong | Sales call transcripts, customer language | 🔴 Not connected |
| Intercom | Support conversations, common questions | 🔴 Not connected |
| Slack | Team feedback, internal language | 🔴 Not connected |
| Brand Radar | AI search visibility, citations | 🔴 Not connected |

### Setup Steps

1. Copy `.env.example` to `.env`
2. Fill in your API keys
3. Install MCP servers: `npm install -g @ahrefs/mcp-server ...`
4. Add MCP config to your IDE (Claude Desktop, Cursor, VS Code)
5. Test: `node scripts/test-mcp-connections.cjs`

## 📚 Source of Truth

The canonical reference for all content operations:

- [`config/source-of-truth.md`](config/source-of-truth.md) — Product features, writing voice, strategic priorities, audience personas, competitive positioning
- [`config/mcp-connectors.md`](config/mcp-connectors.md) — MCP connector configurations

## 📝 Content Guidelines

Every article must include:

1. **Medical disclaimer** in first 100 words
2. **At least one primary research citation**
3. **South African regulatory context** (SAHPRA, scheduling)
4. **Dosing information** (compound, amount, frequency, duration, route)
5. **Contraindications and interaction warnings**
6. **"Talk to your doctor" callout**

See `config/source-of-truth.md` for full voice guidelines.

## 🔄 Automated Workflows

### Daily (Cron)

```bash
# Refresh highest priority articles
0 6 * * * cd /path/to/ridethetide-blog && node scripts/refresh-articles.cjs --top 3

# Generate firehose digest
0 7 * * * cd /path/to/ridethetide-blog && node scripts/firehose-digest.cjs --email lutho@ridethetide.site
```

### Weekly (Cron)

```bash
# Content audit
0 8 * * 1 cd /path/to/ridethetide-blog && node scripts/content-audit.cjs

# Gap analysis
0 9 * * 1 cd /path/to/ridethetide-blog && node scripts/gap-analysis.cjs

# Extract customer language
0 10 * * 1 cd /path/to/ridethetide-blog && node scripts/extract-language.cjs --source gong --days 7
0 10 * * 1 cd /path/to/ridethetide-blog && node scripts/extract-language.cjs --source intercom --days 7
```

### Monthly (Cron)

```bash
# Rebuild embeddings
0 6 1 * * cd /path/to/ridethetide-blog && node scripts/build-embeddings.cjs

# Detect topic drift
0 7 1 * * cd /path/to/ridethetide-blog && node scripts/topic-drift.cjs
```

## 🌐 Deployment

### Cloudflare Pages

1. Push to GitHub repository
2. Connect repository to Cloudflare Pages
3. Set build command: `npm run build`
4. Set build output directory: `dist`
5. Add environment variables in Cloudflare dashboard
6. Configure custom domain: `blog.ridethetide.site`

### GitHub Actions

The included workflow (`.github/workflows/deploy.yml`) automatically deploys on every push to `main`.

Required GitHub Secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## 🎨 Customization

### Colors

Edit `src/styles/global.css` and `tailwind.config.mjs`:

```css
--primary: #14b8a6;  /* Teal */
--danger: #ef4444;   /* Red */
--warning: #f59e0b;  /* Amber */
```

### Fonts

Add to `Layout.astro`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
```

## 📊 Content OS Dashboard

The dashboard is a single HTML file served by `scripts/dashboard-server.cjs`.

Features:
- Real-time KPI cards
- MCP connection status
- Priority action list
- One-click pipeline execution
- Report browser

## 🛡️ Security

- Never commit `.env` files
- Use GitHub Secrets for CI/CD
- Rotate API keys quarterly
- Use read-only tokens where possible

## 📄 License

Proprietary — Ride The Tide Research.

---

*Built for terminal-first, AI-native content operations.*
*All workflows are designed to be triggered from the command line or automated via cron.*
