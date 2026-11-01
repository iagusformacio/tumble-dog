import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const GENERATED = [
  'lider-eterno-oposicion-andar.png',
  'lider-eterno-oposicion-andar-b.png',
  'lider-eterno-oposicion-aspirado.png',
  'baron-regional-andar.png',
  'baron-regional-andar-b.png',
  'baron-regional-aspirado.png',
  'activista-municipal-andar.png',
  'activista-municipal-aspirado.png',
  'diputado-grunon-andar.png',
  'diputado-grunon-aspirado.png',
];
const SHEETS = [
  'lider-eterno-oposicion-poses.png',
  'baron-regional-poses.png',
  'activista-municipal-poses.png',
  'diputado-grunon-poses.png',
];

function pngSize(buffer) {
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('ART-3: diez imágenes originales y cuatro hojas derivadas, PNG ≤200 KB y prompts anotados', () => {
  const prompts = readFileSync('assets/PROMPTS.md', 'utf8');
  for (const name of [...GENERATED, ...SHEETS]) {
    const path = `assets/enemigos/${name}`;
    assert.ok(existsSync(path), `falta ${path}`);
    const stat = statSync(path);
    assert.ok(stat.size <= 200 * 1024, `${path} supera 200 KB`);
    const size = pngSize(readFileSync(path));
    assert.ok(size.width > 0 && size.height > 0);
    assert.ok(prompts.includes(path), `falta prompt de ${path}`);
  }
  assert.equal(GENERATED.length, 10);
});
