// B94 (#94): prueba real en Chromium con teclado, sprites y captura del motor.
import { test, expect } from '@playwright/test';

for (const theme of ['tumbledog', 'marcos']) {
  test(`B94: ${theme} gira con cuatro enemigos tragados y X mantenida`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
    await page.goto('/');
    await page.waitForFunction(() => window.__tumbleDog?.g.state === 'title' && window.__tumbleDog.g.stateT > 0.7);
    if (theme === 'marcos') await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown'); // Arcade: mismo jugador, sin ruta de campaña.
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__tumbleDog?.g.state === 'play');
    expect(await page.evaluate(() => window.__tumbleDog.g.themeId)).toBe(theme);

    // Coloca cuatro enemigos delante y uno lejos: la aspira de verdad con X.
    await page.evaluate(async () => {
      const { createEnemy, TYPE_KEYS } = await import('/src/enemies.js');
      const { FLOOR_Y } = await import('/src/config.js');
      const { nozzle } = await import('/src/player.js');
      const g = window.__tumbleDog.g, p = g.player;
      Object.assign(p, { x: 500, y: FLOOR_Y - p.h, vx: 0, vy: 0, facing: 1, held: [], heldT: 0, invul: 100, onGround: true });
      const n = nozzle(p);
      g.enemies = TYPE_KEYS.slice(0, 4).map((type, i) => createEnemy(type, n.x + 70 + i * 40, FLOOR_Y));
      g.enemies.push(createEnemy('baron', 1150, FLOOR_Y, { enter: true, delay: 1000 }));
      g.items = []; g.shots = []; g.balls = [];
    });
    await page.keyboard.down('KeyX');
    await page.waitForFunction(() => window.__tumbleDog.g.player.held.length === 4);
    await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(() => window.__tumbleDog.g.player.facing === -1);
    const left = await page.evaluate(async () => {
      const { nozzle } = await import('/src/player.js');
      const p = window.__tumbleDog.g.player;
      return { facing: p.facing, sucking: p.sucking, held: p.held.length, nozzleLeft: nozzle(p).x < p.x + p.w / 2 };
    });
    expect(left).toEqual({ facing: -1, sucking: true, held: 4, nozzleLeft: true });
    // Congela solo el contador de escape para que la captura no dependa de la
    // velocidad de render del CI; el giro y la aspiración siguen siendo reales.
    await page.evaluate(() => { const p = window.__tumbleDog.g.player; p.heldT = -100; p.invul = 0; });
    await page.screenshot({ path: testInfo.outputPath('canvas.png'), timeout: 60_000 });

    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => window.__tumbleDog.g.player.facing === 1);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => !window.__tumbleDog.g.player.onGround);
    expect(await page.evaluate(() => window.__tumbleDog.g.player.facing)).toBe(1);
    await page.keyboard.press('KeyZ');
    await page.waitForFunction(() => window.__tumbleDog.g.balls.length > 0);
    const ball = await page.evaluate(() => { const b = window.__tumbleDog.g.balls[0]; return { dir: b.dir, vx: b.vx, held: b.held.length }; });
    expect(ball.dir).toBe(1); expect(ball.vx).toBeGreaterThan(0); expect(ball.held).toBe(4);
    expect(errors).toEqual([]);
  });
}
