// #111: aviso, aparición y contrajuego en el Canvas real de ambos temas.
import { test, expect } from '@playwright/test';

for (const theme of ['tumbledog', 'marcos']) {
  test(`aviso y bola aturdidora en ${theme}`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
    await page.goto('/');
    await page.waitForFunction(() => window.__tumbleDog?.g.state === 'title');
    await page.evaluate(() => {
      const draw = CanvasRenderingContext2D.prototype.fillText;
      window.__chaserText = [];
      CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
        window.__chaserText.push(String(text));
        return draw.call(this, text, ...args);
      };
    });
    await page.evaluate(async theme => {
      const { createEnemy } = await import('/src/enemies.js');
      const { FLOOR_Y } = await import('/src/config.js');
      const d = window.__tumbleDog;
      if (theme === 'marcos') d.startCampaign(0);
      d.startStage(0);
      const g = d.g;
      g.state = 'play'; g.tutorial = 0; g.hurried = true; g.freeze = 100;
      g.player.invul = 0; g.player.x = 400;
      g.enemies = [createEnemy('baron', 1150, FLOOR_Y)];
      g.stageT = g.chaserDue - 5;
    }, theme);
    await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.chaserWarned)).toBe(true);
    expect(await page.evaluate(() => window.__tumbleDog.g.chaser)).toBeNull();
    await expect.poll(() => page.evaluate(() => window.__chaserText.some(t => t.includes('LLEGA') && t.includes(' s')))).toBe(true);
    await page.locator('#game').screenshot({ path: testInfo.outputPath('aviso.png') });
    await page.evaluate(() => { const g = window.__tumbleDog.g; g.stageT = g.chaserDue - 0.05; });
    await expect.poll(() => page.evaluate(() => !!window.__tumbleDog.g.chaser)).toBe(true);
    await page.evaluate(async () => {
      const { createBall } = await import('/src/ball.js');
      const g = window.__tumbleDog.g, c = g.chaser;
      Object.assign(c, { x: 700, y: 520, alpha: 1, t: 1 });
      g.balls.push(createBall(c.x, c.y, 1, ['portavoz']));
    });
    await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.chaser.stun)).toBeGreaterThan(3);
    const first = await page.evaluate(() => ({ x: __tumbleDog.g.chaser.x, y: __tumbleDog.g.chaser.y }));
    await page.waitForTimeout(250);
    const second = await page.evaluate(() => ({ x: __tumbleDog.g.chaser.x, y: __tumbleDog.g.chaser.y }));
    expect(second).toEqual(first);
    expect(await page.evaluate(() => window.__chaserText.some(t => t.includes('INVENCIBLE')))).toBe(true);
    expect(await page.evaluate(() => window.__chaserText.some(t => t.includes('BOLA LO ATURDE')))).toBe(true);
    await page.locator('#game').screenshot({ path: testInfo.outputPath('canvas.png') });
    expect(errors).toEqual([]);
  });
}
