import { CONFIG } from './config.js';
import { DEFAULT_PLATFORMS, overlaps } from './physics.js';
import { createEnemy } from './enemy.js';
import { createBall } from './ball.js';

const CRUSH_ONOMATOPEYAS = Object.freeze(['¡PAF!', '¡PUM!', '¡PLAF!', '¡TOMA!']);

/** Oleada inicial (T08): un enemigo de cada tipo inventado, repartido por plataformas. */
const DEFAULT_SPAWNS = Object.freeze([
  { type: 'portavoz', x: 40, platform: 1 },
  { type: 'activista', x: 80, platform: 1 },
  { type: 'tertuliano', x: 230, platform: 2 },
  { type: 'diputado', x: 268, platform: 2 },
  { type: 'asesor', x: 150, platform: 3 },
  { type: 'influencer', x: 60, platform: 0 },
  { type: 'baron', x: 130, platform: 0 },
  { type: 'lider', x: 230, platform: 0 },
]);

/** Tipos de enemigo disponibles (las claves de CONFIG.enemy con tamaño). */
const ENEMY_TYPES = Object.freeze(
  Object.keys(CONFIG.enemy).filter((key) => CONFIG.enemy[key]?.width),
);

/** Oleadas siguientes (T09): más enemigos, tipos y plataformas al azar. */
function waveSpawns(waveNumber, platforms) {
  if (waveNumber === 1) return DEFAULT_SPAWNS.map((spawn) => ({ ...spawn }));
  const count = Math.min(
    DEFAULT_SPAWNS.length + (waveNumber - 1) * CONFIG.wave.extraPerWave,
    CONFIG.wave.maxCount,
  );
  const spawns = [];
  for (let i = 0; i < count; i += 1) {
    const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    const platformIndex = Math.floor(Math.random() * platforms.length);
    const platform = platforms[platformIndex];
    const margin = CONFIG.enemy[type].width + 4;
    spawns.push({
      type,
      x: platform.x + 2 + Math.random() * Math.max(1, platform.width - margin),
      platform: platformIndex,
    });
  }
  return spawns;
}

/**
 * Gestor de enemigos. T06 trajo a La Portavoz Airada; T07 añadió lanzar la
 * bola (aplastar, rebotes, combos); T08 puebla la pantalla con los 8 tipos
 * inventados, cada uno con su comportamiento; T10 integra sprites y
 * onomatopeyas. T09 añadirá oleadas y victoria/derrota.
 */
export function createEnemyManager({
  platforms = DEFAULT_PLATFORMS,
  spawns = null, // oleada 1 por defecto (los 8 tipos); null = waveSpawns(1)
  assets,
  effects = null,
} = {}) {
  let enemies = [];
  const bullets = []; // bulos disparados por El Tertuliano (T08)
  let lives = CONFIG.player.lives;
  let invulnerableLeft = 0;
  let hits = 0;
  let score = 0;
  let comboChain = 0; // enemigos aplastados con la bola en vuelo ahora mismo
  let lastCombo = 0;  // cadena del último lanzamiento (para el HUD)
  let wave = 1;
  let phase = 'playing'; // 'playing' | 'interwave' | 'gameover' | 'victory'
  let interwaveLeft = 0;

  /** Las oleadas siguientes van más rápidas (T09, DESIGN.md). */
  function speedMul() {
    return 1 + Math.min((wave - 1) * CONFIG.wave.speedBonusPerWave, CONFIG.wave.maxSpeedBonus);
  }

  function spawnWave() {
    const list = wave === 1 && spawns ? spawns : waveSpawns(wave, platforms);
    const mul = speedMul();
    enemies = list.map((spawn, i) => createEnemy({
      type: spawn.type,
      x: spawn.x,
      y: platforms[spawn.platform].y - (CONFIG.enemy[spawn.type]?.height ?? 22),
      platforms,
      direction: i % 2 === 0 ? 1 : -1,
      speed: (CONFIG.enemy[spawn.type]?.speed ?? CONFIG.enemy.portavoz.speed) * mul,
      assets,
    }));
    bullets.length = 0;
  }

  spawnWave();

  /** Reinicio tras derrota o victoria (T09). */
  function restart() {
    wave = 1;
    phase = 'playing';
    interwaveLeft = 0;
    lives = CONFIG.player.lives;
    invulnerableLeft = 0;
    hits = 0;
    score = 0;
    comboChain = 0;
    lastCombo = 0;
    spawnWave();
  }

  function hitPlayer(player) {
    if (invulnerableLeft > 0 || phase !== 'playing') return false;
    lives = Math.max(0, lives - 1);
    invulnerableLeft = CONFIG.player.invulnerableSeconds;
    hits += 1;
    if (lives === 0) phase = 'gameover'; // T09: derrota
    effects?.spawn(player.body.x + player.body.width / 2, player.body.y - 2, '¡AY!', {
      fill: '#ff8787',
      accent: '#111',
    });
    // Reaparición limpia en el centro del suelo, como manda DESIGN.md.
    player.body.x = (CONFIG.screen.width - player.body.width) / 2;
    player.body.y = CONFIG.player.spawnY;
    player.body.vx = 0;
    player.body.vy = 0;
    return true;
  }

  /**
   * Lanza al enemigo que Don Presi lleva dentro como bola (T07).
   * Devuelve la bola, o null si no lleva a nadie.
   */
  function launchBall(player) {
    const carried = enemies.find((enemy) => enemy.isContained());
    if (!carried) return null;
    // T07: el enemigo se queda encerrado dentro de la bola hasta que muera.
    carried.lockInBall();
    comboChain = 0;
    lastCombo = 0;
    const p = player.body;
    const size = CONFIG.ball.size;
    const facing = player.facing >= 0 ? 1 : -1;
    effects?.spawn(p.x + p.width / 2 + facing * 12, p.y + 8, '¡ZAS!', {
      fill: '#ffe44d',
      accent: '#c92a2a',
    });
    return createBall({
      x: facing > 0 ? p.x + p.width : p.x - size,
      y: p.y + p.height / 2 - size / 2,
      direction: facing,
      carrier: carried,
      platforms,
    });
  }

  /** La bola aplasta a los enemigos libres, mareados o escondidos que toca; cada uno sube el combo. */
  function hitByBall(ball) {
    if (!ball || !ball.alive) return;
    for (const enemy of enemies) {
      // El portador va enrollado dentro de la bola: la bola no le aplasta a él.
      if (enemy === ball.carrier) continue;
      const aplastable = enemy.isDangerous() || enemy.state === 'stunned' || enemy.isHidden();
      if (!aplastable || !overlaps(ball.body, enemy.body)) continue;
      if (enemy.crush()) {
        const points = CONFIG.combo[Math.min(comboChain, CONFIG.combo.length - 1)];
        score += points;
        comboChain += 1;
        lastCombo = comboChain;
        const word = CRUSH_ONOMATOPEYAS[Math.min(comboChain - 1, CRUSH_ONOMATOPEYAS.length - 1)];
        effects?.spawn(
          enemy.body.x + enemy.body.width / 2,
          enemy.body.y,
          comboChain > 1 ? `${word} +${points}` : word,
          { fill: '#ffe44d', accent: '#b81d13', duration: 0.65 },
        );
      }
    }
  }

  /** Los bulos del Tertuliano dañan a Don Presi (T08). */
  function updateBullets(dt, player) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const bulo = bullets[i];
      bulo.update(dt);
      if (!bulo.alive) { bullets.splice(i, 1); continue; }
      if (overlaps(bulo.body, player.body)) {
        hitPlayer(player);
        bullets.splice(i, 1);
      }
    }
  }

  function update(dt, player, input = {}, ball = null) {
    if (invulnerableLeft > 0) invulnerableLeft -= dt;

    for (const enemy of enemies) {
      enemy.update(dt, { player, bullets });
      if (enemy.isDangerous() && overlaps(enemy.body, player.body)) hitPlayer(player);
    }

    updateBullets(dt, player);
    hitByBall(ball);

    // T09: oleadas. Si no queda ningún enemigo vivo, se acaba la oleada.
    if (phase === 'playing' && enemies.length > 0 && enemies.every((enemy) => enemy.isDefeated())) {
      if (wave >= CONFIG.wave.winWave) {
        phase = 'victory';
      } else {
        phase = 'interwave';
        interwaveLeft = CONFIG.wave.interWaveSeconds;
        effects?.spawn(CONFIG.screen.width / 2 - 30, 90, `OLEADA ${wave + 1}`, {
          fill: '#ffe44d',
          accent: '#b81d13',
          duration: CONFIG.wave.interWaveSeconds,
        });
      }
    }
    if (phase === 'interwave') {
      interwaveLeft -= dt;
      if (interwaveLeft <= 0) {
        wave += 1;
        spawnWave();
        phase = 'playing';
      }
    }

    // Aspirar: solo si Don Presi mantiene la acción y no lleva ya a alguien dentro.
    const carriesOne = enemies.some((enemy) => enemy.isContained());
    const wantsSuck = Boolean(input.suck) && !carriesOne;
    if (wantsSuck) {
      for (const enemy of enemies) {
        if (!enemy.canBeSucked()) continue;
        if (overlaps(enemy.body, player.suckZone) && enemy.suck()) {
          effects?.spawn(enemy.body.x + enemy.body.width / 2, enemy.body.y + 4, '¡GLUP!', {
            fill: '#b8f2ff',
            accent: '#124e78',
          });
          break;
        }
      }
    }
  }

  function render(ctx, alpha = 1, player = null, ball = null) {
    for (const enemy of enemies) {
      // Lo que Don Presi lleva dentro se ve encogido en la punta de la boquilla;
      // si la bola está en vuelo con ese enemigo dentro, la bola lo dibuja.
      if (enemy.isContained() && ball && ball.alive && ball.carrier === enemy) continue;
      if (enemy.isContained() && player) {
        const p = player.body;
        const cx = p.x + p.width / 2 + player.facing * 9;
        const cy = p.y + 13;
        const shrink = Math.max(0.28, Math.min(1, enemy.containedSeconds / CONFIG.suck.escapeSeconds));
        ctx.save();
        ctx.translate(cx, cy + Math.sin(enemy.containedSeconds * 20) * 1);
        ctx.scale(0.55 * shrink * (player.facing >= 0 ? 1 : -1), 0.55 * shrink);
        enemy.drawBody(ctx, 1, { atOrigin: true });
        ctx.restore();
        continue;
      }
      // Parpadeo de invulnerabilidad del jugador tras un golpe.
      if (player && invulnerableLeft > 0 && Math.floor(invulnerableLeft * 12) % 2 === 0) continue;
      enemy.render(ctx, alpha);
    }
    for (const bulo of bullets) bulo.render(ctx);
  }

  return {
    bullets, update, render, launchBall, restart,
    get enemies() { return enemies; },
    get lives() { return lives; },
    get hits() { return hits; },
    get invulnerableLeft() { return invulnerableLeft; },
    get score() { return score; },
    get comboChain() { return comboChain; },
    get lastCombo() { return lastCombo; },
    get wave() { return wave; },
    get phase() { return phase; },
    /** Lo que lleva dentro Don Presi, o null. */
    get carried() { return enemies.find((enemy) => enemy.isContained()) ?? null; },
  };
}
