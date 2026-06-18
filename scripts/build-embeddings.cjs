/**
 * Sitemap Crawler + Vector Embeddings Builder
 * 
 * Crawls our sitemap and generates vector embeddings for every article.
 * Uses this to analyse topical authority and topic "drift".
 * Also automates internal linking suggestions.
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  sitemaps: [
    'https://app.peptide-south-africa.com/sitemap.xml',
    'https://peptide-south-africa.com/sitemap.xml',
  ],
  contentDir: path.join(__dirname, '../src/content/blog'),
  embeddingsDir: path.join(__dirname, '../content-os/embeddings'),
  outputDir: path.join(__dirname, '../content-os/reports'),
};

[CONFIG.embeddingsDir, CONFIG.outputDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Simple TF-IDF-like vectorization (placeholder for OpenAI/embedding API)
function textToVector(text) {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);
  
  // Normalize
  const total = words.length;
  const vector = {};
  Object.entries(freq).forEach(([w, c]) => {
    vector[w] = c / total;
  });
  
  return vector;
}

function cosineSimilarity(v1, v2) {
  const keys = new Set([...Object.keys(v1), ...Object.keys(v2)]);
  let dot = 0, mag1 = 0, mag2 = 0;
  
  keys.forEach(k => {
    const a = v1[k] || 0;
    const b = v2[k] || 0;
    dot += a * b;
    mag1 += a * a;
    mag2 += b * b;
  });
  
  return dot / (Math.sqrt(mag1) * Math.sqrt(mag2) || 1);
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'her', 'way', 'many', 'oil', 'sit', 'set', 'run', 'eat', 'far', 'sea', 'eye', 'ago', 'off', 'too', 'any', 'say', 'man', 'try', 'ask', 'end', 'why', 'let', 'put', 'say', 'she', 'try', 'way', 'own', 'say', 'too', 'old', 'tell', 'very', 'when', 'much', 'would', 'there', 'their', 'what', 'said', 'each', 'which', 'will', 'about', 'could', 'other', 'after', 'first', 'never', 'these', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'while', 'this', 'that', 'with', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'come', 'made', 'find', 'give', 'does', 'made', 'part', 'over', 'such', 'take', 'than', 'them', 'well', 'were', 'your', 'time', 'more', 'here', 'look', 'also', 'back', 'only', 'work', 'life', 'even', 'more', 'year', 'most', 'long', 'last', 'find', 'just', 'where', 'help', 'through', 'before', 'between', 'both', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now',
]);

async function buildEmbeddings() {
  console.log('🔢 Building Vector Embeddings');
  console.log(`   Content dir: ${CONFIG.contentDir}`);
  
  // Read all articles
  const articles = [];
  if (fs.existsSync(CONFIG.contentDir)) {
    fs.readdirSync(CONFIG.contentDir)
      .filter(f => f.endsWith('.md'))
      .forEach(f => {
        const content = fs.readFileSync(path.join(CONFIG.contentDir, f), 'utf8');
        const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');
        const frontmatter = parseFrontmatter(content);
        
        articles.push({
          slug: f.replace('.md', ''),
          title: frontmatter.title || '',
          description: frontmatter.description || '',
          category: frontmatter.category || '',
          peptides: frontmatter.peptides?.split(',').map(s => s.trim()) || [],
          tags: frontmatter.tags?.split(',').map(s => s.trim()) || [],
          body,
          vector: textToVector(`${frontmatter.title} ${frontmatter.description} ${body}`),
        });
      });
  }
  
  console.log(`   Articles indexed: ${articles.length}`);
  
  if (articles.length === 0) {
    console.log('   ⚠️  No articles found. Create content in src/content/blog/ first.');
    return;
  }
  
  // Calculate similarity matrix
  const similarities = [];
  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      const sim = cosineSimilarity(articles[i].vector, articles[j].vector);
      if (sim > 0.15) { // Threshold for "related"
        similarities.push({
          from: articles[i].slug,
          to: articles[j].slug,
          similarity: Math.round(sim * 100) / 100,
          reason: inferRelationship(articles[i], articles[j]),
        });
      }
    }
  }
  
  // Sort by similarity
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  // Generate internal linking suggestions
  const linkingSuggestions = {};
  articles.forEach(article => {
    const related = similarities
      .filter(s => s.from === article.slug || s.to === article.slug)
      .slice(0, 5)
      .map(s => ({
        slug: s.from === article.slug ? s.to : s.from,
        similarity: s.similarity,
        reason: s.reason,
      }));
    
    linkingSuggestions[article.slug] = related;
  });
  
  // Save embeddings
  const timestamp = new Date().toISOString().split('T')[0];
  const embeddingsPath = path.join(CONFIG.embeddingsDir, `embeddings-${timestamp}.json`);
  fs.writeFileSync(embeddingsPath, JSON.stringify({
    generatedAt: timestamp,
    articleCount: articles.length,
    articles: articles.map(a => ({
      slug: a.slug,
      title: a.title,
      category: a.category,
      peptides: a.peptides,
      tags: a.tags,
      vector: a.vector,
    })),
  }, null, 2));
  
  // Save linking suggestions
  const linksPath = path.join(CONFIG.outputDir, `internal-links-${timestamp}.json`);
  fs.writeFileSync(linksPath, JSON.stringify({
    generatedAt: timestamp,
    suggestions: linkingSuggestions,
  }, null, 2));
  
  // Save report
  const reportPath = path.join(CONFIG.outputDir, `embeddings-report-${timestamp}.md`);
  fs.writeFileSync(reportPath, generateReport(articles, similarities, linkingSuggestions));
  
  console.log('\n✅ Embeddings Built!');
  console.log(`   Articles: ${articles.length}`);
  console.log(`   Related pairs: ${similarities.length}`);
  console.log(`   Embeddings: ${embeddingsPath}`);
  console.log(`   Link suggestions: ${linksPath}`);
  console.log(`   Report: ${reportPath}`);
  
  // Topical authority analysis
  const categoryCoverage = analyzeTopicalAuthority(articles);
  console.log('\n📊 Topical Authority Summary:');
  Object.entries(categoryCoverage).forEach(([cat, data]) => {
    console.log(`   ${cat}: ${data.count} articles, ${data.peptides.length} peptides covered`);
  });
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  
  const fm = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      fm[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
    }
  });
  return fm;
}

function inferRelationship(a, b) {
  const sharedPeptides = a.peptides.filter(p => b.peptides.includes(p));
  if (sharedPeptides.length > 0) return `Shared peptide: ${sharedPeptides.join(', ')}`;
  
  if (a.category === b.category) return `Same category: ${a.category}`;
  
  const sharedTags = a.tags.filter(t => b.tags.includes(t));
  if (sharedTags.length > 0) return `Shared tag: ${sharedTags.join(', ')}`;
  
  return 'Topical similarity';
}

function analyzeTopicalAuthority(articles) {
  const byCategory = {};
  articles.forEach(a => {
    const cat = a.category || 'Uncategorized';
    if (!byCategory[cat]) {
      byCategory[cat] = { count: 0, peptides: new Set(), tags: new Set() };
    }
    byCategory[cat].count++;
    a.peptides.forEach(p => byCategory[cat].peptides.add(p));
    a.tags.forEach(t => byCategory[cat].tags.add(t));
  });
  
  // Convert sets to arrays
  Object.keys(byCategory).forEach(k => {
    byCategory[k].peptides = [...byCategory[k].peptides];
    byCategory[k].tags = [...byCategory[k].tags];
  });
  
  return byCategory;
}

function generateReport(articles, similarities, linkingSuggestions) {
  const topLinks = Object.entries(linkingSuggestions)
    .map(([slug, links]) => ({ slug, links }))
    .filter(a => a.links.length > 0);
  
  return `# Vector Embeddings & Topical Authority Report

> Generated: ${new Date().toISOString()}
> Articles indexed: ${articles.length}
> Related content pairs: ${similarities.length}

---

## Topical Authority by Category

${Object.entries(analyzeTopicalAuthority(articles)).map(([cat, data]) => `
### ${cat}
- **Articles:** ${data.count}
- **Peptides covered:** ${data.peptides.join(', ') || 'None'}
- **Tags:** ${data.tags.join(', ') || 'None'}
`).join('\n')}

---

## Internal Linking Suggestions (Top 10)

| Article | Suggested Link | Similarity | Reason |
|---------|---------------|------------|--------|
${topLinks.slice(0, 10).flatMap(a => a.links.slice(0, 2).map(l => `| ${a.slug} | ${l.slug} | ${l.similarity} | ${l.reason} |`)).join('\n')}

---

## Topic Drift Detection

> Topic drift compares current embeddings to previous run.
> Run \`npm run embeddings:drift\` after building embeddings for 2+ time periods.

To detect drift:
1. Build embeddings monthly: \`npm run embeddings:build\`
2. Compare to previous: \`npm run embeddings:drift\`
3. Flag articles whose nearest neighbors have changed significantly

---

## Next Steps

1. **Add more articles** — Target: 50+ articles for strong topical authority
2. **Connect OpenAI embeddings** — Replace TF-IDF with ada-002 or text-embedding-3 for better semantic similarity
3. **Auto-linking** — Use suggestions to add \`relatedArticles\` frontmatter
4. **Topic drift** — Schedule monthly embedding builds to track authority shifts

*Run \`npm run embeddings:build\` to regenerate after publishing new content.*
`;
}

if (require.main === module) {
  buildEmbeddings().catch(console.error);
}

module.exports = { buildEmbeddings, textToVector, cosineSimilarity };
