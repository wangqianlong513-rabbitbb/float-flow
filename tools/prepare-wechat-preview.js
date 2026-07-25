#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const buildDir = path.join(projectRoot, 'build', 'wechatgame');
const sourceOpenData = path.join(projectRoot, 'openDataContext');
const targetOpenData = path.join(buildDir, 'openDataContext');
const gameJsonPath = path.join(buildDir, 'game.json');
const maxPreviewBytes = 4 * 1024 * 1024;

function assertDirectory(dir, label) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`${label} not found: ${dir}`);
  }
}

function copyDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name.endsWith('.md')) {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

function formatKb(bytes) {
  return `${Math.ceil(bytes / 1024)}KB`;
}

assertDirectory(buildDir, 'WeChat build directory');
assertDirectory(sourceOpenData, 'Source openDataContext directory');

// Cocos' optional open data template adds an engine/runtime and demo avatar. The
// project already has a tiny custom openDataContext, so replace the generated one.
fs.rmSync(targetOpenData, { recursive: true, force: true });
copyDirectory(sourceOpenData, targetOpenData);

if (fs.existsSync(gameJsonPath)) {
  const gameJson = JSON.parse(fs.readFileSync(gameJsonPath, 'utf8'));
  gameJson.openDataContext = 'openDataContext';
  fs.writeFileSync(gameJsonPath, `${JSON.stringify(gameJson, null, 2)}\n`);
}

const files = walkFiles(buildDir);
const totalBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const largest = files
  .map((file) => ({ file: path.relative(buildDir, file), size: fs.statSync(file).size }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 8);

console.log(`Wechat build source size: ${formatKb(totalBytes)} / 4096KB (${totalBytes} bytes)`);
for (const item of largest) {
  console.log(`${String(formatKb(item.size)).padStart(8)}  ${item.file}`);
}

if (totalBytes > maxPreviewBytes) {
  process.exitCode = 1;
  console.error(`Still exceeds WeChat preview limit by ${formatKb(totalBytes - maxPreviewBytes)}.`);
}
