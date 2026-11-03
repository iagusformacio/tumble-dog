// Tema «marcos» = juego «Dieta de Marcos» (issues #56 y #77): mismo motor que
// «tumbledog», con protagonista, enemigos, textos, fases, fondos y música propios.
// Todo inventado: nada de personas reales ni personajes protegidos.
//
// Arte conectado ya en main: A4 (logo, bola de vómito, onomatopeyas, fondos de
// bar), A1 (10 poses de Marcos), A8 (retrato, camarero, premios), A2+A3 (los 8
// esmorzars y los jefes bocata/paella). Si llegara más arte, se declara en
// `spritesWanted` y, mientras no exista en disco, el motor dibuja un provisional
// por código (nunca un bloque negro).
import { FLOOR } from '../physics.js';
import { localizeTheme } from '../i18n/theme.js';

const T = 18;
const P = (x, y, w) => ({ x, y, w, h: T });

// Mapeo tipo-de-mecánica → esmorzar (los 8 enemigos de la dieta).
// A3 (PR #80): bocata/cacahuete/tostada/chupito sin prefijo.
// A2 (PR #85): dm-calamares/dm-carajillo/dm-cafe/dm-tortilla.
const ESMORZAR = {
  portavoz: 'dm-calamares',   // bocadillo de calamares (A2)
  tertuliano: 'dm-carajillo', // carajillo (A2)
  asesor: 'dm-cafe',          // café con leche (A2)
  influencer: 'cacahuete',    // cacahuete saltarín (A3)
  activista: 'bocata',        // bocata de lomo (A3)
  lider: 'tostada',           // tostada con tomate (A3)
  baron: 'chupito',           // chupito (A3)
  diputado: 'dm-tortilla',    // tortilla de patatas (A2)
};

export const THEME = {
  id: 'marcos',
  i18n: 'theme.marcos',
  // Claves de textos (catálogos src/i18n/es.js y val.js).
  hurtMessagesKeys: Array.from({ length: 4 }, (_, i) => `theme.marcos.hurtMessages.${i}`),
  onomatopeyasKeys: Array.from({ length: 4 }, (_, i) => `theme.marcos.onomatopeyas.${i}`),
  bossHitWordsKeys: Array.from({ length: 3 }, (_, i) => `theme.marcos.bossHitWords.${i}`),
  // Verbos propios del tema (aspirar = TRAGAR, lanzar = VOMITAR).
  verbs: {},
  // Datos de juego (sin textos): no cambian con el idioma.
  letters: { word: 'ESMORZAR', dropChance: 0.3, bubbleSpeed: 70 },
  bossHp: { tertuliano: 10, lider: 14 },
  bossNames: { tertuliano: null, lider: null },
  bossNameKeys: { tertuliano: 'theme.marcos.bossNames.tertuliano', lider: 'theme.marcos.bossNames.lider' },
  stage: { hurryAt: 30, clearDelay: 1.6, introTime: 1.8 },
  startTheme: 'barra', bonusTheme: 'mercado', nightTheme: 'noche',
  backgrounds: { noche: 'fondo-noche-jefe', barra: 'fondo-barra', terraza: 'fondo-terraza', mercado: 'fondo-mercado', playa: 'fondo-playa' },
  // Música (issues #95 y #101): la canción aportada por la persona ES la música
  // del tema, pero partida en un trozo por escena de la campaña (título, cada
  // bar, los jefes y la ronda bonus). Cada trozo pesa ~230 KB y se descarga solo
  // cuando toca, con la escena siguiente precargada: el título suena enseguida.
  // Cortes, fundidos y nombres: tools/split_music.py. El original completo sigue
  // en assets/audio/dieta-de-marcos.mp3 (no se usa en el juego).
  // El modo ARCADE no usa estos trozos (sigue con SYNTH abajo).
  audio: {
    title: './assets/audio/dieta-de-marcos/01-titulo.mp3',
    'campaign-la-taca': './assets/audio/dieta-de-marcos/02-taca.mp3',
    'campaign-concursos': './assets/audio/dieta-de-marcos/03-concursos.mp3',
    'campaign-pols': './assets/audio/dieta-de-marcos/04-pols.mp3',
    'campaign-del-jefe': './assets/audio/dieta-de-marcos/05-jefe-bar.mp3',
    'campaign-jefes': './assets/audio/dieta-de-marcos/06-jefes.mp3',
    'campaign-bonus': './assets/audio/dieta-de-marcos/07-bonus.mp3',
  },
  // Volumen de la canción respecto a los efectos y velocidad por sección
  // (en los jefes va un poco más rápida, sin cambiar de trozo).
  audioVolume: 0.5,
  audioRate: { title: 1, 'campaign-jefes': 1.08, 'campaign-bonus': 1 },
  // Sprites del tema YA en main (assets/sprites/). Cada valor debe existir en
  // disco (lo comprueba tests/marcos.test.js). A4: logo, bola de vómito,
  // onomatopeyas y fondos. A1: las 10 poses de Marcos. A8: retrato de Marcos,
  // camarero con la cuenta y los 6 premios del bar.
  sprites: {
    'ui-logo': 'ui-logo-marcos',
    'ball': 'ui-bola-vomito',
    'presi-idle': 'marcos-idle',
    'presi-walkA': 'marcos-walkA',
    'presi-walkB': 'marcos-walkB',
    'presi-jump': 'marcos-jump',
    'presi-fall': 'marcos-fall',
    'presi-suck': 'marcos-swallow',
    'presi-throw': 'marcos-vomit',
    'presi-hurt': 'marcos-hurt',
    'presi-win': 'marcos-win',
    'presi-intro': 'marcos-intro',
    'portrait-presi': 'retrato-marcos',
    'chaser-walkA': 'camarero-walkA',
    'chaser-walkB': 'camarero-walkB',
    'chaser-shout': 'camarero-grito',
    'item-coin': 'premio-zumo',
    'item-gemB': 'premio-ensaimada',
    'item-gemR': 'premio-flan',
    'item-gemG': 'premio-tila',
    'item-shoes': 'premio-cafe',
    'item-pow': 'premio-antiacido',
    'item-clock': 'premio-tila',
    'item-life': 'premio-flan',
    // Los 8 esmorzars (A2 + A3, ya en main):
    ...Object.fromEntries(Object.entries(ESMORZAR).flatMap(([type, spr]) =>
      ['walkA', 'walkB', 'stun', 'down'].map((pose) => [`${type}-${pose}`, `${spr}-${pose}`]))),
    // Jefes del tema (A2/A3): bocata gigante y paella gigante.
    'boss-tertuliano-walkA': 'dm-bocata-reposo',
    'boss-tertuliano-walkB': 'dm-bocata-reposo',
    'boss-tertuliano-stun': 'dm-bocata-reposo',
    'boss-tertuliano-down': 'dm-bocata-down',
    'boss-lider-walkA': 'paella-walkA',
    'boss-lider-walkB': 'paella-walkB',
    'boss-lider-stun': 'paella-idle',
    'boss-lider-down': 'paella-down',
    // Jefes de campaña (A5, A6, A7, A10): cada bar tiene su personaje dibujado y
    // el motor pide `boss-<art>-*` (campaña → `bossArt` de cada bar). Se mapean
    // a las poses que existen en disco; la jefa de sala ya usa los nombres
    // canónicos (walkA/walkB/stun/down).
    'boss-cocinero-plancha-walkA': 'boss-cocinero-plancha-idle',
    'boss-cocinero-plancha-walkB': 'boss-cocinero-plancha-angry',
    'boss-cocinero-plancha-stun': 'boss-cocinero-plancha-hurt',
    'boss-cocinero-plancha-down': 'boss-cocinero-plancha-down',
    'boss-presentador-bingo-walkA': 'boss-presentador-bingo-idle',
    'boss-presentador-bingo-walkB': 'boss-presentador-bingo-attack',
    'boss-presentador-bingo-stun': 'boss-presentador-bingo-hurt',
    'boss-presentador-bingo-down': 'boss-presentador-bingo-down',
    'boss-jefe-bar-walkA': 'boss-jefe-bar-idle',
    'boss-jefe-bar-walkB': 'boss-jefe-bar-angry',
    'boss-jefe-bar-stun': 'boss-jefe-bar-stun',
    'boss-jefe-bar-down': 'boss-jefe-bar-down',
  },
  // Color de la chaqueta turquesa de Marcos para el provisional por código.
  playerSkin: { tint: '#2ec4b6' },
  // El perseguidor invencible es el camarero con la cuenta.
  chaser: { draw: 'camarero' },
  // Onomatopeyas del juego (con sprite propio cada una, ya en main).
  onomatopeyaSprites: ['ui-bleeeh', 'ui-glup', 'ui-plaf', 'ui-crac'],
  // Objetos de las mecánicas de los bares y proyectiles de los jefes (bloque A9).
  // Están en disco y registrados en sprite-list.js; el motor los usará cuando
  // lleguen las mecánicas de campaña (C1, #57).
  mecanicas: {
    mancha: 'obj-mancha',      // Bar La Taca: mancha que resbala
    sorteo: 'obj-sorteo',      // Bar Los Concursos: bola de sorteo con «?»
    bandeja: 'obj-bandeja',    // Bar Pols: bandeja deslizante
    campana: 'obj-campana',    // aviso de pedido en la barra
    ticket: 'obj-ticket',      // la cuenta del camarero
  },
  proyectiles: {
    tostada: 'proj-tostada',   // jefe Cocinero de la Plancha
    aceite: 'proj-aceite',     // jefe Cocinero de la Plancha
    bola: 'proj-bola',         // jefe Presentador del Bingo
    cazo: 'proj-cazo',         // jefe del Bar (jefe final)
  },
  // Proyectil dibujado de cada jefe de campaña (arte A9): el motor lo consulta
  // al disparar y lo pinta con `drawShot`. Sin entrada, dibujo por código.
  bossShots: {
    'cocinero-plancha': 'proj-tostada',
    'presentador-bingo': 'proj-bola',
    jefa: 'obj-bandeja',
    'jefe-bar': 'proj-cazo',
  },
  // Mensajes al recibir daño.
  // Golpes del jefe.
  // Etiquetas del HUD.
  hud: {},
  titleScreen: {},
  juice: {},
  // Textos de los premios potenciadores.
  powers: {},
  // Etiquetas de los botones táctiles.
  touch: {},
  // Mensajes de fin de partida.
  gameOver: {},
  ending: {},
  banner: {},
  // Comportamiento de cada esmorzar (mismas claves y mecánicas que el motor).
  enemyTypes: {
    portavoz: { speed: 100, jump: 0.18, drop: 0.45, shoot: 'shout', rate: [3.2, 5], res: 1, score: 200 },
    tertuliano: { speed: 90, jump: 0.45, drop: 0.3, shoot: 'bulo', rate: [3.5, 5.5], res: 1, score: 200 },
    asesor: { speed: 165, jump: 0.1, drop: 0.85, shoot: null, res: 1, ghost: true, score: 300 },
    influencer: { speed: 120, jump: 0.9, hop: true, drop: 0.5, shoot: 'flash', rate: [3.8, 6], res: 0.9, score: 300 },
    activista: { speed: 190, jump: 0.25, drop: 0.6, shoot: null, res: 1, chase: true, score: 300 },
    lider: { speed: 72, jump: 0.15, drop: 0.3, shoot: 'shout', rate: [4, 6], res: 2.1, score: 500 },
    baron: { speed: 105, jump: 0.5, drop: 0.7, shoot: null, res: 1.3, chase: true, score: 400 },
    diputado: { speed: 66, jump: 0.35, drop: 0.25, shoot: 'bulo', rate: [4.5, 7], res: 1.5, score: 400 },
  },
  // Colores de dibujo provisional por código (nunca negro).
  enemyColors: {
    portavoz: '#ff9d2e',
    tertuliano: '#a86a32',
    asesor: '#e8d9b0',
    influencer: '#c98f4e',
    activista: '#ff6b6b',
    lider: '#ffd23f',
    baron: '#c62f4a',
    diputado: '#f2c14e',
  },
};

// Rondas del arcade: cada bar tiene su escenario de muebles (issue #96). El
// cuarto valor de cada plataforma es el `kind` de mueble de bar que dibuja
// src/background.js (barra, taburete, mesa, silla, estante, caja, nevera,
// toldo, mostrador, barril). Los escalones son irregulares y hay un hueco
// central para los combos de la bola; todo sigue siendo alcanzable con el salto
// del motor (lo comprueban tests/game.test.js y tests/escenarios.test.js).
const RAW = [
  { theme: 'barra',
    plats: [[70, 540, 250, 'taburete'], [960, 540, 250, 'taburete'], [300, 460, 240, 'mesa'], [740, 460, 240, 'mesa'],
      [110, 350, 210, 'barril'], [960, 350, 210, 'barril'], [330, 280, 620, 'barra'], [520, 165, 240, 'estante']],
    foes: [['portavoz', 180, 540], ['portavoz', 1060, 540], ['tertuliano', 620, 280]] },
  { theme: 'terraza',
    plats: [[0, 540, 290, 'toldo'], [990, 540, 290, 'toldo'], [250, 450, 230, 'mesa'], [800, 450, 230, 'mesa'],
      [470, 380, 340, 'mesa'], [60, 300, 240, 'silla'], [980, 300, 240, 'silla'], [380, 200, 520, 'toldo']],
    foes: [['portavoz', 120, 540], ['tertuliano', 1120, 540], ['influencer', 600, 380], ['portavoz', 620, 200]] },
  { theme: 'mercado',
    plats: [[150, 540, 430, 'mostrador'], [700, 540, 430, 'mostrador'], [20, 440, 300, 'caja'], [960, 440, 300, 'caja'],
      [380, 340, 520, 'mostrador'], [180, 230, 260, 'caja'], [840, 230, 260, 'caja'], [480, 140, 320, 'toldo']],
    foes: [['asesor', 360, 540], ['portavoz', 910, 540], ['influencer', 640, 340], ['tertuliano', 310, 230]] },
  { theme: 'barra',
    plats: [[55, 540, 225, 'taburete'], [530, 540, 225, 'taburete'], [1000, 540, 225, 'taburete'], [280, 430, 260, 'mesa'],
      [740, 430, 260, 'mesa'], [110, 320, 220, 'nevera'], [950, 320, 220, 'nevera'], [420, 250, 440, 'barra'], [400, 140, 480, 'estante']],
    foes: [['activista', 160, 540], ['influencer', 1110, 540], ['asesor', 410, 430], ['tertuliano', 870, 430], ['portavoz', 640, 250], ['activista', 640, 140]] },
  { theme: 'barra', boss: 'tertuliano',
    plats: [[60, 500, 380, 'barra'], [60, 360, 300, 'estante'], [60, 220, 380, 'barra'], [520, 430, 200, 'taburete']], foes: [] },
  { theme: 'noche',
    plats: [[0, 540, 410, 'mostrador'], [870, 540, 410, 'mostrador'], [330, 420, 620, 'barra'], [0, 300, 280, 'nevera'],
      [1000, 300, 280, 'nevera'], [380, 300, 520, 'estante'], [500, 180, 280, 'barril']],
    foes: [['baron', 200, 540], ['diputado', 1080, 540], ['activista', 640, 420], ['asesor', 140, 300], ['influencer', 1140, 300], ['baron', 640, 180]] },
  { theme: 'terraza',
    plats: [[80, 540, 420, 'toldo'], [780, 540, 420, 'toldo'], [80, 430, 280, 'mesa'], [920, 430, 280, 'mesa'],
      [420, 370, 440, 'mesa'], [80, 270, 350, 'silla'], [850, 270, 350, 'silla'], [460, 160, 360, 'toldo']],
    foes: [['diputado', 250, 540], ['lider', 1000, 540], ['tertuliano', 220, 430], ['activista', 1060, 430], ['baron', 640, 370], ['influencer', 640, 160]] },
  { theme: 'playa',
    plats: [[0, 540, 250, 'barril'], [1030, 540, 250, 'barril'], [300, 470, 680, 'mostrador'], [50, 350, 320, 'caja'],
      [910, 350, 320, 'caja'], [430, 280, 420, 'toldo'], [0, 150, 270, 'caja'], [1010, 150, 270, 'caja']],
    foes: [['asesor', 120, 540], ['asesor', 1150, 540], ['lider', 640, 470], ['diputado', 210, 350], ['baron', 1070, 350], ['activista', 640, 280], ['influencer', 130, 150]] },
  { theme: 'mercado',
    plats: [[40, 540, 460, 'mostrador'], [780, 540, 460, 'mostrador'], [250, 430, 780, 'mostrador'], [40, 310, 380, 'caja'],
      [860, 310, 380, 'caja'], [300, 180, 680, 'toldo']],
    foes: [['lider', 270, 540], ['diputado', 1010, 540], ['tertuliano', 640, 430], ['asesor', 230, 310], ['activista', 1050, 310], ['portavoz', 640, 180], ['influencer', 450, 180]] },
  { theme: 'playa', boss: 'lider',
    plats: [[60, 500, 380, 'mostrador'], [60, 360, 300, 'caja'], [60, 220, 380, 'mostrador'], [520, 430, 200, 'barril']], foes: [] },
];

export const STAGES = RAW.map((s) => ({ ...s, plats: [FLOOR, ...s.plats.map(([x, y, w, kind]) => ({ ...P(x, y, w), kind: kind || 'barra' }))] }));
export const STAGE_COUNT = STAGES.length;
localizeTheme(THEME, STAGES);

// Canciones sintetizadas propias del tema (melodías originales, sin muestras).
const NOTE = (n) => {
  if (!n || n === '-') return 0;
  const m = /^([A-G])(#?)(\d)$/.exec(n); if (!m) return 0;
  const k = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  return 440 * 2 ** ((k + (Number(m[3]) - 4) * 12 - 9) / 12);
};
const seq = (s) => s.trim().split(/\s+/).map((tok) => { const [n, d] = tok.split(':'); return [NOTE(n), Number(d || 1)]; });

export const SONGS = {
  title: { bpm: 118, lead: seq(`E4:2 G4:2 A4:2 C5:2 B4:1 A4:1 G4:2 E4:2 F4:2 G4:1 A4:1 B4:2 A4:2 G4:4
    E4:2 G4:2 A4:2 G4:2 F4:1 E4:1 D4:2 E4:2 C4:2 D4:2 E4:1 D4:1 C4:2 -:4`),
    bass: seq(`C3:4 G3:4 A3:4 E3:4 F3:4 C3:4 G3:4 G3:4 C3:4 G3:4 A3:4 E3:4 F3:4 G3:4 D3:4 G3:4`), drums: 'k-h-s-h-k-s-h-s-' },
  stage: { bpm: 146, lead: seq(`A4:1 C5:1 E5:1 A5:2 G5:1 E5:1 C5:2 D5:1 E5:1 F5:2 E5:2 D5:2
    C5:1 D5:1 E5:1 G5:2 E5:1 D5:1 C5:2 A4:2 C5:2 D5:2 E5:4`),
    bass: seq(`A2:2 E3:2 A2:2 E3:2 F2:2 C3:2 F2:2 C3:2 G2:2 D3:2 G2:2 D3:2 C3:2 G2:2 C3:2 C3:2
    A2:2 E3:2 A2:2 E3:2 F2:2 C3:2 G2:2 G2:2 C3:4 -:4`), drums: 'k-hsk-hsk-hsk-hs' },
  boss: { bpm: 160, lead: seq(`D5:1 D5:1 F5:1 D5:1 G5:1 D5:1 A5:1 B5:1 -:2 A5:1 G5:1 F5:1 E5:1 D5:2
    D5:1 D5:1 F5:1 D5:1 C5:1 A4:1 G4:1 A4:1 B4:3 C5:2 A4:2 D5:4`),
    bass: seq(`D3:1 D3:1 A3:1 D3:1 D3:1 A3:1 D3:1 A3:1 B2:1 B2:1 F3:1 B2:1 G2:1 G3:1 G2:1 G#2:1
    D3:1 D3:1 A3:1 D3:1 D3:1 A3:1 D3:1 A3:1 E2:1 E3:1 E2:1 E3:1 G2:1 G3:1 G2:1 G2:1`), drums: 'kkhskkhskkhskshs' },
  bonus: { bpm: 170, lead: seq(`G5:1 A5:1 B5:1 C6:1 B5:1 A5:1 G5:1 A5:1 F5:1 G5:1 A5:1 B5:1 A5:1 G5:1 F5:1 G5:1
    E5:1 F5:1 G5:1 A5:1 G5:1 F5:1 E5:1 F5:1 D5:1 E5:1 F5:1 G5:2 E5:2`),
    bass: seq(`C3:2 G3:2 A3:2 E3:2 F3:2 C3:2 G3:2 G3:2`), drums: 'k-hsk-hs' },
};

// Named exports de sub-partes del tema (para importación directa en módulos).
export const onomatopeyasKeys = THEME.onomatopeyasKeys;
export const letters = THEME.letters;
export const bossHp = THEME.bossHp;
export const stage = THEME.stage;
export const enemyTypes = THEME.enemyTypes;
export const enemyColors = THEME.enemyColors;
