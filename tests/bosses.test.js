// Jefes de campaña: cada bar tiene su propio personaje dibujado y el motor pide
// los sprites `boss-<art>-*`. Esta prueba comprueba que el mapeo del tema «marcos»
// resuelve a sprites que existen de verdad en disco (nunca un bloque negro) y que
// el motor conserva el comportamiento de siempre cuando no se indica arte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { BARS, CAMPAIGN_STAGES, ROUNDS_PER_BAR, CAMPAIGN_STAGE_COUNT } from '../src/campaign.js';
import { THEME as MARCOS } from '../src/themes/marcos.js';
import { THEME as TUMBLEDOG } from '../src/themes/tumbledog.js';
import { createBoss } from '../src/boss.js';
import { SPRITE_FILES } from '../src/sprite-list.js';

const POSES = ['walkA', 'walkB', 'stun', 'down'];

/** Resuelve un nombre canónico con el mapa del tema, como hace src/sprites.js. */
function resolve(theme, name) {
  return (theme.sprites && theme.sprites[name]) || name;
}

function fileExists(src) { return existsSync(src.replace('./', '')); }

test('campaña: 4 bares × 3 rondas + jefe, y cada bar tiene jefe con arte', () => {
  assert.equal(BARS.length, 4);
  assert.equal(CAMPAIGN_STAGE_COUNT, 16);
  for (const bar of BARS) {
    assert.ok(bar.boss, `${bar.id}: sin nombre de jefe`);
    assert.ok(bar.bossArt, `${bar.id}: sin bossArt`);
    assert.ok(bar.bossType === 'tertuliano' || bar.bossType === 'lider', `${bar.id}: tipo de jefe desconocido`);
  }
  // Los cuatro jefes son personajes distintos entre sí.
  assert.equal(new Set(BARS.map((b) => b.bossArt)).size, 4);
});

test('campaña: la fase de jefe de cada bar lleva su arte al motor', () => {
  for (let b = 0; b < BARS.length; b++) {
    const stage = CAMPAIGN_STAGES[b * ROUNDS_PER_BAR + ROUNDS_PER_BAR - 1];
    assert.ok(stage.bossStage, `bar ${b}: la última ronda no es de jefe`);
    assert.equal(stage.bossArt, BARS[b].bossArt, `bar ${b}: bossArt mal propagado`);
    assert.equal(stage.bossName, BARS[b].boss);
  }
});

test('tema marcos: las cuatro poses de cada jefe de campaña existen en disco', () => {
  for (const bar of BARS) {
    for (const pose of POSES) {
      const canonical = `boss-${bar.bossArt}-${pose}`;
      const sprite = resolve(MARCOS, canonical);
      const entry = SPRITE_FILES[sprite];
      assert.ok(entry, `${bar.id}: falta el sprite ${sprite} (${canonical})`);
      assert.ok(fileExists(entry[0]), `${bar.id}: no está en disco ${entry[0]}`);
    }
  }
});

test('createBoss: usa el arte indicado y el tipo como respaldo', () => {
  const conArte = createBoss('tertuliano', { tertuliano: 12 }, 'jefa');
  assert.equal(conArte.type, 'tertuliano');
  assert.equal(conArte.art, 'jefa');
  assert.equal(conArte.hp, 12);
  const sinArte = createBoss('lider');
  assert.equal(sinArte.art, 'lider');
});

test('tema tumbledog: los jefes siguen usando su propio tipo y sus sprites', () => {
  const b = createBoss('tertuliano', TUMBLEDOG.bossHp);
  assert.equal(b.art, 'tertuliano');
  for (const pose of POSES) {
    const sprite = resolve(TUMBLEDOG, `boss-${b.art}-${pose}`);
    assert.ok(SPRITE_FILES[sprite], `falta ${sprite}`);
  }
});
