// Captura del juego sin navegador: dibuja un fotograma REAL del motor (Canvas 2D)
// usando un canvas nativo de Node, para revisar el arte integrado cuando no hay
// Chromium disponible (el sandbox no puede descargar el navegador de Playwright).
//
// Requiere el paquete opcional @napi-rs/canvas (no está en package.json):
//   npm install --no-save @napi-rs/canvas
// Uso:
//   node tools/shot.mjs --tema marcos --modo title    --salida /tmp/titulo.png
//   node tools/shot.mjs --tema marcos --modo campaña  --salida /tmp/campana.png
//   node tools/shot.mjs --tema marcos --modo juego --segundos 4 --salida /tmp/juego.png
//   node tools/shot.mjs --tema marcos --modo juego --fase 4 --salida /tmp/bar2.png
//   node tools/shot.mjs --tema marcos --modo juego --arcade --fase 2 --salida /tmp/a3.png
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const theme = arg('tema', 'marcos');
const mode = arg('modo', 'title');
const out = arg('salida', '/tmp/captura.png');
const seconds = Number(arg('segundos', '3'));
const stageArg = Number(arg('fase', '0'));
const arcade = argv.includes('--arcade');

let createCanvas; let ImageLib = null;
try {
  ImageLib = await import('@napi-rs/canvas');
  ({ createCanvas } = ImageLib);
} catch {
  console.error('Falta el canvas nativo. Instala: npm install --no-save @napi-rs/canvas');
  process.exit(1);
}

// --- canvas y document mínimos para el motor ---
const main = createCanvas(1280, 720);
// Lienzos fuera de pantalla (fondos pre-renderizados, capas de plataformas):
// el motor los crea con document.createElement('canvas') y les fija width/height.
globalThis.document = {
  createElement: () => createCanvas(1, 1),
  fonts: null,
  addEventListener() {},
};

// Los sprites se cargan con `new Image()`: se sirven desde disco como data URLs
// y `drawSprite` los pinta en el canvas nativo sin conversión (misma API).
globalThis.Image = class {
  set src(path) {
    const file = join(ROOT, String(path).replace(/^\.\//, ''));
    this._file = file;
    const data = readFileSync(file);
    const ext = file.endsWith('.webp') ? 'webp' : 'png';
    this._src = `data:image/${ext};base64,${data.toString('base64')}`;
    const ImageCtor = ImageLib && ImageLib.Image;
    if (ImageCtor) {
      const img = new ImageCtor();
      img.onload = () => this.onload?.();
      img.src = this._src;
      this._native = img;
      return;
    }
    this.onload?.();
  }
  get src() { return this._src; }
  get native() { return this._native; }
  get width() { return this._native?.width || 0; }
  get height() { return this._native?.height || 0; }
};

const { loadSprites } = await import('../src/sprites.js');
const { createGame } = await import('../src/game.js');
const { CONFIG } = await import('../src/config.js');

await loadSprites();
// El motor guarda en su caché los objetos `Image` del DOM; en Node se cambian por
// las imágenes nativas de @napi-rs/canvas, que son las que acepta drawImage.
const sprites = await import('../src/sprites.js');
const registry = globalThis.__imageRegistry;
const nativeImages = new Map();
for (const [name, [path]] of Object.entries((await import('../src/sprite-list.js')).SPRITE_FILES)) {
  const file = join(ROOT, path.replace(/^\.\//, ''));
  nativeImages.set(name, await ImageLib.loadImage(readFileSync(file)));
}
if (sprites.__setImagesForNode) sprites.__setImagesForNode(nativeImages);
else console.error('aviso: src/sprites.js no expone __setImagesForNode');

const ctx = main.getContext('2d');
// Misma forma que devuelve createInput(): sin teclas pulsadas, el muñeco se queda
// quieto, que es justo lo que se quiere para una captura de arte.
const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'suck', 'shoot', 'start', 'pause', 'mute'];
const held = Object.fromEntries(ACTIONS.map((a) => [a, false]));
const pressed = Object.fromEntries(ACTIONS.map((a) => [a, false]));
const input = { held, pressed, update() {}, takeAny: () => false, get touch() { return false; } };
const audio = new Proxy({}, { get: () => () => {} });
const { listThemes } = await import('../src/themes/index.js');
const game = createGame({ input, audio, themeId: theme });
// El título enseña el juego seleccionado con gameSel: se alinea con --tema.
game.state.gameSel = Math.max(0, listThemes().findIndex((t) => t.id === theme));

if (mode === 'campaña' || mode === 'campana') {
  // Pantalla de ruta de la campaña (mapa de los 4 bares), sin entrar a jugar.
  game.debug.startCampaign(0);
  game.state.state = 'route';
  for (let i = 0; i < Math.round(1.2 / CONFIG.step); i++) game.update(CONFIG.step);
} else if (mode === 'juego') {
  // --fase N elige la ronda (0-15 de la campaña; 0-9 del arcade con --arcade).
  if (arcade) {
    game.debug.g.campaign = false;
    game.debug.startStage(stageArg);
  } else {
    game.debug.startCampaign(0);
    game.debug.startStage(stageArg);
  }
  for (let i = 0; i < Math.round(seconds / CONFIG.step); i++) game.update(CONFIG.step);
}
game.render(ctx);
writeFileSync(out, main.toBuffer('image/png'));
console.log(`captura: ${out} · ${main.width}×${main.height} · tema ${theme} · modo ${mode}`);
