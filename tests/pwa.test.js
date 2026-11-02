// Issue #105 · PWA: el manifiesto y el service worker tienen que ser válidos y
// estar cableados en index.html SIN rutas absolutas (GitHub Pages sirve el juego
// en /tumble-dog/, y ahí una ruta «/assets/…» apunta al dominio, no al proyecto).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const MANIFEST = JSON.parse(read('manifest.webmanifest'));
const INDEX = read('index.html');
const SW = read('sw.js');

/** Ancho/alto reales de un PNG (cabecera IHDR, big-endian). */
function pngDims(rel) {
  const buf = readFileSync(join(ROOT, rel));
  assert.equal(buf.subarray(1, 4).toString(), 'PNG', `${rel} no es un PNG`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), bytes: buf.length };
}

/** Ruta relativa del manifiesto/link → fichero en el repo (./ y ../ incluidos). */
function relToRepo(href) {
  assert.match(href, /^\.\//, `${href}: las rutas tienen que ser relativas («./…»)`);
  const clean = href.replace(/^\.\//, '').split('?')[0].split('#')[0];
  return join(ROOT, clean);
}

test('manifest.webmanifest: JSON válido y campos de pantalla completa horizontal', () => {
  assert.equal(MANIFEST.display, 'fullscreen');
  assert.equal(MANIFEST.orientation, 'landscape');
  assert.ok(MANIFEST.name && MANIFEST.short_name, 'falta name/short_name');
  assert.ok(/^\.\/$|^\.\//.test(MANIFEST.start_url), 'start_url relativa');
  assert.equal(MANIFEST.scope, './');
  assert.match(MANIFEST.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(MANIFEST.background_color, /^#[0-9a-f]{6}$/i);
  assert.equal(MANIFEST.lang, 'es');
});

test('manifest.webmanifest: los iconos existen, son PNG cuadrados y pesan poco', () => {
  const sizes = MANIFEST.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192'), 'falta el icono de 192 px');
  assert.ok(sizes.includes('512x512'), 'falta el icono de 512 px (recortado)');
  assert.ok(MANIFEST.icons.some((i) => i.purpose === 'maskable'), 'falta el icono maskable');
  for (const icon of MANIFEST.icons) {
    const path = relToRepo(icon.src);
    assert.ok(existsSync(path), `falta ${icon.src}`);
    const [w, h] = icon.sizes.split('x').map(Number);
    const dims = pngDims(icon.src);
    assert.equal(dims.w, w, `${icon.src}: el ancho no cuadra`);
    assert.equal(dims.h, h, `${icon.src}: el alto no cuadra`);
    assert.ok(dims.bytes <= 200 * 1024, `${icon.src}: ${dims.bytes} bytes`);
  }
});

test('index.html: arranca la PWA con links relativos y metas de móvil', () => {
  assert.match(INDEX, /<link rel="manifest" href="\.\/manifest\.webmanifest">/);
  assert.match(INDEX, /<meta name="viewport" content="[^"]*viewport-fit=cover/);
  assert.match(INDEX, /<meta name="theme-color" content="#[0-9a-f]{6}"/i);
  assert.match(INDEX, /<meta name="apple-mobile-web-app-capable" content="yes">/);
  assert.match(INDEX, /<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">/);
  const apple = INDEX.match(/<link rel="apple-touch-icon" href="([^"]+)">/);
  assert.ok(apple, 'falta apple-touch-icon');
  assert.ok(existsSync(relToRepo(apple[1])), 'el apple-touch-icon no existe');
  const fav = INDEX.match(/<link rel="icon" href="([^"]+)"/);
  assert.ok(fav, 'falta el favicon');
  assert.ok(existsSync(relToRepo(fav[1])), 'el favicon no existe');
  // Nada de rutas absolutas en el head: romperían el despliegue en /tumble-dog/.
  for (const m of INDEX.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^https?:/.test(url)) continue;
    assert.match(url, /^\.\//, `ruta que debería ser relativa: ${url}`);
  }
  // El script de arranque, tal y como lo busca tools/bundle.py y tests/touch.spec.js.
  assert.match(INDEX, /<script type="module" src="\.\/src\/main\.js"><\/script>/);
});

test('index.html: aviso de girar, botón de pantalla completa y safe-areas', () => {
  assert.match(INDEX, /#rotate\{[^}]*position:fixed[^}]*inset:0/);
  assert.match(INDEX, /body\.rotating #rotate\{display:flex\}/);
  assert.match(INDEX, /@keyframes td-turn/);
  assert.match(INDEX, /#fsbtn/);
  assert.match(INDEX, /#install/);
  // Zona segura respetada en el lienzo (padding del body) y en los controles.
  assert.match(INDEX, /body\{[^}]*padding:env\(safe-area-inset-top\)/);
  assert.match(INDEX, /\.stick\{[^}]*max\(14px,env\(safe-area-inset-left\)\)/);
  assert.match(INDEX, /\.levers\{[^}]*max\(14px,env\(safe-area-inset-right\)\)/);
  // El aviso de girar tapa el cartel viejo de los controles táctiles.
  assert.match(INDEX, /body\.rotating \.orientation-hint\{display:none\}/);
});

test('sw.js: worker clásico, con versión, rutas relativas y sin importar módulos', () => {
  assert.match(SW, /const VERSION = 'tumbledog-v\d+'/);
  assert.match(SW, /addEventListener\('install'/);
  assert.match(SW, /addEventListener\('activate'/);
  assert.match(SW, /addEventListener\('fetch'/);
  assert.ok(!/^\s*import\s/m.test(SW), 'el service worker no puede usar imports (se registra como clásico)');
  assert.ok(!/caches\.open\(`?\w+`?\)/.test(SW) || /VERSION/.test(SW), 'las cachés van por versión');
  const core = SW.match(/const CORE = \[([^\]]+)\]/)[1];
  const entries = core.match(/'[^']+'/g).map((s) => s.replace(/'/g, ''));
  assert.ok(entries.length >= 3, 'el precache tiene que cubrir index.html y el manifiesto');
  assert.ok(entries.includes('./index.html') && entries.includes('./manifest.webmanifest'));
  for (const e of entries) {
    assert.match(e, /^\.\//, `precache con ruta absoluta: ${e}`);
    assert.ok(existsSync(relToRepo(e)), `el worker cachearía un fichero que no existe: ${e}`);
  }
  // Las navegaciones van a la red primero: así un despliegue nuevo se ve al acto.
  assert.match(SW, /isNavigation\(request\)/);
  assert.match(SW, /cache: 'no-store'/);
});

test('src/main.js: registra el worker, la pantalla completa y el bloqueo de orientación', () => {
  const main = read('src/main.js');
  assert.match(main, /from '\.\/mobile\.js'/);
  assert.match(main, /createMobile\(\)/);
  assert.match(main, /mobile\.arm\(\)/);
  assert.match(main, /mobile\.attach\(\{ game, audio \}\)/);
  assert.match(main, /mobile\.blocked\(\)/); // el bucle espera a que giren el móvil
  const mod = read('src/mobile.js');
  assert.match(mod, /registerServiceWorker/);
  assert.match(mod, /webkitRequestFullscreen/);
  assert.match(mod, /orientation\)?\.?\.?lock|o\.lock, 'landscape'/s);
  assert.match(mod, /beforeinstallprompt/);
  assert.match(mod, /localStorage/);
});

test('tools/bundle.py sigue entendiendo los imports nuevos (norma 18)', () => {
  // Todos los imports de src/ tienen que ser relativos y con export simples.
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : (e.name.endsWith('.js') ? [p] : []);
  });
  for (const file of walk(join(ROOT, 'src'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/^import\s+(?:\{[^}]*\}|\w+)\s+from\s+'([^']+)';?/gm)) {
      assert.match(m[1], /^\.\.?\//, `${file}: import no relativo (${m[1]})`);
    }
    for (const m of src.matchAll(/^import\s+'([^']+)'/gm)) {
      assert.fail(`${file}: import de efecto (${m[1]}) no lo entiende el empaquetador`);
    }
  }
});

test('los iconos se pueden regenerar por código (script en tools/)', () => {
  const script = read('tools/make_icons.mjs');
  assert.match(script, /@napi-rs\/canvas/);
  assert.match(script, /--check/);
  const names = readdirSync(join(ROOT, 'assets', 'icons'));
  assert.deepEqual(names.sort(), ['apple-touch-icon.png', 'favicon.png', 'icon-192.png', 'icon-512.png']);
});
