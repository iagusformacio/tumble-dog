// I1 (#77) · Tema «marcos» (Dieta de Marcos): registro, textos, sprites, fondos,
// música y fases. Cada sprite que el tema declara debe existir en disco.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { W, CONFIG } from '../src/config.js';
import { FLOOR } from '../src/physics.js';
import { listThemes, getTheme, THEMES } from '../src/themes/index.js';
import { THEME as MARCOS, STAGES, STAGE_COUNT, SONGS } from '../src/themes/marcos.js';
import { THEME as TUMBLEDOG } from '../src/themes/tumbledog.js';
import { SPRITE_FILES } from '../src/sprite-list.js';
import { setSpriteMap, getSpriteMap, spriteName } from '../src/sprites.js';
import { TYPE_KEYS } from '../src/enemies.js';

const disk = (p) => existsSync(p.replace(/^\.\//, ''));

test('el tema «marcos» está registrado como segundo juego seleccionable', () => {
  assert.equal(THEMES.length, 2);
  assert.equal(THEMES[0].id, 'tumbledog');
  assert.equal(THEMES[1].id, 'marcos');
  assert.equal(getTheme('marcos').theme.name, 'Dieta de Marcos');
  assert.equal(getTheme('desconocido').id, 'tumbledog', 'desconocido cae al por defecto');
});

test('textos del tema: TRAGAR/VOMITAR, ¡BLEEEH!, ESMORZAR y el camarero con la cuenta', () => {
  assert.ok(MARCOS.titleScreen.suck.includes('TRAGAR'));
  assert.ok(MARCOS.titleScreen.shoot.includes('VOMITAR'));
  assert.equal(MARCOS.verbs.suck, 'TRAGAR');
  assert.equal(MARCOS.verbs.shoot, 'VOMITAR');
  assert.ok(MARCOS.onomatopeyas.includes('¡BLEEEH!'));
  assert.equal(MARCOS.letters.word, 'ESMORZAR');
  assert.equal(MARCOS.letters.word.length, 8);
  assert.ok(MARCOS.juice.chaser.includes('CAMARERO CON LA CUENTA'));
  assert.equal(MARCOS.chaser.name, 'EL CAMARERO CON LA CUENTA');
  assert.ok(MARCOS.titleScreen.lettersHint.includes('E·S·M·O·R·Z·A·R'));
  assert.equal(MARCOS.touch.suck, 'TRAGA');
  assert.equal(MARCOS.touch.shoot, 'VOMITA');
});

test('cada sprite que el tema declara (THEME.sprites) existe en el manifiesto y en disco', () => {
  const declared = Object.entries(MARCOS.sprites);
  assert.ok(declared.length >= 2, 'el tema debe declarar al menos logo y bola');
  for (const [canon, target] of declared) {
    assert.ok(SPRITE_FILES[target], `el sprite declarado ${target} (de ${canon}) no está en sprite-list.js`);
    assert.ok(disk(SPRITE_FILES[target][0]), `falta en disco ${SPRITE_FILES[target][0]}`);
  }
  // Logo y bola de vómito conect déclareados de verdad:
  assert.equal(MARCOS.sprites['ui-logo'], 'ui-logo-marcos');
  assert.equal(MARCOS.sprites['ball'], 'ui-bola-vomito');
});

test('sprites de onomatopeyas declarados existen en disco', () => {
  assert.equal(MARCOS.onomatopeyas.length, MARCOS.onomatopeyaSprites.length);
  for (const spr of MARCOS.onomatopeyaSprites) {
    assert.ok(SPRITE_FILES[spr] && disk(SPRITE_FILES[spr][0]), `falta la onomatopeya ${spr}`);
  }
});

test('spritesWanted: claves canónicas del motor y valores con prefijo propio (A1/A2/A3 pendientes)', () => {
  const wanted = MARCOS.spritesWanted;
  for (const pose of ['idle', 'walkA', 'walkB', 'jump', 'fall', 'suck', 'throw', 'hurt', 'win', 'intro']) {
    assert.ok(wanted[`presi-${pose}`], `falta mapeo de la pose presi-${pose}`);
    assert.ok(wanted[`presi-${pose}`].startsWith('marcos-'), 'las poses de Marcos usan el prefijo marcos-');
  }
  for (const type of TYPE_KEYS) {
    for (const pose of ['walkA', 'walkB', 'stun', 'down']) {
      assert.ok(wanted[`${type}-${pose}`], `falta mapeo de ${type}-${pose}`);
      assert.ok(wanted[`${type}-${pose}`].startsWith('dm-'), 'los esmorzars usan el prefijo dm-');
    }
  }
});

test('fondos de bar del tema existen en disco y cubren los escenarios de las fases', () => {
  const used = new Set(STAGES.map((s) => s.theme));
  for (const [name, spr] of Object.entries(MARCOS.backgrounds)) {
    assert.ok(SPRITE_FILES[spr] && disk(SPRITE_FILES[spr][0]), `falta el fondo ${spr}`);
    assert.ok(used.has(name), `el fondo ${name} no lo usa ninguna fase`);
  }
  for (const name of [MARCOS.startTheme, MARCOS.bonusTheme, MARCOS.nightTheme]) {
    assert.ok(MARCOS.backgrounds[name], `el fondo ${name} usado fuera de fase no está declarado`);
  }
});

test('la música mp3 del tema existe en disco y se usa en título y bonus', () => {
  assert.ok(MARCOS.audio.title.endsWith('.mp3'));
  assert.ok(disk(MARCOS.audio.title), 'falta el mp3 del título');
  assert.equal(MARCOS.audio.bonus, MARCOS.audio.title, 'el bonus reutiliza la canción del tema');
});

test('las fases del tema son válidas: 10 rondas, plataformas en pantalla y enemigos sobre plataforma', () => {
  assert.equal(STAGE_COUNT, 10);
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
      assert.ok(MARCOS.enemyTypes[type], `tipo desconocido ${type}`);
      assert.ok(s.plats.some((p) => p.y === y && x >= p.x && x <= p.x + p.w), `${s.name}: ${type} no está sobre una plataforma`);
    }
  }
  assert.ok(STAGES.some((s) => s.boss), 'hay fase de jefe');
  assert.equal(STAGES.filter((s) => s.boss).length, 2, 'jefe a mitad y jefe final');
});

test('los 8 esmorzars tienen nombre propio y mecánica (tipos del tema)', () => {
  assert.equal(Object.keys(MARCOS.enemyTypes).length, 8);
  for (const k of TYPE_KEYS) {
    assert.ok(MARCOS.enemyTypes[k].name, `${k} sin nombre`);
    assert.ok(MARCOS.enemyColors[k], `${k} sin color provisional`);
  }
  assert.ok(Object.values(MARCOS.enemyTypes).some((t) => t.name.includes('Calamares')));
  assert.ok(Object.values(MARCOS.enemyTypes).some((t) => t.name.includes('Tortilla')));
});

test('canciones sintetizadas propias: title/stage/boss/bonus con lead, bass y batería', () => {
  for (const k of ['title', 'stage', 'boss', 'bonus']) {
    const s = SONGS[k];
    assert.ok(s && s.bpm > 0 && s.lead.length > 4 && s.bass.length > 2 && s.drums.length > 2, `canción ${k} incompleta`);
  }
});

test('resolución de sprites: setSpriteMap reasigna los nombres canónicos del motor', () => {
  assert.equal(spriteName('presi-idle'), 'presi-idle', 'sin mapeo es la identidad');
  setSpriteMap({ ...MARCOS.spritesWanted, ...MARCOS.sprites });
  assert.equal(spriteName('presi-idle'), 'marcos-idle');
  assert.equal(spriteName('ui-logo'), 'ui-logo-marcos');
  assert.equal(spriteName('ball'), 'ui-bola-vomito');
  assert.equal(spriteName('ui-life'), 'ui-life', 'lo no mapeado queda igual');
  assert.deepEqual(getSpriteMap()['presi-throw'], 'marcos-vomit');
  setSpriteMap(null);
  assert.equal(spriteName('presi-idle'), 'presi-idle', 'setSpriteMap(null) restaura la identidad');
});

test('el tema tumbledog no declara mapeo de sprites (su comportamiento no cambia)', () => {
  assert.ok(!TUMBLEDOG.sprites || Object.keys(TUMBLEDOG.sprites).length === 0);
  assert.ok(!TUMBLEDOG.spritesWanted);
  assert.equal(TUMBLEDOG.letters.word, 'TUMBLEDOG');
  assert.equal(listThemes()[0].theme.letters.word, 'TUMBLEDOG');
});
