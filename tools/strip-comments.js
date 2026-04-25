#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();

const JS_EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx']);
const CSS_EXTS = new Set(['.css', '.scss']);
const HTML_EXTS = new Set(['.html', '.vue']);

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of list) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) results.push(...walk(full));
    else if (ent.isFile()) results.push(full);
  }
  return results;
}

function stripJSComments(src) {
  // Remove block comments first
  let out = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove line comments but avoid matching 'http://', 'https://' and comments inside strings
  // We match '//' when it's at line-start or preceded by a character that is NOT a quote/backtick/colon
  out = out.replace(/(^|[^:\"'`])\/\/.*$/gm, '$1');
  return out;
}

function stripCSSComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripHTMLComments(src) {
  return src.replace(/<!--([\s\S]*?)-->/g, '');
}

function processFile(file) {
  const ext = path.extname(file).toLowerCase();
  try {
    const src = fs.readFileSync(file, 'utf8');
    let out = src;
    if (JS_EXTS.has(ext)) out = stripJSComments(src);
    else if (CSS_EXTS.has(ext)) out = stripCSSComments(src);
    else if (HTML_EXTS.has(ext)) out = stripHTMLComments(src);
    else return false;
    if (out !== src) {
      fs.writeFileSync(file, out, 'utf8');
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to process', file, err && err.message);
    return false;
  }
}

function main() {
  const targets = ['src', 'tests'];
  const files = [];
  for (const t of targets) {
    const dir = path.join(root, t);
    if (!fs.existsSync(dir)) continue;
    files.push(...walk(dir));
  }
  let changed = 0;
  for (const f of files) {
    if (processFile(f)) changed++;
  }
  console.log(`Processed ${files.length} files, modified ${changed} files.`);
}

if (require.main === module) main();
