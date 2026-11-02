// Campaña «DIETA DE MARCOS» (issue #57): ruta de 4 bares × (3 rondas + jefe) = 16 fases.
// Módulo autónomo: datos, guardado en localStorage, pantalla de ruta y menú de modos.
// El motor sigue siendo tema-agnóstico; si un tema «dieta-de-marcos» se registra,
// la campaña usará sus fases/nombres de enemigos automáticamente (ver TYPE_KEYS).
// Todo inventado: bares, pueblos y personajes ficticios, sin marcas ni logotipos.
import { W, H, CONFIG } from './config.js';
import { FLOOR } from './physics.js';
import { FONT, outlinedText } from './fx.js';
import { TYPE_KEYS } from './enemies.js';
import { clamp } from './util.js';

export const CAMPAIGN_TITLE = 'DIETA DE MARCOS';
export const ROUNDS_PER_BAR = 4; // 3 rondas normales + el jefe de bar
export const SAVE_KEY = 'dieta-de-marcos-campana-v1';
export const CAMPAIGN_VERSION = 1;

// Los 4 bares de la ruta. Cada uno tiene una mecánica propia y un jefe inventado.
export const BARS = Object.freeze([
  {
    id: 'la-taca', town: 'VILA-REAL', name: 'BAR LA TACA',
    mechanic: 'manchas', mechanicLabel: 'MANCHAS EN EL SUELO',
    hint: 'Resbala y no te fíes del suelo',
    boss: 'EL COCINERO DE LA PLANCHA', bossType: 'tertuliano', bossHp: 10,
    bossMinions: ['portavoz', 'tertuliano', 'asesor'], bossShot: 'shout',
    color: '#ffd23f', accent: '#ff6b3d',
    hours: ['manana', 'manana', 'mediodia', 'atardecer'],
  },
  {
    id: 'concursos', town: 'XIRIVELLA', name: 'BAR LOS CONCURSOS',
    mechanic: 'sorteos', mechanicLabel: 'SORTEOS CON BOLA',
    hint: 'Premio con interrogación: bueno o malo',
    boss: 'EL PRESENTADOR DEL BINGO', bossType: 'lider', bossHp: 13,
    bossMinions: ['influencer', 'activista', 'baron'], bossShot: 'flash',
    color: '#4dd2ff', accent: '#b15eff',
    hours: ['mediodia', 'mediodia', 'atardecer', 'atardecer'],
  },
  {
    id: 'pols', town: 'BAR POLS', name: 'BAR POLS',
    mechanic: 'bandejas', mechanicLabel: 'BANDEJAS Y BARRA DESLIZANTE',
    hint: 'Esquiva las bandejas, sube a la barra',
    boss: 'LA JEFA DE SALA', bossType: 'tertuliano', bossHp: 15,
    bossMinions: ['tertuliano', 'asesor', 'activista', 'diputado'], bossShot: 'flash',
    color: '#ff8fa3', accent: '#3bceac',
    hours: ['atardecer', 'ocaso', 'ocaso', 'noche'],
  },
  {
    id: 'del-jefe', town: 'VALÈNCIA', name: 'BAR DEL JEFE',
    mechanic: 'mixto', mechanicLabel: 'TODO MEZCLADO · DE NOCHE',
    hint: 'Más esmorzars y las cuatro mecánicas',
    boss: 'EL JEFE DEL BAR', bossType: 'lider', bossHp: 18,
    bossMinions: ['lider', 'baron', 'diputado', 'asesor', 'portavoz'], bossShot: 'shout',
    color: '#ffe14d', accent: '#ff3b5c',
    hours: ['noche', 'noche', 'noche', 'noche'],
  },
]);

// Escenas de fondo del tema «marcos» (A4). El jefe usa el fondo de su bar.
const SCENE_FONDO = { barra: 'fondo-barra', terraza: 'fondo-terraza', mercado: 'fondo-mercado', playa: 'fondo-playa' };
export const BAR_SCENES = Object.freeze(['barra', 'terraza', 'mercado', 'playa']);

// ---- Fases ---------------------------------------------------------------
// Cuatro layouts de plataformas (barra, terraza, mercado, playa) reutilizados
// con distinta combinación de enemigos. Todos están dentro de pantalla y son
// alcanzables con el salto del motor (lo verifica tests/campaign.test.js).
const T = 18;
const P = (x, y, w) => ({ x, y, w, h: T });
const foe = (i, x, y) => [TYPE_KEYS[i % TYPE_KEYS.length], x, y];

const LAYOUTS = [
  {
    name: 'LA BARRA', scene: 'barra',
    plats: [[80, 520, 340], [860, 520, 340], [380, 400, 520], [80, 280, 380], [820, 280, 380], [480, 160, 320]],
    spots: [[200, 520], [1050, 520], [620, 400], [200, 280], [1000, 280], [640, 160]],
  },
  {
    name: 'LA TERRAZA', scene: 'terraza',
    plats: [[0, 520, 300], [980, 520, 300], [240, 400, 300], [740, 400, 300], [470, 280, 340], [60, 190, 300], [920, 190, 300]],
    spots: [[120, 520], [1100, 520], [380, 400], [880, 400], [620, 280], [180, 190], [1060, 190]],
  },
  {
    name: 'EL MERCADO', scene: 'mercado',
    plats: [[160, 520, 960], [0, 400, 360], [920, 400, 360], [300, 280, 680], [120, 160, 260], [900, 160, 260]],
    spots: [[640, 520], [150, 400], [1100, 400], [640, 280], [250, 160], [1030, 160]],
  },
  {
    name: 'LA PLAYA', scene: 'playa',
    plats: [[60, 520, 260], [510, 520, 260], [960, 520, 260], [280, 400, 260], [740, 400, 260], [60, 280, 260], [510, 280, 260], [960, 280, 260], [380, 160, 520]],
    spots: [[180, 520], [640, 520], [1090, 520], [400, 400], [860, 400], [180, 280], [640, 280], [1090, 280], [640, 160]],
  },
];
const BOSS_LAYOUT = {
  name: 'EL JEFE', scene: 'jefe',
  plats: [[60, 500, 380], [60, 360, 300], [60, 220, 380], [520, 430, 200]],
  spots: [],
};

const ROUND_NAMES = ['PRIMER ESMORZAR', 'SEGUNDO ESMORZAR', 'TERCER ESMORZAR', 'JEFE DE BAR'];

/** Enemigos por bar: van rotando y el último bar mezcla los ocho tipos. */
function foesFor(bar, round, layout) {
  const count = Math.min(layout.spots.length, 3 + bar + Math.min(1, round));
  const out = [];
  for (let i = 0; i < count; i++) {
    const [x, y] = layout.spots[i];
    out.push(foe(bar * 2 + i + (bar === 3 ? i : 0), x, y));
  }
  return out;
}

export const CAMPAIGN_STAGES = Object.freeze(BARS.flatMap((bar, b) => ROUND_NAMES.map((label, r) => {
  const isBoss = r === ROUNDS_PER_BAR - 1;
  const layout = isBoss ? BOSS_LAYOUT : LAYOUTS[(b * 3 + r) % LAYOUTS.length];
  const plats = [FLOOR, ...layout.plats.map(([x, y, w]) => P(x, y, w))];
  const stage = {
    bar: b, round: r, bossStage: isBoss,
    name: isBoss ? bar.boss : `${label} · ${layout.name}`,
    shortName: isBoss ? 'JEFE' : `RONDA ${r + 1}`,
    scene: layout.scene,
    mechanic: bar.mechanic, mechanicLabel: bar.mechanicLabel,
    town: bar.town, barName: bar.name, color: bar.color,
    // El motor del tema «marcos» traduce estos nombres a los fondos de A4.
    theme: isBoss ? BAR_SCENES[b] : layout.scene,
    night: b === BARS.length - 1,
    plats, foes: [],
  };
  if (isBoss) {
    Object.assign(stage, {
      boss: bar.bossType, bossName: bar.boss, bossHp: bar.bossHp,
      bossMinions: bar.bossMinions, bossShot: bar.bossShot,
      bossScale: b === 3 ? 0.74 : 0.64,
    });
  } else {
    stage.foes = foesFor(b, r, layout);
    stage.foesCount = stage.foes.length;
  }
  return stage;
})));

export const CAMPAIGN_STAGE_COUNT = CAMPAIGN_STAGES.length;

// Fondos de bar ya presentes en el repo (bloque A4). El jefe usa el fondo de su bar.
export function fondoForStage(stage) {
  if (!stage) return null;
  const scene = stage.scene === 'jefe' ? BAR_SCENES[clamp(stage.bar, 0, BAR_SCENES.length - 1)] : stage.scene;
  return SCENE_FONDO[scene] || null;
}

export function stageIndexOf(bar, round) {
  return clamp(Math.trunc(bar) * ROUNDS_PER_BAR + Math.trunc(round), 0, CAMPAIGN_STAGE_COUNT - 1);
}
export function barOfStage(i) { return clamp(Math.floor(i / ROUNDS_PER_BAR), 0, BARS.length - 1); }
export function roundOfStage(i) { return clamp(i % ROUNDS_PER_BAR, 0, ROUNDS_PER_BAR - 1); }

// ---- Guardado (localStorage con try/catch) --------------------------------
function storage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

export function readProgress(store = storage()) {
  try {
    if (!store) return null;
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object' || p.version !== CAMPAIGN_VERSION) return null;
    const bar = clamp(Math.trunc(Number(p.bar) || 0), 0, BARS.length - 1);
    const round = clamp(Math.trunc(Number(p.round) || 0), 0, ROUNDS_PER_BAR - 1);
    return {
      version: CAMPAIGN_VERSION, bar, round, stageIndex: stageIndexOf(bar, round),
      score: Math.max(0, Math.trunc(Number(p.score) || 0)),
      lives: clamp(Math.trunc(Number(p.lives) || CONFIG.player.lives), 1, 9),
      themeId: typeof p.themeId === 'string' ? p.themeId : null,
    };
  } catch { return null; }
}

export function progressForStage(index, extra = {}) {
  const i = clamp(Math.trunc(index) || 0, 0, CAMPAIGN_STAGE_COUNT - 1);
  return {
    version: CAMPAIGN_VERSION,
    bar: barOfStage(i), round: roundOfStage(i),
    score: Math.max(0, Math.trunc(extra.score) || 0),
    lives: clamp(Math.trunc(extra.lives) || CONFIG.player.lives, 1, 9),
    themeId: extra.themeId || null,
  };
}

export function writeProgress(p, store = storage()) {
  try {
    if (!store || !p) return false;
    const data = progressForStage(stageIndexOf(p.bar, p.round), p);
    store.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function clearProgress(store = storage()) {
  try { if (store) store.removeItem(SAVE_KEY); return true; } catch { return false; }
}

// ---- Modos del título -----------------------------------------------------
export function modeList(progress) {
  const modes = [
    { id: 'campaign', label: 'CAMPAÑA', hint: '4 BARES · 16 FASES' },
    { id: 'arcade', label: 'ARCADE', hint: '10 FASES CLÁSICAS' },
  ];
  if (progress) modes.push({
    id: 'continue', label: 'CONTINUAR',
    hint: `${BARS[progress.bar].name} · RONDA ${progress.round + 1}`,
  });
  return modes;
}

// ---- Dibujo: menú de modos, HUD, ruta y final -----------------------------
const INK = '#1a1030';

function panel(ctx, x, y, w, h, fill, stroke, r = 16) {
  ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); ctx.stroke();
}

export function drawCampaignMenu(ctx, g, time) {
  const modes = modeList(readProgress());
  const sel = clamp(g.modeSel || 0, 0, modes.length - 1);
  const y = 624, w = 300, gap = 16;
  const total = modes.length * w + (modes.length - 1) * gap;
  const x0 = W / 2 - total / 2;
  outlinedText(ctx, '↑ ↓  ELIGE MODO  ·  ← →  ELIGE JUEGO', W / 2, y - 18, 22, '#9fe7ff');
  modes.forEach((m, i) => {
    const x = x0 + i * (w + gap);
    const on = i === sel;
    const pulse = on ? 1 + Math.sin(time * 6) * 0.015 : 1;
    ctx.save(); ctx.translate(x + w / 2, y + 30); ctx.scale(pulse, pulse); ctx.translate(-(x + w / 2), -(y + 30));
    panel(ctx, x, y, w, 62, on ? 'rgba(255,225,77,0.94)' : 'rgba(20,10,50,0.82)', on ? '#ffffff' : '#6b5a9a');
    outlinedText(ctx, m.label, x + w / 2, y + 23, 30, on ? INK : '#ffffff', on ? 'rgba(255,255,255,0.6)' : INK);
    outlinedText(ctx, m.hint, x + w / 2, y + 47, 16, on ? INK : '#ffb3d9', on ? 'rgba(255,255,255,0.6)' : INK);
    ctx.restore();
  });
}

export function drawCampaignHud(ctx, g) {
  const i = clamp(g.stageIndex || 0, 0, CAMPAIGN_STAGE_COUNT - 1);
  const bar = BARS[barOfStage(i)];
  const round = roundOfStage(i) + 1;
  panel(ctx, W / 2 - 262, 4, 524, 62, '#140a32', bar.color, 14);
  outlinedText(ctx, `${bar.town} · ${bar.name}`, W / 2, 25, 24, '#ffffff');
  outlinedText(ctx, round === ROUNDS_PER_BAR ? 'JEFE DE BAR' : `RONDA ${round} DE 3`, W / 2, 52, 20, bar.color);
  // Franja inferior: tapa las letras del tema clásico y muestra la mecánica del bar.
  panel(ctx, W / 2 - 350, 662, 700, 52, '#140a32', bar.color, 14);
  outlinedText(ctx, bar.mechanicLabel, W / 2, 688, 26, '#ffffff');
}

export function drawRoute(ctx, g, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1b1038'); grad.addColorStop(0.6, '#3a1c48'); grad.addColorStop(1, '#7a3b2e');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  // Sol/neón de fondo, sin personajes.
  ctx.fillStyle = 'rgba(255,190,80,0.16)';
  ctx.beginPath(); ctx.arc(1080, 130, 150, 0, Math.PI * 2); ctx.fill();
  outlinedText(ctx, 'RUTA DE ESMORZARS', W / 2, 78, 76, '#ffe14d');
  outlinedText(ctx, `${CAMPAIGN_TITLE} · 4 BARES · 16 FASES · GUARDADO AUTOMÁTICO`, W / 2, 138, 26, '#ffffff');

  const xs = [172, 470, 800, 1112];
  const ys = [400, 330, 412, 336];
  // Camino de puntos entre bares.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 8; ctx.setLineDash([4, 22]); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(xs[0], ys[0] + 48);
  for (let i = 1; i < xs.length; i++) ctx.bezierCurveTo(xs[i - 1] + 90, ys[i - 1] - 30, xs[i] - 90, ys[i] + 30, xs[i], ys[i] + 48);
  ctx.stroke(); ctx.restore();

  const current = clamp(g.routeBar || 0, 0, BARS.length - 1);
  const progress = readProgress();
  BARS.forEach((bar, i) => {
    const x = xs[i], y = ys[i];
    const on = i === current;
    const bob = on ? Math.sin(time * 4) * 6 : 0;
    ctx.save(); ctx.translate(x, y + bob);
    // Cartel del bar (texto siempre dentro del cartel, con maxWidth).
    ctx.fillStyle = 'rgba(10,5,30,0.35)'; ctx.beginPath(); ctx.roundRect(-120, -96, 240, 152, 16); ctx.fill();
    panel(ctx, -118, -100, 236, 144, on ? bar.color : '#fff3d6', on ? '#ffffff' : INK, 14);
    ctx.fillStyle = on ? INK : bar.accent; ctx.fillRect(-118, -100, 236, 12);
    outlinedText(ctx, bar.town, 0, -76, 19, on ? INK : '#8a5a2b', on ? 'rgba(255,255,255,0.7)' : '#fff3d6');
    outlinedText(ctx, bar.name, 0, -46, 21, INK, on ? 'rgba(255,255,255,0.7)' : '#fff3d6');
    ctx.font = `15px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = on ? INK : '#6b3f20';
    ctx.fillText(bar.mechanicLabel, 0, -14, 204);
    ctx.fillText(bar.hint, 0, 6, 204);
    // 4 marcas de ronda: 3 redondas + estrella del jefe.
    for (let r = 0; r < ROUNDS_PER_BAR; r++) {
      const done = i < current || (progress && i === current && r < (progress.round || 0));
      const cx = -75 + r * 50, cy = 34;
      ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fillStyle = done ? bar.accent : 'rgba(26,16,48,0.22)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      if (r === 3) { ctx.fillStyle = done ? '#fff' : INK; ctx.font = `14px ${FONT}`; ctx.fillText('★', cx, cy + 1); }
      else { ctx.fillStyle = '#fff'; ctx.font = `13px ${FONT}`; ctx.fillText(String(r + 1), cx, cy + 1); }
    }
    // Poste del cartel.
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-9, 44, 18, 62); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(-9, 44, 18, 62);
    ctx.restore();
    if (on) {
      ctx.save(); ctx.translate(x, y - 150 + Math.sin(time * 5) * 8);
      ctx.fillStyle = '#ff3b5c'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(-18, -14); ctx.lineTo(18, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  });

  const next = clamp(g.routeNext || 0, 0, CAMPAIGN_STAGE_COUNT - 1);
  const bar = BARS[barOfStage(next)];
  outlinedText(ctx, `SIGUIENTE: ${bar.town} · ${bar.name} · ${CAMPAIGN_STAGES[next].shortName}`, W / 2, 545, 34, '#ffffff');
  outlinedText(ctx, bar.mechanicLabel, W / 2, 586, 24, bar.color);
  if (Math.floor(time * 2) % 2 === 0) outlinedText(ctx, 'PULSA ESPACIO O TOCA PARA ENTRAR', W / 2, 646, 40, '#fff35c');
  outlinedText(ctx, progress ? 'PROGRESO GUARDADO · HAY OPCIÓN «CONTINUAR» EN EL TÍTULO' : 'EL PROGRESO SE GUARDA AL EMPEZAR CADA RONDA', W / 2, 692, 18, '#ffb3d9');
}

export function drawCampaignEnding(ctx, g, time) {
  panel(ctx, W / 2 - 420, 92, 840, 96, 'rgba(20,10,50,0.86)', '#ffe14d', 18);
  outlinedText(ctx, '¡RUTA DE ESMORZARS COMPLETADA!', W / 2, 128, 56, '#fff35c');
  outlinedText(ctx, `4 BARES · 16 FASES · ${g.score} PUNTOS`, W / 2, 168, 28, '#ffffff');
}
