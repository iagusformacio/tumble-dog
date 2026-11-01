// Números del «feeling» del juego. Cambiar el juego = cambiar aquí.
// Unidades: píxeles lógicos (pantalla 320×224), segundos, 60 Hz.
export const CONFIG = Object.freeze({
  screen: { width: 320, height: 224 },
  step: 1 / 60,
  physics: { gravity: 900, jumpSpeed: 330 },
  player: {
    width: 16, height: 24,
    walkSpeed: 105,
    coyoteFrames: 6,       // margen para saltar tras dejar una plataforma
    jumpBufferFrames: 6,   // margen para saltar un poco antes de aterrizar
    lives: 3,
    invulnerableSeconds: 2,
  },
  suck: { range: 56, escapeSeconds: 3 },
  ball: { speed: 260 },
  combo: [100, 200, 400, 800],
});
