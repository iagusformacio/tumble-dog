// Números del «feeling» del juego. Cambiar el juego = cambiar aquí.
// Unidades: píxeles lógicos (pantalla 320×224), segundos, 60 Hz.
export const CONFIG = Object.freeze({
  screen: Object.freeze({ width: 320, height: 224 }),
  step: 1 / 60,
  physics: Object.freeze({ gravity: 900, jumpSpeed: 330 }),
  player: Object.freeze({
    width: 16,
    height: 24,
    spawnX: 152,
    spawnY: 184,
    walkSpeed: 105,
    coyoteFrames: 6,       // margen para saltar tras dejar una plataforma
    jumpBufferFrames: 6,   // margen para saltar un poco antes de aterrizar
    lives: 3,
    invulnerableSeconds: 2,
  }),
  suck: Object.freeze({
    range: 56,
    verticalRange: 24,     // altura a la que la boquilla aún engancha
    pullSeconds: 0.3,      // lo que tarda el enemigo en entrar en la boquilla
    escapeSeconds: 3,      // si no lo lanzas, se te escapa
    escapeStunSeconds: 0.9, // queda mareado al escaparse
  }),
  enemy: Object.freeze({
    // Cada enemigo inventado tiene su tamaño, velocidad de patrulla y su
    // comportamiento propio (T08): bulos, escondite, correr, saltar, ráfagas…
    portavoz: Object.freeze({ width: 16, height: 22, speed: 46, turnPauseSeconds: 0.35 }),
    tertuliano: Object.freeze({
      width: 16, height: 22, speed: 38, turnPauseSeconds: 0.3,
      shootEverySeconds: 2.5, bulletSpeed: 95, bulletRange: 130, // dispara bulos
    }),
    asesor: Object.freeze({
      width: 15, height: 22, speed: 30, turnPauseSeconds: 0.2,
      hideEverySeconds: 5, hiddenSeconds: 2.2, // se esconde
    }),
    influencer: Object.freeze({ width: 14, height: 20, speed: 88, turnPauseSeconds: 0 }), // corre
    lider: Object.freeze({
      width: 16, height: 22, speed: 40, turnPauseSeconds: 0.25,
      jumpEverySeconds: 1.8, jumpSpeed: 300, // salta alto
    }),
    baron: Object.freeze({ width: 20, height: 26, speed: 26, turnPauseSeconds: 0 }), // pesado
    activista: Object.freeze({
      width: 14, height: 20, speed: 56, turnPauseSeconds: 0.1,
      jumpEverySeconds: 2.4, jumpSpeed: 230, erratic: true, // salta y cambia al azar
    }),
    diputado: Object.freeze({
      width: 16, height: 22, speed: 40, turnPauseSeconds: 0.8,
      burstEverySeconds: 3.5, burstSeconds: 0.7, burstSpeed: 115, // ráfagas
    }),
    respawnSeconds: 1.2,
    bulletSize: 6,
  }),
  ball: Object.freeze({
    speed: 260,
    size: 10,          // diámetro de la bola (enemigo enrollado)
    lifeSeconds: 4,    // la bola desaparece sola al cabo de este tiempo
    restitution: 0.95, // fracción de velocidad que conserva en cada rebote
  }),
  combo: Object.freeze([100, 200, 400, 800]),
});
