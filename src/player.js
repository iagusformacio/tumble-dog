import { CONFIG } from './config.js';
import { DEFAULT_PLATFORMS, stepBody } from './physics.js';

/** Don Presi es un personaje ficticio; tamaño, velocidad y salto salen de CONFIG. */
export function createPlayer({
  config = CONFIG,
  x = config.player.spawnX,
  y = config.player.spawnY,
  width = config.player.width,
  height = config.player.height,
  platforms = DEFAULT_PLATFORMS,
  worldWidth = config.screen.width,
} = {}) {
  const body = { x, y, width, height, vx: 0, vy: 0, grounded: false };
  let previousX = x;
  let previousY = y;
  let jumpWasDown = false;
  let coyoteLeft = 0;
  let jumpBufferLeft = 0;
  let facing = 1;
  let sucking = false;
  let walkTime = 0;
  const suckZone = { x: 0, y: 0, width: config.suck.range, height: config.suck.verticalRange };

  function update(dt, input = {}) {
    previousX = body.x;
    previousY = body.y;
    const elapsedFrames = dt > 0 ? Math.max(1, Math.round(dt / config.step)) : 0;
    const direction = Math.max(-1, Math.min(1, input.horizontal ?? 0));
    body.vx = direction * config.player.walkSpeed;
    if (direction) facing = Math.sign(direction);
    sucking = Boolean(input.suck);

    const jumping = Boolean(input.jump);
    const jumpPressed = jumping && !jumpWasDown;
    jumpWasDown = jumping;

    const wasGrounded = body.grounded;
    const canJumpNow = wasGrounded || coyoteLeft > 0;
    const jumpedBeforeStep = (jumpPressed || jumpBufferLeft > 0) && canJumpNow;

    if (jumpPressed && !jumpedBeforeStep) {
      jumpBufferLeft = config.player.jumpBufferFrames;
    }

    stepBody(body, platforms, dt, {
      gravity: config.physics.gravity,
      jumpSpeed: config.physics.jumpSpeed,
      jump: jumpedBeforeStep,
      canJump: canJumpNow,
    });

    if (jumpedBeforeStep) {
      coyoteLeft = 0;
      jumpBufferLeft = 0;
    } else if (body.grounded && jumpBufferLeft > 0) {
      body.vy = -config.physics.jumpSpeed;
      body.grounded = false;
      coyoteLeft = 0;
      jumpBufferLeft = 0;
    } else {
      if (body.grounded || wasGrounded) {
        coyoteLeft = config.player.coyoteFrames;
      } else {
        coyoteLeft = Math.max(0, coyoteLeft - elapsedFrames);
      }
      if (!jumpPressed) {
        jumpBufferLeft = Math.max(0, jumpBufferLeft - elapsedFrames);
      }
    }

    if (body.x < 0) { body.x = 0; body.vx = 0; }
    if (body.x + body.width > worldWidth) { body.x = worldWidth - body.width; body.vx = 0; }

    // Zona de aspiración delante de la boquilla (coordenadas de pantalla).
    const mouthX = facing >= 0 ? body.x + body.width : body.x - config.suck.range;
    suckZone.x = mouthX;
    suckZone.y = body.y + 4;
    suckZone.width = config.suck.range;
    suckZone.height = config.suck.verticalRange;
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
    // Boquilla y trazos provisionales.
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

  return {
    body,
    update,
    render,
    /** Rectángulo donde la boquilla puede enganchar a un enemigo libre. */
    suckZone,
    get facing() { return facing; },
    get sucking() { return sucking; },
    get coyoteFramesLeft() { return coyoteLeft; },
    get jumpBufferFramesLeft() { return jumpBufferLeft; },
  };
}
