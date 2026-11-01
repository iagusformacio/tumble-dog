import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

/** Lee las dimensiones de un PNG desde su cabecera IHDR. */
function pngSize(path) {
  const buf = readFileSync(path);
  assert.equal(buf.toString('latin1', 12, 16), 'IHDR', `${path} no es un PNG válido`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test('manifest.webmanifest válido: nombre, iconos existentes y ≤ 200 KB', () => {
  const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
  assert.equal(manifest.name, 'Tumble Dog');
  assert.equal(manifest.display, 'standalone');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
  const sizes = new Set();
  for (const icon of manifest.icons) {
    const path = icon.src.replace('./', '');
    assert.ok(existsSync(path), `falta el icono ${path}`);
    assert.ok(statSync(path).size <= 200 * 1024, `${path} pesa más de 200 KB`);
    const { width, height } = pngSize(path);
    assert.equal(width, height, `${path} no es cuadrado`);
    sizes.add(width);
  }
  assert.ok(sizes.has(192) && sizes.has(512), 'faltan los tamaños 192 y 512');
});

test('sw.js es un service worker cache-first con precache del juego', () => {
  const sw = readFileSync('sw.js', 'utf8');
  assert.match(sw, /caches\.open\(CACHE\)/);
  assert.match(sw, /addEventListener\('fetch'/);
  assert.match(sw, /caches\.match\(request\)/);
  for (const core of ['./index.html', './src/main.js', './manifest.webmanifest']) {
    assert.ok(sw.includes(`'${core}'`), `sw.js no precachea ${core}`);
  }
});

test('index.html enlaza el manifiesto y registra el service worker', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /<link rel="manifest" href="\.\/manifest\.webmanifest">/);
  assert.match(html, /navigator\.serviceWorker\.register\('\.\/sw\.js'\)/);
  assert.match(html, /name="theme-color"/);
  // El registro del SW va en script aparte (no módulo) para que bundle.py lo respete.
  const moduleScript = /<script type="module"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  assert.ok(moduleScript, 'falta el script type="module"');
  assert.ok(!moduleScript[1].includes('serviceWorker'), 'el SW no debe ir dentro del módulo');
});
