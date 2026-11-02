// A3: fuentes ligeras, hojas de tres celdas y sprites presentes en el manifiesto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { SPRITE_FILES } from '../src/sprite-list.js';

const bases = ['bocata-lomo', 'cacahuete-saltarin', 'tostada-tomate', 'chupito'];
const keys = ['bocata', 'cacahuete', 'tostada', 'chupito'];
const sources = bases.flatMap(base => ['andar-a', 'derrotado'].map(p => `assets/enemigos/${base}-${p}.png`));
sources.push('assets/enemigos/paella-gigante-reposo.png', 'assets/enemigos/paella-gigante-derrotada.png');

test('A3: las diez imágenes originales y hojas caben en 200 KB', () => {
  const prompts = readFileSync('assets/PROMPTS.md', 'utf8');
  assert.equal(sources.length, 10);
  for (const path of [...sources, ...bases.map(base => `assets/enemigos/${base}-poses.png`)]) {
    const bytes = readFileSync(path);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG', path);
    assert.ok(bytes.length > 1024 && bytes.length <= 200 * 1024, `${path}: ${bytes.length} bytes`);
    if (sources.includes(path)) assert.ok(prompts.includes(path), `falta prompt: ${path}`);
    else {
      assert.equal(bytes.readUInt32BE(16), 960, path);
      assert.equal(bytes.readUInt32BE(20), 320, path);
    }
  }
});

test('A3: los sprites generados están registrados y existen', () => {
  const ids = keys.flatMap(key => ['walkA', 'walkB', 'stun', 'down'].map(pose => `${key}-${pose}`));
  ids.push(...['idle', 'walkA', 'walkB', 'down'].map(pose => `paella-${pose}`));
  for (const id of ids) {
    const entry = SPRITE_FILES[id];
    assert.ok(entry, `falta ${id}`);
    const [file, width, height] = entry;
    assert.ok(width > 0 && height > 0, id);
    assert.ok(statSync(file).size > 512, file);
  }
});
