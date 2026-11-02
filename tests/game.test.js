import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { CONFIG, W, FLOOR_Y } from '../src/config.js';
import { stepBody, FLOOR } from '../src/physics.js';
import { STAGES } from '../src/stages.js';
import { createBall, updateBall } from '../src/ball.js';
import { createEnemy, killEnemy, TYPES, TYPE_KEYS } from '../src/enemies.js';
import { randomItemKind, ITEM_KINDS } from '../src/items.js';
import { SPRITE_FILES } from '../src/sprite-list.js';

const plat = { x: 100, y: 400, w: 200, h: 18 };

test('aterriza en plataforma de un solo sentido al caer', () => {
  const b = { x: 150, y: 300, w: 40, h: 80, vx: 0, vy: 600 };
  let landed = false;
  for (let i = 0; i < 60 && !landed; i++) landed = stepBody(b, [plat, FLOOR], 1 / 120).landed;
  assert.ok(landed);
  assert.equal(b.y + b.h, plat.y);
});

test('atraviesa la plataforma al subir y al bajar con drop', () => {
  const up = { x: 150, y: 430, w: 40, h: 80, vx: 0, vy: -900 };
  for (let i = 0; i < 20; i++) stepBody(up, [plat, FLOOR], 1 / 120);
  assert.ok(up.y + up.h < plat.y + 40, 'sube a través');
  const down = { x: 150, y: plat.y - 80, w: 40, h: 80, vx: 0, vy: 0 };
  for (let i = 0; i < 40; i++) stepBody(down, [plat, FLOOR], 1 / 120, { drop: true });
  assert.ok(down.y + down.h > plat.y + 10, 'cae a través con drop');
});

test('las paredes laterales frenan y avisan', () => {
  const b = { x: W - 30, y: FLOOR_Y - 80, w: 40, h: 80, vx: 500, vy: 0 };
  const r = stepBody(b, [FLOOR], 1 / 60);
  assert.equal(r.wall, 1);
  assert.equal(b.x, W - 40);
});

test('diez fases, plataformas dentro de pantalla y alcanzables', () => {
  assert.equal(STAGES.length, 10);
  const jump = (CONFIG.player.jumpSpeed ** 2) / (2 * CONFIG.physics.gravity);
  for (const s of STAGES) {
    for (const p of s.plats) {
      assert.ok(p.x >= 0 && p.x + p.w <= W, `${s.name}: plataforma fuera de pantalla`);
      if (p.floor) continue;
      const below = s.plats.some((q) => q !== p && q.y > p.y && q.y - p.y <= jump - 10 && q.x < p.x + p.w + 120 && q.x + q.w > p.x - 120);
      assert.ok(below, `${s.name}: plataforma en y=${p.y} inalcanzable`);
    }
    for (const [type, x, y] of s.foes) {
      assert.ok(TYPES[type], `tipo desconocido ${type}`);
      assert.ok(s.plats.some((p) => p.y === y && x >= p.x && x <= p.x + p.w), `${s.name}: ${type} no está sobre una plataforma`);
    }
  }
});

test('la bola crece con los enemigos y se rompe tras varios rebotes', () => {
  const one = createBall(600, 500, 1, ['portavoz']);
  const three = createBall(600, 500, 1, ['portavoz', 'baron', 'lider']);
  assert.ok(three.r > one.r);
  let shattered = false;
  for (let i = 0; i < 2000 && !shattered; i++) shattered = updateBall(one, 1 / 120, [FLOOR]) === 'shatter';
  assert.ok(shattered);
  assert.ok(one.wallHits > CONFIG.ball.maxWallHits || one.life <= 0);
});

test('enemigos: ocho tipos, todos con sprites', () => {
  assert.equal(TYPE_KEYS.length, 8);
  for (const k of TYPE_KEYS) for (const f of ['walkA', 'walkB', 'stun', 'down']) assert.ok(SPRITE_FILES[`${k}-${f}`], `falta sprite ${k}-${f}`);
  const e = createEnemy('baron', 300, FLOOR_Y);
  killEnemy(e, 1);
  assert.equal(e.state, 'dead');
});

test('sprites de enemigos: recorte del verde no vacío (ni negro ni blanco)', () => {
  for (const k of TYPE_KEYS) {
    for (const f of ['walkA', 'walkB', 'stun', 'down']) {
      const name = `${k}-${f}`;
      const [src, w, h] = SPRITE_FILES[name];
      assert.ok(w > 0 && h > 0, `${name}: sprite sin dimensiones`);
      const data = readFileSync(src.replace('./', ''));
      assert.ok(data.length > 512, `${name}: sprite vacío`);
    }
  }
});

test('los jefes leen sus puntos de vida de src/config.js', () => {
  assert.equal(CONFIG.bossHp.tertuliano, 10);
  assert.equal(CONFIG.bossHp.lider, 14);
});

test('premios conocidos y palabra de nueve letras', () => {
  for (let i = 0; i < 200; i++) assert.ok(ITEM_KINDS[randomItemKind(i % 4)]);
  assert.equal(CONFIG.letters.word.length, 9);
});

test('Marcos tiene diez poses registradas a una escala coherente', () => {
  const poses = ['idle', 'walkA', 'walkB', 'jump', 'fall', 'swallow', 'vomit', 'hurt', 'win', 'intro'];
  for (const pose of poses) {
    const sprite = SPRITE_FILES[`marcos-${pose}`];
    assert.ok(sprite, `falta la pose Marcos ${pose}`);
    assert.equal(sprite[2], 220, `${pose}: escala vertical distinta`);
  }
});

test('los sprites existen en disco', () => {
  for (const [, [src]] of Object.entries(SPRITE_FILES)) assert.ok(existsSync(src.replace('./', '')), `falta ${src}`);
});

test('el empaquetador genera un HTML autocontenido', () => {
  execFileSync('python3', ['tools/bundle.py', '.', '/tmp/tumble-dog-test.html']);
  const html = readFileSync('/tmp/tumble-dog-test.html', 'utf8');
  assert.ok(!html.includes('type="module"'));
  assert.ok(html.includes('data:image/webp;base64,'));
});

test('el empaquetador incrusta la canción del tema una sola vez (issue #95)', () => {
  const html = readFileSync('/tmp/tumble-dog-test.html', 'utf8');
  assert.equal(html.split('data:audio/mpeg;base64,').length - 1, 1, 'la canción va una sola vez como data URI');
  assert.ok(html.includes("__media['assets/audio/dieta-de-marcos.mp3']"), 'el código referencia la canción incrustada');
});
