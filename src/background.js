// Fondo HD de La Moncloa, dibujado por código en estilo tebeo (contorno negro, colores planos con brillo).
// Cada «tema» (hora del día) se pre-renderiza una vez; lo animado se pinta cada frame.
// Los temas de juego (p. ej. «marcos») pueden sustituir las horas del día por
// fondos imagen propios con setImageBackgrounds({ barra: 'fondo-barra', ... }).
import { W, H, FLOOR_Y } from './config.js';
import { rand } from './util.js';
import { hasSprite, getSpriteImage } from './sprites.js';

const INK = '#1a1030';

// Fondos imagen del tema activo: nombre de fase → sprite (lo fija game.js).
let IMAGE_BG = null;
export function setImageBackgrounds(map) { IMAGE_BG = map || null; }
function knownBackground(name) {
  return !!THEMES[name] || !!(IMAGE_BG && IMAGE_BG[name] && hasSprite(IMAGE_BG[name]));
}

export const THEMES = {
  manana: { sky: ['#4f9bff', '#9fd0ff', '#ffe2b8'], sun: [170, 150, '#fff6c9'], tint: null, night: 0, hills: '#7fa6d9', cloud: '#ffffff' },
  mediodia: { sky: ['#2f7cf6', '#79bbff', '#cfeeff'], sun: [1030, 95, '#fffbe0'], tint: null, night: 0, hills: '#86b0e0', cloud: '#ffffff' },
  atardecer: { sky: ['#3a2a7a', '#ff6f6f', '#ffc56b'], sun: [1150, 250, '#ffb347'], tint: ['#ff8a4c', 0.22], night: 0.12, hills: '#8a4f7d', cloud: '#ffd0b0' },
  ocaso: { sky: ['#191542', '#5d3f96', '#ff9a7a'], sun: [120, 330, '#ff7b54'], tint: ['#5a3fa0', 0.32], night: 0.3, hills: '#3e2f6b', cloud: '#c7a3d9' },
  noche: { sky: ['#03061a', '#0d1946', '#27346e'], moon: [1040, 120], tint: ['#152060', 0.55], night: 0.58, hills: '#141a40', cloud: '#55608f' },
};

function canvas(w, h) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

function tree(g, x, y, r, dark, light) {
  g.fillStyle = '#6b4226'; g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); g.rect(x - r * 0.12, y - r * 0.9, r * 0.24, r * 0.9); g.fill(); g.stroke();
  const blobs = [[0, -1.35, 0.8], [-0.55, -1.05, 0.6], [0.55, -1.05, 0.62], [0, -1.85, 0.6]];
  g.beginPath();
  for (const [dx, dy, rr] of blobs) { g.moveTo(x + dx * r + rr * r, y + dy * r); g.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2); }
  g.fillStyle = dark; g.fill(); g.stroke();
  for (const [dx, dy, rr] of blobs) {
    const gr = g.createRadialGradient(x + dx * r - rr * r * 0.35, y + dy * r - rr * r * 0.4, 1, x + dx * r, y + dy * r, rr * r);
    gr.addColorStop(0, light); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x + dx * r, y + dy * r, rr * r * 0.95, 0, Math.PI * 2); g.fill();
  }
}

function cypress(g, x, y, h) {
  g.fillStyle = '#2f6b3a'; g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); g.moveTo(x, y - h); g.quadraticCurveTo(x + h * 0.2, y - h * 0.4, x + h * 0.12, y);
  g.lineTo(x - h * 0.12, y); g.quadraticCurveTo(x - h * 0.2, y - h * 0.4, x, y - h); g.fill(); g.stroke();
  g.fillStyle = 'rgba(160,230,140,0.35)'; g.beginPath(); g.ellipse(x - h * 0.04, y - h * 0.6, h * 0.04, h * 0.25, 0, 0, Math.PI * 2); g.fill();
}

function palace(g) {
  const stone = '#f4ead2', stoneD = '#d9c9a3', roof = '#b9503a', glass = '#3d6f9e';
  g.lineJoin = 'round'; g.strokeStyle = INK; g.lineWidth = 3.5;
  // Alas
  for (const [x0, x1] of [[230, 480], [800, 1050]]) {
    g.fillStyle = roof; g.beginPath(); g.moveTo(x0 - 14, 262); g.lineTo(x0 + 20, 228); g.lineTo(x1 - 20, 228); g.lineTo(x1 + 14, 262); g.closePath(); g.fill(); g.stroke();
    const gr = g.createLinearGradient(0, 262, 0, 470); gr.addColorStop(0, stone); gr.addColorStop(1, stoneD);
    g.fillStyle = gr; g.fillRect(x0, 262, x1 - x0, 208); g.strokeRect(x0, 262, x1 - x0, 208);
    g.fillStyle = stoneD; g.fillRect(x0 - 8, 262, x1 - x0 + 16, 14); g.strokeRect(x0 - 8, 262, x1 - x0 + 16, 14);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
      const wx = x0 + 22 + i * ((x1 - x0 - 44) / 5) + 6, wy = 296 + row * 86;
      g.fillStyle = stoneD; g.fillRect(wx - 5, wy - 8, 36, 64);
      g.fillStyle = glass; g.fillRect(wx, wy, 26, 52); g.strokeRect(wx, wy, 26, 52);
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(wx + 13, wy); g.lineTo(wx + 13, wy + 52); g.moveTo(wx, wy + 22); g.lineTo(wx + 26, wy + 22); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 3.5;
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(wx + 3, wy + 3, 7, 16);
    }
  }
  // Cuerpo central
  const gr = g.createLinearGradient(0, 210, 0, 470); gr.addColorStop(0, '#fff7e3'); gr.addColorStop(1, stoneD);
  g.fillStyle = gr; g.fillRect(470, 212, 340, 258); g.strokeRect(470, 212, 340, 258);
  // Frontón
  g.fillStyle = '#fff3d6'; g.beginPath(); g.moveTo(452, 214); g.lineTo(640, 128); g.lineTo(828, 214); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = stoneD; g.beginPath(); g.moveTo(492, 204); g.lineTo(640, 144); g.lineTo(788, 204); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#e8d9b0'; g.beginPath(); g.arc(640, 184, 16, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = stone; g.fillRect(452, 212, 376, 18); g.strokeRect(452, 212, 376, 18);
  // Columnas
  for (let i = 0; i < 8; i++) {
    const cx = 492 + i * 42;
    const cg = g.createLinearGradient(cx - 11, 0, cx + 11, 0); cg.addColorStop(0, '#d8c8a2'); cg.addColorStop(0.45, '#fffaf0'); cg.addColorStop(1, '#c9b78d');
    g.fillStyle = cg; g.fillRect(cx - 11, 238, 22, 196); g.strokeRect(cx - 11, 238, 22, 196);
    g.fillStyle = stone; g.fillRect(cx - 16, 230, 32, 10); g.strokeRect(cx - 16, 230, 32, 10); g.fillRect(cx - 15, 432, 30, 10); g.strokeRect(cx - 15, 432, 30, 10);
  }
  // Puerta y escalinata
  g.fillStyle = '#5a3420'; g.beginPath(); g.moveTo(612, 440); g.lineTo(612, 360); g.arc(640, 360, 28, Math.PI, 0); g.lineTo(668, 440); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#e0b84a'; g.beginPath(); g.arc(660, 400, 3.5, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? stoneD : stone; g.fillRect(500 - i * 14, 442 + i * 7, 280 + i * 28, 7); g.strokeRect(500 - i * 14, 442 + i * 7, 280 + i * 28, 7); }
  // Mástil
  g.fillStyle = '#ddd'; g.fillRect(637, 60, 6, 72); g.strokeRect(637, 60, 6, 72);
  g.fillStyle = '#e8c547'; g.beginPath(); g.arc(640, 58, 6, 0, Math.PI * 2); g.fill(); g.stroke();
}

function gardens(g) {
  // Césped
  const lg = g.createLinearGradient(0, 466, 0, FLOOR_Y); lg.addColorStop(0, '#79c35a'); lg.addColorStop(1, '#3f8f3d');
  g.fillStyle = lg; g.fillRect(0, 466, W, FLOOR_Y - 466);
  // Camino en perspectiva
  g.fillStyle = '#e9d3a3'; g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); g.moveTo(590, 470); g.lineTo(690, 470); g.lineTo(880, FLOOR_Y); g.lineTo(400, FLOOR_Y); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(160,120,70,0.35)'; g.lineWidth = 2;
  for (let i = 1; i < 6; i++) { const y = 470 + i * 30; const k = (y - 470) / (FLOOR_Y - 470); g.beginPath(); g.moveTo(590 - 190 * k, y); g.lineTo(690 + 190 * k, y); g.stroke(); }
  // Setos
  g.strokeStyle = INK; g.lineWidth = 3;
  for (const [x0, x1, y, h] of [[20, 560, 520, 26], [720, 1260, 520, 26], [0, 470, 590, 34], [810, W, 590, 34]]) {
    const hg = g.createLinearGradient(0, y - h, 0, y); hg.addColorStop(0, '#5fb04a'); hg.addColorStop(1, '#2c6e30');
    g.fillStyle = hg; g.beginPath(); g.roundRect(x0, y - h, x1 - x0, h, 10); g.fill(); g.stroke();
  }
  // Fuente
  g.fillStyle = '#cfd8e3'; g.beginPath(); g.ellipse(640, 548, 92, 22, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#58a7e8'; g.beginPath(); g.ellipse(640, 545, 78, 15, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e6edf5'; g.fillRect(630, 500, 20, 44); g.strokeRect(630, 500, 20, 44);
  g.beginPath(); g.ellipse(640, 500, 30, 8, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  // Árboles
  for (const [x, y, r] of [[60, 470, 52], [150, 478, 46], [1140, 478, 46], [1225, 470, 54], [330, 500, 34], [950, 500, 34]]) tree(g, x, y, r, '#3f8f3d', 'rgba(190,255,150,0.75)');
  for (const x of [400, 440, 840, 880]) cypress(g, x, 476, 110);
}

function floorBand(g) {
  // Terraza de mármol (suelo jugable)
  const fg = g.createLinearGradient(0, FLOOR_Y, 0, H); fg.addColorStop(0, '#c9a77a'); fg.addColorStop(1, '#7d5a3c');
  g.fillStyle = fg; g.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  for (let i = 0; i < 26; i++) for (let j = 0; j < 2; j++) {
    if ((i + j) % 2) continue;
    g.fillStyle = 'rgba(255,240,215,0.18)'; g.fillRect(i * 50, FLOOR_Y + 14 + j * 34, 50, 34);
  }
  g.fillStyle = '#efe0c0'; g.fillRect(0, FLOOR_Y, W, 14);
  g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(0, FLOOR_Y); g.lineTo(W, FLOOR_Y); g.moveTo(0, FLOOR_Y + 14); g.lineTo(W, FLOOR_Y + 14); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(0, FLOOR_Y + 2, W, 3);
}

function renderTheme(name) {
  const th = THEMES[name];
  const c = canvas(W, H); if (!c) return null;
  const g = c.getContext('2d');
  // Fondo imagen del tema de juego (barra de bar, terraza...): se dibuja tal cual.
  if (!th) {
    const spr = IMAGE_BG && IMAGE_BG[name];
    const img = spr && getSpriteImage(spr);
    if (img) { g.drawImage(img, 0, 0, W, H); return c; }
    return null;
  }
  const sky = g.createLinearGradient(0, 0, 0, 470);
  sky.addColorStop(0, th.sky[0]); sky.addColorStop(0.55, th.sky[1]); sky.addColorStop(1, th.sky[2]);
  g.fillStyle = sky; g.fillRect(0, 0, W, 480);
  if (th.sun) {
    const [sx, sy, col] = th.sun; const sg = g.createRadialGradient(sx - 12, sy - 14, 4, sx, sy, 44);
    sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.4, col); sg.addColorStop(1, '#ffb627');
    g.fillStyle = sg; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy, 42, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  if (th.moon) {
    for (let i = 0; i < 140; i++) { g.globalAlpha = rand(0.3, 1); g.fillStyle = '#fff'; const r = rand(0.8, 2.4); g.fillRect(rand(0, W), rand(0, 330), r, r); }
    g.globalAlpha = 1;
    const [mx, my] = th.moon;
    g.fillStyle = '#f4f1dc'; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.arc(mx, my, 40, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(180,170,140,0.5)'; for (const [dx, dy, r] of [[-12, -8, 8], [14, 10, 6], [4, -18, 4]]) { g.beginPath(); g.arc(mx + dx, my + dy, r, 0, Math.PI * 2); g.fill(); }
  }
  // Montañas lejanas (sierra)
  g.fillStyle = th.hills;
  g.beginPath(); g.moveTo(0, 400);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, 330 + Math.sin(x * 0.011) * 38 + Math.sin(x * 0.031) * 16);
  g.lineTo(W, 480); g.lineTo(0, 480); g.fill();
  g.globalAlpha = 0.5; g.fillStyle = th.sky[2]; g.fillRect(0, 380, W, 100); g.globalAlpha = 1;
  // Palacio + jardines
  const p = canvas(W, H); const pg = p.getContext('2d');
  palace(pg); gardens(pg);
  if (th.tint) { pg.globalCompositeOperation = 'source-atop'; pg.fillStyle = th.tint[0]; pg.globalAlpha = th.tint[1]; pg.fillRect(0, 0, W, H); pg.globalAlpha = 1; pg.globalCompositeOperation = 'source-over'; }
  g.drawImage(p, 0, 0);
  // Ventanas encendidas al anochecer
  if (th.night > 0.25) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [x0, x1] of [[230, 480], [800, 1050]]) for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
      if ((i + row * 3 + x0) % 4 === 0) continue;
      const wx = x0 + 22 + i * ((x1 - x0 - 44) / 5) + 6, wy = 296 + row * 86;
      const wg = g.createRadialGradient(wx + 13, wy + 26, 2, wx + 13, wy + 26, 46);
      wg.addColorStop(0, 'rgba(255,214,120,0.9)'); wg.addColorStop(1, 'rgba(255,170,60,0)');
      g.fillStyle = wg; g.fillRect(wx - 34, wy - 22, 94, 96);
      g.fillStyle = 'rgba(255,220,140,0.85)'; g.fillRect(wx, wy, 26, 52);
    }
    g.restore();
  }
  floorBand(g);
  if (th.tint) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = th.tint[0]; g.globalAlpha = th.tint[1] * 0.6; g.fillRect(0, FLOOR_Y, W, H - FLOOR_Y); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  return c;
}

export function createBackground() {
  const cache = new Map();
  const clouds = Array.from({ length: 7 }, (_, i) => ({ x: rand(0, W), y: rand(40, 250), s: rand(0.6, 1.3), v: rand(8, 22), i }));
  const birds = Array.from({ length: 5 }, () => ({ x: rand(-200, W), y: rand(80, 220), v: rand(40, 70), p: rand(0, 6) }));
  const drops = [];
  let theme = 'manana';

  function cloud(ctx, x, y, s, color, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = alpha;
    ctx.fillStyle = color; ctx.strokeStyle = 'rgba(26,16,48,0.55)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (const [dx, dy, r] of [[-50, 8, 30], [-16, -10, 40], [26, -2, 34], [58, 10, 24]]) { ctx.moveTo(dx + r, dy); ctx.arc(dx, dy, r, 0, Math.PI * 2); }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-22, -20, 16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function flag(ctx, t) {
    const x0 = 643, y0 = 64, fw = 64, fh = 42;
    const pts = (yy) => { const arr = []; for (let i = 0; i <= 16; i++) { const x = i / 16; arr.push([x0 + x * fw, y0 + yy + Math.sin(t * 6 - x * 6) * 5 * x]); } return arr; };
    const bands = [[0, fh / 4, '#c60b1e'], [fh / 4, fh * 3 / 4, '#ffc400'], [fh * 3 / 4, fh, '#c60b1e']];
    for (const [a, b, col] of bands) {
      const top = pts(a), bot = pts(b);
      ctx.fillStyle = col; ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.fill();
    }
    const top = pts(0), bot = pts(fh);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath(); ctx.stroke();
  }

  return {
    get theme() { return theme; },
    setImageBackgrounds(m) { IMAGE_BG = m || null; cache.clear(); },
    setTheme(name) { theme = knownBackground(name) ? name : 'manana'; if (!cache.has(theme)) cache.set(theme, renderTheme(theme)); },
    nightLevel() { return THEMES[theme] ? THEMES[theme].night : 0; },
    update(dt) {
      for (const c of clouds) { c.x += c.v * dt; if (c.x > W + 160) { c.x = -160; c.y = rand(40, 250); } }
      for (const b of birds) { b.x += b.v * dt; b.p += dt * 9; if (b.x > W + 60) { b.x = -rand(60, 400); b.y = rand(80, 220); } }
      if (THEMES[theme] && Math.random() < dt * 40) drops.push({ x: 640 + rand(-6, 6), y: 492, vx: rand(-70, 70), vy: rand(-260, -160), t: 0 });
      for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.t += dt; d.vy += 700 * dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.y > 545) drops.splice(i, 1); }
    },
    draw(ctx, t) {
      const th = THEMES[theme];
      const base = cache.get(theme);
      if (base) ctx.drawImage(base, 0, 0);
      // Fondo imagen de un tema de juego: sin nubes, pájaros ni bandera.
      if (!th) return;
      // Astro
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (th.sun) {
        const [sx, sy, col] = th.sun;
        const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 260);
        glow.addColorStop(0, col); glow.addColorStop(0.25, 'rgba(255,230,160,0.35)'); glow.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = glow; ctx.fillRect(sx - 260, sy - 260, 520, 520);
        ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff6d0';
        for (let i = 0; i < 12; i++) { const a = t * 0.15 + (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, 330, a, a + 0.12); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      if (th.moon) {
        const [mx, my] = th.moon;
        const glow = ctx.createRadialGradient(mx, my, 10, mx, my, 180);
        glow.addColorStop(0, 'rgba(220,230,255,0.6)'); glow.addColorStop(1, 'rgba(120,140,255,0)');
        ctx.fillStyle = glow; ctx.fillRect(mx - 180, my - 180, 360, 360);
      }
      ctx.restore();
      for (const c of clouds) cloud(ctx, c.x, c.y, c.s, th.cloud, th.moon ? 0.45 : 0.95);
      if (!th.moon) {
        ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
        for (const b of birds) { const f = Math.sin(b.p) * 6; ctx.beginPath(); ctx.moveTo(b.x - 10, b.y - f); ctx.quadraticCurveTo(b.x - 4, b.y - 4, b.x, b.y); ctx.quadraticCurveTo(b.x + 4, b.y - 4, b.x + 10, b.y - f); ctx.stroke(); }
      }
      flag(ctx, t);
      ctx.fillStyle = 'rgba(170,215,255,0.9)';
      for (const d of drops) { ctx.beginPath(); ctx.arc(d.x, d.y, 2.5, 0, Math.PI * 2); ctx.fill(); }
      // Focos de noche
      if (th.night > 0.4) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const [x, ph] of [[300, 0], [980, 2]]) {
          const a = -Math.PI / 2 + Math.sin(t * 0.6 + ph) * 0.5;
          const gr = ctx.createRadialGradient(x, 470, 10, x, 470, 520);
          gr.addColorStop(0, 'rgba(200,220,255,0.28)'); gr.addColorStop(1, 'rgba(200,220,255,0)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x, 470); ctx.arc(x, 470, 520, a - 0.09, a + 0.09); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    },
  };
}

/** Dibuja las plataformas de una fase en una capa cacheada (cornisas de piedra con remate dorado). */
export function renderPlatforms(platforms, themeName) {
  const c = canvas(W, H); if (!c) return null;
  const g = c.getContext('2d');
  const th = THEMES[themeName] || THEMES.manana;
  for (const p of platforms) {
    if (p.floor) continue;
    g.fillStyle = 'rgba(10,5,30,0.28)'; g.beginPath(); g.roundRect(p.x + 8, p.y + 12, p.w, p.h + 6, 8); g.fill();
    const gr = g.createLinearGradient(0, p.y, 0, p.y + p.h + 10);
    gr.addColorStop(0, '#fff8e6'); gr.addColorStop(0.35, '#ecd9b0'); gr.addColorStop(1, '#b89a6a');
    g.fillStyle = gr; g.strokeStyle = INK; g.lineWidth = 4; g.lineJoin = 'round';
    g.beginPath(); g.roundRect(p.x, p.y, p.w, p.h + 8, 7); g.fill(); g.stroke();
    g.fillStyle = '#e2b443'; g.fillRect(p.x + 3, p.y + 4, p.w - 6, 4);
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(p.x + 8, p.y + 2, p.w - 16, 2);
    g.fillStyle = '#a0825a';
    for (let x = p.x + 12; x < p.x + p.w - 12; x += 18) { g.fillRect(x, p.y + p.h + 1, 9, 6); }
    g.strokeStyle = 'rgba(26,16,48,0.6)'; g.lineWidth = 2;
    for (let x = p.x + 12; x < p.x + p.w - 12; x += 18) g.strokeRect(x, p.y + p.h + 1, 9, 6);
    if (th.tint) { g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = th.tint[1] * 0.7; g.fillStyle = th.tint[0]; g.fillRect(p.x - 2, p.y - 2, p.w + 14, p.h + 24); g.restore(); }
  }
  return c;
}
