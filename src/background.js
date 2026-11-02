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

/* ---------------------------------------------------------------------------
 * E1 · Muebles de bar como plataformas (issue #96)
 * Las plataformas del tema «Dieta de Marcos» llevan un `kind` (taburete, barra,
 * mesa…). Aquí se dibujan con el arte E1 (WebP con alfa) si está cargado y, si
 * no, con un provisional por código con las mismas formas y colores (nunca
 * bloques negros). El alto de cada mueble es fijo y las piezas se repiten a lo
 * ancho de la plataforma, así un taburete no se estira como una barra.
 * Raíz del sistema de colisiones (src/physics.js) sin tocar: sigue siendo de un
 * solo sentido y la superficie de apoyo es `p.y`.
 * ------------------------------------------------------------------------- */
export const FURNITURE = {
  barra: { art: 'mueble-barra', h: 118, aspect: 0.46, maxUnits: 3, stretch: 3 },
  taburete: { art: 'mueble-taburete-bajo', h: 92, aspect: 1.76, maxUnits: 5 },
  'taburete-alto': { art: 'mueble-taburete-alto', h: 116, aspect: 2.18, maxUnits: 5 },
  mesa: { art: 'mueble-mesa', h: 104, aspect: 1.02, maxUnits: 6 },
  silla: { art: 'mueble-silla', h: 96, aspect: 2.32, maxUnits: 6 },
  estante: { art: 'mueble-estante-botellas', h: 126, aspect: 0.7, maxUnits: 3, stretch: 1.5 },
  caja: { art: 'mueble-caja-cerveza', h: 68, aspect: 0.97, maxUnits: 6 },
  nevera: { art: 'mueble-nevera', h: 136, aspect: 1.51, maxUnits: 3 },
  toldo: { art: 'mueble-toldo-terraza', h: 96, aspect: 0.51, maxUnits: 3, stretch: 2.4 },
  mostrador: { art: 'mueble-mostrador-mercado', h: 110, aspect: 0.9, maxUnits: 3, stretch: 1.8 },
  // El barril todavía no tiene PNG (cupo de imágenes agotado): solo por código.
  barril: { art: null, h: 92, aspect: 1.3, maxUnits: 4 },
};

/** ¿Es un mueble de bar conocido? */
export function isFurniture(kind) { return !!FURNITURE[kind]; }

/**
 * Piezas de un mueble: divide el ancho de la plataforma en trozos del tamaño
 * natural del dibujo. Devuelve [{ x, y, w, h }] con la superficie en y = p.y.
 */
export function furnitureUnits(p) {
  const spec = FURNITURE[p.kind];
  if (!spec) return [];
  const unitW = spec.h / spec.aspect;
  // Piezas continuas (barra, mostrador, toldo, estante): una sola pieza estirada
  // mientras no sea desmesurada; si es muy larga, se repite como el resto.
  if (spec.stretch && p.w / unitW <= spec.stretch && p.w >= unitW * 0.6) {
    return [{ x: p.x, y: p.y, w: p.w, h: spec.h, i: 0, n: 1 }];
  }
  // Piezas sueltas (taburetes, mesas, cajas…): se repiten a tamaño natural
  // repartiendo el hueco que sobra como separación entre ellas.
  const n = Math.max(1, Math.min(spec.maxUnits || 4, Math.round(p.w / unitW)));
  const w = Math.min(unitW, p.w / n);
  const h = w * spec.aspect;
  const gap = Math.max(0, (p.w - n * w) / (n + 1));
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: p.x + gap + i * (w + gap), y: p.y, w, h, i, n });
  return out;
}

const WOOD = '#b5793a'; const WOOD_D = '#8a5a2b'; const WOOD_L = '#d9a05b';
const STEEL = '#c9d4e0'; const GLASS = 'rgba(180,225,245,0.55)';
const CLOTH_R = '#d92b3a'; const CLOTH_W = '#fff5e6'; const GREEN = '#3f8f4a';

/** Dibujo provisional por código de cada mueble (mismo encuadre que el PNG). */
function drawFurnitureCode(g, kind, w, h) {
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = INK; g.lineWidth = Math.max(2, Math.min(4, w * 0.05));
  const ink = g.lineWidth;
  const rr = (x, y, ww, hh, r) => { g.beginPath(); g.roundRect(x, y, ww, hh, r); };
  const plank = (x, y, ww, hh, light = WOOD, dark = WOOD_D) => {
    const gr = g.createLinearGradient(0, y, 0, y + hh);
    gr.addColorStop(0, light); gr.addColorStop(1, dark);
    g.fillStyle = gr; rr(x, y, ww, hh, Math.min(4, ww * 0.08)); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(x + ww * 0.12, y + hh * 0.16, ww * 0.76, Math.max(1, hh * 0.08));
  };
  const seat = (y, hh, col) => {
    g.fillStyle = col; g.beginPath(); g.ellipse(w / 2, y, w * 0.46, hh, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.beginPath(); g.ellipse(w * 0.42, y - hh * 0.3, w * 0.18, hh * 0.22, -0.2, 0, Math.PI * 2); g.fill();
  };
  const bottle = (x, y, bw, bh, col) => {
    g.fillStyle = col; rr(x, y, bw, bh, bw * 0.35); g.fill(); g.stroke();
    g.fillRect(x + bw * 0.32, y - bh * 0.3, bw * 0.36, bh * 0.32); g.strokeRect(x + bw * 0.32, y - bh * 0.3, bw * 0.36, bh * 0.32);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + bw * 0.16, y + bh * 0.12, bw * 0.14, bh * 0.6);
  };

  switch (kind) {
    case 'taburete':
    case 'taburete-alto': {
      const alto = kind === 'taburete-alto';
      const seatY = h * 0.14;
      // Patas (con aro reposapiés)
      g.strokeStyle = alto ? '#8d99a8' : WOOD_D; g.lineWidth = Math.max(2, w * 0.1);
      for (const k of [0.22, 0.78]) {
        g.beginPath(); g.moveTo(w * k, seatY + h * 0.06); g.lineTo(w * (k + (k < 0.5 ? 0.06 : -0.06)), h * 0.98); g.stroke();
      }
      g.lineWidth = Math.max(1.5, w * 0.07);
      g.beginPath(); g.moveTo(w * 0.16, h * 0.72); g.lineTo(w * 0.84, h * 0.72); g.stroke();
      if (alto) {
        g.strokeStyle = '#8d99a8'; g.lineWidth = Math.max(2, w * 0.08);
        g.beginPath(); g.moveTo(w * 0.18, seatY + h * 0.02); g.quadraticCurveTo(w * 0.05, h * 0.1, w * 0.12, -h * 0.02); g.stroke();
        g.fillStyle = WOOD;
        g.beginPath(); g.ellipse(w * 0.3, -h * 0.02, w * 0.28, h * 0.07, -0.15, 0, Math.PI * 2); g.fill();
        g.strokeStyle = INK; g.lineWidth = ink; g.stroke();
      }
      g.strokeStyle = INK; g.lineWidth = ink;
      seat(seatY, h * 0.11, alto ? '#b3122d' : CLOTH_R);
      if (alto) {
        g.fillStyle = '#d8d2c4';
        g.beginPath(); g.ellipse(w / 2, seatY + h * 0.075, w * 0.44, h * 0.03, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        for (let i = 0; i < 5; i++) { g.fillStyle = '#ffd76b'; g.beginPath(); g.arc(w * (0.2 + i * 0.15), seatY + h * 0.02, Math.max(1, w * 0.025), 0, Math.PI * 2); g.fill(); }
      }
      break;
    }
    case 'barra': {
      plank(0, 0, w, h * 0.2, WOOD_L, WOOD);
      g.fillStyle = '#f4f1e6'; g.strokeRect(0, h * 0.2, w, h * 0.62);
      g.strokeStyle = 'rgba(60,90,160,0.5)'; g.lineWidth = 1;
      for (let x = 0; x < w; x += w / 7) g.beginPath(), g.moveTo(x, h * 0.2), g.lineTo(x, h * 0.82), g.stroke();
      for (let y = h * 0.2 + h * 0.12; y < h * 0.82; y += h * 0.16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = ink;
      g.fillStyle = '#e2b443'; g.fillRect(0, h * 0.24, w, Math.max(2, h * 0.05)); g.strokeRect(0, h * 0.24, w, Math.max(2, h * 0.05));
      g.fillStyle = '#e2b443'; g.fillRect(0, h * 0.7, w, Math.max(3, h * 0.07)); g.strokeRect(0, h * 0.7, w, Math.max(3, h * 0.07));
      plank(0, h * 0.82, w, h * 0.16, WOOD, WOOD_D);
      g.fillStyle = '#f4f1e6'; g.fillRect(w * 0.06, h * 0.2, w * 0.88, h * 0.07);
      g.fillStyle = 'rgba(60,90,160,0.55)'; for (let x = w * 0.08; x < w * 0.92; x += w * 0.14) { g.beginPath(); g.ellipse(x, h * 0.235, w * 0.03, h * 0.02, 0, 0, Math.PI * 2); g.fill(); }
      // Un grifo de cerveza asomando
      g.fillStyle = '#e2b443'; g.fillRect(w * 0.2, -h * 0.16, w * 0.07, h * 0.18); g.strokeRect(w * 0.2, -h * 0.16, w * 0.07, h * 0.18);
      g.fillStyle = INK; g.fillRect(w * 0.215, -h * 0.24, w * 0.04, h * 0.09);
      break;
    }
    case 'mesa': {
      const clothH = h * 0.5;
      g.fillStyle = CLOTH_R; rr(-w * 0.02, 0, w * 1.04, clothH, 6); g.fill(); g.stroke();
      g.fillStyle = CLOTH_W;
      for (let y = 0; y < clothH; y += clothH / 3.2) for (let x = 0; x < w; x += w / 3.2) {
        if (((x / (w / 3.2)) | 0) % 2 === ((y / (clothH / 3.2)) | 0) % 2) continue;
        g.fillRect(x + 1, y + 1, w / 3.2 - 1, clothH / 3.2 - 1);
      }
      g.fillStyle = CLOTH_R;
      g.beginPath();
      g.moveTo(-w * 0.02, clothH);
      for (let x = 0; x <= w; x += w / 6) g.quadraticCurveTo(x + w / 12, clothH + h * 0.08, x + w / 6, clothH);
      g.lineTo(w * 1.02, clothH); g.lineTo(w * 1.02, clothH * 0.9); g.lineTo(-w * 0.02, clothH * 0.9); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = INK; g.lineWidth = Math.max(2, w * 0.05);
      g.beginPath(); g.moveTo(w * 0.28, h * 0.62); g.lineTo(w * 0.72, h * 0.98); g.moveTo(w * 0.72, h * 0.62); g.lineTo(w * 0.28, h * 0.98); g.stroke();
      g.fillStyle = '#2e7d61'; g.fillRect(w * 0.42, -h * 0.3, w * 0.1, h * 0.3); g.strokeRect(w * 0.42, -h * 0.3, w * 0.1, h * 0.3);
      break;
    }
    case 'silla': {
      g.strokeStyle = INK; g.lineWidth = ink;
      g.beginPath(); g.moveTo(w * 0.18, h * 0.05); g.lineTo(w * 0.18, h * 0.98); g.moveTo(w * 0.82, h * 0.55); g.lineTo(w * 0.88, h * 0.98); g.stroke();
      g.strokeStyle = WOOD_D; g.lineWidth = Math.max(2, w * 0.1);
      g.beginPath(); g.moveTo(w * 0.18, h * 0.05); g.lineTo(w * 0.18, h * 0.98); g.stroke();
      g.strokeStyle = WOOD; g.lineWidth = Math.max(2, w * 0.09);
      g.beginPath(); g.moveTo(w * 0.18, h * 0.92); g.lineTo(w * 0.85, h * 0.92); g.stroke();
      g.strokeStyle = WOOD_D;
      for (let y = h * 0.12; y < h * 0.45; y += h * 0.11) { g.beginPath(); g.moveTo(w * 0.18, y); g.lineTo(w * 0.62, y + h * 0.01); g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = ink;
      g.fillStyle = WOOD; g.beginPath(); g.ellipse(w * 0.5, h * 0.55, w * 0.34, h * 0.06, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      break;
    }
    case 'estante': {
      g.fillStyle = WOOD; g.strokeStyle = INK; g.lineWidth = ink;
      g.fillRect(0, 0, w * 0.08, h); g.strokeRect(0, 0, w * 0.08, h);
      g.fillRect(w * 0.92, 0, w * 0.08, h); g.strokeRect(w * 0.92, 0, w * 0.08, h);
      const cols = ['#4b8f4a', '#f2c14e', '#4d9bd8', '#2f6b40', '#e08a2e', '#b3122d', '#7f5fa8'];
      for (const [row, sy] of [[0, h * 0.06], [1, h * 0.56]]) {
        g.fillStyle = WOOD_L; g.fillRect(0, sy + h * 0.34, w, h * 0.1);
        g.strokeStyle = INK; g.strokeRect(0, sy + h * 0.34, w, h * 0.1);
        for (let i = 0; i < 4; i++) bottle(w * (0.14 + i * 0.2), sy + h * 0.08, w * 0.09, h * 0.26, cols[(i + row * 3) % cols.length]);
      }
      break;
    }
    case 'caja': {
      g.fillStyle = '#d92b2b'; g.strokeStyle = INK; g.lineWidth = ink;
      rr(w * 0.04, h * 0.3, w * 0.92, h * 0.68, 3); g.fill(); g.stroke();
      g.fillStyle = 'rgba(90,10,10,0.45)';
      for (const k of [0.18, 0.5, 0.82]) g.fillRect(w * k, h * 0.42, w * 0.08, h * 0.46);
      g.fillStyle = '#8b1f1f'; g.fillRect(w * 0.3, h * 0.36, w * 0.4, h * 0.16); g.strokeRect(w * 0.3, h * 0.36, w * 0.4, h * 0.16);
      for (const k of [0.2, 0.42, 0.64, 0.86]) {
        g.fillStyle = '#2e7d32'; rr(w * k - w * 0.06, h * 0.02, w * 0.12, h * 0.32, 3); g.fill(); g.stroke();
        g.fillStyle = '#c8e6c9'; g.fillRect(w * k - w * 0.035, h * 0.005, w * 0.07, h * 0.05);
      }
      break;
    }
    case 'nevera': {
      g.fillStyle = '#f6fbff'; g.strokeStyle = INK; g.lineWidth = ink;
      rr(w * 0.04, 0, w * 0.92, h, h * 0.06); g.fill(); g.stroke();
      g.fillStyle = GLASS; rr(w * 0.12, h * 0.08, w * 0.62, h * 0.84, h * 0.03); g.fill(); g.stroke();
      const cols = ['#e0a118', '#b3122d', '#4b8f4a', '#4d9bd8'];
      for (let row = 0; row < 3; row++) for (let i = 0; i < 3; i++) bottle(w * (0.16 + i * 0.18), h * (0.2 + row * 0.26), w * 0.1, h * 0.16, cols[(i + row) % cols.length]);
      g.fillStyle = '#cfd8e3'; rr(w * 0.8, h * 0.2, w * 0.08, h * 0.5, h * 0.03); g.fill(); g.stroke();
      g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(w * 0.5, h * 0.06, h * 0.045, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#8d99a8'; g.fillRect(w * 0.14, h * 0.98, w * 0.14, h * 0.05); g.fillRect(w * 0.72, h * 0.98, w * 0.14, h * 0.05);
      break;
    }
    case 'toldo': {
      const top = h * 0.12; const bottom = h * 0.5;
      g.save();
      g.beginPath(); g.moveTo(w * 0.02, top); g.lineTo(w * 0.98, top); g.lineTo(w, bottom); g.lineTo(0, bottom); g.closePath();
      g.fillStyle = CLOTH_W; g.fill(); g.strokeStyle = INK; g.lineWidth = ink; g.stroke(); g.clip();
      g.fillStyle = CLOTH_R;
      for (let x = 0; x < w; x += w / 5) g.fillRect(x, top, w / 10, bottom - top + 2);
      g.restore();
      g.fillStyle = CLOTH_W; g.strokeStyle = INK; g.lineWidth = ink;
      g.beginPath(); g.moveTo(0, bottom);
      for (let x = 0; x <= w; x += w / 10) g.quadraticCurveTo(x + w / 20, bottom + h * 0.09, x + w / 10, bottom);
      g.lineTo(w, bottom - h * 0.02); g.lineTo(0, bottom - h * 0.02); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = CLOTH_R;
      for (let x = 0; x < w; x += w / 5) { g.beginPath(); g.ellipse(x + w / 20, bottom + h * 0.03, w / 24, h * 0.03, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#cfd8e3'; g.strokeStyle = INK; g.lineWidth = ink;
      for (const k of [0.07, 0.93]) { g.fillRect(w * k - w * 0.02, top, w * 0.04, h * 0.49); g.strokeRect(w * k - w * 0.02, top, w * 0.04, h * 0.49); }
      break;
    }
    case 'mostrador': {
      g.fillStyle = GREEN; g.strokeStyle = INK; g.lineWidth = ink;
      g.beginPath(); g.moveTo(0, h * 0.18); g.lineTo(w, h * 0.18); g.lineTo(w, h * 0.36); g.lineTo(0, h * 0.36); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = CLOTH_W; for (let x = w * 0.05; x < w; x += w * 0.2) g.fillRect(x, h * 0.18, w * 0.1, h * 0.18);
      plank(0, h * 0.34, w, h * 0.18, WOOD_L, WOOD);
      const fruit = ['#ff8a1e', '#e0332e', '#7ac043', '#f2c14e'];
      for (let i = 0; i < 4; i++) {
        g.fillStyle = WOOD_D; g.fillRect(w * (0.05 + i * 0.24), h * 0.44, w * 0.18, h * 0.12);
        g.strokeStyle = INK; g.strokeRect(w * (0.05 + i * 0.24), h * 0.44, w * 0.18, h * 0.12);
        g.fillStyle = fruit[i];
        for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(w * (0.09 + i * 0.24 + (k % 2) * 0.07), h * (0.435 - Math.floor(k / 2) * 0.05), Math.max(2, w * 0.028), 0, Math.PI * 2); g.fill(); }
      }
      plank(0, h * 0.62, w, h * 0.38, WOOD, WOOD_D);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      for (let x = w * 0.08; x < w * 0.95; x += w * 0.22) g.fillRect(x, h * 0.7, w * 0.14, h * 0.05);
      break;
    }
    case 'barril': {
      g.fillStyle = WOOD; g.strokeStyle = INK; g.lineWidth = ink;
      g.beginPath();
      g.moveTo(w * 0.1, h * 0.06); g.quadraticCurveTo(-w * 0.04, h * 0.5, w * 0.1, h * 0.94);
      g.lineTo(w * 0.9, h * 0.94); g.quadraticCurveTo(w * 1.04, h * 0.5, w * 0.9, h * 0.06); g.closePath();
      g.fill(); g.stroke();
      g.strokeStyle = WOOD_D; g.lineWidth = Math.max(1, w * 0.04);
      for (const k of [0.32, 0.5, 0.68]) { g.beginPath(); g.moveTo(w * 0.06, h * k); g.lineTo(w * 0.94, h * k); g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = Math.max(2, w * 0.07);
      for (const k of [0.24, 0.76]) { g.beginPath(); g.moveTo(w * 0.07, h * k); g.lineTo(w * 0.93, h * k); g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = ink;
      g.fillStyle = '#e2b443'; g.beginPath(); g.ellipse(w * 0.5, h * 0.06, w * 0.4, h * 0.05, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#c9a227'; g.fillRect(w * 0.42, h * 0.52, w * 0.16, h * 0.1); g.strokeRect(w * 0.42, h * 0.52, w * 0.16, h * 0.1);
      break;
    }
    default: {
      // Desconocido: tabla de madera honesta (nunca un bloque negro).
      plank(0, 0, w, Math.max(8, h * 0.3), WOOD_L, WOOD);
      break;
    }
  }
  g.restore();
}

/**
 * Dibuja UNA plataforma con forma de mueble de bar (sprite E1 si está cargado,
 * provisional por código si no). Lo usan la capa de plataformas y la barra
 * deslizante del Bar Pols.
 */
export function drawFurniturePlatform(ctx, p) {
  const spec = FURNITURE[p.kind];
  if (!spec) return false;
  const units = furnitureUnits(p);
  const img = spec.art ? getSpriteImage(spec.art) : null;
  ctx.save();
  ctx.fillStyle = 'rgba(10,5,30,0.22)';
  ctx.beginPath(); ctx.roundRect(p.x + 6, p.y + 8, p.w, 12, 6); ctx.fill();
  for (const u of units) {
    const uw = u.w + 1;
    if (img && img.width) {
      // El alto sale de la pieza (natural o estirada); el PNG se adapta a él.
      ctx.drawImage(img, u.x, u.y, uw, u.h);
    } else {
      ctx.save(); ctx.translate(u.x, u.y);
      drawFurnitureCode(ctx, p.kind, uw, u.h);
      ctx.restore();
    }
  }
  // Superficie de apoyo: línea de tinta + brillo, para que se lea dónde se salta.
  ctx.strokeStyle = 'rgba(26,16,48,0.85)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(p.x, p.y + 1.5); ctx.lineTo(p.x + p.w, p.y + 1.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(p.x + 2, p.y - 0.5); ctx.lineTo(p.x + p.w - 2, p.y - 0.5); ctx.stroke();
  ctx.restore();
  return true;
}

/** Dibuja las plataformas de una fase en una capa cacheada. */
export function renderPlatforms(platforms, themeName) {
  const c = canvas(W, H); if (!c) return null;
  const g = c.getContext('2d');
  const th = THEMES[themeName] || THEMES.manana;
  for (const p of platforms) {
    if (p.floor) continue;
    // Muebles de bar (tema «Dieta de Marcos»): sprite E1 con alfa o provisional.
    if (p.kind && FURNITURE[p.kind]) {
      drawFurniturePlatform(g, p);
      if (th.tint) { g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = th.tint[1] * 0.7; g.fillStyle = th.tint[0]; g.fillRect(p.x - 2, p.y - 2, p.w + 14, 240); g.restore(); }
      continue;
    }
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
