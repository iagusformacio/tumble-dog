import { SPRITE_FILES } from './sprite-list.js';

const images = new Map();
const tints = new Map();

export function loadSprites(timeoutMs = 8000) {
  const jobs = Object.entries(SPRITE_FILES).map(([name, [src]]) => new Promise((resolve) => {
    if (typeof Image === 'undefined') { resolve(); return; }
    const img = new Image();
    img.onload = () => { images.set(name, img); resolve(); };
    img.onerror = () => resolve();
    img.src = src;
  }));
  return Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, timeoutMs))]);
}

export function spriteSize(name) {
  const f = SPRITE_FILES[name];
  return f ? { w: f[1], h: f[2] } : { w: 0, h: 0 };
}

export function hasSprite(name) { return images.has(name); }

export function spriteImage(name) { return images.get(name); }

function tinted(name, color) {
  const key = name + '|' + color;
  let c = tints.get(key);
  if (c) return c;
  const img = images.get(name);
  if (!img || typeof document === 'undefined') return null;
  c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  tints.set(key, c);
  return c;
}

/**
 * Dibuja anclado abajo-centro en (x, y).
 * o: { s escala, flip, sx/sy squash, rot (rad, sobre el centro), alpha, flash (0..1 blanco), tint color, tintA }
 */
export function drawSprite(ctx, name, x, y, o = {}) {
  const img = images.get(name);
  if (!img) return false;
  const s = o.s ?? 1;
  const w = img.width * s * (o.sx ?? 1);
  const h = img.height * s * (o.sy ?? 1);
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) { ctx.translate(0, -h / 2); ctx.rotate(o.rot); ctx.translate(0, h / 2); }
  if (o.flip) ctx.scale(-1, 1);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.drawImage(img, -w / 2, -h, w, h);
  if (o.tint && o.tintA > 0) {
    const t = tinted(name, o.tint);
    if (t) { ctx.globalAlpha *= o.tintA; ctx.drawImage(t, -w / 2, -h, w, h); }
  }
  if (o.flash > 0) {
    const t = tinted(name, '#ffffff');
    if (t) { ctx.globalAlpha = (o.alpha ?? 1) * o.flash; ctx.drawImage(t, -w / 2, -h, w, h); }
  }
  ctx.restore();
  return true;
}
