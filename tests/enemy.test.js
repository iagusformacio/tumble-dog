import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEnemy } from '../src/enemy.js';
import { createEnemyManager } from '../src/enemies.js';
import { createPlayer } from '../src/player.js';
import { CONFIG } from '../src/config.js';

const tick = (dt, fn) => fn(dt);

test('La Portavoz patrulla su plataforma y se para al girar', () => {
  const enemy = createEnemy({ x: 30, y: 136 });
  const startX = enemy.body.x;
  for (let i = 0; i < 30; i++) enemy.update(1 / 60, {});
  assert.ok(enemy.body.x > startX, 'avanza hacia la derecha');
  assert.equal(enemy.state, 'patrol');
  // La plataforma izquierda va de x=24 a x=116: nunca se sale de ella.
  for (let i = 0; i < 600; i++) {
    enemy.update(1 / 60, {});
    assert.ok(enemy.body.x >= 24, `se sale por la izquierda (${enemy.body.x})`);
    assert.ok(enemy.body.x + enemy.body.width <= 116.01, `se sale por la derecha (${enemy.body.x})`);
  }
});

test('girar en el borde le cuesta una pausa corta', () => {
  const enemy = createEnemy({ x: 30, y: 136 });
  const speed = CONFIG.enemy.portavoz.speed;
  const frames = Math.ceil((116 - 16 - 2 - 30) / (speed / 60)) + 1;
  for (let i = 0; i < frames; i++) enemy.update(1 / 60, {});
  assert.equal(enemy.direction, -1, 'ha girado al llegar al borde derecho');
  const xTrasGiro = enemy.body.x;
  enemy.update(1 / 60, {});
  assert.equal(enemy.body.x, xTrasGiro, 'en la pausa no se mueve');
});

test('aspirada queda dentro y se escapa a los 3 s si no se lanza', () => {
  const player = createPlayer();
  const enemy = createEnemy({ x: 40, y: 136 });
  assert.equal(enemy.suck(), true);
  assert.equal(enemy.isContained(), true);
  assert.equal(enemy.suck(), false, 'no se puede aspirar dos veces');
  assert.equal(enemy.isDangerous(), false, 'dentro no hace daño');
  for (let i = 0; i < Math.round(CONFIG.suck.escapeSeconds * 60) - 1; i++) enemy.update(1 / 60, { player });
  assert.equal(enemy.isContained(), true);
  for (let i = 0; i < 5; i++) enemy.update(1 / 60, { player });
  assert.equal(enemy.state, 'stunned');
  assert.equal(enemy.isDangerous(), false, 'mareada tampoco hace daño');
  for (let i = 0; i < Math.round(CONFIG.suck.escapeStunSeconds * 60) + 2; i++) enemy.update(1 / 60, { player });
  assert.equal(enemy.state, 'patrol');
  assert.equal(enemy.isDangerous(), true);
});

test('release devuelve el enemigo a la patrulla solo si estaba dentro', () => {
  const enemy = createEnemy({ x: 40, y: 136 });
  assert.equal(enemy.release(), false);
  enemy.suck();
  assert.equal(enemy.release(), true);
  assert.equal(enemy.state, 'patrol');
});

test('Don Presi aspira a la Portavoz con la boquilla y solo una a la vez', () => {
  const manager = createEnemyManager();
  const player = createPlayer();
  const enemy = manager.enemies[0];
  // Coloca a Don Presi justo a la izquierda del enemigo, mirando a la derecha.
  player.body.x = enemy.body.x - 18;
  player.body.y = enemy.body.y + 2;
  player.update(1 / 60, { horizontal: 1 });
  assert.equal(player.facing, 1);
  player.body.x = enemy.body.x - 18;
  player.body.y = enemy.body.y + 2;
  player.update(1 / 60, { suck: true });
  manager.update(1 / 60, player, { suck: true });
  assert.equal(enemy.isContained(), true);
  assert.ok(manager.carried);
  assert.equal(manager.lives, CONFIG.player.lives, 'a quien tiene dentro no le quita vida');
});

test('solo aspira lo que está delante, no a la espalda', () => {
  const manager = createEnemyManager();
  const player = createPlayer();
  const enemy = manager.enemies[0];
  // Don Presi a la izquierda del enemigo, mirando a la izquierda: lo tiene a la espalda.
  player.body.x = enemy.body.x - 30;
  player.body.y = enemy.body.y + 2;
  player.update(1 / 60, { horizontal: -1 });
  assert.equal(player.facing, -1);
  player.body.x = enemy.body.x - 30;
  player.update(1 / 60, { suck: true, horizontal: -1 });
  player.body.x = enemy.body.x - 30;
  manager.update(1 / 60, player, { suck: true });
  assert.equal(enemy.state, 'patrol', 'al aspirar hacia la izquierda no engancha a su espalda');
});

test('tocar a un enemigo libre quita una vida y da 2 s de invulnerabilidad', () => {
  const manager = createEnemyManager();
  const player = createPlayer();
  const enemy = manager.enemies[0];
  player.body.x = enemy.body.x;
  player.body.y = enemy.body.y;
  manager.update(1 / 60, player, {});
  assert.equal(manager.lives, CONFIG.player.lives - 1);
  assert.equal(manager.hits, 1);
  // Inmediatamente después no vuelve a doler.
  for (let i = 0; i < 30; i++) manager.update(1 / 60, player, {});
  assert.equal(manager.hits, 1);
});

test('si se escapa sin lanzarla, reaparece para no dejar el nivel vacío', () => {
  const manager = createEnemyManager();
  const player = createPlayer();
  const enemy = manager.enemies[0];
  enemy.suck();
  for (let i = 0; i < Math.round(CONFIG.suck.escapeSeconds * 60) + 5; i++) manager.update(1 / 60, player, {});
  assert.equal(enemy.state, 'stunned');
  for (let i = 0; i < Math.round((CONFIG.enemy.respawnSeconds + CONFIG.suck.escapeStunSeconds) * 60) + 10; i++) {
    manager.update(1 / 60, player, {});
  }
  assert.ok(manager.enemies[0].canBeSucked(), 'hay un enemigo libre otra vez');
});

test('se dibuja con el contexto de canvas (provisional por código)', () => {
  const enemy = createEnemy({ x: 40, y: 136 });
  let fills = 0;
  const ctx = { save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, fillRect() { fills++; } };
  enemy.render(ctx, 0.5);
  assert.ok(fills > 0);
  enemy.suck();
  const before = fills;
  enemy.render(ctx);
  assert.equal(fills, before, 'dentro de Don Presi no se dibuja aparte');
  enemy.drawBody(ctx);
  assert.ok(fills > before, 'pero sí se puede dibujar encoquita en la boquilla');
});

test('el enemigo aspirado se ve encoquito en la boquilla sin romper el render', () => {
  const manager = createEnemyManager();
  const player = createPlayer();
  manager.enemies[0].suck();
  let transforms = 0;
  const ctx = { save() {}, restore() {}, translate() { transforms++; }, scale() {}, rotate() {}, fillRect() {} };
  manager.render(ctx, 0.5, player);
  assert.ok(transforms >= 1);
});
