const fs = require('fs');
const path = require('path');

// After Astro builds, copy sitemap-index.xml to sitemap.xml as a fallback
// GSC and some crawlers look for /sitemap.xml by default

const distDir = path.join(__dirname, '..', 'dist');
const sitemapIndex = path.join(distDir, 'sitemap-index.xml');
const sitemapFallback = path.join(distDir, 'sitemap.xml');

if (fs.existsSync(sitemapIndex)) {
  const content = fs.readFileSync(sitemapIndex, 'utf-8');
  fs.writeFileSync(sitemapFallback, content);
  console.log('✅ Copied sitemap-index.xml → sitemap.xml');
} else {
  console.log('⚠️ sitemap-index.xml not found, skipping copy');
}

// Also verify sitemap URLs use the correct domain
const sitemap0 = path.join(distDir, 'sitemap-0.xml');
if (fs.existsSync(sitemap0)) {
  let s0 = fs.readFileSync(sitemap0, 'utf-8');
  // Ensure www. prefix is used consistently
  if (s0.includes('https://peptide-south-africa.com') && !s0.includes('https://www.peptide-south-africa.com')) {
    s0 = s0.replace(/https:\/\/peptide-south-africa\.com/g, 'https://www.peptide-south-africa.com');
    fs.writeFileSync(sitemap0, s0);
    console.log('✅ Fixed sitemap-0.xml to use www.');
  }
  
  // Also update the index sitemap if needed
  let idx = fs.readFileSync(sitemapIndex, 'utf-8');
  if (idx.includes('https://peptide-south-africa.com') && !idx.includes('https://www.peptide-south-africa.com')) {
    idx = idx.replace(/https:\/\/peptide-south-africa\.com/g, 'https://www.peptide-south-africa.com');
    fs.writeFileSync(sitemapIndex, idx);
    fs.writeFileSync(sitemapFallback, idx);
    console.log('✅ Fixed sitemap-index.xml to use www.');
  }
  
  console.log('✅ Sitemap post-build complete');
}
