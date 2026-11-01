import { CONFIG } from './config.js';
import { overlaps } from './physics.js';
import { createEnemy } from './enemy.js';

/**
 * T06: un solo enemigo (La Portavoz Airada) sobre la plataforma izquierda.
 * T07/T08 ampliarán esto a oleadas; aquí basta con patrulla, aspiración,
 * escape a los 3 s y, si te toca estando libre, una vida menos.
 */
export function createEnemyManager({ platforms, spawn = { x: 40, y: 136 } } = {}) {
  const enemies = [createEnemy({ platforms, x: spawn.x, y: spawn.y })];
  let respawnLeft = 0;
  let lives = CONFIG.player.lives;
  let invulnerableLeft = 0;
  let hits = 0;

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

  function update(dt, player, input = {}) {
    if (invulnerableLeft > 0) invulnerableLeft -= dt;

    for (const enemy of enemies) {
      enemy.update(dt, { player });
      if (enemy.isDangerous() && overlaps(enemy.body, player.body)) hitPlayer(player);
    }

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
    enemies, update, render,
    get lives() { return lives; },
    get hits() { return hits; },
    get invulnerableLeft() { return invulnerableLeft; },
    /** Lo que lleva dentro Don Presi, o null. T07 lo lanzará. */
    get carried() { return enemies.find((enemy) => enemy.isContained()) ?? null; },
  };
}
