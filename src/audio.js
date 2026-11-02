// Música y efectos sintetizados con WebAudio (melodías originales, sin muestras).
// Se desbloquea en el primer gesto; en Node/headless es un no-op silencioso.
const NOTE = (n) => {
  if (!n || n === '-') return 0;
  const m = /^([A-G])(#?)(\d)$/.exec(n); if (!m) return 0;
  const k = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  return 440 * 2 ** ((k + (Number(m[3]) - 4) * 12 - 9) / 12);
};
const seq = (s) => s.trim().split(/\s+/).map((tok) => { const [n, d] = tok.split(':'); return [NOTE(n), Number(d || 1)]; });

// Canciones del tema «tumbledog»: lead, bajo y batería por semicorcheas. bpm en negras.
import { SONGS } from './themes/tumbledog.js';

export function createAudio() {
  let ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
  let muted = false, song = null, songName = null, step = 0, nextTime = 0, leadI = 0, leadLeft = 0, bassI = 0, bassLeft = 0, tempo = 1;
  let suckNode = null;
let musicEl = null; // <audio> para la canción MP3 del tema «marcos»

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

  const api = {
    unlock() {
      init(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (musicEl && (songName === 'title' || songName === 'bonus')) musicEl.play().catch(() => {});
    },
    get muted() { return muted; },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.55; if (musicEl) musicEl.volume = muted ? 0 : 0.32; return muted; },
    music(name, t = 1, themeId) {
      const esMusicaMP3 = themeId === 'marcos' && (name === 'title' || name === 'bonus');
      // Si ya suena la misma canción, no se reinicia (salvo la MP3, que se controla por musicEl).
      if (!esMusicaMP3 && name === songName && t === tempo && song) return;
      if (esMusicaMP3 && name === songName && musicEl) return;
      // Detener la canción anterior (sintetizada o MP3).
      song = null; songName = null;
      if (musicEl) { musicEl.pause(); musicEl.src = ''; musicEl = null; }
      songName = name; song = null; tempo = t; step = 0; leadI = 0; bassI = 0; leadLeft = 0; bassLeft = 0;
      // Tema «marcos»: título y ronda bonus suenan con la canción MP3 aportada.
      if (esMusicaMP3 && typeof Audio !== 'undefined') {
        const el = new Audio('assets/audio/dieta-de-marcos.mp3');
        el.loop = true;
        el.volume = muted ? 0 : 0.32;
        el.play().catch(() => {}); // se reintenta al desbloquear el audio tras el primer gesto
        musicEl = el;
        return;
      }
      song = SONGS[name] || null;
      if (ctx) nextTime = ctx.currentTime + 0.05;
    },
    stopMusic() { song = null; songName = null; if (musicEl) { musicEl.pause(); musicEl.src = ''; musicEl = null; } },
    update() { if (ctx && song && nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.02; schedule(); },
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
