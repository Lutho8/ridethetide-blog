# 🚀 Go-Live Deployment Guide — Peptide South Africa Content OS

> Complete step-by-step to take your blog from local repo to live site.
> Estimated time: 30–45 minutes
> Prerequisites: GitHub account, Cloudflare account, domain access

---

## Phase 1: Push to GitHub (5 min)

### Step 1.1 — Create a GitHub Personal Access Token

1. Open https://github.com/settings/tokens/new
2. **Token name:** `ridethetide-blog-deploy`
3. **Expiration:** 90 days (or No expiration — your choice)
4. **Scopes:** Check only **`repo`** (Full control of private repositories)
5. Click **Generate token**
6. **COPY the token immediately** — you cannot see it again

### Step 1.2 — Push the Repo

Open your terminal (Git Bash, PowerShell, or CMD) and run:

```bash
cd C:\Users\LuthoKote\Documents\kimi\workspace\ridethetide-blog

# Set your token as an environment variable
set GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE

# Run the push helper
.\scripts\github-push.sh
```

**If the helper fails, push manually:**

```bash
cd C:\Users\LuthoKote\Documents\kimi\workspace\ridethetide-blog
git remote set-url origin https://Lutho8:%GITHUB_TOKEN%@github.com/Lutho8/ridethetide-blog.git
git push -u origin main --force
```

### Step 1.3 — Verify

- Open https://github.com/Lutho8/ridethetide-blog
- You should see all files, commits, and the README

---

## Phase 2: Connect Cloudflare Pages (10 min)

### Step 2.1 — Get Cloudflare Credentials

1. Go to https://dash.cloudflare.com/
2. Sign in (or create free account)
3. In the right sidebar, find your **Account ID** — copy it
4. Go to https://dash.cloudflare.com/profile/api-tokens
5. Click **Create Token**
6. Use template: **"Cloudflare Pages"** (or custom: `Zone:Read`, `Page Rules:Edit`, `Cloudflare Pages:Edit`)
7. Copy the **API Token**

### Step 2.2 — Add Secrets to GitHub

1. Open https://github.com/Lutho8/ridethetide-blog/settings/secrets/actions
2. Click **New repository secret**
3. Add:
   - Name: `CLOUDFLARE_API_TOKEN` → Value: your API token
   - Name: `CLOUDFLARE_ACCOUNT_ID` → Value: your Account ID
4. Click **Add secret** for each

### Step 2.3 — Connect Cloudflare Pages to GitHub

1. Go to https://dash.cloudflare.com/ → **Pages** (left sidebar)
2. Click **Create a project**
3. Select **Connect to Git**
4. Authorize Cloudflare to access your GitHub
5. Select repository: `Lutho8 / ridethetide-blog`
6. Click **Begin setup**

### Step 2.4 — Configure Build Settings

| Setting | Value |
|---------|-------|
| Project name | `ridethetide-blog` |
| Production branch | `main` |
| Framework preset | `Astro` (or None) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (leave default) |

Click **Save and Deploy**

### Step 2.5 — Verify First Deploy

- Wait 1–2 minutes for build
- Cloudflare will show a `*.pages.dev` URL (e.g., `ridethetide-blog.pages.dev`)
- Click it — your blog should be live

---

## Phase 3: Custom Domain (5 min)

### Step 3.1 — Add Custom Domain in Cloudflare

1. In Cloudflare Pages project → **Custom domains** tab
2. Click **Set up a custom domain**
3. Enter: `peptide-south-africa.com/blog`
4. Click **Continue**

### Step 3.2 — DNS Configuration

Cloudflare will show DNS records to add. If your domain is already on Cloudflare:

1. Go to https://dash.cloudflare.com/ → select `peptide-south-africa.com`
2. Go to **DNS** → **Records**
3. Add a **CNAME** record:
   - Name: `blog`
   - Target: `ridethetide-blog.pages.dev` (or whatever Cloudflare shows)
   - Proxy status: **DNS only** (grey cloud) initially, then orange after verification
4. Save

### Step 3.3 — Verify

- Wait 2–5 minutes for DNS propagation
- Visit https://peptide-south-africa.com/blog
- Should show your blog with SSL certificate (green lock)

---

## Phase 4: Google Search Console (5 min)

### Step 4.1 — Add Property

1. Go to https://search.google.com/search-console
2. Click **Add property**
3. Select **Domain** (recommended) or **URL prefix**
4. Enter: `peptide-south-africa.com/blog`
5. Click **Continue**

### Step 4.2 — Verify Ownership

**If using URL prefix:**
- Download the HTML verification file
- Place it in `ridethetide-blog/public/` directory
- Commit and push: `git add -A && git commit -m "add: GSC verification" && git push`
- Wait for Cloudflare deploy, then click **Verify** in GSC

**If using Domain (recommended):**
- Add a **TXT record** in Cloudflare DNS:
  - Name: `@` (or `peptide-south-africa.com`)
  - Content: the string Google provides (e.g., `google-site-verification=...`)
- Save, wait 1–2 minutes, click **Verify**

### Step 4.3 — Submit Sitemap

1. In GSC left sidebar → **Sitemaps**
2. Enter sitemap URL: `sitemap-index.xml`
3. Click **Submit**

---

## Phase 5: Connect MCP APIs (10 min)

### Step 5.1 — OpenAI (Required First — Enables AI Content Helper)

1. Go to https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Name: `ridethetide-content-os`
4. Copy the key (starts with `sk-`)
5. Open `ridethetide-blog/.env` and add:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```

### Step 5.2 — Ahrefs (Required for SEO Audit + Gap Analysis)

1. Go to https://app.ahrefs.com/api
2. Generate API token
3. Add to `.env`:
   ```
   AHREFS_API_TOKEN=your-token-here
   ```

### Step 5.3 — Google Search Console API (Required for Traffic Decay Detection)

1. Go to https://console.cloud.google.com/
2. Create new project (or select existing)
3. **APIs & Services** → **Library** → Search "Search Console API" → **Enable**
4. **Credentials** → **Create credentials** → **OAuth 2.0 Client ID**
5. Application type: **Desktop app**
6. Name: `ridethetide-gsc`
7. Copy **Client ID** and **Client Secret**
8. Add to `.env`:
   ```
   GSC_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GSC_CLIENT_SECRET=your-client-secret
   ```
9. Run the auth flow:
   ```bash
   cd ridethetide-blog
   node scripts/gsc-auth.cjs
   ```
10. Follow the prompts — open the URL, authorize, paste the code
11. The script will output a **refresh token** — add it to `.env`:
    ```
    GSC_REFRESH_TOKEN=your-refresh-token
    ```

### Step 5.4 — Test All Connections

```bash
cd ridethetide-blog
node scripts/test-mcp-connections.cjs
```

You should see:
- ✅ OpenAI: Connected
- ✅ Ahrefs: Connected (or Auth error if key permissions need setup)
- ✅ GSC: Connected (after refresh token is set)
- ⚠️ Others: Missing (expected — connect later as needed)

---

## Phase 6: First Content Audit Run (5 min)

### Step 6.1 — Run the Pipeline

```bash
cd ridethetide-blog
node scripts/content-audit.cjs
node scripts/gap-analysis.cjs
node scripts/build-embeddings.cjs
```

### Step 6.2 — Check Reports

```bash
ls content-os/audits/
ls content-os/reports/
ls content-os/embeddings/
```

You should see JSON and Markdown files with today's date.

### Step 6.3 — Start the Dashboard

```bash
cd ridethetide-blog
npm run os:serve
```

Open http://localhost:3000 in your browser.

---

## Phase 7: Verify Everything Works (5 min)

### Checklist

| # | Check | How |
|---|-------|-----|
| 1 | GitHub repo has all files | https://github.com/Lutho8/ridethetide-blog |
| 2 | Cloudflare Pages deployed | https://ridethetide-blog.pages.dev |
| 3 | Custom domain works | https://peptide-south-africa.com/blog |
| 4 | SSL certificate active | Green lock in browser |
| 5 | GSC property verified | https://search.google.com/search-console |
| 6 | Sitemap submitted | GSC → Sitemaps → Status: Success |
| 7 | OpenAI API connected | `node scripts/test-mcp-connections.cjs` |
| 8 | Ahrefs API connected | Same test |
| 9 | GSC API connected | Same test |
| 10 | Dashboard loads | http://localhost:3000 |
| 11 | Content audit ran | `ls content-os/audits/` has files |
| 12 | Embeddings built | `ls content-os/embeddings/` has files |

### Quick Smoke Test

Visit these URLs and confirm they load:
- https://peptide-south-africa.com/blog/ (homepage)
- https://peptide-south-africa.com/blog/blog/ (blog index)
- https://peptide-south-africa.com/blog/blog/bpc-157-guide/ (article)
- https://peptide-south-africa.com/blog/peptides/ (peptide database)
- https://peptide-south-africa.com/blog/rss.xml (RSS feed)

---

## Phase 8: Post-Launch (Ongoing)

### Immediate (This Week)

- [ ] Share peptide-south-africa.com/blog on social media
- [ ] Add link from peptide-south-africa.com and app.peptide-south-africa.com to blog
- [ ] Submit sitemap to Bing Webmaster Tools (https://www.bing.com/webmasters)
- [ ] Set up Google Analytics 4 (optional but recommended)

### Week 1

- [ ] Review first content audit report
- [ ] Write 2–3 more articles from seed topics (`content-os/seeds/`)
- [ ] Check GSC for indexing status
- [ ] Monitor Cloudflare Pages analytics

### Week 2–4

- [ ] Connect Gong/Intercom/Slack MCPs when ready
- [ ] Run first full pipeline: `npm run pipeline:full`
- [ ] Review gap analysis and prioritize new content
- [ ] Check AI search visibility (Brand Radar when available)

### Ongoing (Automated)

| Task | Frequency | Trigger |
|------|-----------|---------|
| Content audit | Weekly (Mon 08:00) | Cron job |
| Article refresh | Daily (06:00) | Cron job |
| Firehose digest | Daily (07:00) | Cron job |
| Embeddings rebuild | Monthly (1st 06:00) | Cron job |

---

## Troubleshooting

### "Git push fails with authentication error"
- Your token may have expired or lacks `repo` scope
- Regenerate at https://github.com/settings/tokens
- Ensure you're using the full token (not truncated)

### "Cloudflare build fails"
- Check build log in Cloudflare Pages dashboard
- Common issue: Node version — set `NODE_VERSION=20` in environment variables
- Ensure `dist` directory exists after `npm run build`

### "Custom domain shows 404"
- DNS propagation can take up to 24 hours (usually 5 min)
- Check CNAME record points to correct `.pages.dev` URL
- Ensure Cloudflare proxy is orange (not grey) after initial verification

### "GSC verification fails"
- For HTML file: ensure file is in `public/` and deployed
- For DNS: wait 2–5 minutes after adding TXT record
- Use URL prefix method if domain method fails

### "MCP test shows 'missing' for all"
- `.env` file must be in `ridethetide-blog/` root (same level as `package.json`)
- No quotes around values in `.env`
- Run `node scripts/test-mcp-connections.cjs` from `ridethetide-blog/` directory

### "Dashboard shows 'Not Connected' for everything"
- Expected until MCPs are connected
- Dashboard is a static HTML file — it reads from `content-os/reports/` files
- Run scripts first, then refresh dashboard

---

## Support & Next Steps

- **GitHub repo:** https://github.com/Lutho8/ridethetide-blog
- **Live site:** https://peptide-south-africa.com/blog
- **Dashboard:** `npm run os:serve` → http://localhost:3000
- **Content OS docs:** `README.md` in repo root

Once live, the automated cron jobs will handle:
- Weekly SEO audits
- Daily article refresh suggestions
- Daily industry news digests
- Monthly topical authority tracking

Your only ongoing manual work: review drafts, approve content, and write new articles from the seed topics the system generates.

---

*Generated: 2026-06-08*
*Content OS v1.0 — Peptide South Africa Research*
