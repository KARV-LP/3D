// KARV · Guard de nomes proibidos (fornecedor)
// Falha o build se qualquer token proibido aparecer em arquivos de texto
// versionados ou no chunk JSON do GLB. Regra dura do projeto.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('../', import.meta.url);

// Tokens proibidos (case-insensitive). Manter minimalista e explícito.
const FORBIDDEN = ['wiler'];

// Extensões de texto a inspecionar.
const TEXT_EXT = new Set(['.json', '.js', '.mjs', '.html', '.htm', '.md', '.css', '.toml', '.yml', '.yaml']);

// Diretórios/arquivos ignorados (inclui este próprio guard, que contém os tokens).
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist']);
const SELF = 'scripts/guard-forbidden.mjs';

const rx = new RegExp(FORBIDDEN.join('|'), 'i');
const hits = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name));
      continue;
    }
    const abs = path.join(dir, entry.name);
    const rel = path.relative(fs.realpathSync(ROOT), abs).split(path.sep).join('/');
    if (rel === SELF) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (ext === '.glb') { scanGlb(abs, rel); continue; }
    if (!TEXT_EXT.has(ext)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    text.split(/\r?\n/).forEach((line, i) => {
      if (rx.test(line)) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
    });
  }
}

function scanGlb(abs, rel) {
  const glb = fs.readFileSync(abs);
  if (glb.toString('ascii', 0, 4) !== 'glTF') return;
  let offset = 12;
  while (offset < glb.length) {
    const length = glb.readUInt32LE(offset);
    const type = glb.toString('ascii', offset + 4, offset + 8);
    if (type === 'JSON') {
      const json = glb.toString('utf8', offset + 8, offset + 8 + length);
      if (rx.test(json)) hits.push(`${rel}: token proibido no chunk JSON do GLB`);
    }
    offset += 8 + length;
  }
}

walk(fs.realpathSync(ROOT));

if (hits.length) {
  console.error('❌ Guard KARV: token de fornecedor proibido encontrado:');
  for (const h of hits) console.error('   ' + h);
  console.error(`\nTokens proibidos: ${FORBIDDEN.join(', ')}`);
  process.exit(1);
}
console.log(`✅ Guard KARV: nenhum token proibido (${FORBIDDEN.join(', ')}) encontrado.`);
