// Diez fases sobre La Moncloa. Plataformas [x, y, ancho]; enemigos [tipo, x, y].
// El suelo (y = 640) siempre existe. Saltos: altura máx. ~216 px; pisos separados 120 px.
import { FLOOR } from './physics.js';

const T = 18;
const P = (x, y, w) => ({ x, y, w, h: T });

const RAW = [
  { name: 'LOS JARDINES', theme: 'manana', plats: [[80, 520, 340], [860, 520, 340], [380, 400, 520], [80, 280, 380], [820, 280, 380], [480, 160, 320]],
    foes: [['portavoz', 200, 520], ['portavoz', 1000, 520], ['tertuliano', 640, 400], ['portavoz', 250, 280]] },
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
