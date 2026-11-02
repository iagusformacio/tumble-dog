import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Aislar la entrada del bucle del juego permite inspeccionar held/pressed sin carreras.
test('joystick y palancas mantienen dedos independientes y responden en móvil', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 800, height: 360 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const html = readFileSync('index.html', 'utf8').replace('<script type="module" src="./src/main.js"></script>', '');
  await page.route('**/touch-fixture', (route) => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto('/touch-fixture');
  await page.evaluate(async () => { window.input = (await import('/src/input.js')).createInput(window); });
  const cdp = await context.newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const pt = (id, x, y) => ({ id, x, y, radiusX: 2, radiusY: 2, force: 1 });
  // El primer toque revela los controles.
  await touch('touchStart', [pt(1, 400, 180)]); await touch('touchEnd', []);
  const rect = async (sel) => page.locator(sel).boundingBox();
  let stick = await rect('.stick'); let suck = await rect('.lever.suck');
  expect(stick.width).toBeGreaterThanOrEqual(90);
  expect(suck.width).toBeGreaterThanOrEqual(64);
  let x = stick.x + stick.width / 2, y = stick.y + stick.height / 2;
  const sx = suck.x + suck.width / 2, sy = suck.y + suck.height / 2;
  await touch('touchStart', [pt(2, x, y)]);
  expect(await page.evaluate(() => { window.input.update(); return window.input.held.jump || window.input.held.right; })).toBe(false);
  await touch('touchMove', [pt(2, x + stick.width * 0.35, y - stick.height * 0.35)]);
  await touch('touchStart', [pt(2, x + stick.width * 0.35, y - stick.height * 0.35), pt(3, sx, sy)]);
  const state = await page.evaluate(() => { window.input.update(); return { ...window.input.held, jumpPressed: window.input.pressed.jump }; });
  expect(state.right && state.up && state.jump && state.jumpPressed && state.suck).toBe(true);
  await touch('touchEnd', [pt(3, sx, sy)]);
  const afterRelease = await page.evaluate(() => { window.input.update(); return { ...window.input.held }; });
  expect(afterRelease.right && afterRelease.jump).toBe(true);
  expect(afterRelease.suck).toBe(false);
  await touch('touchEnd', []);
  expect(await page.evaluate(() => { window.input.update(); return window.input.held.right || window.input.held.jump; })).toBe(false);
  const shoot = await rect('.lever.shoot');
  await touch('touchStart', [pt(4, shoot.x + shoot.width / 2, shoot.y + shoot.height / 2)]);
  await touch('touchEnd', [pt(4, shoot.x + shoot.width / 2, shoot.y + shoot.height / 2)]);
  expect(await page.evaluate(() => { window.input.update(); return window.input.pressed.shoot; })).toBe(true);
  expect(await page.evaluate(() => { window.input.update(); return window.input.held.shoot; })).toBe(false);
  await page.keyboard.down('ArrowLeft');
  expect(await page.evaluate(() => { window.input.update(); return window.input.held.left; })).toBe(true);
  await page.keyboard.up('ArrowLeft');
  // En vertical los controles siguen separados y se muestra el aviso.
  await page.setViewportSize({ width: 320, height: 568 });
  stick = await rect('.stick'); suck = await rect('.lever.suck');
  expect(stick.x + stick.width).toBeLessThan(suck.x);
  await expect(page.locator('.orientation-hint')).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});
