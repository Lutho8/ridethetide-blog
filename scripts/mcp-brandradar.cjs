/**
 * MCP Wrapper for Brand Radar
 * 
 * Custom MCP server wrapper for Ahrefs Brand Radar API.
 * Provides tools for AI search visibility tracking.
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

const BRAND_RADAR_API_KEY = process.env.BRAND_RADAR_API_KEY;

const server = new Server(
  {
    name: 'brandradar-mcp',
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
        name: 'get_ai_citations',
        description: 'Get brand mentions in AI search answers (ChatGPT, Perplexity, Claude)',
        inputSchema: {
          type: 'object',
          properties: {
            brand: {
              type: 'string',
              description: 'Brand name to search for',
            },
            days: {
              type: 'number',
              description: 'Number of days to look back',
              default: 30,
            },
          },
          required: ['brand'],
        },
      },
      {
        name: 'get_visibility_score',
        description: 'Get AI search visibility score and trend',
        inputSchema: {
          type: 'object',
          properties: {
            brand: {
              type: 'string',
              description: 'Brand name',
            },
          },
          required: ['brand'],
        },
      },
      {
        name: 'get_competitor_citations',
        description: 'Compare AI citations between your brand and competitors',
        inputSchema: {
          type: 'object',
          properties: {
            brand: {
              type: 'string',
              description: 'Your brand name',
            },
            competitors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Competitor brand names',
            },
          },
          required: ['brand', 'competitors'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!BRAND_RADAR_API_KEY) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: BRAND_RADAR_API_KEY not set. Please configure the API key.',
        },
      ],
      isError: true,
    };
  }

  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_ai_citations':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'pending_api',
              brand: args.brand,
              days: args.days || 30,
              note: 'Brand Radar API integration pending. This is a template response.',
              citations: [],
            }, null, 2),
          },
        ],
      };

    case 'get_visibility_score':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'pending_api',
              brand: args.brand,
              score: null,
              trend: null,
              note: 'Brand Radar API integration pending.',
            }, null, 2),
          },
        ],
      };

    case 'get_competitor_citations':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'pending_api',
              brand: args.brand,
              competitors: args.competitors,
              comparison: {},
              note: 'Brand Radar API integration pending.',
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
  console.error('Brand Radar MCP server running on stdio');
}

main().catch(console.error);
