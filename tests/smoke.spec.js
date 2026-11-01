// T13 — Smoke test en navegador headless (Playwright).
// Criterio: la página arranca, «juega» 5 s y no produce ningún error de JS en consola.
// Las pulsaciones de teclas son inofensivas hoy y ejercitarán la entrada unificada
// cuando aterricen T02/T04/T05 (el test seguirá valiendo sin cambios).
import { test, expect } from '@playwright/test';

const RUN_MS = 5000;
const FIRST_CHECK_MS = 500;
const SCREENSHOT_MS = 3000;

test('index.html arranca y juega 5 s sin errores de JS en consola', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto('/');
  const start = performance.now();
  const waitUntil = async (ms) => {
    const remaining = start + ms - performance.now();
    if (remaining > 0) await page.waitForTimeout(remaining);
  };

  // 1) El canvas del juego existe y es visible.
  const canvas = page.locator('#game');
  await expect(canvas).toBeVisible();

  // 2) Tras unos frames, el canvas está pintando algo (no es un color uniforme).
  await waitUntil(FIRST_CHECK_MS);
  const painted = await page.evaluate(() => {
    const c = document.getElementById('game');
    if (!c || c.width === 0 || c.height === 0) return false;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) {
      seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
      if (seen.size > 1) return true;
    }
    return seen.size > 1;
  });
  expect(painted, 'el canvas no está pintando (frame uniforme o vacío)').toBe(true);

  // 3) Pulsaciones repartidas durante los 5 s, con captura del canvas a los 3 s.
  const keys = ['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp', 'KeyZ', 'KeyX', 'Escape'];
  const slice = (RUN_MS - FIRST_CHECK_MS) / keys.length;
  const events = keys.map((key, index) => ({ time: FIRST_CHECK_MS + index * slice, key }));
  events.push({ time: SCREENSHOT_MS, screenshot: true });
  events.sort((a, b) => a.time - b.time);
  for (const event of events) {
    await waitUntil(event.time);
    if (event.screenshot) {
      await canvas.screenshot({ path: testInfo.outputPath('canvas.png') });
    } else {
      await page.keyboard.press(event.key);
    }
  }
  await waitUntil(RUN_MS);

  // 4) Veredicto: ningún error de JS.
  expect(errors, `errores de JS detectados:\n${errors.join('\n')}`).toEqual([]);
});
