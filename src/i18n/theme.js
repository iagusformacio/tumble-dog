// Adaptador de textos de los temas: los datos conservan su API, pero cada nombre
// se traduce al leerlo. Así un jefe o una fase creados antes de cambiar de idioma
// no arrastran textos del idioma anterior.
import { localize, localizeFields, t } from './index.js';

export function localizeTheme(theme, stages) {
  const prefix = theme.i18n;
  localizeFields(theme, prefix, ['name', 'title', 'tagline', 'pause']);
  const groups = {
    verbs: ['suck', 'shoot'],
    hud: ['puntos', 'record', 'fase', 'tiempo', 'datePrisa', 'turbo', 'pow', 'pausa', 'vidaExtra'],
    powers: ['speed', 'pow', 'freeze'],
    titleScreen: ['startTouch', 'startKeyboard', 'move', 'jump', 'down', 'suck', 'shoot', 'lettersHint', 'mute', 'pause', 'parody'],
    touch: ['jump', 'suck', 'shoot'],
    juice: ['capture', 'shatter', 'wall', 'escape', 'oneup', 'chaser'],
    gameOver: ['puntos', 'continuar'], ending: ['completed', 'puntos', 'next'],
    banner: ['jefe', 'faseLimpia', 'adios', 'bonus', 'cogeTodo'],
  };
  for (const [group, fields] of Object.entries(groups)) {
    if (!theme[group]) continue;
    for (const field of fields) {
      const key = `${prefix}.${group}.${field}`;
      if (t(key) !== key) localize(theme[group], field, key);
    }
  }
  for (const field of ['hurtMessages', 'onomatopeyas', 'bossHitWords']) {
    const keys = theme[field + 'Keys'];
    if (keys) Object.defineProperty(theme, field, { enumerable: true, configurable: true, get: () => keys.map((key) => t(key)) });
  }
  if (theme.bossNames) localizeFields(theme.bossNames, `${prefix}.bossNames`, Object.keys(theme.bossNames));
  if (theme.chaser) localize(theme.chaser, 'name', `${prefix}.chaser.name`);
  for (const [type, data] of Object.entries(theme.enemyTypes)) localize(data, 'name', `${prefix}.enemyTypes.${type}.name`);
  stages.forEach((stage, i) => localize(stage, 'name', `${prefix}.stages.${i}.name`));
  return theme;
}
