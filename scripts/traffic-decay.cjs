/**
 * Traffic Decay Detection
 * 
 * Uses GSC MCP to detect pages with significant traffic decline.
 * Flags articles needing refresh or optimization.
 * 
 * Usage: node scripts/traffic-decay.js --days 90 --threshold -20
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  gscSite: process.env.GSC_SITE_URL || 'https://blog.ridethetide.site/',
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
    console.log('   2. Run: node scripts/gsc-auth.js to get refresh token');
    console.log('   3. GSC property must be verified for your site');
    
    // Generate template report
    const report = generateTemplateReport(days, threshold);
    saveReport(report, days, threshold);
    return;
  }
  
  // In production, this would call the GSC MCP/API
  // For now, document the expected workflow
  console.log('\n📋 Expected workflow (requires GSC MCP):');
  console.log('   1. Query GSC Search Analytics API for last N days');
  console.log('   2. Compare to previous N-day period');
  console.log('   3. Calculate % change in clicks, impressions, CTR, position');
  console.log('   4. Flag pages with decline > threshold');
  console.log('   5. Cross-reference with content audit priority queue');
  
  const report = {
    generatedAt: new Date().toISOString(),
    site: CONFIG.gscSite,
    days,
    threshold,
    status: 'pending_gsc_connection',
    decayingPages: [],
    improvingPages: [],
    stablePages: [],
    actions: [],
  };
  
  saveReport(report, days, threshold);
  
  console.log('\n✅ Template report generated.');
  console.log('   Connect GSC MCP to get live data.');
}

function generateTemplateReport(days, threshold) {
  return {
    generatedAt: new Date().toISOString(),
    site: 'https://blog.ridethetide.site/',
    days,
    threshold,
    status: 'template',
    note: 'This is a template report. Connect GSC MCP for live data.',
    
    decayingPages: [
      {
        url: '/blog/bpc-157-guide',
        currentClicks: 120,
        previousClicks: 180,
        change: -33,
        currentPosition: 8.2,
        previousPosition: 5.1,
        query: 'BPC-157 South Africa',
        action: 'Refresh article with 2026 research, add FAQ schema',
        priority: 'P1',
      },
      {
        url: '/blog/reconstitution-guide',
        currentClicks: 85,
        previousClicks: 110,
        change: -23,
        currentPosition: 12.4,
        previousPosition: 7.8,
        query: 'how to reconstitute peptides',
        action: 'Add video embed, update calculator, improve internal linking',
        priority: 'P2',
      },
    ],
    
    improvingPages: [
      {
        url: '/blog/sahpra-peptide-regulations',
        currentClicks: 95,
        previousClicks: 45,
        change: 111,
        currentPosition: 4.2,
        previousPosition: 11.5,
        query: 'peptide laws South Africa',
        action: 'Double down — expand to related regulatory topics',
        priority: 'P2',
      },
    ],
    
    actions: [
      'Connect GSC MCP for live traffic data',
      'Set up weekly automated decay detection',
      'Integrate with content refresh pipeline',
      'Add decay alerts to Content OS dashboard',
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
  return `# Traffic Decay Report — ${report.site}

> Generated: ${report.generatedAt}
> Lookback: ${report.days} days
> Threshold: ${report.threshold}% decline
> Status: ${report.status}

---

## Decaying Pages (Decline > ${report.threshold}%)

${report.decayingPages.length > 0 ? report.decayingPages.map(p => `
### ${p.url}
- **Query:** ${p.query}
- **Clicks:** ${p.previousClicks} → ${p.currentClicks} (${p.change}%)
- **Position:** ${p.previousPosition} → ${p.currentPosition}
- **Action:** ${p.action}
- **Priority:** ${p.priority}
`).join('\n') : '_No decaying pages detected (template)_'}

---

## Improving Pages

${report.improvingPages.length > 0 ? report.improvingPages.map(p => `
### ${p.url}
- **Query:** ${p.query}
- **Clicks:** ${p.previousClicks} → ${p.currentClicks} (+${p.change}%)
- **Position:** ${p.previousPosition} → ${p.currentPosition}
- **Action:** ${p.action}
- **Priority:** ${p.priority}
`).join('\n') : '_No improving pages detected (template)_'}

---

## Recommended Actions

${report.actions.map(a => `- [ ] ${a}`).join('\n')}

---

*Run weekly via: node scripts/traffic-decay.js --days 90 --threshold -20*
`;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    days: parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1]) || CONFIG.defaultDays,
    threshold: parseInt(args.find(a => a.startsWith('--threshold='))?.split('=')[1]) || CONFIG.defaultThreshold,
  };
  detectTrafficDecay(options).catch(console.error);
}

module.exports = { detectTrafficDecay };
