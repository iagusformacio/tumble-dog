// B94 (#94): girar siempre, también con X mantenida, la mochila llena y en el aire.
// El sprite, la boquilla, el cono y las burbujas deben compartir el mismo facing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, FLOOR_Y } from '../src/config.js';
import { createPlayer, updatePlayer, nozzle, drawPlayer, drawHeld } from '../src/player.js';
import { createGame } from '../src/game.js';
import { createEnemy, TYPE_KEYS } from '../src/enemies.js';
import { setSpriteMap, spriteName, __setImagesForNode } from '../src/sprites.js';
import { getTheme } from '../src/themes/index.js';

const NOOP = () => {};
const fx = new Proxy({}, { get: () => NOOP });
const audio = new Proxy({}, { get: () => NOOP });
const input = () => ({ held: {}, pressed: {}, update: NOOP, takeAny: () => false, touch: false });
const fullHeld = () => TYPE_KEYS.slice(0, CONFIG.vacuum.maxHeld);

function recordingContext() {
  let m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const stack = [], gradients = [], arcs = [], images = [];
  const point = (x, y) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
  const base = {
    globalAlpha: 1,
    save() { stack.push({ ...m }); },
    restore() { m = stack.pop() || m; },
    translate(x, y) { m.e += m.a * x + m.c * y; m.f += m.b * x + m.d * y; },
    scale(x, y) { m.a *= x; m.b *= x; m.c *= y; m.d *= y; },
    rotate(r) {
      const cos = Math.cos(r), sin = Math.sin(r);
      const a = m.a * cos + m.c * sin, b = m.b * cos + m.d * sin;
      const c = m.c * cos - m.a * sin, d = m.d * cos - m.b * sin;
      Object.assign(m, { a, b, c, d });
    },
    createLinearGradient(x0, y0, x1, y1) {
      gradients.push({ from: point(x0, y0), to: point(x1, y1) });
      return { addColorStop: NOOP };
    },
    createRadialGradient() { return { addColorStop: NOOP }; },
    arc(x, y, r) { arcs.push({ ...point(x, y), r }); },
    drawImage() { images.push({ ...m }); },
    measureText(s) { return { width: String(s).length * 12 }; },
  };
  const ctx = new Proxy(base, {
    get(target, key) { return key in target ? target[key] : NOOP; },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, gradients, arcs, images };
}

function playTheme(themeId) {
  const controls = input();
  const game = createGame({ input: controls, audio, themeId });
  game.debug.startStage(0);
  const g = game.state;
  g.state = 'play'; g.items = []; g.shots = [];
  // Un enemigo lejano evita que la fase se dé por limpia y vacíe la mochila.
  g.enemies = [createEnemy('portavoz', 1100, FLOOR_Y)];
  Object.assign(g.player, { x: 500, y: FLOOR_Y - CONFIG.player.h, vx: 0, vy: 0, onGround: true, invul: 100, facing: 1, held: [], heldT: 0 });
  return { game, controls, g, p: g.player };
}

for (const count of [1, 2, 3, 4]) {
  test(`B94: con ${count} enemigo(s) dentro y X pulsada gira en el primer paso`, () => {
    for (const dir of [-1, 1]) {
      const p = createPlayer();
      p.held = fullHeld().slice(0, count); p.sucking = true; p.facing = -dir;
      updatePlayer(p, CONFIG.step, { held: { suck: true, [dir < 0 ? 'left' : 'right']: true }, pressed: {} }, [], fx);
      assert.equal(p.facing, dir, 'el giro no espera a soltar aspirar');
      assert.equal(p.sucking, true);
      assert.equal(p.held.length, count, 'girar no pierde enemigos');
      assert.equal(nozzle(p).x, p.x + p.w / 2 + dir * 56);
    }
  });
}

test('B94: salta y gira en el aire con la mochila llena y aspirando', () => {
  const p = createPlayer(); p.held = fullHeld();
  const jump = updatePlayer(p, CONFIG.step, { held: { suck: true, left: true }, pressed: { jump: true } }, [], fx);
  assert.equal(jump.jumped, true); assert.equal(p.facing, -1); assert.equal(p.onGround, false);
  updatePlayer(p, CONFIG.step, { held: { suck: true, right: true }, pressed: {} }, [], fx);
  assert.equal(p.facing, 1); assert.equal(p.onGround, false); assert.equal(p.held.length, 4);
  p.vx = 0;
  updatePlayer(p, CONFIG.step, { held: { suck: true }, pressed: {} }, [], fx);
  assert.equal(p.facing, 1, 'sin dirección conserva el lado');
});

test('B94: drawHeld refleja toda la fila de burbujas sobre la mochila', () => {
  const p = createPlayer(); p.held = fullHeld(); p.invul = 0;
  const cx = p.x + p.w / 2;
  const centers = (facing) => {
    p.facing = facing;
    const { ctx, arcs } = recordingContext();
    drawHeld(ctx, p, 0.37);
    return arcs.filter((a) => a.r >= 20);
  };
  const right = centers(1), left = centers(-1);
  assert.equal(right.length, 4); assert.equal(left.length, 4);
  for (let i = 0; i < right.length; i++) {
    assert.ok(Math.abs((right[i].x + left[i].x) / 2 - cx) < 1e-9, 'la oscilación también se refleja, no solo el anclaje');
    assert.equal(right[i].y, left[i].y);
  }
  assert.ok(right.reduce((s, a) => s + a.x, 0) / 4 < cx, 'mirando a la derecha, la mochila queda detrás');
  assert.ok(left.reduce((s, a) => s + a.x, 0) / 4 > cx, 'mirando a la izquierda, la mochila queda detrás');
});

for (const themeId of ['tumbledog', 'marcos']) {
  test(`B94: el sprite de ${themeId} se voltea al girar aspirando`, () => {
    const theme = getTheme(themeId).theme;
    setSpriteMap(theme.sprites || {});
    __setImagesForNode(new Map([[spriteName('presi-suck'), { width: 120, height: 220 }]]));
    try {
      for (const dir of [-1, 1]) {
        const p = createPlayer(); p.held = fullHeld(); p.sucking = true; p.facing = dir; p.invul = 0;
        const { ctx, images } = recordingContext();
        drawPlayer(ctx, p, 0);
        assert.equal(images.length, 1, 'usa el sprite del tema');
        assert.equal(Math.sign(images[0].a), dir, 'el dibujo queda mirando hacia facing');
      }
    } finally { __setImagesForNode(new Map()); setSpriteMap(null); }
  });

  test(`B94: cono y boquilla de ${themeId} apuntan al lado elegido con X mantenida`, () => {
    const { game, controls, p } = playTheme(themeId);
    p.held = fullHeld();
    for (const dir of [-1, 1]) {
      controls.held = { suck: true, [dir < 0 ? 'left' : 'right']: true };
      game.update(CONFIG.step);
      const n = nozzle(p);
      assert.equal(p.facing, dir);
      assert.equal(n.x, p.x + p.w / 2 + dir * 56);
      const { ctx, gradients } = recordingContext();
      game.render(ctx);
      const beam = gradients.find((g) => Math.abs(g.from.x - n.x) < 1e-6 && Math.abs(g.from.y - n.y) < 1e-6
        && Math.abs(Math.abs(g.to.x - g.from.x) - CONFIG.vacuum.range) < 1e-6);
      assert.ok(beam, 'el cono nace en la boquilla');
      assert.equal(Math.sign(beam.to.x - beam.from.x), dir, 'el cono se extiende hacia donde mira');
    }
  });

  test(`B94: aspirar con la mochila llena alcanza delante y no detrás en ${themeId}`, () => {
    const { game, controls, p } = playTheme(themeId);
    p.held = fullHeld();
    for (const dir of [-1, 1]) {
      controls.held = { suck: true, [dir < 0 ? 'left' : 'right']: true };
      game.update(CONFIG.step);
      const n = nozzle(p);
      const front = createEnemy('portavoz', n.x + dir * 100, FLOOR_Y);
      const behind = createEnemy('tertuliano', n.x - dir * 100, FLOOR_Y);
      game.state.enemies = [front, behind];
      game.update(CONFIG.step);
      assert.equal(front.beam, true); assert.ok(front.suck > 0);
      assert.equal(behind.beam, false); assert.equal(behind.suck, 0);
    }
  });

  test(`B94: el lanzamiento de ${themeId} sale hacia donde mira, incluso aspirando`, () => {
    for (const dir of [-1, 1]) {
      const { game, controls, p } = playTheme(themeId);
      p.held = fullHeld();
      controls.held = { suck: true, [dir < 0 ? 'left' : 'right']: true };
      game.update(CONFIG.step);
      assert.equal(p.facing, dir);
      controls.pressed = { shoot: true };
      game.update(CONFIG.step);
      assert.equal(game.state.balls.length, 1);
      const ball = game.state.balls[0];
      assert.equal(ball.dir, dir); assert.equal(Math.sign(ball.vx), dir);
      assert.ok((ball.x - (p.x + p.w / 2)) * dir > 56, 'sale por la boquilla delantera');
      assert.equal(ball.held.length, 4); assert.equal(p.held.length, 0);
    }
  });
}
