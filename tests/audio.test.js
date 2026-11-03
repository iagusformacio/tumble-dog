// I2 (#95) y #101 · Música del tema «Dieta de Marcos».
// La canción aportada por la persona es la música del tema, partida en un trozo
// por escena de la campaña: cada trozo se descarga solo cuando toca, el de la
// escena siguiente se precarga y el modo ARCADE no usa trozos (sintetizador).
// Audio falso: sin sonido, se comprueba el comportamiento del reproductor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createAudio } from '../src/audio.js';
import { CONFIG } from '../src/config.js';
import { THEME as MARCOS } from '../src/themes/marcos.js';
import { THEME as TUMBLEDOG } from '../src/themes/tumbledog.js';
import { CAMPAIGN_STAGES, BARS, musicForStage, nextMusicForStage, CAMPAIGN_STAGE_COUNT } from '../src/campaign.js';
import { createGame } from '../src/game.js';

const DIR = 'assets/audio/dieta-de-marcos';
const ORIGINAL = 'assets/audio/dieta-de-marcos.mp3';
const AX = CONFIG.audio;
const CAMPAIGN_SECTIONS = ['campaign-la-taca', 'campaign-concursos', 'campaign-pols', 'campaign-del-jefe', 'campaign-jefes', 'campaign-bonus'];
const SECTIONS = ['title', ...CAMPAIGN_SECTIONS];

class FakeAudio {
  constructor(src) {
    this.src = src; this.loop = false; this.volume = 1; this.muted = false;
    this.paused = true; this.playbackRate = 1; this.preload = ''; this.currentTime = 0;
    this.readyState = 0; this.loads = 0;
    this.listeners = {}; FakeAudio.created.push(this);
  }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  load() { this.loads++; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  emit(type) { for (const fn of this.listeners[type] || []) fn({ target: this }); }
}

function withAudio(fn, { Ctor = FakeAudio } = {}) {
  const had = Object.prototype.hasOwnProperty.call(globalThis, 'Audio');
  const prev = globalThis.Audio;
  FakeAudio.created = [];
  if (Ctor) globalThis.Audio = Ctor; else delete globalThis.Audio;
  try { return fn(); } finally {
    if (had) globalThis.Audio = prev; else delete globalThis.Audio;
  }
}

const marcosAudio = () => { const a = createAudio(); a.setSongs(MARCOS.SONGS, MARCOS.audio, { volume: MARCOS.audioVolume, rate: MARCOS.audioRate }); return a; };
const tumblesAudio = () => { const a = createAudio(); a.setSongs(TUMBLEDOG.SONGS, TUMBLEDOG.audio || null, null); return a; };
const last = () => FakeAudio.created.at(-1);

// ---- El troceado (issue #101)
test('el tema declara un trozo de canción por escena de la campaña y todos existen', () => {
  for (const name of SECTIONS) {
    const url = MARCOS.audio[name];
    assert.ok(url, `falta el trozo de la sección ${name}`);
    assert.match(url, /^\.\/assets\/audio\/dieta-de-marcos\/\d\d-[a-z-]+\.mp3$/, `${name}: ruta del trozo`);
    assert.ok(existsSync(url.slice(2)), `falta el fichero ${url} en disco`);
  }
  // Un fichero distinto por escena: no se repite la canción entera en cada una.
  const files = SECTIONS.map((n) => MARCOS.audio[n]);
  assert.equal(new Set(files).size, SECTIONS.length, 'cada escena tiene su trozo');
  // Y las 7 escenas pedidas: título, 4 bares, jefes y bonus.
  assert.deepEqual(Object.keys(MARCOS.audio).sort(), SECTIONS.slice().sort());
  assert.equal(MARCOS.audio['campaign-la-taca'].includes('02-taca'), true);
  assert.equal(MARCOS.audio['campaign-del-jefe'].includes('05-jefe-bar'), true);
  assert.equal(MARCOS.audio['campaign-jefes'].includes('06-jefes'), true);
  assert.equal(MARCOS.audio['campaign-bonus'].includes('07-bonus'), true);
});

test('cada trozo es corto y ligero: ~20 s y menos de 700 KB (carga rápida)', () => {
  for (const name of SECTIONS) {
    const path = MARCOS.audio[name].slice(2);
    const bytes = statSync(path).size;
    assert.ok(bytes > 60 * 1024, `${path}: ${bytes} bytes, sospechosamente corto`);
    assert.ok(bytes <= 700 * 1024, `${path}: ${bytes} bytes; un trozo no debe pasar de 700 KB`);
    // 96 kbps constantes (ffmpeg): duración aproximada a partir del tamaño.
    const secs = (bytes * 8) / 96000;
    assert.ok(secs >= 12 && secs <= 45, `${path}: ~${secs.toFixed(1)} s`);
  }
  const total = SECTIONS.reduce((n, name) => n + statSync(MARCOS.audio[name].slice(2)).size, 0);
  assert.ok(total < 2.2 * 1024 * 1024, `los 7 trozos suman ${Math.round(total / 1024)} KB`);
  // El original completo se conserva (issue #101: no se borra).
  assert.ok(existsSync(ORIGINAL) && statSync(ORIGINAL).size > 100 * 1024, 'el mp3 original sigue en el repo');
  for (const f of readdirSync(DIR)) assert.match(f, /^\d\d-[a-z-]+\.mp3$/, `fichero inesperado en ${DIR}: ${f}`);
});

test('la figura del troceado (para el PR) existe y pesa poco', () => {
  assert.ok(existsSync('docs/audio-trozos.png'), 'falta docs/audio-trozos.png');
  assert.ok(statSync('docs/audio-trozos.png').size < 200 * 1024, 'la figura debe pesar menos de 200 KB');
});

test('tools/split_music.py --check valida el troceado sin ffmpeg', () => {
  const out = execFileSync('python3', ['tools/split_music.py', '--check'], { encoding: 'utf8' });
  assert.match(out, /troceado correcto: 7 trozos/);
});

test('el fundido cruzado premontado mezcla principio y final de los siete bucles', () => {
  // Con ffmpeg se contrastan los MP3 contra el original; sin él se omiten
  // esas pruebas de forma de onda y se mantienen las validaciones de --check.
  execFileSync('python3', ['tools/test_split_music.py'], { encoding: 'utf8' });
});

test('la campaña mapea cada fase a su trozo y la siguiente escena a precargar', () => {
  assert.equal(CAMPAIGN_STAGE_COUNT, BARS.length * 4);
  for (const [b, bar] of BARS.entries()) {
    for (const r of [0, 1, 2]) {
      const i = b * 4 + r;
      assert.equal(musicForStage(i), 'campaign-' + bar.id, `fase ${i}: trozo del ${bar.name}`);
      assert.ok(CAMPAIGN_STAGES[i].bossStage === false);
    }
    assert.equal(CAMPAIGN_STAGES[b * 4 + 3].bossStage, true);
    assert.equal(musicForStage(b * 4 + 3), 'campaign-jefes', 'los jefes de bar comparten trozo');
  }
  assert.equal(musicForStage(CAMPAIGN_STAGE_COUNT), 'title', 'más allá del final: título');
  assert.equal(nextMusicForStage(0), musicForStage(1));
  assert.equal(nextMusicForStage(2), 'campaign-jefes', 'antes del jefe se precarga su trozo');
  assert.equal(nextMusicForStage(CAMPAIGN_STAGE_COUNT - 1), 'title');
});

test('el modo ARCADE no usa los trozos: «stage», «boss» y «bonus» no son ficheros', () => {
  for (const name of ['stage', 'boss', 'bonus']) assert.equal(MARCOS.audio[name], undefined, `ARCADE no usa ${name}`);
  // Tumble Dog tampoco: sin ficheros, todo sintetizado.
  assert.ok(!TUMBLEDOG.audio || !Object.values(TUMBLEDOG.audio).some((f) => f && f.endsWith('.mp3')));
  assert.ok(MARCOS.audioVolume > 0 && MARCOS.audioVolume <= 1, 'volumen del tema entre 0 y 1');
  assert.ok(MARCOS.audioRate['campaign-jefes'] > 1, 'los jefes van algo más rápidos');
});

// ---- Reproducción por escenas
test('cada escena suena con su trozo, en bucle y desde el principio', () => withAudio(() => {
  const a = marcosAudio();
  for (const name of SECTIONS) {
    a.music(name);
    const info = a.info();
    assert.equal(info.source, 'file', `${name} debe sonar con el fichero`);
    assert.equal(info.section, name);
    assert.equal(info.file, name);
    assert.equal(info.playing, true, `${name} debe estar sonando`);
    assert.equal(last().src, MARCOS.audio[name], `${name}: fichero del trozo`);
    assert.equal(last().loop, true, 'el trozo va en bucle');
    assert.equal(last().currentTime, 0, 'cada escena empieza el trozo desde el principio');
  }
}));

test('no se descarga nada hasta que hace falta (carga bajo demanda)', () => withAudio(() => {
  const a = marcosAudio();
  assert.equal(FakeAudio.created.length, 0, 'sin música no hay ningún <audio>');
  assert.deepEqual(a.info().cached, []);
  a.music('title');
  assert.equal(FakeAudio.created.length, 1, 'solo el trozo del título');
  assert.deepEqual(a.info().cached, ['title']);
  assert.equal(last().src, MARCOS.audio.title);
  assert.equal(last().preload, 'auto', 'el trozo que suena se pide ya');
}));

test('precargar la escena siguiente no la reproduce y luego se reutiliza el elemento', () => withAudio(() => {
  const a = marcosAudio();
  a.music('campaign-la-taca');
  const n = FakeAudio.created.length;
  assert.equal(a.preload('campaign-concursos'), 'campaign-concursos');
  assert.equal(FakeAudio.created.length, n + 1, 'el trozo siguiente se descarga por su cuenta');
  const next = last();
  assert.equal(next.src, MARCOS.audio['campaign-concursos']);
  assert.equal(next.paused, true, 'precargar no suena');
  assert.equal(a.info().section, 'campaign-la-taca', 'sigue sonando la escena actual');
  // Al llegar a la escena, se usa el elemento ya descargado (no se vuelve a pedir).
  a.music('campaign-concursos');
  assert.equal(FakeAudio.created.length, n + 1, 'no se crea otro reproductor');
  assert.equal(last(), next);
  assert.equal(next.paused, false, 'ahora sí suena');
  assert.equal(next.loads, 1, 'lo precargado no se vuelve a pedir al servidor');
}));

test('precargar no crea nada si la sección no es un fichero del tema', () => withAudio(() => {
  const a = marcosAudio();
  assert.equal(a.preload('stage'), null, 'ARCADE: sin fichero, nada que precargar');
  assert.equal(a.preload('campaign-inventado'), null);
  assert.equal(FakeAudio.created.length, 0);
}));

test('fundido: el trozo entra desde el silencio hasta el volumen del tema', () => withAudio(() => {
  const a = marcosAudio();
  a.music('campaign-pols');
  const el = last();
  assert.equal(el.volume, 0, 'arranca en silencio para el fundido');
  a.update(AX.fadeIn / 2);
  const mid = el.volume;
  assert.ok(mid > 0 && mid < MARCOS.audioVolume, `a mitad de fundido (${mid})`);
  for (let i = 0; i < 20; i++) a.update(0.05);
  assert.ok(Math.abs(el.volume - MARCOS.audioVolume) < 0.02, `volumen final ${el.volume} ≈ ${MARCOS.audioVolume}`);
}));

test('al cambiar de bar el trozo anterior se apaga con fundido y no se solapa', () => withAudio(() => {
  const a = marcosAudio();
  a.music('campaign-la-taca');
  a.update(1);
  const first = last();
  a.music('campaign-concursos');
  const second = last();
  assert.notEqual(first, second, 'cada bar tiene su reproductor');
  assert.equal(a.info().file, 'campaign-concursos');
  a.update(AX.fadeOut / 2);
  assert.ok(first.volume > 0 && first.volume < MARCOS.audioVolume, 'el anterior se está apagando');
  assert.equal(first.paused, false);
  for (let i = 0; i < 20; i++) a.update(0.05);
  assert.equal(first.paused, true, 'el anterior acaba parado');
}));

test('volver a una escena ya descargada reutiliza su reproductor', () => withAudio(() => {
  const a = marcosAudio();
  a.music('campaign-la-taca');
  const taca = last();
  a.music('title');
  const n = FakeAudio.created.length;
  a.music('campaign-la-taca');
  assert.equal(FakeAudio.created.length, n, 'no se descarga otra vez el mismo trozo');
  assert.equal(a.info().file, 'campaign-la-taca');
  assert.equal(taca.currentTime, 0, 'vuelve a empezar el trozo');
  assert.equal(taca.paused, false, 'y vuelve a sonar en el mismo elemento');
}));

test('cambio de tema con el título sonando: el sintetizador se calla y entra el trozo (bug #95)', () => withAudio(() => {
  const a = tumblesAudio();
  a.music('title');
  assert.equal(a.info().source, 'synth', 'Tumble Dog sigue con música sintetizada');
  // El motor cambia al tema de Marcos con el título ya sonando (menú de juegos).
  a.setSongs(MARCOS.SONGS, MARCOS.audio, { volume: MARCOS.audioVolume, rate: MARCOS.audioRate });
  const info = a.info();
  assert.equal(info.source, 'file', 'en Dieta de Marcos ya no debe oírse el sintetizador');
  assert.equal(info.section, 'title');
  assert.equal(FakeAudio.created.length, 1);
  assert.equal(FakeAudio.created[0].src, MARCOS.audio.title);
  // Y al volver a Tumble Dog, vuelve el sintetizador y se sueltan los trozos.
  a.setSongs(TUMBLEDOG.SONGS, TUMBLEDOG.audio || null, null);
  assert.equal(a.info().source, 'synth');
  assert.deepEqual(a.info().cached, []);
}));

test('jefe y «date prisa»: cambia la velocidad del trozo, no el trozo ni el elemento', () => withAudio(() => {
  const a = marcosAudio();
  a.music('campaign-jefes');
  const el = last();
  assert.ok(Math.abs(el.playbackRate - MARCOS.audioRate['campaign-jefes']) < 0.001, 'el jefe va algo más rápido');
  a.update(1);
  const vol = el.volume;
  a.music('campaign-jefes', 1.3); // llegó la prisa
  assert.equal(FakeAudio.created.length, 1, 'no se reinicia el trozo');
  assert.ok(el.playbackRate > MARCOS.audioRate['campaign-jefes'], 'la prisa acelera el mismo trozo');
  assert.ok(el.playbackRate <= AX.rateMax, 'sin pasarse de la horquilla');
  assert.equal(el.volume, vol, 'no se corta el volumen al acelerar');
  a.music('campaign-jefes', 1); // se pasa la prisa
  assert.ok(Math.abs(el.playbackRate - MARCOS.audioRate['campaign-jefes']) < 0.001, 'vuelve a la velocidad del jefe');
}));

test('la tecla M silencia el trozo que suena y los precargados', () => withAudio(() => {
  const a = marcosAudio();
  a.music('campaign-bonus');
  const playing = last();
  a.preload('title');
  const loaded = last();
  assert.equal(loaded.paused, true);
  assert.equal(a.toggleMute(), true);
  assert.equal(playing.muted, true);
  assert.equal(loaded.muted, true, 'el precargado también queda en silencio');
  assert.equal(a.info().muted, true);
  assert.equal(a.toggleMute(), false);
  assert.equal(playing.muted, false);
  assert.equal(loaded.muted, false);
}));

test('si un trozo no carga, suena el respaldo sintetizado del tema', () => withAudio(() => {
  const a = marcosAudio();
  a.music('campaign-pols');
  const el = last();
  assert.equal(a.info().source, 'file');
  el.emit('error'); // el fichero falla (404, formato, etc.)
  const info = a.info();
  assert.equal(info.source, 'synth', 'respaldo: música sintetizada del tema');
  assert.equal(info.section, 'campaign-pols');
  assert.equal(el.paused, true, 'el elemento roto se para');
}));

test('un trozo roto no se reintenta en cada escena: sigue el respaldo', () => withAudio(() => {
  const a = marcosAudio();
  a.music('campaign-pols');
  last().emit('error');
  const n = FakeAudio.created.length;
  a.music('campaign-pols'); // el juego vuelve a pedir la misma escena (respawn, etc.)
  a.music('campaign-pols');
  assert.equal(FakeAudio.created.length, n, 'no se crean reproductores nuevos del fichero roto');
  assert.equal(a.info().source, 'synth');
  assert.equal(a.info().section, 'campaign-pols');
  // Las demás escenas siguen con su trozo: un fallo no arrastra al resto.
  a.music('campaign-bonus');
  assert.equal(a.info().source, 'file');
}));

test('sin soporte de Audio (Node/headless) no rompe: respaldo sintetizado', () => withAudio(() => {
  const a = marcosAudio();
  a.music('campaign-la-taca');
  assert.equal(a.info().source, 'synth', 'respaldo sintetizado de la familia de la escena');
  assert.equal(a.info().section, 'campaign-la-taca');
  a.stopMusic();
  assert.equal(a.info().section, null);
}, { Ctor: null }));

test('la misma escena pedida dos veces no reinicia el trozo', () => withAudio(() => {
  const a = marcosAudio();
  a.music('title');
  a.update(AX.fadeIn);
  const el = last();
  a.music('title');
  assert.equal(FakeAudio.created.length, 1);
  assert.equal(a.info().playing, true);
  assert.equal(el.paused, false);
}));

test('el autoplay bloqueado se reintenta en el primer gesto (unlock)', async () => withAudio(async () => {
  const had = globalThis.Audio;
  // Solo el primer play() se rechaza (política de autoplay del navegador).
  class Blocked extends FakeAudio {
    play() { if (this.tries === undefined) { this.tries = 1; this.paused = true; return Promise.reject(new Error('autoplay')); } this.tries++; this.paused = false; return Promise.resolve(); }
  }
  globalThis.Audio = Blocked;
  try {
    const a = marcosAudio();
    a.music('title');
    const el = last();
    assert.equal(el.paused, true, 'el navegador lo bloquea al principio');
    await Promise.resolve(); // llega el rechazo (microtarea), como en el navegador
    a.unlock(); // primer gesto del usuario
    assert.equal(el.paused, false, 'se arranca al desbloquear');
  } finally { globalThis.Audio = had; }
}));

test('el estado de la música es consultable (para probar en el navegador)', () => withAudio(() => {
  const a = marcosAudio();
  assert.deepEqual(Object.keys(a.info()).sort(),
    ['cached', 'file', 'muted', 'playing', 'rate', 'ready', 'readyState', 'section', 'source', 'time', 'volume'].sort());
  a.music('campaign-jefes');
  assert.equal(a.info().source, 'file');
  assert.equal(a.info().file, 'campaign-jefes');
  assert.equal(a.info().ready, false, 'el falso no ha cargado todavía');
  last().emit('canplay');
  assert.equal(a.info().ready, true, 'cuando el trozo carga se nota en el estado');
  assert.deepEqual(a.info().cached, ['campaign-jefes']);
  a.stopMusic();
  assert.equal(a.info().source, null);
}));

// ---- El motor pide la música de cada escena (issue #101)
test('la campaña pide el trozo de su escena y precarga la siguiente; ARCADE no usa trozos', () => {
  const noop = () => {};
  const calls = [];
  const audio = {
    update: noop, setSongs: noop, sfx: noop, suck: noop, unlock: noop, stopMusic: noop,
    music: (name, t) => calls.push(['music', name, t]),
    preload: (name) => { calls.push(['preload', name]); return name; },
  };
  const input = { held: {}, pressed: {}, update: noop, takeAny: () => false };
  const game = createGame({ input, audio, themeId: 'marcos' });
  const since = () => { const out = calls.slice(); calls.length = 0; return out; };

  game.debug.startCampaign(0);      // título + precarga del primer bar
  assert.deepEqual(since(), [['music', 'title', undefined], ['preload', 'campaign-la-taca']]);

  game.debug.startStage(0);         // Bar La Taca, ronda 1
  assert.deepEqual(since().filter((c) => c[0] === 'music'), [['music', 'campaign-la-taca', undefined]]);

  game.debug.startCampaign(5);      // Bar Los Concursos, ronda 2
  since();
  game.debug.startStage(5);
  assert.ok(since().some((c) => c[0] === 'music' && c[1] === 'campaign-concursos'), 'trozo del segundo bar');
  game.debug.startStage(6);         // última ronda del bar: la siguiente es el jefe
  assert.ok(since().some((c) => c[0] === 'preload' && c[1] === 'campaign-jefes'), 'antes del jefe se precarga el suyo');

  game.debug.startCampaign(3);      // jefe del primer bar
  since();
  game.debug.startStage(3);
  assert.ok(since().some((c) => c[0] === 'music' && c[1] === 'campaign-jefes'), 'los jefes tienen su trozo');

  game.debug.startCampaign(0);
  since();
  game.debug.startStage(0, true);   // ronda bonus
  assert.deepEqual(since().filter((c) => c[0] === 'music'), [['music', 'campaign-bonus', undefined]]);

  // Modo ARCADE del tema «marcos»: secciones clásicas, sin trozos ni precargas.
  const arcade = createGame({ input, audio, themeId: 'marcos' });
  arcade.state.campaign = false; // modo ARCADE
  since();
  arcade.debug.startStage(0);
  const ca = since();
  assert.ok(ca.some((c) => c[0] === 'music' && c[1] === 'stage'), 'ARCADE usa la sección clásica');
  assert.ok(!ca.some((c) => c[0] === 'preload'), 'ARCADE no precarga trozos');
});
