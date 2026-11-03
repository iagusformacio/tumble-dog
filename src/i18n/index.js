// Idiomas del juego. Las claves son estables; los textos solo viven en es.js/val.js.
import { es } from './es.js';
import { val } from './val.js';

export const LANGUAGE_KEY = 'tumbledog-language';
export const LANGUAGES = ['es', 'val'];
const dictionaries = { es, val };
const listeners = new Set();
let language = 'es';

export function normalizeLanguage(value) {
  const tag = String(value || '').toLowerCase().replace(/_/g, '-');
  return /^(ca|val)(-|$)/.test(tag) ? 'val' : 'es';
}
export function getLanguage() { return language; }
export function htmlLanguage(value = language) { return value === 'val' ? 'ca-ES-valencia' : 'es'; }

/** El navegador propone idioma; una elección guardada siempre tiene prioridad. */
export function initLanguage(win = globalThis) {
  let saved = null;
  try { saved = win.localStorage?.getItem(LANGUAGE_KEY); } catch { /* almacenamiento no disponible */ }
  let browser = 'es';
  try { browser = win.navigator?.language || win.navigator?.languages?.[0] || 'es'; } catch { /* entorno sin navegador */ }
  return setLanguage(saved && LANGUAGES.includes(saved) ? saved : normalizeLanguage(browser), false);
}

export function setLanguage(value, persist = true) {
  const next = normalizeLanguage(value);
  const changed = next !== language;
  language = next;
  if (persist) { try { globalThis.localStorage?.setItem(LANGUAGE_KEY, next); } catch { /* se puede jugar sin guardar */ } }
  try { if (globalThis.document?.documentElement) globalThis.document.documentElement.lang = htmlLanguage(next); } catch { /* Node */ }
  if (changed) for (const listener of listeners) listener(next);
  return next;
}
export function toggleLanguage() { return setLanguage(language === 'es' ? 'val' : 'es'); }
export function onLanguageChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }

/** Traduce y sustituye parámetros {nombre}. Una clave ausente nunca borra la interfaz. */
export function t(key, params = {}) {
  const template = dictionaries[language][key] ?? es[key] ?? key;
  return String(template).replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
}

// Los datos del motor conservan su API (.name, .title…), pero no guardan una
// traducción congelada: cada lectura consulta el idioma actual.
export function localize(object, field, key = field) {
  Object.defineProperty(object, field, { enumerable: true, configurable: true, get: () => t(key) });
  return object;
}
export function localizeFields(object, prefix, fields) {
  for (const field of fields) localize(object, field, `${prefix}.${field}`);
  return object;
}
