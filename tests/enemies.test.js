import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createEnemyManager } from '../src/enemies.js';
import { createPlayer } from '../src/player.js';
import { createBall } from '../src/ball.js';
import { DEFAULT_PLATFORMS } from '../src/physics.js';

const step = CONFIG.step;

/** Juego mínimo: jugador en el suelo y gestor con spawns propios. */
function makeGame(spawns = null) {
  const player = createPlayer();
  player.update(step);
  const manager = createEnemyManager({ spawns, assets: null, effects: null });
  return { player, manager };
}

/** Bola manual para golpes controlados en los tests. */
function makeBall(x, y) {
  return createBall({ x, y, direction: 1, carrier: null, platforms: DEFAULT_PLATFORMS });
}

test('la oleada 1 pobla la pantalla con los 8 enemigos inventados', () => {
  const { manager } = makeGame();
  assert.equal(manager.enemies.length, 8);
  assert.equal(manager.wave, 1);
  assert.equal(manager.lives, CONFIG.player.lives);
  assert.equal(manager.score, 0);
  assert.ok(manager.enemies.every((enemy) => enemy.isDangerous()));
});

test('aspirar: con X pulsada, un enemigo en la boquilla entra y se puede llevar', () => {
  const { player, manager } = makeGame([{ type: 'portavoz', x: 170, platform: 0 }]);
  assert.equal(manager.carried, null);
  manager.update(step, player, { suck: true }, null);
  assert.ok(manager.carried, 'el enemigo entró en la boquilla');
  assert.equal(manager.carried.isContained(), true);
});

test('lanzar (T07): el portador va encerrado en la bola y la bola no le aplasta', () => {
  const { player, manager } = makeGame([{ type: 'portavoz', x: 170, platform: 0 }]);
  manager.update(step, player, { suck: true }, null);
  assert.ok(manager.carried);

  const ball = manager.launchBall(player);
  assert.ok(ball);
  assert.equal(ball.carrier, manager.carried);
  assert.equal(manager.carried.isContained(), true, 'queda dentro de la bola');

  // 1 segundo de juego: la bola rebota, pero no aplasta a su portador.
  for (let i = 0; i < 60; i += 1) {
    ball.update(step);
    manager.update(step, player, {}, ball);
  }
  assert.equal(manager.score, 0, 'la bola no aplasta a su propio portador');
  assert.equal(ball.carrier.isDefeated(), false);
  assert.equal(ball.carrier.isContained(), true, 'sigue encerrado');

  // Al morir la bola, el enemigo queda libre.
  for (let i = 0; i < Math.ceil(CONFIG.ball.lifeSeconds / step) + 2; i += 1) ball.update(step);
  assert.equal(ball.alive, false);
  ball.carrier.release();
  assert.equal(ball.carrier.isContained(), false);
  assert.equal(ball.carrier.isDefeated(), false);
});

test('la bola aplasta enemigos libres y puntúa por combo', () => {
  const { player, manager } = makeGame([
    { type: 'portavoz', x: 240, platform: 0 },
    { type: 'portavoz', x: 268, platform: 0 },
  ]);
  const ball = makeBall(195, 186);
  for (let i = 0; i < 300 && ball.alive; i += 1) {
    ball.update(step);
    manager.update(step, player, {}, ball);
    if (manager.score >= CONFIG.combo[0] + CONFIG.combo[1]) break;
  }
  assert.equal(manager.score, CONFIG.combo[0] + CONFIG.combo[1], '100 + 200');
  assert.equal(manager.lastCombo, 2);
  assert.ok(manager.enemies.every((enemy) => enemy.isDefeated()));
});

test('oleadas (T09): al limpiar la pantalla, llega la siguiente con más enemigos', () => {
  const { player, manager } = makeGame([{ type: 'portavoz', x: 200, platform: 0 }]);
  const ball = makeBall(195, 186);
  manager.update(step, player, {}, ball);
  assert.equal(manager.enemies[0].isDefeated(), true);
  assert.equal(manager.phase, 'interwave');

  for (let i = 0; i < Math.ceil(CONFIG.wave.interWaveSeconds / step) + 2; i += 1) {
    manager.update(step, player, {}, ball);
  }
  assert.equal(manager.wave, 2);
  assert.equal(manager.phase, 'playing');
  assert.equal(manager.enemies.length, 10); // 8 + extraPerWave
});

test('vidas y derrota: 3 golpes -> GAME OVER; restart lo vuelve a empezar', () => {
  const { player, manager } = makeGame([{ type: 'portavoz', x: 200, platform: 0 }]);
  for (let frame = 0; frame < 600 && manager.phase === 'playing'; frame += 1) {
    const enemy = manager.enemies[0];
    if (!enemy.isDefeated() && !enemy.isContained()) {
      enemy.body.x = player.body.x;
      enemy.body.y = player.body.y;
    }
    manager.update(step, player, {}, null);
  }
  assert.equal(manager.lives, 0);
  assert.equal(manager.phase, 'gameover');

  manager.restart();
  assert.equal(manager.wave, 1);
  assert.equal(manager.lives, CONFIG.player.lives);
  assert.equal(manager.score, 0);
  assert.equal(manager.phase, 'playing');
});

test('victoria (T09): limpiar la oleada 5 deja la pantalla en ¡VICTORIA!', () => {
  const { player, manager } = makeGame();
  const ball = makeBall(100, 186);
  for (let frame = 0; frame < 6000 && manager.phase !== 'victory'; frame += 1) {
    const target = manager.enemies.find((enemy) => !enemy.isDefeated());
    if (target) {
      ball.body.x = target.body.x;
      ball.body.y = target.body.y;
    }
    manager.update(step, player, {}, ball);
    manager.bullets.length = 0; // sin bulos del Tertuliano en esta prueba.
    if (manager.phase === 'gameover') manager.restart();
  }
  assert.equal(manager.phase, 'victory');
  assert.equal(manager.wave, CONFIG.wave.winWave);
});
