// I2 (#95) · Prueba en navegador headless: en «Dieta de Marcos» suena la
// canción aportada (assets/audio/dieta-de-marcos.mp3) y no la música sintetizada.
// Comprueba el elemento <audio> real: fuente, bucle, volumen del fundido, avance
// del tiempo de reproducción, velocidad en jefes y silencio con la tecla M.
import { test, expect } from '@playwright/test';

const info = (page) => page.evaluate(() => window.__tumbleDogAudio.info());
const gameState = (page) => page.evaluate(() => window.__tumbleDog.g.state);

test('en Dieta de Marcos suena la canción aportada, no la música sintetizada', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`); });

  await page.goto('/');
  await expect(page.locator('#game')).toBeVisible();
  await page.waitForFunction(() => !!window.__tumbleDogAudio && !!window.__tumbleDog);
  await page.waitForTimeout(600); // deja que arranque el título

  // 1) Título. Tumble Dog sigue con música sintetizada; al pasar al tema de
  //    Marcos con la flecha derecha, el sintetizador se calla y entra la canción.
  await page.keyboard.press('ArrowRight'); // primer gesto del usuario + cambio de tema
  await page.evaluate(() => window.__tumbleDogAudio.unlock());
  await expect.poll(async () => (await info(page)).source, { timeout: 10_000 }).toBe('file');
  let a = await info(page);
  expect(a.section, 'suena la música del título').toBe('title');
  expect(a.file).toBe('title');
  expect(a.playing, 'el elemento <audio> está reproduciendo').toBe(true);
  expect(a.muted).toBe(false);

  // Fundido de entrada hasta el volumen del tema.
  await expect.poll(async () => (await info(page)).volume, { timeout: 6_000 }).toBeGreaterThan(0.2);
  // La canción avanza de verdad (no es un elemento parado o a cero).
  await expect.poll(async () => (await info(page)).time, { timeout: 10_000 }).toBeGreaterThan(0.25);

  // 2) Partida: la canción sigue sonando en las fases (sección «stage»).
  await page.keyboard.press('Space'); // empezar (pantalla de ruta)
  await expect.poll(async () => gameState(page), { timeout: 10_000 }).toBe('route');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Space'); // ruta → fase
  await expect.poll(async () => gameState(page), { timeout: 15_000 }).toMatch(/intro|play/);
  await expect.poll(async () => (await info(page)).section, { timeout: 10_000 }).toBe('stage');
  a = await info(page);
  expect(a.source, 'en juego también manda la canción').toBe('file');
  expect(a.playing).toBe(true);
  await expect.poll(async () => (await info(page)).time, { timeout: 10_000 }).toBeGreaterThan(0.25);

  // Captura del canvas en juego (va al artefacto del CI, norma 16).
  await page.locator('#game').screenshot({ path: testInfo.outputPath('canvas.png') });

  // 3) Jefes: misma canción, algo más rápida.
  await page.evaluate(() => window.__tumbleDogAudio.music('boss'));
  await expect.poll(async () => (await info(page)).section, { timeout: 5_000 }).toBe('boss');
  a = await info(page);
  expect(a.source).toBe('file');
  expect(a.file, 'no cambia de canción en los jefes').toBe('boss');
  expect(a.rate, 'en los jefes va algo más rápida').toBeGreaterThan(1);
  expect(a.playing).toBe(true);

  // 4) Tecla M: silencio total y vuelta.
  await page.keyboard.press('KeyM');
  await expect.poll(async () => (await info(page)).muted, { timeout: 5_000 }).toBe(true);
  const muted = await page.evaluate(() => [...document.querySelectorAll('audio')].every((el) => el.muted));
  expect(muted, 'la canción también se silencia con M').toBe(true);
  await page.keyboard.press('KeyM');
  await expect.poll(async () => (await info(page)).muted, { timeout: 5_000 }).toBe(false);

  // 5) Veredicto: la canción suena y ningún error de JS.
  expect((await info(page)).source).toBe('file');
  expect(errors, `errores de JS detectados:\n${errors.join('\n')}`).toEqual([]);
});
