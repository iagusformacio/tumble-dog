// Entrada unificada: teclado, mando (Gamepad API) y táctil.
// update() una vez por frame; held = mantenido, pressed = pulsado en este frame.
import { W } from './config.js';

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyC: 'jump',
  KeyX: 'suck', KeyJ: 'suck', ShiftLeft: 'suck',
  KeyZ: 'shoot', KeyK: 'shoot', ControlLeft: 'shoot',
  Enter: 'start', Escape: 'pause', KeyP: 'pause', KeyM: 'mute',
};
const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'suck', 'shoot', 'start', 'pause', 'mute'];

// Posiciones "casa" de los botones táctiles (px sobre un canvas de 1280×720).
// Se escalan y reposicionan sobre el canvas real en placeTouchpad().
const HOMES = {
  l1: { hx: 'left', x: 18, hy: 'bottom', y: 24, w: 78, h: 78 },
  l2: { hx: 'left', x: 108, hy: 'bottom', y: 24, w: 78, h: 78 },
  l3: { hx: 'left', x: 63, hy: 'bottom', y: 110, w: 62, h: 62 },
  r1: { hx: 'right', x: 18, hy: 'bottom', y: 24, w: 92, h: 92 },
  r2: { hx: 'right', x: 124, hy: 'bottom', y: 24, w: 78, h: 78 },
  r3: { hx: 'right', x: 60, hy: 'bottom', y: 128, w: 78, h: 78 },
};

/**
 * Recoloca y escala los botones táctiles sobre el caja CSS del canvas,
 * para que queden bajo el juego en cualquier tamaño de ventana (móvil incluido).
 */
export function placeTouchpad(doc = globalThis.document) {
  const tp = doc && doc.getElementById('touchpad');
  const c = doc && doc.getElementById('game');
  if (!tp || !c) return;
  const r = c.getBoundingClientRect();
  const s = r.width / W;
  tp.style.position = 'fixed';
  tp.style.left = Math.round(r.left) + 'px';
  tp.style.top = Math.round(r.top) + 'px';
  tp.style.width = Math.round(r.width) + 'px';
  tp.style.height = Math.round(r.height) + 'px';
  tp.style.pointerEvents = 'none';
  for (const b of tp.querySelectorAll('.tbtn')) {
    const home = HOMES[b.dataset.home];
    if (!home) continue;
    const lx = home.hx === 'left' ? home.x : r.width - home.x - home.w;
    const ty = home.hy === 'bottom' ? r.height - home.y - home.h : home.y;
    b.style.left = Math.round(r.left + lx * s) + 'px';
    b.style.top = Math.round(r.top + ty * s) + 'px';
    b.style.width = Math.round(home.w * s) + 'px';
    b.style.height = Math.round(home.h * s) + 'px';
  }
}

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
      b.dataset.home = cls;
      const on = (e) => { e.preventDefault(); touch.add(action); latched.add(action); b.classList.add('on'); };
      const off = (e) => { e.preventDefault(); touch.delete(action); b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
      root.appendChild(b);
    };
    mk('left', '◀', 'l1'); mk('right', '▶', 'l2'); mk('down', '▼', 'l3');
    mk('jump', 'SALTO', 'r1'); mk('suck', 'ASPIRA', 'r2'); mk('shoot', 'LANZA', 'r3');
    doc.body.appendChild(root);
    placeTouchpad(doc);
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
