// B94: prueba del giro y lanzamiento en el motor real, con teclado y Canvas.
import { test, expect } from '@playwright/test';

for (const theme of ['tumbledog', 'marcos']) {
  test(`giro con un enemigo aspirado en ${theme}`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
    await page.goto('/');
    await page.waitForFunction(() => window.__tumbleDog?.g.state === 'title');
    await page.evaluate(async theme => {
      const { createEnemy } = await import('/src/enemies.js');
      const { FLOOR_Y } = await import('/src/config.js');
      const debug = window.__tumbleDog;
      if (theme === 'marcos') debug.startCampaign(0);
      debug.startStage(0);
      const g = debug.g, p = g.player;
      g.state = 'play'; g.tutorial = 0; g.freeze = 100;
      Object.assign(p, { x: 500, y: FLOOR_Y - p.h, invul: 0, facing: 1 });
      // Un enemigo en el cono y otro lejos para mantener activa la ronda.
      g.enemies = [createEnemy('portavoz', 690, FLOOR_Y), createEnemy('baron', 1150, FLOOR_Y)];
    }, theme);
    await page.keyboard.down('KeyX');
    await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.player.held.length)).toBe(1);
    await page.keyboard.down('ArrowLeft');
    await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.player.facing)).toBe(-1);
    expect(await page.evaluate(async () => {
      const p = window.__tumbleDog.g.player;
      const { nozzle } = await import('/src/player.js');
      return { sucking: p.sucking, held: p.held.length, nozzleLeft: nozzle(p).x < p.x + p.w / 2 };
    })).toEqual({ sucking: true, held: 1, nozzleLeft: true });
    await page.locator('#game').screenshot({ path: testInfo.outputPath('canvas.png') });
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.player.facing)).toBe(1);
    await page.keyboard.up('ArrowRight');
    // Cambiar de lado y lanzar en el aire sin soltar X.
    await page.evaluate(async () => {
      const p = window.__tumbleDog.g.player;
      p.y -= 120; p.onGround = false; p.vy = -400;
    });
    await page.keyboard.down('ArrowLeft');
    await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.player.facing)).toBe(-1);
    await page.keyboard.press('KeyZ');
    await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.balls.length)).toBe(1);
    const ball = await page.evaluate(() => {
      const g = window.__tumbleDog.g, b = g.balls[0], p = g.player;
      return { dir: b.dir, vx: Math.sign(b.vx), left: b.x < p.x + p.w / 2, held: b.held.length };
    });
    expect(ball).toEqual({ dir: -1, vx: -1, left: true, held: 1 });
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('KeyX');
    expect(errors).toEqual([]);
  });
}
