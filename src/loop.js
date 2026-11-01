const DEFAULT_STEP_MS = 1000 / 60;
const MAX_FRAME_DELTA_MS = 250;
// Límite de estabilidad del motor: evitar una ráfaga de simulación tras un atasco.
const MAX_CATCH_UP_STEPS = 5;
const MAX_PIXEL_RATIO = 2;

/**
 * Start a fixed-step game loop and size the canvas to fit the available viewport.
 * update receives a fixed delta in seconds; render receives an interpolation alpha
 * in the range [0, 1] and should draw in logical canvas coordinates.
 */
export function createGameLoop({
  canvas,
  update,
  render,
  width = 320,
  height = 224,
  stepMs = DEFAULT_STEP_MS,
  maxFrameDeltaMs = MAX_FRAME_DELTA_MS,
  maxPixelRatio = MAX_PIXEL_RATIO,
  onPause = () => {},
  onResume = () => {},
  windowObject = globalThis.window,
  documentObject = globalThis.document,
  requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
  cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
  now = () => globalThis.performance.now(),
} = {}) {
  if (!canvas) throw new TypeError('createGameLoop necesita un canvas');
  if (typeof update !== 'function' || typeof render !== 'function') {
    throw new TypeError('createGameLoop necesita funciones update y render');
  }
  if (!(width > 0) || !(height > 0) || !(stepMs > 0)) {
    throw new RangeError('El tamaño del canvas y stepMs deben ser positivos');
  }
  if (!requestFrame || !cancelFrame) {
    throw new Error('Este navegador no ofrece requestAnimationFrame');
  }

  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear el contexto Canvas 2D');

  let frameId = null;
  let lastTime = null;
  let accumulator = 0;
  let running = true;
  let manuallyPaused = false;
  let focused = true;
  let paused = false;

  canvas.width = width;
  canvas.height = height;
  canvas.style.display = 'block';
  canvas.style.imageRendering = 'pixelated';

  function resizeCanvas() {
    const viewportWidth = Math.max(1, windowObject?.innerWidth ?? width);
    const viewportHeight = Math.max(1, windowObject?.innerHeight ?? height);
    const fit = Math.min(viewportWidth / width, viewportHeight / height);
    const cssWidth = Math.max(1, Math.floor(width * fit));
    const cssHeight = Math.max(1, Math.floor(height * fit));
    const pixelRatio = Math.min(windowObject?.devicePixelRatio || 1, maxPixelRatio);

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
    canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  }

  function isEligibleToRun() {
    return running && !manuallyPaused && focused && !documentObject?.hidden;
  }

  function scheduleFrame() {
    if (frameId === null && isEligibleToRun()) frameId = requestFrame(frame);
  }

  function syncPauseState() {
    const nextPaused = !isEligibleToRun();
    if (nextPaused === paused) return;
    paused = nextPaused;
    accumulator = 0;
    lastTime = null;
    if (paused) {
      if (frameId !== null) cancelFrame(frameId);
      frameId = null;
      onPause();
    } else {
      onResume();
      scheduleFrame();
    }
  }

  function frame(timestamp) {
    frameId = null;
    if (!isEligibleToRun()) {
      syncPauseState();
      return;
    }

    if (lastTime === null) lastTime = timestamp;
    const elapsed = Math.min(Math.max(0, timestamp - lastTime), maxFrameDeltaMs);
    lastTime = timestamp;
    accumulator += elapsed;

    let catchUpSteps = 0;
    while (accumulator >= stepMs && catchUpSteps < MAX_CATCH_UP_STEPS) {
      update(stepMs / 1000);
      accumulator -= stepMs;
      catchUpSteps += 1;
    }
    // Si el hilo principal se atascó, se descartan los pasos enteros atrasados:
    // conservarlos encadenaría más trabajo y haría que la interfaz siguiera a trompicones.
    if (accumulator >= stepMs) accumulator %= stepMs;
    render(accumulator / stepMs);
    scheduleFrame();
  }

  function handleBlur() {
    focused = false;
    syncPauseState();
  }

  function handleFocus() {
    focused = true;
    syncPauseState();
  }

  function handleVisibilityChange() {
    syncPauseState();
  }

  resizeCanvas();
  windowObject?.addEventListener('resize', resizeCanvas);
  windowObject?.addEventListener('blur', handleBlur);
  windowObject?.addEventListener('focus', handleFocus);
  documentObject?.addEventListener('visibilitychange', handleVisibilityChange);
  syncPauseState();
  scheduleFrame();

  return {
    canvas,
    context,
    resize: resizeCanvas,
    pause() {
      manuallyPaused = true;
      syncPauseState();
    },
    resume() {
      manuallyPaused = false;
      syncPauseState();
    },
    get isPaused() {
      return paused;
    },
    stop() {
      if (!running) return;
      running = false;
      syncPauseState();
      if (frameId !== null) cancelFrame(frameId);
      frameId = null;
      windowObject?.removeEventListener('resize', resizeCanvas);
      windowObject?.removeEventListener('blur', handleBlur);
      windowObject?.removeEventListener('focus', handleFocus);
      documentObject?.removeEventListener('visibilitychange', handleVisibilityChange);
    },
  };
}
