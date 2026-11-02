#!/usr/bin/env node
// Auditoría del mapeo de sprites de un tema: recorre `spritesWanted` (lo que el
// motor pedirá) y `sprites` (el mapeo ya conectado) y avisa de:
//   - nombres canónicos sin sprite (el motor dibujará el provisional por código)
//   - valores mapeados que no existen en assets/sprites/ ni en assets/enemigos/
//
// Uso: node tools/audit_sprites.mjs [tema]   (por defecto: marcos)
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const wanted = process.argv[2] || 'marcos';

const { listThemes } = await import('../src/themes/index.js');
const { SPRITE_FILES } = await import('../src/sprite-list.js');

const entry = listThemes().find((t) => t.id === wanted) || listThemes()[0];
const theme = entry.theme;
const declared = { ...(theme.spritesWanted || {}), ...(theme.sprites || {}) };

const missingCanonical = Object.keys(theme.spritesWanted || {}).filter((k) => !declared[k]);
const brokenFiles = [];
for (const [canonical, sprite] of Object.entries(declared)) {
  const file = SPRITE_FILES[sprite] && SPRITE_FILES[sprite][0];
  const onDisk = file
    ? existsSync(join(ROOT, file.replace('./', '')))
    : existsSync(join(ROOT, 'assets/enemigos', sprite + '.png'));
  if (!onDisk) brokenFiles.push(`${canonical} → ${sprite}`);
}

const total = Object.keys(declared).length;
console.log(`tema: ${entry.id} · sprites mapeados: ${total}`);
console.log(`  sin sprite (provisional por código): ${missingCanonical.length}`);
for (const k of missingCanonical) console.log('    · ' + k);
console.log(`  mapeados a un fichero que no existe: ${brokenFiles.length}`);
if (!total) console.log('  (este tema usa los sprites canónicos de assets/sprites/ sin remapear)');
for (const k of brokenFiles) console.log('    · ' + k);

if (brokenFiles.length) process.exit(1);
