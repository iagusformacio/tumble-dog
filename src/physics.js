export const DEFAULT_PLATFORMS = Object.freeze([
  Object.freeze({ x: 0, y: 188, width: 320, height: 36 }),
  Object.freeze({ x: 28, y: 148, width: 92, height: 8 }),
  Object.freeze({ x: 197, y: 128, width: 95, height: 8 }),
]);

export function createBody({ x, y, width, height, velocityX = 0, velocityY = 0 } = {}) {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new TypeError('El cuerpo necesita posición y dimensiones válidas');
  }
  return { x, y, width, height, velocityX, velocityY, grounded: false };
}

export function intersectsAabb(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y;
}

function resolveHorizontal(body, platforms, direction, previousX) {
  for (const platform of platforms) {
    const overlapsVertically = body.y < platform.y + platform.height
      && body.y + body.height > platform.y;
    const crossedRightEdge = direction > 0 && previousX + body.width <= platform.x
      && body.x + body.width > platform.x;
    const crossedLeftEdge = direction < 0 && previousX >= platform.x + platform.width
      && body.x < platform.x + platform.width;
    if (!overlapsVertically || (!intersectsAabb(body, platform) && !crossedRightEdge && !crossedLeftEdge)) continue;
    if (direction > 0) body.x = platform.x - body.width;
    else if (direction < 0) body.x = platform.x + platform.width;
    body.velocityX = 0;
  }
}

function resolveVertical(body, platforms, direction, previousY) {
  body.grounded = false;
  for (const platform of platforms) {
    const overlapsHorizontally = body.x < platform.x + platform.width
      && body.x + body.width > platform.x;
    const crossedTop = direction > 0 && previousY + body.height <= platform.y
      && body.y + body.height > platform.y;
    const crossedBottom = direction < 0 && previousY >= platform.y + platform.height
      && body.y < platform.y + platform.height;
    if (!overlapsHorizontally || (!intersectsAabb(body, platform) && !crossedTop && !crossedBottom)) continue;
    if (direction > 0) {
      body.y = platform.y - body.height;
      body.grounded = true;
    } else if (direction < 0) {
      body.y = platform.y + platform.height;
    }
    body.velocityY = 0;
  }
}

/** Simulates one fixed timestep and resolves solid AABB platforms on each axis. */
export function stepPhysics(body, controls, deltaSeconds, {
  platforms = DEFAULT_PLATFORMS,
  worldWidth = 320,
  gravity = 900,
  moveSpeed = 100,
  jumpSpeed = 300,
} = {}) {
  if (!(deltaSeconds >= 0) || !Number.isFinite(deltaSeconds)) {
    throw new RangeError('deltaSeconds debe ser un número finito no negativo');
  }

  const direction = Math.max(-1, Math.min(1, controls?.horizontal ?? 0));
  body.velocityX = direction * moveSpeed;
  if (controls?.jumpPressed && body.grounded) {
    body.velocityY = -jumpSpeed;
    body.grounded = false;
  }

  const previousX = body.x;
  body.x += body.velocityX * deltaSeconds;
  resolveHorizontal(body, platforms, direction, previousX);
  if (body.x < 0) {
    body.x = 0;
    body.velocityX = 0;
  } else if (body.x + body.width > worldWidth) {
    body.x = worldWidth - body.width;
    body.velocityX = 0;
  }

  body.velocityY += gravity * deltaSeconds;
  const verticalDirection = Math.sign(body.velocityY);
  const previousY = body.y;
  body.y += body.velocityY * deltaSeconds;
  resolveVertical(body, platforms, verticalDirection, previousY);
}
