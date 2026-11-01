import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/input.js';

function makeTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
    emit(name, event) { listeners.get(name)?.(event); },
  };
}

function makeDocument() {
  const elements = [];
  const body = { append: (element) => elements.push(element) };
  return {
    body,
    elements,
    createElement(tagName) {
      const listeners = new Map();
      return {
        tagName,
        listeners,
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, callback) { listeners.set(name, callback); },
        append(element) { (this.children ??= []).push(element); },
        remove() { this.removed = true; },
        setPointerCapture() {},
      };
    },
  };
}

test('teclado y mando producen un estado unificado por frame', () => {
  const target = makeTarget();
  let pads = [];
  const input = createInput({
    target,
    documentObject: null,
    navigatorObject: { getGamepads: () => pads },
    createTouchControls: false,
  });
  const key = (code) => ({ code, preventDefault() { this.prevented = true; } });

  target.emit('keydown', key('KeyA'));
  target.emit('keydown', key('Space'));
  assert.deepEqual(input.getState(), {
    left: true, right: false, jump: true, suck: false, throw: false, horizontal: -1,
  });

  target.emit('keyup', key('KeyA'));
  pads = [{
    connected: true,
    axes: [0.8],
    buttons: [{ pressed: true }, { pressed: true }, { pressed: false }],
  }];
  assert.deepEqual(input.getState(), {
    left: false, right: true, jump: true, suck: false, throw: true, horizontal: 1,
  });

  target.emit('blur');
  pads = [];
  assert.deepEqual(input.getState(), {
    left: false, right: false, jump: false, suck: false, throw: false, horizontal: 0,
  });
  input.destroy();
  assert.equal(target.listeners.size, 0);
});

test('botones táctiles activan y liberan acciones y se eliminan al destruir', () => {
  const target = makeTarget();
  const documentObject = makeDocument();
  const input = createInput({ target, documentObject, navigatorObject: null });
  const nav = documentObject.elements[0];
  const jumpButton = nav.children.find((button) => button.className.includes('touch-control-jump'));
  const event = {
    pointerId: 7,
    currentTarget: jumpButton,
    preventDefault() {},
  };

  jumpButton.listeners.get('pointerdown')(event);
  assert.equal(input.getState().jump, true);
  jumpButton.listeners.get('pointerup')(event);
  assert.equal(input.getState().jump, false);
  input.destroy();
  assert.equal(nav.removed, true);
});
