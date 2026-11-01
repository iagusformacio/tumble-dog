// Todos los números del «feeling». Cambiar el juego = cambiar aquí.
// Unidades: píxeles lógicos (1280×720), segundos.
export const W = 1280;
export const H = 720;
export const FLOOR_Y = 640;

export const CONFIG = {
  step: 1 / 120,
  physics: { gravity: 2700, maxFall: 1350 },
  player: {
    w: 46, h: 92, scale: 0.5,
    runSpeed: 360, accelGround: 4200, accelAir: 2600, friction: 5200,
    jumpSpeed: 1080, jumpCut: 0.45, coyote: 0.1, buffer: 0.12,
    lives: 3, invulnerable: 2.4, respawnDelay: 1.1,
    extraLifeEvery: 40000,
  },
  vacuum: {
    range: 250, rangePow: 340, halfStart: 34, halfEnd: 92,
    pullTime: 0.32, captureFly: 0.16, maxHeld: 4,
    warnAt: 3.0, burstAt: 4.6,
  },
  ball: {
    speed: 700, baseRadius: 38, perEnemy: 9, maxWallHits: 4, life: 7,
    chain: [100, 200, 400, 800, 1600, 3200, 6400],
  },
  enemy: { w: 48, h: 86, scale: 0.47, stunAfterBeam: 0.7 },
  stage: { hurryAt: 32, chaserAt: 42, clearDelay: 1.6, introTime: 1.8 },
  letters: { word: 'TUMBLEDOG', dropChance: 0.3, bubbleSpeed: 70 },
  bonus: { time: 12, rain: 0.09 },
  fx: { maxParticles: 900 },
};
