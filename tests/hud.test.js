import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createHud } from '../src/hud.js';

/** ctx de canvas falso que cuenta las llamadas, como en player.test.js. */
function mockCtx() {
  const calls = { fillText: [], fillRect: 0, strokeRect: 0, arc: 0 };
  return {
    calls,
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    lineWidth: 1,
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    fill() {},
    fillText(text) { calls.fillText.push(text); },
    fillRect() { calls.fillRect += 1; },
    strokeRect() { calls.strokeRect += 1; },
    arc() { calls.arc += 1; },
    measureText() { return { width: 40 }; },
  };
}

test('config.js expone los números del título y del tutorial (norma 13)', () => {
  assert.ok(CONFIG.title.blinkSeconds > 0);
  assert.equal(CONFIG.tutorial.wave, 1);
});

test('pantalla de título: logo, controles y aviso parpadeante', () => {
  const ctx = mockCtx();
  const hud = createHud({ config: CONFIG });
  hud.render(ctx, {
    width: CONFIG.screen.width,
    height: CONFIG.screen.height,
    tick: 0,
    phase: 'title',
  });
  const texts = ctx.calls.fillText;
  assert.ok(texts.includes('TUMBLE DOG'));
  assert.ok(texts.includes('PULSA Z O ESPACIO PARA JUGAR'));
  assert.ok(texts.includes('A/D MOVER · ESPACIO SALTAR · X ASPIRAR · Z LANZAR · M SONIDO'));

  // Un ciclo de parpadeo (blinkSeconds) oculta el aviso.
  const ctx2 = mockCtx();
  createHud({ config: CONFIG }).render(ctx2, {
    width: CONFIG.screen.width,
    height: CONFIG.screen.height,
    tick: Math.ceil(CONFIG.title.blinkSeconds * 60),
    phase: 'title',
  });
  assert.ok(!ctx2.calls.fillText.includes('PULSA Z O ESPACIO PARA JUGAR'));
});

test('HUD en juego: puntos, oleada y vidas como corazones', () => {
  const ctx = mockCtx();
  const hud = createHud({ config: CONFIG });
  hud.render(ctx, {
    width: CONFIG.screen.width,
    height: CONFIG.screen.height,
    tick: 0,
    phase: 'playing',
    score: 120,
    wave: 2,
    lives: 2,
    maxLives: CONFIG.player.lives,
    muted: false,
  });
  const texts = ctx.calls.fillText;
  assert.ok(texts.includes('PUNTOS 120'));
  assert.ok(texts.includes('OLEADA 2'));
  // Cada corazón se dibuja con dos circunferencias; maxLives corazones.
  assert.equal(ctx.calls.arc, CONFIG.player.lives * 2);
  // Controles en la parte inferior.
  assert.ok(texts.some((text) => text.includes('X ASPIRAR')));
});

test('HUD en juego marca el sonido apagado', () => {
  const ctx = mockCtx();
  createHud({ config: CONFIG }).render(ctx, {
    width: CONFIG.screen.width,
    height: CONFIG.screen.height,
    tick: 0,
    phase: 'playing',
    score: 0,
    wave: 1,
    lives: 3,
    maxLives: 3,
    muted: true,
  });
  assert.ok(ctx.calls.fillText.includes('OLEADA 1 · MUDO'));
});

test('tutorial: la pista aparece solo cuando hay mensaje', () => {
  const ctx = mockCtx();
  createHud({ config: CONFIG }).render(ctx, {
    width: CONFIG.screen.width,
    height: CONFIG.screen.height,
    tick: 0,
    phase: 'playing',
    score: 0,
    wave: 1,
    lives: 3,
    maxLives: 3,
    muted: false,
    tutorial: { message: 'X: ¡ASPIRAR a los enemigos!' },
  });
  assert.ok(ctx.calls.fillText.includes('X: ¡ASPIRAR a los enemigos!'));
  assert.equal(ctx.calls.strokeRect, 1, 'la pista lleva caja amarilla');

  const ctx2 = mockCtx();
  createHud({ config: CONFIG }).render(ctx2, {
    width: CONFIG.screen.width,
    height: CONFIG.screen.height,
    tick: 0,
    phase: 'playing',
    score: 0,
    wave: 2,
    lives: 3,
    maxLives: 3,
    muted: false,
    tutorial: { message: null },
  });
  assert.equal(ctx2.calls.strokeRect, 0, 'sin pista, sin caja');
});

test('finales: GAME OVER y ¡VICTORIA! dibujan su pantalla', () => {
  const ctx = mockCtx();
  createHud({ config: CONFIG }).render(ctx, {
    width: CONFIG.screen.width,
    height: CONFIG.screen.height,
    tick: 0,
    phase: 'gameover',
    score: 300,
    wave: 3,
    lives: 0,
    maxLives: 3,
    muted: false,
    end: { title: 'GAME OVER', line1: 'PUNTOS 300 · OLEADA 3', line2: 'pulsa Z o ESPACIO para reintentar' },
  });
  const texts = ctx.calls.fillText;
  assert.ok(texts.includes('GAME OVER'));
  assert.ok(texts.includes('PUNTOS 300 · OLEADA 3'));

  const ctx2 = mockCtx();
  createHud({ config: CONFIG }).render(ctx2, {
    width: CONFIG.screen.width,
    height: CONFIG.screen.height,
    tick: 0,
    phase: 'victory',
    score: 900,
    wave: CONFIG.wave.winWave,
    lives: 3,
    maxLives: 3,
    muted: false,
    end: { title: '¡VICTORIA!', line1: 'PUNTOS 900 · 5 oleadas limpias', line2: 'pulsa Z o ESPACIO para jugar otra vez' },
  });
  assert.ok(ctx2.calls.fillText.includes('¡VICTORIA!'));
});

test('pausa: overlay sobre el juego', () => {
  const ctx = mockCtx();
  createHud({ config: CONFIG }).render(ctx, {
    width: CONFIG.screen.width,
    height: CONFIG.screen.height,
    tick: 0,
    phase: 'playing',
    score: 0,
    wave: 1,
    lives: 3,
    maxLives: 3,
    muted: false,
    paused: true,
  });
  assert.ok(ctx.calls.fillText.includes('PAUSA'));
});
