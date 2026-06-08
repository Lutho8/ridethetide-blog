/**
 * AI Search Visibility Tracker
 * 
 * Tracks brand mentions in AI search answers (ChatGPT, Perplexity, Claude).
 * Uses Brand Radar API or manual search queries.
 * 
 * Usage: node scripts/ai-visibility.js --brand "Ride The Tide"
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  brand: 'Ride The Tide',
  competitors: ['Peptide Sciences', 'Science.bio', 'Cosmic Nootropic'],
  queries: [
    'best peptides South Africa',
    'BPC-157 South Africa',
    'peptide protocol tracker',
    'where to buy peptides Cape Town',
    'CJC-1295 Ipamorelin stack',
    'peptide reconstitution guide',
    'SAHPRA peptide regulations',
  ],
  outputDir: path.join(__dirname, '../content-os/reports'),
};

if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

async function trackAiVisibility(options = {}) {
  const { brand = CONFIG.brand } = options;
  
  console.log('🤖 AI Search Visibility Tracker');
  console.log(`   Brand: ${brand}`);
  console.log(`   Queries: ${CONFIG.queries.length}`);
  
  // Check Brand Radar connection
  if (!process.env.BRAND_RADAR_API_KEY) {
    console.log('\n⚠️  Brand Radar not connected. This script requires:');
    console.log('   1. BRAND_RADAR_API_KEY in .env');
    console.log('   2. Ahrefs Brand Radar subscription');
    console.log('   3. Or: manual query tracking via Perplexity/ChatGPT');
  }
  
  const report = {
    generatedAt: new Date().toISOString(),
    brand,
    status: 'pending_brand_radar',
    note: 'Requires Brand Radar API or manual AI search queries',
    
    // Template data
    visibilityScore: null,
    trend: null,
    
    citations: [
      {
        source: 'Perplexity',
        query: 'best peptides South Africa',
        mentioned: false,
        context: null,
        competitorsMentioned: ['Peptide Sciences'],
        date: null,
      },
      {
        source: 'ChatGPT',
        query: 'BPC-157 dosing protocol',
        mentioned: false,
        context: null,
        competitorsMentioned: ['Science.bio'],
        date: null,
      },
      {
        source: 'Claude',
        query: 'peptide research South Africa',
        mentioned: false,
        context: null,
        competitorsMentioned: [],
        date: null,
      },
    ],
    
    recommendations: [
      'Publish comprehensive peptide guides with structured data',
      'Build topical authority on South African peptide topics',
      'Get cited in research papers and medical publications',
      'Optimize for AI-readable content (clear headings, FAQ schema)',
      'Build brand mentions on authoritative health/research sites',
    ],
    
    actions: [
      'Connect Brand Radar API for automated tracking',
      'Run manual AI search queries monthly',
      'Document AI citations in this report',
      'Track competitor AI visibility for benchmarking',
    ],
  };
  
  saveReport(report);
  
  console.log('\n✅ AI Visibility Report Generated!');
  console.log('   Template report created with tracking framework.');
  console.log('\n📋 Manual Tracking Method:');
  console.log('   1. Open Perplexity.ai');
  console.log('   2. Search: "best peptides South Africa"');
  console.log('   3. Check if Ride The Tide is cited');
  console.log('   4. Repeat for each query in config');
  console.log('   5. Update this report manually until Brand Radar is connected');
}

function saveReport(report) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `ai-visibility-${timestamp}`;
  
  const jsonPath = path.join(CONFIG.outputDir, `${filename}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  
  const mdPath = path.join(CONFIG.outputDir, `${filename}.md`);
  fs.writeFileSync(mdPath, generateMarkdownReport(report));
  
  console.log(`\n   JSON: ${jsonPath}`);
  console.log(`   Markdown: ${mdPath}`);
}

function generateMarkdownReport(report) {
  return `# AI Search Visibility Report — ${report.brand}

> Generated: ${report.generatedAt}
> Status: ${report.status}

---

## Visibility Score

${report.visibilityScore !== null ? `**${report.visibilityScore}/100**` : '_Not yet calculated — connect Brand Radar API_'}

---

## AI Citations by Source

| Source | Query | Mentioned | Competitors Mentioned |
|--------|-------|-----------|----------------------|
${report.citations.map(c => `| ${c.source} | ${c.query} | ${c.mentioned ? '✅' : '❌'} | ${c.competitorsMentioned.join(', ') || 'None'} |`).join('\n')}

---

## Recommendations

${report.recommendations.map(r => `- ${r}`).join('\n')}

---

## Actions

${report.actions.map(a => `- [ ] ${a}`).join('\n')}

---

## How to Improve AI Visibility

1. **Structured Data** — FAQ schema, HowTo schema, Article schema
2. **Clear Headings** — AI models extract from H1/H2/H3 structure
3. **Direct Answers** — Answer questions concisely in first paragraph
4. **Citations** — Get mentioned on authoritative sites AI models train on
5. **Fresh Content** — AI models prefer recent, updated content
6. **South African Context** — Be the definitive SA resource for peptide topics

---

*Run monthly via: node scripts/ai-visibility.js --brand "Ride The Tide"*
`;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    brand: args.find(a => a.startsWith('--brand='))?.split('=')[1],
  };
  trackAiVisibility(options).catch(console.error);
}

module.exports = { trackAiVisibility };
