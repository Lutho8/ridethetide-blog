/**
 * Content Audit Pipeline
 *
 * Combines live GSC data + local content analysis to generate
 * a prioritized action list for the Content OS.
 *
 * Sections:
 * 1. Ahrefs Rankings & Backlinks (stub — requires API key)
 * 2. AI Search Visibility (stub — requires Brand Radar)
 * 3. Technical SEO Audit — local content file analysis
 * 4. GSC Traffic Decay Detection — LIVE data
 * 5. Priority Action List — generated from real findings
 */

const fs = require('fs');
const path = require('path');
const {
  getDateDaysAgo,
  refreshAccessToken,
  querySearchAnalytics,
  listSites,
} = require('./lib/gsc-client.cjs');

// Load .env if exists
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !key.startsWith('#')) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}

const CONFIG = {
  ahrefsProject: 'peptide-south-africa-site',
  gscSite: process.env.GSC_SITE_URL || 'https://peptide-south-africa.com/blog/',
  decayThreshold: -20,
  rankingDropThreshold: 5,
  contentDir: path.join(__dirname, '../src/content/blog'),
  outputDir: path.join(__dirname, '../content-os/audits'),
};

if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

async function runContentAudit() {
  const timestamp = new Date().toISOString().split('T')[0];
  const report = {
    generatedAt: timestamp,
    sections: {},
    priorityActions: [],
  };

  console.log('🔍 Starting Content Audit Pipeline...');
  console.log(`   Ahrefs Project: ${CONFIG.ahrefsProject}`);
  console.log(`   GSC Site: ${CONFIG.gscSite}`);
  console.log(`   Decay Threshold: ${CONFIG.decayThreshold}%`);

  // 1. Ahrefs Rankings & Backlinks
  console.log('\n📊 [1/5] Ahrefs Rankings & Backlinks');
  report.sections.ahrefs = {
    status: 'pending_mcp_connection',
    note: 'Requires AHREFS_API_TOKEN and Ahrefs MCP server running',
    expectedData: {
      organicKeywords: 'Top 1000 ranking keywords with position, volume, difficulty',
      backlinks: 'New/lost backlinks in last 30 days',
      domainRating: 'Current DR vs previous month',
      contentGap: 'Topics competitors rank for that we do not',
    },
    actions: [
      'Connect Ahrefs MCP server',
      'Run: npx @ahrefs/mcp-server',
      'Verify API token has Site Explorer + Content Explorer access',
    ],
  };
  console.log('   ⚠️  Ahrefs MCP not connected — see config/mcp-connectors.md');

  // 2. Brand Radar / AI Search Visibility
  console.log('\n🤖 [2/5] AI Search Visibility (Brand Radar)');
  report.sections.brandRadar = {
    status: 'pending_mcp_connection',
    note: 'Requires Brand Radar API key',
    expectedData: {
      aiCitations: 'Brand mentions in ChatGPT, Perplexity, Claude answers',
      visibilityScore: 'Trend over last 90 days',
      competitorComparison: 'How often competitors are cited vs us',
      topicCoverage: 'Which peptide topics trigger our brand in AI answers',
    },
    actions: [
      'Connect Brand Radar MCP wrapper',
      'Set BRAND_RADAR_API_KEY in .env',
      'Run: node scripts/ai-visibility.js',
    ],
  };
  console.log('   ⚠️  Brand Radar MCP not connected — see config/mcp-connectors.md');

  // 3. Technical SEO Audit — local content analysis
  console.log('\n🔧 [3/5] Technical SEO Audit (Local Content Analysis)');
  try {
    report.sections.siteAudit = await analyzeLocalContent();
    console.log(`   ✅ Analyzed ${report.sections.siteAudit.articlesAnalyzed} articles`);
    console.log(`   Issues: ${report.sections.siteAudit.issues.length}`);
  } catch (e) {
    report.sections.siteAudit = { status: 'error', error: e.message };
    console.log(`   ❌ Error: ${e.message}`);
  }

  // 4. GSC Traffic Decay Detection — LIVE
  console.log('\n📉 [4/5] GSC Traffic Decay Detection');
  try {
    report.sections.gsc = await analyzeGSCData();
    const gscStatus = report.sections.gsc.status;
    if (gscStatus === 'live_gsc_data') {
      console.log(`   ✅ Live GSC data — ${report.sections.gsc.pagesTracked} pages tracked`);
      console.log(`   Decaying: ${report.sections.gsc.decayingPages.length}`);
      console.log(`   Improving: ${report.sections.gsc.improvingPages.length}`);
    } else {
      console.log(`   ⚠️  ${report.sections.gsc.note || gscStatus}`);
    }
  } catch (e) {
    report.sections.gsc = { status: 'error', error: e.message };
    console.log(`   ❌ Error: ${e.message}`);
  }

  // 5. Priority Action List — generated from real findings
  console.log('\n🎯 [5/5] Generating Priority Action List');
  report.priorityActions = generatePriorityActions(report);
  console.log(`   ${report.priorityActions.length} actions generated`);
  report.priorityActions.forEach(a => console.log(`   ${a.priority}: ${a.action}`));

  // Save report
  const reportPath = path.join(CONFIG.outputDir, `content-audit-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const mdPath = path.join(CONFIG.outputDir, `content-audit-${timestamp}.md`);
  fs.writeFileSync(mdPath, generateMarkdownReport(report));

  console.log('\n✅ Content Audit Complete!');
  console.log(`   JSON: ${reportPath}`);
  console.log(`   Markdown: ${mdPath}`);
  console.log(`   Priority Actions: ${report.priorityActions.length}`);
  console.log(`   P0 (Critical): ${report.priorityActions.filter(a => a.priority.startsWith('P0')).length}`);
  console.log(`   P1 (High): ${report.priorityActions.filter(a => a.priority.startsWith('P1')).length}`);
  console.log(`   P2 (Medium): ${report.priorityActions.filter(a => a.priority.startsWith('P2')).length}`);
}

// ─── Local Content Analysis ───

async function analyzeLocalContent() {
  const issues = [];
  let articlesAnalyzed = 0;
  let totalWordCount = 0;
  let articlesWithImages = 0;
  let articlesWithInternalLinks = 0;

  if (!fs.existsSync(CONFIG.contentDir)) {
    return {
      status: 'no_content_dir',
      articlesAnalyzed: 0,
      issues: [{ severity: 'P1', issue: 'Content directory not found', path: CONFIG.contentDir }],
    };
  }

  const files = fs.readdirSync(CONFIG.contentDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

  for (const file of files) {
    const filePath = path.join(CONFIG.contentDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const slug = file.replace(/\.mdx?$/, '');

    articlesAnalyzed++;

    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
    const body = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content;

    const title = extractFrontmatterValue(frontmatter, 'title');
    const description = extractFrontmatterValue(frontmatter, 'description');
    const pubDate = extractFrontmatterValue(frontmatter, 'pubDate');
    const tags = extractFrontmatterValue(frontmatter, 'tags');
    const author = extractFrontmatterValue(frontmatter, 'author');

    // Word count
    const words = body.trim().split(/\s+/).length;
    totalWordCount += words;

    // Images
    const imageCount = (body.match(/!\[.*?\]\(.*?\)/g) || []).length;
    if (imageCount > 0) articlesWithImages++;

    // Internal links
    const internalLinks = (body.match(/\[.*?\]\(\/.*?\)/g) || []).length;
    if (internalLinks > 0) articlesWithInternalLinks++;

    // Check issues
    if (!title || title.trim().length < 10) {
      issues.push({ severity: 'P1', issue: 'Missing or short title', file, slug, current: title });
    }
    if (!description || description.trim().length < 50) {
      issues.push({ severity: 'P1', issue: 'Missing or short meta description', file, slug, current: description?.length });
    }
    if (!pubDate) {
      issues.push({ severity: 'P2', issue: 'Missing publication date', file, slug });
    }
    if (!author) {
      issues.push({ severity: 'P2', issue: 'Missing author (E-E-A-T signal)', file, slug });
    }
    if (words < 500) {
      issues.push({ severity: 'P1', issue: 'Thin content (< 500 words)', file, slug, words });
    }
    if (imageCount === 0) {
      issues.push({ severity: 'P2', issue: 'No images (engagement + SEO)', file, slug });
    }
    if (internalLinks === 0) {
      issues.push({ severity: 'P2', issue: 'No internal links', file, slug });
    }
    if (!tags || tags.trim().length === 0) {
      issues.push({ severity: 'P3', issue: 'Missing tags', file, slug });
    }
  }

  // Check for missing articles from content plan
  const expectedTopics = [
    'tb-500-guide', 'bpc-157-guide', 'cjc-ipamorelin-stack', 'glp1-comparison',
    'ghk-cu-guide', 'sa-peptide-sourcing', 'injection-techniques', 'reconstitution-guide',
    'bloodwork-guide', 'sahpra-peptide-regulations', 'fat-loss-protocol-case-study',
  ];
  const foundSlugs = files.map(f => f.replace(/\.mdx?$/, ''));
  const missingTopics = expectedTopics.filter(t => !foundSlugs.includes(t));

  return {
    status: 'analyzed',
    articlesAnalyzed,
    totalWordCount,
    avgWordCount: articlesAnalyzed > 0 ? Math.round(totalWordCount / articlesAnalyzed) : 0,
    articlesWithImages,
    articlesWithInternalLinks,
    issuesFound: issues.length,
    missingTopics,
    issues: issues.sort((a, b) => {
      const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
      return (order[a.severity] || 4) - (order[b.severity] || 4);
    }),
  };
}

function extractFrontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

// ─── GSC Live Data ───

async function analyzeGSCData() {
  if (!process.env.GSC_REFRESH_TOKEN) {
    return {
      status: 'missing_credentials',
      note: 'GSC_REFRESH_TOKEN not set. Run: node scripts/gsc-auth.cjs',
    };
  }

  const accessToken = await refreshAccessToken();

  // Verify site
  const sitesData = await listSites(accessToken);
  const verifiedSites = (sitesData.siteEntry || []).map(s => s.siteUrl);
  const isVerified = verifiedSites.some(s => {
    if (s === CONFIG.gscSite) return true;
    if (s.startsWith('sc-domain:')) {
      const domain = s.replace('sc-domain:', '');
      try {
        return new URL(CONFIG.gscSite).hostname.endsWith(domain);
      } catch { return false; }
    }
    return false;
  });

  if (!isVerified) {
    return {
      status: 'site_not_verified',
      note: `${CONFIG.gscSite} is not verified in GSC. Verified sites: ${verifiedSites.join(', ')}`,
    };
  }

  // Fetch search analytics
  const days = 90;
  const currentEnd = getDateDaysAgo(3);
  const currentStart = getDateDaysAgo(days + 2);
  const previousEnd = getDateDaysAgo(days + 3);
  const previousStart = getDateDaysAgo(days * 2 + 2);

  const currentData = await querySearchAnalytics(accessToken, CONFIG.gscSite, currentStart, currentEnd);
  const previousData = await querySearchAnalytics(accessToken, CONFIG.gscSite, previousStart, previousEnd);

  if (currentData.error) {
    return { status: 'api_error', note: currentData.error.message || currentData.error };
  }

  // Build comparison
  const pages = {};
  (currentData.rows || []).forEach(row => {
    const url = row.keys[0];
    pages[url] = {
      url,
      current: { clicks: row.clicks || 0, impressions: row.impressions || 0, position: row.position || 0 },
      previous: { clicks: 0, impressions: 0, position: 0 },
    };
  });
  (previousData.rows || []).forEach(row => {
    const url = row.keys[0];
    if (!pages[url]) {
      pages[url] = {
        url,
        current: { clicks: 0, impressions: 0, position: 0 },
        previous: { clicks: row.clicks || 0, impressions: row.impressions || 0, position: row.position || 0 },
      };
    } else {
      pages[url].previous = { clicks: row.clicks || 0, impressions: row.impressions || 0, position: row.position || 0 };
    }
  });

  const decayingPages = [];
  const improvingPages = [];

  Object.values(pages).forEach(page => {
    const change = page.previous.clicks === 0
      ? (page.current.clicks > 0 ? 100 : 0)
      : ((page.current.clicks - page.previous.clicks) / page.previous.clicks) * 100;

    if (change <= CONFIG.decayThreshold && page.current.clicks > 0) {
      decayingPages.push({ url: page.url, change: Math.round(change * 10) / 10, currentClicks: page.current.clicks });
    } else if (change >= Math.abs(CONFIG.decayThreshold) && page.current.clicks > 0) {
      improvingPages.push({ url: page.url, change: Math.round(change * 10) / 10, currentClicks: page.current.clicks });
    }
  });

  // Get top queries
  const queryData = await querySearchAnalytics(accessToken, CONFIG.gscSite, currentStart, currentEnd, ['query']);
  const topQueries = (queryData.rows || [])
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10)
    .map(row => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      position: Math.round(row.position * 10) / 10,
    }));

  return {
    status: 'live_gsc_data',
    pagesTracked: Object.keys(pages).length,
    decayingPages,
    improvingPages,
    topQueries,
    dateRanges: { current: { start: currentStart, end: currentEnd }, previous: { start: previousStart, end: previousEnd } },
  };
}

// ─── Priority Actions Generator ───

function generatePriorityActions(report) {
  const actions = [];
  const siteAudit = report.sections.siteAudit || {};
  const gsc = report.sections.gsc || {};

  // P0 — Critical blockers
  if (siteAudit.missingTopics && siteAudit.missingTopics.length > 0) {
    actions.push({
      priority: 'P0-Critical',
      action: `Write ${siteAudit.missingTopics.length} missing articles from content plan: ${siteAudit.missingTopics.join(', ')}`,
      impact: 'Completes topical authority foundation',
      owner: 'Content',
      due: daysFromNow(14),
    });
  }

  if (gsc.status === 'site_not_verified' || gsc.status === 'missing_credentials') {
    actions.push({
      priority: 'P0-Critical',
      action: 'Verify peptide-south-africa.com/blog in GSC and update GSC_SITE_URL',
      impact: 'Unblocks all GSC-based audits',
      owner: 'SEO',
      due: daysFromNow(3),
    });
  }

  // P1 — High impact
  if (siteAudit.issues) {
    const p1Issues = siteAudit.issues.filter(i => i.severity === 'P1');
    if (p1Issues.length > 0) {
      const titlesMissing = p1Issues.filter(i => i.issue.includes('title')).length;
      const descMissing = p1Issues.filter(i => i.issue.includes('description')).length;
      const thinContent = p1Issues.filter(i => i.issue.includes('Thin content')).length;

      if (titlesMissing > 0) {
        actions.push({
          priority: 'P1-High',
          action: `Fix ${titlesMissing} article(s) with missing/short titles`,
          impact: 'Direct ranking factor for CTR and SEO',
          owner: 'Content',
          due: daysFromNow(7),
        });
      }
      if (descMissing > 0) {
        actions.push({
          priority: 'P1-High',
          action: `Add meta descriptions to ${descMissing} article(s)`,
          impact: 'Improves CTR from search results',
          owner: 'Content',
          due: daysFromNow(7),
        });
      }
      if (thinContent > 0) {
        actions.push({
          priority: 'P1-High',
          action: `Expand ${thinContent} thin article(s) to 1000+ words`,
          impact: 'Better rankings, more topical coverage',
          owner: 'Content',
          due: daysFromNow(14),
        });
      }
    }
  }

  if (gsc.decayingPages && gsc.decayingPages.length > 0) {
    actions.push({
      priority: 'P1-High',
      action: `Refresh ${gsc.decayingPages.length} decaying page(s) with traffic decline > ${CONFIG.decayThreshold}%`,
      impact: 'Recovers lost organic traffic',
      owner: 'Content',
      due: daysFromNow(10),
    });
  }

  // P2 — Medium
  if (siteAudit.issues) {
    const p2Issues = siteAudit.issues.filter(i => i.severity === 'P2');
    const noImages = p2Issues.filter(i => i.issue.includes('No images')).length;
    const noLinks = p2Issues.filter(i => i.issue.includes('internal links')).length;
    const noAuthor = p2Issues.filter(i => i.issue.includes('author')).length;

    if (noImages > 0) {
      actions.push({
        priority: 'P2-Medium',
        action: `Add images to ${noImages} article(s)`,
        impact: 'Improves engagement and AI search visibility',
        owner: 'Content',
        due: daysFromNow(14),
      });
    }
    if (noLinks > 0) {
      actions.push({
        priority: 'P2-Medium',
        action: `Add internal links to ${noLinks} article(s)`,
        impact: 'Improves topical authority and crawlability',
        owner: 'Content',
        due: daysFromNow(14),
      });
    }
    if (noAuthor > 0) {
      actions.push({
        priority: 'P2-Medium',
        action: `Add author bios to ${noAuthor} article(s)`,
        impact: 'E-E-A-T signal for YMYL health content',
        owner: 'Content',
        due: daysFromNow(14),
      });
    }
  }

  if (gsc.improvingPages && gsc.improvingPages.length > 0) {
    actions.push({
      priority: 'P2-Medium',
      action: `Expand ${gsc.improvingPages.length} improving page(s) to capture more traffic`,
      impact: "Double down on what's working",
      owner: 'Content',
      due: daysFromNow(21),
    });
  }

  // P3 — Low
  if (siteAudit.avgWordCount && siteAudit.avgWordCount > 0) {
    actions.push({
      priority: 'P3-Low',
      action: `Average word count is ${siteAudit.avgWordCount} — aim for 1500+ on pillar content`,
      impact: 'Long-term topical authority',
      owner: 'Content',
      due: daysFromNow(30),
    });
  }

  actions.push({
    priority: 'P3-Low',
    action: 'Configure Cloudflare Pages custom domain (peptide-south-africa.com/blog)',
    impact: 'Professional appearance, brand consistency',
    owner: 'DevOps',
    due: daysFromNow(7),
  });

  return actions;
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── Markdown Report Generator ───

function generateMarkdownReport(report) {
  let md = `# Content Audit Report — ${report.generatedAt}\n\n`;
  md += `## Executive Summary\n\n`;
  md += `This audit covers:\n`;
  md += `- Local content file analysis (SEO readiness)\n`;
  md += `- Live GSC traffic data\n`;
  md += `- Priority action list\n\n`;
  md += `> **Note:** Ahrefs and Brand Radar require API keys. Once connected, rankings, backlinks, and AI visibility data will be included automatically.\n\n`;
  md += `---\n\n`;

  // 1. Ahrefs
  md += `## 1. Ahrefs Rankings & Backlinks\n\n`;
  md += `**Status:** ${report.sections.ahrefs.status}\n\n`;
  md += `${report.sections.ahrefs.note}\n\n`;
  md += `**Setup Actions:**\n`;
  report.sections.ahrefs.actions.forEach(a => md += `- [ ] ${a}\n`);
  md += `\n---\n\n`;

  // 2. Brand Radar
  md += `## 2. AI Search Visibility (Brand Radar)\n\n`;
  md += `**Status:** ${report.sections.brandRadar.status}\n\n`;
  md += `${report.sections.brandRadar.note}\n\n`;
  md += `**Setup Actions:**\n`;
  report.sections.brandRadar.actions.forEach(a => md += `- [ ] ${a}\n`);
  md += `\n---\n\n`;

  // 3. Site Audit
  md += `## 3. Technical SEO Audit (Local Content)\n\n`;
  const sa = report.sections.siteAudit;
  md += `**Status:** ${sa.status}\n\n`;
  if (sa.articlesAnalyzed !== undefined) {
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Articles analyzed | ${sa.articlesAnalyzed} |\n`;
    md += `| Total words | ${sa.totalWordCount || 0} |\n`;
    md += `| Avg words/article | ${sa.avgWordCount || 0} |\n`;
    md += `| Articles with images | ${sa.articlesWithImages || 0} |\n`;
    md += `| Articles with internal links | ${sa.articlesWithInternalLinks || 0} |\n`;
    md += `| Issues found | ${sa.issuesFound || 0} |\n`;
    if (sa.missingTopics && sa.missingTopics.length > 0) {
      md += `| Missing topics | ${sa.missingTopics.length} |\n`;
    }
    md += `\n`;
  }
  if (sa.missingTopics && sa.missingTopics.length > 0) {
    md += `**Missing Articles:** ${sa.missingTopics.join(', ')}\n\n`;
  }
  if (sa.issues && sa.issues.length > 0) {
    md += `**Issues:**\n\n`;
    md += `| Severity | Issue | File |\n`;
    md += `|----------|-------|------|\n`;
    sa.issues.forEach(i => {
      md += `| ${i.severity} | ${i.issue} | ${i.file} |\n`;
    });
    md += `\n`;
  }
  md += `---\n\n`;

  // 4. GSC
  md += `## 4. GSC Traffic Decay Detection\n\n`;
  const gsc = report.sections.gsc;
  md += `**Status:** ${gsc.status}\n\n`;
  if (gsc.status === 'live_gsc_data') {
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Pages tracked | ${gsc.pagesTracked} |\n`;
    md += `| Decaying pages | ${gsc.decayingPages.length} |\n`;
    md += `| Improving pages | ${gsc.improvingPages.length} |\n`;
    md += `\n`;
    if (gsc.topQueries && gsc.topQueries.length > 0) {
      md += `**Top Queries (last 90 days):**\n\n`;
      md += `| Query | Clicks | Impressions | Position |\n`;
      md += `|-------|--------|-------------|----------|\n`;
      gsc.topQueries.forEach(q => {
        md += `| ${q.query} | ${q.clicks} | ${q.impressions} | ${q.position} |\n`;
      });
      md += `\n`;
    }
  } else {
    md += `${gsc.note || ''}\n\n`;
  }
  md += `---\n\n`;

  // 5. Priority Actions
  md += `## 5. Priority Action List\n\n`;
  md += `| Priority | Action | Impact | Owner | Due |\n`;
  md += `|----------|--------|--------|-------|-----|\n`;
  report.priorityActions.forEach(a => {
    md += `| ${a.priority} | ${a.action} | ${a.impact} | ${a.owner} | ${a.due} |\n`;
  });
  md += `\n---\n\n`;

  md += `*Generated by Content OS Audit Pipeline*\n`;
  md += `*Next audit: ${daysFromNow(7)}*\n`;
  return md;
}

runContentAudit().catch(console.error);
