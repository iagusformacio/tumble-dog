import { createGameLoop } from './loop.js';
import { createInput } from './input.js';
import { createMoncloaBackground } from './background.js';
import { createBody, DEFAULT_PLATFORMS, stepPhysics } from './physics.js';

const canvas = document.getElementById('game');
const input = createInput();
const background = createMoncloaBackground();
const player = createBody({ x: 46, y: 121, width: 16, height: 24 });
let previousTick = 0;
let currentTick = 0;
let inputState = input.getState();
let jumpWasDown = false;

function update(deltaSeconds) {
  previousTick = currentTick;
  currentTick += 1;
  inputState = input.getState();
  stepPhysics(player, {
    horizontal: inputState.horizontal,
    jumpPressed: inputState.jump && !jumpWasDown,
  }, deltaSeconds);
  jumpWasDown = inputState.jump;
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
  // Marcador de jugador geométrico y deliberadamente genérico; el personaje final va en T05.
  ctx.fillStyle = '#263447';
  ctx.fillRect(player.x + 1, player.y + 8, 14, 16);
  ctx.fillStyle = '#e6bf91';
  ctx.beginPath();
  ctx.arc(player.x + 8, player.y + 5, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b94d3e';
  ctx.fillRect(player.x + 6, player.y + 9, 4, 9);
  ctx.fillStyle = '#fff';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TUMBLE DOG', 160, 40 + Math.sin(interpolatedTick / 20) * 4);
  ctx.font = '10px monospace';
  ctx.fillText('en construcción', 160, 60);
  ctx.font = '7px monospace';
  ctx.fillText('A/D MOVER · ESPACIO SALTAR · X ASPIRAR · Z LANZAR', 160, 216);
  const activeActions = [
    inputState.left && 'IZQUIERDA',
    inputState.right && 'DERECHA',
    inputState.jump && 'SALTO',
    inputState.suck && 'ASPIRAR',
    inputState.throw && 'LANZAR',
  ].filter(Boolean);
  if (activeActions.length) {
    ctx.font = 'bold 8px monospace';
    ctx.fillText(activeActions.join(' + '), 160, 75);
  }

  if (isPaused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.fillRect(0, 0, 320, 224);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('PAUSA', 160, 112);
    ctx.font = '10px monospace';
    ctx.fillText('vuelve a la ventana para seguir', 160, 132);
  }

}

createGameLoop({
  canvas,
  update,
  render,
  width: 320,
  height: 224,
  onPause: () => render(0, true),
});
