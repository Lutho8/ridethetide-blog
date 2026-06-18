/**
 * Traffic Decay Detection
 *
 * Uses live GSC Search Analytics API to detect pages with significant traffic decline.
 * Flags articles needing refresh or optimization.
 *
 * Usage: node scripts/traffic-decay.cjs --days 90 --threshold -20
 */

const fs = require('fs');
const path = require('path');
const {
  getDateDaysAgo,
  refreshAccessToken,
  querySearchAnalytics,
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
  gscSite: process.env.GSC_SITE_URL || 'https://peptide-south-africa.com/',
  defaultDays: 90,
  defaultThreshold: -20, // % decline to flag
  outputDir: path.join(__dirname, '../content-os/reports'),
};

if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

async function detectTrafficDecay(options = {}) {
  const { days = CONFIG.defaultDays, threshold = CONFIG.defaultThreshold } = options;

  console.log('📉 Traffic Decay Detection');
  console.log(`   Site: ${CONFIG.gscSite}`);
  console.log(`   Lookback: ${days} days`);
  console.log(`   Threshold: ${threshold}% decline`);

  // Check GSC connection
  if (!process.env.GSC_REFRESH_TOKEN) {
    console.log('\n⚠️  GSC not connected. This script requires:');
    console.log('   1. GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN in .env');
    console.log('   2. Run: node scripts/gsc-auth.cjs to get refresh token');
    console.log('   3. GSC property must be verified for your site');

    const report = generateTemplateReport(days, threshold);
    saveReport(report, days, threshold);
    return;
  }

  try {
    console.log('\n🔐 Refreshing GSC access token...');
    const accessToken = await refreshAccessToken();
    console.log('   ✅ Token refreshed');

    // Define date ranges
    // Use 3-day buffer since GSC data lags
    const currentEnd = getDateDaysAgo(3);
    const currentStart = getDateDaysAgo(days + 2);
    const previousEnd = getDateDaysAgo(days + 3);
    const previousStart = getDateDaysAgo(days * 2 + 2);

    console.log(`\n📊 Fetching current period: ${currentStart} → ${currentEnd}`);
    const currentData = await querySearchAnalytics(accessToken, CONFIG.gscSite, currentStart, currentEnd);

    if (currentData.error) {
      throw new Error(`GSC API error: ${currentData.error.message || currentData.error}`);
    }

    console.log(`   Found ${(currentData.rows || []).length} pages with search data`);

    console.log(`\n📊 Fetching previous period: ${previousStart} → ${previousEnd}`);
    const previousData = await querySearchAnalytics(accessToken, CONFIG.gscSite, previousStart, previousEnd);

    if (previousData.error) {
      throw new Error(`GSC API error: ${previousData.error.message || previousData.error}`);
    }

    console.log(`   Found ${(previousData.rows || []).length} pages with search data`);

    // Build comparison map
    const pages = {};

    (currentData.rows || []).forEach(row => {
      const url = row.keys[0];
      pages[url] = {
        url,
        current: {
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        },
        previous: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      };
    });

    (previousData.rows || []).forEach(row => {
      const url = row.keys[0];
      if (!pages[url]) {
        pages[url] = {
          url,
          current: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
          previous: {
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
          },
        };
      } else {
        pages[url].previous = {
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        };
      }
    });

    // Categorize
    const decayingPages = [];
    const improvingPages = [];
    const stablePages = [];

    Object.values(pages).forEach(page => {
      const clickChange = page.previous.clicks === 0
        ? (page.current.clicks > 0 ? 100 : 0)
        : ((page.current.clicks - page.previous.clicks) / page.previous.clicks) * 100;

      const impressionChange = page.previous.impressions === 0
        ? (page.current.impressions > 0 ? 100 : 0)
        : ((page.current.impressions - page.previous.impressions) / page.previous.impressions) * 100;

      const positionChange = page.previous.position === 0
        ? 0
        : page.current.position - page.previous.position; // positive = worse

      const enriched = {
        ...page,
        change: Math.round(clickChange * 10) / 10,
        impressionChange: Math.round(impressionChange * 10) / 10,
        positionChange: Math.round(positionChange * 10) / 10,
      };

      if (clickChange <= threshold && page.current.clicks > 0) {
        decayingPages.push(enriched);
      } else if (clickChange >= Math.abs(threshold) && page.current.clicks > 0) {
        improvingPages.push(enriched);
      } else {
        stablePages.push(enriched);
      }
    });

    // Sort by severity
    decayingPages.sort((a, b) => a.change - b.change);
    improvingPages.sort((a, b) => b.change - a.change);

    const report = {
      generatedAt: new Date().toISOString(),
      site: CONFIG.gscSite,
      days,
      threshold,
      status: 'live_gsc_data',
      dateRanges: {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
      },
      summary: {
        totalPages: Object.keys(pages).length,
        decaying: decayingPages.length,
        improving: improvingPages.length,
        stable: stablePages.length,
        totalCurrentClicks: Object.values(pages).reduce((s, p) => s + p.current.clicks, 0),
        totalPreviousClicks: Object.values(pages).reduce((s, p) => s + p.previous.clicks, 0),
      },
      decayingPages: decayingPages.map(p => ({
        url: p.url,
        currentClicks: p.current.clicks,
        previousClicks: p.previous.clicks,
        change: `${p.change}%`,
        currentPosition: Math.round(p.current.position * 10) / 10,
        previousPosition: Math.round(p.previous.position * 10) / 10,
        impressionChange: `${p.impressionChange}%`,
        action: suggestAction(p),
        priority: p.change < -50 ? 'P0' : p.change < -30 ? 'P1' : 'P2',
      })),
      improvingPages: improvingPages.slice(0, 10).map(p => ({
        url: p.url,
        currentClicks: p.current.clicks,
        previousClicks: p.previous.clicks,
        change: `+${p.change}%`,
        currentPosition: Math.round(p.current.position * 10) / 10,
        previousPosition: Math.round(p.previous.position * 10) / 10,
        action: 'Double down — expand content, add internal links',
      })),
      stablePages: stablePages.length,
      actions: generateActions(decayingPages.length, improvingPages.length),
    };

    saveReport(report, days, threshold);

    console.log('\n✅ Live traffic decay report generated!');
    console.log(`   Decaying pages: ${decayingPages.length}`);
    console.log(`   Improving pages: ${improvingPages.length}`);
    console.log(`   Stable pages: ${stablePages.length}`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.log('\nFalling back to template report...');
    const report = generateTemplateReport(days, threshold);
    report.status = 'error: ' + error.message;
    saveReport(report, days, threshold);
  }
}

function suggestAction(page) {
  if (page.positionChange > 3) {
    return 'Position dropped significantly. Refresh content, improve E-E-A-T, add FAQ schema.';
  }
  if (page.current.impressions > page.previous.impressions * 1.2 && page.current.clicks < page.previous.clicks) {
    return 'CTR dropped despite more impressions. Rewrite title/meta description.';
  }
  if (page.current.clicks === 0 && page.previous.clicks > 0) {
    return 'Page lost all traffic. Check indexing status, update content, request re-indexing.';
  }
  return 'Refresh article with updated research, improve internal linking, add media.';
}

function generateActions(decayingCount, improvingCount) {
  const actions = [];
  if (decayingCount > 0) {
    actions.push(`Refresh ${decayingCount} decaying page(s) with updated content`);
    actions.push('Run indexing audit on decaying pages');
  }
  if (improvingCount > 0) {
    actions.push(`Expand ${improvingCount} improving page(s) to capture more traffic`);
  }
  actions.push('Schedule weekly decay detection');
  actions.push('Cross-reference decaying pages with content audit priority queue');
  return actions;
}

function generateTemplateReport(days, threshold) {
  return {
    generatedAt: new Date().toISOString(),
    site: 'https://peptide-south-africa.com/',
    days,
    threshold,
    status: 'template',
    note: 'This is a template report. Connect GSC MCP for live data.',

    decayingPages: [
      {
        url: '/blog/bpc-157-guide',
        currentClicks: 120,
        previousClicks: 180,
        change: '-33%',
        currentPosition: 8.2,
        previousPosition: 5.1,
        action: 'Refresh article with 2026 research, add FAQ schema',
        priority: 'P1',
      },
    ],

    improvingPages: [
      {
        url: '/blog/sahpra-peptide-regulations',
        currentClicks: 95,
        previousClicks: 45,
        change: '+111%',
        currentPosition: 4.2,
        previousPosition: 11.5,
        action: 'Double down — expand to related regulatory topics',
      },
    ],

    actions: [
      'Connect GSC for live traffic data',
      'Set up weekly automated decay detection',
    ],
  };
}

function saveReport(report, days, threshold) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `traffic-decay-${days}d-${threshold}pct-${timestamp}`;

  const jsonPath = path.join(CONFIG.outputDir, `${filename}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const mdPath = path.join(CONFIG.outputDir, `${filename}.md`);
  fs.writeFileSync(mdPath, generateMarkdownReport(report));

  console.log(`\n   JSON: ${jsonPath}`);
  console.log(`   Markdown: ${mdPath}`);
}

function generateMarkdownReport(report) {
  let md = `# Traffic Decay Report — ${report.site}\n\n`;
  md += `> Generated: ${report.generatedAt}\n`;
  md += `> Lookback: ${report.days} days\n`;
  md += `> Threshold: ${report.threshold}% decline\n`;
  md += `> Status: **${report.status}**\n`;

  if (report.dateRanges) {
    md += `> Current period: ${report.dateRanges.current.start} → ${report.dateRanges.current.end}\n`;
    md += `> Previous period: ${report.dateRanges.previous.start} → ${report.dateRanges.previous.end}\n`;
  }

  md += `\n---\n\n`;

  if (report.summary) {
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total pages tracked | ${report.summary.totalPages} |\n`;
    md += `| Decaying pages | ${report.summary.decaying} |\n`;
    md += `| Improving pages | ${report.summary.improving} |\n`;
    md += `| Stable pages | ${report.summary.stable} |\n`;
    md += `| Current period clicks | ${report.summary.totalCurrentClicks} |\n`;
    md += `| Previous period clicks | ${report.summary.totalPreviousClicks} |\n`;
    md += `\n---\n\n`;
  }

  md += `## 🚨 Decaying Pages (Decline ≤ ${report.threshold}%)\n\n`;
  if (report.decayingPages && report.decayingPages.length > 0) {
    report.decayingPages.forEach(p => {
      md += `### ${p.url}\n`;
      md += `- **Current clicks:** ${p.currentClicks} | **Previous:** ${p.previousClicks} | **Change:** ${p.change}\n`;
      md += `- **Position:** ${p.currentPosition} (was ${p.previousPosition})\n`;
      md += `- **Action:** ${p.action}\n`;
      md += `- **Priority:** ${p.priority}\n\n`;
    });
  } else {
    md += `_No decaying pages detected._\n\n`;
  }

  md += `## 📈 Improving Pages\n\n`;
  if (report.improvingPages && report.improvingPages.length > 0) {
    report.improvingPages.forEach(p => {
      md += `### ${p.url}\n`;
      md += `- **Current clicks:** ${p.currentClicks} | **Previous:** ${p.previousClicks} | **Change:** ${p.change}\n`;
      md += `- **Position:** ${p.currentPosition} (was ${p.previousPosition})\n`;
      md += `- **Action:** ${p.action}\n\n`;
    });
  } else {
    md += `_No improving pages detected._\n\n`;
  }

  if (report.actions && report.actions.length > 0) {
    md += `## Recommended Actions\n\n`;
    report.actions.forEach(a => md += `- ${a}\n`);
    md += `\n`;
  }

  md += `---\n\n*Run weekly via: node scripts/traffic-decay.cjs --days 90 --threshold -20*\n`;
  return md;
}

// CLI argument parsing
const args = process.argv.slice(2);
const daysArg = args.find(a => a.startsWith('--days='));
const thresholdArg = args.find(a => a.startsWith('--threshold='));

const options = {
  days: daysArg ? parseInt(daysArg.split('=')[1], 10) : CONFIG.defaultDays,
  threshold: thresholdArg ? parseInt(thresholdArg.split('=')[1], 10) : CONFIG.defaultThreshold,
};

detectTrafficDecay(options).catch(console.error);
