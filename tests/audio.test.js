import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/audio.js';

function createFakeAudioContext({ initialState = 'running' } = {}) {
  const tones = [];
  let state = initialState;
  let closed = false;
  return {
    tones,
    get currentTime() { return 1.0; },
    get state() { return state; },
    get closed() { return closed; },
    destination: { kind: 'speakers' },
    resume() {
      state = 'running';
      return Promise.resolve();
    },
    close() {
      closed = true;
      return Promise.resolve();
    },
    createOscillator() {
      const record = { type: 'sine', startFreq: 0, endFreq: null, startedAt: null, stoppedAt: null };
      tones.push(record);
      return {
        set type(v) { record.type = v; },
        get type() { return record.type; },
        frequency: {
          setValueAtTime(v) { record.startFreq = v; },
          exponentialRampToValueAtTime(v) { record.endFreq = v; },
        },
        connect() {},
        start(t) { record.startedAt = t; },
        stop(t) { record.stoppedAt = t; },
      };
    },
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    },
  };
}

function createFakeWindow() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    emit(type, event = {}) {
      for (const fn of listeners.get(type) ?? []) fn(event);
    },
    count(type) {
      return listeners.get(type)?.size ?? 0;
    },
  };
}

test('createAudio desbloquea AudioContext con gesto de usuario y sintetiza todos los efectos', () => {
  const fakeCtx = createFakeAudioContext({ initialState: 'suspended' });
  const win = createFakeWindow();
  const audio = createAudio({ contextFactory: () => fakeCtx, windowObject: win, musicEnabled: false });

  assert.equal(audio.unlocked, false);
  win.emit('keydown', { code: 'Space' });
  assert.equal(audio.unlocked, true);
  assert.equal(fakeCtx.state, 'running');

  assert.equal(audio.playJump(), true);
  assert.equal(audio.playSuckPulse(), true);
  assert.equal(audio.playSuckPulse(), false, 'respeta el enfriamiento del pulso de aspirado');
  assert.equal(audio.playCatch(), true);
  assert.equal(audio.playThrow(), true);
  assert.equal(audio.playBounce(), true);
  assert.equal(audio.playCrush(3), true);
  assert.equal(audio.playEscape(), true);
  assert.equal(audio.playHurt(), true);
  assert.ok(fakeCtx.tones.length >= 10);

  // Silenciar con tecla M impide nuevos tonos; otra pulsación reactiva.
  win.emit('keydown', { code: 'KeyM', repeat: false });
  assert.equal(audio.muted, true);
  const beforeMuted = fakeCtx.tones.length;
  assert.equal(audio.playJump(), false);
  assert.equal(fakeCtx.tones.length, beforeMuted);

  win.emit('keydown', { code: 'KeyM', repeat: false });
  assert.equal(audio.muted, false);
  assert.equal(audio.playJump(), true);

  audio.destroy();
  assert.equal(fakeCtx.closed, true);
  assert.equal(win.count('keydown'), 0);
});

test('melodía chiptune avanza con update, se detiene en pausa y detecta eventos de juego', () => {
  const fakeCtx = createFakeAudioContext();
  const audio = createAudio({ contextFactory: () => fakeCtx, windowObject: null, musicEnabled: true });
  audio.unlock();

  audio.update(0.3, {});
  const notesAfterPlay = fakeCtx.tones.length;
  assert.ok(notesAfterPlay >= 2, 'toca melodía y bajo');

  audio.setPaused(true);
  audio.update(0.5, {});
  assert.equal(fakeCtx.tones.length, notesAfterPlay, 'en pausa no agenda nuevas notas');
  audio.setPaused(false);

  // Detecta captura, combo, rebote de bola y daño a través de update().
  const fakeManager = { carried: { id: 1 }, score: 100, lastCombo: 1, hits: 0 };
  const fakeBall = { alive: true, body: { vx: 200, vy: 50 } };
  audio.setMusicEnabled(false);
  const beforeEvents = fakeCtx.tones.length;
  audio.update(1 / 60, {
    enemyManager: fakeManager,
    ball: fakeBall,
    inputState: { suck: false },
    jumped: true,
    launched: true,
  });
  assert.ok(fakeCtx.tones.length > beforeEvents);

  // Rebote horizontal y golpe a Don Presi en el siguiente frame.
  fakeBall.body.vx = -200;
  fakeManager.hits = 1;
  const beforeBounce = fakeCtx.tones.length;
  audio.update(1 / 60, { enemyManager: fakeManager, ball: fakeBall });
  assert.ok(fakeCtx.tones.length > beforeBounce);
});

test('degrada sin errores cuando el entorno no ofrece WebAudio', () => {
  const audio = createAudio({ contextFactory: () => null, windowObject: null });
  audio.unlock();
  assert.equal(audio.playJump(), false);
  audio.update(0.5, { jumped: true, launched: true });
  assert.equal(audio.playedEvents, 0);
});
