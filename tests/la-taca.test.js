// C1 · Integración del Cocinero de la Plancha (Bar La Taca).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CONFIG, FLOOR_Y, W } from '../src/config.js';
import { CAMPAIGN_STAGES } from '../src/campaign.js';
import { createBarMechanic } from '../src/bar_mechanics.js';
import { bossFrame, createBoss, updateBoss, hitBoss } from '../src/boss.js';
import { makeShot, updateShot } from '../src/enemies.js';
import { createGame } from '../src/game.js';
import { SPRITE_FILES } from '../src/sprite-list.js';
import { THEME as MARCOS } from '../src/themes/marcos.js';
import { STAGES as ARCADE } from '../src/stages.js';

const noop = () => {};
const fx = { stars: noop, word: noop, shake: noop, dust: noop, stop: noop, text: noop, flash: noop, confetti: noop };
const target = { x: 400, y: FLOOR_Y - 92, w: 46, h: 92, alive: true };

test('La Taca asigna su jefe propio solo a la cuarta ronda y registra todas sus poses', () => {
  for (const stage of CAMPAIGN_STAGES.slice(0, 3)) assert.ok(!stage.boss);
  const stage = CAMPAIGN_STAGES[3];
  assert.equal(stage.boss, 'tertuliano');
  assert.equal(stage.bossArt, 'cocinero-plancha');
  assert.equal(stage.bossName, 'EL COCINERO DE LA PLANCHA');
  assert.equal(stage.mechanic, 'manchas');
  assert.equal(stage.bossScale, CONFIG.laTacaBoss.scale);
  for (const suffix of ['walkA', 'walkB', 'attack', 'hurt', 'angry', 'down']) {
    const key = `boss-cocinero-plancha-${suffix}`;
    assert.ok(SPRITE_FILES[key] && existsSync(SPRITE_FILES[key][0]), key);
  }
  assert.ok(SPRITE_FILES['proj-tostada'] && SPRITE_FILES['proj-aceite']);
  assert.equal(ARCADE[4].boss, 'tertuliano');
  assert.equal(MARCOS.sprites['boss-tertuliano-walkA'], 'dm-bocata-reposo');
});

test('el cocinero alterna tostada y aceite, sin modificar el jefe arcade', () => {
  const boss = createBoss('tertuliano', undefined, 'cocinero-plancha');
  const shots = [];
  const ctx = { player: target, shots, spawnMinion: noop, fx };
  boss.shotT = 0;
  updateBoss(boss, 1 / 120, ctx);
  assert.equal(shots[0].kind, 'tostada');
  assert.ok(shots[0].vx < 0);
  assert.equal(bossFrame(boss, 0), 'boss-cocinero-plancha-attack');
  boss.shotT = 0;
  updateBoss(boss, 1 / 120, ctx);
  assert.equal(shots[1].kind, 'aceite');
  assert.ok(shots[1].vy < 0 && shots[1].g > 0);
  hitBoss(boss, 1, fx);
  assert.equal(bossFrame(boss, 0), 'boss-cocinero-plancha-hurt');
  boss.hitT = 0; boss.attackT = 0; boss.hp = 1;
  assert.equal(bossFrame(boss, 0), 'boss-cocinero-plancha-angry');
  hitBoss(boss, 10, fx);
  assert.equal(bossFrame(boss, 0), 'boss-cocinero-plancha-down');

  const classic = createBoss('tertuliano');
  classic.shotT = 0;
  const other = { ...ctx, shots: [] };
  updateBoss(classic, 1 / 120, other);
  assert.equal(other.shots[0].kind, 'bulo');
  assert.match(bossFrame(classic, 1), /^boss-tertuliano-walk/);
});

test('los proyectiles tienen trayectoria finita y objetivo', () => {
  const toast = makeShot('tostada', 900, 400, -1, target);
  assert.ok(toast.vx < 0 && toast.vy > 0);
  assert.ok(Math.abs(Math.hypot(toast.vx, toast.vy) - CONFIG.laTacaBoss.toastSpeed) < 1e-8);
  const oil = makeShot('aceite', 900, 400, -1, target);
  let n = 0;
  while (oil.y + oil.r < FLOOR_Y && updateShot(oil, 1 / 120) && n++ < 600) {}
  assert.ok(oil.y + oil.r >= FLOOR_Y, 'el aceite llega al suelo');
  assert.ok(oil.x > 0 && oil.x < W, 'la mancha aparece en pantalla');
});

test('las manchas de aceite son temporales, limitadas y provocan resbalones', () => {
  const m = createBarMechanic(CAMPAIGN_STAGES[3], () => 0.5);
  const player = { ...target, vx: 0, vy: 0, facing: 1, onGround: true };
  const h = { g: { plats: CAMPAIGN_STAGES[3].plats.slice(), player, enemies: [] }, input: { held: { right: true } },
    fx: { text: noop }, audio: { sfx: noop } };
  m.onStart(h.g);
  m.state.stains = []; // aislar las manchas creadas por el cocinero
  for (let i = 0; i < CONFIG.laTacaBoss.maxOilStains + 3; i++) assert.ok(m.addOil(200 + i * 100));
  assert.equal(m.state.stains.length, CONFIG.laTacaBoss.maxOilStains);
  const st = m.state.stains[0]; player.x = st.x + 10;
  m.update(1 / 120, h);
  assert.ok(player.vx > 0, 'el aceite acelera el resbalón');
  m.update(CONFIG.laTacaBoss.stainLife, h);
  assert.equal(m.state.stains.length, 0);
  assert.equal(createBarMechanic(CAMPAIGN_STAGES[4]).addOil(200), false);
  m.onEnd(h.g);
});

test('el motor crea el jefe al continuar en la ronda y transforma su aceite al tocar suelo', () => {
  const input = { held: {}, pressed: {}, update: noop, takeAny: () => false };
  const audio = { update: noop, setSongs: noop, music: noop, preloadMusic: noop, sfx: noop, suck: noop, unlock: noop, stopMusic: noop };
  const game = createGame({ input, audio });
  game.debug.startCampaign(3);
  game.debug.startStage(3);
  assert.equal(game.state.boss.art, 'cocinero-plancha');
  assert.equal(game.state.boss.hp, CAMPAIGN_STAGES[3].bossHp);
  game.state.state = 'play';
  game.state.player.invul = 100;
  game.state.boss.shotT = 100; game.state.boss.throwT = 100;
  const oil = makeShot('aceite', 500, FLOOR_Y - CONFIG.laTacaBoss.oilRadius, -1, game.state.player);
  oil.vy = 20;
  game.state.shots.push(oil);
  const count = game.debug.mechanic.state.stains.length;
  game.update(1 / 120);
  assert.equal(game.state.shots.includes(oil), false);
  assert.equal(game.debug.mechanic.state.stains.length, count + 1);
  assert.ok(game.debug.mechanic.state.stains.some(st => st.oil));
  const p = game.state.player;
  const toast = makeShot('tostada', p.x + p.w / 2, p.y + p.h / 2, -1, p);
  toast.vx = 0; toast.vy = 0;
  game.state.shots = [toast]; p.invul = 0;
  game.update(1 / 120);
  assert.equal(game.state.lives, CONFIG.player.lives - 1, 'la tostada hiere al jugador');
});

test('vencer al cocinero abre la ruta al siguiente bar y guarda el progreso', () => {
  const previous = globalThis.localStorage;
  const saved = new Map();
  globalThis.localStorage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: key => saved.delete(key),
  };
  try {
    const input = { held: {}, pressed: {}, update: noop, takeAny: () => false };
    const audio = { update: noop, setSongs: noop, music: noop, preloadMusic: noop, sfx: noop, suck: noop, unlock: noop, stopMusic: noop };
    const game = createGame({ input, audio });
    game.debug.startCampaign(3);
    game.debug.startStage(3);
    game.state.state = 'play';
    game.state.player.invul = 100;
    game.state.boss.hp = 0;
    game.state.boss.dying = 2.2;
    for (let i = 0; i < 600 && game.state.state !== 'route'; i++) game.update(1 / 120);
    assert.equal(game.state.state, 'route');
    assert.equal(game.state.routeNext, 4);
    const progress = JSON.parse(saved.get('dieta-de-marcos-campana-v1'));
    assert.equal(progress.bar, 1);
    assert.equal(progress.round, 0);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});
