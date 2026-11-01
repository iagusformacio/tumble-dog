import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createEnemy } from '../src/enemy.js';
import { createEnemyManager } from '../src/enemies.js';
import { createPlayer } from '../src/player.js';

const dt = 1 / 60;

function managerSoloUnEnemigo() {
  const manager = createEnemyManager({
    spawns: [{ type: 'portavoz', x: 40, platform: 1 }],
  });
  return manager;
}

function allDefeated(manager) {
  for (const enemy of manager.enemies) enemy.crush();
}

test('la partida empieza en oleada 1 jugando, con los 8 tipos', () => {
  const manager = createEnemyManager();
  assert.equal(manager.wave, 1);
  assert.equal(manager.phase, 'playing');
  assert.equal(manager.enemies.length, 8);
  assert.equal(manager.lives, CONFIG.player.lives);
  assert.equal(manager.score, 0);
});

test('al limpiar la oleada viene pausa y luego la siguiente, con más enemigos y más rápido', () => {
  const manager = managerSoloUnEnemigo();
  const player = createPlayer();
  player.body.x = 280;
  player.body.y = 184;

  allDefeated(manager);
  manager.update(dt, player, {});
  assert.equal(manager.phase, 'interwave', 'oleada limpia = pausa entre oleadas');
  assert.equal(manager.wave, 1);

  for (let i = 0; i < Math.ceil(CONFIG.wave.interWaveSeconds * 60) + 2; i += 1) {
    manager.update(dt, player, {});
  }
  assert.equal(manager.wave, 2);
  assert.equal(manager.phase, 'playing');
  assert.equal(manager.enemies.length, 8 + CONFIG.wave.extraPerWave, 'más enemigos que en la oleada 1');
  const mul = 1 + Math.min((2 - 1) * CONFIG.wave.speedBonusPerWave, CONFIG.wave.maxSpeedBonus);
  assert.ok(mul > 1, 'la oleada 2 va más rápida que la 1');
  for (const enemy of manager.enemies) {
    assert.ok(
      Math.abs(enemy.speed - CONFIG.enemy[enemy.type].speed * mul) < 1e-9,
      `velocidad de oleada 2 = base × ${mul}`,
    );
  }
  assert.ok(manager.enemies.every((e) => e.state === 'patrol'));
});

test('la puntuación se conserva entre oleadas', () => {
  const manager = managerSoloUnEnemigo();
  const player = createPlayer();
  player.body.x = 280;
  player.body.y = 184;
  const enemy = manager.enemies[0];
  enemy.crush();
  // simula un aplastón puntuado
  manager.update(dt, player, {});
  allDefeated(manager);
  manager.update(dt, player, {});
  const { createBall } = { createBall: null };
  // puntuación vía bola real:
  const manager2 = managerSoloUnEnemigo();
  const e2 = manager2.enemies[0];
  e2.suck();
  const ball = manager2.launchBall(player);
  ball.body.x = e2.body.x - 1;
  ball.body.y = e2.body.y;
  manager2.update(dt, player, {}, ball);
  assert.equal(manager2.score, CONFIG.combo[0]);
  allDefeated(manager2);
  manager2.update(dt, player, {});
  for (let i = 0; i < Math.ceil(CONFIG.wave.interWaveSeconds * 60) + 2; i += 1) manager2.update(dt, player, {});
  assert.equal(manager2.wave, 2);
  assert.equal(manager2.score, CONFIG.combo[0], 'la oleada nueva no borra los puntos');
});

test('tras limpiar la oleada winWave la partida es victoria', () => {
  const manager = managerSoloUnEnemigo();
  const player = createPlayer();
  player.body.x = 280;
  player.body.y = 184;
  for (let w = 1; w <= CONFIG.wave.winWave; w += 1) {
    assert.equal(manager.wave, w);
    allDefeated(manager);
    manager.update(dt, player, {});
    if (w < CONFIG.wave.winWave) {
      assert.equal(manager.phase, 'interwave');
      for (let i = 0; i < Math.ceil(CONFIG.wave.interWaveSeconds * 60) + 2; i += 1) {
        manager.update(dt, player, {});
      }
      assert.equal(manager.phase, 'playing');
    }
  }
  assert.equal(manager.phase, 'victory');
});

test('a 0 vidas hay derrota y restart() lo devuelve todo a partida nueva', () => {
  const manager = managerSoloUnEnemigo();
  const player = createPlayer();
  const enemy = manager.enemies[0];
  // Toca al enemigo hasta quitar las 3 vidas (esperando la invulnerabilidad).
  for (let hit = 0; hit < CONFIG.player.lives; hit += 1) {
    player.body.x = enemy.body.x;
    player.body.y = enemy.body.y;
    manager.update(dt, player, {});
    for (let i = 0; i < Math.ceil(CONFIG.player.invulnerableSeconds * 60) + 2; i += 1) {
      manager.update(dt, player, {});
    }
  }
  assert.equal(manager.lives, 0);
  assert.equal(manager.phase, 'gameover');
  // En gameover ya no quita más vidas.
  const hitsBefore = manager.hits;
  player.body.x = 10;
  manager.update(dt, player, {});
  assert.equal(manager.hits, hitsBefore);

  manager.restart();
  assert.equal(manager.phase, 'playing');
  assert.equal(manager.wave, 1);
  assert.equal(manager.lives, CONFIG.player.lives);
  assert.equal(manager.score, 0);
  assert.equal(manager.enemies.length, 1);
  assert.ok(manager.enemies[0].canBeSucked());
});

test('si Don Presi lleva a uno dentro, la oleada no se da por清ada', () => {
  const manager = managerSoloUnEnemigo();
  const player = createPlayer();
  player.body.x = 280;
  manager.enemies[0].suck();
  manager.update(dt, player, {});
  assert.equal(manager.phase, 'playing', 'con un enemigo dentro no hay oleada nueva todavía');
});

test('createEnemy expone su velocidad base (para el multiplicador de oleada)', () => {
  const enemy = createEnemy({ type: 'portavoz', x: 40, y: 136, speed: 99 });
  assert.equal(enemy.speed, 99);
});
