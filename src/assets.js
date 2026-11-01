/**
 * Carga y procesado de hojas de sprites estilo tebeo (T10) + onomatopeyas.
 * - Recorta automáticamente marcos de viñeta y fondo verde chroma (#00FF00) una sola vez al cargar.
 * - Elimina el halo verdoso (despill) en los bordes del trazo negro y ajusta al bounding box.
 * - Si los PNG aún están cargando, o en tests de Node / HTML empaquetado sin carpeta assets/,
 *   devuelve null sin errores para que el juego use el dibujo provisional por código.
 */

export const ASSET_MANIFEST = Object.freeze([
  Object.freeze({
    group: 'donPresi',
    src: './assets/personajes/don-presi-hoja-poses.png',
    cols: 5,
    rows: 2,
    poses: Object.freeze([
      'idle', 'walkA', 'walkB', 'jump', 'fall',
      'suck', 'throw', 'stunned', 'victory', 'intro',
    ]),
  }),
  Object.freeze({
    group: 'portavoz',
    src: './assets/enemigos/portavoz-airada-poses.png',
    cols: 3,
    rows: 1,
    poses: Object.freeze(['walkA', 'walkB', 'sucked']),
  }),
  Object.freeze({
    group: 'portavoz',
    src: './assets/enemigos/portavoz-airada-derrotada.png',
    cols: 1,
    rows: 1,
    poses: Object.freeze(['defeated']),
  }),
  Object.freeze({
    group: 'tertuliano',
    src: './assets/enemigos/tertuliano-poses.png',
    cols: 3,
    rows: 1,
    poses: Object.freeze(['walkA', 'walkB', 'sucked']),
  }),
  Object.freeze({
    group: 'tertuliano',
    src: './assets/enemigos/tertuliano-derrotada.png',
    cols: 1,
    rows: 1,
    poses: Object.freeze(['defeated']),
  }),
  Object.freeze({
    group: 'tertuliano',
    src: './assets/enemigos/tertuliano-bulos.png',
    cols: 1,
    rows: 1,
    poses: Object.freeze(['special']),
  }),
  Object.freeze({
    group: 'asesor',
    src: './assets/enemigos/asesor-misterioso-poses.png',
    cols: 3,
    rows: 1,
    poses: Object.freeze(['walkA', 'walkB', 'sucked']),
  }),
  Object.freeze({
    group: 'asesor',
    src: './assets/enemigos/asesor-misterioso-derrotada.png',
    cols: 1,
    rows: 1,
    poses: Object.freeze(['defeated']),
  }),
  Object.freeze({
    group: 'influencer',
    src: './assets/enemigos/influencer-bulero-poses.png',
    cols: 3,
    rows: 1,
    poses: Object.freeze(['walkA', 'walkB', 'sucked']),
  }),
  Object.freeze({
    group: 'influencer',
    src: './assets/enemigos/influencer-bulero-derrotada.png',
    cols: 1,
    rows: 1,
    poses: Object.freeze(['defeated']),
  }),
  Object.freeze({
    group: 'influencer',
    src: './assets/enemigos/influencer-ringlight.png',
    cols: 1,
    rows: 1,
    poses: Object.freeze(['special']),
  }),
]);

export function isChromaGreen(r, g, b) {
  return g >= 145 && g - Math.max(r, b) >= 65;
}

/**
 * En tiras de viñetas (ART-2/3), cada celda puede traer margen blanco y marco negro
 * alrededor del fondo #00FF00. Escaneamos desde los 4 lados hasta entrar en el chroma.
 */
export function findPanelInterior(rgba, sheetWidth, cellX, cellY, cellWidth, cellHeight) {
  const maxInsetX = Math.min(28, Math.floor(cellWidth * 0.12));
  const maxInsetY = Math.min(28, Math.floor(cellHeight * 0.12));

  function rowGreenRatio(y) {
    const startX = cellX + Math.floor(cellWidth * 0.1);
    const endX = cellX + Math.max(1, Math.ceil(cellWidth * 0.9));
    let green = 0;
    let count = 0;
    for (let x = startX; x < endX; x += 2) {
      const idx = (y * sheetWidth + x) * 4;
      if (rgba[idx + 3] === 0 || isChromaGreen(rgba[idx], rgba[idx + 1], rgba[idx + 2])) {
        green += 1;
      }
      count += 1;
    }
    return count > 0 ? green / count : 0;
  }

  function colGreenRatio(x) {
    const startY = cellY + Math.floor(cellHeight * 0.1);
    const endY = cellY + Math.max(1, Math.ceil(cellHeight * 0.9));
    let green = 0;
    let count = 0;
    for (let y = startY; y < endY; y += 2) {
      const idx = (y * sheetWidth + x) * 4;
      if (rgba[idx + 3] === 0 || isChromaGreen(rgba[idx], rgba[idx + 1], rgba[idx + 2])) {
        green += 1;
      }
      count += 1;
    }
    return count > 0 ? green / count : 0;
  }

  let top = 0;
  while (top < maxInsetY && rowGreenRatio(cellY + top) < 0.55) top += 1;
  if (top >= maxInsetY && rowGreenRatio(cellY + top) < 0.55) top = 0;

  let bottom = 0;
  while (bottom < maxInsetY && rowGreenRatio(cellY + cellHeight - 1 - bottom) < 0.55) bottom += 1;
  if (bottom >= maxInsetY && rowGreenRatio(cellY + cellHeight - 1 - bottom) < 0.55) bottom = 0;

  let left = 0;
  while (left < maxInsetX && colGreenRatio(cellX + left) < 0.55) left += 1;
  if (left >= maxInsetX && colGreenRatio(cellX + left) < 0.55) left = 0;

  let right = 0;
  while (right < maxInsetX && colGreenRatio(cellX + cellWidth - 1 - right) < 0.55) right += 1;
  if (right >= maxInsetX && colGreenRatio(cellX + cellWidth - 1 - right) < 0.55) right = 0;

  return {
    x: cellX + left,
    y: cellY + top,
    width: Math.max(1, cellWidth - left - right),
    height: Math.max(1, cellHeight - top - bottom),
  };
}

/**
 * Recorta el fondo #00FF00, corrige el halo verde de antialiasing sobre el trazo negro
 * y devuelve el sub-rectángulo ajustado al contenido opaco.
 */
export function extractCleanSpriteData(rgba, sheetWidth, region) {
  const { x: rx, y: ry, width: rw, height: rh } = region;
  const cleaned = new Uint8ClampedArray(rw * rh * 4);
  let minX = rw;
  let minY = rh;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < rh; y += 1) {
    for (let x = 0; x < rw; x += 1) {
      const src = ((ry + y) * sheetWidth + (rx + x)) * 4;
      const dst = (y * rw + x) * 4;
      const r = rgba[src];
      const g = rgba[src + 1];
      const b = rgba[src + 2];
      const a = rgba[src + 3];

      if (a === 0 || isChromaGreen(r, g, b)) {
        cleaned[dst + 3] = 0;
        continue;
      }

      let outG = g;
      let outA = a;
      const base = Math.max(r, b);
      if (g > base + 28) {
        const spill = (g - base) / Math.max(1, 255 - base);
        outG = base;
        outA = Math.max(0, Math.round(a * (1 - spill)));
      }

      cleaned[dst] = r;
      cleaned[dst + 1] = outG;
      cleaned[dst + 2] = b;
      cleaned[dst + 3] = outA;

      if (outA > 16) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const cropped = new Uint8ClampedArray(cropW * cropH * 4);
  for (let y = 0; y < cropH; y += 1) {
    const srcStart = ((minY + y) * rw + minX) * 4;
    cropped.set(cleaned.subarray(srcStart, srcStart + cropW * 4), y * cropW * 4);
  }

  return { width: cropW, height: cropH, data: cropped };
}

function createSpriteSurface(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  }
  return null;
}

export function sliceSpriteSheet(
  imageSource,
  { cols = 1, rows = 1, poses = ['default'], surfaceFactory = createSpriteSurface } = {},
) {
  const imgW = imageSource?.naturalWidth || imageSource?.width || 0;
  const imgH = imageSource?.naturalHeight || imageSource?.height || 0;
  if (!(imgW > 0) || !(imgH > 0)) return new Map();

  const scratch = surfaceFactory(imgW, imgH);
  if (!scratch) return new Map();
  const scratchCtx = scratch.getContext('2d');
  if (!scratchCtx) return new Map();

  let sheetData;
  try {
    scratchCtx.drawImage(imageSource, 0, 0);
    sheetData = scratchCtx.getImageData(0, 0, imgW, imgH).data;
  } catch {
    // Si se abre por file:// y el navegador bloquea getImageData, usar fallback sin romper.
    return new Map();
  }

  const cellW = Math.floor(imgW / cols);
  const cellH = Math.floor(imgH / rows);
  const result = new Map();

  for (let index = 0; index < poses.length; index += 1) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    if (row >= rows) break;

    const interior = findPanelInterior(sheetData, imgW, col * cellW, row * cellH, cellW, cellH);
    const extracted = extractCleanSpriteData(sheetData, imgW, interior);
    if (!extracted) continue;

    const tile = surfaceFactory(extracted.width, extracted.height);
    if (!tile) continue;
    const tileCtx = tile.getContext('2d');
    if (!tileCtx) continue;

    if (typeof tileCtx.createImageData === 'function') {
      const imgData = tileCtx.createImageData(extracted.width, extracted.height);
      imgData.data.set(extracted.data);
      tileCtx.putImageData(imgData, 0, 0);
    } else if (typeof ImageData !== 'undefined') {
      tileCtx.putImageData(new ImageData(extracted.data, extracted.width, extracted.height), 0, 0);
    } else {
      continue;
    }

    result.set(poses[index], Object.freeze({
      image: tile,
      width: extracted.width,
      height: extracted.height,
    }));
  }

  return result;
}

function defaultImageFactory() {
  return typeof Image !== 'undefined' ? new Image() : null;
}

export function createAssetStore({
  manifest = ASSET_MANIFEST,
  imageFactory = defaultImageFactory,
  surfaceFactory = createSpriteSurface,
} = {}) {
  const groups = new Map();
  let pending = 0;
  let loadedCount = 0;
  let started = false;

  function ensureGroup(name) {
    if (!groups.has(name)) groups.set(name, new Map());
    return groups.get(name);
  }

  function registerSheet(entry) {
    const img = imageFactory();
    if (!img) return Promise.resolve(false);
    pending += 1;

    return new Promise((resolve) => {
      img.onload = () => {
        const sliced = sliceSpriteSheet(img, {
          cols: entry.cols,
          rows: entry.rows,
          poses: entry.poses,
          surfaceFactory,
        });
        const target = ensureGroup(entry.group);
        for (const [pose, sprite] of sliced) {
          target.set(pose, sprite);
        }
        pending = Math.max(0, pending - 1);
        loadedCount += 1;
        resolve(sliced.size > 0);
      };
      img.onerror = () => {
        pending = Math.max(0, pending - 1);
        resolve(false);
      };
      img.src = entry.src;
    });
  }

  function loadAll() {
    if (started) return Promise.resolve();
    started = true;
    return Promise.all(manifest.map((entry) => registerSheet(entry))).then(() => undefined);
  }

  function getSprite(group, pose) {
    return groups.get(group)?.get(pose) ?? null;
  }

  return {
    loadAll,
    registerSheet,
    getSprite,
    get ready() { return started && pending === 0 && loadedCount > 0; },
    get loadedCount() { return loadedCount; },
  };
}

let sharedAssetStore = null;

export function getSharedAssets() {
  if (!sharedAssetStore) {
    sharedAssetStore = createAssetStore();
    if (typeof Image !== 'undefined') {
      sharedAssetStore.loadAll();
    }
  }
  return sharedAssetStore;
}

/**
 * Dibuja un sprite recortado apoyando sus pies en (x + bodyWidth/2, y + bodyHeight)
 * y conservando su proporción original. Devuelve false si aún no está cargado.
 */
export function drawAnchoredSprite(
  ctx,
  sprite,
  {
    x,
    y,
    bodyWidth,
    bodyHeight,
    targetHeight = bodyHeight,
    facing = 1,
    rotation = 0,
  },
) {
  if (!sprite || typeof ctx?.drawImage !== 'function') return false;
  const drawH = targetHeight;
  const drawW = (sprite.width / sprite.height) * drawH;
  ctx.save();
  ctx.translate(x + bodyWidth / 2, y + bodyHeight);
  if (rotation) {
    ctx.translate(0, -drawH / 2);
    ctx.rotate(rotation);
    ctx.translate(0, drawH / 2);
  }
  ctx.scale(facing >= 0 ? 1 : -1, 1);
  ctx.drawImage(sprite.image, -drawW / 2, -drawH, drawW, drawH);
  ctx.restore();
  return true;
}

/**
 * Onomatopeyas de tebeo clásico español («¡PAF!», «¡ZAS!», «¡PUM!», «¡GLUP!»).
 * Globos estrellados ligeros en Canvas 2D sin coste de memoria.
 */
export function createComicEffects({ maxBursts = 8 } = {}) {
  const bursts = [];

  function spawn(x, y, text, { fill = '#ffe44d', accent = '#d93829', duration = 0.52 } = {}) {
    if (bursts.length >= maxBursts) bursts.shift();
    bursts.push({
      x,
      y,
      text,
      fill,
      accent,
      age: 0,
      duration,
      tilt: ((bursts.length % 3) - 1) * 0.14,
    });
  }

  function update(dt) {
    for (let i = bursts.length - 1; i >= 0; i -= 1) {
      bursts[i].age += dt;
      bursts[i].y -= dt * 14;
      if (bursts[i].age >= bursts[i].duration) {
        bursts.splice(i, 1);
      }
    }
  }

  function render(ctx) {
    if (!bursts.length) return;
    if (typeof ctx?.beginPath !== 'function' || typeof ctx?.fillText !== 'function') return;

    for (const b of bursts) {
      const progress = b.age / b.duration;
      const pop = progress < 0.18 ? 0.6 + (progress / 0.18) * 0.5 : 1.1 - progress * 0.25;
      const alpha = progress > 0.65 ? Math.max(0, 1 - (progress - 0.65) / 0.35) : 1;
      const spikes = 10;
      const outerR = Math.max(12, b.text.length * 2.9);
      const innerR = outerR * 0.64;

      ctx.save();
      if ('globalAlpha' in ctx) ctx.globalAlpha = alpha;
      ctx.translate(b.x, b.y);
      ctx.rotate(b.tilt);
      ctx.scale(pop, pop);

      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i += 1) {
        const angle = (i * Math.PI) / spikes;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r * 0.68;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      if (typeof ctx.closePath === 'function') ctx.closePath();
      ctx.fillStyle = b.fill;
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      if ('textBaseline' in ctx) ctx.textBaseline = 'middle';
      ctx.fillStyle = '#111';
      ctx.fillText(b.text, 0.7, 0.7);
      ctx.fillStyle = b.accent;
      ctx.fillText(b.text, 0, 0);
      ctx.restore();
    }
  }

  return {
    bursts,
    spawn,
    update,
    render,
  };
}
