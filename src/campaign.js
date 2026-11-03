// Campaña «DIETA DE MARCOS» (issue #57): ruta de 4 bares × (3 rondas + jefe) = 16 fases.
// Módulo autónomo: datos, guardado en localStorage, pantalla de ruta y menú de modos.
// El motor sigue siendo tema-agnóstico; si un tema «dieta-de-marcos» se registra,
// la campaña usará sus fases/nombres de enemigos automáticamente (ver TYPE_KEYS).
// Todo inventado: bares, pueblos y personajes ficticios, sin marcas ni logotipos.
import { W, H, CONFIG } from './config.js';
import { t, localize } from './i18n/index.js';
import { FLOOR } from './physics.js';
import { FONT, outlinedText } from './fx.js';
import { TYPE_KEYS } from './enemies.js';
import { clamp } from './util.js';
import { listThemes } from './themes/index.js';

export const CAMPAIGN_TITLE_KEY = 'campaign.title';
export const ROUNDS_PER_BAR = 4; // 3 rondas normales + el jefe de bar
export const SAVE_KEY = 'dieta-de-marcos-campana-v1';
export const CAMPAIGN_VERSION = 1;

// Los 4 bares de la ruta. Cada uno tiene una mecánica propia y un jefe inventado.
export const BARS = [
  {
    id: 'la-taca', town: null, name: null,
    mechanic: 'manchas', mechanicLabel: null,
    hint: null,
    boss: null, bossType: 'tertuliano', bossArt: 'cocinero-plancha', bossHp: 10,
    bossMinions: ['portavoz', 'tertuliano', 'asesor'], bossShot: 'tostada',
    bossScale: CONFIG.laTacaBoss.scale,
    color: '#ffd23f', accent: '#ff6b3d',
    hours: ['manana', 'manana', 'mediodia', 'atardecer'],
  },
  {
    id: 'concursos', town: null, name: null,
    mechanic: 'sorteos', mechanicLabel: null,
    hint: null,
    boss: null, bossType: 'lider', bossArt: 'presentador-bingo', bossHp: 13,
    bossMinions: ['influencer', 'activista', 'baron'], bossShot: 'flash',
    color: '#4dd2ff', accent: '#b15eff',
    hours: ['mediodia', 'mediodia', 'atardecer', 'atardecer'],
  },
  {
    id: 'pols', town: null, name: null,
    mechanic: 'bandejas', mechanicLabel: null,
    hint: null,
    boss: null, bossType: 'tertuliano', bossArt: 'jefa', bossHp: 15,
    bossMinions: ['tertuliano', 'asesor', 'activista', 'diputado'], bossShot: 'flash',
    color: '#ff8fa3', accent: '#3bceac',
    hours: ['atardecer', 'ocaso', 'ocaso', 'noche'],
  },
  {
    id: 'del-jefe', town: null, name: null,
    mechanic: 'mixto', mechanicLabel: null,
    hint: null,
    boss: null, bossType: 'lider', bossArt: 'jefe-bar', bossHp: 18,
    bossMinions: ['lider', 'baron', 'diputado', 'asesor', 'portavoz'], bossShot: 'shout',
    color: '#ffe14d', accent: '#ff3b5c',
    hours: ['noche', 'noche', 'noche', 'noche'],
  },
];
for (const bar of BARS) {
  for (const field of ['town', 'name', 'mechanicLabel', 'hint', 'boss']) localize(bar, field, `campaign.bar.${bar.id}.${field}`);
  Object.freeze(bar);
}
Object.freeze(BARS);

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

// Layout de plataformas propio de cada bar (issue #96): muebles de bar como
// plataformas, escalones irregulares, barra larga arriba y hueco central para
// los combos de la bola. El cuarto valor de cada plataforma es el tipo de mueble
// que dibuja src/background.js. Todo dentro de pantalla y alcanzable con el
// salto del motor (lo verifican tests/campaign.test.js y tests/escenarios.test.js).
const BAR_LAYOUTS = [
  [ // 0 · BAR LA TACA (Vila-real) — la barra, los taburetes y la trastienda
    {
      name: null, scene: 'barra',
      plats: [[70, 540, 250, 'taburete'], [960, 540, 250, 'taburete'], [300, 460, 240, 'mesa'], [740, 460, 240, 'mesa'], [330, 340, 620, 'barra'], [500, 200, 280, 'estante']],
      spots: [[180, 540], [1060, 540], [410, 460], [860, 460], [640, 340], [640, 200]],
    },
    {
      name: null, scene: 'barra',
      plats: [[60, 540, 190, 'taburete'], [300, 480, 190, 'taburete-alto'], [540, 420, 190, 'taburete'], [780, 480, 190, 'taburete-alto'], [1020, 540, 190, 'taburete'], [380, 300, 520, 'barra'], [60, 200, 300, 'estante'], [920, 200, 300, 'estante']],
      spots: [[150, 540], [390, 480], [630, 420], [870, 480], [1110, 540], [640, 300], [200, 200]],
    },
    {
      name: null, scene: 'barra',
      plats: [[40, 540, 300, 'nevera'], [940, 540, 300, 'nevera'], [380, 540, 300, 'caja'], [200, 430, 320, 'caja'], [760, 430, 320, 'caja'], [60, 320, 260, 'estante'], [960, 320, 260, 'estante'], [400, 210, 480, 'barril']],
      spots: [[190, 540], [1090, 540], [530, 540], [360, 430], [920, 430], [190, 320], [1090, 320], [640, 210]],
    },
  ],
  [ // 1 · BAR LOS CONCURSOS (Xirivella) — el mercado, las cajas y el sorteo
    {
      name: null, scene: 'mercado',
      plats: [[110, 540, 420, 'mostrador'], [750, 540, 420, 'mostrador'], [60, 430, 300, 'caja'], [920, 430, 300, 'caja'], [420, 340, 440, 'mostrador'], [520, 220, 240, 'caja']],
      spots: [[320, 540], [960, 540], [210, 430], [1070, 430], [640, 340], [640, 220]],
    },
    {
      name: null, scene: 'mercado',
      plats: [[40, 540, 240, 'caja'], [330, 540, 240, 'caja'], [900, 540, 340, 'mostrador'], [100, 430, 260, 'caja'], [420, 430, 240, 'caja'], [820, 430, 260, 'caja'], [300, 320, 300, 'caja'], [700, 320, 300, 'caja'], [420, 210, 440, 'toldo']],
      spots: [[160, 540], [1090, 540], [230, 430], [540, 430], [950, 430], [450, 320], [850, 320], [640, 210]],
    },
    {
      name: null, scene: 'mercado',
      plats: [[60, 540, 300, 'mesa'], [920, 540, 300, 'mesa'], [280, 440, 320, 'mesa'], [700, 440, 320, 'mesa'], [500, 340, 280, 'mostrador'], [80, 240, 280, 'caja'], [920, 240, 280, 'caja'], [480, 150, 320, 'toldo']],
      spots: [[210, 540], [1070, 540], [440, 440], [860, 440], [640, 340], [220, 240], [1060, 240]],
    },
  ],
  [ // 2 · BAR POLS — la terraza, las mesas y el toldo
    {
      name: null, scene: 'terraza',
      plats: [[0, 540, 320, 'toldo'], [960, 540, 320, 'toldo'], [120, 430, 260, 'mesa'], [900, 430, 260, 'mesa'], [420, 380, 440, 'mesa'], [60, 270, 280, 'silla'], [940, 270, 280, 'silla'], [440, 160, 400, 'toldo']],
      spots: [[160, 540], [1120, 540], [250, 430], [1030, 430], [640, 380], [200, 270], [1080, 270], [640, 160]],
    },
    {
      name: null, scene: 'terraza',
      plats: [[70, 540, 240, 'mesa'], [520, 540, 240, 'mesa'], [970, 540, 240, 'mesa'], [240, 440, 240, 'silla'], [700, 440, 240, 'silla'], [360, 340, 560, 'mesa'], [90, 230, 280, 'mesa'], [910, 230, 280, 'mesa'], [480, 140, 320, 'toldo']],
      spots: [[190, 540], [640, 540], [1090, 540], [360, 440], [820, 440], [640, 340], [230, 230], [1050, 230]],
    },
    {
      name: null, scene: 'terraza',
      plats: [[60, 500, 360, 'toldo'], [860, 500, 360, 'toldo'], [60, 360, 300, 'mesa'], [880, 360, 300, 'mesa'], [420, 300, 440, 'silla'], [60, 210, 300, 'mesa'], [920, 210, 300, 'mesa'], [500, 120, 280, 'toldo']],
      spots: [[240, 500], [1040, 500], [210, 360], [1030, 360], [640, 300], [210, 210], [1070, 210]],
    },
  ],
  [ // 3 · BAR DEL JEFE (València) — de noche, con todos los muebles mezclados
    {
      name: null, scene: 'barra',
      plats: [[0, 540, 400, 'mostrador'], [880, 540, 400, 'mostrador'], [340, 440, 600, 'barra'], [0, 330, 300, 'nevera'], [980, 330, 300, 'nevera'], [380, 240, 520, 'estante'], [120, 150, 300, 'caja'], [860, 150, 300, 'caja']],
      spots: [[200, 540], [1080, 540], [640, 440], [150, 330], [1130, 330], [640, 240], [270, 150], [1010, 150]],
    },
    {
      name: null, scene: 'barra',
      plats: [[60, 540, 240, 'taburete'], [380, 540, 240, 'mesa'], [700, 540, 240, 'taburete'], [1020, 540, 240, 'mesa'], [150, 440, 300, 'caja'], [560, 430, 320, 'barril'], [940, 440, 300, 'nevera'], [300, 330, 300, 'toldo'], [760, 330, 300, 'toldo'], [440, 220, 420, 'barra']],
      spots: [[180, 540], [500, 540], [820, 540], [1140, 540], [300, 440], [720, 430], [1090, 440], [450, 330], [910, 330], [650, 220]],
    },
    {
      name: null, scene: 'barra',
      plats: [[40, 540, 380, 'mostrador'], [860, 540, 380, 'mostrador'], [260, 430, 760, 'barra'], [40, 320, 280, 'nevera'], [960, 320, 280, 'nevera'], [360, 320, 560, 'estante'], [120, 210, 280, 'caja'], [880, 210, 280, 'barril'], [420, 110, 440, 'toldo']],
      spots: [[230, 540], [1050, 540], [640, 430], [180, 320], [1100, 320], [640, 320], [260, 210], [1020, 210], [640, 110]],
    },
  ],
];

// Escenario del jefe de cada bar: mismo lenguaje de muebles, sitio para la bola.
const BOSS_LAYOUTS = [
  { name: null, scene: 'jefe', plats: [[60, 500, 380, 'barra'], [60, 360, 300, 'estante'], [60, 220, 380, 'barra'], [520, 430, 200, 'taburete']], spots: [] },
  { name: null, scene: 'jefe', plats: [[80, 520, 420, 'mostrador'], [80, 380, 340, 'caja'], [80, 240, 420, 'mostrador'], [700, 440, 220, 'barril']], spots: [] },
  { name: null, scene: 'jefe', plats: [[60, 500, 360, 'toldo'], [60, 350, 320, 'mesa'], [60, 200, 360, 'toldo'], [700, 440, 220, 'silla']], spots: [] },
  { name: null, scene: 'jefe', plats: [[40, 500, 380, 'mostrador'], [40, 360, 300, 'nevera'], [40, 220, 380, 'barra'], [560, 440, 220, 'barril']], spots: [] },
];

const ROUND_NAMES = [0, 1, 2, 3];

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

export const CAMPAIGN_STAGES = Object.freeze(BARS.flatMap((bar, b) => ROUND_NAMES.map((roundKey, r) => {
  const isBoss = r === ROUNDS_PER_BAR - 1;
  const layout = isBoss ? BOSS_LAYOUTS[b] : BAR_LAYOUTS[b][r];
  const plats = [FLOOR, ...layout.plats.map(([x, y, w, kind]) => ({ ...P(x, y, w), kind: kind || 'barra' }))];
  const stage = {
    bar: b, round: r, bossStage: isBoss,
    roundKey,
    layoutKey: isBoss ? 'campaign.layout.boss' : `campaign.layout.${b * 3 + r}`,
    shortKey: isBoss ? 'campaign.boss' : 'campaign.round',
    scene: layout.scene,
    mechanic: bar.mechanic, mechanicLabel: bar.mechanicLabel,
    townKey: `campaign.bar.${bar.id}.town`, barNameKey: `campaign.bar.${bar.id}.name`, color: bar.color,
    // El motor del tema «marcos» traduce estos nombres a los fondos de A4.
    theme: isBoss ? BAR_SCENES[b] : layout.scene,
    night: b === BARS.length - 1,
    plats, foes: [],
  };
  if (isBoss) {
    Object.assign(stage, {
      boss: bar.bossType, bossArt: bar.bossArt, bossNameKey: `campaign.bar.${bar.id}.boss`, bossHp: bar.bossHp,
      bossMinions: bar.bossMinions, bossShot: bar.bossShot,
      bossScale: bar.bossScale ?? (b === 3 ? 0.74 : 0.64),
    });
  } else {
    stage.foes = foesFor(b, r, layout);
    stage.foesCount = stage.foes.length;
  }
  Object.defineProperty(stage, 'name', { enumerable: true, get: () => isBoss ? bar.boss : `${t('campaign.roundName.' + roundKey)} · ${t(stage.layoutKey)}` });
  Object.defineProperty(stage, 'shortName', { enumerable: true, get: () => t(stage.shortKey, { round: r + 1 }) });
  localize(stage, 'town', stage.townKey); localize(stage, 'barName', stage.barNameKey);
  localize(stage, 'mechanicLabel', `campaign.bar.${bar.id}.mechanicLabel`);
  if (isBoss) localize(stage, 'bossName', stage.bossNameKey);
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

// ---- Música por escena (issue #101) --------------------------------------
// Cada fase de la campaña tiene su trozo de canción: un trozo por bar, otro para
// los jefes de bar, otro para la ronda bonus y el del título para los menús.
// Fuera de la campaña (modo ARCADE) no se usan trozos: el tema ya no declara
// 'stage' ni 'boss' y el motor cae en su música sintetizada.
export function musicForStage(i) {
  const st = CAMPAIGN_STAGES[Math.trunc(Number(i) || 0)];
  if (!st) return 'title';
  if (st.bossStage) return 'campaign-jefes';
  return 'campaign-' + BARS[st.bar].id;
}

/** Sección que toca precargar mientras se juega la fase `i`. */
export function nextMusicForStage(i) {
  const n = Math.trunc(i) + 1;
  return n >= CAMPAIGN_STAGE_COUNT ? 'title' : musicForStage(n);
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
    { id: 'campaign', labelKey: 'campaign.campaign', hintKey: 'campaign.campaignHint' },
    { id: 'arcade', labelKey: 'campaign.arcade', hintKey: 'campaign.arcadeHint' },
  ];
  if (progress) modes.push({ id: 'continue', labelKey: 'campaign.continue', hintKey: 'campaign.continueHint', bar: progress.bar, round: progress.round + 1 });
  for (const mode of modes) {
    localize(mode, 'label', mode.labelKey);
    Object.defineProperty(mode, 'hint', { enumerable: true, get: () => t(mode.hintKey, { bar: mode.bar === undefined ? '' : BARS[mode.bar].name, round: mode.round }) });
  }
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
  // Con un solo juego instalado no se puede cambiar de juego: la pista lo refleja.
  const juegos = listThemes().length;
  outlinedText(ctx, t(juegos > 1 ? 'campaign.choose' : 'campaign.chooseMode'), W / 2, y - 18, 22, '#9fe7ff');
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
  outlinedText(ctx, t('campaign.place', bar), W / 2, 25, 24, '#ffffff');
  outlinedText(ctx, t(round === ROUNDS_PER_BAR ? 'campaign.bossRound' : 'campaign.roundOf', { round }), W / 2, 52, 20, bar.color);
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
  outlinedText(ctx, t('campaign.route'), W / 2, 78, 76, '#ffe14d');
  outlinedText(ctx, t('campaign.summary', { game: t(CAMPAIGN_TITLE_KEY) }), W / 2, 138, 26, '#ffffff');

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
  outlinedText(ctx, t('campaign.next', { place: t('campaign.place', bar), round: CAMPAIGN_STAGES[next].shortName }), W / 2, 545, 34, '#ffffff');
  outlinedText(ctx, bar.mechanicLabel, W / 2, 586, 24, bar.color);
  if (Math.floor(time * 2) % 2 === 0) outlinedText(ctx, t('campaign.enter'), W / 2, 646, 40, '#fff35c');
  outlinedText(ctx, t(progress ? 'campaign.saved' : 'campaign.saving'), W / 2, 692, 18, '#ffb3d9');
}

export function drawCampaignEnding(ctx, g, time) {
  panel(ctx, W / 2 - 420, 92, 840, 96, 'rgba(20,10,50,0.86)', '#ffe14d', 18);
  outlinedText(ctx, t('campaign.completed'), W / 2, 128, 56, '#fff35c');
  outlinedText(ctx, t('campaign.finalScore', { score: g.score }), W / 2, 168, 28, '#ffffff');
}
