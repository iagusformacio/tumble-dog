import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overlaps, stepBody, DEFAULT_PLATFORMS } from '../src/physics.js';

const body = (changes = {}) => ({ x: 0, y: 0, width: 10, height: 10, vx: 0, vy: 0, grounded: false, ...changes });
const box = (x, y, width, height, oneWay = false) => ({ x, y, width, height, oneWay });

test('AABB: solapa con área, no al tocar bordes o esquinas', () => {
  const a = box(0, 0, 10, 10);
  assert.equal(overlaps(a, box(9, 9, 10, 10)), true);
  assert.equal(overlaps(a, box(10, 0, 10, 10)), false);
  assert.equal(overlaps(a, box(10, 10, 10, 10)), false);
  assert.equal(overlaps(a, box(-20, 0, 10, 10)), false);
});

test('gravedad, aterrizaje barrido y reposo sobre suelo', () => {
  const player = body({ vy: 1000 });
  const floor = box(-20, 50, 100, 2);
  stepBody(player, [floor], 0.1, { gravity: 100 });
  assert.equal(player.y, 40);
  assert.equal(player.vy, 0);
  assert.equal(player.grounded, true);
  stepBody(player, [floor], 1 / 60);
  assert.equal(player.y, 40);
  assert.equal(player.grounded, true);
  player.x = 100;
  stepBody(player, [floor], 1 / 60);
  assert.equal(player.grounded, false);
  assert.ok(player.vy > 0);
});

test('salta solo desde el suelo y vuelve a caer, sin doble salto', () => {
  const player = body({ y: 40, grounded: true });
  const floor = box(-20, 50, 100, 10);
  stepBody(player, [floor], 1 / 60, { jump: true, gravity: 600, jumpSpeed: 180 });
  assert.ok(player.y < 40);
  assert.equal(player.vy, -170);
  assert.equal(player.grounded, false);
  stepBody(player, [floor], 1 / 60, { jump: true, gravity: 600, jumpSpeed: 180 });
  assert.equal(player.vy, -160);
  for (let i = 0; i < 60; i++) stepBody(player, [floor], 1 / 60, { gravity: 600 });
  assert.equal(player.y, 40);
  assert.equal(player.grounded, true);
});

test('plataformas de una dirección dejan subir y bloquean la caída, no los lados', () => {
  const platform = box(0, 30, 50, 4, true);
  const player = body({ x: 5, y: 45, vy: -100 });
  stepBody(player, [platform], 0.3, { gravity: 0 });
  assert.equal(player.y, 15);
  assert.equal(player.vy, -100);
  player.vy = 200;
  stepBody(player, [platform], 0.2, { gravity: 0 });
  assert.equal(player.y, 20);
  assert.equal(player.grounded, true);
  const side = body({ x: -20, y: 30, vx: 100 });
  stepBody(side, [platform], 0.3, { gravity: 0 });
  assert.equal(side.x, 10);
});

test('paredes y techos sólidos bloquean en ambos sentidos sin atravesarlos', () => {
  const wall = box(30, -100, 2, 200);
  const right = body({ vx: 500 });
  stepBody(right, [wall], 0.2, { gravity: 0 });
  assert.equal(right.x, 20);
  assert.equal(right.vx, 0);
  const left = body({ x: 100, vx: -500 });
  stepBody(left, [wall], 0.2, { gravity: 0 });
  assert.equal(left.x, 32);
  assert.equal(left.vx, 0);
  const ceiling = box(-20, 20, 100, 2);
  const rising = body({ y: 80, vy: -1000 });
  stepBody(rising, [ceiling], 0.1, { gravity: 0 });
  assert.equal(rising.y, 22);
  assert.equal(rising.vy, 0);
  assert.equal(rising.grounded, false);
});

test('elige la superficie más próxima con independencia del orden', () => {
  for (const platforms of [[box(0, 70, 50, 1), box(0, 40, 50, 1)], [box(0, 40, 50, 1), box(0, 70, 50, 1)]]) {
    const player = body({ vy: 1000 });
    stepBody(player, platforms, 0.1, { gravity: 0 });
    assert.equal(player.y, 30);
  }
});

test('dt inválido se rechaza y el escenario provisional cabe en la pantalla', () => {
  assert.throws(() => stepBody(body(), [], -1), RangeError);
  assert.throws(() => stepBody(body(), [], NaN), RangeError);
  assert.throws(() => stepBody(body(), [], 1, { gravity: Infinity }), RangeError);
  for (const p of DEFAULT_PLATFORMS) {
    assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.width <= 320 && p.y + p.height <= 224);
  }
});


test('contacto exacto con pared detiene la velocidad inmediatamente', () => {
  const player = body({ vx: 100 });
  stepBody(player, [box(20, 0, 10, 10)], 0.1, { gravity: 0 });
  assert.equal(player.x, 10);
  assert.equal(player.vx, 0);
});

test('salto por defecto alcanza las plataformas del nivel provisional', () => {
  const player = body({ x: 30, y: 198, grounded: true });
  stepBody(player, DEFAULT_PLATFORMS, 1 / 60, { jump: true });
  let reached = false;
  for (let i = 0; i < 120; i++) {
    stepBody(player, DEFAULT_PLATFORMS, 1 / 60);
    if (player.grounded && player.y === 148) { reached = true; break; }
  }
  assert.equal(reached, true);
});
