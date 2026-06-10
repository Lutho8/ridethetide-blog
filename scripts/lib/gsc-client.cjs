/**
 * Shared Google Search Console API Client
 * CommonJS module for token refresh and GSC API calls.
 */

const https = require('https');

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function refreshAccessToken() {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_id: process.env.GSC_CLIENT_ID,
      client_secret: process.env.GSC_CLIENT_SECRET,
      refresh_token: process.env.GSC_REFRESH_TOKEN,
      grant_type: 'refresh_token',
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
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(`${parsed.error}: ${parsed.error_description}`));
          else resolve(parsed.access_token);
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

function querySearchAnalytics(accessToken, siteUrl, startDate, endDate, dimensions = ['page']) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      startDate,
      endDate,
      dimensions,
      rowLimit: 25000,
    });

    const encodedSite = encodeURIComponent(siteUrl);
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: `/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse search analytics response'));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function inspectUrl(accessToken, siteUrl, inspectionUrl) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      inspectionUrl,
      siteUrl,
      languageCode: 'en-US',
    });

    const req = https.request({
      hostname: 'searchconsole.googleapis.com',
      path: '/v1/urlInspection/index:inspect',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse URL inspection response'));
        }
      });
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
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse sites response'));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = {
  getDateDaysAgo,
  refreshAccessToken,
  querySearchAnalytics,
  inspectUrl,
  listSites,
};
