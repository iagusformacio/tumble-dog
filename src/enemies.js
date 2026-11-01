import { CONFIG } from './config.js';
import { DEFAULT_PLATFORMS, overlaps } from './physics.js';
import { createEnemy } from './enemy.js';
import { createBall } from './ball.js';

/**
 * T06: un solo enemigo (La Portavoz Airada) sobre la plataforma izquierda.
 * T07 añade lanzar la bola: aplastar enemigos, rebotes y combos.
 * T08/T09 ampliarán esto a oleadas; aquí basta con patrulla, aspiración,
 * escape a los 3 s y, si te toca estando libre, una vida menos.
 */
export function createEnemyManager({ platforms = DEFAULT_PLATFORMS, spawn = { x: 40, y: 136 } } = {}) {
  const enemies = [createEnemy({ platforms, x: spawn.x, y: spawn.y })];
  let respawnLeft = 0;
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
    // Reaparición limpia en el centro del suelo, como manda DESIGN.md.
    player.body.x = (CONFIG.screen.width - player.body.width) / 2;
    player.body.y = 184;
    player.body.vx = 0;
    player.body.vy = 0;
    return true;
  }

  function respawn() {
    const free = enemies[0];
    enemies[0] = createEnemy({ platforms, x: spawn.x, y: spawn.y, direction: -1 });
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
        score += CONFIG.combo[Math.min(comboChain, CONFIG.combo.length - 1)];
        comboChain += 1;
        lastCombo = comboChain;
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
        if (overlaps(enemy.body, player.suckZone)) enemy.suck();
        break;
      }
    }

    // Reaparición tras ser aspirado y escapado sin lanzarlo, para no dejar el nivel vacío.
    if (!enemies.some((enemy) => enemy.canBeSucked() || enemy.isContained())) {
      respawnLeft -= dt;
      if (respawnLeft <= 0) {
        respawn();
        respawnLeft = CONFIG.enemy.respawnSeconds;
        // Al reaparecer da un respiro: invulnerable un momento.
        invulnerableLeft = Math.max(invulnerableLeft, 0.4);
      }
    } else {
      respawnLeft = CONFIG.enemy.respawnSeconds;
    }
  }

  function render(ctx, alpha = 1, player = null) {
    for (const enemy of enemies) {
      // Lo que Don Presi lleva dentro se ve encoquito en la boquilla.
      if (enemy.isContained() && player) {
        const p = player.body;
        const cx = p.x + p.width / 2 + player.facing * 8;
        const cy = p.y + 12;
        const shrink = Math.max(0.25, Math.min(1, enemy.containedSeconds / CONFIG.suck.escapeSeconds));
        ctx.save();
        ctx.translate(cx, cy + Math.sin(enemy.containedSeconds * 20) * 1);
        ctx.scale(0.5 * shrink * (player.facing >= 0 ? 1 : -1), 0.5 * shrink);
        enemy.drawBody(ctx, 1);
        ctx.restore();
        continue;
      }
      // Parpadeo de invulnerabilidad del jugador tras un golpe.
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
    /** Lo que lleva dentro Don Presi, o null. T07 lo lanzará. */
    get carried() { return enemies.find((enemy) => enemy.isContained()) ?? null; },
  };
}
