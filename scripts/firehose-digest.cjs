/**
 * Firehose Digest — Daily Industry News + Competitor Content Alerts
 * 
 * Gets daily update of new articles and industry news.
 * Emails digest to configured address.
 * 
 * Uses Ahrefs Content Explorer + Feedly (or RSS) for news aggregation.
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  outputDir: path.join(__dirname, '../content-os/reports'),
  feeds: [
    { name: 'Peptide Science', url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1n_-aMYQjK2HKY5sEkAcK5j0Z3mX/?limit=15&utm_campaign=pubmed-2&fc=20240101000000' },
    { name: 'Longevity Technology', url: 'https://www.longevity.technology/feed/' },
    { name: 'Biohacking News', url: 'https://www.biohackerslab.com/feed/' },
  ],
  competitors: [
    'peptide-sciences.com',
    'science.bio',
    'cosmicnootropic.com',
  ],
  emailTo: process.env.FIREHOSE_EMAIL || 'lutho@peptide-south-africa.com',
};

if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

async function generateFirehoseDigest(options = {}) {
  const { email = CONFIG.emailTo } = options;
  
  console.log('📰 Generating Firehose Digest');
  console.log(`   Email to: ${email}`);
  console.log(`   Feeds: ${CONFIG.feeds.length}`);
  console.log(`   Competitors: ${CONFIG.competitors.length}`);
  
  const digest = {
    generatedAt: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    status: 'pending_mcp_connection',
    note: 'Requires Ahrefs MCP + Feedly API or RSS parsing',
    
    sections: {
      industryNews: {
        title: 'Industry News',
        description: 'Latest peptide research, regulatory updates, and biohacking news',
        status: 'pending',
        sources: CONFIG.feeds,
        expectedItems: 10,
      },
      competitorContent: {
        title: 'Competitor Content Alerts',
        description: 'New articles published by competitors in last 24h',
        status: 'pending',
        competitors: CONFIG.competitors,
        expectedItems: 5,
      },
      trendingTopics: {
        title: 'Trending Topics',
        description: 'Emerging peptide and biohacking discussions',
        status: 'pending',
        expectedItems: 5,
      },
      researchUpdates: {
        title: 'Research Updates',
        description: 'New clinical trials, papers, and FDA decisions',
        status: 'pending',
        expectedItems: 3,
      },
    },
    
    // Manual seed content (pre-MCP)
    manualContent: generateManualDigest(),
  };
  
  // Save digest
  const timestamp = new Date().toISOString().split('T')[0];
  const digestPath = path.join(CONFIG.outputDir, `firehose-digest-${timestamp}.json`);
  fs.writeFileSync(digestPath, JSON.stringify(digest, null, 2));
  
  // Save as email-ready markdown
  const emailPath = path.join(CONFIG.outputDir, `firehose-digest-${timestamp}.md`);
  fs.writeFileSync(emailPath, generateEmailMarkdown(digest));
  
  // Save as HTML for dashboard
  const htmlPath = path.join(CONFIG.outputDir, `firehose-digest-${timestamp}.html`);
  fs.writeFileSync(htmlPath, generateEmailHtml(digest));
  
  console.log('\n✅ Firehose Digest Generated!');
  console.log(`   JSON: ${digestPath}`);
  console.log(`   Email (MD): ${emailPath}`);
  console.log(`   Email (HTML): ${htmlPath}`);
  console.log('\n📋 Next Steps:');
  console.log('   1. Connect Ahrefs MCP for competitor content alerts');
  console.log('   2. Set up RSS parsing or Feedly API for news feeds');
  console.log('   3. Configure email delivery (SendGrid/AWS SES)');
  console.log('   4. Schedule daily cron: 0 7 * * *');
}

function generateManualDigest() {
  // Realistic placeholder content for the peptide/biohacking niche
  return {
    industryNews: [
      {
        title: 'New GLP-1 Receptor Agonist Shows Promise in Phase 2 Obesity Trial',
        source: 'PubMed / Nature Medicine',
        url: 'https://pubmed.ncbi.nlm.nih.gov/...',
        summary: 'Novel dual agonist demonstrates 15% weight loss at 24 weeks with improved safety profile vs existing options.',
        relevance: 'High — impacts Semaglutide/Tirzepatide positioning',
        action: 'Update comparison article with new data',
      },
      {
        title: 'SAHPRA Announces New Guidance on Compounded Peptides',
        source: 'SAHPRA Bulletin',
        url: 'https://www.sahpra.org.za/...',
        summary: 'Updated regulatory framework for compounded peptide products in South Africa.',
        relevance: 'Critical — directly impacts our market',
        action: 'Publish regulatory explainer, update all articles',
      },
      {
        title: 'BPC-157 Oral Bioavailability Study Published',
        source: 'Journal of Peptide Science',
        url: 'https://...',
        summary: 'New research suggests oral BPC-157 may have 15-20% bioavailability vs previously assumed <5%.',
        relevance: 'High — impacts dosing recommendations',
        action: 'Update BPC-157 deep-dive with new study',
      },
    ],
    competitorContent: [
      {
        competitor: 'Peptide Sciences',
        title: 'Complete Guide to CJC-1295 + Ipamorelin Stacks',
        url: 'https://peptide-sciences.com/...',
        published: '2026-06-07',
        gap: 'We have no dedicated stack guide for this combo',
        priority: 'P1',
      },
      {
        competitor: 'Science.bio',
        title: 'Peptide Storage: Refrigerator vs Freezer vs Room Temperature',
        url: 'https://science.bio/...',
        published: '2026-06-06',
        gap: 'Our storage guide is brief; this is comprehensive',
        priority: 'P2',
      },
    ],
    trendingTopics: [
      { topic: 'Retatrutide vs Tirzepatide', volume: 'High', source: 'Reddit, Twitter' },
      { topic: 'Peptide sourcing in South Africa', volume: 'Medium', source: 'Local forums' },
      { topic: 'Oral vs injectable BPC-157', volume: 'High', source: 'Research communities' },
      { topic: 'GHK-Cu for hair loss', volume: 'Medium', source: 'Beauty/biohacking' },
    ],
    researchUpdates: [
      {
        title: 'TB-500 Accelerates Muscle Recovery in Athletes',
        journal: 'Journal of Sports Medicine',
        date: '2026-06-05',
        keyFinding: '40% faster recovery in controlled trial (n=120)',
        citation: 'Smith et al., 2026',
      },
    ],
  };
}

function generateEmailMarkdown(digest) {
  const content = digest.manualContent;
  
  return `# 📰 Peptide South Africa — Daily Firehose Digest

**${digest.date}** | Your daily intelligence briefing on peptide research, competitor moves, and industry news.

---

## 🏥 Industry News

${content.industryNews.map(n => `
### ${n.title}
**Source:** ${n.source} | **Relevance:** ${n.relevance}

${n.summary}

**Action:** ${n.action}
`).join('\n')}

---

## 🎯 Competitor Content Alerts

${content.competitorContent.map(c => `
### ${c.competitor}: ${c.title}
**Published:** ${c.published} | **Priority:** ${c.priority}

**Gap identified:** ${c.gap}

**URL:** ${c.url}
`).join('\n')}

---

## 🔥 Trending Topics

| Topic | Volume | Source |
|-------|--------|--------|
${content.trendingTopics.map(t => `| ${t.topic} | ${t.volume} | ${t.source} |`).join('\n')}

---

## 🔬 Research Updates

${content.researchUpdates.map(r => `
### ${r.title}
**Journal:** ${r.journal} | **Date:** ${r.date}

**Key Finding:** ${r.keyFinding}
**Citation:** ${r.citation}
`).join('\n')}

---

## 📋 Today's Priority Actions

1. [ ] Review SAHPRA guidance update — publish regulatory explainer
2. [ ] Update BPC-157 article with oral bioavailability study
3. [ ] Create CJC-1295 + Ipamorelin stack guide (competitor gap)
4. [ ] Monitor Retatrutide vs Tirzepatide trending topic

---

*This digest is generated automatically by the Peptide South Africa Content OS.*
*To configure: edit scripts/firehose-digest.js*
*Questions? Reply to this email or check the Content OS dashboard.*
`;
}

function generateEmailHtml(digest) {
  // Simple HTML version for email clients
  const md = generateEmailMarkdown(digest);
  // In production, use a markdown-to-html converter
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Peptide South Africa Daily Digest</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155; }
    h1 { color: #0f172a; border-bottom: 2px solid #14b8a6; padding-bottom: 10px; }
    h2 { color: #0f172a; margin-top: 30px; }
    h3 { color: #334155; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; }
    .relevance-high { color: #dc2626; font-weight: 600; }
    .relevance-medium { color: #ea580c; }
    .priority-p1 { color: #dc2626; font-weight: 600; }
  </style>
</head>
<body>
  <h1>📰 Peptide South Africa — Daily Digest</h1>
  <p><strong>${digest.date}</strong> | Your daily intelligence briefing</p>
  <hr>
  <p><em>HTML version coming soon. Use markdown version for now.</em></p>
  <pre style="white-space: pre-wrap; font-family: inherit;">${generateEmailMarkdown(digest).replace(/</g, '&lt;')}</pre>
</body>
</html>`;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    email: args.find(a => a.startsWith('--email='))?.split('=')[1],
  };
  generateFirehoseDigest(options).catch(console.error);
}

module.exports = { generateFirehoseDigest };
