// I2 (#95) y #101 · Prueba en navegador headless de la música de «Dieta de Marcos».
// Comprueba con elementos <audio> reales que la canción aportada suena partida
// en trozos por escena: el título arranca enseguida tras el primer gesto, cada
// bar pide su trozo (y solo el suyo), el siguiente se precarga y el modo ARCADE
// no descarga ninguno.
import { test, expect } from '@playwright/test';

const info = (page) => page.evaluate(() => window.__tumbleDogAudio.info());
const gameState = (page) => page.evaluate(() => window.__tumbleDog.g.state);
const mp3s = (page) => page.evaluate(() => performance.getEntriesByType('resource')
  .map((r) => r.name).filter((n) => n.endsWith('.mp3')).map((n) => n.split('/').slice(-2).join('/')));

test('la canción suena por trozos de escena, sin descargar la canción entera', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`); });

  await page.goto('/');
  await expect(page.locator('#game')).toBeVisible();
  await page.waitForFunction(() => !!window.__tumbleDogAudio && !!window.__tumbleDog);
  await page.waitForTimeout(600); // deja que arranque el título

  // 0) Tumble Dog (ARCADE) sigue con música sintetizada y no descarga nada.
  expect((await info(page)).source).toBe('synth');
  expect(await mp3s(page), 'Tumble Dog no usa trozos de canción').toEqual([]);

  // 1) Título de Dieta de Marcos: primer gesto → suena el trozo del título.
  //    Requisito de #101: en menos de 1 s desde el gesto.
  const t0 = Date.now();
  await page.keyboard.press('ArrowRight'); // cambia de juego + desbloquea el audio
  await page.evaluate(() => window.__tumbleDogAudio.unlock());
  await expect.poll(async () => (await info(page)).source, { timeout: 5_000 }).toBe('file');
  await expect.poll(async () => (await info(page)).time, { timeout: 5_000 }).toBeGreaterThan(0.05);
  expect(Date.now() - t0, 'el título suena enseguida').toBeLessThan(1_000);
  let a = await info(page);
  expect(a.section).toBe('title');
  expect(a.file).toBe('title');
  expect(a.playing).toBe(true);
  expect(await mp3s(page), 'solo se descarga el trozo del título').toEqual(['dieta-de-marcos/01-titulo.mp3']);

  // Fundido de entrada hasta el volumen del tema.
  await expect.poll(async () => (await info(page)).volume, { timeout: 6_000 }).toBeGreaterThan(0.2);

  // 2) Campaña → pantalla de ruta: se precarga el trozo del primer bar.
  await page.keyboard.press('Space');
  await expect.poll(async () => gameState(page), { timeout: 10_000 }).toBe('route');
  await expect.poll(async () => (await info(page)).cached, { timeout: 10_000 })
    .toContain('campaign-la-taca');

  // 3) Primera fase del Bar La Taca: suena su trozo (no el del título).
  await page.keyboard.press('Space');
  await expect.poll(async () => gameState(page), { timeout: 15_000 }).toMatch(/intro|play/);
  await expect.poll(async () => (await info(page)).section, { timeout: 10_000 }).toBe('campaign-la-taca');
  a = await info(page);
  expect(a.source).toBe('file');
  expect(a.playing).toBe(true);
  await expect.poll(async () => (await info(page)).time, { timeout: 10_000 }).toBeGreaterThan(0.25);
  expect(await mp3s(page)).toContain('dieta-de-marcos/02-taca.mp3');
  expect(await mp3s(page), 'la canción entera no se descarga nunca').not.toContain('dieta-de-marcos/dieta-de-marcos.mp3');

  // Captura del canvas en juego (va al artefacto del CI, norma 16).
  await page.locator('#game').screenshot({ path: testInfo.outputPath('canvas.png') });

  // 4) Jefes de bar: trozo propio, algo más rápido.
  await page.evaluate(() => window.__tumbleDogAudio.music('campaign-jefes'));
  await expect.poll(async () => (await info(page)).section, { timeout: 5_000 }).toBe('campaign-jefes');
  a = await info(page);
  expect(a.source).toBe('file');
  expect(a.file).toBe('campaign-jefes');
  expect(a.rate, 'los jefes van algo más rápidos').toBeGreaterThan(1);
  expect(a.playing).toBe(true);
  expect(await mp3s(page)).toContain('dieta-de-marcos/06-jefes.mp3');

  // 5) Tecla M: silencio total (también en los trozos precargados) y vuelta.
  await page.keyboard.press('KeyM');
  await expect.poll(async () => (await info(page)).muted, { timeout: 5_000 }).toBe(true);
  const muted = await page.evaluate(() => [...document.querySelectorAll('audio')].every((el) => el.muted));
  expect(muted, 'todos los trozos quedan en silencio con M').toBe(true);
  await page.keyboard.press('KeyM');
  await expect.poll(async () => (await info(page)).muted, { timeout: 5_000 }).toBe(false);

  // 6) Veredicto.
  expect((await info(page)).source).toBe('file');
  expect(errors, `errores de JS detectados:\n${errors.join('\n')}`).toEqual([]);
});

test('el modo ARCADE de Dieta de Marcos no descarga trozos de canción', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.__tumbleDogAudio && !!window.__tumbleDog);
  await page.keyboard.press('ArrowRight'); // tema «marcos»
  await page.keyboard.press('ArrowDown'); // modo ARCADE
  await page.keyboard.press('Space');
  await expect.poll(async () => gameState(page), { timeout: 15_000 }).toMatch(/intro|play/);
  await page.waitForTimeout(800);
  const a = await info(page);
  expect(a.section, 'ARCADE usa las secciones clásicas').toMatch(/stage|boss/);
  expect(a.source, 'ARCADE no usa trozos: sintetizador').toBe('synth');
  expect(a.cached, 'ARCADE no precarga trozos').toEqual([]);
  expect(await mp3s(page), 'ARCADE no descarga mp3').toEqual([]);
});
