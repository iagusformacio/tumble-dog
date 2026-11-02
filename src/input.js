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
const DEAD_ZONE = 0.15;
const STICK_SMOOTHING = 0.35;

import { THEME } from './themes/tumbledog.js';

export function createInput(win = globalThis.window) {
  const keys = new Set();
  const latched = new Set();
  const touch = new Set();
  const held = {};
  const pressed = {};
  let anyPressed = false;
  let usingTouch = false;
  let pad = null;
  let clearTouch = () => {};
  let updateStick = () => {};
  for (const a of ACTIONS) { held[a] = false; pressed[a] = false; }

  if (win && win.addEventListener) {
    win.addEventListener('keydown', (e) => {
      const a = KEYS[e.code];
      if (a) { keys.add(a); latched.add(a); e.preventDefault(); }
      anyPressed = true;
    });
    win.addEventListener('keyup', (e) => { const a = KEYS[e.code]; if (a) { keys.delete(a); e.preventDefault(); } });
    win.addEventListener('blur', () => { keys.clear(); latched.clear(); clearTouch(); });
    win.addEventListener('pointerdown', (e) => {
      anyPressed = true;
      if (e.pointerType === 'touch' && !usingTouch) { usingTouch = true; buildTouch(win.document); }
    });
  }

  function buildTouch(doc) {
    if (!doc || doc.getElementById('touchpad')) return;
    const root = doc.createElement('div');
    root.id = 'touchpad';
    root.innerHTML = `<div class="orientation-hint">GIRA EL MÓVIL PARA JUGAR</div>
      <div class="stick" role="group" aria-label="Movimiento y salto"><div class="stick-knob"></div></div>
      <div class="levers"><button type="button" class="lever suck" aria-label="${THEME.touch.suck}"><span>${THEME.touch.suck}</span></button>
      <button type="button" class="lever shoot" aria-label="${THEME.touch.shoot}"><span>${THEME.touch.shoot}</span></button></div>`;
    doc.body.appendChild(root);
    const stick = root.querySelector('.stick');
    const knob = root.querySelector('.stick-knob');
    const buttons = [...root.querySelectorAll('.lever')];
    let stickId = null, targetX = 0, targetY = 0, x = 0, y = 0;
    const owners = new Map();
    const directions = ['left', 'right', 'up', 'down', 'jump'];
    const vibrate = () => { try { if (win.navigator && win.navigator.vibrate) win.navigator.vibrate(12); } catch (_) {} };
    const capture = (el, id) => { try { el.setPointerCapture(id); } catch (_) {} };
    const point = (e) => {
      const r = stick.getBoundingClientRect();
      const radius = Math.min(r.width, r.height) / 2;
      let dx = (e.clientX - (r.left + r.width / 2)) / radius;
      let dy = (e.clientY - (r.top + r.height / 2)) / radius;
      const length = Math.hypot(dx, dy);
      if (length > 1) { dx /= length; dy /= length; }
      targetX = dx; targetY = dy;
    };
    function resetStick() {
      stickId = null; targetX = targetY = x = y = 0;
      directions.forEach((a) => touch.delete(a));
      knob.style.transform = ''; stick.classList.remove('on');
    }
    stick.addEventListener('pointerdown', (e) => {
      if (stickId !== null) return;
      e.preventDefault(); stickId = e.pointerId; capture(stick, e.pointerId);
      point(e); stick.classList.add('on'); vibrate();
    });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) { e.preventDefault(); point(e); } });
    const endStick = (e) => { if (e.pointerId === stickId) { e.preventDefault(); resetStick(); } };
    stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
    stick.addEventListener('lostpointercapture', endStick);
    updateStick = () => {
      if (stickId === null) return;
      x += (targetX - x) * STICK_SMOOTHING; y += (targetY - y) * STICK_SMOOTHING;
      const active = { left: x < -DEAD_ZONE, right: x > DEAD_ZONE, up: y < -DEAD_ZONE, down: y > DEAD_ZONE, jump: y < -DEAD_ZONE };
      for (const a of directions) {
        if (active[a]) touch.add(a); else touch.delete(a);
      }
      knob.style.transform = `translate(${x * 50}%, ${y * 50}%)`;
    };
    for (const button of buttons) {
      const action = button.classList.contains('suck') ? 'suck' : 'shoot';
      button.addEventListener('pointerdown', (e) => {
        if (owners.has(action)) return;
        e.preventDefault(); owners.set(action, e.pointerId); capture(button, e.pointerId);
        touch.add(action); latched.add(action); button.classList.add('on'); vibrate();
      });
      const off = (e) => {
        if (owners.get(action) !== e.pointerId) return;
        e.preventDefault(); owners.delete(action); touch.delete(action); button.classList.remove('on');
      };
      button.addEventListener('pointerup', off); button.addEventListener('pointercancel', off);
      button.addEventListener('lostpointercapture', off);
    }
    clearTouch = () => {
      touch.clear(); owners.clear(); resetStick(); buttons.forEach((b) => b.classList.remove('on'));
    };
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
    updateStick();
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
