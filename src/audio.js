/**
 * Sonido y música sintetizados con WebAudio (T11).
 * Sin muestras de audio externas: melodía original estilo tebeo arcade y efectos
 * físicos (salto, aspiradora, captura, lanzamiento, rebote, combo y golpe).
 * Respeta la política de autoplay del navegador (se desbloquea en el primer gesto)
 * y funciona como no-op silencioso en entornos sin WebAudio (Node / headless).
 */

// Melodía original juguetona (frecuencias en Hz, 0 = silencio, paso de semicorchea ~135 ms).
const AUDIO_MELODY = Object.freeze([
  523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 0,
  659.25, 587.33, 523.25, 587.33, 659.25, 523.25, 392.00, 0,
  440.00, 523.25, 659.25, 880.00, 783.99, 659.25, 587.33, 0,
  698.46, 659.25, 587.33, 523.25, 587.33, 659.25, 523.25, 0,
]);

// Bajo tipo tuba cómica que marca el pulso a contratiempo.
const AUDIO_BASS = Object.freeze([
  130.81, 0, 196.00, 0, 146.83, 0, 196.00, 0,
  130.81, 0, 196.00, 0, 130.81, 146.83, 196.00, 0,
  110.00, 0, 164.81, 0, 146.83, 0, 196.00, 0,
  174.61, 0, 196.00, 0, 130.81, 0, 130.81, 0,
]);

const AUDIO_NOTE_STEP_SECONDS = 0.14;
const AUDIO_SUCK_PULSE_SECONDS = 0.095;

function defaultAudioContextFactory() {
  const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (typeof Ctor !== 'function') return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export function createAudio({
  contextFactory = defaultAudioContextFactory,
  windowObject = globalThis.window,
  musicEnabled = true,
} = {}) {
  let ctx = null;
  let unlocked = false;
  let muted = false;
  let paused = false;
  let musicPlaying = Boolean(musicEnabled);
  let noteTimer = 0;
  let noteIndex = 0;
  let suckCooldown = 0;
  let playedEvents = 0;

  // Estado previo para detectar eventos del juego sin acoplar otros módulos.
  let prevCarried = false;
  let prevScore = 0;
  let prevHits = 0;
  let prevBallVx = 0;
  let prevBallVy = 0;
  let prevHadBall = false;

  function ensureContext() {
    if (muted) return null;
    if (!ctx) ctx = contextFactory();
    if (!ctx) return null;
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      try {
        const res = ctx.resume();
        if (res && typeof res.catch === 'function') res.catch(() => {});
      } catch {
        // Ignorar hasta que haya gesto del usuario.
      }
    }
    return ctx;
  }

  function playTone({
    type = 'square',
    startFreq = 440,
    endFreq = startFreq,
    duration = 0.08,
    gain = 0.06,
    delay = 0,
  }) {
    if (muted) return false;
    const audioCtx = ensureContext();
    if (!audioCtx || audioCtx.state === 'suspended') return false;

    try {
      const t0 = audioCtx.currentTime + delay;
      const t1 = t0 + duration;
      const osc = audioCtx.createOscillator();
      const amp = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, startFreq), t0);
      if (endFreq !== startFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t1);
      }
      amp.gain.setValueAtTime(Math.max(0.0001, gain), t0);
      amp.gain.exponentialRampToValueAtTime(0.0001, t1);
      osc.connect(amp);
      amp.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t1 + 0.01);
      playedEvents += 1;
      return true;
    } catch {
      return false;
    }
  }

  function unlock() {
    unlocked = true;
    ensureContext();
  }

  function playJump() {
    return playTone({ type: 'triangle', startFreq: 230, endFreq: 540, duration: 0.09, gain: 0.08 });
  }

  function playSuckPulse() {
    if (suckCooldown > 0) return false;
    suckCooldown = AUDIO_SUCK_PULSE_SECONDS;
    return playTone({ type: 'sine', startFreq: 190, endFreq: 265, duration: 0.075, gain: 0.035 });
  }

  function playCatch() {
    playTone({ type: 'triangle', startFreq: 520, endFreq: 260, duration: 0.06, gain: 0.08 });
    return playTone({
      type: 'square',
      startFreq: 390,
      endFreq: 780,
      duration: 0.09,
      gain: 0.07,
      delay: 0.055,
    });
  }

  function playThrow() {
    return playTone({ type: 'sawtooth', startFreq: 520, endFreq: 145, duration: 0.11, gain: 0.075 });
  }

  function playBounce() {
    return playTone({ type: 'triangle', startFreq: 280, endFreq: 420, duration: 0.045, gain: 0.045 });
  }

  function playCrush(comboCount = 1) {
    const semitones = Math.min(Math.max(0, comboCount - 1), 6) * 2;
    const base = 392 * (2 ** (semitones / 12));
    playTone({ type: 'square', startFreq: base * 0.75, endFreq: base, duration: 0.07, gain: 0.08 });
    return playTone({
      type: 'square',
      startFreq: base,
      endFreq: base * 1.5,
      duration: 0.12,
      gain: 0.075,
      delay: 0.055,
    });
  }

  function playEscape() {
    return playTone({ type: 'sawtooth', startFreq: 310, endFreq: 470, duration: 0.13, gain: 0.055 });
  }

  function playHurt() {
    playTone({ type: 'sawtooth', startFreq: 330, endFreq: 185, duration: 0.14, gain: 0.08 });
    return playTone({
      type: 'sawtooth',
      startFreq: 180,
      endFreq: 98,
      duration: 0.2,
      gain: 0.08,
      delay: 0.12,
    });
  }

  function stepMusic(dt) {
    if (!musicPlaying || muted || paused || !unlocked) return;
    noteTimer += dt;
    while (noteTimer >= AUDIO_NOTE_STEP_SECONDS) {
      noteTimer -= AUDIO_NOTE_STEP_SECONDS;
      const lead = AUDIO_MELODY[noteIndex % AUDIO_MELODY.length];
      const bass = AUDIO_BASS[noteIndex % AUDIO_BASS.length];
      noteIndex = (noteIndex + 1) % AUDIO_MELODY.length;
      if (lead > 0) {
        playTone({
          type: 'square',
          startFreq: lead,
          endFreq: lead,
          duration: AUDIO_NOTE_STEP_SECONDS * 0.72,
          gain: 0.022,
        });
      }
      if (bass > 0) {
        playTone({
          type: 'triangle',
          startFreq: bass,
          endFreq: bass,
          duration: AUDIO_NOTE_STEP_SECONDS * 0.85,
          gain: 0.032,
        });
      }
    }
  }

  /**
   * Actualiza temporizadores, melodía y dispara efectos según transiciones del frame.
   */
  function update(dt, { player, enemyManager, ball, inputState, jumped = false, launched = false } = {}) {
    if (suckCooldown > 0) suckCooldown = Math.max(0, suckCooldown - dt);
    stepMusic(dt);

    if (jumped) playJump();
    if (launched) playThrow();

    const carriesNow = Boolean(enemyManager?.carried);
    if (inputState?.suck && !carriesNow) {
      playSuckPulse();
    }
    if (carriesNow && !prevCarried) {
      playCatch();
    } else if (!carriesNow && prevCarried && !launched) {
      playEscape();
    }
    prevCarried = carriesNow;

    if (enemyManager) {
      if (enemyManager.score > prevScore) {
        playCrush(enemyManager.lastCombo || 1);
      }
      prevScore = enemyManager.score;

      if (enemyManager.hits > prevHits) {
        playHurt();
      }
      prevHits = enemyManager.hits;
    }

    if (ball && ball.alive) {
      if (prevHadBall) {
        const bouncedX = prevBallVx !== 0 && Math.sign(ball.body.vx) !== Math.sign(prevBallVx);
        const bouncedY = prevBallVy > 0 && ball.body.vy < 0;
        if (bouncedX || bouncedY) playBounce();
      }
      prevHadBall = true;
      prevBallVx = ball.body.vx;
      prevBallVy = ball.body.vy;
    } else {
      prevHadBall = false;
      prevBallVx = 0;
      prevBallVy = 0;
    }
  }

  function handleKeyDown(event) {
    if (event?.code === 'KeyM' && !event.repeat) {
      muted = !muted;
      return;
    }
    unlock();
  }

  function handlePointer() {
    unlock();
  }

  windowObject?.addEventListener?.('keydown', handleKeyDown);
  windowObject?.addEventListener?.('pointerdown', handlePointer);
  windowObject?.addEventListener?.('touchstart', handlePointer, { passive: true });

  return {
    unlock,
    update,
    playJump,
    playSuckPulse,
    playCatch,
    playThrow,
    playBounce,
    playCrush,
    playEscape,
    playHurt,
    setPaused(nextPaused) { paused = Boolean(nextPaused); },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    setMusicEnabled(enabled) {
      musicPlaying = Boolean(enabled);
    },
    destroy() {
      windowObject?.removeEventListener?.('keydown', handleKeyDown);
      windowObject?.removeEventListener?.('pointerdown', handlePointer);
      windowObject?.removeEventListener?.('touchstart', handlePointer);
      if (ctx && typeof ctx.close === 'function') {
        try { ctx.close(); } catch { /* noop */ }
      }
      ctx = null;
    },
    get muted() { return muted; },
    get unlocked() { return unlocked; },
    get playedEvents() { return playedEvents; },
  };
}
