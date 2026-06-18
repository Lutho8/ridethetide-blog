/**
 * Article Pipeline CLI
 *
 * Generates a markdown article template from a brief and runs auto-enrichment.
 *
 * Usage:
 *   node scripts/article-pipeline.cjs --title="SAHPRA Peptide Crackdown 2026" --keyword="sahpra peptide warning" --category="News" --word-count=4500
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  draftsDir: path.join(__dirname, '../content-os/drafts'),
  siteUrl: 'https://peptide-south-africa.com',
  brandName: 'Peptide South Africa',
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (const arg of args) {
    if (arg.startsWith('--title=')) options.title = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--keyword=')) options.primary_keyword = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--secondary-keywords=')) options.secondary_keywords = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--word-count=')) options.word_count = parseInt(arg.split('=')[1]) || 2000;
    else if (arg.startsWith('--category=')) options.category = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--article-type=')) options.article_type = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--target-audience=')) options.target_audience = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--brief=')) options.briefFile = arg.split('=')[1];
  }
  return options;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

function generateTemplate(options) {
  const title = options.title || 'Untitled Article';
  const primaryKeyword = options.primary_keyword || '';
  const secondaryKeywords = options.secondary_keywords || '';
  const wordCount = options.word_count || 2000;
  const category = options.category || 'Guide';
  const articleType = options.article_type || 'pillar';
  const targetAudience = options.target_audience || 'Researchers and clinicians in South Africa';
  const slug = slugify(title);
  const today = new Date().toISOString().split('T')[0];
  const secondaryKeywordsArray = secondaryKeywords.split(',').map(s => s.trim()).filter(Boolean);

  const template = `---
title: "${title}"
description: "A comprehensive guide on ${primaryKeyword} for South African researchers and clinicians."
pubDate: "${today}"
modDate: "${today}"
author: "${CONFIG.brandName} Clinical Team"
category: "${category}"
tags: "${primaryKeyword}, ${secondaryKeywordsArray.join(', ')}, south africa, peptide"
slug: "${slug}"
canonical: "${CONFIG.siteUrl}/blog/${slug}/"
schema: "MedicalWebPage, Article"
faq_schema: true
og_image: "/og/${slug}.jpg"
primary_keyword: "${primaryKeyword}"
secondary_keywords: "${secondaryKeywords}"
word_count: ${wordCount}
physician_reviewed: false
reviewer: ""
pillar: false
cta_target: "/assessment"
cta_text: "Take our 2-minute assessment and get your personalized peptide protocol."
---

> **Medical Disclaimer:** The information provided in this article is for educational and research purposes only. It does not constitute medical advice, diagnosis, or treatment. Always consult a qualified HPCSA-registered healthcare professional before starting any peptide protocol. Individual results may vary, and peptides are not approved by SAHPRA for all indications discussed.

# ${title}

## Introduction

[Hook: Why ${primaryKeyword} matters in South Africa right now.]

[Problem statement: What gap or challenge this article addresses.]

[Promise: What the reader will learn by the end.]

## Table of Contents

- [Introduction](#introduction)
- [What Is ${primaryKeyword}?](#what-is-${slugify(primaryKeyword)})
- [Mechanism of Action](#mechanism-of-action)
- [Research-Backed Benefits](#research-backed-benefits)
- [South African Context](#south-african-context)
- [Safety Considerations](#safety-considerations)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Sources](#sources)

## What Is ${primaryKeyword}?

[Define the topic clearly. Use South African English spelling (programme, centre, colour).]

## Mechanism of Action

[Explain how it works at a molecular/biological level.]

## Research-Backed Benefits

| Benefit | Evidence Level | Key Studies |
|---------|---------------|-------------|
| [Benefit 1] | [Strong/Moderate/Limited] | [Citation] |
| [Benefit 2] | [Strong/Moderate/Limited] | [Citation] |

## South African Context

### Regulatory Status
[SAHPRA status, scheduling, legal pathway.]

### Pricing
[ZAR pricing estimates, e.g., R2,400 per month.]

### Medical Aid
[Which medical aids cover or do not cover this.]

## Safety Considerations

### Contraindications
- [Contraindication 1]
- [Contraindication 2]

### Side Effects
- [Side effect 1]
- [Side effect 2]

### Required Bloodwork
- Complete blood count (CBC)
- Comprehensive metabolic panel
- Inflammatory markers (CRP, ESR)

## Frequently Asked Questions

**Q: Is ${primaryKeyword} legal in South Africa?**
[Answer with SAHPRA context.]

**Q: How long before I see results?**
[Answer with realistic timelines.]

**Q: Can I use this alongside other peptides?**
[Answer with stacking guidance.]

**Q: What bloodwork do I need?**
[Answer with specific tests.]

**Q: How much does it cost in South Africa?**
[Answer with ZAR pricing.]

## Sources

1. [PubMed reference]
2. [SAHPRA guidance document]
3. [Medical journal citation]

*Last Updated: ${today}*

---

## Ready to Start Your Peptide Journey?

Take our free 2-minute assessment to discover which peptide protocol is right for your goals. Our HPCSA-registered physicians will review your case and design a personalized plan.

**[Begin Your Assessment →](/assessment)**
`;

  return { template, slug, title };
}

async function runPipeline() {
  const options = parseArgs();

  if (!options.title) {
    console.error('Usage: node scripts/article-pipeline.cjs --title="Article Title" [--keyword="primary keyword"] [--category="Category"] [--word-count=2000] [--article-type=pillar] [--target-audience=...]');
    process.exit(1);
  }

  // Ensure drafts directory exists
  if (!fs.existsSync(CONFIG.draftsDir)) {
    fs.mkdirSync(CONFIG.draftsDir, { recursive: true });
  }

  console.log('Article Pipeline');
  console.log('  Title: ' + options.title);
  console.log('  Keyword: ' + (options.primary_keyword || '(none)'));
  console.log('  Category: ' + (options.category || 'Guide'));
  console.log('  Word count target: ' + (options.word_count || 2000));

  const { template, slug } = generateTemplate(options);
  const draftPath = path.join(CONFIG.draftsDir, slug + '.md');
  fs.writeFileSync(draftPath, template);
  console.log('  Draft saved: ' + draftPath);

  // Run auto-enrich
  const enrichScript = path.join(__dirname, 'auto-enrich.cjs');
  if (fs.existsSync(enrichScript)) {
    console.log('  Running auto-enrich...');
    try {
      execSync('node "' + enrichScript + '" "' + draftPath + '"', { stdio: 'inherit' });
    } catch (e) {
      console.error('  Auto-enrich failed: ' + e.message);
    }
  } else {
    console.log('  auto-enrich.cjs not found, skipping enrichment.');
  }

  console.log('\nPipeline complete!');
  console.log('  Draft: ' + draftPath);
  console.log('  Enriched: ' + draftPath.replace(/\.md$/, '-enriched.md'));
}

if (require.main === module) {
  runPipeline().catch(console.error);
}

module.exports = { runPipeline, generateTemplate, parseArgs };
