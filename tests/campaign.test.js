// C1 · Campaña «Dieta de Marcos» (issue #57): estructura, guardado y mecánicas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, W, FLOOR_Y } from '../src/config.js';
import { TYPES } from '../src/enemies.js';
import { SPRITE_FILES } from '../src/sprite-list.js';
import {
  BARS, CAMPAIGN_STAGES, CAMPAIGN_STAGE_COUNT, ROUNDS_PER_BAR, SAVE_KEY,
  stageIndexOf, barOfStage, roundOfStage, readProgress, writeProgress,
  clearProgress, progressForStage, modeList, fondoForStage,
} from '../src/campaign.js';
import { createBarMechanic } from '../src/bar_mechanics.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    get size() { return m.size; },
  };
}

test('C1: 4 bares × (3 rondas + jefe) = 16 fases', () => {
  assert.equal(BARS.length, 4);
  assert.equal(ROUNDS_PER_BAR, 4);
  assert.equal(CAMPAIGN_STAGE_COUNT, 16);
  assert.equal(CAMPAIGN_STAGES.length, 16);
  for (let b = 0; b < BARS.length; b++) {
    const group = CAMPAIGN_STAGES.slice(b * 4, b * 4 + 4);
    assert.equal(group.length, 4);
    group.forEach((s, r) => {
      assert.equal(s.bar, b);
      assert.equal(s.round, r);
      assert.equal(s.bossStage, r === 3);
      assert.equal(s.mechanic, BARS[b].mechanic);
      assert.equal(s.town, BARS[b].town);
    });
    for (let r = 0; r < 3; r++) assert.ok(!group[r].boss && group[r].foes.length > 0, `bar ${b} ronda ${r} sin enemigos`);
    assert.equal(group[3].bossName, BARS[b].boss);
    assert.ok(group[3].bossHp > 0);
    assert.equal(group[3].foes.length, 0);
  }
});

test('C1: las 16 fases tienen plataformas alcanzables y enemigos sobre ellas', () => {
  const jump = (CONFIG.player.jumpSpeed ** 2) / (2 * CONFIG.physics.gravity);
  for (const s of CAMPAIGN_STAGES) {
    for (const p of s.plats) {
      assert.ok(p.x >= 0 && p.x + p.w <= W, `${s.name}: plataforma fuera de pantalla`);
      if (p.floor) continue;
      const below = s.plats.some((q) => q !== p && q.y > p.y && q.y - p.y <= jump - 10 && q.x < p.x + p.w + 120 && q.x + q.w > p.x - 120);
      assert.ok(below, `${s.name}: plataforma en y=${p.y} inalcanzable`);
    }
    for (const [type, x, y] of s.foes) {
      assert.ok(TYPES[type], `${s.name}: tipo desconocido ${type}`);
      assert.ok(s.plats.some((p) => p.y === y && x >= p.x && x <= p.x + p.w), `${s.name}: ${type} no está sobre una plataforma`);
    }
    assert.ok(['barra', 'terraza', 'mercado', 'playa'].includes(s.theme), `${s.name}: escena de fondo desconocida`);
  }
  // El último bar es de noche y tiene más enemigos que el primero.
  assert.ok(CAMPAIGN_STAGES[12].foes.length > CAMPAIGN_STAGES[0].foes.length);
  assert.ok(CAMPAIGN_STAGES.slice(12).every((s) => s.night === true));
  assert.ok(CAMPAIGN_STAGES.slice(0, 12).every((s) => !s.night));
});

test('C1: cada fase usa un fondo de bar ya registrado en el manifiesto', () => {
  const nombres = new Set();
  for (const s of CAMPAIGN_STAGES) {
    const fondo = fondoForStage(s);
    assert.ok(fondo, `${s.name}: sin fondo asignado`);
    assert.ok(SPRITE_FILES[fondo], `${s.name}: fondo ${fondo} no está en el manifiesto`);
    nombres.add(fondo);
  }
  assert.equal(nombres.size, 4, 'deben usarse los cuatro fondos de bar');
});

test('C1: guardado en localStorage con try/catch, validación y «continuar»', () => {
  const store = fakeStorage();
  assert.equal(readProgress(store), null);
  assert.equal(writeProgress({ bar: 2, round: 1, score: 12345, lives: 2, themeId: 'tumbledog' }, store), true);
  const p = readProgress(store);
  assert.deepEqual(
    { bar: p.bar, round: p.round, stageIndex: p.stageIndex, score: p.score, lives: p.lives, themeId: p.themeId },
    { bar: 2, round: 1, stageIndex: 9, score: 12345, lives: 2, themeId: 'tumbledog' },
  );
  assert.equal(modeList(p).length, 3);
  assert.equal(modeList(p)[2].id, 'continue');
  assert.ok(modeList(p)[2].hint.includes(BARS[2].name));
  assert.equal(modeList(null).length, 2);
  // JSON corrupto, versión ajena y valores fuera de rango no rompen ni se cuelan.
  store.setItem(SAVE_KEY, '{no-es-json');
  assert.equal(readProgress(store), null);
  store.setItem(SAVE_KEY, JSON.stringify({ version: 99, bar: 2 }));
  assert.equal(readProgress(store), null);
  store.setItem(SAVE_KEY, JSON.stringify({ version: 1, bar: 99, round: -4, score: -50, lives: 999 }));
  const q = readProgress(store);
  assert.equal(q.bar, 3); assert.equal(q.round, 0); assert.equal(q.score, 0); assert.equal(q.lives, 9);
  // localStorage que lanza excepciones: nunca debe tirar la partida.
  const roto = { getItem() { throw new Error('sin permiso'); }, setItem() { throw new Error('sin permiso'); }, removeItem() { throw new Error('sin permiso'); } };
  assert.equal(readProgress(roto), null);
  assert.equal(writeProgress({ bar: 0, round: 0 }, roto), false);
  assert.equal(clearProgress(roto), false);
  assert.equal(clearProgress(store), true);
  assert.equal(readProgress(store), null);
});

test('C1: índices de ruta y progreso por fase', () => {
  assert.equal(stageIndexOf(0, 0), 0);
  assert.equal(stageIndexOf(3, 3), 15);
  assert.equal(barOfStage(7), 1);
  assert.equal(roundOfStage(7), 3);
  assert.equal(progressForStage(15, { score: 800, lives: 4 }).bar, 3);
  assert.equal(progressForStage(15, { score: 800, lives: 4 }).round, 3);
});

// ---- Mecánicas -----------------------------------------------------------
function hooks(over = {}) {
  const calls = { hurt: 0, addScore: 0, gainLife: 0, spawnFoe: 0, spawnChaser: 0, setPrisa: 0, texts: [] };
  const noop = () => {};
  const fx = {
    text: (x, y, s) => calls.texts.push(s), spark: noop, confetti: noop, shake: noop,
    flash: noop, dust: noop, ring: noop, stars: noop, trail: noop, suck: noop,
    word: noop, stop: noop, clear: noop, offset: () => ({ x: 0, y: 0, r: 0 }),
    draw: noop, drawBack: noop, drawTexts: noop, drawFlash: noop, update: noop,
  };
  const player = { x: 300, y: FLOOR_Y - 92, w: 46, h: 92, vx: 300, vy: 0, facing: 1, alive: true, onGround: true, held: [], heldT: 0, speedUp: 0, pow: 0, invul: 0 };
  const g = { plats: [], player, enemies: [], state: 'play' };
  return Object.assign({
    calls, g, fx, audio: { sfx: noop, music: noop },
    input: { held: { left: false, right: true }, pressed: {} },
    addScore: () => { calls.addScore++; },
    hurt: () => { calls.hurt++; },
    gainLife: () => { calls.gainLife++; },
    spawnFoe: () => { calls.spawnFoe++; },
    spawnChaser: () => { calls.spawnChaser++; },
    setPrisa: () => { calls.setPrisa++; },
  }, over);
}
const FIXED_RNG = () => 0.5;

test('C1 · Bar La Taca: las manchas ralentizan o hacen resbalar', () => {
  const stage = CAMPAIGN_STAGES[0];
  const h = hooks();
  h.g.plats = stage.plats.slice();
  const m = createBarMechanic(stage, FIXED_RNG);
  assert.ok(m && m.uses('manchas') && !m.uses('sorteos'));
  m.onStart(h.g);
  assert.equal(m.state.stains.length, 4);
  const st = m.state.stains[0];
  h.g.player.y = st.y - h.g.player.h;
  h.g.player.x = st.x + 10;
  h.g.player.vx = 300;
  m.update(1 / 120, h);
  assert.notEqual(h.g.player.vx, 300, 'la mancha modifica la velocidad');
  assert.ok(h.calls.texts.length > 0, 'onomatopeya de resbalón');
  assert.equal(stage.plats.length, h.g.plats.length, 'las manchas no añaden plataformas');
  m.onEnd(h.g);
});

test('C1 · Bar Los Concursos: la bola de sorteo da un efecto aleatorio', () => {
  const stage = CAMPAIGN_STAGES[4];
  const h = hooks();
  h.g.plats = stage.plats.slice();
  const m = createBarMechanic(stage, FIXED_RNG);
  assert.ok(m.uses('sorteos'));
  m.onStart(h.g);
  // Provocamos una bola y la ponemos encima del jugador.
  m.state.ballT = 0;
  m.update(1 / 60, h);
  assert.equal(m.state.balls.length, 1);
  const b = m.state.balls[0];
  b.x = h.g.player.x + h.g.player.w / 2;
  b.y = h.g.player.y + h.g.player.h / 2;
  m.update(1 / 60, h);
  assert.equal(m.prizesCount, 1);
  assert.equal(m.state.balls.length, 0);
  assert.ok(h.calls.texts.some((s) => s.includes('¡')));
  assert.equal(stage.mechanic, 'sorteos');
});

test('C1 · Bar Pols: barra deslizante lleva al jugador y las bandejas golpean', () => {
  const stage = CAMPAIGN_STAGES[8];
  const h = hooks();
  const original = stage.plats.length;
  h.g.plats = stage.plats.slice();
  const m = createBarMechanic(stage, FIXED_RNG);
  m.onStart(h.g);
  const bar = m.state.bar;
  assert.ok(bar);
  assert.equal(h.g.plats.length, original + 1, 'la barra se añade a la copia de plataformas');
  assert.equal(stage.plats.length, original, 'la definición de la fase no se muta');
  // Jugador subido a la barra: se desplaza con ella.
  h.g.player.y = bar.y - h.g.player.h;
  h.g.player.x = bar.x + 40;
  const x0 = h.g.player.x;
  m.update(0.1, h);
  assert.ok(h.g.player.x > x0, 'la barra arrastra al jugador');
  // Bandeja que toca al jugador: llama a hurt().
  const tray = { x: h.g.player.x + h.g.player.w / 2, y: h.g.player.y + h.g.player.h / 2, vx: 0, r: 27, t: 0, rot: 0, dead: false };
  m.state.trays.push(tray);
  m.update(1 / 60, h);
  assert.equal(h.calls.hurt, 1);
  assert.equal(m.state.trays.length, 0);
  m.onEnd(h.g);
  assert.equal(h.g.plats.length, original);
});

test('C1 · Bar del Jefe: mezcla las cuatro mecánicas', () => {
  const stage = CAMPAIGN_STAGES[12];
  const h = hooks();
  h.g.plats = stage.plats.slice();
  const m = createBarMechanic(stage, FIXED_RNG);
  m.onStart(h.g);
  for (const k of ['manchas', 'sorteos', 'bandejas']) assert.ok(m.uses(k), `falta ${k}`);
  assert.equal(m.state.stains.length, 2);
  assert.ok(m.state.bar);
  assert.ok(Number.isFinite(m.state.ballT) && Number.isFinite(m.state.trayT));
  for (let i = 0; i < 900; i++) m.update(1 / 60, h);
  assert.ok(h.calls.texts.length > 0);
  m.onEnd(h.g);
});

test('C1: una fase arcade no crea mecánica de bar', () => {
  assert.equal(createBarMechanic(null), null);
  assert.equal(createBarMechanic({ name: 'ARCADE' }), null);
});
