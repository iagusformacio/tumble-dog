import { CONFIG } from './config.js';
import { rand, pick, hsl, easeOutBack, clamp } from './util.js';

export const FONT = '"Bangers", "Luckiest Guy", Impact, "Arial Black", sans-serif';
const CONFETTI = ['#ff3b5c', '#ffd23f', '#3bceac', '#4d9de0', '#ff8c42', '#b15eff', '#ffffff'];
import { onomatopeyas as WORDS } from './themes/tumbledog.js';

export function createFx() {
  const parts = [];
  const texts = [];
  let trauma = 0;
  let hitstop = 0;
  let flash = 0;
  let flashColor = '#fff';
  let time = 0;

  function add(p) {
    if (parts.length >= CONFIG.fx.maxParticles) parts.shift();
    p.t = 0; parts.push(p); return p;
  }

  const api = {
    get hitstop() { return hitstop; },
    shake(a) { trauma = Math.min(1, trauma + a); },
    stop(s) { hitstop = Math.max(hitstop, s); },
    flash(a, color = '#fff') { flash = Math.max(flash, a); flashColor = color; },
    spark(x, y, n = 8, o = {}) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2); const sp = rand(o.min ?? 120, o.max ?? 520);
        add({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up ?? 0), life: rand(0.25, 0.6),
          r: rand(2, o.size ?? 5), h: o.hue ?? rand(0, 360), g: o.g ?? 600, drag: 2.5 });
      }
    },
    stars(x, y, n = 6, o = {}) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2); const sp = rand(150, o.max ?? 480);
        add({ k: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 200, life: rand(0.5, 0.9), r: rand(7, o.size ?? 15),
          rot: rand(0, 6), vr: rand(-10, 10), c: o.color ?? pick(['#ffe14d', '#fff3a6', '#ffffff', '#ffb627']), g: 900, drag: 1.2 });
      }
    },
    confetti(x, y, n = 30, spread = 1) {
      for (let i = 0; i < n; i++) {
        add({ k: 'conf', x: x + rand(-20, 20) * spread, y, vx: rand(-420, 420) * spread, vy: rand(-900, -300), life: rand(1.4, 2.6),
          w: rand(6, 12), h: rand(3, 6), rot: rand(0, 6), vr: rand(-14, 14), c: pick(CONFETTI), g: 1100, drag: 2.2, ph: rand(0, 6) });
      }
    },
    dust(x, y, n = 6, dir = 0) {
      for (let i = 0; i < n; i++) {
        add({ k: 'dust', x: x + rand(-14, 14), y: y - rand(0, 6), vx: rand(-90, 90) + dir * rand(60, 160), vy: rand(-90, -20),
          life: rand(0.35, 0.7), r: rand(8, 16), g: -40, drag: 3 });
      }
    },
    ring(x, y, color = '#fff', r = 60, life = 0.35, width = 6) {
      add({ k: 'ring', x, y, life, r0: 8, r1: r, c: color, w: width, vx: 0, vy: 0, g: 0, drag: 0 });
    },
    suck(x, y, tx, ty) {
      add({ k: 'suck', x, y, tx, ty, life: rand(0.25, 0.45), r: rand(2.5, 6), h: rand(0, 360), vx: 0, vy: 0, g: 0, drag: 0 });
    },
    trail(x, y, r, h) { add({ k: 'trail', x, y, r, h, life: 0.28, vx: 0, vy: 0, g: 0, drag: 0 }); },
    text(x, y, str, o = {}) {
      texts.push({ x, y, str, t: 0, life: o.life ?? 1.0, size: o.size ?? 34, color: o.color ?? '#fff', stroke: o.stroke ?? '#1a1030', vy: o.vy ?? -70, burst: !!o.burst, hue: o.hue ?? rand(0, 360), rot: o.rot ?? rand(-0.18, 0.18) });
    },
    word(x, y, size = 46) { api.text(x, y, pick(WORDS), { burst: true, size, life: 0.75, vy: -40, color: '#fff35c' }); },

    update(dt) {
      time += dt;
      hitstop = Math.max(0, hitstop - dt);
      trauma = Math.max(0, trauma - dt * 1.6);
      flash = Math.max(0, flash - dt * 3.5);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t += dt;
        if (p.t >= p.life) { parts.splice(i, 1); continue; }
        if (p.k === 'suck') { const k = p.t / p.life; p.x += (p.tx - p.x) * clamp(dt * 9 * (0.4 + k), 0, 1); p.y += (p.ty - p.y) * clamp(dt * 9 * (0.4 + k), 0, 1); continue; }
        p.vy += p.g * dt; p.vx -= p.vx * p.drag * dt; p.vy -= p.vy * p.drag * dt * (p.k === 'conf' ? 1 : 0.3);
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.rot !== undefined) p.rot += p.vr * dt;
      }
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i]; t.t += dt; t.y += t.vy * dt; t.vy *= 0.96;
        if (t.t >= t.life) texts.splice(i, 1);
      }
    },

    offset() {
      const s = trauma * trauma;
      return { x: Math.sin(time * 71) * 18 * s, y: Math.cos(time * 63) * 14 * s, r: Math.sin(time * 47) * 0.02 * s };
    },

    drawBack(ctx) {
      for (const p of parts) if (p.k === 'trail') {
        const a = 1 - p.t / p.life;
        ctx.fillStyle = hsl(p.h, 95, 65, 0.35 * a);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + 0.4 * a), 0, Math.PI * 2); ctx.fill();
      }
    },

    draw(ctx) {
      for (const p of parts) {
        const k = p.t / p.life; const a = 1 - k;
        if (p.k === 'dust') {
          ctx.fillStyle = `rgba(240,230,215,${0.55 * a})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k * 1.4), 0, Math.PI * 2); ctx.fill();
        } else if (p.k === 'conf') {
          ctx.save(); ctx.translate(p.x + Math.sin(p.t * 8 + p.ph) * 6, p.y); ctx.rotate(p.rot);
          ctx.scale(1, Math.cos(p.t * 9 + p.ph)); ctx.globalAlpha = Math.min(1, a * 3);
          ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
        } else if (p.k === 'star') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, a * 2);
          star(ctx, p.r * (0.5 + a * 0.5), p.c); ctx.restore();
        } else if (p.k === 'ring') {
          ctx.strokeStyle = p.c; ctx.globalAlpha = a; ctx.lineWidth = p.w * a + 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * (1 - (1 - k) ** 3), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        if (p.k !== 'spark' && p.k !== 'suck') continue;
        const a = 1 - p.t / p.life;
        ctx.fillStyle = hsl(p.h, 100, 65, a);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.k === 'suck' ? 1 : 0.5 + a), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    },

    drawTexts(ctx) {
      for (const t of texts) {
        const k = t.t / t.life;
        const pop = t.t < 0.25 ? easeOutBack(t.t / 0.25) : 1;
        const a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.rot); ctx.scale(pop, pop); ctx.globalAlpha = a;
        if (t.burst) burst(ctx, t.size * 1.9, t.size * 1.25, t.hue, t.t);
        ctx.font = `${t.size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, t.size * 0.18); ctx.strokeStyle = t.stroke;
        ctx.strokeText(t.str, 0, 0); ctx.fillStyle = t.color; ctx.fillText(t.str, 0, 0);
        ctx.restore();
      }
    },

    drawFlash(ctx, w, h) {
      if (flash <= 0) return;
      ctx.save(); ctx.globalAlpha = flash * 0.75; ctx.fillStyle = flashColor; ctx.fillRect(0, 0, w, h); ctx.restore();
    },
    clear() { parts.length = 0; texts.length = 0; trauma = 0; hitstop = 0; },
  };
  return api;
}

export function star(ctx, r, color, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * 0.45 : r; const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}

export function burst(ctx, rx, ry, hue, t = 0) {
  const n = 14;
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + t * 0.6;
    const k = i % 2 ? 0.68 : 1 + Math.sin(i * 7.3) * 0.08;
    ctx.lineTo(Math.cos(a) * rx * k, Math.sin(a) * ry * k);
  }
  ctx.closePath();
  ctx.fillStyle = hsl(hue, 95, 55); ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.fill(); ctx.stroke();
}

export function outlinedText(ctx, str, x, y, size, fill = '#fff', stroke = '#1a1030', align = 'center') {
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size * 0.2); ctx.strokeStyle = stroke;
  ctx.strokeText(str, x, y); ctx.fillStyle = fill; ctx.fillText(str, x, y);
}
