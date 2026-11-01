import { CONFIG } from './config.js';
import { DEFAULT_PLATFORMS, overlaps } from './physics.js';
import { createEnemy } from './enemy.js';
import { createBall } from './ball.js';

const CRUSH_ONOMATOPEYAS = Object.freeze(['¡PAF!', '¡PUM!', '¡PLAF!', '¡TOMA!']);

/**
 * T06: un solo enemigo (La Portavoz Airada) sobre la plataforma izquierda.
 * T07 añade lanzar la bola: aplastar enemigos, rebotes y combos.
 * T10 añade integración de sprites y onomatopeyas de tebeo al aspirar/lanzar/aplastar.
 */
export function createEnemyManager({
  platforms = DEFAULT_PLATFORMS,
  spawn = { x: 40, y: 136 },
  assets,
  effects = null,
} = {}) {
  const enemies = [createEnemy({ platforms, x: spawn.x, y: spawn.y, assets })];
  let respawnLeft = 0;
  let lives = CONFIG.player.lives;
  let invulnerableLeft = 0;
  let hits = 0;
  let score = 0;
  let comboChain = 0;
  let lastCombo = 0;

  function hitPlayer(player) {
    if (invulnerableLeft > 0) return false;
    lives = Math.max(0, lives - 1);
    invulnerableLeft = CONFIG.player.invulnerableSeconds;
    hits += 1;
    effects?.spawn(player.body.x + player.body.width / 2, player.body.y - 2, '¡AY!', {
      fill: '#ff8787',
      accent: '#111',
    });
    player.body.x = (CONFIG.screen.width - player.body.width) / 2;
    player.body.y = CONFIG.player.spawnY;
    player.body.vx = 0;
    player.body.vy = 0;
    return true;
  }

  function respawn() {
    const free = enemies[0];
    enemies[0] = createEnemy({ platforms, x: spawn.x, y: spawn.y, direction: -1, assets });
    return free;
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

  /** La bola aplasta a los enemigos libres o mareados que toca; cada uno sube el combo. */
  function hitByBall(ball) {
    if (!ball || !ball.alive) return;
    for (const enemy of enemies) {
      const aplastable = enemy.isDangerous() || enemy.state === 'stunned';
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

  function update(dt, player, input = {}, ball = null) {
    if (invulnerableLeft > 0) invulnerableLeft -= dt;

    for (const enemy of enemies) {
      enemy.update(dt, { player });
      if (enemy.isDangerous() && overlaps(enemy.body, player.body)) hitPlayer(player);
    }

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

    // Reaparición tras ser aspirado y escapado sin lanzarlo, para no dejar el nivel vacío.
    if (!enemies.some((enemy) => enemy.canBeSucked() || enemy.isContained())) {
      respawnLeft -= dt;
      if (respawnLeft <= 0) {
        respawn();
        respawnLeft = CONFIG.enemy.respawnSeconds;
        invulnerableLeft = Math.max(invulnerableLeft, 0.4);
      }
    } else {
      respawnLeft = CONFIG.enemy.respawnSeconds;
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
      if (player && invulnerableLeft > 0 && Math.floor(invulnerableLeft * 12) % 2 === 0) continue;
      enemy.render(ctx, alpha);
    }
  }

  return {
    enemies, update, render, launchBall,
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
