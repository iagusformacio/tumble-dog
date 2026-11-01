import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createBall } from '../src/ball.js';
import { createEnemy } from '../src/enemy.js';
import { createEnemyManager } from '../src/enemies.js';
import { createPlayer } from '../src/player.js';

const dt = 1 / 60;

function recordingContext() {
  const calls = [];
  return new Proxy({ calls }, {
    get(target, property) {
      if (!(property in target)) return (...args) => calls.push([property, ...args]);
      return target[property];
    },
  });
}

test('la bola sale en línea recta a ball.speed y se mantiene en pantalla', () => {
  const ball = createBall({ x: 40, y: 100, direction: 1 });
  const x0 = ball.body.x;
  ball.update(dt);
  assert.ok(Math.abs(ball.body.vx - CONFIG.ball.speed) < 1e-9);
  assert.ok(ball.body.x > x0);
  for (let i = 0; i < 600; i += 1) {
    ball.update(dt);
    assert.ok(ball.body.x >= 0 && ball.body.x + ball.body.width <= CONFIG.screen.width);
    assert.ok(ball.body.y >= 0 && ball.body.y + ball.body.height <= CONFIG.screen.height);
  }
});

test('la bola rebota en la pared derecha y en el suelo', () => {
  const ball = createBall({ x: 300, y: 100, direction: 1 });
  let bouncedWall = false;
  let bouncedFloor = false;
  for (let i = 0; i < 300; i += 1) {
    const vyBefore = ball.body.vy;
    ball.update(dt);
    if (ball.body.vx < 0) bouncedWall = true;
    if (vyBefore > 0 && ball.body.vy < 0) bouncedFloor = true;
  }
  assert.equal(bouncedWall, true, 'rebota en la pared derecha');
  assert.equal(bouncedFloor, true, 'rebota en el suelo');
});

test('la bola desaparece sola al cabo de ball.lifeSeconds', () => {
  const ball = createBall({ x: 40, y: 100, direction: 1 });
  assert.equal(ball.alive, true);
  for (let i = 0; i < Math.ceil(CONFIG.ball.lifeSeconds * 60) + 2; i += 1) ball.update(dt);
  assert.equal(ball.alive, false);
});

test('launchBall devuelve null si Don Presi no lleva a nadie dentro', () => {
  const manager = createEnemyManager();
  const player = createPlayer();
  assert.equal(manager.launchBall(player), null);
});

test('Don Presi aspira, lanza la bola y esta aplasta al enemigo con combo', () => {
  const manager = createEnemyManager();
  const player = createPlayer();
  const enemy = manager.enemies[0];

  // Lo aspira: Don Presi a la izquierda del enemigo, mirando a la derecha.
  player.body.x = enemy.body.x - 18;
  player.body.y = enemy.body.y + 2;
  player.update(dt, { suck: true });
  manager.update(dt, player, { suck: true });
  assert.ok(manager.carried, 'lleva a la Portavoz dentro');

  // Lanza: la bola sale de la boquilla hacia la derecha y el enemigo queda libre.
  const ball = manager.launchBall(player);
  assert.ok(ball, 'hay bola');
  assert.equal(manager.carried, null);
  assert.equal(ball.carrier, enemy);
  assert.ok(ball.body.vx > 0);
  assert.equal(enemy.state, 'patrol');

  // La bola alcanza al enemigo patrullando: aplastado y 100 puntos.
  ball.body.x = enemy.body.x - 2;
  ball.body.y = enemy.body.y;
  ball.body.vx = CONFIG.ball.speed;
  ball.body.vy = 0;
  manager.update(dt, player, {}, ball);
  assert.equal(enemy.state, 'defeated');
  assert.equal(manager.score, CONFIG.combo[0]);
  assert.equal(manager.lastCombo, 1);
});

test('combo en cadena: 100, 200, 400, 800... y se reinicia con cada lanzamiento', () => {
  const manager = createEnemyManager();
  const player = createPlayer();
  player.body.x = 300; // lejos de los enemigos

  // Mete a uno dentro y lanza: eso reinicia la cadena del combo.
  manager.enemies[0].suck();
  assert.ok(manager.launchBall(player));
  assert.equal(manager.comboChain, 0);

  const extra = [
    createEnemy({ x: 60, y: 186 }),
    createEnemy({ x: 120, y: 186 }),
    createEnemy({ x: 180, y: 186 }),
    createEnemy({ x: 240, y: 186 }),
    createEnemy({ x: 280, y: 186 }),
  ];
  manager.enemies.push(...extra);
  const ball = createBall({ x: 10, y: 190, direction: 1 });

  const all = [...manager.enemies];
  for (const enemy of all) {
    ball.body.x = enemy.body.x - 1;
    ball.body.y = enemy.body.y;
    ball.body.vx = CONFIG.ball.speed;
    ball.body.vy = 0;
    manager.update(dt, player, {}, ball);
  }
  assert.equal(manager.score, 100 + 200 + 400 + 800 + 800 + 800);
  assert.equal(manager.lastCombo, 6);
  assert.ok(all.every((enemy) => enemy.state === 'defeated'));

  // Nuevo lanzamiento: la cadena vuelve a empezar y la puntuación se conserva.
  const fresh = createEnemy({ x: 40, y: 136 });
  manager.enemies.push(fresh);
  fresh.suck();
  assert.ok(manager.launchBall(player));
  assert.equal(manager.comboChain, 0);
  const ball2 = createBall({ x: 30, y: 140, direction: 1 });
  ball2.body.x = fresh.body.x - 1;
  ball2.body.y = fresh.body.y;
  manager.update(dt, player, {}, ball2);
  assert.equal(fresh.state, 'defeated');
  assert.equal(manager.score, 100 + 200 + 400 + 800 + 800 + 800 + 100);
  assert.equal(manager.lastCombo, 1);
});

test('la bola también aplasta al enemigo mareado (stunned) pero no al que está dentro', () => {
  const manager = createEnemyManager();
  const player = createPlayer();
  player.body.x = 300;
  const enemy = manager.enemies[0];
  enemy.suck();
  const ball = createBall({ x: enemy.body.x - 1, y: enemy.body.y, direction: 1 });
  manager.update(dt, player, {}, ball);
  assert.equal(enemy.state, 'sucked', 'la bola no aplasta al que va dentro');

  enemy.release();
  enemy.crush(); // defeated ya no se puede volver a aplastar
  assert.equal(enemy.crush(), false);
});

test('render de la bola no falla con un contexto simulado', () => {
  const ball = createBall({ x: 40, y: 100, direction: 1 });
  ball.update(dt);
  const ctx = recordingContext();
  ball.render(ctx, 0.5);
  assert.ok(ctx.calls.some(([name]) => name === 'arc'));
});
