// A2: enemigos 1-4 del tema «Dieta de Marcos» y jefe bocata gigante.
// Comprueba que las fuentes pesan poco, que las hojas son 3×1 coherentes, que
// los sprites están registrados/existen y que el generador no pierde entradas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { SPRITE_FILES } from '../src/sprite-list.js';

const bases = ['bocadillo-calamares', 'carajillo', 'tortilla', 'cafe-con-leche'];
const keys = ['calamares', 'carajillo', 'tortilla', 'cafe'];
const boss = 'jefe-bocata-gigante';

const originals = [
  ...bases.map((b) => `assets/enemigos/${b}-andar-a.png`),
  ...bases.map((b) => `assets/enemigos/${b}-derrotado.png`),
  `assets/enemigos/${boss}-reposo.png`,
  `assets/enemigos/${boss}-derrotado.png`,
];
const sheets = [
  ...bases.map((b) => `assets/enemigos/${b}-poses.png`),
  `assets/enemigos/${boss}-poses.png`,
];

test('A2: las diez imágenes originales y las hojas caben en 200 KB', () => {
  assert.equal(originals.length, 10, 'son las diez imágenes del cupo');
  const prompts = readFileSync('assets/PROMPTS.md', 'utf8');
  for (const path of [...originals, ...sheets]) {
    const bytes = readFileSync(path);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG', path);
    assert.ok(bytes.length > 1024 && bytes.length <= 200 * 1024, `${path}: ${bytes.length} bytes`);
    assert.ok(prompts.includes(path.split('/').pop()), `falta prompt: ${path}`);
  }
});

test('A2: las hojas de poses son de tres celdas cuadradas', () => {
  for (const path of sheets.slice(0, bases.length)) {
    const bytes = readFileSync(path);
    const w = bytes.readUInt32BE(16);
    const h = bytes.readUInt32BE(20);
    assert.equal(w, h * 3, `${path}: ${w}×${h} no es 3×1 con celdas cuadradas`);
  }
});

test('A2: los sprites de los enemigos 1-4 y del jefe están registrados y existen', () => {
  const ids = keys.flatMap((key) => ['walkA', 'walkB', 'stun', 'down'].map((pose) => `dm-${key}-${pose}`));
  ids.push('dm-bocata-reposo', 'dm-bocata-down');
  for (const id of ids) {
    const entry = SPRITE_FILES[id];
    assert.ok(entry, `falta ${id}`);
    const [file, width, height] = entry;
    assert.ok(width > 0 && height > 0, id);
    assert.ok(statSync(file).size > 512, file);
  }
});

test('A2: prepare_assets.py no deja fuera entradas ya registradas', () => {
  // El generador reescribe src/sprite-list.js entero: si alguna entrada viva no
  // la produce él, la borraría sin avisar. Comprueba que toda entrada externa al
  // manifiesto (fondos, jefes propios, sprites sueltos) está en EXTERNAL_SPRITES.
  const script = readFileSync('tools/prepare_assets.py', 'utf8');
  const manifest = JSON.parse(readFileSync('assets/sprites/manifest.json', 'utf8'));
  const external = [...script.matchAll(/^ {4}'([\w-]+)': \(/gm)].map((m) => m[1]);
  const missing = Object.keys(SPRITE_FILES).filter((k) => !(k in manifest) && !external.includes(k));
  assert.deepEqual(missing, [], `entradas que prepare_assets.py borraría: ${missing.join(', ')}`);
});
