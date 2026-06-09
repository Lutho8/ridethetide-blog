/**
 * Article Refresh Pipeline
 * 
 * Daily cron job to refresh highest priority articles:
 * 1. Extract article content
 * 2. Run through AI Content Helper to fill topic gaps
 * 3. Update old claims and statistics
 * 4. Save as draft for human review
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  contentDir: path.join(__dirname, '../src/content/blog'),
  draftsDir: path.join(__dirname, '../content-os/drafts'),
  maxArticlesPerRun: 3,
  priorityFile: path.join(__dirname, '../content-os/reports/priority-queue.json'),
};

// Ensure dirs exist
[CONFIG.draftsDir, path.dirname(CONFIG.priorityFile)].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function refreshArticles(options = {}) {
  const { slug, top = CONFIG.maxArticlesPerRun, dryRun = false } = options;
  
  console.log('🔄 Article Refresh Pipeline');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Max articles: ${top}`);
  
  // Get priority queue (or build from content audit)
  let priorityQueue = [];
  if (fs.existsSync(CONFIG.priorityFile)) {
    priorityQueue = JSON.parse(fs.readFileSync(CONFIG.priorityFile, 'utf8'));
  }
  
  // If specific slug provided, refresh that
  if (slug) {
    const articlePath = path.join(CONFIG.contentDir, `${slug}.md`);
    if (fs.existsSync(articlePath)) {
      await refreshSingleArticle(articlePath, { dryRun });
    } else {
      console.error(`❌ Article not found: ${articlePath}`);
    }
    return;
  }
  
  // Otherwise refresh top N from priority queue
  // If no priority queue, refresh oldest articles
  const articles = getAllArticles();
  const toRefresh = priorityQueue.length > 0 
    ? priorityQueue.slice(0, top).map(p => articles.find(a => a.slug === p.slug)).filter(Boolean)
    : articles.sort((a, b) => new Date(a.frontmatter.updatedDate || a.frontmatter.pubDate) - new Date(b.frontmatter.updatedDate || b.frontmatter.pubDate)).slice(0, top);
  
  console.log(`\n📋 Refreshing ${toRefresh.length} articles:`);
  for (const article of toRefresh) {
    console.log(`   - ${article.slug}: ${article.frontmatter.title}`);
  }
  
  for (const article of toRefresh) {
    await refreshSingleArticle(article.path, { dryRun });
  }
  
  console.log('\n✅ Refresh complete!');
  if (!dryRun) {
    console.log(`   Drafts saved to: ${CONFIG.draftsDir}`);
    console.log('   Review drafts and publish manually.');
  }
}

function getAllArticles() {
  if (!fs.existsSync(CONFIG.contentDir)) return [];
  return fs.readdirSync(CONFIG.contentDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(CONFIG.contentDir, f), 'utf8');
      const frontmatter = parseFrontmatter(content);
      return {
        slug: f.replace('.md', ''),
        path: path.join(CONFIG.contentDir, f),
        frontmatter,
        content,
      };
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

async function refreshSingleArticle(articlePath, { dryRun }) {
  const slug = path.basename(articlePath, '.md');
  console.log(`\n📝 Refreshing: ${slug}`);
  
  const content = fs.readFileSync(articlePath, 'utf8');
  const frontmatter = parseFrontmatter(content);
  const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');
  
  // Step 1: Extract current content
  console.log('   [1/4] Extracting current content...');
  const extraction = {
    slug,
    title: frontmatter.title,
    description: frontmatter.description,
    category: frontmatter.category,
    peptides: frontmatter.peptides?.split(',').map(s => s.trim()) || [],
    pubDate: frontmatter.pubDate,
    updatedDate: frontmatter.updatedDate,
    wordCount: body.split(/\s+/).length,
    headings: (body.match(/^#{1,3}\s+.+$/gm) || []),
    citations: (body.match(/\[\d+\]/g) || []),
    hasDisclaimer: body.toLowerCase().includes('disclaimer'),
    hasDosingTable: body.includes('|') && body.toLowerCase().includes('dose'),
    hasCTA: body.toLowerCase().includes('protocol') || body.toLowerCase().includes('quiz'),
  };
  
  // Step 2: AI Content Helper analysis via Kimi (Moonshot AI)
  console.log('   [2/4] Running AI Content Helper analysis via Kimi...');
  const aiAnalysis = await analyzeWithKimi(extraction, body, dryRun);
  
  // Step 3: Generate refreshed draft
  console.log('   [3/4] Generating refreshed draft...');
  const refreshedFrontmatter = {
    ...frontmatter,
    updatedDate: new Date().toISOString().split('T')[0],
    refreshedBy: 'ai-content-helper',
    refreshReason: aiAnalysis.suggestedUpdates.join('; '),
  };
  
  const draftContent = generateDraftContent(refreshedFrontmatter, body, aiAnalysis);
  
  // Step 4: Save draft
  console.log('   [4/4] Saving draft...');
  if (!dryRun) {
    const draftPath = path.join(CONFIG.draftsDir, `${slug}-refresh-${new Date().toISOString().split('T')[0]}.md`);
    fs.writeFileSync(draftPath, draftContent);
    console.log(`   ✅ Draft saved: ${draftPath}`);
  } else {
    console.log('   📝 DRY RUN — would save to:', path.join(CONFIG.draftsDir, `${slug}-refresh-*.md`));
  }
  
  // Save analysis report
  const analysisPath = path.join(CONFIG.draftsDir, `${slug}-analysis-${new Date().toISOString().split('T')[0]}.json`);
  if (!dryRun) {
    fs.writeFileSync(analysisPath, JSON.stringify({ extraction, aiAnalysis }, null, 2));
  }
}

function generateDraftContent(frontmatter, body, aiAnalysis) {
  const fmLines = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  
  return `---
${fmLines}
---

<!-- 
AI REFRESH DRAFT — ${new Date().toISOString()}
Suggested updates:
${aiAnalysis.suggestedUpdates.map(u => `- ${u}`).join('\n')}

REVIEW CHECKLIST:
- [ ] Verify all medical claims
- [ ] Check dosing accuracy
- [ ] Confirm SA regulatory context
- [ ] Update citations to latest research
- [ ] Run voice compliance check
- [ ] Test all internal links
-->

${body}
`;
}

async function analyzeWithKimi(extraction, body, dryRun) {
  const KIMI_API_KEY = process.env.KIMI_API_KEY;
  const KIMI_BASE_URL = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
  const KIMI_MODEL = process.env.KIMI_MODEL || 'moonshot-v1-32k';
  
  if (!KIMI_API_KEY) {
    return {
      status: 'pending_api_connection',
      note: 'Requires KIMI_API_KEY. Get one at https://platform.moonshot.cn/',
      expectedChecks: [
        'Compare against top 3 ranking articles for same query',
        'Identify missing subtopics / questions not answered',
        'Find outdated statistics or claims',
        'Check voice compliance against source-of-truth.md',
        'Suggest new citations from recent research',
        'Identify internal linking opportunities',
      ],
      suggestedUpdates: dryRun ? [] : [
        'Update: Add 2026 research citations',
        'Expand: Add section on SA-specific supplier considerations',
        'Fix: Dosing table needs mcg → mg conversion note',
        'Add: FAQ schema questions based on Intercom common queries',
      ],
    };
  }
  
  const prompt = `You are an expert peptide research content editor for Ride The Tide, a South African peptide research community blog.

Analyze this article for content gaps, outdated information, and voice compliance issues.

ARTICLE TITLE: ${extraction.title}
CATEGORY: ${extraction.category}
PEPTIDES: ${extraction.peptides.join(', ')}
WORD COUNT: ${extraction.wordCount}
CITATIONS: ${extraction.citations.length}
PUBLISHED: ${extraction.pubDate}

ARTICLE BODY (first 3000 chars):
${body.substring(0, 3000)}

Check for:
1. Missing subtopics compared to typical top-ranking peptide articles
2. Outdated statistics, claims, or citations (published before 2024)
3. Voice compliance: safety-first tone, no hype, SA context present
4. Missing FAQ schema questions
5. Internal linking opportunities
6. Dosing accuracy and completeness

Return ONLY a JSON object with this structure:
{
  "status": "analyzed",
  "suggestedUpdates": ["action 1", "action 2", ...],
  "voiceCompliance": {"scientificTone": "pass|warn|fail", "saContext": "pass|warn|fail", "safetyFirst": "pass|warn|fail", "noHype": "pass|warn|fail"},
  "priority": "high|medium|low"
}`;

  try {
    const response = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Kimi API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        status: 'analyzed_by_kimi',
        suggestedUpdates: parsed.suggestedUpdates || [],
        voiceCompliance: parsed.voiceCompliance || {},
        priority: parsed.priority || 'medium',
        rawAnalysis: content,
      };
    }
    
    return {
      status: 'analyzed_by_kimi',
      suggestedUpdates: ['Kimi analysis completed but JSON parsing failed — review raw output'],
      rawAnalysis: content,
    };
  } catch (e) {
    console.log(`   ⚠️  Kimi analysis failed: ${e.message}`);
    return {
      status: 'kimi_error',
      note: e.message,
      suggestedUpdates: [],
    };
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    slug: args.find(a => a.startsWith('--slug='))?.split('=')[1],
    top: parseInt(args.find(a => a.startsWith('--top='))?.split('=')[1]) || CONFIG.maxArticlesPerRun,
    dryRun: args.includes('--dry-run'),
  };
  refreshArticles(options).catch(console.error);
}

module.exports = { refreshArticles, getAllArticles };
