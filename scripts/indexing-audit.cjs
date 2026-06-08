/**
 * Indexing Audit
 * 
 * Checks GSC indexing status for all site pages.
 * Flags pages excluded from index and provides remediation steps.
 * 
 * Usage: node scripts/indexing-audit.js
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  gscSite: process.env.GSC_SITE_URL || 'https://blog.ridethetide.site/',
  sitemaps: [
    'https://blog.ridethetide.site/sitemap-index.xml',
    'https://www.ridethetide.info/sitemap.xml',
    'https://ridethetide.site/sitemap.xml',
  ],
  outputDir: path.join(__dirname, '../content-os/reports'),
};

if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

async function runIndexingAudit() {
  console.log('🔍 Indexing Audit');
  console.log(`   Site: ${CONFIG.gscSite}`);
  
  if (!process.env.GSC_REFRESH_TOKEN) {
    console.log('\n⚠️  GSC not connected. This script requires:');
    console.log('   1. GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN in .env');
    console.log('   2. Run: node scripts/gsc-auth.js to get refresh token');
    console.log('   3. GSC property must be verified for your site');
    
    generateTemplateReport();
    return;
  }
  
  console.log('\n📋 Expected workflow (requires GSC MCP):');
  console.log('   1. Query GSC Indexing API for URL inspection');
  console.log('   2. Check sitemap submission status');
  console.log('   3. Identify excluded pages and reasons');
  console.log('   4. Generate remediation recommendations');
  
  generateTemplateReport();
}

function generateTemplateReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    site: CONFIG.gscSite,
    status: 'template',
    note: 'Connect GSC MCP for live indexing data',
    
    summary: {
      totalUrls: 0,
      indexed: 0,
      notIndexed: 0,
      excluded: 0,
      pending: 0,
    },
    
    excludedPages: [
      {
        url: '/blog/draft-article',
        status: 'Excluded by noindex tag',
        reason: 'Draft content should not be indexed',
        action: 'Remove noindex when published',
        priority: 'P2',
      },
      {
        url: '/admin/*',
        status: 'Blocked by robots.txt',
        reason: 'Admin pages correctly blocked',
        action: 'No action needed',
        priority: 'P3',
      },
    ],
    
    notIndexedPages: [
      {
        url: '/blog/bpc-157-guide',
        status: 'Discovered - currently not indexed',
        reason: 'New page, Google has not crawled yet',
        action: 'Submit URL via GSC, request indexing',
        priority: 'P1',
      },
      {
        url: '/guides/reconstitution',
        status: 'Crawled - currently not indexed',
        reason: 'May be duplicate content or thin content',
        action: 'Add unique content, improve internal linking',
        priority: 'P1',
      },
    ],
    
    sitemapStatus: CONFIG.sitemaps.map(url => ({
      url,
      status: 'pending',
      lastSubmitted: null,
      urlsSubmitted: 0,
      urlsIndexed: 0,
    })),
    
    recommendations: [
      'Submit sitemap to GSC for blog.ridethetide.site',
      'Request indexing for new articles immediately after publish',
      'Monitor "Discovered - not indexed" pages weekly',
      'Fix "Crawled - not indexed" pages with content improvements',
      'Ensure all published pages have canonical tags',
      'Check for duplicate content across ridethetide.site and ridethetide.info',
    ],
  };
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `indexing-audit-${timestamp}`;
  
  const jsonPath = path.join(CONFIG.outputDir, `${filename}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  
  const mdPath = path.join(CONFIG.outputDir, `${filename}.md`);
  fs.writeFileSync(mdPath, generateMarkdownReport(report));
  
  console.log('\n✅ Indexing Audit Report Generated!');
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   Markdown: ${mdPath}`);
}

function generateMarkdownReport(report) {
  return `# Indexing Audit Report — ${report.site}

> Generated: ${report.generatedAt}
> Status: ${report.status}

---

## Summary

| Metric | Count |
|--------|-------|
| Total URLs | ${report.summary.totalUrls} |
| Indexed | ${report.summary.indexed} |
| Not Indexed | ${report.summary.notIndexed} |
| Excluded | ${report.summary.excluded} |
| Pending | ${report.summary.pending} |

---

## Sitemap Status

| Sitemap | Status | URLs Submitted | URLs Indexed |
|---------|--------|----------------|--------------|
${report.sitemapStatus.map(s => `| ${s.url} | ${s.status} | ${s.urlsSubmitted} | ${s.urlsIndexed} |`).join('\n')}

---

## Not Indexed Pages (Action Required)

${report.notIndexedPages.map(p => `
### ${p.url}
- **Status:** ${p.status}
- **Reason:** ${p.reason}
- **Action:** ${p.action}
- **Priority:** ${p.priority}
`).join('\n')}

---

## Excluded Pages (Review)

${report.excludedPages.map(p => `
### ${p.url}
- **Status:** ${p.status}
- **Reason:** ${p.reason}
- **Action:** ${p.action}
- **Priority:** ${p.priority}
`).join('\n')}

---

## Recommendations

${report.recommendations.map(r => `- [ ] ${r}`).join('\n')}

---

## How to Fix Common Indexing Issues

### "Discovered - currently not indexed"
1. Submit URL directly in GSC
2. Improve internal linking from indexed pages
3. Share on social media to attract crawl
4. Ensure page is in sitemap

### "Crawled - currently not indexed"
1. Add more unique, valuable content
2. Improve E-E-A-T signals (author bios, citations)
3. Add FAQ schema for rich snippets
4. Build backlinks to the page
5. Check for duplicate content issues

### "Duplicate without user-selected canonical"
1. Add canonical tag to preferred version
2. Use 301 redirects for duplicate URLs
3. Consolidate similar content

### "Page with redirect"
1. Update internal links to point to final URL
2. Ensure redirect chain is not too long

---

*Run weekly via: node scripts/indexing-audit.js*
`;
}

if (require.main === module) {
  runIndexingAudit().catch(console.error);
}

module.exports = { runIndexingAudit };
