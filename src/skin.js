// «Skin» activa del tema en curso. La fija game.js al arrancar o cambiar de tema
// (ver applyTheme en game.js). Los módulos de dibujo la consultan para los
// colores, textos y perseguidor provisionales cuando todavía falta arte del tema.
// Por defecto (tema tumbledog) todos los valores son null y no cambia nada.
export const skin = {
  enemyColors: null, // { tipo: color } para el dibujo provisional de enemigos
  playerTint: null,  // color de la chaqueta del dibujo provisional del protagonista
  chaser: null,      // 'camarero' dibuja el perseguidor provisional del tema
  hitWords: null,    // onomatopeyas del jefe al recibir daño
  touch: null,       // etiquetas de los botones táctiles
  bossShots: null,   // { arte-de-jefe: nombre-del-sprite } para sus proyectiles
};

export function setSkin(s = {}) { Object.assign(skin, s); }
