// Música y efectos sintetizados con WebAudio (melodías originales, sin muestras).
// Se desbloquea en el primer gesto; en Node/headless es un no-op silencioso.
const NOTE = (n) => {
  if (!n || n === '-') return 0;
  const m = /^([A-G])(#?)(\d)$/.exec(n); if (!m) return 0;
  const k = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  return 440 * 2 ** ((k + (Number(m[3]) - 4) * 12 - 9) / 12);
};
const seq = (s) => s.trim().split(/\s+/).map((tok) => { const [n, d] = tok.split(':'); return [NOTE(n), Number(d || 1)]; });

// Canciones sintetizadas por defecto (tema «tumbledog»); cada tema puede traer
// las suyas con setSongs, y además ficheros de audio propios (mp3) por sección.
// Si un tema trae un mp3 para una sección (title/stage/boss/bonus), esa canción
// manda: el sintetizador queda solo para los efectos y como respaldo si el
// fichero no carga (issue #95).
import { SONGS } from './themes/tumbledog.js';
import { CONFIG } from './config.js';

const AX = CONFIG.audio;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const nowSec = () => (globalThis.performance && typeof performance.now === 'function' ? performance.now() : Date.now()) / 1000;

export function createAudio() {
  let ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
  let muted = false, song = null, songName = null, step = 0, nextTime = 0, leadI = 0, leadLeft = 0, bassI = 0, bassLeft = 0, tempo = 1;
  let suckNode = null;
  let songs = SONGS;      // canciones sintetizadas del tema activo
  let files = null;       // { sección: './assets/audio/x.mp3' } del tema activo
  let media = null;       // { el, vol, maxVol, rate, name }: canción mp3 en curso
  let fading = [];        // canciones mp3 que se están apagando (fundido de salida)
  let lastTick = 0;       // reloj del último update (segundos)
  let pending = false;    // el navegador bloqueó el autoplay: se reintenta al desbloquear
  let opts = { volume: AX.mediaVolume, rate: {} }; // volumen y velocidad por sección del tema

  function init() {
    if (ctx) return ctx;
    const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctor) return null;
    try { ctx = new Ctor(); } catch { return null; }
    master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.32; musicGain.connect(comp);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.6; sfxGain.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function tone(freq, t, dur, { type = 'square', vol = 0.3, to = freq, out = sfxGain, attack = 0.005, vib = 0 } = {}) {
    if (!ctx || !freq) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 6; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, { vol = 0.3, freq = 3000, q = 1, type = 'bandpass', out = sfxGain, to } = {}) {
    if (!ctx) return;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur); f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + dur + 0.02);
  }

  function schedule() {
    if (!ctx || !song || muted) return;
    const stepDur = 60 / (song.bpm * tempo) / 4;
    while (nextTime < ctx.currentTime + 0.12) {
      const t = nextTime;
      if (leadLeft <= 0) { const [f, d] = song.lead[leadI % song.lead.length]; leadI++; leadLeft = d; if (f) { tone(f, t, stepDur * d * 0.95, { type: 'square', vol: 0.16, out: musicGain, vib: 3 }); tone(f * 2, t, stepDur * d * 0.6, { type: 'triangle', vol: 0.05, out: musicGain }); } }
      if (bassLeft <= 0) { const [f, d] = song.bass[bassI % song.bass.length]; bassI++; bassLeft = d; if (f) tone(f, t, stepDur * d * 0.9, { type: 'triangle', vol: 0.34, out: musicGain }); }
      const dr = song.drums[step % song.drums.length];
      if (dr === 'k') tone(150, t, 0.13, { type: 'sine', to: 45, vol: 0.55, out: musicGain });
      if (dr === 's') noise(t, 0.12, { vol: 0.22, freq: 1800, q: 0.7, out: musicGain });
      if (dr === 'h') noise(t, 0.04, { vol: 0.08, freq: 8000, type: 'highpass', out: musicGain });
      leadLeft--; bassLeft--; step++; nextTime += stepDur;
    }
  }

  function stopMedia(el, keep = false) {
    if (!el) return;
    try { el.pause(); } catch { /* sin audio */ }
    if (!keep) { try { el.currentTime = 0; } catch { /* sin audio */ } }
  }

  // ---------- Música con fichero (mp3 del tema)
  function applyVolume(m) {
    try { m.el.volume = clamp01(m.vol * m.maxVol); } catch { /* sin audio */ }
  }
  function setRate(m, rate) {
    m.rate = rate;
    try { m.el.playbackRate = rate; } catch { /* sin audio */ }
  }
  /** Velocidad del fichero: la del tema (p. ej. jefes) × el tempo pedido. */
  function rateFor(name, t) {
    const base = (opts.rate && opts.rate[name]) || 1;
    const r = base * (t || 1);
    return Math.min(AX.rateMax, Math.max(AX.rateMin, r));
  }
  /** Arranca el mp3 con fundido de entrada. Devuelve false si no hay Audio. */
  function playMedia(url, name, rate) {
    const Ctor = globalThis.Audio;
    if (typeof Ctor !== 'function') return false;
    let el;
    try { el = new Ctor(url); } catch { return false; }
    const m = { el, vol: 0, maxVol: opts.volume == null ? AX.mediaVolume : clamp01(opts.volume), rate: 1, name };
    try { el.loop = true; el.preload = 'auto'; el.muted = !!muted; } catch { /* sin audio */ }
    setRate(m, rate);
    applyVolume(m);
    if (typeof el.addEventListener === 'function') {
      // Si el fichero no carga, se cae a la música sintetizada (respaldo).
      el.addEventListener('error', () => onMediaError(m));
    }
    const p = el.play ? el.play() : null;
    if (p && typeof p.catch === 'function') p.catch(() => { pending = true; }); // autoplay bloqueado
    if (media) { fading.push(media); } // la anterior se apaga con fundido
    media = m;
    return true;
  }
  function onMediaError(m) {
    const i = fading.indexOf(m); if (i >= 0) fading.splice(i, 1);
    stopMedia(m.el);
    if (media !== m) return;
    media = null;
    startSynth(m.name, 1); // respaldo: melodía sintetizada del tema
  }
  /** Apaga con fundido la canción mp3 en curso (o todas). */
  function fadeMedia(m) {
    if (!m) return;
    if (m.vol > 0) fading.push(m); else stopMedia(m.el);
  }
  function startSynth(name, t) {
    songName = name; tempo = t; step = 0; leadI = 0; bassI = 0; leadLeft = 0; bassLeft = 0;
    song = songs[name] || null;
    if (ctx) nextTime = ctx.currentTime + 0.05;
  }
  /** Fundidos: entrada de la canción en curso y salida de las anteriores.
   *  `forced` es el paso de tiempo de las pruebas; en el juego se usa el reloj. */
  function tick(forced) {
    const t = nowSec();
    const dt = forced != null ? Math.max(0, forced)
      : lastTick ? Math.min(0.25, Math.max(0, t - lastTick)) : AX.fadeIn / 2;
    lastTick = t;
    if (media && media.vol < 1) { media.vol = Math.min(1, media.vol + dt / AX.fadeIn); applyVolume(media); }
    for (let i = fading.length - 1; i >= 0; i--) {
      const m = fading[i];
      m.vol = Math.max(0, m.vol - dt / AX.fadeOut);
      applyVolume(m);
      if (m.vol <= 0) { stopMedia(m.el); fading.splice(i, 1); }
    }
  }

  const api = {
    unlock() {
      init();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      // Autoplay bloqueado hasta el primer gesto: se arranca la canción ahora.
      if (pending && media) {
        pending = false;
        const p = media.el.play ? media.el.play() : null;
        if (p && typeof p.catch === 'function') p.catch(() => { pending = true; });
      }
    },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.55;
      for (const m of (media ? [media] : []).concat(fading)) { try { m.el.muted = muted; } catch { /* sin audio */ } }
      return muted;
    },
    // Fija las canciones y ficheros del tema activo (game.js al cambiar de tema).
    // opts: { volume: 0-1, rate: { sección: playbackRate } } del tema.
    setSongs(s, f, o) {
      songs = s || SONGS; files = f || null;
      opts = { volume: o && o.volume != null ? o.volume : AX.mediaVolume, rate: (o && o.rate) || {} };
      // La sección que está sonando se reaplica con la fuente nueva: al pasar de
      // Tumble Dog a Dieta de Marcos con el título sonando, el sintetizador se
      // calla y entra la canción (issue #95).
      if (songName) {
        const name = songName, t = tempo;
        songName = null; song = null;
        if (media) { fadeMedia(media); media = null; }
        api.music(name, t);
      }
    },
    music(name, t = 1) {
      const file = files && files[name] ? files[name] : null;
      if (file) {
        const rate = rateFor(name, t);
        if (media && media.name === name) { // misma pantalla: solo cambia la velocidad
          songName = name; tempo = t;
          if (Math.abs(media.rate - rate) > 0.001) setRate(media, rate);
          return;
        }
        songName = name; song = null; tempo = t; // manda el fichero del tema
        if (!playMedia(file, name, rate)) startSynth(name, t); // sin Audio: respaldo
        return;
      }
      if (songName === name && t === tempo && !media) return;
      if (media) { fadeMedia(media); media = null; }
      startSynth(name, t);
    },
    stopMusic() {
      song = null; songName = null;
      if (media) { fadeMedia(media); media = null; }
    },
    update(dt) {
      tick(dt);
      if (ctx && song && nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.02;
      schedule();
    },
    /** Estado de la música, para pruebas y depuración en el navegador. */
    info() {
      const el = media ? media.el : null;
      return {
        section: songName, source: media ? 'file' : (song ? 'synth' : null),
        file: media ? media.name : null, muted,
        rate: media ? media.rate : tempo,
        playing: media ? !el.paused : !!song,
        volume: media ? clamp01(media.vol * media.maxVol) : 0,
        time: el ? (el.currentTime || 0) : 0, // avance real de la canción (navegador)
      };
    },
    suck(on) {
      if (!ctx || muted) return;
      if (on && !suckNode) {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
        s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 3;
        l.frequency.value = 9; lg.gain.value = 500; l.connect(lg); lg.connect(f.frequency);
        g.gain.value = 0.0; g.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 0.08);
        s.connect(f); f.connect(g); g.connect(sfxGain); s.start(); l.start();
        suckNode = { s, l, g };
      } else if (!on && suckNode) {
        const n = suckNode; suckNode = null;
        n.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.06); n.s.stop(ctx.currentTime + 0.08); n.l.stop(ctx.currentTime + 0.08);
      }
    },
    sfx(name, k = 0) {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      switch (name) {
        case 'jump': tone(300, t, 0.14, { to: 700, vol: 0.2 }); break;
        case 'land': noise(t, 0.06, { vol: 0.12, freq: 400 }); break;
        case 'capture': tone(500, t, 0.12, { to: 1400, vol: 0.25, type: 'triangle' }); tone(900, t + 0.05, 0.1, { to: 1800, vol: 0.15 }); break;
        case 'shoot': noise(t, 0.25, { vol: 0.35, freq: 2500, to: 400, q: 2 }); tone(700, t, 0.2, { to: 160, vol: 0.25, type: 'sawtooth' }); break;
        case 'boing': tone(220, t, 0.18, { to: 520, vol: 0.25, type: 'sine', vib: 30 }); break;
        case 'kill': { const base = 520 * 2 ** (Math.min(k, 7) / 6); tone(base, t, 0.09, { vol: 0.25 }); tone(base * 1.25, t + 0.06, 0.09, { vol: 0.22 }); tone(base * 1.5, t + 0.12, 0.16, { vol: 0.22 }); noise(t, 0.12, { vol: 0.3, freq: 1200 }); break; }
        case 'shatter': noise(t, 0.4, { vol: 0.4, freq: 3000, to: 300 }); tone(880, t, 0.3, { to: 220, vol: 0.18, type: 'triangle' }); break;
        case 'coin': tone(988, t, 0.06, { vol: 0.2 }); tone(1319, t + 0.06, 0.18, { vol: 0.2 }); break;
        case 'gem': [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.045, 0.12, { vol: 0.16, type: 'triangle' })); break;
        case 'power': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.06, 0.14, { vol: 0.18 })); break;
        case 'letter': [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.05, 0.16, { vol: 0.18, type: 'triangle' })); break;
        case 'hurt': tone(600, t, 0.5, { to: 80, vol: 0.3, type: 'sawtooth' }); noise(t, 0.3, { vol: 0.3, freq: 600 }); break;
        case 'warn': tone(1200, t, 0.06, { vol: 0.15 }); break;
        case 'hurry': [880, 0, 880, 0, 880].forEach((f, i) => tone(f, t + i * 0.12, 0.1, { vol: 0.2 })); break;
        case 'shot': tone(400, t, 0.1, { to: 250, vol: 0.12 }); break;
        case 'bosshit': noise(t, 0.3, { vol: 0.5, freq: 500 }); tone(200, t, 0.3, { to: 60, vol: 0.4, type: 'square' }); break;
        case 'clear': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.09, 0.2, { vol: 0.2, type: i % 2 ? 'triangle' : 'square' })); break;
        case 'oneup': [659, 784, 1319, 1047, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.08, 0.14, { vol: 0.2 })); break;
        case 'gameover': [523, 494, 466, 440, 415, 392].forEach((f, i) => tone(f, t + i * 0.18, 0.3, { vol: 0.2, type: 'triangle' })); break;
        case 'start': [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.07, 0.15, { vol: 0.22 })); break;
        default: break;
      }
    },
  };
  return api;
}
