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
  name: 'Dieta de Marcos',
  title: 'DIETA DE MARCOS',
  tagline: '¡MARcos TRAGA ESMORZARS Y LOS VOMITA!',
  // Verbos propios del tema (aspirar = TRAGAR, lanzar = VOMITAR).
  verbs: { suck: 'TRAGAR', shoot: 'VOMITAR' },
  // Letras que se recogen para desbloquear la ronda bonus.
  letters: { word: 'ESMORZAR', dropChance: 0.3, bubbleSpeed: 70 },
  // Vida de los jefes por tipo (mismas claves de tipo que el motor).
  bossHp: { tertuliano: 10, lider: 14 },
  // Nombres de jefe propios del tema.
  bossNames: { tertuliano: 'EL BOCATA GIGANTE', lider: 'LA PAELLA GIGANTE' },
  // Temporizado de fase.
  stage: { hurryAt: 30, chaserAt: 40, clearDelay: 1.6, introTime: 1.8 },
  // Fondos por código del motor sustituidos por escenarios del tema:
  // 'barra'/'terraza'/'mercado'/'playa' son los de las fases; en el título,
  // bonus y ending se usan startTheme/bonusTheme/nightTheme.
  startTheme: 'barra', bonusTheme: 'mercado', nightTheme: 'noche',
  backgrounds: {
    noche: 'fondo-noche-jefe',
    barra: 'fondo-barra',
    terraza: 'fondo-terraza',
    mercado: 'fondo-mercado',
    playa: 'fondo-playa',
  },
  // Música (issue #95): la canción aportada por la persona ES la música del
  // tema — título, todas las fases, jefes y ronda bonus —, en bucle y con
  // fundido al cambiar de pantalla. Las canciones sintetizadas de abajo quedan
  // solo como respaldo si el mp3 no carga; los efectos siguen siendo WebAudio.
  audio: {
    title: './assets/audio/dieta-de-marcos.mp3',
    stage: './assets/audio/dieta-de-marcos.mp3',
    boss: './assets/audio/dieta-de-marcos.mp3',
    bonus: './assets/audio/dieta-de-marcos.mp3',
  },
  // Volumen de la canción respecto a los efectos y velocidad por sección
  // (en los jefes va un poco más rápida, sin cambiar de canción).
  audioVolume: 0.5,
  audioRate: { title: 1, stage: 1, boss: 1.08, bonus: 1 },
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
  chaser: { name: 'EL CAMARERO CON LA CUENTA', draw: 'camarero' },
  // Onomatopeyas del juego (con sprite propio cada una, ya en main).
  onomatopeyas: ['¡BLEEEH!', '¡GLUP!', '¡PLAF!', '¡CRAC!'],
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
  hurtMessages: ['¡INDIGESTIÓN!', '¡ESO NO ASIENTA!', '¡DEMASIADO PICANTE!', '¡REPITE!'],
  // Golpes del jefe.
  bossHitWords: ['¡ESO ESTABA CADUCADO!', '¡ME LA HAN COLADO!', '¡QUÉ RABIA!'],
  // Etiquetas del HUD.
  hud: {
    puntos: 'PUNTOS',
    record: 'RÉCORD',
    fase: 'RONDA',
    tiempo: 'TIEMPO',
    datePrisa: '¡DATE PRISA O LLEGA LA CUENTA!',
    turbo: 'CAFÉ DOBLE',
    pow: 'SUPERTRAGÓN',
    pausa: 'SIESTA',
    vidaExtra: '¡1UP!',
  },
  // Textos de los premios potenciadores.
  powers: { speed: '¡CAFÉ DOBLE!', pow: '¡SUPERTRAGÓN!', freeze: '¡SIESTA EN LA BARRA!' },
  // Textos de la pantalla de título.
  titleScreen: {
    startTouch: 'TOCA PARA EMPEZAR A COMER',
    startKeyboard: 'PULSA ESPACIO PARA EMPEZAR',
    move: '← →  MOVER',
    jump: 'ESPACIO  SALTAR',
    down: '↓+ESPACIO  AGACHAR',
    suck: 'X  TRAGAR (MANTÉN)',
    shoot: 'Z  VOMITAR',
    lettersHint: 'JUNTA LAS LETRAS E·S·M·O·R·Z·A·R',
    mute: 'M SONIDO',
    pause: 'P PAUSA',
    parody: 'Personajes inventados · humor de bar',
  },
  // Etiquetas de los botones táctiles.
  touch: { jump: 'SALTO', suck: 'TRAGA', shoot: 'VOMITA' },
  // Texto del botón de pausa.
  pause: 'PAUSA',
  // Juice (onomatopeyas y avisos breves).
  juice: {
    capture: '¡GLUP!',
    shatter: '¡PLAF!',
    wall: '¡REBOTE!',
    escape: '¡INDIGESTIÓN!',
    oneup: '¡1UP!',
    chaser: '¡LLEGA EL CAMARERO CON LA CUENTA!',
  },
  // Mensajes de fin de partida.
  gameOver: { puntos: 'PUNTOS', continuar: '¿OTRA RONDA?' },
  ending: {
    completed: '¡ESMORZAR COMPLETADO!',
    puntos: 'PUNTOS',
    next: 'PULSA PARA OTRO BAR (MÁS LLENO)',
  },
  banner: { jefe: '¡JEFE DE BAR!', faseLimpia: '¡BAR LIMPIO!', adios: '¡ADIÓS, ESMORZAR!', bonus: '¡RONDA BONUS!', cogeTodo: '¡COGE TODO!' },
  // Comportamiento de cada esmorzar (mismas claves y mecánicas que el motor).
  enemyTypes: {
    portavoz: { name: 'El Bocadillo de Calamares', speed: 100, jump: 0.18, drop: 0.45, shoot: 'shout', rate: [3.2, 5], res: 1, score: 200 },
    tertuliano: { name: 'El Carajillo', speed: 90, jump: 0.45, drop: 0.3, shoot: 'bulo', rate: [3.5, 5.5], res: 1, score: 200 },
    asesor: { name: 'El Café con Leche', speed: 165, jump: 0.1, drop: 0.85, shoot: null, res: 1, ghost: true, score: 300 },
    influencer: { name: 'El Cacahuete Saltarín', speed: 120, jump: 0.9, hop: true, drop: 0.5, shoot: 'flash', rate: [3.8, 6], res: 0.9, score: 300 },
    activista: { name: 'El Bocata de Lomo', speed: 190, jump: 0.25, drop: 0.6, shoot: null, res: 1, chase: true, score: 300 },
    lider: { name: 'La Tostada con Tomate', speed: 72, jump: 0.15, drop: 0.3, shoot: 'shout', rate: [4, 6], res: 2.1, score: 500 },
    baron: { name: 'El Chupito', speed: 105, jump: 0.5, drop: 0.7, shoot: null, res: 1.3, chase: true, score: 400 },
    diputado: { name: 'La Tortilla de Patatas', speed: 66, jump: 0.35, drop: 0.25, shoot: 'bulo', rate: [4.5, 7], res: 1.5, score: 400 },
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

const RAW = [
  { name: 'BAR LA TACA · LA BARRA', theme: 'barra', plats: [[80, 520, 340], [860, 520, 340], [380, 400, 520], [80, 280, 380], [820, 280, 380], [480, 160, 320]],
    foes: [['portavoz', 340, 520], ['portavoz', 1000, 520], ['tertuliano', 700, 400]] },
  { name: 'BAR LA TACA · LA TERRAZA', theme: 'terraza', plats: [[0, 520, 300], [980, 520, 300], [240, 400, 300], [740, 400, 300], [470, 280, 340], [60, 190, 300], [920, 190, 300]],
    foes: [['portavoz', 120, 520], ['tertuliano', 1100, 520], ['influencer', 380, 400], ['portavoz', 880, 400], ['tertuliano', 620, 280]] },
  { name: 'BAR LOS CONCUERSOS · EL MERCADO', theme: 'mercado', plats: [[160, 520, 960], [0, 400, 360], [920, 400, 360], [300, 280, 680], [120, 160, 260], [900, 160, 260]],
    foes: [['asesor', 640, 520], ['portavoz', 150, 400], ['portavoz', 1100, 400], ['influencer', 640, 280], ['tertuliano', 250, 160]] },
  { name: 'BAR POLS · LA SALA', theme: 'barra', plats: [[60, 520, 260], [510, 520, 260], [960, 520, 260], [280, 400, 260], [740, 400, 260], [60, 280, 260], [510, 280, 260], [960, 280, 260], [380, 160, 520]],
    foes: [['activista', 180, 520], ['influencer', 1080, 520], ['asesor', 400, 400], ['tertuliano', 860, 400], ['portavoz', 640, 280], ['activista', 640, 160]] },
  { name: 'JEFE: EL BOCATA GIGANTE', theme: 'barra', boss: 'tertuliano', plats: [[60, 500, 380], [60, 360, 300], [60, 220, 380], [520, 430, 200]], foes: [] },
  { name: 'BAR DEL JEFE · LA BARRA', theme: 'noche', plats: [[0, 520, 420], [860, 520, 420], [330, 400, 620], [0, 280, 300], [980, 280, 300], [400, 280, 480], [500, 160, 280]],
    foes: [['baron', 200, 520], ['diputado', 1060, 520], ['activista', 640, 400], ['asesor', 150, 280], ['influencer', 1130, 280], ['baron', 640, 160]] },
  { name: 'LA TERRAZA DE VALÈNCIA', theme: 'terraza', plats: [[100, 520, 1080], [100, 400, 300], [880, 400, 300], [440, 340, 400], [100, 240, 360], [820, 240, 360], [460, 140, 360]],
    foes: [['diputado', 300, 520], ['lider', 980, 520], ['tertuliano', 250, 400], ['activista', 1030, 400], ['baron', 640, 340], ['influencer', 640, 140]] },
  { name: 'EL CHIRINGUITO DE LA PLAYA', theme: 'playa', plats: [[0, 520, 240], [1040, 520, 240], [320, 460, 640], [80, 340, 340], [860, 340, 340], [440, 230, 400], [0, 140, 260], [1020, 140, 260]],
    foes: [['asesor', 120, 520], ['asesor', 1160, 520], ['lider', 640, 460], ['diputado', 250, 340], ['baron', 1030, 340], ['activista', 640, 230], ['influencer', 130, 140]] },
  { name: 'LA NOCHE DEL MERCADO', theme: 'mercado', plats: [[60, 520, 500], [720, 520, 500], [260, 400, 760], [60, 280, 420], [800, 280, 420], [300, 160, 680]],
    foes: [['lider', 300, 520], ['diputado', 960, 520], ['tertuliano', 640, 400], ['asesor', 250, 280], ['activista', 1000, 280], ['portavoz', 640, 160], ['influencer', 450, 160]] },
  { name: 'JEFE FINAL: LA PAELLA GIGANTE', theme: 'playa', boss: 'lider', plats: [[60, 500, 380], [60, 360, 300], [60, 220, 380], [520, 430, 200]], foes: [] },
];

export const STAGES = RAW.map((s) => ({ ...s, plats: [FLOOR, ...s.plats.map(([x, y, w]) => P(x, y, w))] }));
export const STAGE_COUNT = STAGES.length;

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
export const onomatopeyas = THEME.onomatopeyas;
export const letters = THEME.letters;
export const bossHp = THEME.bossHp;
export const stage = THEME.stage;
export const enemyTypes = THEME.enemyTypes;
export const enemyColors = THEME.enemyColors;
