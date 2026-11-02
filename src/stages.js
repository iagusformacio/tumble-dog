// Diez fases sobre La Moncloa. Plataformas [x, y, ancho]; enemigos [tipo, x, y].
// El suelo (y = 640) siempre existe. Saltos: altura máx. ~216 px; pisos separados 120 px.
import { FLOOR } from './physics.js';
import { TUMBLE_DOG_STAGES } from './themes/tumbledog.js';

const T = 18;
const P = (x, y, w) => ({ x, y, w, h: T });


export function createStages(raw) {
  return raw.map((s) => ({ ...s, plats: [FLOOR, ...s.plats.map(([x, y, w]) => P(x, y, w))] }));
}

export const STAGES = createStages(TUMBLE_DOG_STAGES);
export const STAGE_COUNT = STAGES.length;
