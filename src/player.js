// Don Presi: corre, salta, atraviesa plataformas, aspira enemigos y los lanza en bola.
import { CONFIG, W, FLOOR_Y } from './config.js';
import { stepBody } from './physics.js';
import { approach, clamp } from './util.js';
import { drawSprite, hasSprite } from './sprites.js';
import { skin } from './skin.js';

const C = CONFIG.player;

export function createPlayer() {
  return {
    x: W / 2 - C.w / 2, y: FLOOR_Y - C.h, w: C.w, h: C.h, vx: 0, vy: 0, facing: 1,
    onGround: true, coyote: 0, buffer: 0, drop: 0, alive: true, respawn: 0, invul: 0, hurtT: 0,
    sucking: false, suckT: 0, held: [], heldT: 0, throwT: 0, anim: 0, sx: 1, sy: 1,
    speedUp: 0, pow: 0, landT: 0,
  };
}

export function respawnPlayer(p) {
  Object.assign(p, { x: W / 2 - C.w / 2, y: -C.h, vx: 0, vy: 0, alive: true, invul: C.invulnerable, held: [], heldT: 0, sucking: false, onGround: false, hurtT: 0, speedUp: 0, pow: 0 });
}

export function nozzle(p) {
  return { x: p.x + p.w / 2 + p.facing * 56, y: p.y + p.h - 46 };
}

/** Devuelve eventos: { jumped, landed, shoot } */
export function updatePlayer(p, dt, inp, plats, fx) {
  const ev = { jumped: false, landed: false, shoot: false };
  p.anim += dt;
  p.invul = Math.max(0, p.invul - dt);
  p.throwT = Math.max(0, p.throwT - dt);
  p.speedUp = Math.max(0, p.speedUp - dt);
  p.sx += (1 - p.sx) * Math.min(1, dt * 14); p.sy += (1 - p.sy) * Math.min(1, dt * 14);
  if (!p.alive) {
    p.hurtT += dt; p.vy += 2000 * dt; p.y += p.vy * dt; p.x += p.vx * dt;
    return ev;
  }
  const h = inp.held, pr = inp.pressed;
  const dir = (h.right ? 1 : 0) - (h.left ? 1 : 0);
  p.sucking = h.suck;
  const max = C.runSpeed * (p.speedUp > 0 ? 1.35 : 1) * (p.sucking ? 0.45 : 1);
  if (dir) {
    if (!p.sucking) p.facing = dir;
    p.vx = approach(p.vx, dir * max, (p.onGround ? C.accelGround : C.accelAir) * dt);
  } else {
    p.vx = approach(p.vx, 0, (p.onGround ? C.friction : C.accelAir * 0.6) * dt);
  }
  if (pr.jump) p.buffer = C.buffer; else p.buffer = Math.max(0, p.buffer - dt);
  p.coyote = p.onGround ? C.coyote : Math.max(0, p.coyote - dt);
  if (p.buffer > 0 && p.coyote > 0) {
    if (h.down && p.y + p.h < FLOOR_Y - 4) { p.drop = 0.22; p.vy = 120; }
    else { p.vy = -C.jumpSpeed; ev.jumped = true; p.sx = 0.78; p.sy = 1.25; fx.dust(p.x + p.w / 2, p.y + p.h, 5); }
    p.buffer = 0; p.coyote = 0; p.onGround = false;
  }
  if (!h.jump && p.vy < -300) p.vy *= Math.pow(C.jumpCut, dt * 20);
  p.drop = Math.max(0, p.drop - dt);
  const wasGround = p.onGround;
  const prevVy = p.vy;
  const r = stepBody(p, plats, dt, { drop: p.drop > 0 });
  p.onGround = r.landed;
  if (r.landed && !wasGround) {
    ev.landed = true;
    const k = clamp(prevVy / 1300, 0.2, 1);
    p.sx = 1 + 0.3 * k; p.sy = 1 - 0.28 * k;
    if (prevVy > 500) fx.dust(p.x + p.w / 2, p.y + p.h, 6);
  }
  if (pr.shoot && p.held.length) { ev.shoot = true; p.throwT = 0.28; }
  if (p.held.length) p.heldT += dt; else p.heldT = 0;
  return ev;
}

export function drawPlayer(ctx, p, time) {
  if (p.invul > 0 && p.alive && Math.floor(time * 20) % 2 === 0) return;
  const cx = p.x + p.w / 2, by = p.y + p.h;
  let f = 'presi-idle';
  if (!p.alive) f = 'presi-hurt';
  else if (p.throwT > 0) f = 'presi-throw';
  else if (p.sucking) f = 'presi-suck';
  else if (!p.onGround) f = p.vy < 0 ? 'presi-jump' : 'presi-fall';
  else if (Math.abs(p.vx) > 30) f = Math.floor(p.anim * 9) % 2 ? 'presi-walkA' : 'presi-walkB';
  const breathe = f === 'presi-idle' ? 1 + Math.sin(time * 3) * 0.015 : 1;
  const shake = p.held.length && p.heldT > CONFIG.vacuum.warnAt ? Math.sin(time * 80) * 3 : 0;
  const rot = !p.alive ? p.hurtT * 6 : (p.onGround && Math.abs(p.vx) > 30 ? Math.sin(p.anim * 18) * 0.04 : 0);
  if (hasSprite(f)) {
    drawSprite(ctx, f, cx + shake, by, {
      s: C.scale, flip: p.facing < 0, sx: p.sx, sy: p.sy * breathe,
      rot,
      tint: p.speedUp > 0 ? '#4dd2ff' : null, tintA: p.speedUp > 0 ? 0.18 : 0,
    });
  } else {
    // Sprite del tema aún no disponible: provisional por código (nunca un bloque negro).
    drawPlayerFallback(ctx, cx + shake, by, { s: C.scale, flip: p.facing < 0, sx: p.sx, sy: p.sy * breathe, rot, hurt: !p.alive, anim: p.anim, moving: Math.abs(p.vx) > 30 });
  }
}

/**
 * Dibujo provisional por código del protagonista (estilo tebeo: cabezón, chaqueta
 * de color del tema). Se usa cuando el tema declara sus sprites pero aún no
 * están en disco. Nunca un bloque negro ni un hueco invisible.
 */
export function drawPlayerFallback(ctx, cx, by, o = {}) {
  const s = o.s ?? 0.5;
  const w = 46 * s, h = 92 * s;
  const jacket = (skin.playerTint) || '#3d6f9e';
  const skinC = '#f4c89a';
  ctx.save();
  ctx.translate(cx, by);
  if (o.flip) ctx.scale(-1, 1);
  ctx.scale(o.sx ?? 1, o.sy ?? 1);
  if (o.rot) { ctx.translate(0, -h / 2); ctx.rotate(o.rot); ctx.translate(0, h / 2); }
  ctx.lineWidth = 3; ctx.strokeStyle = '#1a1030'; ctx.lineJoin = 'round';
  // Piernas
  const step = o.moving ? Math.sin(o.anim * 12) * w * 0.28 : 0;
  ctx.fillStyle = '#2b2440';
  ctx.beginPath(); ctx.roundRect(-w * 0.32 + step, -h * 0.3, w * 0.26, h * 0.3, 4); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(w * 0.06 - step, -h * 0.3, w * 0.26, h * 0.3, 4); ctx.fill(); ctx.stroke();
  // Cuerpo (chaqueta del tema)
  ctx.fillStyle = jacket;
  ctx.beginPath(); ctx.roundRect(-w * 0.42, -h * 0.78, w * 0.84, h * 0.52, w * 0.2); ctx.fill(); ctx.stroke();
  // Cabeza cabezona
  ctx.fillStyle = skinC;
  ctx.beginPath(); ctx.ellipse(0, -h * 0.88, w * 0.4, w * 0.38, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Ojos (X si está herido)
  ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 2.5;
  if (o.hurt) {
    for (const ex of [-w * 0.16, w * 0.16]) {
      ctx.beginPath(); ctx.moveTo(ex - 4, -h * 0.92); ctx.lineTo(ex + 4, -h * 0.84); ctx.moveTo(ex + 4, -h * 0.92); ctx.lineTo(ex - 4, -h * 0.84); ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#1a1030';
    ctx.beginPath(); ctx.arc(-w * 0.16, -h * 0.9, 3, 0, Math.PI * 2); ctx.arc(w * 0.16, -h * 0.9, 3, 0, Math.PI * 2); ctx.fill();
    // Sonrisa
    ctx.beginPath(); ctx.arc(0, -h * 0.82, w * 0.16, 0.15, Math.PI - 0.15); ctx.stroke();
  }
  ctx.restore();
}

/** Burbujas con los enemigos cazados sobre la mochila. */
export function drawHeld(ctx, p, time) {
  if (!p.held.length || !p.alive) return;
  const warn = p.heldT > CONFIG.vacuum.warnAt;
  const k = clamp(p.heldT / CONFIG.vacuum.burstAt, 0, 1);
  p.held.forEach((type, i) => {
    const a = time * 3 + i * (Math.PI * 2 / p.held.length);
    const bx = p.x + p.w / 2 - p.facing * 18 + Math.cos(a) * 26;
    const by = p.y - 22 - i * 4 + Math.sin(a) * 8 + (warn ? Math.sin(time * 60 + i) * 3 : 0);
    const r = 20 + k * 8;
    ctx.save();
    const g = ctx.createRadialGradient(bx - 6, by - 6, 2, bx, by, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, warn ? 'rgba(255,120,120,0.55)' : 'rgba(170,220,255,0.5)'); g.addColorStop(1, warn ? 'rgba(255,40,40,0.8)' : 'rgba(120,160,255,0.75)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#1a1030'; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, r - 1, 0, Math.PI * 2); ctx.clip();
    const sf = type + '-stun';
    if (hasSprite(sf)) drawSprite(ctx, sf, bx, by + r * 1.1, { s: 0.2 });
    else {
      // Sin sprite del tema: burbuja con el color provisional del tipo.
      ctx.fillStyle = (skin.enemyColors && skin.enemyColors[type]) || '#9fe7ff';
      ctx.beginPath(); ctx.arc(bx, by, r * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
  });
}
