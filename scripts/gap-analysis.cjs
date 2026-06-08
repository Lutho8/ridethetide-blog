/**
 * Content Gap Analysis
 * 
 * Uses Ahrefs MCP to find key topics competitors have covered that we haven't.
 * Generates seed keywords from customer language + competitor content.
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  competitors: [
    'peptide-sciences.com',
    'science.bio',
    'cosmicnootropic.com',
    'limitlesslife.nyc',
    'peptidewarehouse.com',
  ],
  ourDomain: 'blog.ridethetide.site',
  outputDir: path.join(__dirname, '../content-os/reports'),
  seedsDir: path.join(__dirname, '../content-os/seeds'),
};

[CONFIG.outputDir, CONFIG.seedsDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

async function runGapAnalysis(options = {}) {
  const { competitors = CONFIG.competitors } = options;
  
  console.log('🔍 Content Gap Analysis');
  console.log(`   Our domain: ${CONFIG.ourDomain}`);
  console.log(`   Competitors: ${competitors.join(', ')}`);
  
  const report = {
    generatedAt: new Date().toISOString(),
    ourDomain: CONFIG.ourDomain,
    competitors,
    status: 'pending_mcp_connection',
    note: 'Requires Ahrefs MCP server with Content Explorer access',
    
    // Expected analysis once connected
    expectedOutput: {
      gapKeywords: 'Keywords competitors rank for in top 10 that we do not rank for at all',
      gapTopics: 'Grouped topics from gap keywords (e.g., "BPC-157 dosage", "TB-500 side effects")',
      contentOpportunities: 'Specific article titles we should create',
      searchVolume: 'Monthly search volume for each gap',
      difficulty: 'Keyword difficulty scores',
      trafficValue: 'Estimated traffic value of each gap',
    },
    
    // Manual seed analysis (pre-MCP)
    manualSeeds: generateManualSeeds(),
    
    // Priority content opportunities (based on known gaps)
    opportunities: [
      {
        topic: 'BPC-157 South Africa — sourcing, legality, dosing',
        gapType: 'geo + compound',
        competitors: ['reddit.com', 'local forums'],
        searchIntent: 'Informational + Transactional',
        priority: 'P0',
        estimatedVolume: 'high',
      },
      {
        topic: 'Semaglutide vs Tirzepatide vs Retatrutide comparison',
        gapType: 'comparison',
        competitors: ['medical blogs', 'US peptide sites'],
        searchIntent: 'Informational',
        priority: 'P0',
        estimatedVolume: 'high',
      },
      {
        topic: 'Peptide reconstitution calculator and guide',
        gapType: 'tool + guide',
        competitors: ['calculator sites', 'reddit'],
        searchIntent: 'Informational + Tool',
        priority: 'P1',
        estimatedVolume: 'medium',
      },
      {
        topic: 'CJC-1295 + Ipamorelin stack protocol',
        gapType: 'protocol',
        competitors: ['biohacking blogs'],
        searchIntent: 'Informational',
        priority: 'P1',
        estimatedVolume: 'medium',
      },
      {
        topic: 'SAHPRA peptide regulations explained',
        gapType: 'regulatory',
        competitors: ['legal blogs', 'government sites'],
        searchIntent: 'Informational',
        priority: 'P1',
        estimatedVolume: 'medium',
      },
      {
        topic: 'GHK-Cu for skin and hair — research review',
        gapType: 'compound deep-dive',
        competitors: ['beauty/peptide blogs'],
        searchIntent: 'Informational',
        priority: 'P2',
        estimatedVolume: 'medium',
      },
      {
        topic: 'Epitalon longevity protocol and dosing',
        gapType: 'protocol',
        competitors: ['longevity blogs'],
        searchIntent: 'Informational',
        priority: 'P2',
        estimatedVolume: 'low',
      },
      {
        topic: 'Peptide storage and stability guide',
        gapType: 'research method',
        competitors: ['lab supply sites'],
        searchIntent: 'Informational',
        priority: 'P2',
        estimatedVolume: 'low',
      },
    ],
  };
  
  // Save report
  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = path.join(CONFIG.outputDir, `gap-analysis-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Save seed keywords file for topic research
  const seedsPath = path.join(CONFIG.seedsDir, `seed-keywords-${timestamp}.md`);
  fs.writeFileSync(seedsPath, generateSeedKeywordsMd(report));
  
  console.log('\n✅ Gap Analysis Complete!');
  console.log(`   Report: ${reportPath}`);
  console.log(`   Seeds: ${seedsPath}`);
  console.log(`\n   Opportunities found: ${report.opportunities.length}`);
  console.log(`   P0 (Critical): ${report.opportunities.filter(o => o.priority === 'P0').length}`);
  console.log(`   P1 (High): ${report.opportunities.filter(o => o.priority === 'P1').length}`);
  console.log(`   P2 (Medium): ${report.opportunities.filter(o => o.priority === 'P2').length}`);
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Connect Ahrefs MCP: npx @ahrefs/mcp-server');
  console.log('   2. Run automated gap analysis with real competitor data');
  console.log('   3. Use seed keywords for content brief generation');
}

function generateManualSeeds() {
  // Based on customer language patterns (would come from Gong/Intercom/Slack)
  return {
    customerLanguage: [
      'how do I mix BPC-157',
      'where to buy peptides in Cape Town',
      'is this legal in South Africa',
      'how much BAC water',
      'what needle to use',
      'how long before I see results',
      'can I stack these together',
      'what bloodwork do I need',
      'side effects worried',
      'how to store in fridge',
      'dosage calculator',
      'before and after photos',
      'protocol for fat loss',
      'best peptide for recovery',
      'CJC Ipamorelin timing',
    ],
    ngrams: {
      bigrams: [
        'peptide dosage', 'BPC-157 healing', 'TB-500 recovery', 'CJC-1295 stack',
        'Ipamorelin timing', 'Semaglutide weight', 'reconstitution guide',
        'South Africa', 'Cape Town', 'Johannesburg', 'SAHPRA approval',
      ],
      trigrams: [
        'how to reconstitute', 'BPC-157 dosage calculator', 'peptide stack protocol',
        'where to buy Cape Town', 'how long cycle', 'before and after',
        'side effects worried', 'bloodwork before starting',
      ],
    },
    entities: [
      { type: 'compound', values: ['BPC-157', 'TB-500', 'CJC-1295', 'Ipamorelin', 'Semaglutide', 'Tirzepatide', 'GHK-Cu'] },
      { type: 'location', values: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'South Africa'] },
      { type: 'protocol', values: ['fat loss', 'healing', 'longevity', 'cognitive', 'recovery', 'muscle gain'] },
      { type: 'concern', values: ['side effects', 'legality', 'sourcing', 'dosing', 'storage', 'bloodwork'] },
      { type: 'action', values: ['reconstitute', 'inject', 'stack', 'cycle', 'track', 'measure'] },
    ],
  };
}

function generateSeedKeywordsMd(report) {
  return `# Seed Keywords for Topic Research

> Generated: ${report.generatedAt}
> Source: Content Gap Analysis + Customer Language Extraction

---

## Customer Language (Exact Phrases)

${report.manualSeeds.customerLanguage.map(k => `- "${k}"`).join('\n')}

---

## Common Bigrams

${report.manualSeeds.ngrams.bigrams.map(b => `- ${b}`).join('\n')}

---

## Common Trigrams

${report.manualSeeds.ngrams.trigrams.map(t => `- ${t}`).join('\n')}

---

## Entity Map

${report.manualSeeds.entities.map(e => `### ${e.type}\n${e.values.map(v => `- ${v}`).join('\n')}`).join('\n\n')}

---

## Priority Content Opportunities

| Priority | Topic | Gap Type | Intent | Volume |
|----------|-------|----------|--------|--------|
${report.opportunities.map(o => `| ${o.priority} | ${o.topic} | ${o.gapType} | ${o.searchIntent} | ${o.estimatedVolume} |`).join('\n')}

---

## Usage

Use these seeds for:
1. **Ahrefs Keywords Explorer** — Expand each seed into keyword clusters
2. **Content Briefs** — Generate article briefs from high-opportunity topics
3. **Internal Linking** — Use entity map to connect related articles
4. **FAQ Schema** — Use exact customer phrases as FAQ questions

*Update weekly via: npm run content:gap*
`;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const competitors = args.find(a => a.startsWith('--competitors='))?.split('=')[1]?.split(',');
  runGapAnalysis({ competitors }).catch(console.error);
}

module.exports = { runGapAnalysis, generateManualSeeds };
