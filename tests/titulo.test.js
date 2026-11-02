// Regresión de la pantalla de título: la línea del récord no puede cruzarse con
// la pista «ELIGE MODO · ELIGE JUEGO» ni con la caja de controles.
//
// Se dibuja el título de verdad con un canvas instrumentado (sin necesitar
// @napi-rs/canvas) que apunta las cajas de cada texto y la franja opaca del
// récord, y se comprueba que el récord queda dentro de su franja y fuera de las
// demás cajas de texto de la columna central.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { W } from '../src/config.js';
import { createGame } from '../src/game.js';

const NOOP = () => {};

function fakeContext() {
  const texts = [];
  const bands = [];
  let font = '40px sans-serif';
  let fill = '#000000';
  const ctx = {
    set font(v) { font = v; }, get font() { return font; },
    set fillStyle(v) { fill = v; }, get fillStyle() { return fill; },
    strokeStyle: '#000', lineWidth: 1, globalAlpha: 1, textAlign: 'left', textBaseline: 'alphabetic',
    measureText(s) { const size = Number((font.match(/(\d+)px/) || [0, 40])[1]); return { width: s.length * size * 0.5, height: size }; },
    // roundRect se usa para las cajas de la interfaz; solo interesa la del récord.
    roundRect(x, y, w, h) { bands.push({ x, y, w, h, fill }); },
    fillText(s, x, y) { texts.push({ s: String(s), x, y, font }); },
    strokeText: NOOP, save: NOOP, restore: NOOP, beginPath: NOOP, closePath: NOOP,
    moveTo: NOOP, lineTo: NOOP, arc: NOOP, ellipse: NOOP, quadraticCurveTo: NOOP, bezierCurveTo: NOOP,
    fill: NOOP, stroke: NOOP, clip: NOOP, translate: NOOP, scale: NOOP, rotate: NOOP, setTransform: NOOP,
    drawImage: NOOP, fillRect: NOOP, strokeRect: NOOP, clearRect: NOOP, setLineDash: NOOP,
    createLinearGradient: () => ({ addColorStop: NOOP }),
    createRadialGradient: () => ({ addColorStop: NOOP }),
  };
  return { ctx, texts, bands };
}

test('título: el récord va sobre su franja y no pisa otras líneas', () => {
  const input = {
    held: {}, pressed: {}, update: NOOP, takeAny: () => false,
    get touch() { return false; },
  };
  const audio = new Proxy({}, { get: () => NOOP });
  const game = createGame({ input, audio, themeId: 'marcos' });
  const { ctx, texts, bands } = fakeContext();
  game.render(ctx);

  const record = texts.find((t) => /RÉCORD/.test(t.s));
  assert.ok(record, 'no se dibujó la línea del récord (¿RÉCORD con tilde en hud.record?)');

  // La franja opaca del récord es la que contiene su línea base.
  const band = bands.find((b) => record.y > b.y + 6 && record.y < b.y + b.h - 4
    && record.x > b.x && record.x < b.x + b.w);
  assert.ok(band, `el récord (y=${record.y}) no está sobre su franja opaca; franjas: ${JSON.stringify(bands)}`);

  // La franja no puede quedar debajo de otras líneas de texto centradas de la
  // zona (el caso que fallaba: «ELIGE MODO · ELIGE JUEGO» encima del récord).
  const collide = texts.filter((t) => t !== record
    && Math.abs(t.x - W / 2) < 40
    && Math.abs(t.y - record.y) < 26
    && /ELIGE|PULSA|TOCA/.test(t.s));
  assert.deepEqual(collide.map((t) => t.s), [], 'el récord se cruza con la pista del menú');
});
