/**
 * Customer Language Extraction
 * 
 * Extracts common entities and n-grams from Gong/Intercom/Slack.
 * Uses this as seed keywords for topic research.
 * 
 * Usage:
 *   node scripts/extract-language.js --source gong --days 30
 *   node scripts/extract-language.js --source intercom --days 30
 *   node scripts/extract-language.js --source slack --channel customer-feedback --days 30
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  outputDir: path.join(__dirname, '../content-os/seeds'),
  minFrequency: 3,
};

if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

async function extractLanguage(options) {
  const { source, days = 30, channel } = options;
  
  console.log(`🗣️  Extracting Customer Language from ${source}`);
  console.log(`   Lookback: ${days} days`);
  if (channel) console.log(`   Channel: ${channel}`);
  
  // Placeholder — would connect to MCP server
  const extraction = {
    source,
    days,
    channel,
    status: 'pending_mcp_connection',
    note: `Requires ${source} MCP server running and API credentials`,
    
    // Expected output structure
    expectedOutput: {
      rawConversations: 'Full text of all conversations in lookback period',
      entities: 'Named entities (compounds, locations, protocols, concerns)',
      ngrams: 'Unigrams, bigrams, trigrams with frequency counts',
      questions: 'Questions customers ask (sorted by frequency)',
      sentiment: 'Positive/negative/neutral sentiment per conversation',
      topics: 'Auto-clustered topics from conversations',
    },
    
    // Manual seed data (pre-MCP)
    sampleData: getSampleData(source),
  };
  
  // Save extraction
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(CONFIG.outputDir, `language-${source}-${timestamp}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(extraction, null, 2));
  
  // Save as markdown for easy reading
  const mdPath = path.join(CONFIG.outputDir, `language-${source}-${timestamp}.md`);
  fs.writeFileSync(mdPath, generateLanguageMd(extraction));
  
  console.log('\n✅ Language Extraction Complete!');
  console.log(`   Output: ${outputPath}`);
  console.log(`   Markdown: ${mdPath}`);
  console.log('\n📋 Next Steps:');
  console.log(`   1. Connect ${source} MCP server (see config/mcp-connectors.md)`);
  console.log('   2. Re-run with live data');
  console.log('   3. Use extracted n-grams as seed keywords for content briefs');
}

function getSampleData(source) {
  // These are realistic patterns based on the peptide research niche
  const commonPatterns = {
    gong: {
      description: 'Sales call transcripts — prospects asking about protocols, safety, legality',
      samplePhrases: [
        'How do I know this is real?',
        'What bloodwork do I need before starting?',
        'Is this legal in South Africa?',
        'How long before I see results?',
        'Can I take this with my current medication?',
        'What if I miss a dose?',
        'How do I mix the powder?',
        'Do you ship to Johannesburg?',
        'What needle size should I use?',
        'Will this show up on a drug test?',
        'How do I store it?',
        'What\'s the difference between BPC-157 and TB-500?',
        'Can I stack multiple peptides?',
        'How much does the full protocol cost?',
        'Do I need a prescription?',
      ],
      topEntities: {
        compounds: ['BPC-157', 'TB-500', 'CJC-1295', 'Ipamorelin', 'Semaglutide', 'Tirzepatide'],
        locations: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria'],
        concerns: ['legality', 'safety', 'side effects', 'cost', 'shipping', 'authenticity'],
        actions: ['reconstitute', 'inject', 'stack', 'cycle', 'track'],
      },
    },
    intercom: {
      description: 'Support conversations — customers asking how to use the tracker, reporting issues',
      samplePhrases: [
        'How do I add a new protocol?',
        'The dose calculator is giving me the wrong amount',
        'Can I export my data?',
        'How do I set reminders?',
        'The app crashed when I tried to...',
        'Can I track multiple peptides at once?',
        'What does adherence percentage mean?',
        'How do I edit a past dose?',
        'Can I share my protocol with my doctor?',
        'Is there a desktop version?',
      ],
      topEntities: {
        features: ['dose calculator', 'protocol tracker', 'reminders', 'export', 'adherence'],
        issues: ['crash', 'wrong calculation', 'can\'t edit', 'sync failed'],
        requests: ['desktop app', 'share protocol', 'multiple protocols', 'dark mode'],
      },
    },
    slack: {
      description: 'Internal team discussions — customer feedback, feature ideas, market observations',
      samplePhrases: [
        'Customer asked about GHRP-6 again',
        'We should write a guide on reconstitution',
        'Competitor X just launched Y',
        'FAQ: Is this FDA approved?',
        'Shipping delay to Durban — notify customers',
        'New research on Retatrutide just dropped',
        'Customer success story: lost 10kg in 8 weeks',
        'Need to update dosing info for Semaglutide',
      ],
      topEntities: {
        competitors: ['Peptide Sciences', 'Science.bio', 'Cosmic Nootropic'],
        contentIdeas: ['reconstitution guide', 'dosing calculator', 'comparison article'],
        alerts: ['new research', 'shipping issue', 'competitor launch'],
      },
    },
  };
  
  return commonPatterns[source] || { description: 'Unknown source', samplePhrases: [], topEntities: {} };
}

function generateLanguageMd(extraction) {
  const data = extraction.sampleData;
  
  return `# Customer Language Extraction — ${extraction.source}

> Source: ${extraction.source}
> Lookback: ${extraction.days} days
> Generated: ${extraction.generatedAt || new Date().toISOString()}

---

## Source Description

${data.description}

---

## Sample Customer Phrases

${data.samplePhrases.map(p => `- "${p}"`).join('\n')}

---

## Top Entities

${Object.entries(data.topEntities || {}).map(([type, values]) => `
### ${type}
${values.map(v => `- ${v}`).join('\n')}
`).join('\n')}

---

## How to Use This Data

1. **Content Briefs** — Use exact phrases as H2s or FAQ questions
2. **SEO Keywords** — Target "how do I..." and "can I..." question keywords
3. **Product Copy** — Mirror customer language in feature descriptions
4. **Email Subject Lines** — Use high-frequency phrases for open rates
5. **Ad Copy** — Test customer phrases vs. marketing language

---

## N-Gram Analysis (Pending MCP Connection)

Once ${extraction.source} MCP is connected, this will include:
- Unigram frequency table
- Bigram co-occurrence matrix
- Trigram question patterns
- Sentiment-tagged phrases
- Topic clusters with representative quotes

---

*Extracted by Content OS Language Pipeline*
*Next extraction: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}*
`;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    source: args.find(a => a.startsWith('--source='))?.split('=')[1],
    days: parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1]) || 30,
    channel: args.find(a => a.startsWith('--channel='))?.split('=')[1],
  };
  
  if (!options.source) {
    console.error('Usage: node extract-language.js --source=gong|intercom|slack [--days=30] [--channel=channel-name]');
    process.exit(1);
  }
  
  extractLanguage(options).catch(console.error);
}

module.exports = { extractLanguage };
