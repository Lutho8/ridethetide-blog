/**
 * Seed Topics Generator
 * 
 * Generates article ideas from customer language + gap analysis.
 * Creates content briefs for the editorial pipeline.
 * 
 * Usage: node scripts/seed-topics.js [--count 10]
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  seedsDir: path.join(__dirname, '../content-os/seeds'),
  briefsDir: path.join(__dirname, '../content-os/drafts/briefs'),
  defaultCount: 10,
};

[CONFIG.seedsDir, CONFIG.briefsDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Seed topic templates based on customer language patterns
const TOPIC_TEMPLATES = [
  {
    pattern: 'how do I {action} {compound}',
    examples: [
      { action: 'reconstitute', compound: 'BPC-157' },
      { action: 'dose', compound: 'TB-500' },
      { action: 'stack', compound: 'CJC-1295' },
      { action: 'store', compound: 'Semaglutide' },
      { action: 'mix', compound: 'GHK-Cu' },
    ],
    category: 'Research Methods',
    format: 'Tutorial',
  },
  {
    pattern: 'where to buy {compound} in {location}',
    examples: [
      { compound: 'peptides', location: 'Cape Town' },
      { compound: 'BPC-157', location: 'Johannesburg' },
      { compound: 'Semaglutide', location: 'Durban' },
      { compound: 'research peptides', location: 'South Africa' },
    ],
    category: 'South African Context',
    format: 'Guide',
  },
  {
    pattern: 'is {compound} legal in South Africa',
    examples: [
      { compound: 'BPC-157' },
      { compound: 'TB-500' },
      { compound: 'CJC-1295' },
      { compound: 'Semaglutide' },
      { compound: 'Tirzepatide' },
    ],
    category: 'South African Context',
    format: 'Explainer',
  },
  {
    pattern: '{compound} vs {compound2} comparison',
    examples: [
      { compound: 'Semaglutide', compound2: 'Tirzepatide' },
      { compound: 'BPC-157', compound2: 'TB-500' },
      { compound: 'CJC-1295', compound2: 'Sermorelin' },
      { compound: 'Ipamorelin', compound2: 'GHRP-6' },
    ],
    category: 'Peptide Deep Dives',
    format: 'Comparison',
  },
  {
    pattern: '{compound} side effects and safety',
    examples: [
      { compound: 'BPC-157' },
      { compound: 'TB-500' },
      { compound: 'CJC-1295' },
      { compound: 'Ipamorelin' },
      { compound: 'Semaglutide' },
    ],
    category: 'Safety & Science',
    format: 'Safety Guide',
  },
  {
    pattern: '{duration} {goal} protocol with {compound}',
    examples: [
      { duration: '6-week', goal: 'fat loss', compound: 'Semaglutide' },
      { duration: '8-week', goal: 'healing', compound: 'BPC-157' },
      { duration: '12-week', goal: 'muscle gain', compound: 'CJC-1295 + Ipamorelin' },
      { duration: '4-week', goal: 'recovery', compound: 'TB-500' },
    ],
    category: 'Protocol Guides',
    format: 'Protocol',
  },
  {
    pattern: 'bloodwork for {compound} protocol',
    examples: [
      { compound: 'growth hormone secretagogues' },
      { compound: 'GLP-1 agonists' },
      { compound: 'healing peptides' },
      { compound: 'longevity stacks' },
    ],
    category: 'Safety & Science',
    format: 'Guide',
  },
  {
    pattern: 'how long before {compound} works',
    examples: [
      { compound: 'BPC-157' },
      { compound: 'TB-500' },
      { compound: 'Semaglutide' },
      { compound: 'CJC-1295' },
    ],
    category: 'Peptide Deep Dives',
    format: 'FAQ Article',
  },
];

function generateTopics(count = CONFIG.defaultCount) {
  console.log('🌱 Generating Content Topic Seeds\n');
  
  const topics = [];
  
  TOPIC_TEMPLATES.forEach(template => {
    template.examples.forEach(example => {
      const title = template.pattern
        .replace('{action}', example.action || '')
        .replace('{compound}', example.compound)
        .replace('{compound2}', example.compound2 || '')
        .replace('{location}', example.location || '')
        .replace('{duration}', example.duration || '')
        .replace('{goal}', example.goal || '')
        .replace(/\s+/g, ' ')
        .replace(/\s+$/, '')
        .replace(/^\s+/, '');
      
      // Capitalize
      const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);
      
      topics.push({
        title: capitalizedTitle,
        category: template.category,
        format: template.format,
        slug: slugify(capitalizedTitle),
        priority: calculatePriority(template.category, example),
        estimatedWordCount: estimateWordCount(template.format),
        keywords: extractKeywords(capitalizedTitle, example),
        contentBrief: generateBrief(capitalizedTitle, template, example),
      });
    });
  });
  
  // Sort by priority and take top N
  topics.sort((a, b) => b.priority - a.priority);
  const selected = topics.slice(0, count);
  
  // Save topics list
  const timestamp = new Date().toISOString().split('T')[0];
  const topicsPath = path.join(CONFIG.seedsDir, `seed-topics-${timestamp}.json`);
  fs.writeFileSync(topicsPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: selected.length,
    topics: selected,
  }, null, 2));
  
  // Generate content briefs
  selected.forEach(topic => {
    const briefPath = path.join(CONFIG.briefsDir, `${topic.slug}-brief.md`);
    fs.writeFileSync(briefPath, topic.contentBrief);
  });
  
  console.log(`✅ Generated ${selected.length} topic seeds`);
  console.log(`   Topics: ${topicsPath}`);
  console.log(`   Briefs: ${CONFIG.briefsDir}`);
  console.log('\n📋 Top Priority Topics:');
  selected.slice(0, 5).forEach((t, i) => {
    console.log(`   ${i + 1}. [P${t.priority}] ${t.title} (${t.format})`);
  });
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

function calculatePriority(category, example) {
  let priority = 2; // Base
  
  // Boost for high-value compounds
  const highValue = ['Semaglutide', 'Tirzepatide', 'BPC-157', 'CJC-1295'];
  if (highValue.includes(example.compound) || highValue.includes(example.compound2)) {
    priority += 1;
  }
  
  // Boost for SA context
  if (example.location || category === 'South African Context') {
    priority += 1;
  }
  
  // Boost for safety content
  if (category === 'Safety & Science') {
    priority += 0.5;
  }
  
  return Math.min(priority, 3);
}

function estimateWordCount(format) {
  const counts = {
    'Tutorial': 1500,
    'Guide': 2000,
    'Explainer': 1800,
    'Comparison': 2500,
    'Safety Guide': 2200,
    'Protocol': 3000,
    'FAQ Article': 1500,
  };
  return counts[format] || 2000;
}

function extractKeywords(title, example) {
  const keywords = [example.compound];
  if (example.compound2) keywords.push(example.compound2);
  if (example.location) keywords.push(example.location, 'South Africa');
  if (example.goal) keywords.push(example.goal);
  
  // Add common modifiers
  keywords.push('peptide', 'research', 'dosing', 'protocol');
  
  return [...new Set(keywords)];
}

function generateBrief(title, template, example) {
  return `# Content Brief: ${title}

## Overview

| Field | Value |
|-------|-------|
| **Title** | ${title} |
| **Category** | ${template.category} |
| **Format** | ${template.format} |
| **Target Word Count** | ${estimateWordCount(template.format)} |
| **Priority** | P${calculatePriority(template.category, example)} |

## Target Keywords

${extractKeywords(title, example).map(k => `- ${k}`).join('\n')}

## Search Intent

${inferIntent(template.format)}

## Content Outline

${generateOutline(template, example)}

## Required Elements

- [ ] Medical disclaimer in first 100 words
- [ ] At least one primary research citation
- [ ] South African regulatory context (SAHPRA)
- [ ] Dosing information (compound, amount, frequency, duration, route)
- [ ] Contraindications and interaction warnings
- [ ] "Talk to your doctor" callout
- [ ] Related article internal links
- [ ] CTA to protocol quiz or tracker

## Voice Checklist

- [ ] Scientific but accessible
- [ ] Direct and honest (no hype)
- [ ] South African context included
- [ ] Safety-obsessed (risks first)
- [ ] No prohibited phrases used

## References to Include

- [ ] Primary research (PubMed)
- [ ] SAHPRA guidance (if applicable)
- [ ] WADA status (if applicable)
- [ ] South African supplier notes (if applicable)

## Related Articles to Link

- [ ] BPC-157 Complete Guide
- [ ] Peptide Reconstitution Guide
- [ ] South African Regulations
- [ ] Bloodwork Guide

---

*Generated by Content OS Seed Pipeline*
*Date: ${new Date().toISOString()}*
`;
}

function inferIntent(format) {
  const intents = {
    'Tutorial': 'Informational — User wants step-by-step instructions',
    'Guide': 'Informational — User wants comprehensive overview',
    'Explainer': 'Informational — User wants to understand a concept',
    'Comparison': 'Informational + Transactional — User comparing options',
    'Safety Guide': 'Informational — User concerned about risks',
    'Protocol': 'Informational + Transactional — User wants actionable plan',
    'FAQ Article': 'Informational — User has specific question',
  };
  return intents[format] || 'Informational';
}

function generateOutline(template, example) {
  const outlines = {
    'Tutorial': `
1. Introduction (why this matters)
2. What you need (supplies list)
3. Step-by-step instructions
4. Common mistakes
5. Troubleshooting
6. South African sourcing notes
7. Safety reminders
8. FAQ
`,
    'Guide': `
1. Introduction
2. What is [topic]
3. How it works (mechanism)
4. Benefits and evidence
5. Risks and side effects
6. South African context
7. Practical application
8. Conclusion + CTA
`,
    'Comparison': `
1. Introduction (why compare)
2. Compound A overview
3. Compound B overview
4. Head-to-head comparison table
5. Use case recommendations
6. Stacking potential
7. Safety comparison
8. South African availability
9. Conclusion + CTA
`,
    'Protocol': `
1. Introduction (goal and duration)
2. Compounds used
3. Dosing schedule (table)
4. Week-by-week breakdown
5. Expected outcomes
6. Side effect management
7. Bloodwork schedule
8. Post-protocol maintenance
9. South African considerations
10. Conclusion + CTA
`,
  };
  
  return outlines[template.format] || outlines['Guide'];
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const count = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1]) || CONFIG.defaultCount;
  generateTopics(count);
}

module.exports = { generateTopics };
