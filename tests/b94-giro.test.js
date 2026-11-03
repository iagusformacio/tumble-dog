// B94 (#94) · El personaje se gira SIEMPRE: con X pulsado, con enemigos tragados
// en la mochila y en el aire. Al girar se voltean a la vez el sprite, el cono de
// aspirar, la boquilla (`nozzle`) y los enemigos de `drawHeld`, y la bola sale
// hacia donde mira. Vale para Tumble Dog y para Dieta de Marcos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, W, FLOOR_Y } from '../src/config.js';
import { FLOOR } from '../src/physics.js';
import { createPlayer, updatePlayer, nozzle, drawHeld, drawPlayer } from '../src/player.js';
import { createGame } from '../src/game.js';
import { createEnemy } from '../src/enemies.js';
import { listThemes } from '../src/themes/index.js';

const noop = () => {};
const fx = new Proxy({}, { get: () => noop });
const PLATS = [FLOOR];
const H = (o = {}) => ({ left: false, right: false, up: false, down: false, jump: false, suck: false, shoot: false, ...o });
const PR = (o = {}) => ({ left: false, right: false, up: false, down: false, jump: false, suck: false, shoot: false, ...o });
const HELD4 = ['portavoz', 'tertuliano', 'asesor', 'influencer'];

function step(p, held, pressed = {}) {
  return updatePlayer(p, CONFIG.step, { held: H(held), pressed: PR(pressed) }, PLATS, fx);
}

/** Contexto 2D mínimo que apunta todo lo que se dibuja (para mirar el volteo). */
function recordCtx() {
  const calls = { arc: [], translate: [], scale: [], drawImage: [] };
  const ctx = {
    save: noop, restore: noop, clip: noop, beginPath: noop, fill: noop, stroke: noop,
    fillRect: noop, moveTo: noop, lineTo: noop, closePath: noop, ellipse: noop, rotate: noop, roundRect: noop,
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
    set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set globalAlpha(v) {}, set globalCompositeOperation(v) {},
    arc: (x, y, r) => calls.arc.push({ x, y, r }),
    translate: (x, y) => calls.translate.push({ x, y }),
    scale: (x, y) => calls.scale.push({ x, y }),
    drawImage: () => calls.drawImage.push(true),
  };
  return { ctx, calls };
}

test('gira en el mismo frame con X pulsado y cuatro enemigos tragados', () => {
  const p = createPlayer();
  p.held = HELD4.slice();
  p.facing = 1;
  const n0 = nozzle(p);
  const ev = step(p, { suck: true, left: true });
  assert.equal(p.sucking, true, 'sigue aspirando mientras gira');
  assert.equal(p.facing, -1, 'el giro es inmediato (un frame)');
  assert.equal(p.held.length, 4, 'los tragados siguen dentro al girar');
  const n1 = nozzle(p);
  assert.ok(n1.x < n0.x, 'la boquilla salta al otro lado');
  assert.ok(Math.abs(n1.x - (p.x + p.w / 2 - 56)) < 1e-6, 'la boquilla queda a la izquierda del cuerpo');
  assert.equal(ev.shoot, false);
});

test('gira a la derecha y a la izquierda sin frenos mientras aspira', () => {
  const p = createPlayer();
  p.held = HELD4.slice();
  const lados = [];
  for (const dir of ['right', 'left', 'right', 'right', 'left']) {
    step(p, { suck: true, [dir]: true });
    lados.push(p.facing);
  }
  assert.deepEqual(lados, [1, -1, 1, 1, -1], 'cada pulsación cambia de lado al momento');
});

test('gira en el aire aspirando (salto y caída)', () => {
  const p = createPlayer();
  p.held = HELD4.slice(0, 2);
  p.y -= 260; p.onGround = false; p.vy = -420; // subiendo
  p.facing = 1;
  step(p, { suck: true, left: true });
  assert.equal(p.facing, -1, 'gira subiendo');
  for (let i = 0; i < 40; i++) step(p, { suck: true, left: true });
  step(p, { suck: true, right: true });
  assert.equal(p.facing, 1, 'gira cayendo');
});

test('al girar se voltea el dibujo del personaje (espejo) y se aplasta un poco', () => {
  const p = createPlayer();
  p.held = HELD4.slice();
  p.facing = 1;
  p.sx = 1;
  step(p, { suck: true, left: true });
  assert.equal(p.sx, CONFIG.player.turnSquash, 'juice del giro (config, no constante mágica)');
  // En Node no hay hojas de sprite cargadas: se usa el provisional por código,
  // que también recibe el espejo (`o.flip`). Comprobamos que se llama y no rompe.
  const { ctx } = recordCtx();
  drawPlayer(ctx, p, 1.25);
});

test('los enemigos de la mochila (drawHeld) pasan al otro lado al girar', () => {
  const p = createPlayer();
  p.held = HELD4.slice(0, 3);
  p.heldT = 0.4;
  const cx = p.x + p.w / 2;
  const centros = (calls) => {
    // Cada burbuja pinta varios arcos en el mismo punto: se agrupan por posición.
    const uniq = new Map();
    for (const c of calls.arc) uniq.set(`${c.x.toFixed(2)},${c.y.toFixed(2)}`, c);
    return [...uniq.values()];
  };
  p.facing = 1;
  const der = recordCtx();
  drawHeld(der.ctx, p, 0.7);
  const bDer = centros(der.calls);
  assert.equal(bDer.length, 3, 'se dibujan los tres tragados');
  p.facing = -1;
  const izq = recordCtx();
  drawHeld(izq.ctx, p, 0.7);
  const bIzq = centros(izq.calls);
  const medio = (bs) => bs.reduce((a, c) => a + c.x, 0) / bs.length;
  // La mochila va a la espalda: mirando a la derecha, las burbujas quedan 18 px
  // a la izquierda del centro; mirando a la izquierda, 18 px a la derecha.
  assert.ok(Math.abs(medio(bDer) - (cx - 18)) < 0.01, `mirando a la derecha (${medio(bDer)} ≈ ${cx - 18})`);
  assert.ok(Math.abs(medio(bIzq) - (cx + 18)) < 0.01, `mirando a la izquierda (${medio(bIzq)} ≈ ${cx + 18})`);
  assert.ok(medio(bIzq) > medio(bDer) + 30, 'el volteo es visible: la mochila cambia de lado');
});

// ---------- Integración con el motor: la bola sale hacia donde mira ----------
function harness(themeId) {
  const input = { held: H(), pressed: PR(), update: noop, takeAny: () => false };
  const audio = { update: noop, setSongs: noop, music: noop, preload: () => null, sfx: noop, suck: noop, unlock: noop, stopMusic: noop };
  const game = createGame({ input, audio, themeId });
  if (themeId === 'marcos') game.debug.startCampaign(0);
  game.debug.startStage(0);
  Object.assign(game.state, { state: 'play', stateT: 0, trans: null });
  game.state.player.invul = 100;
  // Un enemigo vivo al fondo (si la fase se queda vacía, el motor la da por limpia).
  game.state.enemies = [createEnemy('diputado', W - 110, FLOOR_Y - 86, { dir: -1 })];
  return { game, input };
}

for (const themeId of ['tumbledog', 'marcos']) {
  test(`[${themeId}] aspira, gira con enemigos dentro y lanza hacia donde mira`, () => {
    const { game, input } = harness(themeId);
    const g = game.state;
    const p = g.player;
    p.held = HELD4.slice(0, 3);
    p.facing = 1;

    // 1) X pulsado + izquierda: gira sin soltar la aspiración.
    input.held.suck = true; input.held.left = true;
    game.update(CONFIG.step);
    assert.equal(p.sucking, true, `${themeId}: aspira`);
    assert.equal(p.facing, -1, `${themeId}: gira con los tragados dentro`);
    assert.equal(p.held.length, 3);

    // 2) Suelta X y lanza: la bola sale hacia la izquierda.
    input.held.left = false; input.held.suck = false;
    input.pressed.shoot = true;
    game.update(CONFIG.step);
    input.pressed.shoot = false;
    assert.equal(g.balls.length, 1, `${themeId}: sale la bola`);
    const b = g.balls[0];
    assert.equal(b.dir, -1, `${themeId}: la bola va hacia donde mira`);
    assert.ok(b.x < p.x + p.w / 2, `${themeId}: la bola nace del lado izquierdo`);
    assert.equal(p.held.length, 0, `${themeId}: se vacía la mochila`);

    // 3) Mismo camino hacia la derecha (ida y vuelta del giro).
    p.held = HELD4.slice(0, 2);
    input.held.suck = true; input.held.right = true;
    game.update(CONFIG.step);
    assert.equal(p.facing, 1, `${themeId}: vuelve a girar a la derecha`);
    input.held.suck = false; input.held.right = false;
    input.pressed.shoot = true;
    game.update(CONFIG.step);
    input.pressed.shoot = false;
    const b2 = g.balls[g.balls.length - 1];
    assert.equal(b2.dir, 1, `${themeId}: la segunda bola sale a la derecha`);
    assert.ok(b2.x > p.x + p.w / 2);
  });
}

test('los dos temas traen el grupo «juice» que el motor lee sin guardia (rebote de bola)', () => {
  // Regresión encontrada con la prueba del giro: en Tumble Dog faltaba
  // `THEME.juice` y el primer rebote de la bola en la pared lanzaba TypeError
  // (el bucle de juego moría). Debe existir y estar traducido en ambos temas.
  for (const theme of listThemes()) {
    assert.ok(theme.theme.juice, `${theme.id}: falta THEME.juice`);
    for (const k of ['capture', 'shatter', 'wall', 'escape', 'oneup', 'chaser']) {
      assert.equal(typeof theme.theme.juice[k], 'string', `${theme.id}: falta juice.${k}`);
    }
  }
  // Y el motor aguanta un rebote de verdad sin romperse.
  const { game, input } = harness('tumbledog');
  const g = game.state;
  const p = g.player;
  p.held = HELD4.slice(0, 2);
  input.held.left = true;
  input.pressed.shoot = true;
  game.update(CONFIG.step);
  input.pressed.shoot = false; input.held.left = false;
  const b = g.balls.at(-1);
  b.x = 8; b.dir = -1; // la bola llega a la pared izquierda
  assert.doesNotThrow(() => { for (let i = 0; i < 30; i++) game.update(CONFIG.step); });
  assert.notEqual(b.dir, -1, 'rebota y cambia de dirección');
});

test('el giro no depende del tema: el motor usa la misma física en los dos', () => {
  const a = harness('tumbledog');
  const b = harness('marcos');
  for (const { game, input } of [a, b]) {
    input.held.suck = true; input.held.left = true;
    game.update(CONFIG.step);
    assert.equal(game.state.player.facing, -1);
    assert.equal(game.state.player.sucking, true);
  }
  // Y el personaje sigue dentro de la pantalla al girar pegado al borde.
  const { game, input } = a;
  game.state.player.x = 2;
  input.held.left = true;
  for (let i = 0; i < 10; i++) game.update(CONFIG.step);
  assert.ok(game.state.player.x >= 0 && game.state.player.x + game.state.player.w <= W);
  assert.ok(game.state.player.y + game.state.player.h <= FLOOR_Y + 1);
});
