import { CONFIG } from './config.js';

/**
 * HUD de Tumble Dog (T16): puntaje, oleada, vidas, pista del tutorial,
 * pantalla de título, pantallas finales y overlay de pausa.
 * Todo el texto es estilo tebeo: monospace negrita, color plano y trazo negro.
 * El módulo solo dibuja: main.js le pasa el estado de cada frame.
 */

/** Corazón de vida del jugador. */
function drawHeart(ctx, x, y, filled) {
  ctx.fillStyle = filled ? '#e03131' : 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.arc(x - 2, y - 1, 2.5, 0, Math.PI * 2);
  ctx.arc(x + 2, y - 1, 2.5, 0, Math.PI * 2);
  ctx.moveTo(x - 4.2, y + 0.5);
  ctx.lineTo(x + 4.2, y + 0.5);
  ctx.lineTo(x, y + 5.5);
  ctx.closePath();
  ctx.fill();
}

/** Pantalla de fin de partida: derrota o victoria. */
function drawEndScreen(ctx, width, height, title, line1, line2) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe44d';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(title, width / 2, 100);
  ctx.fillStyle = '#fff';
  ctx.font = '10px monospace';
  ctx.fillText(line1, width / 2, 120);
  ctx.font = '8px monospace';
  ctx.fillText(line2, width / 2, 136);
}

/** Pantalla de título (T16): logo, controls y aviso parpadeante. */
function drawTitleScreen(ctx, width, height, tick, blinkVisible, blinkSeconds) {
  const cx = width / 2;
  ctx.textAlign = 'center';

  // Logo «TUMBLE DOG» con pulsación suave (trazo negro + relleno amarillo).
  ctx.font = 'bold 20px monospace';
  const pulse = Math.sin(tick / 12) * 2;
  ctx.fillStyle = '#111';
  ctx.fillText('TUMBLE DOG', cx + 2, 78 + pulse + 2);
  ctx.fillStyle = '#ffe44d';
  ctx.fillText('TUMBLE DOG', cx, 78 + pulse);

  ctx.font = '10px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('el presidente ficticio que aspira a la oposición', cx, 96);

  ctx.font = 'bold 8px monospace';
  ctx.fillText('A/D MOVER · ESPACIO SALTAR · X ASPIRAR · Z LANZAR · M SONIDO', cx, 138);

  if (blinkVisible) {
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffe44d';
    ctx.fillText('PULSA Z O ESPACIO PARA JUGAR', cx, 160);
  }
}

/** Pista del tutorial (T16): texto con caja amarilla, sin banda negra extra. */
function drawTutorialHint(ctx, message, cx, y) {
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(message).width;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  ctx.fillRect(cx - tw / 2 - 4, y - 7, tw + 8, 12);
  ctx.strokeStyle = '#ffe44d';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - tw / 2 - 4, y - 7, tw + 8, 12);
  ctx.fillStyle = '#ffe44d';
  ctx.fillText(message, cx, y);
}

export function createHud({ config = CONFIG } = {}) {
  const blinkSeconds = config.title.blinkSeconds;

  /**
   * Dibuja el HUD completo según el snapshot de cada frame.
   * state: { width, height, tick, phase, score, wave, lives, maxLives,
   *          muted, actions, tutorial: {message}|null, paused, end }
   */
  function render(ctx, state) {
    const width = state.width;
    const height = state.height;
    const cx = width / 2;
    const tick = state.tick ?? 0;

    // HUD superior (puntos, oleada y vidas): en juego, no en título.
    if (state.phase !== 'title') {
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.fillText(`PUNTOS ${state.score}`, 6, 12);
      ctx.textAlign = 'right';
      ctx.fillText(`OLEADA ${state.wave}${state.muted ? ' · MUDO' : ''}`, width - 6, 12);
      for (let i = 0; i < state.maxLives; i += 1) {
        drawHeart(ctx, 10 + i * 11, 20, i < state.lives);
      }
    }

    // Pantalla de título.
    if (state.phase === 'title') {
      const blinkVisible = Math.floor(tick / (blinkSeconds * 60)) % 2 === 0;
      drawTitleScreen(ctx, width, height, tick, blinkVisible, blinkSeconds);
      return;
    }

    // Pista del tutorial (solo en la oleada de entrenamiento).
    if (state.tutorial?.message) {
      drawTutorialHint(ctx, state.tutorial.message, cx, height - 34);
    }

    // Línea de controles.
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText('A/D MOVER · ESPACIO SALTAR · X ASPIRAR · Z LANZAR · M SONIDO', cx, height - 8);

    // Acciones activas.
    const activeActions = state.actions ?? [];
    if (activeActions.length) {
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#ffe44d';
      ctx.fillText(activeActions.join(' + '), cx, 75);
    }

    // Pantallas finales.
    if (state.end) {
      drawEndScreen(ctx, width, height, state.end.title, state.end.line1, state.end.line2);
    }

    // Pausa.
    if (state.paused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('PAUSA', cx, height / 2);
      ctx.font = '10px monospace';
      ctx.fillText('vuelve a la ventana para seguir', cx, height / 2 + 20);
    }
  }

  return { render };
}
