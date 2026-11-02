// I1: herramientas de revisión del tema «Dieta de Marcos» y capturas del juego.
// Comprueba que la captura sin navegador y la auditoría de sprites funcionan y
// que las capturas guardadas en docs/capturas/ existen y pesan poco.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const CAPTURAS = [
  'docs/capturas/titulo-marcos.png',
  'docs/capturas/ruta-campana.png',
  'docs/capturas/bar-la-taca-ronda1.png',
];

test('I1: la auditoría de sprites de marcos no encuentra referencias rotas', () => {
  const out = execFileSync(process.execPath, ['tools/audit_sprites.mjs', 'marcos'], { encoding: 'utf8' });
  assert.match(out, /tema: marcos · sprites mapeados: (\d+)/);
  assert.match(out, /sin sprite \(provisional por código\): 0/);
  assert.match(out, /mapeados a un fichero que no existe: 0/);
});

test('I1: las capturas del juego existen y no pesan más de 200 KB', () => {
  for (const path of CAPTURAS) {
    assert.ok(existsSync(path), `falta ${path}`);
    const bytes = readFileSync(path);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG', path);
    assert.ok(bytes.length > 10 * 1024 && bytes.length <= 200 * 1024, `${path}: ${bytes.length} bytes`);
  }
});

test('I1: capturas/README.md explica cómo regenerar las capturas', () => {
  const readme = readFileSync('docs/capturas/README.md', 'utf8');
  assert.match(readme, /tools\/shot\.mjs/);
  assert.match(readme, /@napi-rs\/canvas/);
});
