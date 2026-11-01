// Arranque: canvas HiDPI, carga de fuentes y sprites, bucle de paso fijo.
import { W, H, CONFIG } from './config.js';
import { createInput, placeTouchpad } from './input.js';
import { createAudio } from './audio.js';
import { loadSprites } from './sprites.js';
import { createGame } from './game.js';
import { FONT } from './fx.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let scale = 1;

function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const css = Math.min(vw / W, vh / H);
  const cw = Math.floor(W * css), ch = Math.floor(H * css);
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  scale = Math.min((cw * dpr) / W, 2);
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
  placeTouchpad();
}
window.addEventListener('resize', resize);
resize();
placeTouchpad();

function loading(k) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = '#140a32'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffe14d'; ctx.font = `64px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('TUMBLE DOG', W / 2, H / 2 - 20);
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
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { last = performance.now(); acc = 0; });
}
boot();
