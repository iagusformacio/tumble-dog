// A10 · Poses pendientes de los jefes de campaña (issue #57).
// A7 dio 5 poses por jefe; A10 completa el set de 10 (andar A/B, grito,
// victoria, retrato). El frame de andar B del presentador se derivó por código.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { SPRITE_FILES } from '../src/sprite-list.js';

const BASES = ['cocinero-plancha', 'presentador-bingo'];
const POSES = ['andar-a', 'andar-b', 'grito', 'victoria', 'retrato'];
const SPRITE_POSES = ['walkA', 'walkB', 'shout', 'win', 'portrait'];
const MAX_BYTES = 200 * 1024;
const pngPaths = BASES.flatMap((b) => POSES.map((p) => `assets/enemigos/${b}-${p}.png`));

test('A10: las 10 imágenes existen, son PNG y ninguna supera 200 KB', () => {
  assert.equal(pngPaths.length, 10);
  for (const path of pngPaths) {
    assert.ok(existsSync(path), `falta ${path}`);
    const size = statSync(path).size;
    assert.ok(size > 1024, `${path}: imagen vacía`);
    assert.ok(size <= MAX_BYTES, `${path}: ${size} bytes > 200 KB`);
    assert.equal(readFileSync(path).subarray(1, 4).toString(), 'PNG', `${path}: no es PNG`);
  }
});

test('A10: los 10 sprites están registrados y existen en disco', () => {
  for (const base of BASES) {
    for (const pose of SPRITE_POSES) {
      const key = `boss-${base}-${pose}`;
      const entry = SPRITE_FILES[key];
      assert.ok(entry, `falta ${key} en src/sprite-list.js`);
      const [src, w, h] = entry;
      assert.ok(w > 0 && h > 0, `${key}: dimensiones inválidas`);
      const file = src.replace('./', '');
      assert.ok(existsSync(file), `falta ${file}`);
      assert.ok(statSync(file).size > 512, `${file}: sprite vacío`);
    }
  }
});

test('A10: cada jefe de campaña tiene el set completo de 10 poses (A7 + A10)', () => {
  for (const base of BASES) {
    const keys = Object.keys(SPRITE_FILES).filter((k) => k.startsWith(`boss-${base}-`));
    assert.equal(keys.length, 10, `${base}: esperadas 10 poses, hay ${keys.length}`);
  }
});

test('A10: bloque propio en prepare_assets.py y prompts documentados', () => {
  const script = readFileSync('tools/prepare_assets.py', 'utf8');
  assert.ok(script.includes('A10 · Poses pendientes'), 'falta el bloque A10 en tools/prepare_assets.py');
  const prompts = readFileSync('assets/PROMPTS.md', 'utf8');
  for (const path of pngPaths) assert.ok(prompts.includes(path), `falta el prompt de ${path}`);
  assert.ok(prompts.includes('DERIVADA POR CÓDIGO'), 'falta la nota del cupo de imágenes agotado');
});
