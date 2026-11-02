// Registro de juegos (temas) disponibles. El motor es tema-agnóstico: cada tema
// aporta su propio arte, textos, fases, música y nombres. Añadir un juego nuevo
// es crear un módulo en src/themes/<juego>.js y registrarlo aquí.
// Todo inventado: nada de personas reales ni personajes protegidos.
import { THEME as TUMBLEDOG, STAGES as TUMBLEDOG_STAGES } from './tumbledog.js';
import { THEME as MARCOS, STAGES as MARCOS_STAGES } from './marcos.js';

export const THEMES = Object.freeze([
  { id: 'tumbledog', label: TUMBLEDOG.name, theme: TUMBLEDOG, stages: TUMBLEDOG_STAGES },
  { id: 'marcos', label: MARCOS.name, theme: MARCOS, stages: MARCOS_STAGES },
]);

export function listThemes() { return THEMES; }
export function getTheme(id) { return THEMES.find((t) => t.id === id) || THEMES[0]; }
export const DEFAULT_THEME_ID = 'tumbledog';
