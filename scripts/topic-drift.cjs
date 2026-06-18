/**
 * Topic Drift Detection
 * 
 * Compares current embeddings to previous run to detect:
 * - Articles losing topical relevance
 * - Shifts in content focus
 * - Opportunities to refresh outdated content
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  embeddingsDir: path.join(__dirname, '../content-os/embeddings'),
  outputDir: path.join(__dirname, '../content-os/reports'),
  driftThreshold: 0.15, // Significant similarity change
};

async function detectTopicDrift() {
  console.log('🌊 Detecting Topic Drift');
  
  // Find all embedding files
  const files = fs.readdirSync(CONFIG.embeddingsDir)
    .filter(f => f.startsWith('embeddings-') && f.endsWith('.json'))
    .sort();
  
  if (files.length < 2) {
    console.log(`   ⚠️  Need at least 2 embedding runs. Found: ${files.length}`);
    console.log('   Run npm run embeddings:build at least twice (monthly) to detect drift.');
    return;
  }
  
  const current = JSON.parse(fs.readFileSync(path.join(CONFIG.embeddingsDir, files[files.length - 1]), 'utf8'));
  const previous = JSON.parse(fs.readFileSync(path.join(CONFIG.embeddingsDir, files[files.length - 2]), 'utf8'));
  
  console.log(`   Comparing: ${files[files.length - 2]} → ${files[files.length - 1]}`);
  console.log(`   Current articles: ${current.articles.length}`);
  console.log(`   Previous articles: ${previous.articles.length}`);
  
  // Find new, removed, and changed articles
  const currentSlugs = new Set(current.articles.map(a => a.slug));
  const previousSlugs = new Set(previous.articles.map(a => a.slug));
  
  const newArticles = current.articles.filter(a => !previousSlugs.has(a.slug));
  const removedArticles = previous.articles.filter(a => !currentSlugs.has(a.slug));
  
  // Compare vectors for existing articles
  const drifted = [];
  current.articles.forEach(curr => {
    const prev = previous.articles.find(a => a.slug === curr.slug);
    if (!prev) return;
    
    // Simple vector comparison (cosine similarity)
    const similarity = cosineSimilarity(curr.vector, prev.vector);
    const change = 1 - similarity;
    
    if (change > CONFIG.driftThreshold) {
      drifted.push({
        slug: curr.slug,
        title: curr.title,
        similarityChange: Math.round(change * 100) / 100,
        direction: change > 0 ? 'diverged' : 'converged',
        possibleCauses: inferCauses(curr, prev),
      });
    }
  });
  
  // Generate report
  const report = {
    generatedAt: new Date().toISOString(),
    compared: [files[files.length - 2], files[files.length - 1]],
    newArticles: newArticles.map(a => ({ slug: a.slug, title: a.title })),
    removedArticles: removedArticles.map(a => ({ slug: a.slug, title: a.title })),
    driftedArticles: drifted,
    summary: {
      totalCurrent: current.articles.length,
      totalPrevious: previous.articles.length,
      newCount: newArticles.length,
      removedCount: removedArticles.length,
      driftedCount: drifted.length,
    },
  };
  
  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = path.join(CONFIG.outputDir, `topic-drift-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  const mdPath = path.join(CONFIG.outputDir, `topic-drift-${timestamp}.md`);
  fs.writeFileSync(mdPath, generateDriftReport(report));
  
  console.log('\n✅ Topic Drift Analysis Complete!');
  console.log(`   New articles: ${newArticles.length}`);
  console.log(`   Removed articles: ${removedArticles.length}`);
  console.log(`   Drifted articles: ${drifted.length}`);
  console.log(`   Report: ${mdPath}`);
  
  if (drifted.length > 0) {
    console.log('\n⚠️  Articles with significant drift:');
    drifted.forEach(d => {
      console.log(`   - ${d.slug}: ${d.similarityChange} change (${d.direction})`);
    });
  }
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

function inferCauses(curr, prev) {
  const causes = [];
  
  if (curr.category !== prev.category) {
    causes.push('Category changed');
  }
  
  const currPeptides = new Set(curr.peptides || []);
  const prevPeptides = new Set(prev.peptides || []);
  const newPeptides = [...currPeptides].filter(p => !prevPeptides.has(p));
  const removedPeptides = [...prevPeptides].filter(p => !currPeptides.has(p));
  
  if (newPeptides.length > 0) causes.push(`Added peptides: ${newPeptides.join(', ')}`);
  if (removedPeptides.length > 0) causes.push(`Removed peptides: ${removedPeptides.join(', ')}`);
  
  if (causes.length === 0) causes.push('Content significantly rewritten');
  
  return causes;
}

function generateDriftReport(report) {
  return `# Topic Drift Report

> Generated: ${report.generatedAt}
> Comparing: ${report.compared[0]} → ${report.compared[1]}

---

## Summary

| Metric | Value |
|--------|-------|
| Current articles | ${report.summary.totalCurrent} |
| Previous articles | ${report.summary.totalPrevious} |
| New articles | ${report.summary.newCount} |
| Removed articles | ${report.summary.removedCount} |
| Drifted articles | ${report.summary.driftedCount} |

---

## New Articles

${report.newArticles.length > 0 ? report.newArticles.map(a => `- **${a.slug}**: ${a.title}`).join('\n') : '_No new articles_'}

---

## Removed Articles

${report.removedArticles.length > 0 ? report.removedArticles.map(a => `- **${a.slug}**: ${a.title}`).join('\n') : '_No removed articles_'}

---

## Drifted Articles (Significant Change)

${report.driftedArticles.length > 0 ? report.driftedArticles.map(d => `
### ${d.slug} (${d.similarityChange} change)
- **Direction:** ${d.direction}
- **Possible causes:** ${d.possibleCauses.join(', ')}
- **Action:** Review for topical relevance and internal linking
`).join('\n') : '_No significant drift detected_'}

---

## Recommended Actions

${report.driftedArticles.length > 0 ? `
1. **Review drifted articles** — Check if content still aligns with target keywords
2. **Update internal links** — New articles may need links from drifted content
3. **Refresh outdated content** — Drift may indicate stale information
4. **Check search performance** — Drifted articles may have ranking changes
` : `
1. **Continue monitoring** — No drift detected, schedule next check in 30 days
2. **Publish new content** — Add articles to grow topical authority
`}

---

*Run monthly via: npm run embeddings:drift*
`;
}

if (require.main === module) {
  detectTopicDrift().catch(console.error);
}

module.exports = { detectTopicDrift };
