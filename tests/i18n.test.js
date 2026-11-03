// I18N (#102): catálogos completos, preferencia recordada y datos vivos del motor.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { es } from '../src/i18n/es.js';
import { val } from '../src/i18n/val.js';
import { t, setLanguage, initLanguage, normalizeLanguage, toggleLanguage, LANGUAGE_KEY } from '../src/i18n/index.js';
import { THEME as TD, STAGES as TD_STAGES } from '../src/themes/tumbledog.js';
import { THEME as DM, STAGES as DM_STAGES } from '../src/themes/marcos.js';
import { BARS, CAMPAIGN_STAGES, modeList } from '../src/campaign.js';
import { createBoss, setBossNames } from '../src/boss.js';
import { createGame } from '../src/game.js';

afterEach(() => { setLanguage('es', false); setBossNames(null); delete globalThis.localStorage; });
const keys = (o) => Object.keys(o).sort();
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

test('i18n: castellano y valenciano tienen exactamente las mismas claves y parámetros', () => {
  assert.deepEqual(keys(val), keys(es));
  assert.ok(keys(es).length >= 250);
  for (const key of keys(es)) {
    assert.equal(typeof es[key], 'string', key); assert.equal(typeof val[key], 'string', key);
    assert.ok(es[key].trim() && val[key].trim(), `texto vacío: ${key}`);
    assert.deepEqual(placeholders(val[key]), placeholders(es[key]), key);
    assert.ok(!val[key].includes('¡') && !val[key].includes('¿'), `signos castellanos en ${key}`);
  }
});
test('i18n: los subtítulos pedidos están en el título y en la ficha de ambos juegos', () => {
  assert.equal(TD.tagline, 'El presidente que aspira a la oposición');
  assert.equal(DM.tagline, 'Marcos, el glotón');
  setLanguage('val');
  assert.equal(TD.tagline, "El president que aspira a l'oposició");
  assert.equal(DM.tagline, 'Marcos, el golut');
  assert.equal(t('ui.castellano'), 'Castellano'); assert.equal(t('ui.valencia'), 'Valencià');
});
test('i18n: navegador ca/val, preferencia guardada, alternativa y almacenamiento bloqueado', () => {
  assert.equal(normalizeLanguage('ca-ES-valencia'), 'val');
  assert.equal(normalizeLanguage('val-ES'), 'val'); assert.equal(normalizeLanguage('en'), 'es');
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v) };
  assert.equal(initLanguage({ navigator: { language: 'ca-ES' }, localStorage: globalThis.localStorage }), 'val');
  assert.equal(initLanguage({ navigator: { language: 'en-GB' }, localStorage: globalThis.localStorage }), 'es');
  setLanguage('val'); assert.equal(store.get(LANGUAGE_KEY), 'val');
  assert.equal(initLanguage({ navigator: { language: 'es-ES' }, localStorage: globalThis.localStorage }), 'val');
  assert.equal(toggleLanguage(), 'es');
  globalThis.localStorage = { getItem() { throw Error('403'); }, setItem() { throw Error('403'); } };
  assert.equal(initLanguage({ navigator: { language: 'val' }, localStorage: globalThis.localStorage }), 'val');
  assert.equal(setLanguage('es'), 'es');
  assert.equal(t('clave.inexistente'), 'clave.inexistente');
  assert.equal(t('ui.combo', { count: 4 }), '¡COMBO x4!');
});
test('i18n: enemigos, fases, bares, jefes y «continuar» ya creados cambian de idioma', () => {
  setBossNames(DM.bossNameKeys);
  const boss = createBoss('tertuliano', DM.bossHp);
  const mode = modeList({ bar: 2, round: 1 })[2];
  assert.equal(DM.enemyTypes.portavoz.name, 'El Bocadillo de Calamares');
  assert.equal(CAMPAIGN_STAGES[0].name, 'PRIMER ESMORZAR · LA BARRA');
  assert.equal(boss.name, 'EL BOCATA GIGANTE');
  setLanguage('val');
  assert.equal(DM.enemyTypes.portavoz.name, 'El Bocata de Calamars');
  assert.equal(DM_STAGES[6].name, 'LA TERRASSA DE VALÈNCIA');
  assert.equal(TD_STAGES[3].name, 'LA SALA DE PREMSA');
  assert.equal(CAMPAIGN_STAGES[0].name, 'PRIMER ESMORZAR · LA BARRA');
  assert.equal(CAMPAIGN_STAGES[3].name, 'EL CUINER DE LA PLANXA');
  assert.equal(BARS[3].name, 'BAR DEL CAP');
  assert.equal(boss.name, 'EL BOCATA GEGANT');
  boss.nameKey = CAMPAIGN_STAGES[11].bossNameKey;
  assert.equal(boss.name, 'LA CAP DE SALA');
  assert.ok(mode.hint.includes('BAR POLS')); assert.ok(mode.hint.includes('RONDA 2'));
});
test('i18n: todas las claves declaradas por los temas existen en los dos idiomas', () => {
  for (const theme of [TD, DM]) {
    for (const key of [...theme.hurtMessagesKeys, ...theme.onomatopeyasKeys, ...theme.bossHitWordsKeys]) {
      assert.ok(es[key] && val[key], key);
    }
    assert.equal(theme.letters.word, theme.id === 'marcos' ? 'ESMORZAR' : 'TUMBLEDOG');
  }
  for (const stage of [...TD_STAGES, ...DM_STAGES, ...CAMPAIGN_STAGES]) {
    setLanguage('es'); assert.ok(!stage.name.includes('campaign.'), stage.name);
    setLanguage('val'); assert.ok(!stage.name.includes('campaign.'), stage.name);
  }
});
test('i18n: L solo cambia idioma en el título; la partida y sus mecánicas no se reinician', () => {
  const held = {}, pressed = {};
  const input = { held, pressed, update() {}, takeAny: () => false };
  const audio = new Proxy({}, { get: () => () => {} });
  const game = createGame({ input, audio });
  game.state.stateT = 1; pressed.language = true; game.update(1/120);
  assert.equal(t('ui.game'), 'JOC'); assert.equal(game.state.state, 'title');
  pressed.language = false; game.debug.startStage(0); game.state.state = 'play';
  const score = game.state.score, stage = game.state.stageIndex;
  pressed.language = true; game.update(1/120);
  assert.equal(t('ui.game'), 'JOC'); assert.equal(game.state.score, score); assert.equal(game.state.stageIndex, stage);
});

test('i18n: capturas del título en ambos idiomas existen y pesan poco', () => {
  for (const name of ['i18n-es.jpg', 'i18n-val.jpg', 'i18n-marcos-val.jpg', 'i18n-movil-val.jpg', 'i18n-juego-val.jpg', 'i18n-ruta-val.jpg']) {
    const path = `docs/capturas/${name}`;
    assert.ok(existsSync(path), `falta ${path}`);
    const bytes = readFileSync(path);
    assert.equal(bytes[0], 0xff); assert.equal(bytes[1], 0xd8);
    assert.ok(bytes.length > 10 * 1024 && bytes.length <= 200 * 1024, `${path}: ${bytes.length} bytes`);
  }
});
