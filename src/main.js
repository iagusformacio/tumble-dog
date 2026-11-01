import { CONFIG } from './config.js';
import { createGameLoop } from './loop.js';
import { createInput } from './input.js';
import { DEFAULT_PLATFORMS } from './physics.js';
import { createPlayer } from './player.js';
import { createMoncloaBackground } from './background.js';
import { createEnemyManager } from './enemies.js';
import { createComicEffects, getSharedAssets } from './assets.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';

const canvas = document.getElementById('game');
const assets = getSharedAssets();
const comicEffects = createComicEffects();
const audio = createAudio();
const input = createInput();
const player = createPlayer({ assets });
const background = createMoncloaBackground();
const enemyManager = createEnemyManager({ assets, effects: comicEffects });
const hud = createHud({ config: CONFIG });
const screenCenterX = CONFIG.screen.width / 2;
let previousTick = 0;
let currentTick = 0;
let inputState = input.getState();
let ball = null; // bola en vuelo (T07); solo una a la vez
let throwWasDown = false;
let jumpWasDown = false;
// T16: sesión y tutorial del primer nivel (pantalla de título + pista).
let session = 'title'; // 'title' | 'playing'
let tutorialSucked = false;
let tutorialThrown = false;
let tutorialCrushed = false;

/** T16: empezar la partida desde la pantalla de título. */
function startGame() {
  session = 'playing';
  resetTutorial();
  enemyManager.restart();
  ball = null;
  throwWasDown = Boolean(inputState.throw);
  jumpWasDown = Boolean(inputState.jump);
}

/** T16: tutorial del primer nivel (solo en la oleada de CONFIG.tutorial.wave). */
function resetTutorial() {
  tutorialSucked = false;
  tutorialThrown = false;
  tutorialCrushed = false;
}

function updateTutorial(launched) {
  if (enemyManager.wave !== CONFIG.tutorial.wave) return;
  if (enemyManager.carried && !tutorialSucked) tutorialSucked = true;
  if (launched) tutorialThrown = true;
  if (enemyManager.score > 0) tutorialCrushed = true;
}

function tutorialMessage() {
  if (enemyManager.wave !== CONFIG.tutorial.wave) return null;
  if (!tutorialSucked) return 'X: ¡ASPIRAR a los enemigos!';
  if (!tutorialThrown) return 'Z: ¡LANZAR la bola y aplasta a los demás!';
  if (!tutorialCrushed) return '¡MUY BIEN! ¡Sigue aplastando!';
  return null;
}

function update(deltaSeconds) {
  previousTick = currentTick;
  currentTick += 1;
  inputState = input.getState();

  const throwPressed = Boolean(inputState.throw) && !throwWasDown;
  throwWasDown = Boolean(inputState.throw);
  const jumpPressed = Boolean(inputState.jump) && !jumpWasDown;
  jumpWasDown = Boolean(inputState.jump);

  // T16: en el título el juego está pausado; Z o ESPACIO empieza la partida.
  if (session === 'title') {
    comicEffects.update(deltaSeconds);
    audio.update(deltaSeconds, { player, enemyManager, ball: null, inputState, jumped: false, launched: false });
    if (throwPressed || jumpPressed) startGame();
    return;
  }

  const vyBefore = player.body.vy;
  const groundedBefore = player.body.grounded;
  player.update(deltaSeconds, inputState);
  const jumped = player.body.vy < -CONFIG.physics.jumpSpeed * 0.5 && (groundedBefore || vyBefore >= 0);

  // Lanzar es por flanco: una pulsación = una bola.
  let launched = false;
  if (throwPressed && (!ball || !ball.alive)) {
    ball = enemyManager.launchBall(player);
    launched = Boolean(ball);
  }
  if (ball) {
    ball.update(deltaSeconds);
    // T07: al morir la bola, el enemigo que llevaba dentro queda libre.
    if (!ball.alive) {
      ball.carrier?.release?.();
      ball = null;
    }
  }
  enemyManager.update(deltaSeconds, player, inputState, ball);
  comicEffects.update(deltaSeconds);
  audio.update(deltaSeconds, { player, enemyManager, ball, inputState, jumped, launched });

  // T16: tutorial del primer nivel.
  updateTutorial(launched);

  // T09: en derrota o victoria, Z o ESPACIO reinician la partida.
  if (enemyManager.phase !== 'playing' && (throwPressed || jumpPressed)) {
    ball = null; // no dejamos una bola fantasma tras el reinicio.
    enemyManager.restart();
    resetTutorial();
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

  // T16: en el título solo se muestra el logo (sin enemigos ni jugador).
  if (session === 'title') {
    hud.render(ctx, {
      width: CONFIG.screen.width,
      height: CONFIG.screen.height,
      tick: interpolatedTick,
      phase: 'title',
    });
    return;
  }

  enemyManager.render(ctx, alpha, player, ball);
  if (ball) ball.render(ctx, alpha);
  player.render(ctx, alpha);
  comicEffects.render(ctx);

  // T16: todo el HUD (incl. tutorial, título y finales) vive en src/hud.js.
  hud.render(ctx, {
    width: CONFIG.screen.width,
    height: CONFIG.screen.height,
    tick: interpolatedTick,
    phase: enemyManager.phase,
    score: enemyManager.score,
    wave: enemyManager.wave,
    lives: enemyManager.lives,
    maxLives: CONFIG.player.lives,
    muted: audio.muted,
    actions: [
      inputState.left && 'IZQUIERDA',
      inputState.right && 'DERECHA',
      inputState.jump && 'SALTO',
      inputState.suck && 'ASPIRAR',
      inputState.throw && 'LANZAR',
    ].filter(Boolean),
    tutorial: { message: tutorialMessage() },
    paused: isPaused,
    end: enemyManager.phase === 'gameover'
      ? {
        title: 'GAME OVER',
        line1: `PUNTOS ${enemyManager.score} · OLEADA ${enemyManager.wave}`,
        line2: 'pulsa Z o ESPACIO para reintentar',
      }
      : enemyManager.phase === 'victory'
        ? {
          title: '¡VICTORIA!',
          line1: `PUNTOS ${enemyManager.score} · ${CONFIG.wave.winWave} oleadas limpias`,
          line2: 'pulsa Z o ESPACIO para jugar otra vez',
        }
        : null,
  });
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
