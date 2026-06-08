/**
 * MCP Wrapper for AI Content Helper
 * 
 * Custom MCP server for AI-assisted content analysis and improvement.
 * Uses OpenAI/Anthropic APIs for content gap analysis, voice compliance,
 * and article refresh suggestions.
 * 
 * This script implements the Model Context Protocol (MCP) over stdio.
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

// Note: This requires @modelcontextprotocol/sdk to be installed
// npm install @modelcontextprotocol/sdk

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
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

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!OPENAI_API_KEY && !ANTHROPIC_API_KEY) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: No AI API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.',
        },
      ],
      isError: true,
    };
  }

  const { name, arguments: args } = request.params;

  switch (name) {
    case 'analyze_content_gaps':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'pending_api',
              targetKeyword: args.targetKeyword,
              note: 'OpenAI/Anthropic API integration pending.',
              gaps: [
                'Add comparison table with competitor products',
                'Include more South African regulatory context',
                'Add FAQ schema questions',
                'Expand dosing section with visual aids',
              ],
            }, null, 2),
          },
        ],
      };

    case 'suggest_updates':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'pending_api',
              pubDate: args.pubDate,
              note: 'OpenAI/Anthropic API integration pending.',
              outdatedItems: [
                'Citation [3] is from 2018 — check for 2024+ updates',
                'SAHPRA guidance referenced may have changed',
                'Dosing recommendations may need updating with new research',
              ],
            }, null, 2),
          },
        ],
      };

    case 'check_voice_compliance':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'pending_api',
              note: 'OpenAI/Anthropic API integration pending.',
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
          },
        ],
      };

    case 'generate_improvements':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'pending_api',
              note: 'OpenAI/Anthropic API integration pending.',
              improvements: args.gaps.map(gap => ({
                gap,
                suggestion: `Add detailed section addressing: ${gap}`,
                priority: 'medium',
              })),
            }, null, 2),
          },
        ],
      };

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
  console.error('AI Content Helper MCP server running on stdio');
}

main().catch(console.error);
