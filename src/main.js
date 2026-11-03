// Arranque: canvas HiDPI, carga de fuentes y sprites, bucle de paso fijo.
import { W, H, CONFIG } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSprites } from './sprites.js';
import { createGame } from './game.js';
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

function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const css = Math.min(vw / W, vh / H);
  const cw = Math.floor(W * css), ch = Math.floor(H * css);
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  frame.style.width = cw + 'px'; frame.style.height = ch + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  scale = Math.min((cw * dpr) / W, 2);
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
}
window.addEventListener('resize', resize);
resize();

function loading(k) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = '#140a32'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffe14d'; ctx.font = `64px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(THEME.title, W / 2, H / 2 - 36);
  ctx.fillStyle = '#fff'; ctx.font = `28px ${FONT}`; ctx.fillText(t('ui.loading'), W / 2, H / 2 + 4);
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(W / 2 - 200, H / 2 + 20, 400, 14);
  ctx.fillStyle = '#ff4fa3'; ctx.fillRect(W / 2 - 200, H / 2 + 20, 400 * k, 14);
}

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
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    let n = 0;
    while (acc >= step && n < 24) { game.update(step); acc -= step; n++; }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    game.render(ctx);
    languageSelector.hidden = game.state.state !== 'title';
    const title = (listThemes()[game.state.gameSel]?.theme || THEME).title;
    if (document.title.split(' · ')[0] !== title) refreshLanguage();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { last = performance.now(); acc = 0; });
}
boot();
