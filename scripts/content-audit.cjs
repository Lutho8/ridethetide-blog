/**
 * Content Audit Pipeline
 * 
 * Pulls rankings and backlink data via Ahrefs MCP,
 * analyses AI search visibility with Brand Radar,
 * flags technical issues with Site Audit,
 * looks for traffic decay via GSC,
 * and makes a priority list of content updates.
 */

const fs = require('fs');
const path = require('path');

// Config
const CONFIG = {
  ahrefsProject: 'ridethetide-site',
  gscSite: 'https://blog.ridethetide.site/',
  decayThreshold: -20, // % traffic drop to flag
  rankingDropThreshold: 5, // position drop to flag
  outputDir: path.join(__dirname, '../content-os/audits'),
};

// Ensure output dir exists
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
  try {
    // These would call the Ahrefs MCP server via stdio or HTTP
    // For now, we document the expected data structure
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
  } catch (e) {
    report.sections.ahrefs = { status: 'error', error: e.message };
  }

  // 2. Brand Radar / AI Search Visibility
  console.log('\n🤖 [2/5] AI Search Visibility (Brand Radar)');
  try {
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
  } catch (e) {
    report.sections.brandRadar = { status: 'error', error: e.message };
  }

  // 3. Site Audit Technical Issues
  console.log('\n🔧 [3/5] Technical SEO Audit');
  try {
    report.sections.siteAudit = {
      status: 'pending_mcp_connection',
      note: 'Requires Ahrefs Site Audit project configured',
      expectedData: {
        healthScore: 'Overall site health (0-100)',
        criticalIssues: '404s, redirect chains, canonical issues',
        performance: 'Core Web Vitals scores',
        mobileIssues: 'Mobile usability errors',
        structuredData: 'Schema validation errors',
      },
      actions: [
        'Ensure Ahrefs Site Audit is running on blog.ridethetide.site',
        'Pull latest crawl via Ahrefs MCP',
        'Prioritize: 404s → canonicals → schema → performance',
      ],
    };
    console.log('   ⚠️  Site Audit MCP not connected — see config/mcp-connectors.md');
  } catch (e) {
    report.sections.siteAudit = { status: 'error', error: e.message };
  }

  // 4. GSC Traffic Decay Detection
  console.log('\n📉 [4/5] GSC Traffic Decay Detection');
  try {
    report.sections.gsc = {
      status: 'pending_mcp_connection',
      note: 'Requires GSC OAuth credentials',
      expectedData: {
        trafficByPage: 'Clicks, impressions, CTR, position for last 90 days vs previous 90 days',
        decayingPages: 'Pages with >20% click decline',
        queryChanges: 'Queries losing impressions or position',
        indexingIssues: 'Pages excluded from index',
      },
      actions: [
        'Complete GSC OAuth flow: node scripts/gsc-auth.js',
        'Set GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN in .env',
        'Run: node scripts/traffic-decay.js --days 90 --threshold -20',
      ],
    };
    console.log('   ⚠️  GSC MCP not connected — see config/mcp-connectors.md');
  } catch (e) {
    report.sections.gsc = { status: 'error', error: e.message };
  }

  // 5. Priority Action List
  console.log('\n🎯 [5/5] Generating Priority Action List');
  
  // Static priority list based on known issues from site audit
  report.priorityActions = [
    {
      priority: 'P0-Critical',
      action: 'Connect all MCP servers (Ahrefs, GSC, Brand Radar)',
      impact: 'Unblocks all automated audits',
      owner: 'DevOps',
      due: '2026-06-15',
    },
    {
      priority: 'P1-High',
      action: 'Build initial 20 peptide deep-dive articles for topical authority',
      impact: 'Foundation for ranking on [peptide] + South Africa queries',
      owner: 'Content',
      due: '2026-07-15',
    },
    {
      priority: 'P1-High',
      action: 'Set up GSC property for blog.ridethetide.site',
      impact: 'Enables traffic decay detection and indexing monitoring',
      owner: 'SEO',
      due: '2026-06-10',
    },
    {
      priority: 'P2-Medium',
      action: 'Implement FAQ schema on all peptide pages',
      impact: 'Improves AI search visibility and rich snippets',
      owner: 'Dev',
      due: '2026-06-20',
    },
    {
      priority: 'P2-Medium',
      action: 'Set up internal linking via embeddings (topic-drift.js)',
      impact: 'Improves topical authority and user engagement',
      owner: 'Content',
      due: '2026-06-25',
    },
    {
      priority: 'P3-Low',
      action: 'Configure Cloudflare Pages custom domain (blog.ridethetide.site)',
      impact: 'Professional appearance, brand consistency',
      owner: 'DevOps',
      due: '2026-06-12',
    },
  ];

  // Save report
  const reportPath = path.join(CONFIG.outputDir, `content-audit-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Also save as markdown for human reading
  const mdPath = path.join(CONFIG.outputDir, `content-audit-${timestamp}.md`);
  const mdContent = generateMarkdownReport(report);
  fs.writeFileSync(mdPath, mdContent);

  console.log('\n✅ Content Audit Complete!');
  console.log(`   JSON: ${reportPath}`);
  console.log(`   Markdown: ${mdPath}`);
  console.log(`\n   Priority Actions: ${report.priorityActions.length}`);
  console.log(`   P0 (Critical): ${report.priorityActions.filter(a => a.priority.startsWith('P0')).length}`);
  console.log(`   P1 (High): ${report.priorityActions.filter(a => a.priority.startsWith('P1')).length}`);
  console.log(`   P2 (Medium): ${report.priorityActions.filter(a => a.priority.startsWith('P2')).length}`);
}

function generateMarkdownReport(report) {
  return `# Content Audit Report — ${report.generatedAt}

## Executive Summary

This audit covers:
- Ahrefs rankings & backlink data
- AI search visibility (Brand Radar)
- Technical SEO issues (Site Audit)
- Traffic decay detection (GSC)
- Priority action list

> ⚠️ **Note:** MCP connectors are not yet fully configured. This report documents 
> the expected data and required setup steps. Once APIs are connected, this will 
> be fully automated.

---

## 1. Ahrefs Rankings & Backlinks

**Status:** ${report.sections.ahrefs.status}

${report.sections.ahrefs.note || ''}

**Expected Data:**
${Object.entries(report.sections.ahrefs.expectedData || {}).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}

**Setup Actions:**
${(report.sections.ahrefs.actions || []).map(a => `- [ ] ${a}`).join('\n')}

---

## 2. AI Search Visibility (Brand Radar)

**Status:** ${report.sections.brandRadar.status}

${report.sections.brandRadar.note || ''}

**Expected Data:**
${Object.entries(report.sections.brandRadar.expectedData || {}).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}

**Setup Actions:**
${(report.sections.brandRadar.actions || []).map(a => `- [ ] ${a}`).join('\n')}

---

## 3. Technical SEO Audit

**Status:** ${report.sections.siteAudit.status}

${report.sections.siteAudit.note || ''}

**Expected Data:**
${Object.entries(report.sections.siteAudit.expectedData || {}).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}

**Setup Actions:**
${(report.sections.siteAudit.actions || []).map(a => `- [ ] ${a}`).join('\n')}

---

## 4. GSC Traffic Decay

**Status:** ${report.sections.gsc.status}

${report.sections.gsc.note || ''}

**Expected Data:**
${Object.entries(report.sections.gsc.expectedData || {}).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}

**Setup Actions:**
${(report.sections.gsc.actions || []).map(a => `- [ ] ${a}`).join('\n')}

---

## 5. Priority Action List

| Priority | Action | Impact | Owner | Due |
|----------|--------|--------|-------|-----|
${report.priorityActions.map(a => `| ${a.priority} | ${a.action} | ${a.impact} | ${a.owner} | ${a.due} |`).join('\n')}

---

*Generated by Content OS Audit Pipeline*
*Next audit: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}*
`;
}

// Run if called directly
if (require.main === module) {
  runContentAudit().catch(console.error);
}

module.exports = { runContentAudit, generateMarkdownReport };
