// La bola: los enemigos aspirados salen rodando, rebotan en las paredes y arrasan.
import { CONFIG } from './config.js';
import { stepBody } from './physics.js';
import { hsl } from './util.js';
import { drawSprite, hasSprite, spriteSize } from './sprites.js';

const B = CONFIG.ball;

export function createBall(x, y, dir, held) {
  const r = B.baseRadius + B.perEnemy * (held.length - 1);
  return { x, y, r, dir, vx: dir * B.speed, vy: -160, held: [...held], wallHits: 0, life: B.life, spin: 0, chain: 0, alive: true, hue: 0, bounceSq: 1 };
}

/** Devuelve 'wall' | 'shatter' | 'land' | null */
export function updateBall(b, dt, plats) {
  b.life -= dt; b.spin += b.dir * dt * (B.speed / b.r); b.hue += dt * 400;
  b.bounceSq += (1 - b.bounceSq) * Math.min(1, dt * 10);
  const body = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2, vx: b.dir * B.speed, vy: b.vy };
  const fallV = b.vy;
  const res = stepBody(body, plats, dt, { gravity: 2400, maxFall: 1500 });
  b.x = body.x + b.r; b.y = body.y + b.r; b.vy = body.vy;
  let ev = null;
  if (res.landed && fallV > 650) { b.vy = -fallV * 0.35; b.bounceSq = 0.75; ev = 'land'; }
  if (res.wall) {
    b.dir = -res.wall; b.wallHits++; b.bounceSq = 0.7; ev = 'wall';
    if (b.wallHits > B.maxWallHits) ev = 'shatter';
  }
  if (b.life <= 0) ev = 'shatter';
  return ev;
}

export function drawBall(ctx, b, time) {
  ctx.save();
  ctx.translate(b.x, b.y + b.r);
  ctx.scale(2 - b.bounceSq, b.bounceSq);
  ctx.translate(0, -b.r);
  // Halo arcoíris
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(0, 0, b.r * 0.6, 0, 0, b.r * 1.9);
  halo.addColorStop(0, hsl(b.hue, 100, 65, 0.55)); halo.addColorStop(1, hsl(b.hue + 60, 100, 60, 0));
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, b.r * 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // Esfera: sprite propio del tema si lo declara y existe (p. ej. bola de vómito)
  if (hasSprite('ball')) {
    const sz = spriteSize('ball');
    drawSprite(ctx, 'ball', 0, b.r, { s: (b.r * 2) / (sz.h || b.r * 2) });
  } else {
    const g = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.4, 2, 0, 0, b.r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, hsl(b.hue, 95, 72)); g.addColorStop(1, hsl(b.hue + 90, 90, 45));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save(); ctx.clip(); ctx.rotate(b.spin);
  const n = b.held.length;
  b.held.forEach((type, i) => {
    const a = (i / n) * Math.PI * 2;
    const off = n > 1 ? b.r * 0.38 : 0;
    drawSprite(ctx, type + '-stun', Math.cos(a) * off, Math.sin(a) * off + b.r * 0.55, { s: (b.r / 100) * (n > 1 ? 0.75 : 1), rot: a });
  });
  ctx.restore();
  // Rayas de remolino
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { const a = b.spin * 1.3 + i * 2.1; ctx.beginPath(); ctx.arc(0, 0, b.r * 0.78, a, a + 0.7); ctx.stroke(); }
  ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-b.r * 0.38, -b.r * 0.45, b.r * 0.22, b.r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
