// I1 (#77) · Tema «marcos» (Dieta de Marcos): registro, textos, sprites, fondos,
// música y fases. Cada sprite que el tema declara debe existir en disco.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { W, CONFIG } from '../src/config.js';
import { listThemes, getTheme, THEMES } from '../src/themes/index.js';
import { THEME as MARCOS, STAGES, STAGE_COUNT, SONGS, SONG_PIECES, PIECE_BY_BAR, pieceForBar } from '../src/themes/marcos.js';
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
  assert.ok(declared.length >= 20, 'el tema declara logo, bola, poses de Marcos, camarero y premios');
  for (const [canon, target] of declared) {
    assert.ok(SPRITE_FILES[target], `el sprite declarado ${target} (de ${canon}) no está en sprite-list.js`);
    assert.ok(disk(SPRITE_FILES[target][0]), `falta en disco ${SPRITE_FILES[target][0]}`);
  }
  assert.equal(MARCOS.sprites['ui-logo'], 'ui-logo-marcos');
  assert.equal(MARCOS.sprites['ball'], 'ui-bola-vomito');
});

test('las 10 poses de Marcos (A1) están conectadas y existen en disco', () => {
  const poses = { idle: 'idle', walkA: 'walkA', walkB: 'walkB', jump: 'jump', fall: 'fall', suck: 'swallow', throw: 'vomit', hurt: 'hurt', win: 'win', intro: 'intro' };
  for (const [canon, pose] of Object.entries(poses)) {
    assert.equal(MARCOS.sprites[`presi-${canon}`], `marcos-${pose}`, `presi-${canon} → marcos-${pose}`);
    assert.ok(disk(SPRITE_FILES[`marcos-${pose}`][0]), `falta en disco marcos-${pose}`);
  }
  assert.equal(MARCOS.sprites['portrait-presi'], 'retrato-marcos');
  assert.ok(disk(SPRITE_FILES['retrato-marcos'][0]));
});

test('el camarero con la cuenta (A8) tiene sprites conectados como perseguidor', () => {
  for (const [canon, spr] of [['chaser-walkA', 'camarero-walkA'], ['chaser-walkB', 'camarero-walkB'], ['chaser-shout', 'camarero-grito']]) {
    assert.equal(MARCOS.sprites[canon], spr);
    assert.ok(disk(SPRITE_FILES[spr][0]), `falta en disco ${spr}`);
  }
});

test('los premios del bar (A8) tienen sprite por tipo de premio', () => {
  for (const kind of ['coin', 'gemB', 'gemR', 'gemG', 'shoes', 'pow', 'clock', 'life']) {
    const spr = MARCOS.sprites['item-' + kind];
    assert.ok(spr && spr.startsWith('premio-'), `falta sprite del premio ${kind}`);
    assert.ok(disk(SPRITE_FILES[spr][0]), `falta en disco ${spr}`);
  }
});

test('sprites de onomatopeyas declarados existen en disco', () => {
  assert.equal(MARCOS.onomatopeyas.length, MARCOS.onomatopeyaSprites.length);
  for (const spr of MARCOS.onomatopeyaSprites) {
    assert.ok(SPRITE_FILES[spr] && disk(SPRITE_FILES[spr][0]), `falta la onomatopeya ${spr}`);
  }
});

test('los 8 esmorzars (A2+A3) están conectados en sprites y existen en disco', () => {
  const esmorzars = {
    portavoz: 'dm-calamares', tertuliano: 'dm-carajillo', asesor: 'dm-cafe', diputado: 'dm-tortilla',
    influencer: 'cacahuete', activista: 'bocata', lider: 'tostada', baron: 'chupito',
  };
  for (const type of TYPE_KEYS) {
    const spr = esmorzars[type];
    assert.ok(spr, `sin esmorzar asignado a ${type}`);
    for (const pose of ['walkA', 'walkB', 'stun', 'down']) {
      assert.equal(MARCOS.sprites[`${type}-${pose}`], `${spr}-${pose}`, `${type}-${pose} → ${spr}-${pose}`);
      assert.ok(disk(SPRITE_FILES[`${spr}-${pose}`][0]), `falta en disco ${spr}-${pose}`);
    }
  }
});

test('los jefes del tema (bocata gigante y paella gigante) tienen sprites conectados', () => {
  const jefes = {
    'boss-tertuliano-walkA': 'dm-bocata-reposo', 'boss-tertuliano-walkB': 'dm-bocata-reposo',
    'boss-tertuliano-stun': 'dm-bocata-reposo', 'boss-tertuliano-down': 'dm-bocata-down',
    'boss-lider-walkA': 'paella-walkA', 'boss-lider-walkB': 'paella-walkB',
    'boss-lider-stun': 'paella-idle', 'boss-lider-down': 'paella-down',
  };
  for (const [canon, spr] of Object.entries(jefes)) {
    assert.equal(MARCOS.sprites[canon], spr);
    assert.ok(disk(SPRITE_FILES[spr][0]), `falta en disco ${spr}`);
  }
});

test('no queda arte pendiente: spritesWanted vacío o ausente', () => {
  assert.ok(!MARCOS.spritesWanted || Object.keys(MARCOS.spritesWanted).length === 0, 'todo el arte declarado de A1-A4/A8 está ya conectado');
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

test('la canción partida es la música del juego y cada bar tiene su trozo (#95, #101)', () => {
  // Cada sección declara sus trozos y todos existen en disco.
  for (const name of ['title', 'stage', 'boss', 'bonus']) {
    for (const url of new Set(Object.values(MARCOS.audio[name]))) {
      assert.ok(url.endsWith('.mp3'), `${name}: ${url}`);
      assert.ok(disk(url), `falta el trozo ${url}`);
    }
  }
  // Un trozo por escena de la campaña (título, 4 bares, jefes, bonus).
  assert.equal(Object.keys(SONG_PIECES).length, 7);
  assert.deepEqual(Object.keys(PIECE_BY_BAR), ['la-taca', 'concursos', 'pols', 'del-jefe']);
  for (const bar of Object.keys(PIECE_BY_BAR)) {
    const piece = pieceForBar(bar);
    assert.ok(SONG_PIECES[piece], `${bar} → ${piece}`);
    assert.equal(MARCOS.audio.stage[piece], SONG_PIECES[piece], `la fase de ${bar} usa su trozo`);
  }
  assert.equal(pieceForBar('no-existe'), null, 'un bar sin trozo cae en el del título');
  // El modo arcade de este tema sigue con la música sintetizada.
  assert.equal(MARCOS.arcadeAudio, null);
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
  setSpriteMap({ ...(MARCOS.spritesWanted || {}), ...MARCOS.sprites });
  assert.equal(spriteName('presi-idle'), 'marcos-idle');
  assert.equal(spriteName('ui-logo'), 'ui-logo-marcos');
  assert.equal(spriteName('ball'), 'ui-bola-vomito');
  assert.equal(spriteName('chaser-walkA'), 'camarero-walkA');
  assert.equal(spriteName('portavoz-walkA'), 'dm-calamares-walkA');
  assert.equal(spriteName('boss-lider-walkA'), 'paella-walkA');
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

test('objetos de las mecánicas de campaña y proyectiles de jefes (A9) existen en disco', () => {
  const grupos = { ...MARCOS.mecanicas, ...MARCOS.proyectiles };
  assert.ok(Object.keys(MARCOS.mecanicas).length >= 5, 'mancha, sorteo, bandeja, campana y ticket');
  assert.ok(Object.keys(MARCOS.proyectiles).length >= 4, 'tostada, aceite, bola numerada y cazo');
  for (const [que, spr] of Object.entries(grupos)) {
    assert.ok(SPRITE_FILES[spr], `el sprite ${spr} (${que}) no está en sprite-list.js`);
    assert.ok(disk(SPRITE_FILES[spr][0]), `falta en disco ${SPRITE_FILES[spr][0]}`);
  }
});

test('el fondo nocturno del Bar del Jefe (A9) sustituye a la terraza en la noche', () => {
  assert.equal(MARCOS.nightTheme, 'noche');
  assert.equal(MARCOS.backgrounds.noche, 'fondo-noche-jefe');
  assert.ok(disk(SPRITE_FILES['fondo-noche-jefe'][0]));
});
