import { SPRITE_FILES } from './sprite-list.js';

const images = new Map();
const tints = new Map();

// Mapeo canónico → sprite del tema activo (p. ej. 'presi-idle' → 'marcos-idle').
// Lo fija el tema en curso (game.js llama a setSpriteMap al cambiar de tema);
// por defecto es la identidad y el tema «tumbledog» no se ve afectado.
let nameMap = {};
export function setSpriteMap(m) { nameMap = m || {}; }
export function getSpriteMap() { return nameMap; }
export function spriteName(name) { return nameMap[name] || name; }

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
  const f = SPRITE_FILES[spriteName(name)];
  return f ? { w: f[1], h: f[2] } : { w: 0, h: 0 };
}

export function hasSprite(name) { return images.has(spriteName(name)); }

/** Imagen cargada de un sprite (resolviendo el mapeo del tema), o null. */
export function getSpriteImage(name) { return images.get(spriteName(name)) || null; }

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
  const key = spriteName(name);
  const img = images.get(key);
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
    const t = tinted(key, o.tint);
    if (t) { ctx.globalAlpha *= o.tintA; ctx.drawImage(t, -w / 2, -h, w, h); }
  }
  if (o.flash > 0) {
    const t = tinted(key, '#ffffff');
    if (t) { ctx.globalAlpha = (o.alpha ?? 1) * o.flash; ctx.drawImage(t, -w / 2, -h, w, h); }
  }
  ctx.restore();
  return true;
}

// Solo para herramientas sin navegador (tools/shot.mjs): inyecta imágenes ya
// decodificadas (p. ej. de @napi-rs/canvas) en la caché del juego. En el
// navegador no se usa.
export function __setImagesForNode(source) {
  images.clear();
  for (const [name, img] of source) images.set(name, img);
}
