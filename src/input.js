const KEY_ACTIONS = new Map([
  ['ArrowLeft', 'left'], ['KeyA', 'left'],
  ['ArrowRight', 'right'], ['KeyD', 'right'],
  ['ArrowUp', 'jump'], ['KeyW', 'jump'], ['Space', 'jump'],
  ['KeyX', 'suck'], ['KeyJ', 'suck'],
  ['KeyZ', 'throw'], ['KeyK', 'throw'],
]);

const TOUCH_BUTTONS = [
  ['left', '◀', 'Izquierda'],
  ['right', '▶', 'Derecha'],
  ['jump', 'SALTO', 'Saltar'],
  ['suck', 'ASPIRAR', 'Aspirar'],
  ['throw', 'LANZAR', 'Lanzar'],
];

/**
 * Combines keyboard, standard Gamepad API controls, and optional on-screen buttons.
 * Call getState() once per simulation update to receive the current held actions.
 */
export function createInput({
  target = globalThis.window,
  documentObject = globalThis.document,
  navigatorObject = target?.navigator ?? globalThis.navigator,
  createTouchControls = true,
} = {}) {
  const pressedKeys = new Set();
  const activePointers = new Map();
  const touchButtons = new Map();
  let controlsElement = null;

  function onKeyDown(event) {
    if (!KEY_ACTIONS.has(event.code)) return;
    pressedKeys.add(event.code);
    event.preventDefault();
  }

  function onKeyUp(event) {
    if (!KEY_ACTIONS.has(event.code)) return;
    pressedKeys.delete(event.code);
    event.preventDefault();
  }

  function clearKeys() {
    pressedKeys.clear();
  }

  function setPointerAction(event, action) {
    event.preventDefault();
    activePointers.set(event.pointerId, action);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Algunos navegadores no ofrecen captura para este tipo de puntero.
    }
  }

  function releasePointer(event) {
    activePointers.delete(event.pointerId);
  }

  function createButtons() {
    if (!documentObject?.createElement || !documentObject.body) return;
    controlsElement = documentObject.createElement('nav');
    controlsElement.className = 'touch-controls';
    controlsElement.setAttribute('aria-label', 'Controles táctiles del juego');

    for (const [action, label, accessibleName] of TOUCH_BUTTONS) {
      const button = documentObject.createElement('button');
      button.type = 'button';
      button.className = `touch-control touch-control-${action}`;
      button.textContent = label;
      button.setAttribute('aria-label', accessibleName);
      button.addEventListener('pointerdown', (event) => setPointerAction(event, action));
      button.addEventListener('pointerup', releasePointer);
      button.addEventListener('pointercancel', releasePointer);
      button.addEventListener('lostpointercapture', releasePointer);
      button.addEventListener('contextmenu', (event) => event.preventDefault());
      controlsElement.append(button);
      touchButtons.set(action, button);
    }
    documentObject.body.append(controlsElement);
  }

  target?.addEventListener('keydown', onKeyDown);
  target?.addEventListener('keyup', onKeyUp);
  target?.addEventListener('blur', clearKeys);
  if (createTouchControls) createButtons();

  function getState() {
    const state = { left: false, right: false, jump: false, suck: false, throw: false };

    for (const code of pressedKeys) state[KEY_ACTIONS.get(code)] = true;
    for (const action of activePointers.values()) state[action] = true;

    const pads = navigatorObject?.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad?.connected) continue;
      const axes = pad.axes ?? [];
      const buttons = pad.buttons ?? [];
      if ((axes[0] ?? 0) < -0.25 || buttons[14]?.pressed) state.left = true;
      if ((axes[0] ?? 0) > 0.25 || buttons[15]?.pressed) state.right = true;
      if (buttons[0]?.pressed) state.jump = true;
      if (buttons[2]?.pressed) state.suck = true;
      if (buttons[1]?.pressed) state.throw = true;
    }

    state.horizontal = Number(state.right) - Number(state.left);
    return state;
  }

  return {
    getState,
    destroy() {
      target?.removeEventListener('keydown', onKeyDown);
      target?.removeEventListener('keyup', onKeyUp);
      target?.removeEventListener('blur', clearKeys);
      controlsElement?.remove();
      controlsElement = null;
      touchButtons.clear();
      activePointers.clear();
      pressedKeys.clear();
    },
  };
}
