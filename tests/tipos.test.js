import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createEnemy, createBulo } from '../src/enemy.js';
import { createBall } from '../src/ball.js';
import { createEnemyManager } from '../src/enemies.js';
import { createPlayer } from '../src/player.js';

const dt = 1 / 60;
const TIPOS = ['portavoz', 'tertuliano', 'asesor', 'influencer', 'lider', 'baron', 'activista', 'diputado'];

function mockCtx() {
  const ctx = { fills: 0, globalAlpha: 1 };
  for (const name of ['save', 'restore', 'translate', 'scale', 'rotate']) ctx[name] = () => {};
  ctx.fillRect = () => { ctx.fills += 1; };
  return ctx;
}

test('la oleada inicial trae los 8 tipos inventados, dentro de pantalla', () => {
  const manager = createEnemyManager();
  assert.equal(manager.enemies.length, TIPOS.length);
  assert.deepEqual(manager.enemies.map((e) => e.type).sort(), [...TIPOS].sort());
  assert.equal(manager.enemies[0].type, 'portavoz');
  for (const enemy of manager.enemies) {
    assert.ok(enemy.body.x >= 0 && enemy.body.x + enemy.body.width <= CONFIG.screen.width);
    assert.ok(enemy.body.y >= 0 && enemy.body.y + enemy.body.height <= CONFIG.screen.height);
    assert.ok(CONFIG.enemy[enemy.type].width > 0);
  }
});

test('cada tipo se dibuja sin fallar (provisional por código)', () => {
  for (const type of TIPOS) {
    const enemy = createEnemy({ type, x: 40, y: 136 });
    const ctx = mockCtx();
    enemy.render(ctx, 0.5);
    assert.ok(ctx.fills > 0, `${type} no dibuja nada`);
  }
});

test('El Tertuliano dispara bulos hacia Don Presi cuando está a su altura', () => {
  const manager = createEnemyManager();
  manager.enemies.length = 0;
  const tertuliano = createEnemy({ type: 'tertuliano', x: 60, y: 136 });
  manager.enemies.push(tertuliano);
  const player = createPlayer();
  player.body.x = 250;
  player.body.y = 135; // misma altura aproximada
  for (let i = 0; i < Math.ceil(CONFIG.enemy.tertuliano.shootEverySeconds * 60) + 2; i += 1) {
    manager.update(dt, player, {});
  }
  assert.ok(manager.bullets.length > 0, 'ha disparado al menos un bulo');
  assert.ok(manager.bullets[0].body.vx > 0, 'el bulo va hacia la derecha, hacia Don Presi');
});

test('un bulo que toca a Don Presi le quita una vida y desaparece', () => {
  const manager = createEnemyManager();
  manager.enemies.length = 0;
  const player = createPlayer();
  player.body.x = 100;
  player.body.y = 184;
  const livesBefore = manager.lives;
  manager.bullets.push(createBulo({ x: player.body.x, y: player.body.y + 12, direction: 1 }));
  manager.update(dt, player, {});
  assert.equal(manager.lives, livesBefore - 1);
  assert.equal(manager.bullets.length, 0);
});

test('un bulo muere al recorrer su rango', () => {
  const bulo = createBulo({ x: 10, y: 100, direction: 1, speed: 95, range: 40 });
  for (let i = 0; i < Math.ceil((40 / 95) * 60) + 2; i += 1) bulo.update(dt);
  assert.equal(bulo.alive, false);
});

test('El Asesor Misterioso se esconde: ni hace daño ni se puede aspirar, y sale', () => {
  const asesor = createEnemy({ type: 'asesor', x: 150, y: 86 });
  const cfg = CONFIG.enemy.asesor;
  for (let i = 0; i < Math.ceil(cfg.hideEverySeconds * 60) + 2; i += 1) asesor.update(dt, {});
  assert.equal(asesor.state, 'hidden');
  assert.equal(asesor.isDangerous(), false);
  assert.equal(asesor.canBeSucked(), false);
  assert.equal(asesor.suck(), false);
  const ctx = mockCtx();
  asesor.render(ctx);
  assert.ok(ctx.globalAlpha < 1, 'se dibuja semitransparente');
  for (let i = 0; i < Math.ceil(cfg.hiddenSeconds * 60) + 2; i += 1) asesor.update(dt, {});
  assert.equal(asesor.state, 'patrol');
});

test('El Líder Eterno salta alto sobre su plataforma y aterriza', () => {
  const lider = createEnemy({ type: 'lider', x: 230, y: 186 });
  const floorY = lider.body.y;
  let minY = floorY;
  let airborne = false;
  let landed = false;
  for (let i = 0; i < 600; i += 1) {
    lider.update(dt, {});
    minY = Math.min(minY, lider.body.y);
    if (lider.body.y < floorY - 0.5) airborne = true;
    if (airborne && lider.body.y === floorY) { landed = true; break; }
  }
  assert.ok(minY < floorY - 10, `ha saltado (minY=${minY})`);
  assert.equal(landed, true, 'y vuelve a aterrizar en su sitio');
});

test('El Influencer Bulero corre en línea recta y no pausa al girar', () => {
  const influencer = createEnemy({ type: 'influencer', x: 290, y: 186, direction: 1 });
  let flippedAt = -1;
  let xAtFlip = 0;
  for (let i = 0; i < 200; i += 1) {
    influencer.update(dt, {});
    if (flippedAt < 0 && influencer.direction === -1) {
      flippedAt = i;
      xAtFlip = influencer.body.x;
    }
    if (flippedAt >= 0 && i === flippedAt + 1) {
      assert.ok(influencer.body.x < xAtFlip, 'al instante siguiente ya corre: sin pausa');
      break;
    }
  }
  assert.ok(flippedAt >= 0, 'ha llegado al borde y ha girado');
});

test('El Diputado Gruñón da ráfagas: a veces corre mucho más que su patrulla', () => {
  const diputado = createEnemy({ type: 'diputado', x: 40, y: 186, direction: 1 });
  const normal = CONFIG.enemy.diputado.speed * dt;
  let maxStep = 0;
  for (let i = 0; i < Math.ceil(CONFIG.enemy.diputado.burstEverySeconds * 60) + 30; i += 1) {
    const xBefore = diputado.body.x;
    diputado.update(dt, {});
    maxStep = Math.max(maxStep, Math.abs(diputado.body.x - xBefore));
  }
  assert.ok(maxStep > normal * 2, `hay ráfaga (maxStep=${maxStep}, normal=${normal})`);
});

test('La Activista Municipal patrulla errática sin salirse de su plataforma', () => {
  const activista = createEnemy({
    type: 'activista',
    x: 60,
    y: 158 - CONFIG.enemy.activista.height, // plataforma izquierda
    direction: 1,
  });
  for (let i = 0; i < 600; i += 1) {
    activista.update(dt, {});
    assert.ok(activista.body.x >= 24, `se sale por la izquierda (${activista.body.x})`);
    assert.ok(activista.body.x + activista.body.width <= 116.01, `se sale por la derecha (${activista.body.x})`);
  }
});

test('un enemigo aplastado reaparece solo en su punto de partida (T08)', () => {
  const manager = createEnemyManager();
  manager.enemies.length = 0;
  const enemy = createEnemy({ type: 'portavoz', x: 40, y: 136 });
  manager.enemies.push(enemy);
  const player = createPlayer();
  player.body.x = 280;
  player.body.y = 184;
  assert.equal(enemy.crush(), true);
  for (let i = 0; i < Math.ceil(CONFIG.enemy.respawnSeconds * 60) + 2; i += 1) {
    manager.update(dt, player, {});
  }
  assert.equal(enemy.state, 'patrol');
  assert.ok(enemy.body.x >= 40 && enemy.body.x < 45, `vuelve a su punto de partida (x=${enemy.body.x})`);
  assert.equal(enemy.body.y, 136);
});

test('la bola también aplasta al enemigo escondido', () => {
  const manager = createEnemyManager();
  manager.enemies.length = 0;
  const asesor = createEnemy({ type: 'asesor', x: 150, y: 86 });
  manager.enemies.push(asesor);
  const player = createPlayer();
  player.body.x = 280;
  asesor.update(dt, {});
  // fuerza el estado hidden
  for (let i = 0; i < Math.ceil(CONFIG.enemy.asesor.hideEverySeconds * 60) + 2; i += 1) asesor.update(dt, {});
  assert.equal(asesor.state, 'hidden');
  const ball = createBall({ x: asesor.body.x - 1, y: asesor.body.y, direction: 1 });
  manager.update(dt, player, {}, ball);
  assert.equal(asesor.state, 'defeated');
});
