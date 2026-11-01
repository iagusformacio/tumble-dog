import { CONFIG } from './config.js';
import { createGameLoop } from './loop.js';
import { createInput } from './input.js';
import { DEFAULT_PLATFORMS } from './physics.js';
import { createPlayer } from './player.js';
import { createMoncloaBackground } from './background.js';
import { createEnemyManager } from './enemies.js';
import { createComicEffects, getSharedAssets } from './assets.js';
import { createAudio } from './audio.js';

const canvas = document.getElementById('game');
const assets = getSharedAssets();
const comicEffects = createComicEffects();
const audio = createAudio();
const input = createInput();
const player = createPlayer({ assets });
const background = createMoncloaBackground();
const enemyManager = createEnemyManager({ assets, effects: comicEffects });
const screenCenterX = CONFIG.screen.width / 2;
let previousTick = 0;
let currentTick = 0;
let inputState = input.getState();
let ball = null; // bola en vuelo (T07); solo una a la vez
let throwWasDown = false;
let jumpWasDown = false;

/** Corazón de vida del HUD (T09). */
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

/** Pantalla de fin de partida (T09): derrota o victoria. */
function drawEndScreen(ctx, title, line1, line2) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  ctx.fillRect(0, 0, CONFIG.screen.width, CONFIG.screen.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe44d';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(title, screenCenterX, 100);
  ctx.fillStyle = '#fff';
  ctx.font = '10px monospace';
  ctx.fillText(line1, screenCenterX, 120);
  ctx.font = '8px monospace';
  ctx.fillText(line2, screenCenterX, 136);
}

function update(deltaSeconds) {
  previousTick = currentTick;
  currentTick += 1;
  inputState = input.getState();
  const vyBefore = player.body.vy;
  const groundedBefore = player.body.grounded;
  player.update(deltaSeconds, inputState);
  const jumped = player.body.vy < -CONFIG.physics.jumpSpeed * 0.5 && (groundedBefore || vyBefore >= 0);

  // Lanzar es por flanco: una pulsación = una bola.
  const throwPressed = Boolean(inputState.throw) && !throwWasDown;
  throwWasDown = Boolean(inputState.throw);
  const jumpPressed = Boolean(inputState.jump) && !jumpWasDown;
  jumpWasDown = Boolean(inputState.jump);
  let launched = false;
  if (throwPressed && (!ball || !ball.alive)) {
    ball = enemyManager.launchBall(player);
    launched = Boolean(ball);
  }
  if (ball) {
    ball.update(deltaSeconds);
    if (!ball.alive) ball = null;
  }
  enemyManager.update(deltaSeconds, player, inputState, ball);
  comicEffects.update(deltaSeconds);
  audio.update(deltaSeconds, { player, enemyManager, ball, inputState, jumped, launched });
  // T09: en derrota o victoria, Z o ESPACIO reinician la partida.
  if (enemyManager.phase !== 'playing' && (throwPressed || jumpPressed)) {
    enemyManager.restart();
  }
}

function render(alpha, isPaused = false) {
  const ctx = canvas.getContext('2d');
  const interpolatedTick = previousTick + (currentTick - previousTick) * alpha;

  const moncloaSprite = assets.getSprite('escenario', 'moncloa');
  if (moncloaSprite && typeof ctx.drawImage === 'function') {
    ctx.drawImage(moncloaSprite.image, 0, 0, CONFIG.screen.width, CONFIG.screen.height);
  } else {
    background.render(ctx);
  }
  for (const platform of DEFAULT_PLATFORMS) {
    ctx.fillStyle = '#111';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = '#765b42';
    ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
    ctx.fillStyle = '#d3bc8c';
    ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, 2);
  }
  enemyManager.render(ctx, alpha, player);
  if (ball) ball.render(ctx, alpha);
  player.render(ctx, alpha);
  comicEffects.render(ctx);
  // HUD (T09): puntos a la izquierda, oleada a la derecha y vidas como corazones (+ T11: estado del sonido).
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.fillText(`PUNTOS ${enemyManager.score}`, 6, 12);
  ctx.textAlign = 'right';
  ctx.fillText(`OLEADA ${enemyManager.wave}${audio.muted ? ' · MUDO' : ''}`, CONFIG.screen.width - 6, 12);
  for (let i = 0; i < CONFIG.player.lives; i += 1) {
    drawHeart(ctx, 10 + i * 11, 20, i < enemyManager.lives);
  }
  ctx.textAlign = 'center';
  ctx.font = '16px monospace';
  ctx.fillText('TUMBLE DOG', screenCenterX, 40 + Math.sin(interpolatedTick / 20) * 4);
  ctx.font = '7px monospace';
  ctx.fillText(
    'A/D MOVER · ESPACIO SALTAR · X ASPIRAR · Z LANZAR · M SONIDO',
    screenCenterX,
    CONFIG.screen.height - 8,
  );
  const activeActions = [
    inputState.left && 'IZQUIERDA',
    inputState.right && 'DERECHA',
    inputState.jump && 'SALTO',
    inputState.suck && 'ASPIRAR',
    inputState.throw && 'LANZAR',
  ].filter(Boolean);
  if (activeActions.length) {
    ctx.font = 'bold 8px monospace';
    ctx.fillText(activeActions.join(' + '), screenCenterX, 75);
  }

  // T09: pantallas de derrota y victoria.
  if (enemyManager.phase === 'gameover') {
    drawEndScreen(
      ctx,
      'GAME OVER',
      `PUNTOS ${enemyManager.score} · OLEADA ${enemyManager.wave}`,
      'pulsa Z o ESPACIO para reintentar',
    );
  } else if (enemyManager.phase === 'victory') {
    drawEndScreen(
      ctx,
      '¡VICTORIA!',
      `PUNTOS ${enemyManager.score} · ${CONFIG.wave.winWave} oleadas limpias`,
      'pulsa Z o ESPACIO para jugar otra vez',
    );
  }

  if (isPaused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.fillRect(0, 0, CONFIG.screen.width, CONFIG.screen.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('PAUSA', screenCenterX, CONFIG.screen.height / 2);
    ctx.font = '10px monospace';
    ctx.fillText('vuelve a la ventana para seguir', screenCenterX, CONFIG.screen.height / 2 + 20);
  }
}

createGameLoop({
  canvas,
  update,
  render,
  width: CONFIG.screen.width,
  height: CONFIG.screen.height,
  stepMs: CONFIG.step * 1000,
  onPause: () => {
    audio.setPaused(true);
    render(0, true);
  },
  onResume: () => {
    audio.setPaused(false);
  },
});
