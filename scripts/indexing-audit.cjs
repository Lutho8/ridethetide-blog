/**
 * Indexing Audit
 *
 * Uses live GSC Search Analytics + URL Inspection API to check indexing status.
 * Flags pages excluded from index and provides remediation steps.
 *
 * Usage: node scripts/indexing-audit.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const {
  getDateDaysAgo,
  refreshAccessToken,
  querySearchAnalytics,
  inspectUrl,
  listSites,
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
    console.log('   2. Run: node scripts/gsc-auth.cjs to get refresh token');
    console.log('   3. GSC property must be verified for your site');

    generateTemplateReport();
    return;
  }

  try {
    console.log('\n🔐 Refreshing GSC access token...');
    const accessToken = await refreshAccessToken();
    console.log('   ✅ Token refreshed');

    // Verify the site is registered in GSC
    console.log('\n📋 Checking verified GSC sites...');
    const sitesData = await listSites(accessToken);

    if (sitesData.error) {
      throw new Error(`Failed to list sites: ${sitesData.error.message || sitesData.error}`);
    }

    const verifiedSites = (sitesData.siteEntry || []).map(s => s.siteUrl);
    console.log(`   Found ${verifiedSites.length} verified site(s):`);
    verifiedSites.forEach(s => console.log(`      - ${s}`));

    const isVerified = verifiedSites.some(s => {
      // Handle both exact URL and domain property matches
      if (s === CONFIG.gscSite) return true;
      if (s.startsWith('sc-domain:')) {
        const domain = s.replace('sc-domain:', '');
        return new URL(CONFIG.gscSite).hostname.endsWith(domain);
      }
      return false;
    });

    if (!isVerified) {
      console.log(`\n❌ ${CONFIG.gscSite} is NOT verified in GSC.`);
      console.log('   You need to add and verify this property:');
      console.log('   → https://search.google.com/search-console/welcome');
      console.log('\n   Alternatively, update GSC_SITE_URL in .env to one of your verified sites.');

      const report = {
        generatedAt: new Date().toISOString(),
        site: CONFIG.gscSite,
        status: 'site_not_verified',
        verifiedSites,
        note: `${CONFIG.gscSite} is not verified. Add it to GSC or update GSC_SITE_URL.`,
        summary: { totalUrls: 0, indexed: 0, notIndexed: 0, excluded: 0, pending: 0 },
        excludedPages: [],
        notIndexedPages: [],
        sitemapStatus: CONFIG.sitemaps.map(url => ({ url, status: 'pending', urlsSubmitted: 0, urlsIndexed: 0 })),
        recommendations: [
          `Verify ${CONFIG.gscSite} in Google Search Console`,
          'Submit sitemap after verification',
          'Request indexing for key pages',
        ],
      };

      saveReport(report);
      return;
    }

    console.log(`   ✅ ${CONFIG.gscSite} is verified`);

    // Fetch search analytics to find pages Google knows about
    const lookbackDays = 90;
    const startDate = getDateDaysAgo(lookbackDays + 2);
    const endDate = getDateDaysAgo(2);

    console.log(`\n📊 Fetching search analytics (${startDate} → ${endDate})...`);
    const searchData = await querySearchAnalytics(accessToken, CONFIG.gscSite, startDate, endDate);

    if (searchData.error) {
      throw new Error(`Search Analytics error: ${searchData.error.message || searchData.error}`);
    }

    const knownUrls = (searchData.rows || []).map(row => row.keys[0]);
    console.log(`   Found ${knownUrls.length} URL(s) with search data`);

    // Inspect each URL
    console.log('\n🔎 Running URL Inspection...');
    const inspectedPages = [];
    const errors = [];

    for (let i = 0; i < knownUrls.length; i++) {
      const url = knownUrls[i];
      process.stdout.write(`   [${i + 1}/${knownUrls.length}] ${url} ... `);

      try {
        const result = await inspectUrl(accessToken, CONFIG.gscSite, url);

        if (result.error) {
          errors.push({ url, error: result.error.message || result.error });
          console.log(`error: ${result.error.message || result.error}`);
          continue;
        }

        const idx = result.inspectionResult?.indexStatusResult || {};
        inspectedPages.push({
          url,
          coverageState: idx.coverageState || 'Unknown',
          lastCrawlTime: idx.lastCrawlTime || null,
          pageFetchState: idx.pageFetchState || 'Unknown',
          robotsTxtState: idx.robotsTxtState || 'Unknown',
          indexingState: idx.indexingState || 'Unknown',
          verdict: idx.verdict || 'Unknown',
        });

        console.log(idx.coverageState || 'Unknown');
      } catch (e) {
        errors.push({ url, error: e.message });
        console.log(`error: ${e.message}`);
      }
    }

    // Build report
    const indexed = inspectedPages.filter(p =>
      p.coverageState.includes('Indexed') || p.coverageState.includes('Submitted and indexed')
    );
    const notIndexed = inspectedPages.filter(p =>
      p.coverageState.includes('not indexed') || p.coverageState.includes('Duplicate')
    );
    const excluded = inspectedPages.filter(p =>
      p.coverageState.includes('Excluded') || p.coverageState.includes('Blocked')
    );
    const pending = inspectedPages.filter(p =>
      p.coverageState.includes('Discovered') || p.coverageState.includes('Crawled')
    );

    const report = {
      generatedAt: new Date().toISOString(),
      site: CONFIG.gscSite,
      status: 'live_gsc_data',
      dateRange: { start: startDate, end: endDate },
      summary: {
        totalUrls: inspectedPages.length,
        indexed: indexed.length,
        notIndexed: notIndexed.length,
        excluded: excluded.length,
        pending: pending.length,
        errors: errors.length,
      },
      indexedPages: indexed,
      notIndexedPages: notIndexed.map(p => ({
        url: p.url,
        status: p.coverageState,
        reason: getNotIndexedReason(p),
        action: getNotIndexedAction(p),
        priority: 'P1',
      })),
      excludedPages: excluded.map(p => ({
        url: p.url,
        status: p.coverageState,
        reason: getExcludedReason(p),
        action: getExcludedAction(p),
        priority: 'P2',
      })),
      pendingPages: pending.map(p => ({
        url: p.url,
        status: p.coverageState,
        action: 'Monitor — Google is processing this page',
        priority: 'P3',
      })),
      sitemapStatus: CONFIG.sitemaps.map(url => ({
        url,
        status: 'pending_manual_submission',
        lastSubmitted: null,
        urlsSubmitted: 0,
        urlsIndexed: indexed.length,
      })),
      recommendations: generateRecommendations(indexed.length, notIndexed.length, excluded.length, pending.length),
      rawInspectionData: inspectedPages,
      inspectionErrors: errors,
    };

    saveReport(report);

    console.log('\n✅ Live indexing audit complete!');
    console.log(`   Indexed: ${indexed.length}`);
    console.log(`   Not indexed: ${notIndexed.length}`);
    console.log(`   Excluded: ${excluded.length}`);
    console.log(`   Pending: ${pending.length}`);
    if (errors.length > 0) {
      console.log(`   Errors: ${errors.length}`);
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.log('\nFalling back to template report...');
    const report = generateFallbackReport();
    report.status = 'error: ' + error.message;
    saveReport(report);
  }
}

function getNotIndexedReason(page) {
  if (page.coverageState.includes('Duplicate')) return 'Duplicate content without user-selected canonical';
  if (page.coverageState.includes('Crawled')) return 'Page crawled but not indexed (thin or low-quality content)';
  if (page.coverageState.includes('Discovered')) return 'Discovered but not yet crawled';
  return 'Unknown indexing issue';
}

function getNotIndexedAction(page) {
  if (page.coverageState.includes('Duplicate')) return 'Add canonical tag or consolidate content';
  if (page.coverageState.includes('Crawled')) return 'Add unique valuable content, improve E-E-A-T, build backlinks';
  if (page.coverageState.includes('Discovered')) return 'Submit URL for indexing, improve internal links';
  return 'Investigate and fix indexing issues';
}

function getExcludedReason(page) {
  if (page.robotsTxtState === 'Blocked') return 'Blocked by robots.txt';
  if (page.pageFetchState === 'Not found') return 'Page returns 404';
  return 'Excluded by policy (noindex, redirect, etc.)';
}

function getExcludedAction(page) {
  if (page.robotsTxtState === 'Blocked') return 'Update robots.txt if page should be indexed';
  if (page.pageFetchState === 'Not found') return 'Fix broken links or restore page';
  return 'Review page meta tags and canonical settings';
}

function generateRecommendations(indexed, notIndexed, excluded, pending) {
  const recs = [];
  if (notIndexed > 0) {
    recs.push(`Fix ${notIndexed} "not indexed" page(s) with content improvements`);
    recs.push('Request indexing for not-indexed pages via GSC');
  }
  if (excluded > 0) {
    recs.push(`Review ${excluded} excluded page(s) — check noindex tags and robots.txt`);
  }
  if (pending > 0) {
    recs.push(`Monitor ${pending} pending page(s) — Google is still processing`);
  }
  if (indexed === 0 && notIndexed === 0 && excluded === 0) {
    recs.push('No pages found in GSC — site may be too new or sitemap not submitted');
    recs.push('Submit sitemap and request indexing for key pages');
  }
  recs.push('Submit sitemap to GSC if not already done');
  recs.push('Run indexing audit weekly for new content');
  return recs;
}

function generateFallbackReport() {
  return {
    generatedAt: new Date().toISOString(),
    site: CONFIG.gscSite,
    status: 'error',
    summary: { totalUrls: 0, indexed: 0, notIndexed: 0, excluded: 0, pending: 0 },
    excludedPages: [],
    notIndexedPages: [],
    sitemapStatus: CONFIG.sitemaps.map(url => ({ url, status: 'pending', urlsSubmitted: 0, urlsIndexed: 0 })),
    recommendations: [
      'Fix GSC connection and re-run audit',
      'Ensure site is verified in Google Search Console',
    ],
  };
}

function generateTemplateReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    site: CONFIG.gscSite,
    status: 'template',
    note: 'Connect GSC for live indexing data',

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
    ],

    notIndexedPages: [
      {
        url: '/blog/bpc-157-guide',
        status: 'Discovered - currently not indexed',
        reason: 'New page, Google has not crawled yet',
        action: 'Submit URL via GSC, request indexing',
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
    ],
  };

  saveReport(report);
}

function saveReport(report) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `indexing-audit-${timestamp}`;

  const jsonPath = path.join(CONFIG.outputDir, `${filename}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const mdPath = path.join(CONFIG.outputDir, `${filename}.md`);
  fs.writeFileSync(mdPath, generateMarkdownReport(report));

  console.log(`\n   JSON: ${jsonPath}`);
  console.log(`   Markdown: ${mdPath}`);
}

function generateMarkdownReport(report) {
  let md = `# Indexing Audit Report — ${report.site}\n\n`;
  md += `> Generated: ${report.generatedAt}\n`;
  md += `> Status: **${report.status}**\n`;
  if (report.dateRange) {
    md += `> Date range: ${report.dateRange.start} → ${report.dateRange.end}\n`;
  }
  if (report.note) {
    md += `> Note: ${report.note}\n`;
  }
  md += `\n---\n\n`;

  if (report.summary) {
    md += `## Summary\n\n`;
    md += `| Metric | Count |\n`;
    md += `|--------|-------|\n`;
    md += `| Total URLs inspected | ${report.summary.totalUrls} |\n`;
    md += `| Indexed | ${report.summary.indexed} ✅ |\n`;
    md += `| Not Indexed | ${report.summary.notIndexed} ⚠️ |\n`;
    md += `| Excluded | ${report.summary.excluded} 🚫 |\n`;
    md += `| Pending | ${report.summary.pending} ⏳ |\n`;
    if (report.summary.errors > 0) {
      md += `| Inspection Errors | ${report.summary.errors} ❌ |\n`;
    }
    md += `\n---\n\n`;
  }

  if (report.verifiedSites && report.verifiedSites.length > 0) {
    md += `## Verified GSC Sites\n\n`;
    report.verifiedSites.forEach(s => md += `- ${s}\n`);
    md += `\n---\n\n`;
  }

  if (report.notIndexedPages && report.notIndexedPages.length > 0) {
    md += `## ⚠️ Not Indexed Pages (Action Required)\n\n`;
    report.notIndexedPages.forEach(p => {
      md += `### ${p.url}\n`;
      md += `- **Status:** ${p.status}\n`;
      md += `- **Reason:** ${p.reason}\n`;
      md += `- **Action:** ${p.action}\n`;
      md += `- **Priority:** ${p.priority}\n\n`;
    });
    md += `\n`;
  }

  if (report.excludedPages && report.excludedPages.length > 0) {
    md += `## 🚫 Excluded Pages (Review)\n\n`;
    report.excludedPages.forEach(p => {
      md += `### ${p.url}\n`;
      md += `- **Status:** ${p.status}\n`;
      md += `- **Reason:** ${p.reason}\n`;
      md += `- **Action:** ${p.action}\n`;
      md += `- **Priority:** ${p.priority}\n\n`;
    });
    md += `\n`;
  }

  if (report.pendingPages && report.pendingPages.length > 0) {
    md += `## ⏳ Pending Pages (Monitor)\n\n`;
    report.pendingPages.forEach(p => {
      md += `### ${p.url}\n`;
      md += `- **Status:** ${p.status}\n`;
      md += `- **Action:** ${p.action}\n`;
      md += `- **Priority:** ${p.priority}\n\n`;
    });
    md += `\n`;
  }

  if (report.indexedPages && report.indexedPages.length > 0) {
    md += `## ✅ Indexed Pages\n\n`;
    report.indexedPages.forEach(p => {
      md += `- ${p.url} (${p.coverageState})\n`;
    });
    md += `\n`;
  }

  if (report.sitemapStatus && report.sitemapStatus.length > 0) {
    md += `## Sitemap Status\n\n`;
    md += `| Sitemap | Status | URLs Submitted | URLs Indexed |\n`;
    md += `|---------|--------|----------------|--------------|\n`;
    report.sitemapStatus.forEach(s => {
      md += `| ${s.url} | ${s.status} | ${s.urlsSubmitted} | ${s.urlsIndexed} |\n`;
    });
    md += `\n`;
  }

  if (report.recommendations && report.recommendations.length > 0) {
    md += `## Recommendations\n\n`;
    report.recommendations.forEach(r => md += `- ${r}\n`);
    md += `\n`;
  }

  if (report.inspectionErrors && report.inspectionErrors.length > 0) {
    md += `## Inspection Errors\n\n`;
    report.inspectionErrors.forEach(e => {
      md += `- ${e.url}: ${e.error}\n`;
    });
    md += `\n`;
  }

  md += `---\n\n*Run weekly via: node scripts/indexing-audit.cjs*\n`;
  return md;
}

runIndexingAudit().catch(console.error);
