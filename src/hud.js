import { W, H, FLOOR_Y, CONFIG } from './config.js';
import { FONT, outlinedText } from './fx.js';
import { drawSprite } from './sprites.js';
import { hsl, clamp } from './util.js';
import { THEME } from './themes/tumbledog.js';

export function drawHud(ctx, g, time, theme = THEME) {
  const T = theme;
  // Barra superior
  const gr = ctx.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(20,10,50,0.85)'); gr.addColorStop(1, 'rgba(20,10,50,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 64);
  outlinedText(ctx, T.hud.puntos, 24, 16, 18, '#9fd8ff', '#1a1030', 'left');
  g.shownScore += (g.score - g.shownScore) * Math.min(1, 0.15 + 0.02);
  if (Math.abs(g.score - g.shownScore) < 1) g.shownScore = g.score;
  outlinedText(ctx, String(Math.round(g.shownScore)).padStart(7, '0'), 24, 42, 34, '#ffe14d', '#1a1030', 'left');
  outlinedText(ctx, T.hud.record + ' ' + String(Math.max(g.hi, g.score)).padStart(7, '0'), 196, 16, 18, '#ffb3d9', '#1a1030', 'left');
  for (let i = 0; i < Math.min(g.lives, 6); i++) drawSprite(ctx, 'ui-life', 214 + i * 38, 58, { s: 0.36, rot: Math.sin(time * 3 + i) * 0.08 });
  // Fase
  outlinedText(ctx, `${T.hud.fase} ${g.stageIndex + 1}${g.loop ? '·' + (g.loop + 1) : ''}`, W / 2, 20, 26, '#ffffff');
  outlinedText(ctx, g.stage ? g.stage.name : '', W / 2, 46, 18, '#ffd23f', '#1a1030', 'center', 440);
  // Tiempo
  if (g.state === 'play' && !g.stage.boss) {
    const k = clamp(g.stageT / T.stage.chaserAt, 0, 1);
    const x = W - 250, y = 22, w = 220;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.roundRect(x, y, w, 16, 8); ctx.fill();
    const hurry = g.stageT > T.stage.hurryAt;
    ctx.fillStyle = hurry ? (Math.floor(time * 8) % 2 ? '#ff3b3b' : '#ffd23f') : hsl(120 - k * 120, 85, 55);
    ctx.beginPath(); ctx.roundRect(x + 2, y + 2, (w - 4) * (1 - k), 12, 6); ctx.fill();
    ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x, y, w, 16, 8); ctx.stroke();
    outlinedText(ctx, hurry ? T.hud.datePrisa : T.hud.tiempo, x + w / 2, 50, 18, hurry ? '#ff6b6b' : '#c8f7c5', '#1a1030', 'center', w);
  }
  // Poderes activos
  let px = W - 300;
  const p = g.player;
  const icon = (label, color, t) => { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(px, 70, 74, 24, 12); ctx.fill(); ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3; ctx.stroke(); outlinedText(ctx, `${label} ${Math.ceil(t)}`, px + 37, 83, 16, '#fff'); px -= 82; };
  if (p.speedUp > 0) icon(T.hud.turbo, '#ff3b3b', p.speedUp);
  if (p.pow > 0) icon(T.hud.pow, '#2f6bff', p.pow);
  if (g.freeze > 0) icon(T.hud.pausa, '#3bceac', g.freeze);
  // Jefe
  if (g.boss && !g.boss.dead) {
    // En campaña el cartel superior ocupa 66 px: dejar visible el nombre del jefe.
    const b = g.boss; const w = 520, x = W / 2 - w / 2, y = g.campaign ? 96 : 70;
    outlinedText(ctx, b.name, W / 2, y + 2, 22, '#ff8fa3', '#1a1030', 'center', w);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(x, y + 16, w, 18, 9); ctx.fill();
    const bg = ctx.createLinearGradient(x, 0, x + w, 0); bg.addColorStop(0, '#ff3b5c'); bg.addColorStop(1, '#ffb627');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x + 2, y + 18, (w - 4) * (b.hp / b.maxHp), 14, 7); ctx.fill();
    ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x, y + 16, w, 18, 9); ctx.stroke();
  }
  // Letras de la palabra del tema (T·U·M·B·L·E·D·O·G o E·S·M·O·R·Z·A·R) sobre el suelo
  const word = T.letters.word;
  const lw = 46, x0 = W / 2 - (word.length * lw) / 2 + lw / 2, ly = FLOOR_Y + 48;
  ctx.font = `40px ${FONT}`;
  for (let i = 0; i < word.length; i++) {
    const got = g.letters.has(i);
    const pulse = g.letterPop[i] > 0 ? 1 + g.letterPop[i] * 0.8 : 1;
    const bob = got ? Math.sin(time * 6 + i * 0.7) * 3 : 0;
    ctx.save(); ctx.translate(x0 + i * lw, ly + bob); ctx.scale(pulse, pulse);
    if (got) { ctx.shadowColor = hsl(time * 160 + i * 40, 100, 60); ctx.shadowBlur = 16; }
    outlinedText(ctx, word[i], 0, 0, 40, got ? hsl(time * 160 + i * 40, 95, 62) : 'rgba(255,255,255,0.18)', got ? '#1a1030' : 'rgba(26,16,48,0.6)');
    ctx.restore();
  }
  if (g.letterPop) for (let i = 0; i < g.letterPop.length; i++) g.letterPop[i] = Math.max(0, g.letterPop[i] - 0.03);
}

export function drawVignette(ctx) {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,0,30,0.45)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
