// Tema «marcos»: «Dieta de Marcos», el segundo juego del mismo motor (issue #56, integrado en #77).
// Mismo motor y mecánica que «tumbledog»; arte, textos, fases, letras y música propios.
// Protagonista: Marcos (inventado: hombre redondo, chaqueta turquesa, sonrisa de comilón).
// Enemigos: esmorzars inventados (bocadillo, carajillo, tortilla, café, cacahuete, tostada, chupito...).
// Arte pendiente de A1/A2/A3: mientras no llegue, el tema declara los nombres de sprite que usará
// el motor y el motor dibuja lo que falte por código (siempre visible, nunca negro).
// Todo inventado: nada de personas reales ni personajes protegidos.
import { enemyTypes as TUMBLEDOG_TYPES, enemyColors as TUMBLEDOG_COLORS } from './tumbledog.js';
import { SONGS as TUMBLEDOG_SONGS } from './tumbledog.js';
import { FLOOR } from '../physics.js';

const T = 18;
const P = (x, y, w) => ({ x, y, w, h: T });

const FONDOS = ['barra', 'terraza', 'mercado', 'playa'];
const fondoPara = (i) => FONDOS[i % FONDOS.length];

export const THEME = {
  id: 'marcos',
  name: 'Dieta de Marcos',
  title: 'DIETA DE MARCOS',
  tagline: '¡ADELGAZA ASPIRANDO CHATARRA!',
  // Letras que se recogen para desbloquear la ronda bonus (jugabilidad: CONFIG.letters.word;
  // este es el texto del tema: se muestra en el título y el HUD).
  letters: { word: 'ESMORZAR', dropChance: 0.3, bubbleSpeed: 70 },
  // Vida de los jefes por tipo (misma clave de tipos que tumbledog).
  bossHp: { tertuliano: 10, lider: 14 },
  // Temporizado de fase.
  stage: { hurryAt: 30, chaserAt: 40, clearDelay: 1.6, introTime: 1.8 },
  // Mensajes al recibir daño.
  hurtMessages: ['¡ZÚCAR!', '¡GRASA!', '¡KILO!', '¡EFECTO YO-YO!'],
  // Onomatopeyas del juego.
  onomatopeyas: ['¡BLEEEH!', '¡GLUP!', '¡PLAF!', '¡CRUC!', '¡ZUM!', '¡NOM!'],
  // Etiquetas del HUD.
  hud: {
    puntos: 'PUNTOS',
    record: 'RÉCORD',
    fase: 'DIETA',
    tiempo: 'TIEMPO',
    datePrisa: '¡DATE PRISA CON LA DIETA!',
    turbo: 'TURBO',
    pow: 'POW',
    pausa: 'PAUSA',
    vidaExtra: '¡1UP!',
    // Acciones del protagonista: tragar / vomitar (en lugar de aspirar / lanzar).
    suck: 'TRAGAR',
    shoot: 'VOMITAR',
  },
  // Textos de la pantalla de título.
  titleScreen: {
    startTouch: 'TOCA PARA EMPEZAR LA DIETA',
    startKeyboard: 'PULSA ESPACIO PARA EMPEZAR',
    move: '← →  MOVER',
    jump: 'ESPACIO  SALTAR',
    down: '↓+ESPACIO  AGACHAR',
    suck: 'X  TRAGAR (MANTÉN)',
    shoot: 'Z  VOMITAR',
    lettersHint: 'JUNTA LAS LETRAS E·S·M·O·R·Z·A·R',
    mute: 'M SONIDO',
    pause: 'P PAUSA',
    parody: 'Personajes inventados · parodia',
  },
  // Etiquetas de los botones táctiles.
  touch: { jump: 'SALTO', suck: 'TRAGA', shoot: 'VOMITA' },
  // Texto del botón de pausa.
  pause: 'PAUSA',
  // Juice (onomatopeyas y avisos breves).
  juice: {
    capture: '¡GLUP!',
    shatter: '¡PLAF!',
    wall: '¡BOING!',
    escape: '¡SE ESCAPAN!',
    oneup: '¡1UP!',
    chaser: '¡LLEGA EL CAMARERO CON LA CUENTA!',
    vomit: '¡BLEEEH!',
  },
  // Mensajes de fin de partida.
  gameOver: { puntos: 'PUNTOS', continuar: '¿CONTINUAR?' },
  ending: {
    completed: '¡DIETA COMPLETADA!',
    puntos: 'PUNTOS',
    next: 'PULSA PARA LA SIGUIENTE DIETA (MÁS ESTRICTA)',
  },
  banner: { jefe: '¡JEFE!', faseLimpia: '¡DIETA LIMPIA!', adios: '¡ADIÓS, CHATARRA!', bonus: '¡RONDA BONUS!', cogeTodo: '¡COGE TODO!' },
  // Tipos de enemigo y colores: se reutilizan los de tumbledog (misma mecánica, nombres de
  // esmorzars pendientes de A2/A3). Cuando llegue el arte, el mapeo de sprites se amplía aquí.
  enemyTypes: TUMBLEDOG_TYPES,
  enemyColors: TUMBLEDOG_COLORS,
  // Sprite names que declara el tema y el asset al que se refieren.
  // ui/fondo ya están en main (A4, #57) listos en assets/sprites/.
  // marcos-* llegan con A1 (#62); mientras tanto el jugador se dibuja por código.
  sprites: {
    marcos: {
      idle: 'marcos-idle', walkA: 'marcos-walkA', walkB: 'marcos-walkB',
      jump: 'marcos-jump', fall: 'marcos-fall', suck: 'marcos-suck',
      throw: 'marcos-throw', hurt: 'marcos-hurt', win: 'marcos-win', intro: 'marcos-intro',
    },
    fondo: {
      barra: 'fondo-barra', terraza: 'fondo-terraza', mercado: 'fondo-mercado', playa: 'fondo-playa',
    },
    ui: {
      logo: 'ui-logo-marcos', bolaVomito: 'ui-bola-vomito',
      bleeeh: 'ui-bleeeh', glup: 'ui-glup', plaf: 'ui-plaf',
    },
  },
};

const RAW = [
  { name: 'LA BARRA', fondo: 'barra', theme: 'manana', plats: [[80, 520, 340], [860, 520, 340], [380, 400, 520], [80, 280, 380], [820, 280, 380], [480, 160, 320]], foes: [['portavoz', 340, 520], ['portavoz', 1000, 520], ['tertuliano', 700, 400]] },
  { name: 'LA TERRAZA', fondo: 'terraza', theme: 'manana', plats: [[0, 520, 300], [980, 520, 300], [240, 400, 300], [740, 400, 300], [470, 280, 340], [60, 190, 300], [920, 190, 300]], foes: [['portavoz', 120, 520], ['tertuliano', 1100, 520], ['influencer', 380, 400], ['portavoz', 880, 400], ['tertuliano', 620, 280]] },
  { name: 'EL MERCADO', fondo: 'mercado', theme: 'mediodia', plats: [[160, 520, 960], [0, 400, 360], [920, 400, 360], [300, 280, 680], [120, 160, 260], [900, 160, 260]], foes: [['asesor', 640, 520], ['portavoz', 150, 400], ['portavoz', 1100, 400], ['influencer', 640, 280], ['tertuliano', 250, 160]] },
  { name: 'LA COCINA', fondo: 'playa', theme: 'mediodia', plats: [[60, 520, 260], [510, 520, 260], [960, 520, 260], [280, 400, 260], [740, 400, 260], [60, 280, 260], [510, 280, 260], [960, 280, 260], [380, 160, 520]], foes: [['activista', 180, 520], ['influencer', 1080, 520], ['asesor', 400, 400], ['tertuliano', 860, 400], ['portavoz', 640, 280], ['activista', 640, 160]] },
  { name: 'JEFE: EL GRAN TERTULIANO', fondo: 'terraza', theme: 'atardecer', boss: 'tertuliano', plats: [[60, 500, 380], [60, 360, 300], [60, 220, 380], [520, 430, 200]], foes: [] },
  { name: 'EL SORTEO', fondo: 'barra', theme: 'atardecer', plats: [[0, 520, 420], [860, 520, 420], [330, 400, 620], [0, 280, 300], [980, 280, 300], [400, 280, 480], [500, 160, 280]], foes: [['baron', 200, 520], ['diputado', 1060, 520], ['activista', 640, 400], ['asesor', 150, 280], ['influencer', 1130, 280], ['baron', 640, 160]] },
  { name: 'EL VERMUT', fondo: 'terraza', theme: 'ocaso', plats: [[100, 520, 1080], [100, 400, 300], [880, 400, 300], [440, 340, 400], [100, 240, 360], [820, 240, 360], [460, 140, 360]], foes: [['diputado', 300, 520], ['lider', 980, 520], ['tertuliano', 250, 400], ['activista', 1030, 400], ['baron', 640, 340], ['influencer', 640, 140]] },
  { name: 'LA SOBREMESA', fondo: 'playa', theme: 'ocaso', plats: [[0, 520, 240], [1040, 520, 240], [320, 460, 640], [80, 340, 340], [860, 340, 340], [440, 230, 400], [0, 140, 260], [1020, 140, 260]], foes: [['asesor', 120, 520], ['asesor', 1160, 520], ['lider', 640, 460], ['diputado', 250, 340], ['baron', 1030, 340], ['activista', 640, 230], ['influencer', 130, 140]] },
  { name: 'LA NOCHE DEL BAR', fondo: 'barra', theme: 'noche', plats: [[60, 520, 500], [720, 520, 500], [260, 400, 760], [60, 280, 420], [800, 280, 420], [300, 160, 680]], foes: [['lider', 300, 520], ['diputado', 960, 520], ['tertuliano', 640, 400], ['asesor', 250, 280], ['activista', 1000, 280], ['portavoz', 640, 160], ['influencer', 450, 160]] },
  { name: 'JEFE FINAL: EL JEFE DEL BAR', fondo: 'playa', theme: 'noche', boss: 'lider', plats: [[60, 500, 380], [60, 360, 300], [60, 220, 380], [520, 430, 200]], foes: [] },
];

export const STAGES = RAW.map((s) => ({ ...s, plats: [FLOOR, ...s.plats.map(([x, y, w]) => P(x, y, w))] }));
export const STAGE_COUNT = STAGES.length;

// Canciones sintetizadas provisionales para fase y jefe de este tema (melodías originales,
// compartidas con tumbledog mientras no llegue la música propia de fases). El título y la ronda
// bonus suenan con assets/audio/dieta-de-marcos.mp3 (ver src/audio.js).
export const SONGS = TUMBLEDOG_SONGS;

// Named exports de sub-partes del tema (para importación directa en módulos).
export const onomatopeyas = THEME.onomatopeyas;
export const letters = THEME.letters;
export const bossHp = THEME.bossHp;
export const stage = THEME.stage;
export const enemyTypes = THEME.enemyTypes;
export const enemyColors = THEME.enemyColors;
