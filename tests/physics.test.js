import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBody, intersectsAabb, stepPhysics } from '../src/physics.js';

const floor = [{ x: 0, y: 100, width: 200, height: 20 }];

test('AABB considera solapamiento estricto y respeta los bordes', () => {
  assert.equal(intersectsAabb(
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 10, y: 0, width: 10, height: 10 },
  ), false);
  assert.equal(intersectsAabb(
    { x: 0, y: 0, width: 11, height: 10 },
    { x: 10, y: 0, width: 10, height: 10 },
  ), true);
});

test('gravedad aterriza sobre la plataforma y salto aplica impulso hacia arriba', () => {
  const body = createBody({ x: 20, y: 60, width: 12, height: 20 });
  for (let i = 0; i < 120; i += 1) stepPhysics(body, {}, 1 / 60, { platforms: floor });

  assert.equal(body.y, 80);
  assert.equal(body.grounded, true);
  stepPhysics(body, { jumpPressed: true }, 1 / 60, { platforms: floor });
  assert.ok(body.y < 80);
  assert.ok(body.velocityY < 0);
  assert.equal(body.grounded, false);
});

test('colisión lateral resuelve AABB y limita el cuerpo a los bordes del mundo', () => {
  const wall = [{ x: 50, y: 0, width: 10, height: 100 }];
  const body = createBody({ x: 20, y: 20, width: 20, height: 20 });
  stepPhysics(body, { horizontal: 1 }, 0.5, { platforms: wall, gravity: 0, worldWidth: 100 });
  assert.equal(body.x, 30);
  assert.equal(body.velocityX, 0);

  body.x = 92;
  stepPhysics(body, { horizontal: 1 }, 0.1, { platforms: [], gravity: 0, worldWidth: 100 });
  assert.equal(body.x, 80);
});
