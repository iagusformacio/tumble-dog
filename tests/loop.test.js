import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameLoop } from '../src/loop.js';

function makeHarness({ width = 640, height = 400, devicePixelRatio = 2 } = {}) {
  const events = new Map();
  const documentEvents = new Map();
  const frames = new Map();
  let nextFrameId = 0;
  const transforms = [];
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => ({ setTransform: (...args) => transforms.push(args) }),
  };
  const windowObject = {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio,
    addEventListener: (name, callback) => events.set(name, callback),
    removeEventListener: (name) => events.delete(name),
  };
  const documentObject = {
    hidden: false,
    addEventListener: (name, callback) => documentEvents.set(name, callback),
    removeEventListener: (name) => documentEvents.delete(name),
  };
  const requestFrame = (callback) => {
    const id = ++nextFrameId;
    frames.set(id, callback);
    return id;
  };
  const cancelFrame = (id) => frames.delete(id);
  const fireFrame = (timestamp) => {
    const [id, callback] = frames.entries().next().value ?? [];
    assert.ok(callback, 'se esperaba un frame pendiente');
    frames.delete(id);
    callback(timestamp);
  };

  return {
    canvas,
    events,
    documentEvents,
    frames,
    transforms,
    windowObject,
    documentObject,
    requestFrame,
    cancelFrame,
    fireFrame,
  };
}

function makeLoop(harness, options = {}) {
  const updates = [];
  const alphas = [];
  const pauseEvents = [];
  const loop = createGameLoop({
    canvas: harness.canvas,
    update: (delta) => updates.push(delta),
    render: (alpha) => alphas.push(alpha),
    windowObject: harness.windowObject,
    documentObject: harness.documentObject,
    requestFrame: harness.requestFrame,
    cancelFrame: harness.cancelFrame,
    onPause: () => pauseEvents.push('pause'),
    onResume: () => pauseEvents.push('resume'),
    ...options,
  });
  return { loop, updates, alphas, pauseEvents };
}

test('bucle fijo de 60 Hz y render interpolado entre pasos', () => {
  const harness = makeHarness();
  const { loop, updates, alphas } = makeLoop(harness);

  harness.fireFrame(100);
  harness.fireFrame(125);

  assert.equal(updates.length, 1);
  assert.ok(Math.abs(updates[0] - 1 / 60) < 1e-12);
  assert.ok(Math.abs(alphas.at(-1) - 0.5) < 1e-9);
  loop.stop();
});

test('una pausa larga limita la recuperación y no deja ráfagas de pasos pendientes', () => {
  const harness = makeHarness();
  const { loop, updates, alphas } = makeLoop(harness);

  harness.fireFrame(0);
  harness.fireFrame(250);
  assert.equal(updates.length, 5);
  assert.ok(alphas.at(-1) >= 0 && alphas.at(-1) < 1);

  for (let frame = 1; frame <= 3; frame += 1) {
    harness.fireFrame(250 + frame * (1000 / 60));
  }
  assert.ok(updates.length <= 8, 'no debe perseguir el tiempo perdido en frames posteriores');
  loop.stop();
});

test('canvas responsive conserva aspecto y escala según la densidad de píxel', () => {
  const harness = makeHarness();
  const { loop } = makeLoop(harness);

  assert.equal(harness.canvas.style.width, '571px');
  assert.equal(harness.canvas.style.height, '400px');
  assert.equal(harness.canvas.width, 1142);
  assert.equal(harness.canvas.height, 800);
  assert.ok(harness.transforms.length >= 1);
  loop.stop();
});

test('perder foco pausa y al volver descarta el tiempo transcurrido', () => {
  const harness = makeHarness();
  const { loop, updates, pauseEvents } = makeLoop(harness);

  harness.fireFrame(0);
  harness.events.get('blur')();
  assert.equal(loop.isPaused, true);
  assert.equal(harness.frames.size, 0);

  harness.events.get('focus')();
  assert.equal(loop.isPaused, false);
  harness.fireFrame(10_000);
  assert.equal(updates.length, 0);
  harness.fireFrame(10_017);
  assert.equal(updates.length, 1);
  assert.deepEqual(pauseEvents, ['pause', 'resume']);
  loop.stop();
});

test('canvas se redimensiona y stop elimina suscripciones y frames', () => {
  const harness = makeHarness();
  const { loop } = makeLoop(harness);
  harness.windowObject.innerWidth = 320;
  harness.windowObject.innerHeight = 224;
  harness.events.get('resize')();

  assert.equal(harness.canvas.style.width, '320px');
  assert.equal(harness.canvas.style.height, '224px');
  loop.stop();
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.events.size, 0);
  assert.equal(harness.documentEvents.size, 0);
});
