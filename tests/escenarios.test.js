// E1 (#96) · Escenarios de bar: muebles como plataformas, layouts por bar y
// arte de los diez muebles. Comprueba que el tema Tumble Dog no cambia, que
// cada plataforma del tema Marcos declara un mueble conocido, que los cuatro
// bares de la campaña tienen disposiciones distintas y alcanzables, y que el
// arte está en disco, registrado y documentado (con su provisional por código).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { CONFIG, W } from '../src/config.js';
import { FURNITURE, furnitureUnits, isFurniture } from '../src/background.js';
import { STAGES as MARCOS, THEME as MARCOS_THEME } from '../src/themes/marcos.js';
import { STAGES as TUMBLEDOG } from '../src/themes/tumbledog.js';
import { CAMPAIGN_STAGES, BARS, stageIndexOf } from '../src/campaign.js';
import { createBarMechanic } from '../src/bar_mechanics.js';
import { SPRITE_FILES } from '../src/sprite-list.js';

const MAX_BYTES = 200 * 1024;
const PNG = { taburete: 'mueble-taburete-bajo', 'taburete-alto': 'mueble-taburete-alto', barra: 'mueble-barra', mesa: 'mueble-mesa', silla: 'mueble-silla', estante: 'mueble-estante-botellas', caja: 'mueble-caja-cerveza', nevera: 'mueble-nevera', toldo: 'mueble-toldo-terraza', mostrador: 'mueble-mostrador-mercado' };
const sinArte = ['barril'];

const noop = () => {};
const fx = { stars: noop, word: noop, shake: noop, dust: noop, stop: noop, text: noop, flash: noop, confetti: noop };

test('E1: los diez muebles de bar son PNG de ≤200 KB en assets/escenario y están registrados', () => {
  assert.equal(Object.keys(PNG).length, 10, 'el cupo de la sesión son diez imágenes');
  for (const [kind, base] of Object.entries(PNG)) {
    const png = `assets/escenario/${base}.png`;
    assert.ok(existsSync(png), `falta ${png}`);
    const bytes = readFileSync(png);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG', `${png}: no es PNG`);
    assert.ok(bytes.length > 4 * 1024, `${png}: imagen sospechosamente vacía`);
    assert.ok(bytes.length <= MAX_BYTES, `${png}: ${bytes.length} bytes > 200 KB`);
    const spec = FURNITURE[kind];
    assert.ok(spec, `el mueble ${kind} no existe en FURNITURE`);
    assert.equal(spec.art, base, `FURNITURE.${kind} debería apuntar a ${base}`);
    const entry = SPRITE_FILES[base];
    assert.ok(entry, `falta ${base} en src/sprite-list.js`);
    const [src, w, h] = entry;
    assert.ok(w > 0 && h > 0, `${base}: dimensiones inválidas`);
    assert.ok(existsSync(src.replace('./', '')), `falta en disco ${src}`);
    assert.ok(statSync(src.replace('./', '')).size > 512, `${src}: sprite vacío`);
  }
});

test('E1: el barril queda provisional por código (prompt previsto y sin PNG todavía)', () => {
  assert.deepEqual(sinArte, ['barril']);
  assert.equal(FURNITURE.barril.art, null, 'el barril no debe apuntar a un PNG que no existe');
  assert.ok(isFurniture('barril'), 'el barril se dibuja por código con las mismas formas');
  const units = furnitureUnits({ x: 100, y: 400, w: 210, kind: 'barril' });
  assert.ok(units.length >= 1 && units[0].h > 0, 'el barril provisional ocupa la plataforma');
});

test('E1: el arte nuevo está en prepare_assets.py y los prompts en assets/PROMPTS.md', () => {
  const script = readFileSync('tools/prepare_assets.py', 'utf8');
  assert.ok(script.includes('E1 · Muebles de bar'), 'falta el bloque E1 en tools/prepare_assets.py');
  assert.ok(script.includes('def main_e1'), 'falta main_e1()');
  assert.ok(script.includes("assets/sprites/escenario/"), 'los muebles deben ir a assets/sprites/escenario/');
  const prompts = readFileSync('assets/PROMPTS.md', 'utf8');
  for (const base of Object.values(PNG)) {
    assert.ok(script.includes(`escenario/${base}.png`), `prepare_assets.py no registra ${base}`);
    assert.ok(prompts.includes(`assets/escenario/${base}.png`), `falta el prompt de ${base}`);
  }
  assert.ok(prompts.includes('PENDIENTE (provisional por código)'), 'falta la nota del barril');
});

test('E1: cada plataforma del tema Marcos es un mueble de bar conocido', () => {
  for (const s of MARCOS) {
    for (const p of s.plats) {
      if (p.floor) continue;
      assert.ok(p.kind, `${s.name}: plataforma en y=${p.y} sin mueble`);
      assert.ok(isFurniture(p.kind), `${s.name}: mueble desconocido «${p.kind}»`);
    }
  }
  const kinds = new Set(MARCOS.flatMap((s) => s.plats.map((p) => p.kind).filter(Boolean)));
  assert.ok(kinds.size >= 9, `el arcade usa ${kinds.size} muebles distintos; se esperan 9 o más`);
  for (const s of MARCOS) {
    const set = new Set(s.plats.map((p) => p.kind).filter(Boolean));
    assert.ok(set.size >= 2, `${s.name}: usa un solo tipo de mueble (${[...set]})`);
  }
});

test('E1: el tema Tumble Dog conserva sus cornisas de piedra', () => {
  for (const s of TUMBLEDOG) for (const p of s.plats) assert.ok(!p.kind, `${s.name}: no debe tener muebles de bar`);
  assert.ok(!MARCOS_THEME.furniture, 'el tema no necesita mapa de muebles: lo resuelve src/background.js');
});

test('E1: cada bar de la campaña tiene sus propios layouts con muebles distintos', () => {
  const firmas = [];
  for (let b = 0; b < BARS.length; b++) {
    const rondas = CAMPAIGN_STAGES.filter((s) => s.bar === b && !s.bossStage);
    assert.equal(rondas.length, 3, `bar ${b}: faltan rondas`);
    const barFirma = [];
    const kinds = new Set();
    for (const s of rondas) {
      for (const p of s.plats) {
        if (p.floor) continue;
        assert.ok(isFurniture(p.kind), `${s.name}: mueble desconocido «${p.kind}»`);
        kinds.add(p.kind);
      }
      assert.ok(s.foes.length > 0, `${s.name}: sin esmorzars`);
      const firma = s.plats.filter((p) => !p.floor).map((p) => `${p.x},${p.y},${p.w},${p.kind}`).join('|');
      barFirma.push(firma);
      firmas.push(firma);
    }
    assert.equal(new Set(barFirma).size, 3, `bar ${b}: sus tres rondas repiten disposición`);
    assert.ok(kinds.size >= 3, `bar ${b}: solo usa ${[...kinds]}`);
  }
  assert.equal(new Set(firmas).size, 12, 'los doce layouts de ronda deben ser distintos entre sí');
});

test('E1: el escenario de cada jefe de bar también es de muebles', () => {
  const jefes = CAMPAIGN_STAGES.filter((s) => s.bossStage);
  assert.equal(jefes.length, 4);
  const firmas = new Set();
  for (const s of jefes) {
    for (const p of s.plats) {
      if (p.floor) continue;
      assert.ok(isFurniture(p.kind), `${s.name}: mueble desconocido «${p.kind}»`);
    }
    firmas.add(s.plats.filter((p) => !p.floor).map((p) => `${p.x},${p.y},${p.w},${p.kind}`).join('|'));
    assert.ok(s.bossArt, `${s.name}: el jefe no tiene arte propio`);
  }
  assert.equal(firmas.size, 4, 'cada jefe de bar pelea en un escenario distinto');
});

test('E1: los layouts nuevos siguen alcanzables con el salto del motor', () => {
  const salto = (CONFIG.player.jumpSpeed ** 2) / (2 * CONFIG.physics.gravity);
  for (const s of [...MARCOS, ...CAMPAIGN_STAGES]) {
    for (const p of s.plats) {
      assert.ok(p.x >= 0 && p.x + p.w <= W, `${s.name}: plataforma fuera de pantalla`);
      if (p.floor) continue;
      const debajo = s.plats.some((q) => q !== p && q.y > p.y && q.y - p.y <= salto - 10
        && q.x < p.x + p.w + 120 && q.x + q.w > p.x - 120);
      assert.ok(debajo, `${s.name}: plataforma y=${p.y} (${p.kind}) inalcanzable`);
    }
    for (const [type, x, y] of s.foes) {
      assert.ok(s.plats.some((p) => p.y === y && x >= p.x && x <= p.x + p.w), `${s.name}: ${type} en el aire`);
    }
  }
});

test('E1: las piezas se reparten a tamaño natural (un taburete no se estira como una barra)', () => {
  const taburetes = furnitureUnits({ x: 0, y: 500, w: 250, kind: 'taburete' });
  assert.ok(taburetes.length >= 4, 'en 250 px caben varios taburetes');
  for (const u of taburetes) assert.ok(u.w <= 60 && u.h <= 100, `taburete de ${u.w}×${u.h}: estirado`);
  const barra = furnitureUnits({ x: 0, y: 500, w: 620, kind: 'barra' });
  assert.equal(barra.length, 1, 'la barra larga es una pieza continua');
  assert.equal(barra[0].w, 620);
  const mesas = furnitureUnits({ x: 0, y: 500, w: 240, kind: 'mesa' });
  assert.equal(mesas.length, 2, 'dos mesas en 240 px');
  for (const u of mesas) {
    assert.ok(u.x >= 0 && u.x + u.w <= 240, 'las piezas no se salen de la plataforma');
    assert.ok(u.y === 500, 'la superficie del mueble es la superficie de apoyo');
  }
  assert.deepEqual(furnitureUnits({ x: 0, y: 0, w: 200, kind: 'cornisa-inventada' }), [], 'un tipo desconocido no inventa piezas');
  assert.equal(isFurniture('cornisa-inventada'), false);
});

test('E1: la barra deslizante del Bar Pols usa el mueble de barra', () => {
  const pols = CAMPAIGN_STAGES[stageIndexOf(2, 0)];
  const mech = createBarMechanic(pols, () => 0.5);
  assert.ok(mech && mech.uses('bandejas'), 'Pols debe tener bandejas y barra deslizante');
  const g = { plats: pols.plats.slice(), player: { x: 400, y: 400, w: 46, h: 92, alive: true, onGround: true }, enemies: [] };
  mech.onStart(g);
  assert.equal(mech.state.bar.kind, 'barra', 'la barra deslizante se dibuja como los demás muebles');
  assert.ok(g.plats.includes(mech.state.bar), 'la barra sigue siendo una plataforma de la fase');
  mech.onEnd(g);
  assert.equal(mech.state.bar, null);
  assert.ok(!g.plats.some((p) => p.sliding), 'al salir no queda la barra en las plataformas');
});
