// #101 · Canción partida por escena: los trozos existen, el motor elige el del
// bar en curso (solo campaña), se precarga el siguiente y el bucle se cruza.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createAudio } from '../src/audio.js';
import { createGame } from '../src/game.js';
import { CONFIG } from '../src/config.js';
import { BARS, CAMPAIGN_STAGES } from '../src/campaign.js';
import { THEME as MARCOS, SONG_PIECES, pieceForBar } from '../src/themes/marcos.js';
import { THEME as TUMBLEDOG } from '../src/themes/tumbledog.js';

const DIR = 'assets/audio/dieta-de-marcos';
const ORIGINAL = 'assets/audio/dieta-de-marcos.mp3';
const AX = CONFIG.audio;
const disk = (url) => existsSync(String(url).replace(/^\.\//, ''));
const size = (url) => statSync(String(url).replace(/^\.\//, '')).size;

/** Audio falso que, además de lo de siempre, sabe su duración (para el bucle). */
class FakeAudio {
  constructor(src) {
    this.src = src; this.loop = false; this.volume = 1; this.muted = false;
    this.paused = true; this.playbackRate = 1; this.preload = '';
    this.currentTime = 0; this.duration = 20; // como un trozo real
    this.listeners = {}; FakeAudio.created.push(this);
  }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  emit(type) { for (const fn of this.listeners[type] || []) fn({ target: this }); }
}

function withAudio(fn) {
  const had = Object.prototype.hasOwnProperty.call(globalThis, 'Audio');
  const prev = globalThis.Audio;
  FakeAudio.created = [];
  globalThis.Audio = FakeAudio;
  try { return fn(); } finally {
    if (had) globalThis.Audio = prev; else delete globalThis.Audio;
  }
}

const marcosAudio = () => {
  const a = createAudio();
  a.setSongs(MARCOS.SONGS, MARCOS.audio, { volume: MARCOS.audioVolume, rate: MARCOS.audioRate });
  return a;
};

// ---- Los ficheros ---------------------------------------------------------

test('los 7 trozos de la canción existen, son mp3 cortos y pesan menos que el original', () => {
  const urls = Object.values(SONG_PIECES);
  assert.equal(urls.length, 7, 'un trozo por escena: título, 4 bares, jefes y bonus');
  let total = 0;
  for (const url of urls) {
    assert.ok(disk(url), `falta ${url} en disco`);
    const bytes = readFileSync(url.replace(/^\.\//, ''));
    // Cabecera MP3: ID3 o sincronismo de trama (0xFFEx/0xFFFx).
    const head = bytes.slice(0, 3).toString('latin1');
    assert.ok(head === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0), `${url} no es un mp3`);
    assert.ok(bytes.length < 400 * 1024, `${url} pesa ${(bytes.length / 1024) | 0} KB: debe ser un trozo corto`);
    total += bytes.length;
  }
  assert.ok(existsSync(ORIGINAL), 'la canción original no se borra');
  assert.ok(total < size(ORIGINAL), 'los trozos juntos pesan menos que el original');
});

test('la herramienta que parte la canción está en el repo y declara los mismos trozos', () => {
  assert.ok(existsSync('tools/split_song.py'), 'falta tools/split_song.py');
  const py = readFileSync('tools/split_song.py', 'utf8');
  for (const url of Object.values(SONG_PIECES)) {
    const nombre = url.split('/').pop().replace('.mp3', '');
    assert.ok(py.includes(`'${nombre}'`), `tools/split_song.py no genera ${nombre}`);
  }
  assert.ok(py.includes('afade'), 'cada trozo lleva fundido en los extremos');
});

test('solo la campaña de Dieta de Marcos usa los trozos (arcade y Tumble Dog, no)', () => {
  assert.equal(MARCOS.arcadeAudio, null, 'el arcade de Marcos sigue con música sintetizada');
  assert.ok(!TUMBLEDOG.audio, 'Tumble Dog no tiene canción');
  for (const name of ['title', 'stage', 'boss', 'bonus']) {
    assert.ok(MARCOS.audio[name].default, `${name} tiene trozo por defecto`);
  }
  // Cada bar de la campaña tiene su trozo de fase.
  for (const bar of BARS) {
    const piece = pieceForBar(bar.id);
    assert.ok(piece && MARCOS.audio.stage[piece], `${bar.name} → ${piece}`);
  }
});

// ---- Elección de trozo ----------------------------------------------------

test('cada sección suena con su trozo y el del bar en el que estás', () => withAudio(() => {
  const a = marcosAudio();
  a.music('title', 1, 'taca');
  assert.equal(a.info().url, SONG_PIECES.titulo, 'el título siempre suena con el trozo del título');
  a.music('stage', 1, pieceForBar('concursos'));
  assert.equal(a.info().url, SONG_PIECES.concursos);
  assert.equal(a.info().piece, 'concursos');
  a.music('stage', 1, pieceForBar('pols'));
  assert.equal(a.info().url, SONG_PIECES.pols, 'al cambiar de bar cambia de trozo');
  a.music('boss', 1, pieceForBar('pols'));
  assert.equal(a.info().url, SONG_PIECES.jefes, 'los jefes tienen su trozo');
  a.music('bonus');
  assert.equal(a.info().url, SONG_PIECES.bonus);
  // Trozo desconocido o absent: el de por defecto, nunca silencio.
  a.music('stage', 1, 'no-existe');
  assert.equal(a.info().url, MARCOS.audio.stage.default);
}));

test('cambiar de trozo apaga el anterior con fundido (no se solapan a pleno volumen)', () => withAudio(() => {
  const a = marcosAudio();
  a.music('stage', 1, 'taca');
  for (let i = 0; i < 20; i++) a.update(0.05);
  const primero = FakeAudio.created.at(-1);
  a.music('stage', 1, 'delJefe');
  const segundo = FakeAudio.created.at(-1);
  assert.notEqual(primero, segundo);
  a.update(AX.fadeOut / 2);
  assert.ok(primero.volume > 0 && primero.volume < MARCOS.audioVolume, 'el anterior se está apagando');
  for (let i = 0; i < 20; i++) a.update(0.05);
  assert.equal(primero.paused, true, 'el anterior acaba parado');
  assert.equal(segundo.paused, false, 'el nuevo sigue sonando');
}));

test('el mismo trozo pedido otra vez no reinicia la reproducción', () => withAudio(() => {
  const a = marcosAudio();
  a.music('stage', 1.0, 'taca');
  const n = FakeAudio.created.length;
  a.music('stage', 1.3, 'taca'); // llegó «¡date prisa!»
  assert.equal(FakeAudio.created.length, n, 'no se crea otro reproductor');
  assert.ok(FakeAudio.created.at(-1).playbackRate > 1, 'solo cambia la velocidad');
}));

// ---- Precarga -------------------------------------------------------------

test('precargar un trozo lo baja sin reproducirlo y se aprovecha al sonar', () => withAudio(() => {
  const a = marcosAudio();
  const el = a.preloadMusic('stage', 'delJefe');
  assert.ok(el, 'devuelve el elemento precargado');
  assert.equal(el.paused, true, 'no se pone a sonar solo');
  assert.equal(el.src, SONG_PIECES.delJefe);
  assert.equal(a.info().source, null, 'la música no ha cambiado');
  assert.equal(a.preloadMusic('stage', 'delJefe'), null, 'no se precarga dos veces');
  a.music('stage', 1, 'delJefe');
  assert.equal(FakeAudio.created.length, 1, 'se reutiliza el elemento precargado');
  assert.equal(FakeAudio.created[0], el);
  assert.equal(el.paused, false, 'ahora sí suena');
}));

// ---- Bucle con fundido cruzado --------------------------------------------

test('el trozo se repite con fundido cruzado antes de acabar (bucle limpio)', () => withAudio(() => {
  const a = marcosAudio();
  a.music('stage', 1, 'taca');
  const primero = FakeAudio.created.at(-1);
  for (let i = 0; i < 20; i++) a.update(0.05); // entra del todo
  assert.equal(FakeAudio.created.length, 1, 'mientras suena no se crea otro');
  primero.currentTime = primero.duration - AX.loopCross * 0.5; // a punto de acabar
  a.update(0.016);
  const segundo = FakeAudio.created.at(-1);
  assert.equal(FakeAudio.created.length, 2, 'se prepara la repetición');
  assert.equal(segundo.src, primero.src, 'es el mismo trozo');
  assert.equal(segundo.currentTime, 0, 'empieza por el principio');
  assert.equal(primero.loop, false, 'la copia vieja no vuelve a empezar');
  assert.equal(a.info().url, SONG_PIECES.taca);
  for (let i = 0; i < 30; i++) a.update(0.05);
  assert.equal(primero.paused, true, 'la copia vieja se apaga');
  assert.equal(segundo.paused, false, 'y la nueva sigue');
  assert.ok(segundo.volume > 0, 'sin hueco de silencio entre las dos');
}));

test('un trozo que no carga cae al sintetizador y no se reintenta', () => withAudio(() => {
  const a = marcosAudio();
  a.music('stage', 1, 'taca');
  const roto = FakeAudio.created.at(-1);
  roto.emit('error'); // 404, formato…
  assert.equal(a.info().source, 'synth', 'respaldo sintetizado');
  const n = FakeAudio.created.length;
  a.music('stage', 1, 'taca');
  assert.equal(FakeAudio.created.length, n, 'el trozo roto no se reintenta');
  a.music('stage', 1, 'delJefe');
  assert.equal(a.info().source, 'file', 'los demás trozos siguen funcionando');
}));

// ---- Integración con el motor ---------------------------------------------

/** Audio de prueba que anota lo que le pide el motor. */
function makeSpy() {
  const calls = { music: [], preload: [], setSongs: [] };
  const noop = () => {};
  return {
    calls,
    setSongs(s, f, o) { calls.setSongs.push(f); },
    music(name, t = 1, piece = null) { calls.music.push([name, t, piece]); },
    preloadMusic(name, piece = null) { calls.preload.push([name, piece]); },
    stopMusic: noop, unlock: noop, toggleMute: () => false, update: noop, suck: noop, sfx: noop,
  };
}

function makeInput() {
  const keys = ['left', 'right', 'up', 'down', 'jump', 'suck', 'shoot', 'start', 'pause', 'mute'];
  const held = Object.fromEntries(keys.map((k) => [k, false]));
  const pressed = Object.fromEntries(keys.map((k) => [k, false]));
  const input = { held, pressed, update() {}, takeAny: () => false, get touch() { return false; } };
  return { input, pressed };
}

/** Juega la pantalla de título hasta elegir un modo (0 = campaña, 1 = arcade). */
function startFromTitle(audio, modeSel) {
  const { input, pressed } = makeInput();
  const game = createGame({ input, audio, themeId: 'marcos' });
  game.state.modeSel = modeSel;
  for (let i = 0; i < 240; i++) {
    pressed.jump = i === 90; // un gesto cuando el título ya lleva 0,75 s
    game.update(CONFIG.step);
  }
  return game;
}

test('el motor pide el trozo del bar en la campaña y precarga el siguiente', () => {
  const audio = makeSpy();
  const game = startFromTitle(audio, 0);
  assert.equal(game.state.state, 'route', 'la campaña empieza en la pantalla de ruta');
  assert.ok(audio.calls.setSongs.at(-1), 'la campaña conecta los trozos de la canción');

  game.debug.startStage(0); // Bar La Taca, ronda 1
  assert.deepEqual(audio.calls.music.at(-1), ['stage', 1, 'taca']);
  assert.deepEqual(audio.calls.preload.at(-1), ['bonus', null], 'la ronda bonus queda precargada');
  assert.deepEqual(audio.calls.preload.at(-2), ['stage', 'taca'], 'y el trozo de la ronda siguiente');

  game.debug.startStage(3); // jefe del Bar La Taca
  assert.deepEqual(audio.calls.music.at(-1), ['boss', 1, 'taca']);
  assert.deepEqual(audio.calls.preload.at(-2), ['stage', 'concursos'], 'precarga el trozo del bar siguiente');

  game.debug.startStage(15); // último bar
  assert.deepEqual(audio.calls.music.at(-1), ['boss', 1, 'delJefe']);
  assert.equal(CAMPAIGN_STAGES.length, 16);
});

test('el modo arcade no usa los trozos: música sintetizada', () => {
  const audio = makeSpy();
  const game = startFromTitle(audio, 1);
  assert.equal(game.state.campaign, false, 'estamos en el arcade');
  assert.equal(audio.calls.setSongs.at(-1), null, 'el arcade no recibe ficheros de canción');
  assert.deepEqual(audio.calls.music.at(-1), ['stage', 1, null]);
  assert.equal(audio.calls.preload.length, 0, 'el arcade no precarga trozos');
  assert.equal(game.state.state, 'intro');
});
