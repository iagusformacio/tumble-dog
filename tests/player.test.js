import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, FLOOR_Y } from '../src/config.js';
import { FLOOR } from '../src/physics.js';
import { createPlayer, updatePlayer, nozzle, drawPlayer, drawHeld } from '../src/player.js';
import { __setImagesForNode, setSpriteMap } from '../src/sprites.js';

const fx = { dust() {} };
const dt = 1 / 120;

test('giro inmediato aspirando con 1 a 4 enemigos, en suelo y aire', () => {
  for (let count = 1; count <= CONFIG.vacuum.maxHeld; count++) {
    for (const vy of [null, -500, 500]) {
      const p = createPlayer();
      p.held = Array(count).fill('portavoz');
      if (vy !== null) { p.y = FLOOR_Y - p.h - 100; p.onGround = false; p.vy = vy; }
      for (const dir of [-1, 1, -1]) {
        const ev = updatePlayer(p, dt, { held: { suck: true, left: dir < 0, right: dir > 0 }, pressed: { shoot: true } }, [FLOOR], fx);
        assert.equal(p.facing, dir);
        assert.equal(p.sucking, true);
        assert.equal(ev.shoot, true);
        assert.equal(nozzle(p).x - (p.x + p.w / 2), dir * 56);
        assert.equal(p.held.length, count);
      }
      updatePlayer(p, dt, { held: { suck: true }, pressed: {} }, [FLOOR], fx);
      assert.equal(p.facing, -1, 'sin dirección conserva la orientación');
    }
  }
});

test('sprite y burbujas se reflejan juntos respecto al centro', () => {
  setSpriteMap({});
  __setImagesForNode(new Map([['presi-suck', { width: 169, height: 220 }], ['portavoz-stun', { width: 120, height: 220 }]]));
  function record(p) {
    const calls = [];
    const ctx = {
      save() {}, restore() {}, translate(x, y) { calls.push(['translate', x, y]); },
      scale(x, y) { calls.push(['scale', x, y]); }, drawImage() {},
      createRadialGradient(x, y, r, bx, by) { calls.push(['bubble', bx, by]); return { addColorStop() {} }; },
      beginPath() {}, arc() {}, fill() {}, stroke() {}, clip() {},
    };
    drawPlayer(ctx, p, 0); drawHeld(ctx, p, 0);
    return calls;
  }
  try {
    const p = createPlayer(); p.sucking = true; p.held = Array(4).fill('portavoz');
    const right = record(p); p.facing = -1; const left = record(p);
    const bubbles = calls => calls.filter(c => c[0] === 'bubble');
    for (let i = 0; i < 4; i++) {
      assert.ok(Math.abs(bubbles(right)[i][1] + bubbles(left)[i][1] - 2 * (p.x + p.w / 2)) < 1e-9);
      assert.equal(bubbles(right)[i][2], bubbles(left)[i][2]);
    }
    assert.equal(right.filter(c => c[0] === 'scale' && c[1] === -1).length, 0);
    assert.equal(left.filter(c => c[0] === 'scale' && c[1] === -1).length, 5, 'jugador y cuatro sprites retenidos');
  } finally { __setImagesForNode(new Map()); }
});

test('el tema Tumble Dog tiene textos de captura y lanzamiento localizados', async () => {
  const { THEME } = await import('../src/themes/tumbledog.js');
  for (const key of ['capture', 'shatter', 'wall', 'escape', 'oneup', 'chaser']) {
    assert.ok(THEME.juice[key], `falta el texto ${key}`);
  }
});
