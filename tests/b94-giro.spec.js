// B94 (#94) · Prueba en navegador: con X pulsado y enemigos tragados el personaje
// gira al momento, y sprite, cono, boquilla y lanzamiento cambian de lado.
// Se ejecuta en Chromium en el CI; deja la captura del canvas como artefacto.
import { test, expect } from '@playwright/test';

/** Entra directo a una fase jugable del tema pedido, con la mochila llena. */
async function entrar(page, theme) {
  await page.evaluate((t) => {
    const d = window.__tumbleDog;
    if (t === 'marcos') d.startCampaign(0); // cambia al tema Dieta de Marcos
    d.startStage(0);
    Object.assign(d.g, { state: 'play', stateT: 0, trans: null, paused: false });
    const p = d.g.player;
    p.x = 540; p.vx = 0; p.invul = 999; p.facing = 1;
    p.held = ['portavoz', 'tertuliano', 'asesor']; p.heldT = 0.2;
  }, theme);
  await page.waitForTimeout(120);
}

/** Luminancia media a los dos lados de la boquilla (el cono arcoíris es brillante). */
const lados = (page) => page.evaluate(() => {
  const c = document.getElementById('game');
  const ctx = c.getContext('2d');
  const p = window.__tumbleDog.g.player;
  const k = c.width / 1280; // canvas HiDPI → coordenadas lógicas
  const cx = p.x + p.w / 2, cy = p.y + p.h - 46;
  const leer = (x0, y0, w, h) => {
    const d = ctx.getImageData(Math.round(x0 * k), Math.round(y0 * k), Math.round(w * k), Math.round(h * k)).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3;
    return s / (d.length / 4);
  };
  return { izquierda: leer(cx - 250, cy - 70, 190, 150), derecha: leer(cx + 60, cy - 70, 190, 150) };
});

for (const theme of ['marcos', 'tumbledog']) {
  test(`[${theme}] gira aspirando con enemigos tragados y la bola sale hacia donde mira`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`); });

    await page.goto('/');
    await expect(page.locator('#game')).toBeVisible();
    await page.waitForFunction(() => !!window.__tumbleDog);
    await entrar(page, theme);
    const canvas = page.locator('#game');

    // 1) X pulsado + derecha: aspira mirando a la derecha.
    await page.keyboard.down('KeyX');
    await page.keyboard.down('ArrowRight');
    await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.player.facing)).toBe(1);
    await page.waitForTimeout(60);
    const der = await lados(page);
    expect(await page.evaluate(() => window.__tumbleDog.g.player.sucking)).toBe(true);

    // 2) Sin soltar X, izquierda: gira en el acto.
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowLeft');
    await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.player.facing)).toBe(-1);
    await page.waitForTimeout(60);
    const izq = await lados(page);

    // El cono (brillante) ha cambiado de lado: la izquierda se ilumina y la derecha se apaga.
    expect(izq.izquierda - der.izquierda, `cono a la izquierda (${izq.izquierda.toFixed(1)} vs ${der.izquierda.toFixed(1)})`).toBeGreaterThan(6);
    expect(der.derecha - izq.derecha, `cono fuera de la derecha (${der.derecha.toFixed(1)} vs ${izq.derecha.toFixed(1)})`).toBeGreaterThan(6);

    // La mochila sigue llena y aspira: girar no suelta a los tragados.
    const estado = await page.evaluate(() => ({ held: window.__tumbleDog.g.player.held.length, sucking: window.__tumbleDog.g.player.sucking }));
    expect(estado.held).toBe(3);
    expect(estado.sucking).toBe(true);

    // Captura del momento (va al artefacto del CI, norma 16).
    await canvas.screenshot({ path: testInfo.outputPath('canvas.png') });

    // 3) Suelta X y lanza: la bola sale hacia la izquierda, donde mira.
    await page.keyboard.up('KeyX');
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.press('KeyZ');
    await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.balls.at(-1)?.dir)).toBe(-1);
    const salida = await page.evaluate(() => {
      const g = window.__tumbleDog.g;
      const b = g.balls.at(-1), p = g.player;
      return { dir: b.dir, dx: b.x - (p.x + p.w / 2), held: p.held.length };
    });
    expect(salida.dir, 'la bola va a la izquierda').toBe(-1);
    expect(salida.dx, 'nace del lado izquierdo del personaje').toBeLessThan(0);
    expect(salida.held).toBe(0);

    // 4) Y vuelta a la derecha: gira igual de rápido y lanza al otro lado.
    await page.keyboard.down('ArrowRight');
    await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.player.facing)).toBe(1);
    await page.evaluate(() => { window.__tumbleDog.g.player.held = ['portavoz', 'tertuliano']; });
    await page.keyboard.down('KeyX');
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('KeyZ');
    await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.balls.at(-1)?.dir)).toBe(1);
    await page.keyboard.up('KeyX');

    expect(errors, `errores de JS detectados:\n${errors.join('\n')}`).toEqual([]);
  });
}

test('el giro funciona también en el aire mientras aspira', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.__tumbleDog);
  await entrar(page, 'marcos');
  await page.evaluate(() => { const g = window.__tumbleDog.g; g.player.y -= 220; g.player.onGround = false; g.player.vy = -200; });
  await page.keyboard.down('KeyX');
  await page.keyboard.down('ArrowLeft');
  await expect.poll(() => page.evaluate(() => window.__tumbleDog.g.player.facing)).toBe(-1);
  const p = await page.evaluate(() => ({ y: window.__tumbleDog.g.player.y, onGround: window.__tumbleDog.g.player.onGround, held: window.__tumbleDog.g.player.held.length }));
  expect(p.onGround, 'sigue en el aire').toBe(false);
  expect(p.held).toBe(3);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.up('KeyX');
});
