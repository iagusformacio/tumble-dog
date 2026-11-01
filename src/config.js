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
  suck: {
    range: 56,
    verticalRange: 24,     // altura a la que la boquilla aún engancha
    pullSeconds: 0.3,      // lo que tarda el enemigo en entrar en la boquilla
    escapeSeconds: 3,      // si no lo lanzas, se te escapa
    escapeStunSeconds: 0.9, // queda mareado al escaparse
  },
  enemy: {
    // Cada enemigo inventado tiene su velocidad de patrulla y su pausa al girar.
    portavoz: { width: 16, height: 22, speed: 46, turnPauseSeconds: 0.35 },
    respawnSeconds: 1.2,
  },
  ball: { speed: 260 },
  combo: [100, 200, 400, 800],
});
