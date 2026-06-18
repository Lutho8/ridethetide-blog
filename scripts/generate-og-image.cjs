/**
 * OG Image Generator
 *
 * Generates 1200x630 PNG OG images for articles using Sharp.
 *
 * Usage: node scripts/generate-og-image.cjs "Article Title" public/og/article-slug.jpg
 *
 * Requires: sharp (already in package.json dependencies)
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  width: 1200,
  height: 630,
  bgColor: { r: 15, g: 23, b: 42 }, // #0F172A
  accentColor: { r: 30, g: 41, b: 59 }, // #1E293B
  textColor: { r: 255, g: 255, b: 255 },
  subtitleColor: { r: 148, g: 163, b: 184 }, // #94A3B8
  maxTitleLength: 60,
};

function wrapTitle(title, maxCharsPerLine) {
  const words = title.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + word).length > maxCharsPerLine) {
      lines.push(current.trim());
      current = word + ' ';
    } else {
      current += word + ' ';
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

async function generateOGImage(title, outputPath) {
  if (!title || !outputPath) {
    console.error('Usage: node scripts/generate-og-image.cjs "Article Title" public/og/article-slug.jpg');
    process.exit(1);
  }

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Error: sharp is not installed. Please install it:');
    console.error('  npm install sharp');
    console.error('Or add it to devDependencies in package.json and run npm install.');
    process.exit(1);
  }

  console.log('Generating OG image...');
  console.log('  Title: ' + title);
  console.log('  Output: ' + outputPath);

  const { width, height, bgColor, accentColor, textColor, subtitleColor } = CONFIG;

  // Create a dark blue background
  const baseImage = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: bgColor,
    },
  }).png();

  // Generate hexagon overlay using SVG
  const hexSize = 40;
  const hexHeight = hexSize * Math.sqrt(3);
  let hexagons = '';
  for (let row = 0; row < height / hexHeight + 2; row++) {
    for (let col = 0; col < width / (hexSize * 1.5) + 2; col++) {
      const x = col * hexSize * 1.5 + (row % 2 === 1 ? hexSize * 0.75 : 0);
      const y = row * hexHeight * 0.5;
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        points.push((x + hexSize * Math.cos(angle)) + ',' + (y + hexSize * Math.sin(angle)));
      }
      hexagons += '<polygon points="' + points.join(' ') + '" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>';
    }
  }

  const hexSvg = '<svg width="' + width + '" height="' + height + '" xmlns="http://www.w3.org/2000/svg">' + hexagons + '</svg>';

  // Title text
  const titleLines = wrapTitle(title, 30);
  const lineHeight = 56;
  const startY = height / 2 - ((titleLines.length - 1) * lineHeight) / 2 - 20;

  let titleText = '';
  titleLines.forEach((line, i) => {
    titleText += '<text x="' + (width / 2) + '" y="' + (startY + i * lineHeight) + '" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">' + escapeXml(line) + '</text>';
  });

  // Subtitle and brand
  const subtitleText = '<text x="' + (width / 2) + '" y="' + (height - 60) + '" font-family="Arial, sans-serif" font-size="24" fill="#94A3B8" text-anchor="middle">Peptide South Africa</text>';
  const topLine = '<line x1="100" y1="80" x2="' + (width - 100) + '" y2="80" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>';

  const svgOverlay = '<svg width="' + width + '" height="' + height + '" xmlns="http://www.w3.org/2000/svg">' + hexSvg + topLine + titleText + subtitleText + '</svg>';

  try {
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { ...bgColor, alpha: 1 },
      },
    })
      .composite([
        { input: Buffer.from(hexSvg), blend: 'over' },
        { input: Buffer.from(svgOverlay), blend: 'over' },
      ])
      .png()
      .toFile(outputPath);

    console.log('OG image saved: ' + outputPath);
  } catch (e) {
    console.error('Failed to generate OG image: ' + e.message);
    process.exit(1);
  }
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const title = args[0];
  const outputPath = args[1];
  generateOGImage(title, outputPath).catch(console.error);
}

module.exports = { generateOGImage };
