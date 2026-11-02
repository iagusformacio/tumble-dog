// C1 · Prueba real de la ronda del Cocinero en Canvas/Chromium.
import { test, expect } from '@playwright/test';

test('continuar en La Taca carga el cocinero, sus proyectiles y el aceite', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // El juego funciona sin conexión: una fuente externa no debe bloquear esta prueba.
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.addInitScript(() => {
    localStorage.setItem('dieta-de-marcos-campana-v1', JSON.stringify({ version: 1, bar: 0, round: 3, score: 0, lives: 3, themeId: 'marcos' }));
  });
  await page.goto('/');
  await expect(page.locator('#game')).toBeVisible();
  await page.waitForFunction(() => window.__tumbleDog?.g.state === 'title' && window.__tumbleDog.g.stateT > 0.7);
  // «Continuar» es la última opción: arriba desde campaña.
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.modeSel)).toBe(2);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__tumbleDog.g.state === 'route' && window.__tumbleDog.g.stateT > 0.8);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__tumbleDog.g.boss?.art === 'cocinero-plancha');
  expect(await page.evaluate(() => window.__tumbleDog.g.stageIndex)).toBe(3);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dieta-de-marcos-campana-v1')));
  expect(saved.bar).toBe(0);
  expect(saved.round).toBe(3);

  // Crear una segunda instancia controlada del mismo motor para comprobar, con
  // sprites cargados y sobre un canvas real, ambos ataques y el efecto al aterrizar.
  const result = await page.evaluate(async () => {
    const { createGame } = await import('/src/game.js');
    const { loadSprites, hasSprite } = await import('/src/sprites.js');
    const { FLOOR_Y, CONFIG } = await import('/src/config.js');
    await loadSprites();
    const noop = () => {};
    const input = { held: {}, pressed: {}, update: noop, takeAny: () => false };
    const audio = { update: noop, setSongs: noop, music: noop, preloadMusic: noop, sfx: noop, suck: noop, unlock: noop, stopMusic: noop };
    const game = createGame({ input, audio, themeId: 'marcos' });
    game.debug.startCampaign({ stageIndex: 3, score: 0, lives: 3 });
    game.debug.startStage(3);
    game.state.state = 'play';
    game.state.player.invul = 100;
    game.state.boss.throwT = 100;
    game.state.boss.shotT = 0;
    game.update(1 / 120);
    const first = game.state.shots[0]?.kind;
    game.state.boss.shotT = 0;
    game.update(1 / 120);
    const oil = game.state.shots.find(s => s.kind === 'aceite');
    const second = oil?.kind;
    const before = game.debug.mechanic.state.stains.length;
    if (oil) { oil.x = 600; oil.y = FLOOR_Y - CONFIG.laTacaBoss.oilRadius; oil.vy = 20; }
    game.update(1 / 120);
    const after = game.debug.mechanic.state.stains.length;
    game.state.player.invul = 0;
    const canvas = document.createElement('canvas');
    canvas.id = 'la-taca-test'; canvas.width = 1280; canvas.height = 720;
    document.body.replaceChildren(canvas);
    game.render(canvas.getContext('2d'));
    return { boss: game.state.boss.art, first, second, before, after,
      loaded: ['boss-cocinero-plancha-walkA', 'boss-cocinero-plancha-attack', 'proj-tostada', 'proj-aceite'].every(hasSprite) };
  });
  expect(result).toEqual({ boss: 'cocinero-plancha', first: 'tostada', second: 'aceite', before: 4, after: 5, loaded: true });
  await page.locator('#la-taca-test').screenshot({ path: testInfo.outputPath('canvas.png') });
  expect(errors).toEqual([]);
});
