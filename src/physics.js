import { CONFIG } from './config.js';

/**
 * Física en coordenadas de pantalla: x crece a la derecha, y hacia abajo.
 * Un rectángulo tiene {x, y, width, height}; un cuerpo añade vx, vy y grounded.
 * Las plataformas son sólidas por defecto; oneWay: true solo bloquea al caer.
 * Se parte de cuerpos no solapados con sólidos. Las velocidades están en
 * píxeles/segundo, la gravedad en píxeles/segundo² y dt en segundos.
 */

/** Los bordes que solo se tocan no constituyen un solapamiento. */
export function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Un paso de física; modifica el cuerpo y lo devuelve. Resolver por ejes y
 * barrer hasta el obstáculo más cercano evita atravesar plataformas finas.
 * jump es una pulsación, no el estado mantenido: quien llama detecta el flanco.
 * canJump permite habilitar coyote time desde el jugador sin romper el salto normal.
 * Se espera un paso fijo, por ejemplo el dt de createGameLoop (CONFIG.step).
 */
export function stepBody(
  body,
  platforms,
  dt,
  {
    gravity = CONFIG.physics.gravity,
    jumpSpeed = CONFIG.physics.jumpSpeed,
    jump = false,
    canJump = body.grounded,
  } = {},
) {
  if (!Number.isFinite(dt) || dt < 0 || !Number.isFinite(gravity) || gravity < 0 ||
      !Number.isFinite(jumpSpeed) || jumpSpeed < 0) {
    throw new RangeError('dt, gravity y jumpSpeed deben ser números finitos no negativos');
  }

  if (jump && canJump) {
    body.vy = -jumpSpeed;
    body.grounded = false;
  }
  body.vy += gravity * dt;

  const dx = body.vx * dt;
  let nextX = body.x + dx;
  let hitWall = false;
  for (const platform of platforms) {
    if (platform.oneWay || body.y >= platform.y + platform.height ||
        body.y + body.height <= platform.y) continue;
    if (dx > 0 && body.x + body.width <= platform.x && nextX + body.width >= platform.x) {
      nextX = Math.min(nextX, platform.x - body.width);
      hitWall = true;
    } else if (dx < 0 && body.x >= platform.x + platform.width && nextX <= platform.x + platform.width) {
      nextX = Math.max(nextX, platform.x + platform.width);
      hitWall = true;
    }
  }
  if (hitWall) body.vx = 0;
  body.x = nextX;

  const dy = body.vy * dt;
  let nextY = body.y + dy;
  let landed = false;
  let hitCeiling = false;
  for (const platform of platforms) {
    if (body.x >= platform.x + platform.width || body.x + body.width <= platform.x) continue;
    if (dy >= 0 && body.y + body.height <= platform.y && nextY + body.height >= platform.y) {
      nextY = Math.min(nextY, platform.y - body.height);
      landed = true;
    } else if (dy < 0 && !platform.oneWay && body.y >= platform.y + platform.height &&
               nextY <= platform.y + platform.height) {
      nextY = Math.max(nextY, platform.y + platform.height);
      hitCeiling = true;
    }
  }
  if (landed || hitCeiling) body.vy = 0;
  body.y = nextY;
  body.grounded = landed;
  return body;
}

/** Nivel provisional de 320 × 224: suelo sólido y plataformas atravesables. */
export const DEFAULT_PLATFORMS = Object.freeze([
  Object.freeze({ x: 0, y: 208, width: CONFIG.screen.width, height: 16 }),
  Object.freeze({ x: 24, y: 158, width: 92, height: 8, oneWay: true }),
  Object.freeze({ x: 204, y: 158, width: 92, height: 8, oneWay: true }),
  Object.freeze({ x: 114, y: 108, width: 92, height: 8, oneWay: true }),
]);
