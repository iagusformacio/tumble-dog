// Arranque: canvas HiDPI, carga de fuentes y sprites, bucle de paso fijo
// y capa de móvil (pantalla completa, aviso de girar y service worker).
import { W, H, CONFIG } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSprites } from './sprites.js';
import { createGame } from './game.js';
import { createMobile } from './mobile.js';
import { FONT } from './fx.js';
import { THEME } from './themes/tumbledog.js';
import { initLanguage, setLanguage, getLanguage, onLanguageChange, t } from './i18n/index.js';
import { listThemes } from './themes/index.js';

initLanguage(window);
const canvas = document.getElementById('game');
const frame = document.getElementById('game-frame');
const languageSelector = document.getElementById('language-selector');
const languageButtons = [...languageSelector.querySelectorAll('button')];
const ctx = canvas.getContext('2d');
let scale = 1;

// Caja útil: la ventana (visualViewport si existe, que es la que se entera de la
// barra del navegador en iOS) menos los márgenes del body, que ya descuentan los
// safe-area-inset-*. Así el canvas ocupa toda la pantalla posible sin meterse
// bajo el notch ni bajo los bordes redondeados.
function safeBox() {
  const vp = window.visualViewport;
  let w = Math.round((vp && vp.width) || window.innerWidth || W);
  let h = Math.round((vp && vp.height) || window.innerHeight || H);
  try {
    const cs = window.getComputedStyle(document.body);
    const px = (k) => Number.parseFloat(cs[k]) || 0;
    w -= px('paddingLeft') + px('paddingRight');
    h -= px('paddingTop') + px('paddingBottom');
  } catch { /* sin CSS calculado */ }
  return { w: Math.max(160, w), h: Math.max(90, h) };
}

function resize() {
  const { w: vw, h: vh } = safeBox();
  const css = Math.min(vw / W, vh / H);
  const cw = Math.floor(W * css), ch = Math.floor(H * css);
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  frame.style.width = cw + 'px'; frame.style.height = ch + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  scale = Math.min((cw * dpr) / W, 2);
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
}
// Girar el móvil, entrar/salir de la pantalla completa o cambiar el tamaño de la
// ventana (y la barra de direcciones de iOS) vuelven a calcular el lienzo.
for (const ev of ['resize', 'orientationchange', 'fullscreenchange', 'webkitfullscreenchange']) {
  window.addEventListener(ev, resize);
}
if (window.visualViewport && window.visualViewport.addEventListener) window.visualViewport.addEventListener('resize', resize);
resize();

function loading(k) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = '#140a32'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffe14d'; ctx.font = `64px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(THEME.title, W / 2, H / 2 - 36);
  ctx.fillStyle = '#fff'; ctx.font = `28px ${FONT}`; ctx.fillText(t('ui.loading'), W / 2, H / 2 + 4);
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(W / 2 - 200, H / 2 + 20, 400, 14);
  ctx.fillStyle = '#ff4fa3'; ctx.fillRect(W / 2 - 200, H / 2 + 20, 400 * k, 14);
}

// El móvil manda: pantalla completa al primer toque del título, tecla F para
// entrar y salir, bloqueo de orientación y el aviso «gira el móvil».
const mobile = createMobile();
mobile.arm();

async function boot() {
  loading(0.1);
  const fonts = document.fonts ? Promise.race([document.fonts.load(`40px ${FONT}`).catch(() => {}), new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
  await Promise.all([loadSprites(), fonts]);
  loading(1);
  const input = createInput(window);
  const audio = createAudio();
  const game = createGame({ input, audio });
  window.__tumbleDog = game.debug;
  window.__tumbleDogAudio = audio; // comprobar en el navegador qué suena (issue #95)
  window.__tumbleDogMobile = mobile; // estado de pantalla completa/orientación (issue #105)
  mobile.attach({ game, audio });
  window.__tumbleDogLanguage = { get: getLanguage, set: setLanguage };
  const refreshLanguage = () => {
    const theme = listThemes()[game.state.gameSel]?.theme || THEME;
    document.title = theme.title + ' · ' + theme.tagline;
    canvas.setAttribute('aria-label', theme.title);
    document.getElementById('game-help').textContent = t('ui.canvasHelp');
    languageSelector.setAttribute('aria-label', t('ui.language') + ' · ' + t('ui.languageHint'));
    for (const button of languageButtons) {
      const lang = button.dataset.language;
      button.textContent = t(lang === 'es' ? 'ui.castellano' : 'ui.valencia');
      button.setAttribute('aria-pressed', String(lang === getLanguage()));
      button.setAttribute('aria-label', button.textContent);
      button.lang = lang === 'es' ? 'es' : 'ca-ES-valencia';
    }
  };
  onLanguageChange(refreshLanguage);
  for (const button of languageButtons) {
    button.addEventListener('pointerdown', (e) => e.stopPropagation());
    button.addEventListener('click', (e) => { e.stopPropagation(); setLanguage(button.dataset.language); audio.unlock(); });
  }
  refreshLanguage();
  let last = performance.now(), acc = 0;
  const step = CONFIG.step;
  function frame(now) {
    mobile.tick();
    const blocked = mobile.blocked(); // móvil en vertical: el juego espera girado
    // El lienzo se ve en la pantalla del título mientras gira (y el HUD no tapa).
    if (blocked) input.takeAny(); // lo que se toque con el aviso delante no inicia la partida
    acc += blocked ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    let n = 0;
    if (!blocked) { while (acc >= step && n < 24) { game.update(step); acc -= step; n++; } }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    game.render(ctx);
    languageSelector.hidden = game.state.state !== 'title';
    const title = (listThemes()[game.state.gameSel]?.theme || THEME).title;
    if (document.title.split(' · ')[0] !== title) refreshLanguage();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { last = performance.now(); acc = 0; mobile.refresh(); });
}
boot();
