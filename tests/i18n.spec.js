// I18N (#102): prueba real de selector, persistencia, títulos y partida en Chromium.
import { test, expect } from '@playwright/test';

test.setTimeout(120_000);

async function openGame(page) {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('/');
  await page.waitForFunction(() => window.__tumbleDog?.g.stateT > 0.7);
}

test('selector de idioma: teclado, botones, persistencia y ficha de los dos juegos', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await openGame(page);
  const selector = page.locator('#language-selector');
  await expect(selector).toBeVisible();
  await expect(page.getByRole('button', { name: 'Castellano', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveTitle(/El presidente que aspira a la oposición/);
  await page.screenshot({ path: testInfo.outputPath('canvas.png') });
  await page.keyboard.press('KeyL');
  await expect(page.getByRole('button', { name: 'Valencià', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ca-ES-valencia');
  await expect(page).toHaveTitle(/El president que aspira a l'oposició/);
  expect(await page.evaluate(() => localStorage.getItem('tumbledog-language'))).toBe('val');
  await page.screenshot({ path: testInfo.outputPath('titulo-val.png') });
  await page.reload(); await page.waitForFunction(() => window.__tumbleDog?.g.stateT > 0.7);
  expect(await page.evaluate(() => window.__tumbleDogLanguage.get())).toBe('val');
  await page.getByRole('button', { name: 'Castellano', exact: true }).click();
  expect(await page.evaluate(() => window.__tumbleDog.g.state)).toBe('title');
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveTitle(/DIETA DE MARCOS · Marcos, el glotón/);
  expect(await page.evaluate(() => window.__tumbleDog.g.themeId)).toBe('marcos');
  await page.keyboard.press('KeyL');
  await expect(page).toHaveTitle(/DIETA DE MARCOS · Marcos, el golut/);
  await page.screenshot({ path: testInfo.outputPath('marcos-val.png') });
  // Ruta y jefe: los nombres creados por el motor también siguen el idioma.
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__tumbleDog.g.state === 'route' && window.__tumbleDog.g.stateT > 0.9);
  await expect(selector).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('ruta-val.png') });
  const names = await page.evaluate(() => {
    const d = window.__tumbleDog; d.startStage(3); d.g.state = 'play';
    const val = d.g.boss.name; window.__tumbleDogLanguage.set('es');
    return { val, es: d.g.boss.name };
  });
  expect(names).toEqual({ val: 'EL CUINER DE LA PLANXA', es: 'EL COCINERO DE LA PLANCHA' });
  expect(errors).toEqual([]);
});

test('móvil horizontal: idioma del navegador, selector táctil y palancas traducidas', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 800, height: 360 }, hasTouch: true, isMobile: true, locale: 'ca-ES' });
  const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await openGame(page);
  expect(await page.evaluate(() => window.__tumbleDogLanguage.get())).toBe('val');
  await page.getByRole('button', { name: 'Castellano', exact: true }).tap();
  await page.getByRole('button', { name: 'Valencià', exact: true }).tap();
  expect(await page.evaluate(() => window.__tumbleDog.g.state)).toBe('title');
  const box = await page.locator('#language-selector').boundingBox();
  const canvas = await page.locator('#game').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(canvas.x); expect(box.x + box.width).toBeLessThanOrEqual(canvas.x + canvas.width + 1);
  expect(box.y).toBeGreaterThanOrEqual(canvas.y); expect(box.y + box.height).toBeLessThanOrEqual(canvas.y + canvas.height);
  await page.screenshot({ path: testInfo.outputPath('canvas.png') });
  await page.touchscreen.tap(400, 180);
  await page.waitForFunction(() => window.__tumbleDog.g.state === 'route' && window.__tumbleDog.g.stateT > 0.9);
  await page.touchscreen.tap(400, 180);
  await page.waitForFunction(() => window.__tumbleDog.g.state === 'play');
  await expect(page.locator('.lever.suck')).toHaveText('EMPASSA');
  await expect(page.locator('.lever.shoot')).toHaveText('VOMITA');
  await expect(page.locator('#language-selector')).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('juego-val.png') });
  expect(errors).toEqual([]); await context.close();
});
