// Entrada unificada: teclado, mando (Gamepad API) y táctil.
// update() una vez por frame; held = mantenido, pressed = pulsado en este frame.
const KEYS = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyC: 'jump',
  KeyX: 'suck', KeyJ: 'suck', ShiftLeft: 'suck',
  KeyZ: 'shoot', KeyK: 'shoot', ControlLeft: 'shoot',
  Enter: 'start', Escape: 'pause', KeyP: 'pause', KeyM: 'mute',
};
const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'suck', 'shoot', 'start', 'pause', 'mute'];

export function createInput(win = globalThis.window) {
  const keys = new Set();
  const latched = new Set();
  const touch = new Set();
  const held = {};
  const pressed = {};
  let anyPressed = false;
  let usingTouch = false;
  let pad = null;
  for (const a of ACTIONS) { held[a] = false; pressed[a] = false; }

  if (win && win.addEventListener) {
    win.addEventListener('keydown', (e) => {
      const a = KEYS[e.code];
      if (a) { keys.add(a); latched.add(a); e.preventDefault(); }
      anyPressed = true;
    });
    win.addEventListener('keyup', (e) => { const a = KEYS[e.code]; if (a) { keys.delete(a); e.preventDefault(); } });
    win.addEventListener('blur', () => { keys.clear(); touch.clear(); });
    win.addEventListener('pointerdown', (e) => {
      anyPressed = true;
      if (e.pointerType === 'touch' && !usingTouch) { usingTouch = true; buildTouch(win.document); }
    });
  }

  function buildTouch(doc) {
    if (!doc || doc.getElementById('touchpad')) return;
    const root = doc.createElement('div');
    root.id = 'touchpad';
    const mk = (action, label, cls) => {
      const b = doc.createElement('button');
      b.className = 'tbtn ' + cls; b.textContent = label; b.setAttribute('aria-label', action);
      const on = (e) => { e.preventDefault(); touch.add(action); latched.add(action); b.classList.add('on'); };
      const off = (e) => { e.preventDefault(); touch.delete(action); b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
      root.appendChild(b);
    };
    mk('left', '◀', 'l1'); mk('right', '▶', 'l2'); mk('down', '▼', 'l3');
    mk('jump', 'SALTO', 'r1'); mk('suck', 'ASPIRA', 'r2'); mk('shoot', 'LANZA', 'r3');
    doc.body.appendChild(root);
  }

  function readPad() {
    const nav = win && win.navigator;
    const list = nav && nav.getGamepads ? nav.getGamepads() : [];
    pad = null;
    for (const p of list || []) if (p && p.connected) { pad = p; break; }
    if (!pad) return {};
    const b = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
    const ax = pad.axes[0] || 0; const ay = pad.axes[1] || 0;
    return {
      left: ax < -0.4 || b(14), right: ax > 0.4 || b(15), up: ay < -0.5 || b(12), down: ay > 0.5 || b(13),
      jump: b(0), suck: b(2) || b(7), shoot: b(1) || b(6), start: b(9), pause: b(8),
    };
  }

  function update() {
    const p = readPad();
    for (const a of ACTIONS) {
      const now = keys.has(a) || latched.has(a) || touch.has(a) || !!p[a];
      pressed[a] = now && !held[a];
      held[a] = now;
    }
    latched.clear();
  }

  return {
    held, pressed, update,
    takeAny() { const v = anyPressed; anyPressed = false; return v; },
    get touch() { return usingTouch; },
  };
}
