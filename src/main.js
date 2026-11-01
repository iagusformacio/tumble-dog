import { CONFIG } from './config.js';
import { createGameLoop } from './loop.js';
import { createInput } from './input.js';
import { DEFAULT_PLATFORMS } from './physics.js';
import { createPlayer } from './player.js';
import { createMoncloaBackground } from './background.js';
import { createEnemyManager } from './enemies.js';

const canvas = document.getElementById('game');
const input = createInput();
const player = createPlayer();
const background = createMoncloaBackground();
const enemyManager = createEnemyManager();
const screenCenterX = CONFIG.screen.width / 2;
let previousTick = 0;
let currentTick = 0;
let inputState = input.getState();

function update(deltaSeconds) {
  previousTick = currentTick;
  currentTick += 1;
  inputState = input.getState();
  player.update(deltaSeconds, inputState);
  enemyManager.update(deltaSeconds, player, inputState);
}

function render(alpha, isPaused = false) {
  const ctx = canvas.getContext('2d');
  const interpolatedTick = previousTick + (currentTick - previousTick) * alpha;

  background.render(ctx);
  for (const platform of DEFAULT_PLATFORMS) {
    ctx.fillStyle = '#765b42';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = '#d3bc8c';
    ctx.fillRect(platform.x, platform.y, platform.width, 2);
  }
  enemyManager.render(ctx, alpha, player);
  player.render(ctx, alpha);
  // HUD mínimo mientras no existe T09: vidas en texto.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`VIDAS ${enemyManager.lives}`, 6, 12);
  ctx.textAlign = 'center';
  ctx.font = '16px monospace';
  ctx.fillText('TUMBLE DOG', screenCenterX, 40 + Math.sin(interpolatedTick / 20) * 4);
  ctx.font = '10px monospace';
  ctx.fillText('en construcción', screenCenterX, 60);
  ctx.font = '7px monospace';
  ctx.fillText('A/D MOVER · ESPACIO SALTAR · X ASPIRAR · Z LANZAR', screenCenterX, CONFIG.screen.height - 8);
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
  onPause: () => render(0, true),
});
