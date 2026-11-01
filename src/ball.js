import { CONFIG } from './config.js';
import { DEFAULT_PLATFORMS, stepBody } from './physics.js';

/**
 * Bola lanzada por Don Presi (T07): sale de la boquilla en línea recta,
 * rebota en paredes, suelo, techo y plataformas, y desaparece sola al cabo
 * de ball.lifeSeconds. `carrier` es el enemigo que va enrollado dentro.
 */
export function createBall({
  x,
  y,
  direction = 1,
  carrier = null,
  platforms = DEFAULT_PLATFORMS,
  config = CONFIG,
}) {
  const size = config.ball.size;
  const body = {
    x,
    y,
    width: size,
    height: size,
    vx: direction * config.ball.speed,
    vy: 0,
    grounded: false,
  };
  let previousX = x;
  let previousY = y;
  let lifeLeft = config.ball.lifeSeconds;
  let spin = 0;

  function update(dt) {
    previousX = body.x;
    previousY = body.y;
    if (!alive) return;
    lifeLeft -= dt;
    spin += dt * 12;

    const vxBefore = body.vx;
    const vyBefore = body.vy;
    stepBody(body, platforms, dt, { gravity: config.physics.gravity, jumpSpeed: 0 });
    // Rebote: stepBody detiene el cuerpo al chocar; invertimos la velocidad.
    if (body.vx === 0 && vxBefore !== 0) body.vx = -vxBefore * config.ball.restitution;
    if (body.vy === 0 && vyBefore !== 0) body.vy = -vyBefore * config.ball.restitution;
    // Bordes de la pantalla fija.
    if (body.x < 0) { body.x = 0; body.vx = Math.abs(body.vx); }
    if (body.x + body.width > config.screen.width) {
      body.x = config.screen.width - body.width;
      body.vx = -Math.abs(body.vx);
    }
    if (body.y < 0) { body.y = 0; body.vy = Math.abs(body.vy); }
    if (body.y + body.height > config.screen.height) {
      body.y = config.screen.height - body.height;
      body.vy = -Math.abs(body.vy);
    }
  }

  function render(ctx, alpha = 1) {
    const x = previousX + (body.x - previousX) * alpha;
    const y = previousY + (body.y - previousY) * alpha;
    const r = body.width / 2;
    ctx.save();
    ctx.translate(x + r, y + r);
    ctx.rotate(spin);
    if (carrier && typeof carrier.isContained === 'function' && carrier.isContained()) {
      // El enemigo enrollado dentro de la bola (T07): dibujo propio del enemigo.
      ctx.scale(0.55, 0.55);
      carrier.drawBody(ctx, 1, { atOrigin: true });
    } else {
      // Bola oscura con ojitos (dibujo provisional por código).
      ctx.fillStyle = '#3a3f4a';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-3, -2, 2, 2);
      ctx.fillRect(1, -2, 2, 2);
      ctx.fillStyle = '#111';
      ctx.fillRect(-2.5, -1.5, 1, 1);
      ctx.fillRect(1.5, -1.5, 1, 1);
    }
    ctx.restore();
  }

  const alive = () => lifeLeft > 0;
  return {
    body,
    carrier,
    update,
    render,
    get alive() { return alive(); },
    get lifeLeft() { return lifeLeft; },
  };
}
