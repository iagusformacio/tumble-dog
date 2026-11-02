// Premios que sueltan los enemigos, y burbujas con letras de T-U-M-B-L-E-D-O-G.
import { CONFIG, W } from './config.js';
import { stepBody } from './physics.js';
import { rand, pick, hsl } from './util.js';
import { FONT, star } from './fx.js';
import { drawSprite, hasSprite, spriteSize } from './sprites.js';

export const ITEM_KINDS = {
  coin: { value: 100 }, gemB: { value: 500 }, gemR: { value: 1000 }, gemG: { value: 2000 },
  shoes: { value: 300, power: 'speed' }, pow: { value: 300, power: 'pow' }, clock: { value: 300, power: 'freeze' }, life: { value: 1000, power: 'life' },
};

export function randomItemKind(chainBoost = 0) {
  const r = Math.random();
  if (r < 0.04) return 'life';
  if (r < 0.12) return pick(['shoes', 'pow', 'clock']);
  if (r < 0.3 + chainBoost * 0.1) return pick(['gemB', 'gemR', 'gemG']);
  return 'coin';
}

export function createItem(kind, x, y) {
  return { kind, x: x - 16, y: y - 16, w: 32, h: 32, vx: rand(-260, 260), vy: rand(-850, -500), life: 9, t: 0, onGround: false };
}

export function updateItem(it, dt, plats) {
  it.t += dt; it.life -= dt;
  if (!it.onGround) {
    const r = stepBody(it, plats, dt, { gravity: 2000, noCeiling: it.y < 64 && it.vy >= 0 });
    if (r.wall) it.vx = -it.vx * 0.6;
    if (r.landed) { if (Math.abs(it.vy) < 1) { it.vx *= 0.5; if (Math.abs(it.vx) < 40) it.onGround = true; } }
  }
  return it.life > 0;
}

export function drawItem(ctx, it, time) {
  if (it.life < 2 && Math.floor(time * 16) % 2 === 0) return;
  const cx = it.x + it.w / 2, cy = it.y + it.h / 2 + Math.sin(time * 4 + it.x) * (it.onGround ? 3 : 0);
  ctx.save(); ctx.translate(cx, cy);
  ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  const k = it.kind;
  // Premio con sprite propio del tema (p. ej. café, flan, antiácido...) si existe.
  const spr = 'item-' + k;
  if (hasSprite(spr)) {
    const sz = spriteSize(spr);
    drawSprite(ctx, spr, 0, 17, { s: 36 / (sz.h || 36), rot: Math.sin(time * 3 + it.x) * 0.08 });
    ctx.restore();
    return;
  }
  if (k === 'coin') {
    ctx.scale(Math.max(0.15, Math.abs(Math.cos(time * 4 + it.x))), 1);
    const g = ctx.createRadialGradient(-5, -6, 2, 0, 0, 17); g.addColorStop(0, '#fff6b0'); g.addColorStop(1, '#e0a118');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9a6a00'; ctx.font = `20px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('€', 0, 1);
  } else if (k.startsWith('gem')) {
    const col = { gemB: [200, '#3aa0ff'], gemR: [350, '#ff3b5c'], gemG: [140, '#2ee59d'] }[k];
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(0, 0, 2, 0, 0, 34); gl.addColorStop(0, hsl(col[0], 100, 70, 0.6)); gl.addColorStop(1, hsl(col[0], 100, 60, 0));
    ctx.fillStyle = gl; ctx.fillRect(-34, -34, 68, 68); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = col[1]; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(16, -4); ctx.lineTo(0, 18); ctx.lineTo(-16, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-16, -4); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill();
    if (Math.sin(time * 6 + it.x) > 0.9) { ctx.translate(8, -12); star(ctx, 7, '#fff'); }
  } else if (k === 'shoes') {
    ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.moveTo(-18, 6); ctx.lineTo(-14, -12); ctx.lineTo(-2, -12); ctx.lineTo(4, -2); ctx.lineTo(18, 2); ctx.lineTo(18, 10); ctx.lineTo(-18, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(-18, 6, 36, 5); ctx.strokeRect(-18, 6, 36, 5);
    ctx.strokeStyle = '#4dd2ff'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-26 - i * 2, -8 + i * 7); ctx.lineTo(-34 - i * 4, -8 + i * 7); ctx.stroke(); }
  } else if (k === 'pow') {
    ctx.fillStyle = '#2f6bff'; ctx.fillRect(-18, -16, 36, 32); ctx.strokeRect(-18, -16, 36, 32);
    ctx.fillStyle = '#fff'; ctx.font = `17px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('POW', 0, 1);
  } else if (k === 'clock') {
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, 2, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 2, 11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -6); ctx.moveTo(0, 2); ctx.lineTo(6, 4); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(-12, -12, 6, 0, Math.PI * 2); ctx.arc(12, -12, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (k === 'life') {
    ctx.fillStyle = '#ff3b6b'; ctx.scale(1 + Math.sin(time * 8) * 0.08, 1 + Math.sin(time * 8) * 0.08);
    ctx.beginPath(); ctx.moveTo(0, 15); ctx.bezierCurveTo(-26, -2, -14, -22, 0, -8); ctx.bezierCurveTo(14, -22, 26, -2, 0, 15); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `14px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('1UP', 0, 2);
  }
  ctx.restore();
}

export function createLetter(letter, x, y, speed = CONFIG.letters.bubbleSpeed) {
  return { letter, x, y, vx: (x < W / 2 ? 1 : -1) * speed, vy: -40, t: 0, life: 12, r: 30 };
}

export function updateLetter(l, dt) {
  l.t += dt; l.life -= dt;
  l.x += l.vx * dt; l.y += Math.sin(l.t * 2) * 30 * dt + l.vy * dt;
  if (l.x < 40 || l.x > W - 40) l.vx = -l.vx;
  if (l.y < 100) l.vy = Math.abs(l.vy); else if (l.y > 560) l.vy = -Math.abs(l.vy);
  return l.life > 0;
}

export function drawLetter(ctx, l, time) {
  if (l.life < 2.5 && Math.floor(time * 14) % 2 === 0) return;
  const wob = 1 + Math.sin(time * 5 + l.t) * 0.05;
  ctx.save(); ctx.translate(l.x, l.y); ctx.scale(wob, 2 - wob);
  const g = ctx.createRadialGradient(-10, -12, 3, 0, 0, l.r);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(200,240,255,0.35)'); g.addColorStop(1, hsl(time * 120, 90, 65, 0.85));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, l.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3; ctx.stroke();
  ctx.font = `36px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 6; ctx.strokeText(l.letter, 0, 2); ctx.fillStyle = hsl(time * 200, 95, 60); ctx.fillText(l.letter, 0, 2);
  ctx.restore();
}
