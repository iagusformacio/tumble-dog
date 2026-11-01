import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from '../src/player.js';

const tick = (player, input = {}) => player.update(1 / 60, input);

test('Don Presi anda en ambas direcciones y queda dentro de la pantalla', () => {
  const player = createPlayer();
  tick(player, { horizontal: 1 });
  assert.ok(player.body.x > 152);
  assert.equal(player.facing, 1);
  tick(player, { horizontal: -1 });
  assert.equal(player.facing, -1);
  for (let i = 0; i < 400; i++) tick(player, { horizontal: -1 });
  assert.equal(player.body.x, 0);
  for (let i = 0; i < 400; i++) tick(player, { horizontal: 1 });
  assert.equal(player.body.x, 304);
});

test('salto usa flanco: no rebota al mantener pulsado y puede saltar tras soltar', () => {
  const player = createPlayer();
  tick(player);
  assert.equal(player.body.grounded, true);
  tick(player, { jump: true });
  assert.ok(player.body.vy < 0);
  for (let i = 0; i < 120; i++) tick(player, { jump: true });
  assert.equal(player.body.grounded, true);
  tick(player);
  tick(player, { jump: true });
  assert.ok(player.body.vy < 0);
});

test('aspiración provisional refleja la entrada y se dibuja sin capturar', () => {
  const player = createPlayer();
  let strokes = 0;
  const ctx = { save() {}, restore() {}, translate() {}, scale() {}, fillRect() {},
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() { strokes++; } };
  tick(player, { horizontal: -1, suck: true });
  assert.equal(player.sucking, true);
  player.render(ctx, 0.5);
  assert.equal(strokes, 1);
  tick(player);
  player.render(ctx);
  assert.equal(player.sucking, false);
  assert.equal(strokes, 1);
});
