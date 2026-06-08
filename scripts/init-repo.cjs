/**
 * Initialize Git Repository and Push to GitHub
 * 
 * Sets up the ridethetide-blog repo for GitHub + Cloudflare Pages deployment.
 * 
 * Usage: node scripts/init-repo.js --github-user YOUR_USERNAME
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_NAME = 'ridethetide-blog';

function initRepo(options = {}) {
  const { githubUser } = options;
  
  console.log('🚀 Initializing Ride The Tide Blog Repository\n');
  
  const blogDir = path.join(__dirname, '..');
  
  // Check if already a git repo
  const gitDir = path.join(blogDir, '.git');
  if (fs.existsSync(gitDir)) {
    console.log('⚠️  Git repository already exists. Skipping init.');
  } else {
    console.log('Step 1: Initializing Git repository...');
    execSync('git init', { cwd: blogDir, stdio: 'inherit' });
    console.log('   ✅ Git initialized\n');
  }
  
  // Create .gitignore if not exists
  const gitignorePath = path.join(blogDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    console.log('Step 2: Creating .gitignore...');
    fs.writeFileSync(gitignorePath, `node_modules/
dist/
.env
.env.local
.DS_Store
*.log
content-os/drafts/*.md
content-os/embeddings/*.json
content-os/reports/*.json
content-os/audits/*.json
content-os/seeds/*.json
`);
    console.log('   ✅ .gitignore created\n');
  }
  
  // Add all files
  console.log('Step 3: Adding files to Git...');
  try {
    execSync('git add -A', { cwd: blogDir });
    console.log('   ✅ Files staged\n');
  } catch (e) {
    console.log('   ⚠️  Some files may already be tracked\n');
  }
  
  // Initial commit
  console.log('Step 4: Creating initial commit...');
  try {
    execSync('git commit -m "feat: initial Content OS blog setup"', { cwd: blogDir });
    console.log('   ✅ Initial commit created\n');
  } catch (e) {
    console.log('   ⚠️  Nothing to commit or commit already exists\n');
  }
  
  // GitHub remote setup
  if (githubUser) {
    const remoteUrl = `https://github.com/${githubUser}/${REPO_NAME}.git`;
    console.log('Step 5: Setting up GitHub remote...');
    
    try {
      // Check if remote exists
      const remotes = execSync('git remote -v', { cwd: blogDir, encoding: 'utf8' });
      if (remotes.includes('origin')) {
        console.log('   ⚠️  Remote "origin" already exists');
        console.log(`   Current: ${remotes.split('\n')[0]}`);
      } else {
        execSync(`git remote add origin ${remoteUrl}`, { cwd: blogDir });
        console.log(`   ✅ Remote added: ${remoteUrl}`);
      }
      console.log();
    } catch (e) {
      console.log('   ⚠️  Could not set remote\n');
    }
    
    console.log('Step 6: Pushing to GitHub...');
    console.log('   Run these commands manually:');
    console.log(`   git branch -M main`);
    console.log(`   git push -u origin main`);
    console.log();
  } else {
    console.log('Step 5: GitHub setup (manual)\n');
    console.log('   To push to GitHub, run:');
    console.log('   1. Create repo at https://github.com/new');
    console.log(`   2. git remote add origin https://github.com/YOUR_USERNAME/${REPO_NAME}.git`);
    console.log('   3. git branch -M main');
    console.log('   4. git push -u origin main');
    console.log();
  }
  
  // Cloudflare Pages setup instructions
  console.log('☁️  Cloudflare Pages Deployment Setup\n');
  console.log('   1. Go to https://dash.cloudflare.com/ → Pages');
  console.log('   2. Create a project → Connect to Git');
  console.log(`   3. Select repository: ${githubUser || 'YOUR_USERNAME'}/${REPO_NAME}`);
  console.log('   4. Build settings:');
  console.log('      - Build command: npm run build');
  console.log('      - Build output directory: dist');
  console.log('   5. Add environment variables:');
  console.log('      - NODE_VERSION: 20');
  console.log('   6. Add custom domain: blog.ridethetide.site');
  console.log('   7. Save & Deploy\n');
  
  // GitHub Secrets
  console.log('🔐 GitHub Secrets (for CI/CD)\n');
  console.log('   Add these at: https://github.com/YOUR_USERNAME/ridethetide-blog/settings/secrets/actions');
  console.log('   - CLOUDFLARE_API_TOKEN (from https://dash.cloudflare.com/profile/api-tokens)');
  console.log('   - CLOUDFLARE_ACCOUNT_ID (from Cloudflare dashboard sidebar)\n');
  
  console.log('✅ Repository initialization complete!');
  console.log(`   Directory: ${blogDir}`);
  console.log('   Next: Push to GitHub and connect Cloudflare Pages');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const githubUser = args.find(a => a.startsWith('--github-user='))?.split('=')[1];
  
  if (!githubUser) {
    console.log('Usage: node scripts/init-repo.js --github-user=YOUR_USERNAME\n');
    console.log('Or run without --github-user for manual setup instructions.\n');
  }
  
  initRepo({ githubUser });
}

module.exports = { initRepo };
