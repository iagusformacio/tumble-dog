// Issue #105 · móvil: pantalla completa, aviso de girar y PWA instalable.
// Se emula un teléfono (táctil, viewport de móvil) en horizontal y en vertical, y
// se comprueba además el manifiesto y el service worker POR HTTP, con el servidor
// real de tests/serve.js — el mismo árbol que publica GitHub Pages en /tumble-dog/.
import { test, expect } from '@playwright/test';

const LANDSCAPE = { width: 844, height: 390 };  // teléfono 20:9 girado
const PORTRAIT = { width: 390, height: 844 };   // el mismo teléfono, en vertical

async function phone(browser, viewport) {
  const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Las fuentes van a Google: sin conexión (o en un sandbox sin internet) fallan
    // y no tienen nada que ver con el juego. Los errores del JS sí cuentan.
    if (/fonts\.g(oogleapis|static)|net::ERR_/.test(text)) return;
    errors.push(`console.error: ${text}`);
  });
  await page.goto('/');
  await page.waitForFunction(() => !!window.__tumbleDogMobile, null, { timeout: 20_000 });
  // El juego arranca tras los sprites y la fuente; en máquinas lentas se espera
  // aquí para que las comprobaciones no pisen la pantalla de carga.
  await page.waitForFunction(() => !!window.__tumbleDog, null, { timeout: 20_000 });
  return { context, page, errors };
}

const painted = (page) => page.evaluate(() => {
  const c = document.getElementById('game');
  if (!c || !c.width || !c.height) return false;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const seen = new Set();
  for (let i = 0; i < d.length; i += 4 * 97) {
    seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    if (seen.size > 1) return true;
  }
  return false;
});

test('horizontal: el juego llena el alto, no hay aviso y un toque pide pantalla completa', async ({ browser }, testInfo) => {
  const { context, page, errors } = await phone(browser, LANDSCAPE);

  // Nada de «gira el móvil»: estamos en horizontal, y el móvil se reconoce como tal.
  await expect(page.locator('#rotate')).toHaveCSS('display', 'none');
  await expect.poll(() => page.evaluate(() => ({ ...(window.__tumbleDogMobile.state ? window.__tumbleDogMobile.state() : {}) })))
    .toMatchObject({ blocked: false, touch: true, portrait: false });
  // (El reloj del juego solo avanza con requestAnimationFrame: en headless muy
  // lentos se espera con margen.)
  await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.stateT > 0), { timeout: 25_000 }).toBe(true);

  // El lienzo aprovecha la pantalla: ocupa todo el alto y centra el 16:9.
  const box = await page.locator('#game').boundingBox();
  expect(Math.abs(box.height - LANDSCAPE.height)).toBeLessThanOrEqual(1);
  expect(box.width).toBeGreaterThan(LANDSCAPE.height * (16 / 9) - 2);
  expect(box.width).toBeLessThanOrEqual(LANDSCAPE.width);
  expect(await painted(page)).toBe(true);

  // El primer toque del título pide la pantalla completa; si el navegador la niega
  // (o no contesta, como algún headless) no puede quedar ni un error por delante.
  await page.touchscreen.tap(LANDSCAPE.width / 2, LANDSCAPE.height / 2);
  const fs = await page.evaluate(() => {
    const s = window.__tumbleDogMobile.state();
    return { attempts: s.attempts, lastFs: s.lastFs, pending: s.pendingFs, fullscreen: !!document.fullscreenElement };
  });
  expect(fs.attempts, 'el toque tenía que pedir la pantalla completa').toBe(1);
  if (fs.lastFs) expect(typeof fs.lastFs.ok).toBe('boolean');
  if (fs.fullscreen) expect(fs.attempts).toBe(1);
  // La tecla F sale y entra, sin errores.
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(300);

  await page.screenshot({ path: testInfo.outputPath('canvas-movil-horizontal.png') });
  expect(errors, `errores de JS en móvil horizontal:\n${errors.join('\n')}`).toEqual([]);
  await context.close();
});

test('vertical: aviso de girar a pantalla completa que bloquea y pausa el juego', async ({ browser }, testInfo) => {
  const { context, page, errors } = await phone(browser, PORTRAIT);

  await expect(page.locator('#rotate')).toBeVisible();
  await expect(page.locator('#rotate')).toHaveCSS('position', 'fixed');
  await expect(page.locator('#rotate h2')).toContainText('GIRA EL MÓVIL');
  await expect(page.locator('#rotate .phone')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/rotating/);
  // El aviso tapa el juego: lo que recibe el toque es la propia capa.
  const hit = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return el ? el.closest('#rotate') !== null : false;
  });
  expect(hit, 'el aviso tiene que cubrir toda la pantalla').toBe(true);
  // El mini-cartel viejo de los controles queda tapado por el aviso.
  await expect(page.locator('.orientation-hint')).toBeHidden();

  // Y el juego está parado de verdad: el reloj interno no avanza (en vertical no
  // llega ni a arrancar, porque el aviso se monta antes del primer fotograma).
  const t1 = await page.evaluate(() => window.__tumbleDog.g.stateT);
  expect(t1, 'en vertical el título ni siquiera se anima').toBeLessThanOrEqual(0.02);
  await page.touchscreen.tap(PORTRAIT.width / 2, PORTRAIT.height / 2);
  await page.waitForTimeout(600);
  const t2 = await page.evaluate(() => window.__tumbleDog.g.stateT);
  expect(t2, 'en vertical el juego no avanza').toBe(t1);
  expect(await page.evaluate(() => window.__tumbleDog.g.state), 'un toque en el aviso no empieza la partida').toBe('title');
  expect(await page.evaluate(() => window.__tumbleDog.g.paused)).toBe(true);
  expect(await page.evaluate(() => window.__tumbleDogMobile.state().blocked)).toBe(true);

  await page.screenshot({ path: testInfo.outputPath('canvas-movil-vertical.png') });

  // Girar el teléfono quita el aviso y el juego vuelve a andar. (El toque de arriba
  // sí pudo poner la ventana a pantalla completa: hay que salir para redimensionar.)
  // (El propio navegador puede tardar en contestar a exitFullscreen: no se espera,
  // pero sí se deja que salga antes de redimensionar la ventana.)
  await page.evaluate(() => { try { const p = document.exitFullscreen && document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); } catch { /* sin pantalla completa */ } });
  await page.waitForFunction(() => document.fullscreenElement === null, null, { timeout: 4_000 }).catch(() => {});
  await page.waitForTimeout(150);
  await page.setViewportSize(LANDSCAPE);
  await expect(page.locator('#rotate')).toHaveCSS('display', 'none');
  await expect.poll(() => page.evaluate((from) => window.__tumbleDog.g.stateT > from, t2), { timeout: 25_000 }).toBe(true);
  expect(await page.evaluate(() => window.__tumbleDog.g.paused)).toBe(false);

  expect(errors, `errores de JS en móvil vertical:\n${errors.join('\n')}`).toEqual([]);
  await context.close();
});

test('PWA: manifiesto servido con su tipo, iconos que existen y worker que registra', async ({ browser }, testInfo) => {
  const { context, page, errors } = await phone(browser, LANDSCAPE);

  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('fullscreen');
  expect(manifest.orientation).toBe('landscape');
  for (const icon of manifest.icons) {
    const url = new URL(icon.src, page.url()).pathname;
    const res = await page.request.get(url);
    expect(res.status(), `${icon.src} no se sirve`).toBe(200);
  }
  const sw = await page.request.get('/sw.js');
  expect(sw.status()).toBe(200);
  expect(sw.headers()['content-type']).toMatch(/javascript/);

  // El worker queda activo y con el ámbito de la carpeta del juego.
  const reg = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    return { scope: r.scope, active: !!r.active, scriptURL: r.active && r.active.scriptURL };
  });
  expect(reg.active).toBe(true);
  expect(reg.scope).toBe(new URL('/', page.url()).href);
  expect(reg.scriptURL).toMatch(/\/sw\.js$/);

  // Y cachea lo suyo (manifiesto, iconos, módulos y sprites) para poder jugar offline.
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    let n = 0;
    for (const k of keys) n += (await (await caches.open(k)).keys()).length;
    return { n, keys };
  });
  expect(cached.keys.some((k) => /^tumbledog-v\d+-(core|assets)$/.test(k)), `cachés: ${cached.keys.join(',')}`).toBe(true);

  await page.screenshot({ path: testInfo.outputPath('canvas-movil-pwa.png') });
  expect(errors, `errores de JS con la PWA:\n${errors.join('\n')}`).toEqual([]);
  await context.close();
});

test('sin conexión: el juego arranca desde la caché del service worker', async ({ browser }) => {
  const context = await browser.newContext({ viewport: LANDSCAPE, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForFunction(() => !!window.__tumbleDog, null, { timeout: 25_000 });
  // Recarga controlada por el worker: así los módulos y los sprites entran en la caché.
  await page.reload();
  await page.waitForFunction(() => !!window.__tumbleDogMobile, null, { timeout: 25_000 });
  await expect
    .poll(async () => page.evaluate(async () => {
      const keys = await caches.keys();
      let n = 0;
      for (const k of keys) n += (await (await caches.open(k)).keys()).length;
      return n;
    }), { timeout: 20_000 })
    .toBeGreaterThan(20);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => { /* sin red: el documento viene de la caché */ });
  const ok = await page.evaluate(() => new Promise((resolve) => {
    const t0 = Date.now();
    const check = () => {
      const c = document.getElementById('game');
      const painted = !!(c && c.width > 0 && window.__tumbleDogMobile);
      if (painted || Date.now() - t0 > 12_000) resolve(painted);
      else requestAnimationFrame(check);
    };
    check();
  }));
  expect(ok, 'el juego tiene que arrancar sin conexión').toBe(true);
  await context.setOffline(false);
  await context.close();
});
