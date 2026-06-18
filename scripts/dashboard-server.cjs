#!/usr/bin/env node
/**
 * Dashboard Server
 * 
 * Serves the Content OS dashboard locally.
 * Usage: node scripts/dashboard-server.js [--port 3000]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const CONFIG = {
  port: process.env.PORT || 3000,
  dashboardPath: path.join(__dirname, '../content-os/dashboard.html'),
  reportsDir: path.join(__dirname, '../content-os/reports'),
  auditsDir: path.join(__dirname, '../content-os/audits'),
  seedsDir: path.join(__dirname, '../content-os/seeds'),
};

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function serveDashboard(req, res) {
  const url = new URL(req.url, `http://localhost:${CONFIG.port}`);
  
  // API endpoints
  if (url.pathname === '/api/status') {
    return serveApiStatus(req, res);
  }
  
  if (url.pathname === '/api/reports') {
    return serveApiReports(req, res);
  }
  
  if (url.pathname === '/api/run') {
    return serveApiRun(req, res, url);
  }
  
  // Static files
  let filePath = path.join(__dirname, '../content-os', url.pathname === '/' ? 'dashboard.html' : url.pathname);
  
  if (!fs.existsSync(filePath)) {
    filePath = CONFIG.dashboardPath;
  }
  
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function serveApiStatus(req, res) {
  const status = {
    timestamp: new Date().toISOString(),
    articles: countArticles(),
    reports: countReports(),
    mcpStatus: checkMcpStatus(),
    lastAudit: getLastAuditDate(),
    lastGapAnalysis: getLastGapDate(),
    lastEmbeddings: getLastEmbeddingsDate(),
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(status, null, 2));
}

function serveApiReports(req, res) {
  const reports = [];
  
  [CONFIG.reportsDir, CONFIG.auditsDir, CONFIG.seedsDir].forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir)
        .filter(f => f.endsWith('.json') || f.endsWith('.md'))
        .forEach(f => {
          const stat = fs.statSync(path.join(dir, f));
          reports.push({
            name: f,
            type: f.endsWith('.json') ? 'json' : 'markdown',
            category: path.basename(dir),
            size: stat.size,
            modified: stat.mtime.toISOString(),
          });
        });
    }
  });
  
  reports.sort((a, b) => new Date(b.modified) - new Date(a.modified));
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(reports, null, 2));
}

function serveApiRun(req, res, url) {
  const command = url.searchParams.get('command');
  const allowedCommands = [
    'content:audit',
    'content:gap',
    'embeddings:build',
    'embeddings:drift',
    'content:refresh',
    'pipeline:full',
  ];
  
  if (!allowedCommands.includes(command)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid command' }));
    return;
  }
  
  // Run the command asynchronously
  const scriptMap = {
    'content:audit': 'node scripts/content-audit.cjs',
    'content:gap': 'node scripts/gap-analysis.cjs',
    'embeddings:build': 'node scripts/build-embeddings.cjs',
    'embeddings:drift': 'node scripts/topic-drift.cjs',
    'content:refresh': 'node scripts/refresh-articles.cjs --dry-run',
    'pipeline:full': 'npm run pipeline:full',
  };
  
  const cmd = scriptMap[command];
  const cwd = path.join(__dirname, '..');
  
  res.writeHead(202, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'started', command, pid: null }));
  
  // Execute in background
  exec(cmd, { cwd, timeout: 300000 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Pipeline error: ${error.message}`);
    }
    console.log(`Pipeline output: ${stdout}`);
    if (stderr) console.error(`Pipeline stderr: ${stderr}`);
  });
}

function countArticles() {
  const contentDir = path.join(__dirname, '../src/content/blog');
  if (!fs.existsSync(contentDir)) return 0;
  return fs.readdirSync(contentDir).filter(f => f.endsWith('.md')).length;
}

function countReports() {
  let count = 0;
  [CONFIG.reportsDir, CONFIG.auditsDir, CONFIG.seedsDir].forEach(dir => {
    if (fs.existsSync(dir)) {
      count += fs.readdirSync(dir).filter(f => f.endsWith('.json') || f.endsWith('.md')).length;
    }
  });
  return count;
}

function checkMcpStatus() {
  // In production, this would check if MCP servers are running
  return {
    ahrefs: 'pending',
    gsc: 'pending',
    gong: 'pending',
    intercom: 'pending',
    slack: 'pending',
    brandradar: 'pending',
  };
}

function getLastAuditDate() {
  const dir = CONFIG.auditsDir;
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.startsWith('content-audit-') && f.endsWith('.json'));
  if (files.length === 0) return null;
  files.sort().reverse();
  return files[0].replace('content-audit-', '').replace('.json', '');
}

function getLastGapDate() {
  const dir = CONFIG.reportsDir;
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.startsWith('gap-analysis-') && f.endsWith('.json'));
  if (files.length === 0) return null;
  files.sort().reverse();
  return files[0].replace('gap-analysis-', '').replace('.json', '');
}

function getLastEmbeddingsDate() {
  const dir = path.join(__dirname, '../content-os/embeddings');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.startsWith('embeddings-') && f.endsWith('.json'));
  if (files.length === 0) return null;
  files.sort().reverse();
  return files[0].replace('embeddings-', '').replace('.json', '');
}

const server = http.createServer(serveDashboard);

server.listen(CONFIG.port, () => {
  console.log('🌊 Content OS Dashboard');
  console.log(`   URL: http://localhost:${CONFIG.port}`);
  console.log(`   API: http://localhost:${CONFIG.port}/api/status`);
  console.log(`   Press Ctrl+C to stop`);
});

module.exports = { server };
