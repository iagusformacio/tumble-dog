// Tema «tumbledog»: todo el contenido específico del juego original (arte, textos,
// fases, música, nombres). Extraído para que el motor sea tema-agnóstico y se
// puedan añadir más temas (p. ej. «Dieta de Marcos») sin tocar el motor.
// Todo inventado: nada de personas reales ni personajes protegidos.
import { FLOOR } from '../physics.js';

const T = 18;
const P = (x, y, w) => ({ x, y, w, h: T });

export const THEME = {
  id: 'tumbledog',
  name: 'Tumble Dog',
  title: 'TUMBLE DOG',
  tagline: 'EL PRESIDENTE QUE ASPIRA A LA OPOSICIÓN',
  // Letras que se recogen para desbloquear la ronda bonus.
  letters: { word: 'TUMBLEDOG', dropChance: 0.3, bubbleSpeed: 70 },
  // Vida de los jefes por tipo.
  bossHp: { tertuliano: 10, lider: 14 },
  // Temporizado de fase.
  stage: { hurryAt: 32, chaserAt: 42, clearDelay: 1.6, introTime: 1.8 },
  // Mensajes al recibir daño.
  hurtMessages: ['¡DIMISIÓN!', '¡ESCÁNDALO!', '¡CRISIS!', '¡MOCIÓN!'],
  // Onomatopeyas del juego.
  onomatopeyas: ['¡PAF!', '¡ZAS!', '¡PUM!', '¡CATAPUM!', '¡PLAF!', '¡TOMA!', '¡ZASCA!', '¡BOING!'],
  // Etiquetas del HUD.
  hud: {
    puntos: 'PUNTOS',
    record: 'RÉCORD',
    fase: 'FASE',
    tiempo: 'TIEMPO',
    datePrisa: '¡DATE PRISA!',
    turbo: 'TURBO',
    pow: 'POW',
    pausa: 'PAUSA',
    vidaExtra: '¡1UP!',
  },
  // Textos de la pantalla de título.
  titleScreen: {
    startTouch: 'TOCA PARA JUGAR',
    startKeyboard: 'PULSA ESPACIO PARA JUGAR',
    move: '← →  MOVER',
    jump: 'ESPACIO  SALTAR',
    down: '↓+ESPACIO  BAJAR',
    suck: 'X  ASPIRAR (MANTÉN)',
    shoot: 'Z  LANZAR LA BOLA',
    lettersHint: 'JUNTA LAS LETRAS T·U·M·B·L·E·D·O·G',
    mute: 'M SONIDO',
    pause: 'P PAUSA',
    parody: 'Personajes inventados · parodia',
  },
  // Etiquetas de los botones táctiles.
  touch: { jump: 'SALTO', suck: 'ASPIRA', shoot: 'LANZA' },
  // Texto del botón de pausa.
  pause: 'PAUSA',
  // Juice (onomatopeyas y avisos breves).
  juice: {
    capture: '¡GLUP!',
    shatter: '¡CRAC!',
    wall: '¡BOING!',
    escape: '¡SE ESCAPAN!',
    oneup: '¡1UP!',
    chaser: '¡LLEGA HACIENDA!',
  },
  // Mensajes de fin de partida.
  gameOver: { puntos: 'PUNTOS', continuar: '¿CONTINUAR?' },
  ending: {
    completed: '¡LEGISLATURA COMPLETADA!',
    puntos: 'PUNTOS',
    next: 'PULSA PARA LA SIGUIENTE LEGISLATURA (MÁS DIFÍCIL)',
  },
  banner: { jefe: '¡JEFE!', faseLimpia: '¡FASE LIMPIA!', adios: '¡ADIÓS, OPOSICIÓN!', bonus: '¡RONDA BONUS!', cogeTodo: '¡COGE TODO!' },
  // Comportamiento de cada tipo de enemigo (nombres, velocidad, saltos, disparos...).
  enemyTypes: {
    portavoz: { name: 'La Portavoz Airada', speed: 100, jump: 0.18, drop: 0.45, shoot: 'shout', rate: [3.2, 5], res: 1, score: 200 },
    tertuliano: { name: 'El Tertuliano', speed: 90, jump: 0.45, drop: 0.3, shoot: 'bulo', rate: [3.5, 5.5], res: 1, score: 200 },
    asesor: { name: 'El Asesor Misterioso', speed: 165, jump: 0.1, drop: 0.85, shoot: null, res: 1, ghost: true, score: 300 },
    influencer: { name: 'El Influencer Bulero', speed: 120, jump: 0.9, hop: true, drop: 0.5, shoot: 'flash', rate: [3.8, 6], res: 0.9, score: 300 },
    activista: { name: 'La Activista Municipal', speed: 190, jump: 0.25, drop: 0.6, shoot: null, res: 1, chase: true, score: 300 },
    lider: { name: 'El Líder Eterno', speed: 72, jump: 0.15, drop: 0.3, shoot: 'shout', rate: [4, 6], res: 2.1, score: 500 },
    baron: { name: 'El Barón Regional', speed: 105, jump: 0.5, drop: 0.7, shoot: null, res: 1.3, chase: true, score: 400 },
    diputado: { name: 'El Diputado Gruñón', speed: 66, jump: 0.35, drop: 0.25, shoot: 'bulo', rate: [4.5, 7], res: 1.5, score: 400 },
  },
  // Colores de dibujo provisional por código (nunca negro).
  enemyColors: {
    portavoz: '#ff4d4d',
    tertuliano: '#ffb627',
    asesor: '#c9a3ff',
    influencer: '#ff4fa3',
    activista: '#3bceac',
    diputado: '#ff8fa3',
    lider: '#ff6b6b',
    baron: '#ffe14d',
  },
};

const RAW = [
  { name: 'LOS JARDINES', theme: 'manana', plats: [[80, 520, 340], [860, 520, 340], [380, 400, 520], [80, 280, 380], [820, 280, 380], [480, 160, 320]],
    foes: [['portavoz', 340, 520], ['portavoz', 1000, 520], ['tertuliano', 700, 400]] },
  { name: 'LA ESCALINATA', theme: 'manana', plats: [[0, 520, 300], [980, 520, 300], [240, 400, 300], [740, 400, 300], [470, 280, 340], [60, 190, 300], [920, 190, 300]],
    foes: [['portavoz', 120, 520], ['tertuliano', 1100, 520], ['influencer', 380, 400], ['portavoz', 880, 400], ['tertuliano', 620, 280]] },
  { name: 'EL PÓRTICO', theme: 'mediodia', plats: [[160, 520, 960], [0, 400, 360], [920, 400, 360], [300, 280, 680], [120, 160, 260], [900, 160, 260]],
    foes: [['asesor', 640, 520], ['portavoz', 150, 400], ['portavoz', 1100, 400], ['influencer', 640, 280], ['tertuliano', 250, 160]] },
  { name: 'LA SALA DE PRENSA', theme: 'mediodia', plats: [[60, 520, 260], [510, 520, 260], [960, 520, 260], [280, 400, 260], [740, 400, 260], [60, 280, 260], [510, 280, 260], [960, 280, 260], [380, 160, 520]],
    foes: [['activista', 180, 520], ['influencer', 1080, 520], ['asesor', 400, 400], ['tertuliano', 860, 400], ['portavoz', 640, 280], ['activista', 640, 160]] },
  { name: 'JEFE: EL GRAN TERTULIANO', theme: 'atardecer', boss: 'tertuliano', plats: [[60, 500, 380], [60, 360, 300], [60, 220, 380], [520, 430, 200]],
    foes: [] },
  { name: 'EL CONSEJO DE MINISTROS', theme: 'atardecer', plats: [[0, 520, 420], [860, 520, 420], [330, 400, 620], [0, 280, 300], [980, 280, 300], [400, 280, 480], [500, 160, 280]],
    foes: [['baron', 200, 520], ['diputado', 1060, 520], ['activista', 640, 400], ['asesor', 150, 280], ['influencer', 1130, 280], ['baron', 640, 160]] },
  { name: 'EL DESPACHO OVAL... DE AQUÍ', theme: 'ocaso', plats: [[100, 520, 1080], [100, 400, 300], [880, 400, 300], [440, 340, 400], [100, 240, 360], [820, 240, 360], [460, 140, 360]],
    foes: [['diputado', 300, 520], ['lider', 980, 520], ['tertuliano', 250, 400], ['activista', 1030, 400], ['baron', 640, 340], ['influencer', 640, 140]] },
  { name: 'EL HELIPUERTO', theme: 'ocaso', plats: [[0, 520, 240], [1040, 520, 240], [320, 460, 640], [80, 340, 340], [860, 340, 340], [440, 230, 400], [0, 140, 260], [1020, 140, 260]],
    foes: [['asesor', 120, 520], ['asesor', 1160, 520], ['lider', 640, 460], ['diputado', 250, 340], ['baron', 1030, 340], ['activista', 640, 230], ['influencer', 130, 140]] },
  { name: 'LA NOCHE ELECTORAL', theme: 'noche', plats: [[60, 520, 500], [720, 520, 500], [260, 400, 760], [60, 280, 420], [800, 280, 420], [300, 160, 680]],
    foes: [['lider', 300, 520], ['diputado', 960, 520], ['tertuliano', 640, 400], ['asesor', 250, 280], ['activista', 1000, 280], ['portavoz', 640, 160], ['influencer', 450, 160]] },
  { name: 'JEFE FINAL: EL LÍDER ETERNO', theme: 'noche', boss: 'lider', plats: [[60, 500, 380], [60, 360, 300], [60, 220, 380], [520, 430, 200]],
    foes: [] },
];

export const STAGES = RAW.map((s) => ({ ...s, plats: [FLOOR, ...s.plats.map(([x, y, w]) => P(x, y, w))] }));
export const STAGE_COUNT = STAGES.length;

// Canciones sintetizadas (melodías originales, sin muestras).
const NOTE = (n) => {
  if (!n || n === '-') return 0;
  const m = /^([A-G])(#?)(\d)$/.exec(n); if (!m) return 0;
  const k = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  return 440 * 2 ** ((k + (Number(m[3]) - 4) * 12 - 9) / 12);
};
const seq = (s) => s.trim().split(/\s+/).map((tok) => { const [n, d] = tok.split(':'); return [NOTE(n), Number(d || 1)]; });

export const SONGS = {
  title: { bpm: 128, lead: seq(`G4:2 C5:2 E5:2 G5:2 E5:1 F5:1 G5:2 E5:2 C5:2 D5:2 E5:1 D5:1 C5:2 A4:2 G4:4
    A4:2 C5:2 F5:2 A5:2 G5:1 F5:1 E5:2 D5:2 C5:2 B4:2 C5:1 D5:1 E5:2 D5:2 -:4`),
    bass: seq(`C3:4 G3:4 C3:4 G3:4 F3:4 C3:4 G3:4 G2:4 F3:4 C4:4 F3:4 C3:4 G3:4 D3:4 G3:4 G2:4`), drums: 'k-h-s-h-k-k-s-h-' },
  stage: { bpm: 152, lead: seq(`E5:1 E5:1 -:1 C5:1 E5:2 G5:2 -:2 G4:2 -:2 C5:3 G4:3 E4:2 A4:2 B4:2 A#4:1 A4:2
    G4:1 E5:1 G5:1 A5:2 F5:1 G5:1 -:1 E5:2 C5:1 D5:1 B4:3 C5:2 E5:1 G5:1 A5:2 G5:1 E5:1 D5:1 C5:1 D5:2 G4:2 C5:4`),
    bass: seq(`C3:2 G3:2 C3:2 G3:2 F3:2 C4:2 F3:2 C4:2 G3:2 D4:2 G3:2 D4:2 C3:2 G3:2 C3:2 G3:2
    A2:2 E3:2 A2:2 E3:2 F3:2 C4:2 G3:2 G2:2 C3:2 G3:2 F3:2 G3:2 C3:4 -:4`), drums: 'k-hsk-hsk-hsk-hs' },
  boss: { bpm: 168, lead: seq(`A4:1 A4:1 C5:1 A4:1 D5:1 A4:1 D#5:1 E5:1 -:2 E5:1 D5:1 C5:1 B4:1 A4:2
    A4:1 A4:1 C5:1 A4:1 G5:1 F5:1 E5:1 D5:1 E5:3 B4:1 C5:2 B4:2 G#4:4`),
    bass: seq(`A2:1 A2:1 A3:1 A2:1 A2:1 A3:1 A2:1 A3:1 F2:1 F2:1 F3:1 F2:1 G2:1 G3:1 G2:1 G#2:1
    A2:1 A2:1 A3:1 A2:1 A2:1 A3:1 A2:1 A3:1 E2:1 E3:1 E2:1 E3:1 E2:1 E3:1 G#2:1 B2:1`), drums: 'kkhskkhskkhskshs' },
  bonus: { bpm: 176, lead: seq(`C5:1 E5:1 G5:1 C6:1 G5:1 E5:1 C5:1 E5:1 D5:1 F5:1 A5:1 D6:1 A5:1 F5:1 D5:1 F5:1
    E5:1 G5:1 B5:1 E6:1 B5:1 G5:1 E5:1 G5:1 F5:1 A5:1 C6:1 F6:1 E6:2 C6:2`),
    bass: seq(`C3:2 C4:2 D3:2 D4:2 E3:2 E4:2 F3:2 G3:2`), drums: 'k-hsk-hs' },
};

// Named exports de sub-partes del tema (para importación directa en módulos).
export const onomatopeyas = THEME.onomatopeyas;
export const letters = THEME.letters;
export const bossHp = THEME.bossHp;
export const stage = THEME.stage;
export const enemyTypes = THEME.enemyTypes;
export const enemyColors = THEME.enemyColors;
