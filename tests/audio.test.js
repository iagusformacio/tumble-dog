// I2 (#95) · Música del tema: en «Dieta de Marcos» suena la canción aportada
// (assets/audio/dieta-de-marcos.mp3) en todas las pantallas, con fundidos, y el
// sintetizador queda para los efectos y como respaldo. Audio falso: sin sonido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { createAudio } from '../src/audio.js';
import { CONFIG } from '../src/config.js';
import { THEME as MARCOS } from '../src/themes/marcos.js';
import { THEME as TUMBLEDOG } from '../src/themes/tumbledog.js';

const MP3 = './assets/audio/dieta-de-marcos.mp3';
const AX = CONFIG.audio;

class FakeAudio {
  constructor(src) {
    this.src = src; this.loop = false; this.volume = 1; this.muted = false;
    this.paused = true; this.playbackRate = 1; this.preload = ''; this.currentTime = 0;
    this.listeners = {}; FakeAudio.created.push(this);
  }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
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

test('el tema «marcos» declara la canción aportada en todas las pantallas y el mp3 existe', () => {
  for (const name of ['title', 'stage', 'boss', 'bonus']) {
    assert.equal(MARCOS.audio[name], MP3, `la sección ${name} debe usar la canción aportada`);
  }
  assert.ok(existsSync(MP3.replace(/^\.\//, '')), 'falta assets/audio/dieta-de-marcos.mp3 en disco');
  assert.ok(statSync(MP3.replace(/^\.\//, '')).size > 100 * 1024, 'el mp3 debe ser la canción completa');
  assert.ok(MARCOS.audioVolume > 0 && MARCOS.audioVolume <= 1, 'volumen del tema entre 0 y 1');
  assert.ok(MARCOS.audioRate.boss > 1, 'los jefes van algo más rápidos, sin cambiar de canción');
  // El resto de temas no cambia: Tumble Dog sigue con música sintetizada.
  assert.ok(!TUMBLEDOG.audio || !Object.values(TUMBLEDOG.audio).some((f) => f && f.endsWith('.mp3')));
});

test('«Dieta de Marcos» suena con la canción (no con el sintetizador) en título, fases, jefes y bonus', () => withAudio(() => {
  const a = marcosAudio();
  for (const name of ['title', 'stage', 'boss', 'bonus']) {
    a.music(name);
    const info = a.info();
    assert.equal(info.source, 'file', `${name} debe sonar con el fichero`);
    assert.equal(info.section, name);
    assert.equal(info.playing, true, `${name} debe estar sonando`);
    const el = FakeAudio.created[FakeAudio.created.length - 1];
    assert.equal(el.src, MP3);
    assert.equal(el.loop, true, 'la canción va en bucle');
  }
  // Ninguna llamada ha arrancado el sintetizador: el fichero manda.
  assert.ok(!Object.values(MARCOS.audio).includes(undefined));
}));

test('fundido: la canción entra desde el silencio hasta el volumen del tema', () => withAudio(() => {
  const a = marcosAudio();
  a.music('stage');
  const el = FakeAudio.created.at(-1);
  assert.equal(el.volume, 0, 'arranca en silencio para el fundido');
  a.update(AX.fadeIn / 2);
  const mid = el.volume;
  assert.ok(mid > 0 && mid < MARCOS.audioVolume, `a mitad de fundido (${mid})`);
  for (let i = 0; i < 20; i++) a.update(0.05);
  assert.ok(Math.abs(el.volume - MARCOS.audioVolume) < 0.02, `volumen final ${el.volume} ≈ ${MARCOS.audioVolume}`);
}));

test('al cambiar de pantalla la canción anterior se apaga con fundido y no se solapa', () => withAudio(() => {
  const a = marcosAudio();
  a.music('title');
  a.update(1);
  const first = FakeAudio.created.at(-1);
  a.music('stage');
  const second = FakeAudio.created.at(-1);
  assert.notEqual(first, second, 'cada pantalla arranca su reproducción');
  assert.equal(a.info().file, 'stage');
  a.update(AX.fadeOut / 2);
  assert.ok(first.volume > 0 && first.volume < MARCOS.audioVolume, 'la anterior se está apagando');
  assert.equal(first.paused, false);
  for (let i = 0; i < 20; i++) a.update(0.05);
  assert.equal(first.paused, true, 'la anterior acaba parada');
}));

test('cambio de tema con el título sonando: el sintetizador se calla y entra la canción (bug #95)', () => withAudio(() => {
  const a = tumblesAudio();
  a.music('title');
  assert.equal(a.info().source, 'synth', 'Tumble Dog sigue con música sintetizada');
  // El motor cambia al tema de Marcos con el título ya sonando (menú de juegos).
  a.setSongs(MARCOS.SONGS, MARCOS.audio, { volume: MARCOS.audioVolume, rate: MARCOS.audioRate });
  const info = a.info();
  assert.equal(info.source, 'file', 'en Dieta de Marcos ya no debe oírse el sintetizador');
  assert.equal(info.section, 'title');
  assert.equal(FakeAudio.created.length, 1);
  assert.equal(FakeAudio.created[0].src, MP3);
  // Y al volver a Tumble Dog, vuelve el sintetizador.
  a.setSongs(TUMBLEDOG.SONGS, TUMBLEDOG.audio || null, null);
  assert.equal(a.info().source, 'synth');
}));

test('jefe y «date prisa»: cambia la velocidad de la canción, no la canción ni el elemento', () => withAudio(() => {
  const a = marcosAudio();
  a.music('boss');
  const el = FakeAudio.created.at(-1);
  assert.ok(Math.abs(el.playbackRate - MARCOS.audioRate.boss) < 0.001, 'el jefe va algo más rápido');
  a.update(1);
  const vol = el.volume;
  a.music('boss', 1.3); // llegó la prisa
  assert.equal(FakeAudio.created.length, 1, 'no se reinicia la canción');
  assert.ok(el.playbackRate > MARCOS.audioRate.boss, 'la prisa acelera la misma canción');
  assert.ok(el.playbackRate <= AX.rateMax, 'sin pasarse de la horquilla');
  assert.equal(el.volume, vol, 'no se corta el volumen al acelerar');
  a.music('boss', 1); // se pasa la prisa
  assert.ok(Math.abs(el.playbackRate - MARCOS.audioRate.boss) < 0.001, 'vuelve a la velocidad del jefe');
}));

test('la tecla M silencia también la canción y el estado lo refleja', () => withAudio(() => {
  const a = marcosAudio();
  a.music('stage');
  const el = FakeAudio.created.at(-1);
  assert.equal(a.toggleMute(), true);
  assert.equal(el.muted, true);
  assert.equal(a.info().muted, true);
  assert.equal(a.toggleMute(), false);
  assert.equal(el.muted, false);
}));

test('si el mp3 no carga, suena el respaldo sintetizado del tema', () => withAudio(() => {
  const a = marcosAudio();
  a.music('stage');
  const el = FakeAudio.created.at(-1);
  assert.equal(a.info().source, 'file');
  el.emit('error'); // el fichero falla (404, formato, etc.)
  const info = a.info();
  assert.equal(info.source, 'synth', 'respaldo: música sintetizada del tema');
  assert.equal(info.section, 'stage');
  assert.equal(el.paused, true, 'el elemento roto se para');
}));

test('sin soporte de Audio (Node/headless) no rompe: respaldo sintetizado', () => withAudio(() => {
  const a = marcosAudio();
  a.music('stage');
  assert.equal(a.info().source, 'synth');
  assert.equal(a.info().section, 'stage');
  a.stopMusic();
  assert.equal(a.info().section, null);
}, { Ctor: null }));

test('la misma sección pedida dos veces no reinicia la canción', () => withAudio(() => {
  const a = marcosAudio();
  a.music('title');
  a.update(AX.fadeIn);
  const el = FakeAudio.created.at(-1);
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
    const el = FakeAudio.created.at(-1);
    assert.equal(el.paused, true, 'el navegador lo bloquea al principio');
    await Promise.resolve(); // llega el rechazo (microtarea), como en el navegador
    a.unlock(); // primer gesto del usuario
    assert.equal(el.paused, false, 'se arranca al desbloquear');
  } finally { globalThis.Audio = had; }
}));

test('el nombre de la sección y la fuente son consultables (para probar en el navegador)', () => withAudio(() => {
  const a = marcosAudio();
  assert.deepEqual(Object.keys(a.info()).sort(), ['file', 'muted', 'playing', 'rate', 'section', 'source', 'time', 'volume'].sort());
  a.music('bonus');
  assert.equal(a.info().source, 'file');
  assert.equal(a.info().file, 'bonus');
  a.stopMusic();
  assert.equal(a.info().source, null);
}));
