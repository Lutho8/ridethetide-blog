const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "standalone.html");
const outDir = path.join(__dirname, "dist");
const out = path.join(outDir, "index.html");

if (!fs.existsSync(src)) {
  console.error("standalone.html is missing");
  process.exit(1);
}
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, out);
console.log("Own the Room Lab built to dist/index.html");
