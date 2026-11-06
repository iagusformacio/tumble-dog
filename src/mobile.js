// Capa de móvil (issue #105): pantalla completa, horizontal y PWA instalable.
// Aquí no hay ninguna mecánica: solo se habla con el navegador. TODAS las APIs
// son opcionales y van envueltas en try/catch — en el iPhone no existe
// requestFullscreen y screen.orientation.lock solo funciona en Android dentro de
// pantalla completa — así que cuando algo falla el juego sigue igual y no se
// muestra ni un error.
//
// Los números (claves de localStorage, textos, tamaños) están en CONFIG.mobile
// (norma 13 de ORDERS).
import { CONFIG } from './config.js';

const M = Object.assign({
  installKey: 'tumbledog-install-hint', // «ya avisamos de instalar» (una sola vez)
  hintMs: 9000,                        // lo que vive el aviso de instalación
  autoFullscreenOnTouch: true,         // el móvil entra a pantalla completa solo
  gestureMs: 1200,                     // si el navegador no contesta, se sigue igual
  lockTries: 2,                        // intentos de bloqueo horizontal por entrada
}, (CONFIG && CONFIG.mobile) || {});

// ---------------------------------------------------------------- entorno
function mm(win, query) {
  try { return !!(win && win.matchMedia && win.matchMedia(query).matches); } catch { return false; }
}

/** Lee (o escribe) una bandera en localStorage sin morir en el modo privado. */
export function flag(win, key, value) {
  try {
    const ls = win && win.localStorage;
    if (!ls) return null;
    if (value === undefined) return ls.getItem(key);
    if (value === null) { ls.removeItem(key); return null; }
    ls.setItem(key, String(value));
    return value;
  } catch { return null; }
}

/** ¿El dispositivo está en vertical? Se prefiere la media query del navegador. */
export function isPortrait(win) {
  if (!win) return false;
  if (win.matchMedia) return mm(win, '(orientation: portrait)');
  const type = win.screen && win.screen.orientation && win.screen.orientation.type;
  if (typeof type === 'string') return type.indexOf('portrait') === 0;
  const w = win.innerWidth || 0, h = win.innerHeight || 0;
  return w && h ? h > w : false;
}

/** ¿Pantalla táctil? Con esto el aviso de girar no aparece nunca en el escritorio. */
export function isTouch(win) {
  if (!win) return false;
  if (mm(win, '(pointer: coarse)')) return true;
  if (((win.navigator && win.navigator.maxTouchPoints) || 0) > 0) return true;
  try { return 'ontouchstart' in win; } catch { return false; }
}

/** Hay que bloquear el juego y pedir que giren el móvil. */
export function shouldRotate(portrait, touch) { return !!(portrait && touch); }

/** ¿Este navegador sabe entrar en pantalla completa (aunque luego lo deniegue)? */
export function fullscreenSupported(el) {
  return !!(el && (el.requestFullscreen || el.webkitRequestFullscreen || el.webkitEnterFullscreen));
}

export function isFullscreen(doc) {
  try { return !!(doc && (doc.fullscreenElement || doc.webkitFullscreenElement)); } catch { return false; }
}

// ------------------------------------------------- pantalla completa (con respaldo)
// Toda promesa se resuelve a { ok, reason }: nunca lanza, para que no aparezca
// un «Uncaught (in promise)» en la consola del iPhone.
function call(target, fn, arg) {
  if (!target || typeof fn !== 'function') return Promise.resolve({ ok: false, reason: 'sin soporte' });
  try {
    const p = fn.call(target, arg);
    if (!p || typeof p.then !== 'function') return Promise.resolve({ ok: true, reason: 'prefijo' });
    return p.then(() => ({ ok: true })).catch((err) => ({ ok: false, reason: (err && err.name) || 'denegado' }));
  } catch (err) {
    return Promise.resolve({ ok: false, reason: (err && err.name) || 'error' });
  }
}

/** Pide pantalla completa para `el` (con el prefijo webkit de Safari/iPad). */
export function enterFullscreen(el) {
  const fn = el && (el.requestFullscreen || el.webkitRequestFullscreen || el.webkitEnterFullscreen);
  return call(el, fn, typeof el?.requestFullscreen === 'function' ? { navigationUI: 'hide' } : undefined);
}

export function exitFullscreen(doc) {
  return call(doc, doc && (doc.exitFullscreen || doc.webkitExitFullscreen));
}

/** Bloqueo de orientación: solo funciona en Android y solo en pantalla completa. */
export function lockLandscape(win) {
  const o = win && win.screen && win.screen.orientation;
  return call(o, o && o.lock, 'landscape');
}

export function unlockOrientation(win) {
  const o = win && win.screen && win.screen.orientation;
  if (!o || typeof o.unlock !== 'function') return false;
  try { o.unlock(); return true; } catch { return false; }
}

/**
 * Some navegadores (algún headless, Safari en ciertos estados) no llegan a
 * resolver la promesa de requestFullscreen: con `timeoutMs` el flujo no se queda
 * colgado y el cambio se acaba viendo por el evento `fullscreenchange`.
 */
function withTimeout(promise, ms) {
  if (!ms || !(ms > 0)) return promise;
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve({ ok: false, reason: 'sin respuesta' }); } }, ms);
    promise.then((r) => { if (!done) { done = true; clearTimeout(timer); resolve(r); } });
  });
}

/**
 * Secuencia del título: pantalla completa → y SOLO si ha salido bien, bloqueo
 * horizontal (bloquear sin pantalla completa da NotSupportedError en Chrome).
 */
export async function goFullscreen(win, el, timeoutMs = 0) {
  if (isFullscreen(win && win.document)) return { ok: true, reason: 'ya a pantalla completa', locked: false };
  const fs = await withTimeout(enterFullscreen(el), timeoutMs);
  if (!fs.ok) return { ok: false, reason: fs.reason, locked: false };
  const lock = await lockLandscape(win);
  return { ok: true, reason: fs.reason, locked: lock.ok, lockReason: lock.reason };
}

/** Salir: se deshace el bloqueo y se sale de pantalla completa. */
export async function leaveFullscreen(win) {
  const doc = win && win.document;
  unlockOrientation(win);
  const r = await exitFullscreen(doc);
  return { ok: r.ok, reason: r.reason };
}

// ---------------------------------------------------------------- PWA
/**
 * Registra el service worker con rutas RELATIVAS: en GitHub Pages el juego vive
 * en /tumble-dog/, así que la URL y el ámbito se derivan de la propia página.
 * Devuelve false (sin error) si el navegador no lo soporta, si es file://
 * (el HTML empaquetado de tools/bundle.py) o si el registro falla.
 */
export function registerServiceWorker(win, doc) {
  try {
    const nav = win && win.navigator;
    const loc = win && win.location;
    if (!nav || !loc || !('serviceWorker' in nav) || !/^https?:$/.test(loc.protocol)) return false;
    const base = (doc && doc.baseURI) || loc.href;
    const url = new URL('sw.js', base);
    const scope = new URL('./', base).href;
    if (url.origin !== loc.origin) return false;
    const p = nav.serviceWorker.register(url.href, { scope });
    if (p && typeof p.catch === 'function') p.catch(() => { /* sin worker: se juega online igual */ });
    return true;
  } catch { return false; }
}

/** ¿Instalado («Añadir a pantalla de inicio»)? En iOS lo dice navigator.standalone. */
export function isStandalone(win) {
  try {
    if (win && win.navigator && win.navigator.standalone === true) return true;
    return mm(win, '(display-mode: standalone)') || mm(win, '(display-mode: fullscreen)') || mm(win, '(display-mode: minimal-ui)');
  } catch { return false; }
}

/** Dispositivo donde tiene sentido ofrecer «instalar la app». */
export function isInstallableOs(win) {
  const ua = String((win && win.navigator && win.navigator.userAgent) || '');
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

/** ¿Hay que enseñar el aviso de instalar? Solo en móvil, solo la primera vez. */
export function shouldShowInstallHint(opts) {
  const o = opts || {};
  if (o.standalone || !o.touch || !o.installableOs) return false;
  return !o.shown;
}

/** Texto del aviso según la plataforma (iOS no trae botón de instalar). */
export function installHintText(win) {
  const ua = String((win && win.navigator && win.navigator.userAgent) || '');
  return /Android/i.test(ua) && !/iPhone|iPad/i.test(ua)
    ? 'INSTALAR: menú ⋮ → «Añadir a pantalla de inicio»'
    : 'Instala el juego: Compartir → Añadir a pantalla de inicio';
}

// ---------------------------------------------------------------- controlador
/**
 * Crea el controlador del móvil. `arm()` engancha los oyentes y monta los
 * elementos del DOM (aviso de girar, botón de pantalla completa y aviso de
 * instalar); su aspecto está todo en el CSS de `index.html`, que se manda con
 * clases del `body`: `touch`, `rotating`, `fullscreen`, `at-title`, `ask-install`.
 * Se puede armar antes de tener el juego (pantalla de carga) y engancharlo
 * después con `attach({ game, audio })`.
 */
export function createMobile(opts = {}) {
  const win = opts.win || globalThis.window;
  const doc = opts.doc || (win && win.document);
  let game = opts.game || null;
  let audio = opts.audio || null;

  const s = {
    portrait: false, touch: false, blocked: false, attempts: 0,
    fullscreen: false, lastFs: null, pendingFs: false, landscapeLocked: false,
    hintShown: false, sw: false, title: true,
  };
  let gate = null, fsBtn = null, hint = null, hintTimer = 0, gateOpen = false, wasTitle = null;
  let lockTries = 0;

  const has = (o) => !!(o && o.addEventListener);

  function mk(id, html) {
    if (!doc || !doc.createElement || !doc.body) return null;
    const el = doc.createElement('div');
    if (id) el.id = id;
    if (html != null) el.innerHTML = html;
    doc.body.appendChild(el);
    return el;
  }

  function cls(name, on) {
    try {
      const list = doc && doc.body && doc.body.classList;
      if (!list) return;
      if (on) list.add(name); else list.remove(name);
    } catch { /* sin DOM */ }
  }

  function setBlocked(on) {
    if (on === gateOpen) return;
    gateOpen = on;
    s.blocked = on;
    cls('rotating', on);
    // El juego se congela desde el bucle (main.js no llama a update) y aquí,
    // además, se marca la pausa del motor y se suelta la aspiradora para que no
    // quede el sonido en bucle con el dedo encima.
    if (game && game.state) { try { game.state.paused = on; } catch { /* sin juego */ } }
    if (on && audio && audio.suck) { try { audio.suck(false); } catch { /* sin audio */ } }
  }

  // El bloqueo horizontal solo se pide con la pantalla completa puesta y como
  // mucho M.lockTries veces por entrada (en iPhone ni existe: se ignora y punto).
  function ensureLandscape() {
    if (!s.fullscreen || s.landscapeLocked || lockTries >= M.lockTries) return;
    lockTries++;
    lockLandscape(win).then((r) => { s.landscapeLocked = !!r.ok; }, () => {});
  }

  function refresh() {
    if (!win) return s;
    s.portrait = isPortrait(win);
    s.touch = isTouch(win);
    const before = s.fullscreen;
    s.fullscreen = isFullscreen(doc);
    if (!s.fullscreen) { lockTries = 0; s.landscapeLocked = false; }
    setBlocked(shouldRotate(s.portrait, s.touch));
    cls('touch', s.touch);
    cls('fullscreen', s.fullscreen);
    if (s.fullscreen && !before) ensureLandscape(); // llegó por fullscreenchange, no por la promesa
    if (fsBtn) { try { fsBtn.firstChild.textContent = s.fullscreen ? 'SALIR DE PANTALLA COMPLETA' : 'PANTALLA COMPLETA'; } catch { /* sin DOM */ } }
    return s;
  }

  function note(r) { s.lastFs = r; s.pendingFs = false; s.landscapeLocked = !!(r && r.locked); refresh(); return r; }

  function tryFullscreen() {
    if (!win || !doc) return Promise.resolve({ ok: false, reason: 'sin navegador' });
    const el = doc.documentElement;
    if (!fullscreenSupported(el)) { s.lastFs = { ok: false, reason: 'sin soporte' }; return Promise.resolve(s.lastFs); }
    s.attempts++;
    // Queda constancia del intento aunque el navegador no resuelva la promesa.
    s.pendingFs = true;
    lockTries = M.lockTries; // goFullscreen ya intenta el bloqueo si procede
    return goFullscreen(win, el, M.gestureMs).then(note, (err) => note({ ok: false, reason: (err && err.name) || 'error' }));
  }

  function toggleFullscreen() {
    if (isFullscreen(doc)) return leaveFullscreen(win).then((r) => { refresh(); return r; });
    return tryFullscreen();
  }

  // --- aviso de instalación (una sola vez, solo en móvil y solo en el título) ---
  function showHint() {
    if (hint || !doc) return false;
    const ok = shouldShowInstallHint({
      standalone: isStandalone(win), touch: s.touch, installableOs: isInstallableOs(win),
      shown: flag(win, M.installKey) === '1',
    });
    if (!ok) return false;
    hint = mk('install', `<span>${installHintText(win)}</span><button type="button" aria-label="Cerrar aviso">&times;</button>`);
    s.hintShown = true;
    cls('ask-install', true);
    flag(win, M.installKey, '1'); // ya avisamos, aunque luego no se pueda guardar
    hintTimer = Date.now() + M.hintMs;
    const close = hint && hint.querySelector && hint.querySelector('button');
    if (close && close.addEventListener) close.addEventListener('click', hideHint);
    return true;
  }

  function hideHint() {
    if (hint && hint.parentNode) { try { hint.parentNode.removeChild(hint); } catch { /* sin DOM */ } }
    hint = null;
    hintTimer = 0;
    cls('ask-install', false);
  }

  /** Un fois por frame: mantiene el aviso y el botón solo en la pantalla de título. */
  function tick() {
    if (hint && hintTimer && Date.now() > hintTimer) { hideHint(); return; }
    const title = !game || !game.state || game.state.state === 'title';
    if (title !== wasTitle) { wasTitle = title; cls('at-title', title); s.title = title; if (title && !hint && s.installPrompt) showHint(); }
    if (!title && hint) hideHint();
  }

  function arm() {
    if (!doc) return s;
    ensureGate();
    fsBtn = mk('fsbtn', '<button type="button">PANTALLA COMPLETA</button>');
    if (fsBtn) {
      const b = fsBtn.querySelector && fsBtn.querySelector('button');
      if (b && b.addEventListener) b.addEventListener('click', () => { toggleFullscreen(); });
    }
    s.sw = registerServiceWorker(win, doc);
    if (!has(win)) return s;
    refresh();
    tick();
    // El primer toque o tecla del título pide pantalla completa + horizontal.
    const onGesture = () => {
      if (s.attempts > 0 || isFullscreen(doc) || !M.autoFullscreenOnTouch || !isTouch(win)) return;
      tryFullscreen();
    };
    win.addEventListener('keydown', onGesture, { passive: true });
    win.addEventListener('pointerdown', onGesture, { passive: true });
    win.addEventListener('touchstart', onGesture, { passive: true });
    // Tecla F: entra y sale de la pantalla completa (y quita el bloqueo de orientación).
    win.addEventListener('keydown', (e) => {
      if (!e || (e.code !== 'KeyF' && e.key !== 'f' && e.key !== 'F') || e.ctrlKey || e.metaKey || e.altKey) return;
      try { e.preventDefault(); } catch { /* evento de prueba */ }
      toggleFullscreen();
    });
    const onChange = () => refresh();
    for (const ev of ['resize', 'orientationchange', 'fullscreenchange', 'webkitfullscreenchange']) {
      if (has(win)) win.addEventListener(ev, onChange);
    }
    if (win.visualViewport && has(win.visualViewport)) win.visualViewport.addEventListener('resize', onChange);
    if (doc.addEventListener) doc.addEventListener('visibilitychange', () => { if (!doc.hidden) refresh(); });
    // Android/Chrome: si el navegador ofrece instalar, se guarda el evento y se
    // enseña el aviso (el botón del menú de Chrome también vale).
    win.addEventListener('beforeinstallprompt', (e) => {
      s.installPrompt = true;
      if (e && typeof e.preventDefault === 'function') { try { e.preventDefault(); } catch { /* nada */ } }
      if (e) win.__tumbleDogInstallPrompt = e;
      if (s.title) showHint();
    });
    showHint(); // iOS y demás: aviso de texto, la primera vez y nada más
    return s;
  }

  function ensureGate() {
    if (gate) return gate;
    gate = mk('rotate', `<div class="phone"><i></i></div>
      <h2>GIRA EL MÓVIL</h2>
      <p>Tumble Dog se juega en horizontal y a pantalla completa. Gira el m&oacute;vil para empezar.</p>`);
    return gate;
  }

  return {
    arm,
    attach(o = {}) {
      if (o.game) game = o.game;
      if (o.audio) audio = o.audio;
      if (game && game.state) { try { game.state.paused = gateOpen; } catch { /* sin juego */ } }
    },
    refresh, tick, toggleFullscreen, showHint, hideHint,
    blocked: () => s.blocked,
    state: () => Object.assign({}, s),
    /** Pruebas: fuerza vertical/horizontal y táctil sin depender del emulador. */
    set(portrait, touch) {
      s.portrait = !!portrait; s.touch = !!touch;
      setBlocked(shouldRotate(s.portrait, s.touch));
      return s;
    },
  };
}
