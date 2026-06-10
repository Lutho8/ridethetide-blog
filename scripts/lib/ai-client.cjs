/**
 * Shared AI Client
 *
 * Provides a unified interface for AI API calls.
 * Primary: Kimi (Moonshot AI) — OpenAI-compatible
 * Fallback: OpenAI
 */

const https = require('https');

function loadEnv() {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...rest] = line.split('=');
      if (key && rest.length && !key.startsWith('#')) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    });
  }
}

function makeChatRequest(baseUrl, apiKey, model, messages, temperature, maxTokens) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    const url = new URL(baseUrl);
    const req = https.request({
      hostname: url.hostname,
      path: `${url.pathname}/chat/completions`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
            reject(new Error(`${parsed.error.message || parsed.error}`));
          } else {
            const content = parsed.choices?.[0]?.message?.content || '';
            resolve(content);
          }
        } catch (e) {
          reject(new Error('Failed to parse AI response'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function callKimi(prompt, options = {}) {
  const apiKey = process.env.KIMI_API_KEY;
  const baseUrl = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
  const model = process.env.KIMI_MODEL || 'moonshot-v1-32k';

  if (!apiKey) {
    throw new Error('KIMI_API_KEY not set');
  }

  return makeChatRequest(
    baseUrl,
    apiKey,
    model,
    [{ role: 'user', content: prompt }],
    options.temperature ?? 0.3,
    options.maxTokens ?? 2000
  );
}

async function callOpenAI(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

  return makeChatRequest(
    baseUrl,
    apiKey,
    model,
    [{ role: 'user', content: prompt }],
    options.temperature ?? 0.3,
    options.maxTokens ?? 2000
  );
}

/**
 * Call AI with automatic provider fallback:
 * 1. Try Kimi (primary)
 * 2. If Kimi fails, try OpenAI
 * 3. If both fail, throw
 */
async function callAI(prompt, options = {}) {
  const errors = [];

  // Try Kimi first
  if (process.env.KIMI_API_KEY) {
    try {
      return await callKimi(prompt, options);
    } catch (e) {
      errors.push(`Kimi: ${e.message}`);
    }
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      return await callOpenAI(prompt, options);
    } catch (e) {
      errors.push(`OpenAI: ${e.message}`);
    }
  }

  throw new Error(`All AI providers failed: ${errors.join('; ')}`);
}

function extractJsonFromResponse(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

module.exports = {
  loadEnv,
  callKimi,
  callOpenAI,
  callAI,
  extractJsonFromResponse,
};
