// Issue #105 · capa de móvil. Se prueba con un `window` y un `document` falsos:
// lo que importa es la política (cuándo se pide pantalla completa, cuándo se
// bloquea por vertical, qué se guarda en localStorage) y que NINGÚN fallo del
// navegador se convierta en un error en consola.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPortrait, isTouch, shouldRotate, fullscreenSupported, isFullscreen,
  enterFullscreen, exitFullscreen, lockLandscape, goFullscreen, leaveFullscreen,
  registerServiceWorker, isStandalone, isInstallableOs, shouldShowInstallHint,
  installHintText, flag, createMobile,
} from '../src/mobile.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// ---------------------------------------------------------------- DOM de mentira
function fakeEl(extra = {}) {
  const el = {
    id: '', innerHTML: '', style: {}, textContent: '', children: [],
    classList: { set: new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, contains(c) { return this.set.has(c); } },
    listeners: {},
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    dispatch(type, ev = {}) { for (const fn of this.listeners[type] || []) fn(ev); },
    appendChild(child) { child.parentNode = el; el.children.push(child); return child; },
    removeChild(child) { el.children = el.children.filter((c) => c !== child); child.parentNode = null; },
    querySelector() { return el._button || (el._button = fakeEl()); },
    get firstChild() { return el._first || (el._first = { textContent: '' }); },
    ...extra,
  };
  return el;
}

function fakeEnv(opts = {}) {
  const {
    portrait = false, touch = true, standalone = false, ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
    fullscreen = true, lockWorks = false, storage = true, serviceWorker = true, origin = 'https://example.github.io',
    path = '/tumble-dog/index.html',
  } = opts;
  const calls = { fullscreen: 0, webkitFullscreen: 0, exit: 0, lock: [], unlock: 0, register: [], storage: [], beforeinstall: 0 };
  const body = fakeEl();
  const documentElement = {
    requestFullscreen(o) {
      calls.fullscreen++;
      if (!fullscreen) return Promise.reject(new Error('denegado'));
      doc.fullscreenElement = documentElement; // como en el navegador real
      return Promise.resolve(o);
    },
    webkitRequestFullscreen() { calls.webkitFullscreen++; doc.fullscreenElement = documentElement; },
  };
  const doc = {
    baseURI: origin + path,
    body,
    documentElement,
    hidden: false,
    fullscreenElement: null,
    exitFullscreen() { calls.exit++; doc.fullscreenElement = null; return Promise.resolve(); },
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    dispatch(type, ev = {}) { for (const fn of this.listeners[type] || []) fn(ev); },
    listeners: {},
    createElement: () => fakeEl(),
  };
  const media = {
    '(orientation: portrait)': portrait,
    '(pointer: coarse)': touch,
    '(display-mode: standalone)': standalone,
    '(display-mode: fullscreen)': standalone,
    '(display-mode: minimal-ui)': false,
  };
  const win = {
    innerWidth: portrait ? 390 : 844, innerHeight: portrait ? 844 : 390,
    devicePixelRatio: 3,
    matchMedia: (q) => ({ matches: !!media[q], addEventListener() {} }),
    localStorage: storage ? {
      _s: new Map(),
      getItem(k) { calls.storage.push(['get', k]); return this._s.has(k) ? this._s.get(k) : null; },
      setItem(k, v) { calls.storage.push(['set', k, v]); this._s.set(k, String(v)); },
      removeItem(k) { this._s.delete(k); },
    } : {
      get length() { throw new Error('SecurityError'); },
      getItem() { throw new Error('SecurityError'); },
      setItem() { throw new Error('QuotaExceededError'); },
    },
    navigator: {
      userAgent: ua,
      maxTouchPoints: touch ? 5 : 0,
      standalone,
      serviceWorker: serviceWorker ? { register: (url, o) => { calls.register.push([url, o]); return Promise.resolve({ scope: url }); } } : undefined,
    },
    screen: {
      orientation: {
        type: portrait ? 'portrait-primary' : 'landscape-primary',
        lock(mode) { if (lockWorks) { calls.lock.push(mode); return Promise.resolve(); } calls.lock.push(mode); return Promise.reject(new Error('NotSupportedError')); },
        unlock() { calls.unlock++; },
      },
    },
    location: { protocol: 'https:', origin, href: origin + path },
    document: null,
    listeners: {},
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    dispatch(type, ev = {}) { for (const fn of this.listeners[type] || []) fn(ev); },
  };
  Object.defineProperty(doc, 'webkitFullscreenElement', { get() { return null; } });
  win.document = doc;
  if (standalone) doc.fullscreenElement = null;
  return { win, doc, body, documentElement, calls };
}

// ---------------------------------------------------------------- detección
test('vertical y táctil: se bloquea; en horizontal o en escritorio, no', () => {
  assert.equal(isPortrait({ matchMedia: (q) => ({ matches: q === '(orientation: portrait)' }) }), true);
  assert.equal(isPortrait({ matchMedia: (q) => ({ matches: q !== '(orientation: portrait)' }) }), false);
  // sin media queries (Node, pruebas raras): se cae al tipo de orientación y al tamaño
  assert.equal(isPortrait({ screen: { orientation: { type: 'portrait-secondary' } } }), true);
  assert.equal(isPortrait({ innerWidth: 400, innerHeight: 900 }), true);
  assert.equal(isPortrait({ innerWidth: 900, innerHeight: 400 }), false);
  assert.equal(isPortrait(null), false);

  assert.equal(isTouch({ navigator: { maxTouchPoints: 0 }, matchMedia: () => ({ matches: false }) }), false);
  assert.equal(isTouch({ matchMedia: (q) => ({ matches: q === '(pointer: coarse)' }) }), true);
  assert.equal(shouldRotate(true, true), true);
  assert.equal(shouldRotate(false, true), false);
  assert.equal(shouldRotate(true, false), false, 'un escritorio alto y estrecho no se gira');
});

test('pantalla completa: soportes y respingos sin promesas sin capturar', async () => {
  assert.equal(fullscreenSupported(null), false);
  assert.equal(fullscreenSupported({}), false);
  assert.equal(fullscreenSupported({ webkitRequestFullscreen() {} }), true);

  const ok = await enterFullscreen({ requestFullscreen: (o) => Promise.resolve(o) });
  assert.equal(ok.ok, true);
  const denied = await enterFullscreen({ requestFullscreen: () => Promise.reject(new Error('puñetas')) });
  assert.equal(denied.ok, false, 'un rechazo NO puede acabar en error de consola');
  const thrower = await enterFullscreen({ requestFullscreen() { throw new Error('nope'); } });
  assert.equal(thrower.ok, false);
  const legacy = await enterFullscreen({ webkitRequestFullscreen() {} });
  assert.equal(legacy.ok, true, 'Safari viejo: vale con el prefijo');
  assert.equal((await exitFullscreen({ exitFullscreen: () => Promise.resolve() })).ok, true);
  assert.equal((await exitFullscreen({})).ok, false);
});

test('el bloqueo horizontal solo se intenta DESPUÉS de conseguir la pantalla completa', async () => {
  const tried = [];
  const win = { screen: { orientation: { lock: (m) => { tried.push(m); return Promise.resolve(); } } } };
  const ok = await goFullscreen(win, { requestFullscreen: () => Promise.resolve() });
  assert.deepEqual(tried, ['landscape'], 'Android exige pantalla completa antes de bloquear');
  assert.equal(ok.ok, true); assert.equal(ok.locked, true);

  const tried2 = [];
  const win2 = { screen: { orientation: { lock: (m) => { tried2.push(m); return Promise.reject(new Error('NotSupportedError')); } } } };
  const r = await goFullscreen(win2, { requestFullscreen: () => Promise.reject(new Error('x')) });
  assert.equal(r.ok, false);
  assert.deepEqual(tried2, [], 'si la pantalla completa falla (iPhone), no se bloquea nada');

  const noLock = await goFullscreen({ screen: {} }, { requestFullscreen: () => Promise.resolve() });
  assert.equal(noLock.ok, true); assert.equal(noLock.locked, false);

  let unlocked = 0;
  const left = await leaveFullscreen({ screen: { orientation: { unlock: () => { unlocked++; }, lock: () => Promise.reject(new Error()) } }, document: { exitFullscreen: () => Promise.resolve() } });
  assert.equal(unlocked, 1); assert.equal(left.ok, true);
  assert.equal((await lockLandscape({})).ok, false, 'sin screen.orientation no hay error');
});

test('un navegador que no contesta a requestFullscreen no deja el juego colgado', async () => {
  let locked = 0;
  const win = { screen: { orientation: { lock: () => { locked++; return Promise.reject(new Error('x')); } } } };
  const neverSettles = { requestFullscreen: () => new Promise(() => {}) };
  const r = await goFullscreen(win, neverSettles, 25);
  assert.deepEqual(r, { ok: false, reason: 'sin respuesta', locked: false });
  assert.equal(locked, 0, 'sin confirmación de pantalla completa no se bloquea la orientación');
});

test('isFullscreen lee también el prefijo webkit', () => {
  assert.equal(isFullscreen(null), false);
  assert.equal(isFullscreen({ fullscreenElement: { tagName: 'HTML' } }), true);
  assert.equal(isFullscreen({ webkitFullscreenElement: {} }), true);
});

// ---------------------------------------------------------------- PWA
test('el service worker se registra con rutas relativas al despliegue', async () => {
  const { win, doc, calls } = fakeEnv();
  assert.equal(registerServiceWorker(win, doc), true);
  assert.equal(calls.register.length, 1);
  const [url, opts] = calls.register[0];
  assert.match(url, /^https:\/\/example\.github\.io\/tumble-dog\/sw\.js$/, `URL mal resuelta: ${url}`);
  assert.equal(opts.scope, 'https://example.github.io/tumble-dog/');

  // file:// (el HTML de tools/bundle.py) y navegadores sin worker: nada de errores
  const file = fakeEnv({ origin: 'file://', path: '/juego.html' });
  file.win.location = { protocol: 'file:', origin: 'null', href: 'file:///juego.html' };
  assert.equal(registerServiceWorker(file.win, file.doc), false);
  assert.equal(registerServiceWorker({ navigator: {}, location: { protocol: 'https:', href: 'https://x/' } }, null), false);
  assert.equal(registerServiceWorker(undefined, undefined), false);

  // Un registro que revienta (Pages sin el fichero, CSP…) no puede lanzar nada
  const boom = fakeEnv();
  boom.win.navigator.serviceWorker = { register: () => Promise.reject(new Error('403')) };
  assert.equal(registerServiceWorker(boom.win, boom.doc), true, 'el fallo del registro se traga en silencio');
  await flush();
});

test('el aviso de instalar: solo en móvil, solo la primera vez', async () => {
  assert.equal(shouldShowInstallHint({ standalone: false, touch: true, installableOs: true, shown: false }), true);
  assert.equal(shouldShowInstallHint({ standalone: true, touch: true, installableOs: true, shown: false }), false, 'ya está instalado');
  assert.equal(shouldShowInstallHint({ standalone: false, touch: false, installableOs: false, shown: false }), false, 'escritorio: no se habla de instalar');
  assert.equal(shouldShowInstallHint({ standalone: false, touch: true, installableOs: true, shown: true }), false, 'ya se enseñó');
  assert.equal(isInstallableOs({ navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' } }), true);
  assert.equal(isInstallableOs({ navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' } }), false);
  assert.match(installHintText({ navigator: { userAgent: 'iPhone' } }), /Compartir → Añadir a pantalla de inicio/);
  assert.match(installHintText({ navigator: { userAgent: 'Android 14' } }), /Añadir a pantalla de inicio/);
});

test('localStorage: las banderas se leen y escriben sin que el modo privado rompa nada', () => {
  const { win } = fakeEnv();
  assert.equal(flag(win, 'k'), null);
  assert.equal(flag(win, 'k', '1'), '1');
  assert.equal(flag(win, 'k'), '1');
  const broken = { get localStorage() { throw new Error('blanqueo'); } };
  assert.equal(flag(broken, 'k', '1'), null);
  assert.equal(flag(broken, 'k'), null);
});

// ---------------------------------------------------------------- controlador
test('el juego se bloquea y se pausa en vertical, y vuelve al girar', async () => {
  const env = fakeEnv({ portrait: true });
  const game = { state: { state: 'title', paused: false } };
  const audio = { suck(on) { this.calls.push(on); }, calls: [] };
  const m = createMobile({ win: env.win, doc: env.doc, game, audio });
  m.arm();
  assert.equal(m.blocked(), true, 'móvil en vertical: aviso de girar');
  assert.equal(game.state.paused, true, 'y el juego, pausado');
  assert.equal(env.body.classList.contains('rotating'), true);
  const gate = env.body.children.find((c) => c.id === 'rotate');
  assert.ok(gate, 'falta el aviso en el DOM');
  assert.match(gate.innerHTML, /GIRA EL MÓVIL/);
  assert.match(gate.innerHTML, /class="phone"/);

  env.win.innerWidth = 844; env.win.innerHeight = 390;
  env.win.matchMedia = (q) => ({ matches: q === '(pointer: coarse)' });
  m.refresh();
  assert.equal(m.blocked(), false);
  assert.equal(game.state.paused, false);
  assert.equal(env.body.classList.contains('rotating'), false);
});

test('en escritorio no hay aviso, el canvas no se toca y el worker se registra', () => {
  const env = fakeEnv({ portrait: true, touch: false });
  const m = createMobile({ win: env.win, doc: env.doc });
  m.arm();
  assert.equal(m.blocked(), false, 'un navegador de escritorio en vertical no se bloquea');
  assert.equal(m.state().touch, false);
  assert.equal(m.state().sw, true);
  assert.equal(env.calls.register.length, 1);
  assert.equal(env.body.classList.contains('touch'), false);
});

test('el primer toque del título pide pantalla completa; la tecla F entra y sale', async () => {
  const env = fakeEnv({ portrait: false, fullscreen: true, lockWorks: true });
  const m = createMobile({ win: env.win, doc: env.doc });
  m.arm();
  env.win.dispatch('pointerdown', { pointerType: 'touch' });
  await flush();
  assert.equal(env.calls.fullscreen, 1, 'pantalla completa pedida con el prefijo estándar');
  assert.equal(env.calls.lock[0], 'landscape', 'y bloqueo horizontal después');
  assert.equal(m.state().attempts, 1);

  const st = m.state();
  assert.equal(st.pendingFs, false, 'el intento queda cerrado');
  assert.equal(st.landscapeLocked, true, 'el bloqueo horizontal se apunta en el estado');

  // Second tap: nada de pedir pantalla completa otra vez
  env.win.dispatch('pointerdown', { pointerType: 'touch' });
  assert.equal(env.calls.fullscreen, 1);

  // F con la pantalla completa puesta → se sale (y se suelta el bloqueo)
  const fsBtn = env.body.children.find((c) => c.id === 'fsbtn');
  assert.ok(fsBtn, 'falta el botón de pantalla completa');
  env.win.dispatch('keydown', { code: 'KeyF', preventDefault() {} });
  await flush();
  assert.equal(env.calls.unlock, 1);
  assert.equal(env.calls.fullscreen, 1, 'F no vuelve a pedir la pantalla completa: sale de ella');
});

test('en iPhone (sin requestFullscreen) no se muestra ningún error', async () => {
  const env = fakeEnv({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' });
  const doc = { ...env.doc, documentElement: {}, createElement: env.doc.createElement, body: env.doc.body };
  const m = createMobile({ win: env.win, doc });
  m.arm();
  env.win.dispatch('keydown', { code: 'Space', preventDefault() {} });
  await flush();
  const s = m.state();
  assert.equal(s.attempts, 0, 'ni siquiera se intenta: el elemento no lo soporta');
  assert.deepEqual(s.lastFs, { ok: false, reason: 'sin soporte' }, 'queda anotado, sin lanzar nada');
});

test('el aviso de instalación se enseña una vez y se esconde al salir del título', async () => {
  const env = fakeEnv();
  const game = { state: { state: 'title' } };
  const m = createMobile({ win: env.win, doc: env.doc, game });
  m.arm();
  const banner = env.body.children.find((c) => c.id === 'install');
  assert.ok(banner, 'en móvil sin instalar debe salir el aviso');
  assert.match(banner.innerHTML, /Añade|Añadir a pantalla de inicio/);
  assert.equal(env.body.classList.contains('ask-install'), true);
  assert.equal(env.calls.storage.some(([op, k, v]) => op === 'set' && k === 'tumbledog-install-hint' && v === '1'), true, 'se guarda que ya se enseñó');

  game.state.state = 'play';
  m.tick();
  assert.equal(env.body.classList.contains('ask-install'), false);
  assert.equal(env.body.children.find((c) => c.id === 'install'), undefined, 'fuera del título, fuera el aviso');

  // recarga con la bandera guardada: ya no se vuelve a enseñar
  const second = fakeEnv();
  flag(second.win, 'tumbledog-install-hint', '1');
  const m2 = createMobile({ win: second.win, doc: second.doc });
  m2.arm();
  assert.equal(m2.state().hintShown, false);
  assert.equal(second.body.children.find((c) => c.id === 'install'), undefined);
});

test('localStorage roto (modo privado de Safari): el aviso no revienta', () => {
  const env = fakeEnv({ storage: false });
  const m = createMobile({ win: env.win, doc: env.doc });
  assert.doesNotThrow(() => m.arm());
  assert.equal(m.state().hintShown, true);
});

test('el modo ya instalado (standalone) no vuelve a ofrecer instalar', async () => {
  const env = fakeEnv({ standalone: true });
  const m = createMobile({ win: env.win, doc: env.doc });
  m.arm();
  assert.equal(env.body.children.find((c) => c.id === 'install'), undefined);
  assert.equal(isStandalone(env.win), true);
  assert.equal(isFullscreen(env.doc), false);
  env.win.dispatch('pointerdown', { pointerType: 'touch' });
  await flush();
  assert.equal(m.state().attempts, 1, 'instalado: el gesto sigue pudiendo ampliar la ventana, sin ruido');
});

test('beforeinstallprompt de Android guarda el evento y enseña el aviso', () => {
  const env = fakeEnv();
  const m = createMobile({ win: env.win, doc: env.doc });
  m.arm();
  let prevented = 0;
  const ev = { preventDefault: () => prevented++, prompt: () => 'prompt' };
  env.win.dispatch('beforeinstallprompt', ev);
  assert.equal(m.state().installPrompt, true);
  assert.equal(prevented, 1, 'el prompt se guarda para dispararlo desde el aviso');
  assert.equal(env.win.__tumbleDogInstallPrompt, ev);
});

test('set() de prueba fuerza la vertical y el bloqueo sin emulador', () => {
  const env = fakeEnv({ portrait: false, touch: false });
  const game = { state: { state: 'play', paused: false } };
  const m = createMobile({ win: env.win, doc: env.doc, game });
  m.arm();
  assert.equal(m.blocked(), false);
  m.set(true, true);
  assert.equal(m.blocked(), true);
  assert.equal(game.state.paused, true);
  m.set(false, true);
  assert.equal(m.blocked(), false);
});
