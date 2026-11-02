// A6 · Arte del jefe final de la campaña (issue #57): El Jefe del Bar, 10 poses.
// Comprueba el cupo, el límite de 200 KB, el registro de sprites y los prompts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { SPRITE_FILES } from '../src/sprite-list.js';

const POSES = ['reposo', 'andar-a', 'andar-b', 'cucharonazo', 'grito', 'herido', 'derrotado', 'enfadado', 'victoria', 'retrato'];
const SPRITE_POSES = ['idle', 'walkA', 'walkB', 'attack', 'shout', 'stun', 'down', 'angry', 'win', 'portrait'];
const MAX_BYTES = 200 * 1024;

const pngPaths = POSES.map((p) => `assets/enemigos/jefe-bar-${p}.png`);

test('A6: las 10 imágenes existen y ninguna supera 200 KB', () => {
  assert.equal(pngPaths.length, 10);
  for (const path of pngPaths) {
    assert.ok(existsSync(path), `falta ${path}`);
    const size = statSync(path).size;
    assert.ok(size > 1024, `${path}: imagen vacía`);
    assert.ok(size <= MAX_BYTES, `${path}: ${size} bytes > 200 KB`);
    assert.equal(readFileSync(path).subarray(1, 4).toString(), 'PNG', `${path}: no es PNG`);
  }
});

test('A6: los 10 sprites están registrados y existen en disco', () => {
  for (const pose of SPRITE_POSES) {
    const key = `boss-jefe-bar-${pose}`;
    const entry = SPRITE_FILES[key];
    assert.ok(entry, `falta ${key} en src/sprite-list.js`);
    const [src, w, h] = entry;
    assert.ok(w > 0 && h > 0, `${key}: dimensiones inválidas`);
    const file = src.replace('./', '');
    assert.ok(existsSync(file), `falta ${file}`);
    assert.ok(statSync(file).size > 512, `${file}: sprite vacío`);
  }
});

test('A6: el bloque propio está en prepare_assets.py y los prompts en PROMPTS.md', () => {
  const script = readFileSync('tools/prepare_assets.py', 'utf8');
  assert.ok(script.includes('A6 · Jefe final'), 'falta el bloque A6 en tools/prepare_assets.py');
  const prompts = readFileSync('assets/PROMPTS.md', 'utf8');
  for (const path of pngPaths) assert.ok(prompts.includes(path), `falta el prompt de ${path}`);
});
