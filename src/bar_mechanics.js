// Mecánicas propias de cada bar de la campaña (issue #57).
//   1 · Bar La Taca: manchas en el suelo (resbalan o ralentizan).
//   2 · Bar Los Concursos: sorteos con bola de interrogación (efecto aleatorio).
//   3 · Bar Pols: bandejas giratorias que golpean + barra deslizante que lleva al jugador.
//   4 · Bar del Jefe: todo mezclado, de noche y con más enemigos.
// Dibujo de tebeo por código (trazo grueso, color plano), sin imágenes nuevas.
import { W, FLOOR_Y } from './config.js';
import { FONT, outlinedText } from './fx.js';
import { TYPE_KEYS } from './enemies.js';
import { clamp } from './util.js';

const INK = '#1a1030';
const STAIN_COLORS = ['#8b4a20', '#c95b2c', '#e0a118', '#3bceac'];
const PRIZES = Object.freeze([
  { id: 'puntos', label: '¡PREMIO!', good: true },
  { id: 'turbo', label: '¡CAFÉ SOLO!', good: true },
  { id: 'antiacido', label: '¡ANTIÁCIDO!', good: true },
  { id: 'vida', label: '¡1UP!', good: true },
  { id: 'digestion', label: '¡DIGESTIÓN!', good: true },
  { id: 'secuaces', label: '¡OTRA RONDA!', good: false },
  { id: 'prisa', label: '¡LA CUENTA!', good: false },
  { id: 'cuenta', label: '¡EL CAMARERO!', good: false },
]);

/** Crea la mecánica de una fase. Devuelve null si la fase no es de campaña. */
export function createBarMechanic(stage, rng = Math.random) {
  if (!stage || !stage.mechanic) return null;
  const id = stage.mechanic;
  const mixed = id === 'mixto';
  const R = (a, b) => a + rng() * (b - a);
  const PICK = (arr) => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
  const has = (k) => mixed || id === k;

  const s = {
    id, t: 0, stains: [], balls: [], trays: [], bar: null,
    ballT: has('sorteos') ? R(2.5, 4) : Infinity,
    trayT: has('bandejas') ? R(2.2, 3.5) : Infinity,
    slipT: 0, prizes: 0,
  };

  function onStart(g) {
    const surfaces = g.plats.filter((p) => p.floor || p.y >= 400);
    if (has('manchas')) {
      const n = mixed ? 2 : 4;
      for (let i = 0; i < n; i++) {
        const p = surfaces[Math.floor(R(0, surfaces.length))];
        const w = R(96, 152);
        s.stains.push({
          x: clamp(p.x + 18 + R(0, Math.max(1, p.w - w - 36)), 8, W - w - 8),
          y: p.y, w,
          kind: i % 2 ? 'lento' : 'resbalon',
          color: STAIN_COLORS[i % STAIN_COLORS.length],
          ph: R(0, 6),
        });
      }
    }
    if (has('bandejas') && !s.bar) {
      // Plataforma móvil: se añade a la copia de g.plats de esta fase y NO a la
      // definición de la fase, para que las repeticiones no acumulen barras.
      s.bar = { x: 300, y: 430, w: 280, h: 18, vx: mixed ? 75 : 115, sliding: true };
      g.plats.push(s.bar);
    }
  }

  function onEnd(g) {
    if (s.bar) {
      const i = g.plats.indexOf(s.bar);
      if (i >= 0) g.plats.splice(i, 1);
      s.bar = null;
    }
    s.stains.length = 0; s.balls.length = 0; s.trays.length = 0;
  }

  function slideBar(dt, h) {
    const b = s.bar;
    if (!b) return;
    const dx = b.vx * dt;
    b.x += dx;
    if (b.x < 110) { b.x = 110; b.vx = Math.abs(b.vx); }
    if (b.x + b.w > W - 110) { b.x = W - 110 - b.w; b.vx = -Math.abs(b.vx); }
    const onBar = (o) => Math.abs(o.y + o.h - b.y) < 7 && o.x + o.w > b.x + 4 && o.x < b.x + b.w - 4;
    if (onBar(h.g.player)) h.g.player.x = clamp(h.g.player.x + dx, 0, W - h.g.player.w);
    for (const e of h.g.enemies) if (onBar(e)) e.x = clamp(e.x + dx, 0, W - e.w);
  }

  function applyStains(dt, h) {
    const p = h.g.player;
    if (!p.alive || !p.onGround) return;
    const dir = (h.input && h.input.held ? (h.input.held.right ? 1 : 0) - (h.input.held.left ? 1 : 0) : 0) || (p.vx < -5 ? -1 : p.vx > 5 ? 1 : p.facing);
    s.slipT = Math.max(0, s.slipT - dt);
    for (const st of s.stains) {
      if (Math.abs(p.y + p.h - st.y) > 9) continue;
      if (p.x + p.w < st.x || p.x > st.x + st.w) continue;
      if (st.kind === 'lento') p.vx *= 0.58;
      else {
        p.vx = clamp(p.vx + dir * 260 * dt, -460, 460);
        p.x = clamp(p.x + dir * 52 * dt, 0, W - p.w);
      }
      if (s.slipT <= 0) {
        s.slipT = 0.8;
        h.fx.text(p.x + p.w / 2, p.y - 20, st.kind === 'lento' ? '¡PLAF!' : '¡GLUP!', { size: 26, color: '#fff35c', life: 0.6 });
        h.audio.sfx('land');
      }
    }
  }

  function applyPrize(b, h) {
    const prize = PICK(PRIZES);
    const p = h.g.player;
    s.prizes++;
    h.fx.text(b.x, b.y - 46, prize.label, { size: 40, burst: true, color: prize.good ? '#7dff8a' : '#ff6b6b', life: 1.2 });
    h.fx.spark(b.x, b.y, 18, { hue: prize.good ? 120 : 10 });
    h.fx.confetti(b.x, b.y, prize.good ? 16 : 6, 0.6);
    h.audio.sfx(prize.good ? 'coin' : 'hurry');
    switch (prize.id) {
      case 'puntos': h.addScore(1500, b.x, b.y - 70, '#ffe14d', 34); break;
      case 'turbo': p.speedUp = 10; break;
      case 'antiacido': p.pow = 12; break;
      case 'vida': h.gainLife(); break;
      case 'digestion': p.held = []; p.heldT = 0; break;
      case 'secuaces':
        for (let i = 0; i < 2; i++) h.spawnFoe(TYPE_KEYS[Math.floor(R(0, TYPE_KEYS.length))], R(180, W - 180), FLOOR_Y);
        break;
      case 'prisa': h.setPrisa(); break;
      case 'cuenta': h.spawnChaser(); break;
      default: break;
    }
  }

  function updateBalls(dt, h) {
    const p = h.g.player;
    s.ballT -= dt;
    if (s.ballT <= 0 && s.balls.length < 2) {
      s.ballT = R(5.5, 8.5);
      s.balls.push({ x: R(180, W - 180), y: 90, vx: R(-70, 70), vy: 0, r: 24, t: 0, life: 16, dead: false });
      h.fx.text(W / 2, 150, '¡SORTEO!', { size: 36, color: '#4dd2ff', life: 1 });
      h.audio.sfx('letter');
    }
    for (const b of s.balls) {
      b.t += dt;
      b.vy += 950 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y + b.r >= FLOOR_Y) { b.y = FLOOR_Y - b.r; b.vy = -Math.abs(b.vy) * 0.72; }
      if (b.x < b.r || b.x > W - b.r) { b.x = clamp(b.x, b.r, W - b.r); b.vx *= -1; }
      if (p.alive && Math.abs(p.x + p.w / 2 - b.x) < p.w / 2 + b.r && Math.abs(p.y + p.h / 2 - b.y) < p.h / 2 + b.r) {
        b.dead = true; applyPrize(b, h);
      }
      if (b.t > b.life) b.dead = true;
    }
    s.balls = s.balls.filter((b) => !b.dead);
  }

  function updateTrays(dt, h) {
    const p = h.g.player;
    s.trayT -= dt;
    if (s.trayT <= 0 && s.trays.length < 4) {
      s.trayT = mixed ? R(4.5, 6) : R(2.8, 4.2);
      const fromRight = rng() < 0.5;
      s.trays.push({
        x: fromRight ? W + 40 : -40, y: PICK([FLOOR_Y - 78, 520, 400, 300]),
        vx: (fromRight ? -1 : 1) * R(240, 350), r: 27, t: 0, rot: 0, dead: false,
      });
    }
    for (const t of s.trays) {
      t.t += dt; t.rot += dt * 9;
      t.x += t.vx * dt;
      t.y += Math.sin(t.t * 4) * 60 * dt;
      if (t.x < -80 || t.x > W + 80 || t.t > 12) t.dead = true;
      if (!t.dead && p.alive && Math.abs(p.x + p.w / 2 - t.x) < p.w / 2 + t.r && Math.abs(p.y + p.h / 2 - t.y) < p.h / 2 + t.r) {
        t.dead = true;
        h.fx.text(t.x, t.y - 30, '¡PLAF!', { size: 40, burst: true, color: '#fff35c' });
        h.fx.shake(0.3);
        h.hurt();
      }
    }
    s.trays = s.trays.filter((t) => !t.dead);
  }

  function update(dt, h) {
    s.t += dt;
    if (has('bandejas')) slideBar(dt, h);
    if (has('manchas')) applyStains(dt, h);
    if (has('sorteos')) updateBalls(dt, h);
    if (has('bandejas')) updateTrays(dt, h);
  }

  function draw(ctx, time) {
    // Manchas:charco plano con brillo y trazo grueso.
    for (const st of s.stains) {
      ctx.save(); ctx.translate(st.x + st.w / 2, st.y - 2);
      ctx.fillStyle = st.color; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, st.w / 2, 10 + Math.sin(time * 2 + st.ph) * 1.5, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(-st.w * 0.18, -3, st.w * 0.12, 2.5, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(st.w * 0.2, 3, st.w * 0.08, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Barra deslizante: mostrada aquí porque la capa de plataformas es estática.
    if (s.bar) {
      const b = s.bar;
      ctx.save();
      ctx.fillStyle = 'rgba(10,5,30,0.3)'; ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h + 8);
      ctx.fillStyle = '#ecd9b0'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h + 8, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e2b443'; ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, 4);
      ctx.fillStyle = '#b15eff';
      for (let i = 0; i < 3; i++) ctx.fillRect(b.x + 40 + i * 80, b.y + 14, 16, 5);
      ctx.restore();
    }
    // Bolas de sorteo.
    for (const b of s.balls) {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.sin(time * 3 + b.t) * 0.25);
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff3b5c'; ctx.font = `30px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeText('?', 0, 1); ctx.fillText('?', 0, 1);
      ctx.restore();
    }
    // Bandejas giratorias.
    for (const t of s.trays) {
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.rot);
      ctx.fillStyle = '#d9e6ef'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(0, 0, t.r + 10, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff8e6';
      ctx.beginPath(); ctx.ellipse(-8, -6, 9, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8b4a20';
      ctx.beginPath(); ctx.roundRect(4, -12, 10, 12, 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  return {
    id, state: s, onStart, onEnd, update, draw,
    uses: has,
    get prizesCount() { return s.prizes; },
  };
}
