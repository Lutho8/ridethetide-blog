/**
 * Auto-Enrichment Engine
 */
const fs = require('fs');
const path = require('path');

const CONFIG = {
  maxLinksPerParagraph: 3,
  siteUrl: 'https://peptide-south-africa.com',
  brandName: 'Peptide South Africa',
};

const INTERNAL_LINKS = [
  { pattern: /\bweight\s+loss\s+program(?:me)?\b/gi, url: '/programs/weight-loss' },
  { pattern: /\blongevity\s+program(?:me)?\b/gi, url: '/programs/longevity' },
  { pattern: /\bmetabolic\s+reset\s+program(?:me)?\b/gi, url: '/programs/metabolic-reset' },
  { pattern: /\bmuscle\s+recovery\s+program(?:me)?\b/gi, url: '/programs/muscle-recovery' },
  { pattern: /\bsports\s+performance\s+program(?:me)?\b/gi, url: '/programs/sports-performance' },
  { pattern: /\bsemaglutide\b/gi, url: '/peptides/semaglutide' },
  { pattern: /\btirzepatide\b/gi, url: '/peptides/tirzepatide' },
  { pattern: /\bBPC-157\b/g, url: '/peptides/bpc-157' },
  { pattern: /\bTB-500\b/g, url: '/peptides/tb-500' },
  { pattern: /\bCJC-1295\b/g, url: '/peptides/cjc-1295-ipamorelin' },
  { pattern: /\bIpamorelin\b/g, url: '/peptides/cjc-1295-ipamorelin' },
  { pattern: /\bFAQ\b/g, url: '/faq' },
  { pattern: /\bassessment\b/gi, url: '/assessment' },
  { pattern: /\bpricing\b/gi, url: '/pricing' },
];

const DISCLAIMER_BLOCK = '> **Medical Disclaimer:** The information provided in this article is for educational and research purposes only. It does not constitute medical advice, diagnosis, or treatment. Always consult a qualified HPCSA-registered healthcare professional before starting any peptide protocol. Individual results may vary, and peptides are not approved by SAHPRA for all indications discussed.\n';

const CTA_BLOCK = '---\n\n## Ready to Start Your Peptide Journey?\n\nTake our free 2-minute assessment to discover which peptide protocol is right for your goals. Our HPCSA-registered physicians will review your case and design a personalized plan.\n\n**[Begin Your Assessment →](/assessment)**\n';

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: '', body: content, data: {} };
  const raw = match[1];
  const data = {};
  raw.split(/\r?\n/).forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      data[key] = val;
    }
  });
  return { frontmatter: match[0], body: content.slice(match[0].length), data };
}

function serializeFrontmatter(data) {
  const lines = Object.entries(data).map(([k, v]) => {
    if (v && (v.includes(' ') || v.includes(':') || v.includes(','))) {
      return `${k}: "${v}"`;
    }
    return `${k}: ${v}`;
  });
  return `---\n${lines.join('\n')}\n---\n`;
}

function insertInternalLinks(body) {
  const lines = body.split('\n');
  let newLines = [];
  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('```') || line.startsWith('>') || line.startsWith('![') || line.startsWith('---') || line.startsWith('|') || line.trim().length === 0) {
      newLines.push(line); continue;
    }
    let modified = line;
    let linksAdded = 0;
    const existingLinks = (line.match(/\[.*?\]\(.*?\)/g) || []).length;
    const maxNewLinks = Math.max(0, CONFIG.maxLinksPerParagraph - existingLinks);
    if (maxNewLinks === 0) { newLines.push(line); continue; }
    for (const rule of INTERNAL_LINKS) {
      if (linksAdded >= maxNewLinks) break;
      rule.pattern.lastIndex = 0;
      let m;
      while ((m = rule.pattern.exec(modified)) !== null && linksAdded < maxNewLinks) {
        const start = m.index;
        if (isInsideMarkdownLink(modified, start)) continue;
        if (modified.includes(`](${rule.url})`)) continue;
        const linkedText = `[${m[0]}](${rule.url})`;
        modified = modified.slice(0, start) + linkedText + modified.slice(start + m[0].length);
        linksAdded++;
        rule.pattern.lastIndex = start + linkedText.length;
      }
    }
    newLines.push(modified);
  }
  return newLines.join('\n');
}

function isInsideMarkdownLink(text, position) {
  const before = text.slice(0, position);
  const after = text.slice(position);
  const lastOpenBracket = before.lastIndexOf('[');
  const lastCloseBracket = before.lastIndexOf(']');
  const nextOpenParen = after.indexOf('(');
  const nextCloseParen = after.indexOf(')');
  return lastOpenBracket > lastCloseBracket && nextOpenParen !== -1 && nextCloseParen !== -1 && nextOpenParen < nextCloseParen;
}

function generateArticleSchema(data, canonicalUrl) {
  const now = new Date().toISOString();
  const esc = (s) => (s || '').replace(/"/g, '\\"');
  return `<!-- JSON-LD Schema: Article + MedicalWebPage -->\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@graph": [\n    {\n      "@type": "Article",\n      "headline": "${esc(data.title)}",\n      "description": "${esc(data.description)}",\n      "author": {\n        "@type": "Organization",\n        "name": "${esc(data.author || CONFIG.brandName + ' Clinical Team')}"\n      },\n      "publisher": {\n        "@type": "Organization",\n        "name": "${CONFIG.brandName}",\n        "logo": {\n          "@type": "ImageObject",\n          "url": "${CONFIG.siteUrl}/logo.png"\n        }\n      },\n      "datePublished": "${data.pubDate || now.split('T')[0]}",\n      "dateModified": "${data.modDate || now.split('T')[0]}",\n      "mainEntityOfPage": {\n        "@type": "WebPage",\n        "@id": "${canonicalUrl}"\n      }\n    },\n    {\n      "@type": "MedicalWebPage",\n      "about": {\n        "@type": "MedicalWebPage",\n        "name": "${esc(data.title)}"\n      },\n      "audience": {\n        "@type": "MedicalAudience",\n        "audienceType": "Patient"\n      },\n      "lastReviewed": "${data.modDate || now.split('T')[0]}",\n      "medicalAudience": {\n        "@type": "MedicalAudience",\n        "audienceType": "Patient"\n      }\n    }\n  ]\n}\n</script>\n<!-- /JSON-LD Schema -->`;
}

function extractFAQs(body) {
  const faqs = [];
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const qMatch = line.match(/^\*\*Q:\s*(.+?)\*\*$/i) || line.match(/^\*\*(.+\?)\*\*$/);
    if (qMatch) {
      const question = qMatch[1].trim();
      let answer = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('**') && !lines[i].trim().startsWith('#')) {
        answer += lines[i] + '\n';
        i++;
      }
      faqs.push({ question, answer: answer.trim() });
      continue;
    }
    if (line.startsWith('- question:')) {
      const q = line.replace('- question:', '').trim().replace(/^["']|["']$/g, '');
      let a = '';
      i++;
      if (i < lines.length && lines[i].trim().startsWith('answer:')) {
        a = lines[i].trim().replace('answer:', '').trim().replace(/^["']|["']$/g, '');
        i++;
      }
      faqs.push({ question: q, answer: a });
      continue;
    }
    i++;
  }
  return faqs;
}

function generateFAQSchema(faqs) {
  const esc = (s) => s.replace(/"/g, '\\"').replace(/\n/g, ' ');
  return `<!-- JSON-LD Schema: FAQPage -->\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [\n${faqs.map(f => `    {\n      "@type": "Question",\n      "name": "${esc(f.question)}",\n      "acceptedAnswer": {\n        "@type": "Answer",\n        "text": "${esc(f.answer)}"\n      }\n    }`).join(',\n')}\n  ]\n}\n</script>\n<!-- /JSON-LD Schema: FAQPage -->`;
}

function validateSEO(data, body) {
  const warnings = [];
  const primaryKeyword = data.primary_keyword || '';
  const h1Match = body.match(/^#\s+(.+)$/m);
  const h1 = h1Match ? h1Match[1] : '';
  const first100Words = body.replace(/\n/g, ' ').split(/\s+/).slice(0, 100).join(' ');
  const internalLinkCount = (body.match(/\[.*?\]\(\/[^\)]+\)/g) || []).length;
  const hasDisclaimer = body.toLowerCase().includes('disclaimer') || body.toLowerCase().includes('not medical advice');
  const hasFAQSchema = body.includes('FAQPage');
  const hasCTA = body.toLowerCase().includes('assessment') || body.toLowerCase().includes('/assessment');

  if (primaryKeyword && !h1.toLowerCase().includes(primaryKeyword.toLowerCase())) {
    warnings.push('Primary keyword not found in H1');
  }
  if (primaryKeyword && !first100Words.toLowerCase().includes(primaryKeyword.toLowerCase())) {
    warnings.push('Primary keyword not found in first 100 words');
  }
  if (internalLinkCount < 5) {
    warnings.push(`Only ${internalLinkCount} internal links found (minimum 5 recommended)`);
  }
  if (!hasFAQSchema) {
    warnings.push('FAQ schema not present (add 5+ FAQ questions for rich snippets)');
  }
  if (!hasDisclaimer) {
    warnings.push('Medical disclaimer not present');
  }
  if (!hasCTA) {
    warnings.push('CTA block not present');
  }
  return warnings;
}

async function enrichArticle(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('File not found: ' + filePath);
    process.exit(1);
  }
  console.log('Enriching: ' + filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  const { frontmatter, body, data } = parseFrontmatter(content);
  let modifiedBody = body;

  console.log('   [1/7] Inserting internal links...');
  modifiedBody = insertInternalLinks(modifiedBody);

  console.log('   [2/7] Checking medical disclaimer...');
  if (!modifiedBody.toLowerCase().includes('disclaimer') && !modifiedBody.toLowerCase().includes('not medical advice')) {
    modifiedBody = '\n' + DISCLAIMER_BLOCK + '\n' + modifiedBody;
    console.log('   Added medical disclaimer');
  } else {
    console.log('   Disclaimer already present');
  }

  console.log('   [3/7] Checking CTA block...');
  if (!modifiedBody.includes('/assessment')) {
    modifiedBody = modifiedBody.trimEnd() + '\n\n' + CTA_BLOCK + '\n';
    console.log('   Added CTA block');
  } else {
    console.log('   CTA already present');
  }

  console.log('   [4/7] Checking Last Updated timestamp...');
  const today = new Date().toISOString().split('T')[0];
  if (!modifiedBody.includes('Last Updated') && !modifiedBody.includes('last updated')) {
    modifiedBody = modifiedBody.trimEnd() + '\n\n*Last Updated: ' + today + '*\n';
    console.log('   Added Last Updated timestamp');
  } else {
    modifiedBody = modifiedBody.replace(/\*Last [Uu]pdated:?\s*[^\*]*\*/g, '*Last Updated: ' + today + '*');
    console.log('   Updated Last Updated timestamp');
  }

  console.log('   [5/7] Checking FAQ schema...');
  const faqs = extractFAQs(modifiedBody);
  if (faqs.length >= 5) {
    if (!modifiedBody.includes('FAQPage')) {
      modifiedBody = modifiedBody.trimEnd() + '\n\n' + generateFAQSchema(faqs) + '\n';
      console.log('   Added FAQPage schema (' + faqs.length + ' questions)');
    } else {
      console.log('   FAQ schema already present');
    }
  } else {
    console.log('   Only ' + faqs.length + ' FAQs found (need 5+ for schema)');
  }

  console.log('   [6/7] Adding Article + MedicalWebPage schema...');
  const slug = path.basename(filePath, '.md');
  const canonicalUrl = CONFIG.siteUrl + '/blog/' + slug + '/';
  if (!modifiedBody.includes('MedicalWebPage')) {
    modifiedBody = generateArticleSchema(data, canonicalUrl) + '\n\n' + modifiedBody;
    console.log('   Added Article + MedicalWebPage schema');
  } else {
    console.log('   Article schema already present');
  }

  console.log('   [7/7] Validating SEO...');
  const warnings = validateSEO(data, modifiedBody);

  const finalContent = serializeFrontmatter(data) + modifiedBody;
  const outputPath = filePath.replace(/\.md$/, '-enriched.md');
  fs.writeFileSync(outputPath, finalContent);
  console.log('\nEnriched article saved to: ' + outputPath);

  if (warnings.length > 0) {
    console.log('\nSEO Warnings:');
    warnings.forEach(w => console.log('   ' + w));
  } else {
    console.log('\nAll SEO checks passed!');
  }
}

if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/auto-enrich.cjs path/to/article.md');
    process.exit(1);
  }
  enrichArticle(path.resolve(filePath)).catch(console.error);
}

module.exports = { enrichArticle, parseFrontmatter, insertInternalLinks, validateSEO };
