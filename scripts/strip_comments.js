const fs = require('fs').promises;
const path = require('path');

const extsJs = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx']);
const extsCss = new Set(['.css', '.scss', '.less']);
const extsHtml = new Set(['.html', '.htm', '.svg']);

const excludedDirs = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.idea', '.vscode', 'scripts']);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    if (e.isDirectory()) {
      if (excludedDirs.has(e.name)) continue;
      files = files.concat(await walk(path.join(dir, e.name)));
    } else if (e.isFile()) {
      files.push(path.join(dir, e.name));
    }
  }
  return files;
}

function stripCssComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripHtmlCommentsAndInline(s) {
  // Process inline <script> and <style> first
  s = s.replace(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi, (m, attr, inner) => {
    if (!inner) return m;
    const cleaned = stripJsComments(inner);
    return `<script${attr || ''}>${cleaned}</script>`;
  });
  s = s.replace(/<style(\s[^>]*)?>([\s\S]*?)<\/style>/gi, (m, attr, inner) => {
    if (!inner) return m;
    const cleaned = stripCssComments(inner);
    return `<style${attr || ''}>${cleaned}</style>`;
  });
  // Remove HTML comments
  return s.replace(/<!--([\s\S]*?)-->/g, '');
}

function stripJsComments(str) {
  let out = '';
  const n = str.length;
  let i = 0;
  const modeStack = ['normal'];
  const exprDepth = [];

  while (i < n) {
    const ch = str[i];
    const nxt = i + 1 < n ? str[i + 1] : '';
    const top = modeStack[modeStack.length - 1];

    if (top === 'single') {
      if (ch === '\\') {
        out += ch;
        if (i + 1 < n) out += str[i + 1];
        i += 2;
        continue;
      }
      out += ch;
      if (ch === "'") modeStack.pop();
      i++;
      continue;
    }

    if (top === 'double') {
      if (ch === '\\') {
        out += ch;
        if (i + 1 < n) out += str[i + 1];
        i += 2;
        continue;
      }
      out += ch;
      if (ch === '"') modeStack.pop();
      i++;
      continue;
    }

    if (top === 'template') {
      if (ch === '\\') {
        out += ch;
        if (i + 1 < n) out += str[i + 1];
        i += 2;
        continue;
      }
      if (ch === '`') {
        out += ch;
        modeStack.pop();
        i++;
        continue;
      }
      if (ch === '$' && nxt === '{') {
        out += '${';
        modeStack.push('expr');
        exprDepth.push(0);
        i += 2;
        continue;
      }
      out += ch;
      i++;
      continue;
    }

    // normal or expr
    if (ch === '/' && nxt === '/') {
      i += 2;
      while (i < n && str[i] !== '\n') i++;
      if (i < n && str[i] === '\n') {
        out += '\n';
        i++;
      }
      continue;
    }

    if (ch === '/' && nxt === '*') {
      i += 2;
      while (i + 1 < n && !(str[i] === '*' && str[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    if (ch === "'") {
      out += ch;
      modeStack.push('single');
      i++;
      continue;
    }
    if (ch === '"') {
      out += ch;
      modeStack.push('double');
      i++;
      continue;
    }
    if (ch === '`') {
      out += ch;
      modeStack.push('template');
      i++;
      continue;
    }

    if (modeStack[modeStack.length - 1] === 'expr') {
      if (ch === '{') {
        exprDepth[exprDepth.length - 1]++;
        out += ch;
        i++;
        continue;
      }
      if (ch === '}') {
        if (exprDepth[exprDepth.length - 1] > 0) {
          exprDepth[exprDepth.length - 1]--;
          out += ch;
          i++;
          continue;
        } else {
          // end of expr, return to template
          modeStack.pop();
          exprDepth.pop();
          out += ch;
          i++;
          continue;
        }
      }
    }

    out += ch;
    i++;
  }
  return out;
}

async function processFile(file) {
  const ext = path.extname(file).toLowerCase();
  try {
    const raw = await fs.readFile(file, 'utf8');
    let updated = raw;
    if (extsJs.has(ext)) {
      updated = stripJsComments(raw);
    } else if (extsCss.has(ext)) {
      updated = stripCssComments(raw);
    } else if (extsHtml.has(ext)) {
      updated = stripHtmlCommentsAndInline(raw);
    } else {
      return false;
    }
    if (updated !== raw) {
      await fs.writeFile(file, updated, 'utf8');
      return true;
    }
  } catch (err) {
    // ignore
  }
  return false;
}

(async () => {
  const cwd = process.cwd();
  const all = await walk(cwd);
  const targets = all.filter(f => {
    const e = path.extname(f).toLowerCase();
    if (extsJs.has(e) || extsCss.has(e) || extsHtml.has(e)) return true;
    return false;
  });
  const changed = [];
  for (const t of targets) {
    const ok = await processFile(t);
    if (ok) changed.push(t);
  }
  console.log('Files changed:', changed.length);
  for (const c of changed) console.log(' -', path.relative(cwd, c));
})();
