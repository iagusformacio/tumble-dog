import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createPlayer } from '../src/player.js';

const tick = (player, input = {}) => player.update(CONFIG.step, input);

test('Don Presi toma tamaño, posición y velocidad de CONFIG y queda dentro de la pantalla', () => {
  const player = createPlayer();
  assert.equal(player.body.width, CONFIG.player.width);
  assert.equal(player.body.height, CONFIG.player.height);
  assert.equal(player.body.x, CONFIG.player.spawnX);
  assert.equal(player.body.y, CONFIG.player.spawnY);

  tick(player, { horizontal: 1 });
  assert.equal(player.body.vx, CONFIG.player.walkSpeed);
  assert.ok(player.body.x > CONFIG.player.spawnX);
  assert.equal(player.facing, 1);
  tick(player, { horizontal: -1 });
  assert.equal(player.facing, -1);
  for (let i = 0; i < 400; i++) tick(player, { horizontal: -1 });
  assert.equal(player.body.x, 0);
  for (let i = 0; i < 400; i++) tick(player, { horizontal: 1 });
  assert.equal(player.body.x, CONFIG.screen.width - CONFIG.player.width);

  const customConfig = {
    ...CONFIG,
    screen: { width: 200, height: 150 },
    physics: { gravity: 600, jumpSpeed: 240 },
    player: {
      ...CONFIG.player,
      width: 20,
      height: 30,
      spawnX: 50,
      spawnY: 178,
      walkSpeed: 60,
    },
  };
  const custom = createPlayer({ config: customConfig });
  assert.equal(custom.body.width, 20);
  assert.equal(custom.body.height, 30);
  tick(custom, { horizontal: 1 });
  assert.equal(custom.body.vx, 60);
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

test('coyote time permite saltar hasta coyoteFrames después de dejar una plataforma, sin doble salto', () => {
  // Plataforma izquierda: x=24..116, y=158. Con width=16, en x=115 aún pisa; al andar sale al aire.
  const spawnAtEdge = () => {
    const p = createPlayer({ x: 115, y: 158 - CONFIG.player.height });
    tick(p);
    assert.equal(p.body.grounded, true);
    tick(p, { horizontal: 1 });
    assert.equal(p.body.grounded, false, 'ya ha dejado la plataforma');
    return p;
  };

  // En el último frame de coyote time (frame 6 tras caer del borde) todavía salta.
  const onTime = spawnAtEdge();
  for (let i = 0; i < CONFIG.player.coyoteFrames - 1; i++) tick(onTime);
  assert.equal(onTime.body.grounded, false);
  tick(onTime, { jump: true });
  assert.ok(onTime.body.vy < 0, 'salta dentro de coyoteFrames');
  // Consumido el coyote jump, soltar y volver a pulsar en el aire no permite doble salto.
  tick(onTime, { jump: false });
  tick(onTime, { jump: true });
  assert.ok(onTime.body.vy > -CONFIG.physics.jumpSpeed + CONFIG.physics.gravity * CONFIG.step);

  // Pasados coyoteFrames sin saltar, al frame siguiente ya no puede saltar en el aire.
  const tooLate = spawnAtEdge();
  for (let i = 0; i < CONFIG.player.coyoteFrames; i++) tick(tooLate);
  const vyBefore = tooLate.body.vy;
  tick(tooLate, { jump: true });
  assert.ok(tooLate.body.vy > vyBefore, 'fuera de coyoteFrames sigue cayendo');
});

test('buffer de salto dispara el salto al aterrizar si se pulsó hasta jumpBufferFrames antes', () => {
  // Averiguamos cuántos frames tarda en tocar el suelo desde y=150 en caída libre.
  const probe = createPlayer({ x: 152, y: 150 });
  let framesToLand = 0;
  while (!probe.body.grounded && framesToLand < 60) {
    tick(probe);
    framesToLand += 1;
  }
  assert.ok(framesToLand > CONFIG.player.jumpBufferFrames + 2);

  // Pulsación fugaz (1 frame) exactamente jumpBufferFrames antes de aterrizar -> salta al tocar suelo.
  const buffered = createPlayer({ x: 152, y: 150 });
  const pressAt = framesToLand - CONFIG.player.jumpBufferFrames;
  for (let f = 1; f <= framesToLand; f++) {
    tick(buffered, { jump: f === pressAt });
  }
  assert.equal(buffered.body.vy, -CONFIG.physics.jumpSpeed, 'salta justo al aterrizar con impulso completo');
  assert.equal(buffered.body.grounded, false);

  // Pulsación un frame demasiado pronto (jumpBufferFrames + 1 antes de aterrizar) -> caduca y no rebota.
  const expired = createPlayer({ x: 152, y: 150 });
  const earlyPressAt = framesToLand - CONFIG.player.jumpBufferFrames - 1;
  for (let f = 1; f <= framesToLand; f++) {
    tick(expired, { jump: f === earlyPressAt });
  }
  assert.equal(expired.body.grounded, true, 'el buffer caducado no dispara salto');
  assert.equal(expired.body.vy, 0);
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
