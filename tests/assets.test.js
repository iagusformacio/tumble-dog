import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  ASSET_MANIFEST,
  createAssetStore,
  createComicEffects,
  drawAnchoredSprite,
  extractCleanSpriteData,
  findPanelInterior,
  isChromaGreen,
  sliceSpriteSheet,
} from '../src/assets.js';
import { createPlayer } from '../src/player.js';
import { createEnemy } from '../src/enemy.js';
import { createEnemyManager } from '../src/enemies.js';
import { createBall } from '../src/ball.js';

function createMemorySurface(width, height, initialRgba = null) {
  let pixels = initialRgba
    ? new Uint8ClampedArray(initialRgba)
    : new Uint8ClampedArray(width * height * 4);
  return {
    width,
    height,
    get pixels() { return pixels; },
    getContext() {
      return {
        drawImage(src) {
          if (src?.pixels) pixels = new Uint8ClampedArray(src.pixels);
        },
        getImageData() {
          return { data: new Uint8ClampedArray(pixels), width, height };
        },
        createImageData(w, h) {
          return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
        },
        putImageData(imgData) {
          pixels = new Uint8ClampedArray(imgData.data);
        },
      };
    },
  };
}

function setPixel(rgba, width, x, y, r, g, b, a = 255) {
  const idx = (y * width + x) * 4;
  rgba[idx] = r;
  rgba[idx + 1] = g;
  rgba[idx + 2] = b;
  rgba[idx + 3] = a;
}

test('todos los PNG declarados en ASSET_MANIFEST existen en el repositorio', () => {
  assert.ok(ASSET_MANIFEST.length >= 6);
  for (const entry of ASSET_MANIFEST) {
    const relPath = entry.src.replace(/^\.\//, '');
    assert.ok(existsSync(relPath), `falta ${relPath} referenciado en ASSET_MANIFEST`);
    assert.equal(entry.poses.length <= entry.cols * entry.rows, true);
  }
});

test('ASSET_MANIFEST registra andar, aspirado y derrotado para los ocho enemigos', () => {
  const posesByGroup = new Map();
  for (const entry of ASSET_MANIFEST) {
    if (!posesByGroup.has(entry.group)) posesByGroup.set(entry.group, new Set());
    for (const pose of entry.poses) posesByGroup.get(entry.group).add(pose);
  }
  for (const group of ['portavoz', 'tertuliano', 'asesor', 'influencer', 'lider', 'baron', 'activista', 'diputado']) {
    const poses = posesByGroup.get(group) ?? new Set();
    for (const pose of ['walkA', 'walkB', 'sucked', 'defeated']) {
      assert.ok(poses.has(pose), `falta ${group}/${pose} en ASSET_MANIFEST`);
    }
  }
});

test('findPanelInterior y extractCleanSpriteData recortan marco de viñeta, chroma #00FF00 y despill', () => {
  const w = 40;
  const h = 40;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      // Margen blanco (0..1) y marco negro de viñeta (2..3) alrededor de fondo #00FF00.
      if (x < 2 || x >= w - 2 || y < 2 || y >= h - 2) {
        setPixel(rgba, w, x, y, 255, 255, 255);
      } else if (x < 4 || x >= w - 4 || y < 4 || y >= h - 4) {
        setPixel(rgba, w, x, y, 0, 0, 0);
      } else {
        setPixel(rgba, w, x, y, 0, 255, 0);
      }
    }
  }
  // Personaje rojo de 6x8 en (15..20, 16..23) + píxel borde con spill verdoso en (14, 16).
  for (let y = 16; y <= 23; y += 1) {
    for (let x = 15; x <= 20; x += 1) {
      setPixel(rgba, w, x, y, 210, 40, 40);
    }
  }
  setPixel(rgba, w, 14, 16, 10, 120, 10);

  assert.equal(isChromaGreen(0, 255, 0), true);
  assert.equal(isChromaGreen(240, 200, 160), false);

  const interior = findPanelInterior(rgba, w, 0, 0, w, h);
  assert.equal(interior.x, 4);
  assert.equal(interior.y, 4);
  assert.equal(interior.width, 32);
  assert.equal(interior.height, 32);

  const sprite = extractCleanSpriteData(rgba, w, interior);
  assert.ok(sprite);
  assert.equal(sprite.width, 7); // x=14..20
  assert.equal(sprite.height, 8); // y=16..23
  // El píxel (0,0) del recorte corresponde a (14,16): despill elimina el tinte verde.
  assert.equal(sprite.data[1], 10);
  assert.ok(sprite.data[3] > 0 && sprite.data[3] < 255);
});

test('createAssetStore trocea hojas multi-pose y degrada limpio ante errores o canvas bloqueado', async () => {
  const sheetW = 20;
  const sheetH = 10;
  const rgba = new Uint8ClampedArray(sheetW * sheetH * 4);
  for (let i = 0; i < sheetW * sheetH; i += 1) {
    rgba[i * 4 + 1] = 255;
    rgba[i * 4 + 3] = 255;
  }
  // Celda 0 (x=0..9): bloque azul de 3x4; Celda 1 (x=10..19): bloque amarillo de 4x5.
  for (let y = 3; y < 7; y += 1) {
    for (let x = 3; x < 6; x += 1) setPixel(rgba, sheetW, x, y, 30, 60, 200);
  }
  for (let y = 2; y < 7; y += 1) {
    for (let x = 13; x < 17; x += 1) setPixel(rgba, sheetW, x, y, 240, 200, 20);
  }

  const fakeImages = [];
  const store = createAssetStore({
    manifest: [
      { group: 'hero', src: './ok.png', cols: 2, rows: 1, poses: ['idle', 'walkA'] },
      { group: 'missing', src: './fail.png', cols: 1, rows: 1, poses: ['idle'] },
    ],
    imageFactory: () => {
      const img = { width: sheetW, height: sheetH, pixels: rgba, onload: null, onerror: null };
      fakeImages.push(img);
      return img;
    },
    surfaceFactory: (w, h) => createMemorySurface(w, h),
  });

  const promise = store.loadAll();
  fakeImages[0].onload();
  fakeImages[1].onerror();
  await promise;

  assert.equal(store.ready, true);
  assert.equal(store.getSprite('hero', 'idle').width, 3);
  assert.equal(store.getSprite('hero', 'walkA').width, 4);
  assert.equal(store.getSprite('missing', 'idle'), null);

  // Si getImageData lanza SecurityError (p. ej. file://), devuelve mapa vacío sin excepción.
  const tainted = sliceSpriteSheet(
    { width: 10, height: 10 },
    {
      surfaceFactory: () => ({
        getContext: () => ({
          drawImage() {},
          getImageData() { throw new Error('SecurityError'); },
        }),
      }),
    },
  );
  assert.equal(tainted.size, 0);
});

test('Don Presi y los enemigos usan drawImage cuando hay sprite cargado', () => {
  const fakeSprite = { image: { tag: 'png' }, width: 20, height: 24 };
  const fakeAssets = {
    getSprite(group, pose) {
      if (group === 'donPresi' || group === 'portavoz') return { ...fakeSprite, pose };
      return null;
    },
  };

  let drawn = [];
  const ctx = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    rotate() {},
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    drawImage(img, x, y, w, h) { drawn.push({ img, x, y, w, h }); },
  };

  const player = createPlayer({ assets: fakeAssets });
  player.update(1 / 60, {});
  assert.equal(player.pose, 'idle');
  player.update(1 / 60, { jump: true });
  assert.equal(player.pose, 'jump');
  player.update(1 / 60, { throw: true });
  assert.equal(player.pose, 'throw');
  player.render(ctx, 1);
  assert.equal(drawn.length, 1);

  const enemy = createEnemy({ assets: fakeAssets });
  enemy.render(ctx, 1);
  enemy.crush();
  enemy.render(ctx, 1);
  assert.equal(drawn.length, 3);
  assert.equal(drawAnchoredSprite({}, null, { x: 0, y: 0, bodyWidth: 16, bodyHeight: 24 }), false);
});

test('onomatopeyas estilo tebeo saltan al aspirar, lanzar y aplastar, y caducan solas', () => {
  const effects = createComicEffects();
  const manager = createEnemyManager({ effects });
  const player = createPlayer();
  const enemy = manager.enemies[0];

  player.body.x = enemy.body.x - 18;
  player.body.y = enemy.body.y + 2;
  player.update(1 / 60, { suck: true });
  manager.update(1 / 60, player, { suck: true });
  assert.ok(effects.bursts.some((b) => b.text.includes('GLUP')));

  const ball = manager.launchBall(player);
  assert.ok(ball);
  assert.ok(effects.bursts.some((b) => b.text.includes('ZAS')));

  const killerBall = createBall({ x: enemy.body.x - 1, y: enemy.body.y, direction: 1 });
  manager.update(1 / 60, player, {}, killerBall);
  assert.ok(effects.bursts.some((b) => b.text.includes('PAF')));

  let textsDrawn = 0;
  const ctx = {
    globalAlpha: 1,
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    fillText() { textsDrawn += 1; },
  };
  effects.render(ctx);
  assert.ok(textsDrawn >= 6);

  effects.update(2);
  assert.equal(effects.bursts.length, 0);
});
