/**
 * MCP Setup Wizard
 * 
 * Interactive guide to connect all MCP servers.
 * Checks prerequisites, validates API keys, and generates IDE config files.
 * 
 * Usage: node scripts/mcp-setup-wizard.cjs
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG = {
  envPath: path.join(__dirname, '../.env'),
  mcpConfigPath: path.join(__dirname, '../.mcp-config.json'),
};

const MCP_SERVERS = [
  {
    name: 'Ahrefs',
    envVar: 'AHREFS_API_TOKEN',
    required: true,
    description: 'SEO data, rankings, backlinks, gap analysis, Site Audit',
    setupUrl: 'https://app.ahrefs.com/api',
    docs: 'https://docs.ahrefs.com/v3/docs',
    mcpPackage: '@ahrefs/mcp-server',
  },
  {
    name: 'Google Search Console',
    envVar: 'GSC_REFRESH_TOKEN',
    required: true,
    description: 'Traffic, indexing, decay detection',
    setupUrl: 'https://console.cloud.google.com/',
    docs: 'https://developers.google.com/webmaster-tools/v3',
    note: 'Run: node scripts/gsc-auth.cjs after setting CLIENT_ID and CLIENT_SECRET',
    prerequisites: ['GSC_CLIENT_ID', 'GSC_CLIENT_SECRET'],
  },
  {
    name: 'Gong',
    envVar: 'GONG_ACCESS_KEY',
    required: false,
    description: 'Sales call transcripts, customer language extraction',
    setupUrl: 'https://app.gong.io/settings/api',
    docs: 'https://app.gong.io/api-documentation',
    mcpPackage: '@gong/mcp-server',
    prerequisites: ['GONG_SECRET_KEY'],
  },
  {
    name: 'Intercom',
    envVar: 'INTERCOM_ACCESS_TOKEN',
    required: false,
    description: 'Support conversations, common questions',
    setupUrl: 'https://developers.intercom.com/',
    docs: 'https://developers.intercom.com/docs',
    mcpPackage: '@intercom/mcp-server',
    prerequisites: ['INTERCOM_APP_ID'],
  },
  {
    name: 'Slack',
    envVar: 'SLACK_BOT_TOKEN',
    required: false,
    description: 'Team feedback, internal language',
    setupUrl: 'https://api.slack.com/apps',
    docs: 'https://api.slack.com/methods/auth.test',
    mcpPackage: '@modelcontextprotocol/server-slack',
    prerequisites: ['SLACK_TEAM_ID'],
  },
  {
    name: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    required: true,
    description: 'AI Content Helper - content gap analysis, voice compliance',
    setupUrl: 'https://platform.openai.com/api-keys',
    docs: 'https://platform.openai.com/docs',
  },
  {
    name: 'Anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    required: false,
    description: 'AI Content Helper - alternative to OpenAI',
    setupUrl: 'https://console.anthropic.com/settings/keys',
    docs: 'https://docs.anthropic.com',
  },
];

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function runWizard() {
  console.log('🔌 MCP Setup Wizard for Ride The Tide Content OS\n');
  console.log('This wizard will help you connect all MCP servers.\n');
  
  // Check current .env
  let envVars = {};
  if (fs.existsSync(CONFIG.envPath)) {
    const envContent = fs.readFileSync(CONFIG.envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...rest] = line.split('=');
      if (key && rest.length && !key.startsWith('#') && !key.startsWith(' ')) {
        envVars[key.trim()] = rest.join('=').trim();
      }
    });
    console.log(`✅ Found existing .env with ${Object.keys(envVars).length} variables\n`);
  } else {
    console.log('⚠️  No .env file found. Will create one.\n');
  }
  
  // Check each MCP server
  const results = [];
  for (const server of MCP_SERVERS) {
    console.log(`─`.repeat(50));
    console.log(`📡 ${server.name}`);
    console.log(`   ${server.description}`);
    
    const hasToken = !!envVars[server.envVar];
    const status = hasToken ? '✅ Configured' : '❌ Not configured';
    console.log(`   Status: ${status}`);
    
    if (!hasToken) {
      console.log(`   Setup: ${server.setupUrl}`);
      if (server.note) console.log(`   Note: ${server.note}`);
      
      const value = await prompt(`   Enter ${server.envVar} (or press Enter to skip): `);
      if (value) {
        envVars[server.envVar] = value;
        console.log(`   ✅ Saved`);
      } else {
        console.log(`   ⏭️  Skipped`);
      }
    }
    
    // Check prerequisites
    if (server.prerequisites) {
      for (const prereq of server.prerequisites) {
        if (!envVars[prereq]) {
          const value = await prompt(`   Enter ${prereq} (required for ${server.name}): `);
          if (value) envVars[prereq] = value;
        }
      }
    }
    
    results.push({
      name: server.name,
      envVar: server.envVar,
      configured: hasToken || !!envVars[server.envVar],
      required: server.required,
    });
    console.log();
  }
  
  // Save .env
  console.log('─'.repeat(50));
  console.log('\n💾 Saving .env file...');
  const envContent = Object.entries(envVars)
    .filter(([k]) => k && !k.startsWith('#'))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n';
  fs.writeFileSync(CONFIG.envPath, envContent);
  console.log(`   ✅ Saved to ${CONFIG.envPath}\n`);
  
  // Generate MCP config for IDE
  console.log('📝 Generating MCP IDE configuration...');
  const mcpConfig = generateMcpConfig(envVars);
  fs.writeFileSync(CONFIG.mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
  console.log(`   ✅ Saved to ${CONFIG.mcpConfigPath}\n`);
  
  // Summary
  console.log('─'.repeat(50));
  console.log('\n📊 Setup Summary\n');
  
  const connected = results.filter(r => r.configured);
  const requiredMissing = results.filter(r => r.required && !r.configured);
  
  console.log(`   Connected: ${connected.length}/${results.length}`);
  console.log(`   Required missing: ${requiredMissing.length}`);
  
  if (requiredMissing.length > 0) {
    console.log('\n   ⚠️  Required connections still missing:');
    requiredMissing.forEach(r => {
      console.log(`      - ${r.name} (${r.envVar})`);
    });
  }
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Install MCP servers:');
  MCP_SERVERS.filter(s => s.mcpPackage).forEach(s => {
    console.log(`      npm install -g ${s.mcpPackage}`);
  });
  console.log('   2. Add MCP config to your IDE:');
  console.log(`      - Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json`);
  console.log(`      - Cursor: .cursor/mcp.json`);
  console.log(`      - VS Code: .vscode/mcp.json`);
  console.log('   3. Copy contents of .mcp-config.json into your IDE config');
  console.log('   4. Test connections: node scripts/test-mcp-connections.cjs');
  console.log('   5. Run content audit: npm run content:audit');
  
  // Print the config
  console.log('\n📄 Generated MCP Config:');
  console.log(JSON.stringify(mcpConfig, null, 2));
}

function generateMcpConfig(envVars) {
  const mcpServers = {};
  
  if (envVars.AHREFS_API_TOKEN) {
    mcpServers.ahrefs = {
      command: 'npx',
      args: ['-y', '@ahrefs/mcp-server'],
      env: { AHREFS_API_TOKEN: envVars.AHREFS_API_TOKEN },
    };
  }
  
  if (envVars.GSC_CLIENT_ID && envVars.GSC_CLIENT_SECRET && envVars.GSC_REFRESH_TOKEN) {
    mcpServers.gsc = {
      command: 'npx',
      args: ['-y', '@google/mcp-search-console'],
      env: {
        GSC_CLIENT_ID: envVars.GSC_CLIENT_ID,
        GSC_CLIENT_SECRET: envVars.GSC_CLIENT_SECRET,
        GSC_REFRESH_TOKEN: envVars.GSC_REFRESH_TOKEN,
      },
    };
  }
  
  if (envVars.GONG_ACCESS_KEY && envVars.GONG_SECRET_KEY) {
    mcpServers.gong = {
      command: 'npx',
      args: ['-y', '@gong/mcp-server'],
      env: {
        GONG_ACCESS_KEY: envVars.GONG_ACCESS_KEY,
        GONG_SECRET_KEY: envVars.GONG_SECRET_KEY,
      },
    };
  }
  
  if (envVars.INTERCOM_ACCESS_TOKEN) {
    mcpServers.intercom = {
      command: 'npx',
      args: ['-y', '@intercom/mcp-server'],
      env: { INTERCOM_ACCESS_TOKEN: envVars.INTERCOM_ACCESS_TOKEN },
    };
  }
  
  if (envVars.SLACK_BOT_TOKEN) {
    mcpServers.slack = {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      env: { SLACK_BOT_TOKEN: envVars.SLACK_BOT_TOKEN },
    };
  }
  
  return { mcpServers };
}

if (require.main === module) {
  runWizard().catch(console.error);
}

module.exports = { runWizard, generateMcpConfig };
