import { DEFAULT_PLATFORMS, stepBody } from './physics.js';

/** Don Presi es un personaje ficticio; la aspiración es visual hasta T07. */
export function createPlayer({ x = 152, y = 184, platforms = DEFAULT_PLATFORMS, worldWidth = 320 } = {}) {
  const body = { x, y, width: 16, height: 24, vx: 0, vy: 0, grounded: false };
  let previousX = x;
  let previousY = y;
  let jumpWasDown = false;
  let facing = 1;
  let sucking = false;
  let walkTime = 0;

  function update(dt, input = {}) {
    previousX = body.x;
    previousY = body.y;
    const direction = Math.max(-1, Math.min(1, input.horizontal ?? 0));
    body.vx = direction * 105;
    if (direction) facing = Math.sign(direction);
    sucking = Boolean(input.suck);
    const jumping = Boolean(input.jump);
    stepBody(body, platforms, dt, { jump: jumping && !jumpWasDown });
    jumpWasDown = jumping;
    if (body.x < 0) { body.x = 0; body.vx = 0; }
    if (body.x + body.width > worldWidth) { body.x = worldWidth - body.width; body.vx = 0; }
    if (direction && body.grounded) walkTime += dt;
  }

  function render(ctx, alpha = 1) {
    const x = previousX + (body.x - previousX) * alpha;
    const y = previousY + (body.y - previousY) * alpha;
    const stride = body.grounded && body.vx ? Math.sin(walkTime * 14) * 2 : 0;
    ctx.save();
    ctx.translate(x + body.width / 2, y);
    ctx.scale(facing, 1);
    // Traje, cabeza cabezona, flequillo y sonrisa de político inventado.
    ctx.fillStyle = '#202e48';
    ctx.fillRect(-6, 10, 12, 10);
    ctx.fillRect(-5, 19, 4, 5 + stride);
    ctx.fillRect(1, 19, 4, 5 - stride);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-2, 10, 4, 7);
    ctx.fillStyle = '#bd3b3b';
    ctx.fillRect(0, 10, 2, 6);
    ctx.fillStyle = '#efc59a';
    ctx.fillRect(-6, 1, 12, 10);
    ctx.fillStyle = '#36291f';
    ctx.fillRect(-6, 0, 12, 3);
    ctx.fillRect(2, 3, 4, 2);
    ctx.fillStyle = '#222';
    ctx.fillRect(3, 5, 1, 1);
    ctx.fillRect(2, 8, 3, 1);
    // Boquilla y trazos provisionales: no captura enemigos todavía.
    ctx.fillStyle = '#6c7881';
    ctx.fillRect(5, 13, 6, 3);
    if (sucking) {
      ctx.strokeStyle = '#eafaff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(13, 11); ctx.lineTo(19, 9);
      ctx.moveTo(14, 14); ctx.lineTo(22, 14);
      ctx.moveTo(13, 17); ctx.lineTo(19, 19);
      ctx.stroke();
    }
    ctx.restore();
  }

  return { body, update, render, get facing() { return facing; }, get sucking() { return sucking; } };
}
