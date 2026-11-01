import { W, FLOOR_Y } from './config.js';

export const FLOOR = { x: 0, y: FLOOR_Y, w: W, h: 80, floor: true };

/**
 * Integra un cuerpo {x,y,w,h,vx,vy} (esquina sup-izq) contra plataformas de un solo sentido y el suelo.
 * Devuelve { wall: -1|0|1, landed, ground } . o.drop ignora plataformas (salvo el suelo).
 */
export function stepBody(b, plats, dt, o = {}) {
  const g = o.gravity ?? 2700;
  const maxFall = o.maxFall ?? 1350;
  if (!o.noGravity) b.vy = Math.min(b.vy + g * dt, maxFall);
  let wall = 0;
  b.x += b.vx * dt;
  if (b.x < 0) { b.x = 0; wall = -1; } else if (b.x + b.w > W) { b.x = W - b.w; wall = 1; }
  const prevBottom = b.y + b.h;
  b.y += b.vy * dt;
  let landed = false;
  let ground = null;
  if (b.vy >= 0) {
    const bottom = b.y + b.h;
    for (const p of plats) {
      if (o.drop && !p.floor) continue;
      if (b.x + b.w <= p.x + 4 || b.x >= p.x + p.w - 4) continue;
      if (prevBottom <= p.y + 1 && bottom >= p.y) {
        if (!ground || p.y < ground.y) ground = p;
      }
    }
    if (ground) { b.y = ground.y - b.h; b.vy = 0; landed = true; }
  }
  if (b.y < (o.ceiling ?? 64) && !o.noCeiling) { b.y = o.ceiling ?? 64; if (b.vy < 0) b.vy = 0; }
  return { wall, landed, ground };
}

/** Plataforma justo debajo de un punto (para sombras y bordes). */
export function groundBelow(x, y, plats) {
  let best = null;
  for (const p of plats) if (x >= p.x && x <= p.x + p.w && p.y >= y - 1 && (!best || p.y < best.y)) best = p;
  return best;
}
