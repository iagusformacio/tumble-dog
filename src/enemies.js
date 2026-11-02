// Enemigos: tipos inventados de la política, cada uno con su comportamiento.
import { CONFIG, W } from './config.js';
import { stepBody } from './physics.js';
import { rand, pick, clamp } from './util.js';
import { drawSprite, hasSprite } from './sprites.js';
import { skin } from './skin.js';
import { FONT } from './fx.js';
import { enemyTypes, enemyColors } from './themes/tumbledog.js';

export const TYPES = enemyTypes;
export const TYPE_KEYS = Object.keys(TYPES);

// Tipos activos del tema en curso (mismas claves; game.js los fija con setEnemyTypes).
let ACTIVE_TYPES = enemyTypes;
export function setEnemyTypes(t) { ACTIVE_TYPES = t || enemyTypes; }

// Colores de dibujo provisional por código (nunca negro: siempre visibles y diferenciados).
export const ENEMY_COLORS = enemyColors;

/**
 * Dibujo provisional por código de un enemigo cuando su sprite no está disponible.
 * Garantiza que el enemigo se vea (silueta cabezona estilo tebeo) y nunca como un
 * bloque negro ni como un hueco invisible.
 */
export function drawEnemyFallback(ctx, e, cx, by, s, angry = false) {
  const color = (skin.enemyColors && skin.enemyColors[e.type]) || ENEMY_COLORS[e.type] || '#ff6b6b';
  const bw = e.w * 0.8 * s;
  const bh = e.h * 0.9 * s;
  ctx.save();
  ctx.translate(cx, by);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#1a1030';
  ctx.lineWidth = 4;
  // Cuerpo redondeado apoyado en el suelo (by es el borde inferior).
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh, bw, bh * 0.72, bh * 0.18);
  ctx.fill();
  ctx.stroke();
  // Cabeza cabezona.
  ctx.beginPath();
  ctx.ellipse(0, -bh * 0.62, bw * 0.5, bw * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Ojos.
  ctx.fillStyle = '#1a1030';
  ctx.beginPath();
  ctx.arc(-bw * 0.17, -bh * 0.68, bw * 0.08, 0, Math.PI * 2);
  ctx.arc(bw * 0.17, -bh * 0.68, bw * 0.08, 0, Math.PI * 2);
  ctx.fill();
  // Boca.
  ctx.beginPath();
  ctx.arc(0, -bh * 0.52, bw * 0.2, 0, Math.PI);
  ctx.stroke();
  if (angry) {
    ctx.fillStyle = '#ff2a2a';
    ctx.font = `${Math.max(14, bw * 0.5)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, -bh * 0.32);
  }
  ctx.restore();
}

let nextId = 1;

export function createEnemy(type, x, y, o = {}) {
  const t = ACTIVE_TYPES[type] || ACTIVE_TYPES.portavoz;
  const e = {
    id: nextId++, type, t, x: x - CONFIG.enemy.w / 2, y: o.enter ? -120 - rand(0, 200) : y - CONFIG.enemy.h, w: CONFIG.enemy.w, h: CONFIG.enemy.h,
    vx: 0, vy: o.vy ?? 0, dir: o.dir ?? pick([-1, 1]), onGround: false,
    state: o.enter ? 'enter' : 'walk', enterDelay: o.delay ?? 0, suck: 0, stun: 0, beam: false, angry: false,
    shootT: rand(1.5, 3.5), jumpT: rand(1, 3), drop: 0, edgeLock: 0, anim: rand(0, 1), sq: 1, flash: 0, ghostT: rand(0, 4),
    speedMul: o.speedMul ?? 1, thrown: !!o.thrown, targetY: y,
  };
  if (o.enter) e.x = x - CONFIG.enemy.w / 2;
  return e;
}

/** Actualiza un enemigo vivo. ctx: { plats, player, shots, fx, freeze, difficulty } */
export function updateEnemy(e, dt, ctx) {
  e.anim += dt; e.flash = Math.max(0, e.flash - dt * 4); e.sq += (1 - e.sq) * Math.min(1, dt * 12);
  if (e.state === 'enter') {
    e.enterDelay -= dt;
    if (e.enterDelay > 0) return;
    const r = stepBody(e, ctx.plats, dt, { gravity: 1800, noCeiling: true, drop: e.y + e.h < e.targetY - 6 });
    if (r.landed) { e.state = 'walk'; e.sq = 0.7; ctx.fx.dust(e.x + e.w / 2, e.y + e.h, 6); }
    return;
  }
  if (e.state === 'dead') {
    e.vy += 2000 * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.vr * dt;
    if (e.y > 900) e.gone = true;
    return;
  }
  const p = ctx.player;
  const frozen = ctx.freeze > 0;
  if (e.beam) {
    e.vx = 0;
  } else if (e.suck > 0) {
    e.suck = Math.max(0, e.suck - dt * 1.4);
  }
  if (e.stun > 0) e.stun -= dt;
  const stunned = e.beam || e.stun > 0 || frozen;
  if (!stunned && e.onGround) {
    const sp = e.t.speed * e.speedMul * (e.angry ? 1.6 : 1) * ctx.difficulty;
    if (e.t.chase && p.alive && Math.abs(p.y - e.y) < 60 && Math.random() < dt * 1.5) e.dir = p.x > e.x ? 1 : -1;
    e.vx = e.dir * sp;
    // Bordes: girar o tirarse
    e.edgeLock -= dt;
    const front = e.dir > 0 ? e.x + e.w + 6 : e.x - 6;
    let supported = false;
    for (const pl of ctx.plats) if (front >= pl.x && front <= pl.x + pl.w && Math.abs(pl.y - (e.y + e.h)) < 4) { supported = true; break; }
    if (!supported && e.edgeLock <= 0) {
      e.edgeLock = 0.6;
      const wantDown = p.alive && p.y > e.y + 40;
      if (!(Math.random() < e.t.drop || (e.t.chase && wantDown))) { e.dir *= -1; e.vx = -e.vx; }
    }
    // Saltos
    e.jumpT -= dt;
    if (e.jumpT <= 0) {
      e.jumpT = e.t.hop ? rand(0.6, 1.2) : rand(1.5, 3.5);
      const wantUp = p.alive && p.y + p.h < e.y && Math.abs(p.x - e.x) < 300;
      if (wantUp && Math.random() < 0.6 + e.t.jump * 0.3) { e.vy = -1060; e.sq = 1.25; }
      else if (Math.random() < e.t.jump) { e.vy = e.t.hop ? -560 : -480; e.sq = 1.2; }
      else if (p.alive && p.y > e.y + 60 && Math.abs(p.x - e.x) < 200 && e.y + e.h < 630 && Math.random() < 0.5) e.drop = 0.25;
    }
    // Disparos
    if (e.t.shoot && !ctx.calm) {
      e.shootT -= dt;
      if (e.shootT <= 0 && p.alive) {
        e.shootT = rand(...e.t.rate) / (e.angry ? 1.6 : 1);
        if (Math.abs(p.y - e.y) < 140 || e.t.shoot === 'bulo') { e.dir = p.x > e.x ? 1 : -1; ctx.shots.push(makeShot(e.t.shoot, e.x + e.w / 2 + e.dir * 30, e.y + 34, e.dir, p)); }
      }
    }
  } else if (stunned) {
    e.vx *= 0.8;
  }
  if (e.t.ghost) e.ghostT += dt;
  e.drop = Math.max(0, e.drop - dt);
  const wasGround = e.onGround;
  const r = stepBody(e, ctx.plats, dt, { drop: e.drop > 0 });
  e.onGround = r.landed;
  if (r.landed && !wasGround) { e.sq = 0.78; if (e.thrown) { e.thrown = false; ctx.fx.dust(e.x + e.w / 2, e.y + e.h, 5); } }
  if (r.wall) e.dir = -r.wall;
  if (e.x < -40 || e.x > W + 40) e.x = clamp(e.x, 0, W - e.w);
}

export function killEnemy(e, dir) {
  e.state = 'dead'; e.vx = dir * rand(240, 420); e.vy = rand(-1100, -800); e.rot = 0; e.vr = dir * rand(8, 14);
}

export function enemyGhostAlpha(e) {
  if (!e.t.ghost || e.state !== 'walk') return 1;
  const k = Math.sin(e.ghostT * 1.3);
  return k > 0.55 ? 0.22 : 1;
}

export function drawEnemy(ctx, e, time) {
  const cx = e.x + e.w / 2, by = e.y + e.h;
  const s = CONFIG.enemy.scale;
  if (e.state === 'dead') {
    const frameDown = e.type + '-down';
    if (hasSprite(frameDown)) {
      drawSprite(ctx, frameDown, cx, by, { s: s * 0.9, rot: e.rot, flip: e.vx < 0 });
    } else {
      drawEnemyFallback(ctx, e, cx, by, s, e.angry);
    }
    return;
  }
  if (e.state === 'enter' && e.enterDelay > 0) return;
  const stunned = e.beam || e.stun > 0;
  let frame = e.type + (stunned ? '-stun' : Math.floor(e.anim * (e.t.speed > 140 ? 9 : 6)) % 2 ? '-walkA' : '-walkB');
  if (!e.onGround && !stunned && e.state === 'walk') frame = e.type + '-walkA';
  const shake = e.beam ? Math.sin(time * 90) * (2 + e.suck * 5) : 0;
  const shrink = 1 - e.suck * 0.35;
  const stretch = e.beam ? 1 + e.suck * 0.35 : 1;
  const sq = e.sq;
  const alpha = enemyGhostAlpha(e);
  if (hasSprite(frame)) {
    drawSprite(ctx, frame, cx + shake, by, {
    s: s * shrink, flip: e.dir < 0, sx: stretch * (2 - sq), sy: sq / stretch, alpha,
    flash: e.flash, tint: e.angry ? '#ff2a2a' : null, tintA: e.angry ? 0.25 + 0.15 * Math.sin(time * 10) : 0,
    rot: e.state === 'walk' && e.onGround && !stunned ? Math.sin(e.anim * 12) * 0.05 : 0,
    });
  } else {
    // Sprite no disponible: dibujo provisional por código, visible y nunca negro.
    drawEnemyFallback(ctx, e, cx + shake, by, s, e.angry);
  }
  if (e.stun > 0 && !e.beam) {
    ctx.save(); ctx.translate(cx, e.y - 6);
    for (let i = 0; i < 3; i++) { const a = time * 6 + i * 2.1; ctx.fillStyle = '#ffe14d'; ctx.font = `20px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('★', Math.cos(a) * 22, Math.sin(a) * 6); }
    ctx.restore();
  }
}

export function makeShot(kind, x, y, dir, target) {
  if (kind === 'bulo') {
    const dx = (target ? target.x : x + dir * 300) - x;
    return { kind, x, y, vx: clamp(dx * 0.9, -420, 420) || dir * 260, vy: -760, r: 22, life: 3.2, t: 0, g: 1500 };
  }
  if (kind === 'flash') return { kind, x, y, vx: dir * 430, vy: 0, r: 16, life: 2.4, t: 0, g: 0 };
  return { kind: 'shout', x, y, vx: dir * 290, vy: 0, r: 20, life: 1.9, t: 0, g: 0, dir };
}

export function updateShot(s, dt) {
  s.t += dt; s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt;
  return s.t < s.life && s.x > -60 && s.x < W + 60 && s.y < 760;
}

export function drawShot(ctx, s, time) {
  // Arte del proyectil (A9): si el tema trae sprite para este jefe, se usa.
  if (s.spr && hasSprite(s.spr)) {
    ctx.save(); ctx.translate(s.x, s.y);
    const dir = s.dir < 0 ? 1 : -1;
    if (s.kind === 'flash') { ctx.rotate(Math.sin(time * 8) * 0.2); }
    else ctx.rotate(time * 6 * dir);
    drawSprite(ctx, s.spr, 0, 22, { s: 0.5 });
    ctx.restore();
    return;
  }
  ctx.save(); ctx.translate(s.x, s.y);
  if (s.kind === 'bulo') {
    ctx.rotate(Math.sin(time * 8 + s.t * 3) * 0.2);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 34, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 16); ctx.lineTo(-18, 30); ctx.lineTo(4, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e0242c'; ctx.font = `20px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BULO', 0, 1);
  } else if (s.kind === 'flash') {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 40); g.addColorStop(0, 'rgba(255,120,200,0.9)'); g.addColorStop(1, 'rgba(255,60,160,0)');
    ctx.fillStyle = g; ctx.fillRect(-40, -40, 80, 80);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ff4fa3'; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3; ctx.scale(1 + Math.sin(time * 20) * 0.1, 1 + Math.sin(time * 20) * 0.1);
    ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-22, -2, -12, -20, 0, -8); ctx.bezierCurveTo(12, -20, 22, -2, 0, 12); ctx.fill(); ctx.stroke();
  } else {
    if (s.dir < 0) ctx.scale(-1, 1);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const k = (s.t * 3 + i / 3) % 1;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(-20, 0, 14 + k * 26, -0.9, 0.9); ctx.stroke();
      ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 5; ctx.stroke();
    }
  }
  ctx.restore();
}
