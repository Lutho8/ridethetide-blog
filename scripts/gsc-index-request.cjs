/**
 * Google Search Console Indexing Request
 *
 * Submits URLs to Google Search Console for indexing using the
 * Google Search Console Indexing API.
 *
 * Usage:
 *   node scripts/gsc-index-request.cjs https://peptide-south-africa.com/blog/article-1
 *   node scripts/gsc-index-request.cjs --urls-file=urls.json
 *
 * Setup Instructions:
 * 1. Create a Google Cloud project and enable the "Indexing API".
 * 2. Create a service account and download the JSON key file.
 * 3. Add the service account email as an owner in GSC for your site.
 * 4. Set SERVICE_ACCOUNT_KEY_PATH below to the path of your JSON key file.
 * 5. Set SITE_URL to your verified property (e.g., https://peptide-south-africa.com).
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───
const CONFIG = {
  SERVICE_ACCOUNT_KEY_PATH: process.env.GSC_INDEXING_KEY_PATH || './config/gsc-indexing-service-account.json',
  SITE_URL: process.env.GSC_INDEXING_SITE_URL || 'https://peptide-south-africa.com',
};

// ─── Simple JWT auth for Google service account ───
function base64urlEscape(str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlEncode(input) {
  return base64urlEscape(Buffer.from(input).toString('base64'));
}

function signJWT(claims, privateKey) {
  const crypto = require('crypto');
  const header = { alg: 'RS256', typ: 'JWT' };
  const segments = [
    base64urlEncode(JSON.stringify(header)),
    base64urlEncode(JSON.stringify(claims)),
  ];
  const signingInput = segments.join('.');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(privateKey, 'base64');
  segments.push(base64urlEscape(signature));
  return segments.join('.');
}

async function getAccessToken() {
  const keyPath = path.resolve(CONFIG.SERVICE_ACCOUNT_KEY_PATH);
  if (!fs.existsSync(keyPath)) {
    throw new Error('Service account key not found: ' + keyPath + '\nPlease set GSC_INDEXING_KEY_PATH or place the key file at the configured path.');
  }
  const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const jwt = signJWT(claims, key.private_key);

  const https = require('https');
  const postData = 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + encodeURIComponent(jwt);

  return new Promise((resolve, reject) => {
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
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) resolve(parsed.access_token);
          else reject(new Error('Token error: ' + (parsed.error_description || parsed.error)));
        } catch (e) {
          reject(new Error('Failed to parse token response'));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function submitUrl(url, accessToken) {
  const https = require('https');
  const postData = JSON.stringify({
    url: url,
    type: 'URL_UPDATED',
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'indexing.googleapis.com',
      path: '/v3/urlNotifications:publish',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            resolve({ url, success: false, error: parsed.error.message || parsed.error });
          } else {
            resolve({ url, success: true, response: parsed });
          }
        } catch (e) {
          resolve({ url, success: false, error: 'Failed to parse response' });
        }
      });
    });
    req.on('error', (e) => resolve({ url, success: false, error: e.message }));
    req.write(postData);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  let urls = [];

  // Check for --urls-file argument
  const urlsFileArg = args.find(a => a.startsWith('--urls-file='));
  if (urlsFileArg) {
    const filePath = urlsFileArg.split('=')[1];
    if (!fs.existsSync(filePath)) {
      console.error('URLs file not found: ' + filePath);
      process.exit(1);
    }
    const fileContent = fs.readFileSync(filePath, 'utf8');
    try {
      const parsed = JSON.parse(fileContent);
      urls = Array.isArray(parsed) ? parsed : (parsed.urls || []);
    } catch (e) {
      // Try as plain text (one URL per line)
      urls = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.startsWith('http'));
    }
  } else {
    urls = args.filter(a => a.startsWith('http'));
  }

  if (urls.length === 0) {
    console.error('Usage: node scripts/gsc-index-request.cjs <url1> <url2> ...');
    console.error('   or: node scripts/gsc-index-request.cjs --urls-file=urls.json');
    console.error('\nConfiguration:');
    console.error('  SERVICE_ACCOUNT_KEY_PATH: ' + CONFIG.SERVICE_ACCOUNT_KEY_PATH);
    console.error('  SITE_URL: ' + CONFIG.SITE_URL);
    process.exit(1);
  }

  console.log('GSC Indexing Request');
  console.log('  URLs to submit: ' + urls.length);
  console.log('  Key path: ' + CONFIG.SERVICE_ACCOUNT_KEY_PATH);

  let accessToken;
  try {
    accessToken = await getAccessToken();
    console.log('  Authenticated successfully');
  } catch (e) {
    console.error('Authentication failed: ' + e.message);
    process.exit(1);
  }

  const results = [];
  for (const url of urls) {
    console.log('  Submitting: ' + url);
    const result = await submitUrl(url, accessToken);
    results.push(result);
    if (result.success) {
      console.log('    Success');
    } else {
      console.log('    Failed: ' + result.error);
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  console.log('\nResults: ' + successCount + ' succeeded, ' + failCount + ' failed');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { getAccessToken, submitUrl };
