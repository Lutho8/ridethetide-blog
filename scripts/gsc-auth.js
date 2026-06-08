/**
 * Google Search Console OAuth Authentication
 * 
 * Generates a refresh token for GSC API access.
 * Run once, then save the refresh token to .env
 * 
 * Usage: node scripts/gsc-auth.js
 */

const readline = require('readline');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env
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

const CLIENT_ID = process.env.GSC_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // For desktop apps
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

async function authenticateGSC() {
  console.log('🔐 Google Search Console OAuth Setup\n');
  
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing GSC_CLIENT_ID or GSC_CLIENT_SECRET in .env');
    console.log('\nSetup steps:');
    console.log('   1. Go to https://console.cloud.google.com/');
    console.log('   2. Create a new project (or select existing)');
    console.log('   3. Enable "Google Search Console API"');
    console.log('   4. Go to Credentials → Create OAuth 2.0 Client ID');
    console.log('   5. Application type: Desktop app');
    console.log('   6. Copy Client ID and Client Secret to .env');
    console.log('   7. Re-run: node scripts/gsc-auth.js');
    return;
  }
  
  // Step 1: Generate auth URL
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPE)}` +
    `&response_type=code` +
    `&access_type=offline` +
    `&prompt=consent`;
  
  console.log('Step 1: Open this URL in your browser:');
  console.log(authUrl);
  console.log('\nStep 2: Sign in with Google and authorize the app');
  console.log('Step 3: Copy the authorization code');
  console.log();
  
  // Step 2: Get auth code from user
  const code = await prompt('Enter authorization code: ');
  
  // Step 3: Exchange code for tokens
  console.log('\nExchanging code for tokens...');
  
  const tokenData = await exchangeCode(code);
  
  if (tokenData.error) {
    console.error(`❌ Error: ${tokenData.error} - ${tokenData.error_description}`);
    return;
  }
  
  console.log('\n✅ Authentication successful!');
  console.log(`   Access token: ${tokenData.access_token.substring(0, 20)}...`);
  console.log(`   Refresh token: ${tokenData.refresh_token.substring(0, 20)}...`);
  console.log(`   Expires in: ${tokenData.expires_in} seconds`);
  
  // Step 4: Test the token
  console.log('\nTesting token...');
  const sites = await listSites(tokenData.access_token);
  
  if (sites.error) {
    console.error(`❌ API test failed: ${sites.error.message}`);
    return;
  }
  
  console.log(`   ✅ API working! Found ${sites.siteEntry?.length || 0} verified sites:`);
  (sites.siteEntry || []).forEach(site => {
    console.log(`      - ${site.siteUrl}`);
  });
  
  // Step 5: Save to .env
  console.log('\n📋 Add this to your .env file:');
  console.log(`GSC_REFRESH_TOKEN=${tokenData.refresh_token}`);
  
  console.log('\nOr run this command to append it:');
  console.log(`echo "GSC_REFRESH_TOKEN=${tokenData.refresh_token}" >> .env`);
}

function exchangeCode(code) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString();
    
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function listSites(accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: '/webmasters/v3/sites',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    
    req.on('error', reject);
    req.end();
  });
}

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

if (require.main === module) {
  authenticateGSC().catch(console.error);
}

module.exports = { authenticateGSC };
