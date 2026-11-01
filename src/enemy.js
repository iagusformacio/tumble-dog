import { CONFIG } from './config.js';
import { DEFAULT_PLATFORMS, overlaps } from './physics.js';
import { drawAnchoredSprite, getSharedAssets } from './assets.js';

/**
 * Enemigos inventados de Tumble Dog. T06 trae a La Portavoz Airada y T10
 * integra las hojas de sprites de assets/enemigos/ con fallback por código.
 * Estados: 'patrol' (libre), 'sucked' (dentro de Don Presi),
 * 'stunned' (se ha escapado) y 'defeated' (aplastada por la bola, T07).
 */
const TIPO = 'portavoz';

function plataformaDeApoyo(platforms, x, y) {
  let mejor = null;
  for (const platform of platforms) {
    const encima = x >= platform.x - 0.01 && x <= platform.x + platform.width + 0.01 &&
      Math.abs(y + CONFIG.enemy[TIPO].height - platform.y) < 1.5;
    if (!encima) continue;
    if (!mejor || platform.y < mejor.y) mejor = platform;
  }
  return mejor;
}

export function createEnemy({
  type = TIPO,
  x = 40,
  y = 136,
  platforms = DEFAULT_PLATFORMS,
  speed = CONFIG.enemy[type]?.speed ?? CONFIG.enemy.portavoz.speed,
  direction = 1,
  assets = getSharedAssets(),
} = {}) {
  const size = CONFIG.enemy[type] ?? CONFIG.enemy.portavoz;
  const body = { x, y, width: size.width, height: size.height };
  let dir = direction < 0 ? -1 : 1;
  let state = 'patrol';
  let pauseLeft = 0;
  let elapsed = 0;
  let containLeft = 0;   // segundos que lleva aspirado
  let stunLeft = 0;      // segundos mareado tras escaparse
  let previousX = x;
  let previousY = y;
  let wobble = 0;

  /** Plataforma sobre la que patrulla: la primera que lo sostiene. */
  const soporte = plataformaDeApoyo(platforms, x, y);
  const left = soporte ? soporte.x : 0;
  const right = soporte ? soporte.x + soporte.width : CONFIG.screen.width;

  function currentPose() {
    if (state === 'defeated') return 'defeated';
    if (state === 'sucked' || state === 'stunned') return 'sucked';
    if (pauseLeft > 0) return 'walkA';
    return Math.floor(wobble * 8) % 2 === 0 ? 'walkA' : 'walkB';
  }

  function update(dt, { player } = {}) {
    previousX = body.x;
    previousY = body.y;
    elapsed += dt;
    wobble += dt;

    if (state === 'sucked') {
      containLeft -= dt;
      if (containLeft <= 0 && player) {
        escapeFrom(player);
      }
      return;
    }

    if (state === 'stunned') {
      stunLeft -= dt;
      if (stunLeft <= 0) state = 'patrol';
      return;
    }

    if (state === 'defeated') {
      return;
    }

    if (pauseLeft > 0) {
      pauseLeft -= dt;
      return;
    }

    body.x += dir * speed * dt;
    const margenIzq = left + 2;
    const margenDer = right - body.width - 2;
    if (body.x <= margenIzq) { body.x = margenIzq; dir = 1; pauseLeft = size.turnPauseSeconds; }
    if (body.x >= margenDer) { body.x = margenDer; dir = -1; pauseLeft = size.turnPauseSeconds; }
  }

  function escapeFrom(player) {
    state = 'stunned';
    stunLeft = CONFIG.suck.escapeStunSeconds;
    containLeft = 0;
    const p = player.body;
    body.x = p.x + (player.facing >= 0 ? p.width + 2 : -body.width - 2);
    body.x = Math.max(0, Math.min(CONFIG.screen.width - body.width, body.x));
    body.y = p.y;
    dir = player.facing >= 0 ? 1 : -1;
  }

  /** La mete en la boquilla: deja de patrullar y cuenta atrás para escaparse. */
  function suck() {
    if (state !== 'patrol') return false;
    state = 'sucked';
    containLeft = CONFIG.suck.escapeSeconds;
    return true;
  }

  /** La saca de Don Presi (al lanzar la bola). Devuelve false si no estaba dentro. */
  function release() {
    if (state !== 'sucked') return false;
    state = 'patrol';
    containLeft = 0;
    return true;
  }

  /** La aplasta la bola lanzada (T07). Vale desde 'patrol' y 'stunned'. */
  function crush() {
    if (state !== 'patrol' && state !== 'stunned') return false;
    state = 'defeated';
    return true;
  }

  function canBeSucked() { return state === 'patrol'; }
  function isContained() { return state === 'sucked'; }
  function isDangerous() { return state === 'patrol'; }
  function isDefeated() { return state === 'defeated'; }

  function drawBody(ctx, alpha = 1, { atOrigin = false } = {}) {
    const x = atOrigin ? -body.width / 2 : previousX + (body.x - previousX) * alpha;
    const y = atOrigin ? -body.height / 2 : previousY + (body.y - previousY) * alpha;
    const bob = atOrigin || state === 'stunned' ? 0 : Math.sin(wobble * 6) * 0.6;
    const tilt = state === 'stunned' ? Math.sin(wobble * 18) * 0.12 : 0;
    const pose = currentPose();
    const sprite = assets?.getSprite(type, pose) ?? assets?.getSprite(type, 'walkA') ?? null;

    if (drawAnchoredSprite(ctx, sprite, {
      x,
      y: y + bob,
      bodyWidth: body.width,
      bodyHeight: body.height,
      targetHeight: body.height + 3,
      facing: atOrigin ? 1 : dir,
      rotation: tilt,
    })) {
      return;
    }

    ctx.save();
    ctx.translate(x + body.width / 2, y + body.height / 2 + bob);
    if (tilt) ctx.rotate(tilt);
    if (!atOrigin) ctx.scale(dir, 1);
    drawPortavoz(ctx, body.width, body.height);
    ctx.restore();
  }

  function render(ctx, alpha = 1) {
    if (state === 'sucked') return;
    if (state === 'defeated') {
      const x = previousX + (body.x - previousX) * alpha;
      const y = previousY + (body.y - previousY) * alpha;
      const defeatedSprite = assets?.getSprite(type, 'defeated') ?? null;
      if (drawAnchoredSprite(ctx, defeatedSprite, {
        x,
        y,
        bodyWidth: body.width,
        bodyHeight: body.height,
        targetHeight: 16,
        facing: dir,
      })) {
        return;
      }
      ctx.save();
      ctx.translate(x + body.width / 2, y + body.height);
      ctx.scale(1.35, 0.22);
      ctx.translate(0, -body.height / 2);
      drawPortavoz(ctx, body.width, body.height);
      ctx.restore();
      return;
    }
    drawBody(ctx, alpha);
  }

  return {
    type, body, update, render, drawBody, suck, release, crush,
    canBeSucked, isContained, isDangerous, isDefeated,
    get state() { return state; },
    get pose() { return currentPose(); },
    get direction() { return dir; },
    get containedSeconds() { return state === 'sucked' ? containLeft : 0; },
  };
}

/** Dibujo estilo tebeo por código (con contorno negro) si aún no hay PNG cargado. */
function drawPortavoz(ctx, width, height) {
  const w = width / 2;
  const h = height / 2;
  ctx.fillStyle = '#111';
  ctx.fillRect(-w + 1, -h, width - 2, height);
  ctx.fillStyle = '#b03a63';
  ctx.fillRect(-w + 2, -h + 12, width - 4, height - 13);
  ctx.fillStyle = '#f0c8a0';
  ctx.fillRect(-w + 3, -h + 2, width - 6, 10);
  ctx.fillStyle = '#3a2634';
  ctx.fillRect(-w + 2, -h + 1, width - 4, 4);
  ctx.fillRect(-w + 1, -h + 3, 3, 8);
  ctx.fillStyle = '#111';
  ctx.fillRect(w - 7, -h + 6, 2, 2);
  ctx.fillRect(w - 4, -h + 5, 2, 2);
  ctx.fillRect(w - 6, -h + 9, 4, 1);
  ctx.fillStyle = '#f0c8a0';
  ctx.fillRect(w, -h + 10, 4, 2);
}
