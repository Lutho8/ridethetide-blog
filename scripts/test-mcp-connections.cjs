/**
 * Test MCP Connections
 * 
 * Verifies all configured MCP servers are accessible.
 * Usage: node scripts/test-mcp-connections.js
 */

const fs = require('fs');
const path = require('path');

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

const MCP_SERVERS = [
  {
    name: 'Ahrefs',
    envVar: 'AHREFS_API_TOKEN',
    testUrl: 'https://api.ahrefs.com/v3/site-explorer/overview',
    docs: 'https://docs.ahrefs.com/v3/docs',
  },
  {
    name: 'Google Search Console',
    envVar: 'GSC_REFRESH_TOKEN',
    testUrl: null,
    docs: 'https://developers.google.com/webmaster-tools/v3',
    testFunction: testGSC,
  },
  {
    name: 'Gong',
    envVar: 'GONG_ACCESS_KEY',
    testUrl: 'https://api.gong.io/v2/users',
    docs: 'https://app.gong.io/api-documentation',
  },
  {
    name: 'Intercom',
    envVar: 'INTERCOM_ACCESS_TOKEN',
    testUrl: 'https://api.intercom.io/me',
    docs: 'https://developers.intercom.com/docs',
  },
  {
    name: 'Slack',
    envVar: 'SLACK_BOT_TOKEN',
    testUrl: 'https://slack.com/api/auth.test',
    docs: 'https://api.slack.com/methods/auth.test',
  },
  {
    name: 'Kimi (Moonshot AI)',
    envVar: 'KIMI_API_KEY',
    testUrl: 'https://api.moonshot.cn/v1/models',
    docs: 'https://platform.moonshot.cn/docs',
    note: 'Primary AI provider for Content OS. OpenAI-compatible API.',
  },
  {
    name: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    testUrl: 'https://api.openai.com/v1/models',
    docs: 'https://platform.openai.com/docs',
    note: 'Fallback AI provider if Kimi is unavailable.',
  },
  {
    name: 'Anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    testUrl: 'https://api.anthropic.com/v1/models',
    docs: 'https://docs.anthropic.com',
    note: 'Fallback AI provider if Kimi and OpenAI are unavailable.',
  },
];

async function testConnections() {
  console.log('🔌 Testing MCP Connections\n');
  
  const results = [];
  
  for (const server of MCP_SERVERS) {
    const hasEnv = !!process.env[server.envVar];
    const envValue = process.env[server.envVar];
    const isMasked = envValue ? `${envValue.substring(0, 8)}...` : 'not set';
    
    let status = 'unknown';
    let message = '';
    
    if (!hasEnv) {
      status = 'missing';
      message = `Environment variable ${server.envVar} not set`;
    } else if (server.testFunction) {
      const result = await server.testFunction(envValue);
      status = result.status;
      message = result.message;
    } else if (!server.testUrl) {
      status = 'manual';
      message = server.note || 'Requires manual setup';
    } else {
      // Try a simple API call
      try {
        const response = await fetch(server.testUrl, {
          headers: getAuthHeaders(server.name, envValue),
        });
        
        if (response.ok) {
          status = 'connected';
          message = `API responded with ${response.status}`;
        } else if (response.status === 401 || response.status === 403) {
          status = 'auth_error';
          message = `Authentication failed (${response.status}). Check API key permissions.`;
        } else {
          status = 'error';
          message = `API error: ${response.status} ${response.statusText}`;
        }
      } catch (e) {
        status = 'network_error';
        message = `Network error: ${e.message}`;
      }
    }
    
    results.push({
      name: server.name,
      status,
      message,
      envVar: server.envVar,
      envValue: isMasked,
      docs: server.docs,
    });
    
    const icon = {
      connected: '✅',
      missing: '❌',
      manual: '⚠️',
      auth_error: '🔐',
      error: '❌',
      network_error: '🌐',
      unknown: '❓',
    }[status];
    
    console.log(`${icon} ${server.name}`);
    console.log(`   Status: ${status}`);
    console.log(`   ${server.envVar}: ${isMasked}`);
    console.log(`   ${message}`);
    console.log(`   Docs: ${server.docs}`);
    console.log();
  }
  
  // Summary
  const connected = results.filter(r => r.status === 'connected').length;
  const missing = results.filter(r => r.status === 'missing').length;
  const errors = results.filter(r => ['error', 'auth_error', 'network_error'].includes(r.status)).length;
  const manual = results.filter(r => r.status === 'manual').length;
  
  console.log('─'.repeat(50));
  console.log('Summary:');
  console.log(`   ✅ Connected: ${connected}/${results.length}`);
  console.log(`   ❌ Missing credentials: ${missing}`);
  console.log(`   🔐 Auth errors: ${errors}`);
  console.log(`   ⚠️  Manual setup needed: ${manual}`);
  console.log();
  
  if (missing > 0) {
    console.log('Next steps:');
    console.log('   1. Copy .env.example to .env');
    console.log('   2. Fill in your API keys');
    console.log('   3. Re-run: node scripts/test-mcp-connections.js');
  }
  
  // Save report
  const reportPath = path.join(__dirname, '../content-os/reports/mcp-status.json');
  if (!fs.existsSync(path.dirname(reportPath))) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  }
  fs.writeFileSync(reportPath, JSON.stringify({
    testedAt: new Date().toISOString(),
    results,
    summary: { connected, missing, errors, manual, total: results.length },
  }, null, 2));
  
  console.log(`\nReport saved: ${reportPath}`);
}

async function testGSC(refreshToken) {
  const CLIENT_ID = process.env.GSC_CLIENT_ID;
  const CLIENT_SECRET = process.env.GSC_CLIENT_SECRET;
  
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return { status: 'manual', message: 'GSC_CLIENT_ID or GSC_CLIENT_SECRET not set. Run: node scripts/gsc-auth.cjs' };
  }
  
  try {
    // Exchange refresh token for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
    
    const tokenData = await tokenRes.json();
    
    if (tokenData.error) {
      return { status: 'auth_error', message: `Token refresh failed: ${tokenData.error}` };
    }
    
    // Test GSC API
    const apiRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    
    const apiData = await apiRes.json();
    
    if (apiData.error) {
      return { status: 'auth_error', message: `API error: ${apiData.error.message}` };
    }
    
    const siteCount = apiData.siteEntry?.length || 0;
    return { status: 'connected', message: `API responded with 200. Found ${siteCount} verified sites.` };
  } catch (e) {
    return { status: 'network_error', message: `Network error: ${e.message}` };
  }
}

function getAuthHeaders(name, token) {
  switch (name) {
    case 'Ahrefs':
      return { 'Authorization': `Bearer ${token}` };
    case 'Gong':
      return {
        'Authorization': `Basic ${Buffer.from(`${token}:${process.env.GONG_SECRET_KEY}`).toString('base64')}`,
      };
    case 'Intercom':
      return { 'Authorization': `Bearer ${token}` };
    case 'Slack':
      return { 'Authorization': `Bearer ${token}` };
    case 'Kimi (Moonshot AI)':
      return { 'Authorization': `Bearer ${token}` };
    case 'OpenAI':
      return { 'Authorization': `Bearer ${token}` };
    case 'Anthropic':
      return { 'x-api-key': token, 'anthropic-version': '2023-06-01' };
    default:
      return {};
  }
}

if (require.main === module) {
  testConnections().catch(console.error);
}

module.exports = { testConnections };
