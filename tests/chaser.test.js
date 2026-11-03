import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, FLOOR_Y } from '../src/config.js';
import { createChaser, updateChaser, stunChaser, ballHitsChaser } from '../src/boss.js';
import { createBall } from '../src/ball.js';
import { createEnemy } from '../src/enemies.js';
import { createGame } from '../src/game.js';

const dt = CONFIG.step;
const noop = () => {};
function setup(theme = 'tumbledog', boss = false) {
  const calls = [];
  const input = { held: {}, pressed: {}, update: noop, takeAny: () => false };
  const audio = { update: noop, setSongs: noop, music: noop, sfx: name => calls.push(name), suck: noop, unlock: noop, stopMusic: noop };
  const game = createGame({ input, audio, themeId: theme });
  if (theme === 'marcos') game.debug.startCampaign(0);
  game.debug.startStage(boss ? (theme === 'marcos' ? 3 : 4) : 0);
  const g = game.state;
  g.state = 'play'; g.player.invul = 100;
  if (g.boss) { g.boss.shotT = 100; g.boss.throwT = 100; }
  else { g.enemies = [createEnemy('baron', 1100, FLOOR_Y)]; }
  calls.length = 0;
  return { game, g, calls, input };
}

test('parámetros: aviso diez segundos antes, cuatro de aturdimiento y velocidad limitada', () => {
  assert.equal(CONFIG.chaser.warning, 10);
  assert.equal(CONFIG.chaser.stun, 4);
  assert.equal(CONFIG.chaser.arrival.tumbledog, 42);
  assert.equal(CONFIG.chaser.arrival.marcos, 40);
  assert.equal(CONFIG.chaser.maxSpeed, CONFIG.player.runSpeed * 0.7);
  const c = createChaser(), p = { x: 200, y: 400, w: 46 };
  for (let i = 0; i < 20000; i++) {
    updateChaser(c, dt, p);
    assert.ok(Math.hypot(c.vx, c.vy) <= CONFIG.chaser.maxSpeed + 1e-9);
  }
});

test('aturdimiento inmoviliza, luego recupera movimiento y conserva al perseguidor', () => {
  const c = createChaser(), p = { x: 100, y: 100, w: 46 };
  c.x = 700; c.y = 350; c.vx = 180; c.vy = 30;
  stunChaser(c);
  assert.equal(c.stun, 4);
  for (let i = 0; i < 400; i++) updateChaser(c, 0.01, p);
  assert.ok(c.stun < 1e-12);
  assert.equal(c.x, 700); assert.equal(c.y, 350);
  updateChaser(c, dt, p); updateChaser(c, dt, p);
  assert.ok(c.x < 700);
});

test('aviso sonoro único y aparición a tiempo en los dos temas, nunca en jefes', () => {
  for (const theme of ['tumbledog', 'marcos']) {
    const { game, g, calls } = setup(theme);
    assert.equal(g.chaserDue, CONFIG.chaser.arrival[theme]);
    g.hurried = true; g.stageT = g.chaserDue - CONFIG.chaser.warning - dt * 2;
    game.update(dt); assert.equal(g.chaser, null); assert.equal(calls.includes('warn'), false);
    game.update(dt * 2); assert.equal(g.chaserWarned, true); assert.equal(calls.filter(x => x === 'warn').length, 1);
    game.update(dt); assert.equal(calls.filter(x => x === 'warn').length, 1);
    g.stageT = g.chaserDue - dt / 2;
    game.update(dt); assert.ok(g.chaser); assert.equal(calls.filter(x => x === 'hurry').length, 1);
    const boss = setup(theme, true);
    boss.g.stageT = 100; boss.game.update(dt);
    assert.equal(boss.g.chaser, null); assert.equal(boss.g.chaserWarned, false);
  }
});

test('bola aturde sin desaparecer, sin reiniciar por solapamiento y no daña al jugador; aspiración no afecta', () => {
  for (const theme of ['tumbledog', 'marcos']) {
    const { game, g, input } = setup(theme);
    const p = g.player;
    g.chaser = createChaser(); Object.assign(g.chaser, { x: p.x + p.w / 2 + 60, y: p.y + 40, alpha: 1 });
    input.held.suck = true; p.facing = 1;
    game.update(dt);
    assert.ok(g.chaser); assert.equal(g.chaser.stun, 0); assert.equal(p.held.length, 0);
    const c = g.chaser;
    const b = createBall(c.x, c.y, 1, ['portavoz']);
    assert.ok(ballHitsChaser(c, b)); g.balls.push(b);
    game.update(dt);
    assert.equal(b.chaserHit, true); assert.ok(c.stun > 3.9); assert.ok(g.chaser === c);
    const stun = c.stun;
    // Vuelve a colocar la misma bola encima: no debe reiniciar el contador.
    b.x = c.x; b.y = c.y; b.vy = 0;
    p.x = c.x - p.w / 2; p.y = c.y - 40; p.invul = 0;
    const lives = g.lives;
    game.update(dt);
    assert.ok(c.stun < stun); assert.equal(g.lives, lives);
    g.enemies = []; game.update(dt);
    assert.equal(g.state, 'clear'); assert.equal(g.chaser, null);
  }
});

test('el premio de la cuenta adelanta la llegada sin saltarse el aviso y no crea perseguidor en jefes', () => {
  const oldRandom = Math.random;
  Math.random = () => 0.999; // último premio: cuenta
  try {
    for (const boss of [false, true]) {
      const { game, g } = setup('marcos');
      game.debug.startStage(boss ? 7 : 4);
      g.state = 'play'; g.stageT = 5; g.player.invul = 100;
      const mechanic = game.debug.mechanic;
      assert.ok(mechanic.uses('sorteos'));
      const p = g.player;
      mechanic.state.balls.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, vx: 0, vy: 0, r: 24, t: 0, life: 16 });
      game.update(dt);
      assert.equal(mechanic.prizesCount, 1);
      assert.equal(g.chaser, null);
      if (boss) {
        assert.equal(g.chaserDue, CONFIG.chaser.arrival.marcos);
        assert.equal(g.chaserWarned, false);
      } else {
        assert.ok(Math.abs(g.chaserDue - g.stageT - CONFIG.chaser.warning) < 1e-8);
        assert.equal(g.chaserWarned, true);
      }
    }
  } finally { Math.random = oldRandom; }
});


test('al terminar el aturdimiento el perseguidor vuelve a hacer daño', () => {
  const { game, g } = setup();
  const p = g.player;
  g.chaser = createChaser();
  Object.assign(g.chaser, { x: p.x + p.w / 2, y: p.y + 40, stun: 0.1 });
  p.invul = 0;
  game.update(dt);
  assert.equal(g.lives, CONFIG.player.lives);
  g.chaser.stun = 0;
  game.update(dt);
  assert.equal(g.lives, CONFIG.player.lives - 1);
});
