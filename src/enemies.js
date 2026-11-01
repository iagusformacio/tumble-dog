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

/**
 * Gestor de enemigos. T06 trajo a La Portavoz Airada; T07 añadió lanzar la
 * bola (aplastar, rebotes, combos); T08 puebla la pantalla con los 8 tipos
 * inventados, cada uno con su comportamiento; T10 integra sprites y
 * onomatopeyas. T09 añadirá oleadas y victoria/derrota.
 */
export function createEnemyManager({
  platforms = DEFAULT_PLATFORMS,
  spawns = DEFAULT_SPAWNS,
  assets,
  effects = null,
} = {}) {
  const enemies = spawns.map((spawn, i) => createEnemy({
    type: spawn.type,
    x: spawn.x,
    y: platforms[spawn.platform].y - (CONFIG.enemy[spawn.type]?.height ?? 22),
    platforms,
    direction: i % 2 === 0 ? 1 : -1,
    assets,
  }));
  const bullets = []; // bulos disparados por El Tertuliano (T08)
  let lives = CONFIG.player.lives;
  let invulnerableLeft = 0;
  let hits = 0;
  let score = 0;
  let comboChain = 0; // enemigos aplastados con la bola en vuelo ahora mismo
  let lastCombo = 0;  // cadena del último lanzamiento (para el HUD)

  function hitPlayer(player) {
    if (invulnerableLeft > 0) return false;
    lives = Math.max(0, lives - 1);
    invulnerableLeft = CONFIG.player.invulnerableSeconds;
    hits += 1;
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
    carried.release();
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
      // T08: cada enemigo aplastado reaparece solo en su punto de partida.
      if (enemy.isDefeated()) {
        enemy.respawnLeft = (enemy.respawnLeft ?? CONFIG.enemy.respawnSeconds) - dt;
        if (enemy.respawnLeft <= 0) {
          enemy.respawn();
          // Al reaparecer da un respiro: invulnerable un momento.
          invulnerableLeft = Math.max(invulnerableLeft, 0.4);
        }
      }
    }

    updateBullets(dt, player);
    hitByBall(ball);

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

  function render(ctx, alpha = 1, player = null) {
    for (const enemy of enemies) {
      // Lo que Don Presi lleva dentro se ve encogido en la punta de la boquilla.
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
    enemies, bullets, update, render, launchBall,
    get lives() { return lives; },
    get hits() { return hits; },
    get invulnerableLeft() { return invulnerableLeft; },
    get score() { return score; },
    get comboChain() { return comboChain; },
    get lastCombo() { return lastCombo; },
    /** Lo que lleva dentro Don Presi, o null. */
    get carried() { return enemies.find((enemy) => enemy.isContained()) ?? null; },
  };
}
