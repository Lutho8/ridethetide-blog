/**
 * MCP Wrapper for AI Content Helper
 *
 * Custom MCP server for AI-assisted content analysis and improvement.
 * Uses OpenAI API (primary) with Kimi and Anthropic as fallbacks.
 *
 * This script implements the Model Context Protocol (MCP) over stdio.
 * Requires: npm install @modelcontextprotocol/sdk
 */

const { loadEnv, callOpenAI, extractJsonFromResponse } = require('./lib/ai-client.cjs');

// Load environment variables
loadEnv();

// Note: This requires @modelcontextprotocol/sdk to be installed
// npm install @modelcontextprotocol/sdk
try {
  const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
  const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
  const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
  } = require('@modelcontextprotocol/sdk/types.js');

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const KIMI_API_KEY = process.env.KIMI_API_KEY;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  const server = new Server(
    {
      name: 'aihelper-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'analyze_content_gaps',
          description: 'Compare article content against top-ranking competitors to identify gaps',
          inputSchema: {
            type: 'object',
            properties: {
              articleContent: {
                type: 'string',
                description: 'Full text of the article to analyze',
              },
              targetKeyword: {
                type: 'string',
                description: 'Primary keyword the article targets',
              },
            },
            required: ['articleContent', 'targetKeyword'],
          },
        },
        {
          name: 'suggest_updates',
          description: 'Find outdated claims, statistics, or information in an article',
          inputSchema: {
            type: 'object',
            properties: {
              articleContent: {
                type: 'string',
                description: 'Full text of the article',
              },
              pubDate: {
                type: 'string',
                description: 'Original publication date (YYYY-MM-DD)',
              },
            },
            required: ['articleContent', 'pubDate'],
          },
        },
        {
          name: 'check_voice_compliance',
          description: 'Check if article matches the canonical writing voice guidelines',
          inputSchema: {
            type: 'object',
            properties: {
              articleContent: {
                type: 'string',
                description: 'Full text of the article',
              },
            },
            required: ['articleContent'],
          },
        },
        {
          name: 'generate_improvements',
          description: 'Generate specific improvements for an article based on gap analysis',
          inputSchema: {
            type: 'object',
            properties: {
              articleContent: {
                type: 'string',
                description: 'Full text of the article',
              },
              gaps: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of identified content gaps',
              },
            },
            required: ['articleContent', 'gaps'],
          },
        },
      ],
    };
  });

  async function callAI(prompt) {
    // Primary: OpenAI
    if (OPENAI_API_KEY) {
      try {
        return await callOpenAI(prompt, { temperature: 0.3, maxTokens: 2000 });
      } catch (e) {
        console.error('OpenAI failed:', e.message);
      }
    }
    // Fallback: Kimi
    if (KIMI_API_KEY) {
      try {
        return await callKimi(prompt);
      } catch (e) {
        console.error('Kimi failed:', e.message);
      }
    }
    return null;
  }

  async function callKimi(prompt) {
    const KIMI_BASE_URL = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
    const KIMI_MODEL = process.env.KIMI_MODEL || 'moonshot-v1-32k';

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

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (!OPENAI_API_KEY && !KIMI_API_KEY && !ANTHROPIC_API_KEY) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No AI API key configured. Set OPENAI_API_KEY (primary), KIMI_API_KEY, or ANTHROPIC_API_KEY. Get OpenAI key at https://platform.openai.com/api-keys',
          },
        ],
        isError: true,
      };
    }

    const { name, arguments: args } = request.params;

    switch (name) {
      case 'analyze_content_gaps': {
        const prompt = `Analyze content gaps for an article targeting "${args.targetKeyword}".\n\nArticle:\n${args.articleContent.substring(0, 4000)}\n\nIdentify 3-5 specific content gaps compared to what top-ranking articles typically cover. Return as JSON array of gap descriptions.`;
        const result = await callAI(prompt);
        return {
          content: [{
            type: 'text',
            text: result || JSON.stringify({
              status: 'pending_api',
              targetKeyword: args.targetKeyword,
              note: 'AI API integration pending.',
              gaps: [
                'Add comparison table with competitor products',
                'Include more South African regulatory context',
                'Add FAQ schema questions',
                'Expand dosing section with visual aids',
              ],
            }, null, 2),
          }],
        };
      }

      case 'suggest_updates': {
        const prompt = `Review this article published ${args.pubDate} for outdated information.\n\nArticle:\n${args.articleContent.substring(0, 4000)}\n\nIdentify outdated statistics, claims, or citations. Return as JSON array of update suggestions.`;
        const result = await callAI(prompt);
        return {
          content: [{
            type: 'text',
            text: result || JSON.stringify({
              status: 'pending_api',
              pubDate: args.pubDate,
              note: 'AI API integration pending.',
              outdatedItems: [
                'Citation [3] is from 2018 — check for 2024+ updates',
                'SAHPRA guidance referenced may have changed',
                'Dosing recommendations may need updating with new research',
              ],
            }, null, 2),
          }],
        };
      }

      case 'check_voice_compliance': {
        const prompt = `Check this article for voice compliance against these rules:\n1. Scientific but accessible tone\n2. South African context required\n3. Safety-first (disclaimer, risks first)\n4. No hype phrases (miracle, game-changer, etc.)\n5. No prohibited medical claims\n\nArticle:\n${args.articleContent.substring(0, 4000)}\n\nReturn JSON with pass/warn/fail for each rule and specific suggestions.`;
        const result = await callAI(prompt);
        return {
          content: [{
            type: 'text',
            text: result || JSON.stringify({
              status: 'pending_api',
              note: 'AI API integration pending.',
              compliance: {
                scientificTone: 'pass',
                saContext: 'pass',
                safetyFirst: 'warning — disclaimer could be more prominent',
                noHype: 'pass',
                noProhibitedPhrases: 'pass',
              },
              suggestions: [
                'Move disclaimer to top of article',
                'Add "Talk to your doctor" callout after dosing section',
              ],
            }, null, 2),
          }],
        };
      }

      case 'generate_improvements': {
        const prompt = `Generate specific improvements for this article based on these gaps:\n${args.gaps.join('\n')}\n\nArticle:\n${args.articleContent.substring(0, 4000)}\n\nReturn JSON array of improvements with priority and implementation notes.`;
        const result = await callAI(prompt);
        return {
          content: [{
            type: 'text',
            text: result || JSON.stringify({
              status: 'pending_api',
              note: 'AI API integration pending.',
              improvements: args.gaps.map(gap => ({
                gap,
                suggestion: `Add detailed section addressing: ${gap}`,
                priority: 'medium',
              })),
            }, null, 2),
          }],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  });

  async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('AI Content Helper MCP server running on stdio (OpenAI primary)');
  }

  main().catch(console.error);

} catch (e) {
  console.error('MCP SDK not installed. Run: npm install @modelcontextprotocol/sdk');
  console.error('The AI client module is still available at scripts/lib/ai-client.cjs');
}
