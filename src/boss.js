// Jefes (versiones gigantes) y el perseguidor invencible: el Inspector de Hacienda.
import { FLOOR_Y, W, CONFIG } from './config.js';
import { rand, pick } from './util.js';
import { drawSprite } from './sprites.js';
import { makeShot } from './enemies.js';

const BOSS = {
  tertuliano: { name: 'EL GRAN TERTULIANO', shot: 'bulo', minions: ['portavoz', 'influencer', 'tertuliano'] },
  lider: { name: 'EL LÍDER ETERNO', shot: 'shout', minions: ['diputado', 'baron', 'asesor', 'activista'] },
};

export function createBoss(type) {
  const d = BOSS[type] || BOSS.tertuliano;
  return { type, ...d, maxHp: CONFIG.bossHp[type], hp: CONFIG.bossHp[type], x: 1040, y: FLOOR_Y, vy: 0, t: 0, flash: 0, throwT: 2.5, shotT: 1.6, hopT: 4, dying: 0, dead: false, hitT: 0, s: 1.25 };
}

export function bossBox(b) { return { x: b.x - 85, y: b.y - 240, w: 170, h: 240 }; }

/** ctx: { player, spawnMinion(type, x, y, vx, vy), shots, fx } */
export function updateBoss(b, dt, ctx) {
  b.t += dt; b.flash = Math.max(0, b.flash - dt * 4); b.hitT = Math.max(0, b.hitT - dt);
  if (b.dying > 0) {
    b.dying += dt;
    if (Math.random() < dt * 14) { ctx.fx.stars(b.x + rand(-90, 90), b.y - rand(30, 220), 4); ctx.fx.word(b.x + rand(-80, 80), b.y - rand(40, 220), 40); ctx.fx.shake(0.25); }
    if (b.dying > 2.2) b.dead = true;
    return;
  }
  const rage = b.hp < b.maxHp / 2 ? 1.5 : 1;
  b.vy += 2600 * dt; b.y += b.vy * dt;
  if (b.y >= FLOOR_Y) { if (b.vy > 900) { ctx.fx.shake(0.6); ctx.fx.dust(b.x, FLOOR_Y, 14); } b.y = FLOOR_Y; b.vy = 0; }
  b.x = 1040 + Math.sin(b.t * 0.7) * 60;
  b.throwT -= dt * rage; b.shotT -= dt * rage; b.hopT -= dt * rage;
  if (b.throwT <= 0) {
    b.throwT = rand(2.4, 3.6);
    ctx.spawnMinion(pick(b.minions), b.x - 80, b.y - 200, rand(-560, -300), rand(-1050, -800));
  }
  if (b.shotT <= 0 && ctx.player.alive) {
    b.shotT = rand(1.4, 2.4);
    const s = makeShot(b.shot, b.x - 90, b.y - 150, -1, ctx.player);
    if (b.shot === 'shout') s.y = ctx.player.y + 40 > b.y - 200 ? ctx.player.y + 40 : b.y - 120;
    ctx.shots.push(s);
  }
  if (b.hopT <= 0 && rage > 1) { b.hopT = rand(3, 5); b.vy = -1300; }
}

export function hitBoss(b, dmg, fx) {
  if (b.dying) return;
  b.hp -= dmg; b.flash = 1; b.hitT = 0.4;
  fx.shake(0.5); fx.stop(0.08); fx.stars(b.x - 60, b.y - 140, 10); fx.text(b.x - 40, b.y - 260, pick(['¡AY!', '¡OUCH!', '¡MI ESCAÑO!', '¡CENSURA!']), { size: 44, color: '#ffef5c' });
  if (b.hp <= 0) { b.hp = 0; b.dying = 0.001; fx.flash(0.9); fx.confetti(b.x, b.y - 120, 80, 1.6); }
}

export function drawBoss(ctx, b, time) {
  const wob = Math.sin(time * 5) * 0.03;
  const frame = b.hitT > 0 || b.dying ? b.type + '-stun' : (Math.floor(time * 4) % 2 ? b.type + '-walkA' : b.type + '-walkB');
  ctx.fillStyle = 'rgba(10,5,30,0.35)'; ctx.beginPath(); ctx.ellipse(b.x, FLOOR_Y + 4, 110 * (1 - (FLOOR_Y - b.y) / 900), 16, 0, 0, Math.PI * 2); ctx.fill();
  drawSprite(ctx, frame, b.x + (b.hitT > 0 ? Math.sin(time * 90) * 6 : 0), b.y, {
    s: b.s, flip: true, sx: 1 + wob, sy: 1 - wob, flash: b.flash,
    tint: b.hp < b.maxHp / 2 ? '#ff2a2a' : null, tintA: b.hp < b.maxHp / 2 ? 0.18 + 0.1 * Math.sin(time * 8) : 0,
    rot: b.dying ? Math.sin(time * 30) * 0.12 : 0, alpha: b.dying > 1.6 ? Math.max(0, 1 - (b.dying - 1.6) / 0.6) : 1,
  });
}

// ---- Inspector de Hacienda (invencible, aparece si tardas demasiado)
export function createChaser() { return { x: W / 2, y: -80, t: 0, vx: 0, vy: 0, alpha: 0 }; }

export function updateChaser(c, dt, player) {
  c.t += dt; c.alpha = Math.min(1, c.alpha + dt);
  const sp = 110 + Math.min(160, c.t * 6);
  const dx = player.x + player.w / 2 - c.x, dy = player.y + 30 - c.y;
  const d = Math.hypot(dx, dy) || 1;
  c.vx += ((dx / d) * sp - c.vx) * Math.min(1, dt * 1.5);
  c.vy += ((dy / d) * sp - c.vy) * Math.min(1, dt * 1.5);
  c.x += c.vx * dt; c.y += c.vy * dt + Math.sin(c.t * 3) * 20 * dt;
}

export function chaserHits(c, p) { return Math.abs(c.x - (p.x + p.w / 2)) < 44 && Math.abs(c.y - (p.y + 40)) < 56; }

export function drawChaser(ctx, c, time) {
  ctx.save(); ctx.translate(c.x, c.y); ctx.globalAlpha = c.alpha * 0.92;
  if (c.vx < 0) ctx.scale(-1, 1);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 110); g.addColorStop(0, 'rgba(140,60,255,0.5)'); g.addColorStop(1, 'rgba(80,0,160,0)');
  ctx.fillStyle = g; ctx.fillRect(-110, -110, 220, 220);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  // Cuerpo fantasmal con traje
  ctx.fillStyle = '#2b1f4a'; ctx.beginPath(); ctx.moveTo(-36, -10);
  ctx.quadraticCurveTo(-40, -60, 0, -64); ctx.quadraticCurveTo(40, -60, 36, -10);
  for (let i = 0; i <= 6; i++) { const x = 36 - i * 12; ctx.lineTo(x, 50 + Math.sin(time * 8 + i) * 8 + (i % 2 ? 10 : 0)); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(0, 10); ctx.lineTo(8, -20); ctx.fill();
  ctx.fillStyle = '#7a1fd1'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-4, 0); ctx.lineTo(0, 12); ctx.lineTo(4, 0); ctx.closePath(); ctx.fill();
  // Cara
  ctx.fillStyle = '#c9b8ff'; ctx.beginPath(); ctx.ellipse(0, -40, 24, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffef5c'; ctx.shadowColor = '#ffef5c'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(-9, -42, 5, 0, Math.PI * 2); ctx.arc(9, -42, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#1a1030'; ctx.beginPath(); ctx.moveTo(-10, -28); ctx.quadraticCurveTo(0, -22, 10, -28); ctx.stroke();
  // Sombrero y maletín
  ctx.fillStyle = '#16102b'; ctx.fillRect(-28, -66, 56, 8); ctx.strokeRect(-28, -66, 56, 8); ctx.fillRect(-18, -92, 36, 28); ctx.strokeRect(-18, -92, 36, 28);
  ctx.fillStyle = '#8a5a2b'; ctx.save(); ctx.translate(38, 10 + Math.sin(time * 4) * 4); ctx.rotate(0.2);
  ctx.fillRect(-14, -10, 30, 24); ctx.strokeRect(-14, -10, 30, 24); ctx.strokeRect(-4, -16, 10, 6);
  ctx.fillStyle = '#fff'; ctx.font = '12px Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('IRPF', 1, 6); ctx.restore();
  ctx.restore();
}
