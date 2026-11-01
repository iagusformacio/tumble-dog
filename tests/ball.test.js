import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createBall } from '../src/ball.js';
import { DEFAULT_PLATFORMS } from '../src/physics.js';

const step = CONFIG.step;

function makeBall(x, y, direction = 1) {
  return createBall({ x, y, direction, carrier: null, platforms: DEFAULT_PLATFORMS });
}

test('la bola sale a la velocidad de CONFIG.ball.speed en la dirección dada', () => {
  assert.equal(makeBall(100, 190).body.vx, CONFIG.ball.speed);
  assert.equal(makeBall(100, 190, -1).body.vx, -CONFIG.ball.speed);
});

test('la bola rebota en la pared derecha y conserva la velocidad de rebote', () => {
  const ball = makeBall(300, 190);
  let bounced = false;
  for (let i = 0; i < 60 && ball.alive; i += 1) {
    ball.update(step);
    if (ball.body.vx < 0) {
      bounced = true;
      break;
    }
  }
  assert.ok(bounced, 'la bola vuelve hacia la izquierda tras la pared');
  assert.ok(Math.abs(ball.body.vx) <= CONFIG.ball.speed);
});

test('la bola desaparece sola tras ball.lifeSeconds', () => {
  const ball = makeBall(100, 190);
  assert.equal(ball.alive, true);
  for (let i = 0; i < Math.ceil(CONFIG.ball.lifeSeconds / step) + 2; i += 1) {
    ball.update(step);
  }
  assert.equal(ball.alive, false);
});
