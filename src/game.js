// Estados del juego, reglas, colisiones y orden de dibujo.
import { W, H, FLOOR_Y, CONFIG } from './config.js';
import { createBackground, renderPlatforms } from './background.js';
import { createFx, FONT, outlinedText, burst } from './fx.js';
import { createPlayer, respawnPlayer, updatePlayer, drawPlayer, drawHeld, nozzle } from './player.js';
import { createEnemy, updateEnemy, drawEnemy, killEnemy, updateShot, drawShot, TYPE_KEYS } from './enemies.js';
import { createBall, updateBall, drawBall } from './ball.js';
import { createItem, updateItem, drawItem, randomItemKind, ITEM_KINDS, createLetter, updateLetter, drawLetter } from './items.js';
import { createBoss, updateBoss, drawBoss, bossBox, hitBoss, createChaser, updateChaser, drawChaser, chaserHits } from './boss.js';
import { drawHud, drawVignette } from './hud.js';
import { drawSprite } from './sprites.js';
import { groundBelow } from './physics.js';
import { rand, pick, clamp, lerp, overlap, easeOutBack, hsl } from './util.js';
import { getTheme, DEFAULT_THEME_ID, listThemes } from './themes/index.js';

const V = CONFIG.vacuum;

function loadHi() { try { return Number(globalThis.localStorage?.getItem('tumbledog-hi')) || 0; } catch { return 0; } }
function saveHi(v) { try { globalThis.localStorage?.setItem('tumbledog-hi', String(v)); } catch { /* sin almacenamiento */ } }

export function createGame({ input, audio, themeId = DEFAULT_THEME_ID }) {
  const bg = createBackground();
  const fx = createFx();
  let dark = null;
  if (typeof document !== 'undefined') { dark = document.createElement('canvas'); dark.width = W; dark.height = H; }

  const t0 = getTheme(themeId);
  let THEME = t0.theme;
  let STAGES = t0.stages;

  const g = {
    state: 'title', stateT: 0, time: 0, score: 0, shownScore: 0, hi: loadHi(), lives: CONFIG.player.lives, nextLife: CONFIG.player.extraLifeEvery,
    gameSel: 0, themeId: themeId,
    stageIndex: 0, loop: 0, stage: STAGES[0], plats: STAGES[0].plats, platLayer: null,
    player: createPlayer(), enemies: [], balls: [], shots: [], items: [], letterBubbles: [], letters: new Set(), letterPop: new Array(9).fill(0),
    boss: null, chaser: null, stageT: 0, hurried: false, freeze: 0, paused: false, bonusPending: false, trans: null, warnT: 0, tutorial: 0,
    parade: TYPE_KEYS.map((k, i) => ({ type: k, x: -120 - i * 150 })),
  };
  bg.setTheme('manana');

  // ---------- Flujo
  function startTransition(cb) { g.trans = { t: 0, dur: 0.45, phase: 'out', cb }; }

  function newGame(selThemeId) {
    if (selThemeId && selThemeId !== g.themeId) {
      const t = getTheme(selThemeId);
      THEME = t.theme; STAGES = t.stages; g.themeId = selThemeId;
    }
    Object.assign(g, { score: 0, shownScore: 0, lives: CONFIG.player.lives, nextLife: CONFIG.player.extraLifeEvery, stageIndex: 0, loop: 0, letters: new Set() });
    g.player = createPlayer();
    audio.sfx('start');
    startStage(0);
  }

  function difficulty() { return 1 + g.loop * 0.18 + g.stageIndex * 0.025; }

  function startStage(i, bonus = false) {
    g.stageIndex = i; g.stage = STAGES[i];
    const theme = bonus ? 'mediodia' : g.stage.theme;
    bg.setTheme(theme);
    g.plats = bonus ? STAGES[0].plats : g.stage.plats;
    g.platLayer = renderPlatforms(g.plats, theme);
    g.enemies = []; g.balls = []; g.shots = []; g.items = []; g.letterBubbles = []; g.boss = null; g.chaser = null;
    g.stageT = 0; g.hurried = false; g.freeze = 0; fx.clear();
    const p = g.player; respawnPlayer(p); p.invul = 2.2; p.x = 120; p.y = FLOOR_Y - p.h; p.onGround = true;
    if (bonus) { g.state = 'bonus'; g.stateT = 0; audio.music('bonus'); return; }
    if (!g.stage.boss) {
      g.stage.foes.forEach(([type, x, y], k) => g.enemies.push(createEnemy(type, x, y, { enter: true, delay: 0.35 + k * 0.28, speedMul: 1 })));
    } else {
      g.boss = createBoss(g.stage.boss);
      g.boss.maxHp = g.boss.hp = Math.round(g.boss.hp * (1 + g.loop * 0.3));
    }
    g.state = 'intro'; g.stateT = 0;
    g.tutorial = i === 0 && g.loop === 0 ? 7 : 0;
    audio.music(g.stage.boss ? 'boss' : 'stage');
  }

  function nextStage() {
    if (g.bonusPending) { g.bonusPending = false; startTransition(() => startStage(g.stageIndex, true)); return; }
    const n = g.stageIndex + 1;
    if (n >= STAGES.length) { startTransition(() => { g.state = 'ending'; g.stateT = 0; bg.setTheme('noche'); audio.music('title'); }); return; }
    startTransition(() => startStage(n));
  }

  function addScore(v, x, y, color = '#ffe14d', size = 30) {
    g.score += v;
    if (x !== undefined) fx.text(x, y, '+' + v, { size, color, life: 0.9 });
    if (g.score >= g.nextLife) { g.nextLife += CONFIG.player.extraLifeEvery; gainLife(); }
    if (g.score > g.hi) { g.hi = g.score; }
  }
  function gainLife() { g.lives++; audio.sfx('oneup'); fx.text(g.player.x + 20, g.player.y - 40, THEME.juice.oneup, { size: 52, color: '#7dff8a', burst: true, life: 1.4 }); }

  // ---------- Jugador herido
  function hurt() {
    const p = g.player;
    if (!p.alive || p.invul > 0 || g.state !== 'play') return;
    p.alive = false; p.vy = -950; p.vx = -p.facing * 160; p.hurtT = 0;
    releaseHeld(p);
    g.lives--;
    fx.shake(0.7); fx.flash(0.45, '#ff2a4a'); fx.stop(0.18); fx.stars(p.x + p.w / 2, p.y + 20, 12);
        fx.text(p.x + p.w / 2, p.y - 20, pick(THEME.hurtMessages), { size: 48, burst: true, life: 1.2 });
    audio.sfx('hurt'); audio.suck(false);
    g.deadT = 0;
  }

  function releaseHeld(p) {
    p.held.forEach((type, i) => {
      const e = createEnemy(type, p.x + p.w / 2 + (i % 2 ? 40 : -40), p.y + p.h, { dir: i % 2 ? 1 : -1, vy: -700, speedMul: 1 });
      e.state = 'walk'; e.stun = 0.8; e.vx = (i % 2 ? 1 : -1) * 200; g.enemies.push(e);
    });
    p.held = []; p.heldT = 0;
  }

  // ---------- Aspiradora
  function inCone(p, cx, cy, range) {
    const n = nozzle(p);
    const dx = (cx - n.x) * p.facing;
    if (dx < -20 || dx > range) return null;
    const half = lerp(V.halfStart, V.halfEnd, clamp(dx / range, 0, 1));
    if (Math.abs(cy - n.y) > half + 30) return null;
    return { dx, n };
  }

  function vacuum(dt) {
    const p = g.player;
    const on = p.alive && p.sucking && (g.state === 'play' || g.state === 'bonus' || g.state === 'clear');
    audio.suck(on);
    for (const e of g.enemies) if (!on || e.state !== 'walk') { if (e.beam) { e.beam = false; e.stun = CONFIG.enemy.stunAfterBeam; } }
    if (!on) return;
    const range = p.pow > 0 ? V.rangePow : V.range;
    const n = nozzle(p);
    for (let i = 0; i < 3; i++) {
      const d = rand(30, range), a = rand(-1, 1) * lerp(V.halfStart, V.halfEnd, d / range);
      fx.suck(n.x + p.facing * d, n.y + a, n.x, n.y);
    }
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      if (e.state !== 'walk') continue;
      const hit = inCone(p, e.x + e.w / 2, e.y + e.h / 2, range);
      if (!hit) { if (e.beam) { e.beam = false; e.stun = CONFIG.enemy.stunAfterBeam; } continue; }
      e.beam = true;
      e.suck += (dt / (V.pullTime * e.t.res)) * (1.4 - hit.dx / range * 0.6);
      e.x -= p.facing * 80 * dt * (0.4 + e.suck);
      if (e.suck >= 1 && p.held.length < V.maxHeld) {
        g.enemies.splice(i, 1);
        p.held.push(e.type);
        if (p.held.length === 1) p.heldT = 0;
        fx.spark(n.x, n.y, 14, { hue: rand(0, 360) }); fx.ring(n.x, n.y, '#ffffff', 70, 0.3);
        fx.text(n.x, n.y - 50, THEME.juice.capture, { size: 30, color: '#9fe7ff', life: 0.6 });
        audio.sfx('capture'); fx.shake(0.12);
      }
    }
    for (const it of g.items) {
      if (inCone(p, it.x + it.w / 2, it.y + it.h / 2, range)) { it.onGround = false; it.vx = (n.x - it.x) * 6; it.vy = (n.y - it.y) * 6; }
    }
  }

  function shoot() {
    const p = g.player;
    const n = nozzle(p);
    const b = createBall(n.x + p.facing * 20, n.y - 6, p.facing, p.held);
    b.y = Math.min(b.y, p.y + p.h - b.r);
    g.balls.push(b);
    p.held = []; p.heldT = 0; p.vx -= p.facing * 220;
    fx.ring(n.x, n.y, '#ffe14d', 90, 0.35, 8); fx.spark(n.x, n.y, 18, { hue: 50 }); fx.shake(0.22);
    audio.sfx('shoot');
  }

  function dropLoot(x, y, chain) {
    g.items.push(createItem(randomItemKind(chain), x, y));
    if (Math.random() < CONFIG.letters.dropChance + chain * 0.05) {
      const missing = [...CONFIG.letters.word].map((c, i) => i).filter((i) => !g.letters.has(i) && !g.letterBubbles.some((l) => l.i === i));
      if (missing.length) { const i = pick(missing); const l = createLetter(CONFIG.letters.word[i], x, y - 40); l.i = i; g.letterBubbles.push(l); }
    }
  }

  function killByBall(e, b) {
    b.chain++;
    const v = CONFIG.ball.chain[Math.min(b.chain - 1, CONFIG.ball.chain.length - 1)] * (1 + g.loop);
    killEnemy(e, b.dir);
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    fx.stop(0.05 + Math.min(0.06, b.chain * 0.01)); fx.shake(0.22 + b.chain * 0.05);
    fx.stars(cx, cy, 8 + b.chain * 2); fx.spark(cx, cy, 16, { hue: (b.chain * 50) % 360 }); fx.confetti(cx, cy, 10 + b.chain * 6);
    fx.word(cx + rand(-30, 30), cy - 50, 44 + b.chain * 4);
    addScore(v, cx, cy - 100, hsl(50 + b.chain * 40, 100, 65), 30 + b.chain * 5);
    if (b.chain >= 2) fx.text(clamp(cx, 200, W - 200), Math.max(150, cy - 160), `¡COMBO x${b.chain}!`, { size: 50 + b.chain * 6, color: hsl(b.chain * 60, 100, 65), burst: true, life: 1.1, vy: -30 });
    audio.sfx('kill', b.chain);
    dropLoot(cx, cy, b.chain);
  }

  function shatter(b) {
    fx.stars(b.x, b.y, 18, { max: 620, size: 18 }); fx.spark(b.x, b.y, 30); fx.ring(b.x, b.y, '#fff', b.r * 2.6, 0.4, 8);
    fx.text(b.x, b.y - 30, THEME.juice.shatter, { size: 50, burst: true, life: 0.8, color: '#fff35c' });
    fx.shake(0.3); audio.sfx('shatter');
    if (b.chain >= 3) for (let i = 0; i < b.chain - 1; i++) g.items.push(createItem(pick(['gemB', 'gemR', 'gemG']), b.x, b.y));
    b.alive = false;
  }

  function collect(it) {
    const d = ITEM_KINDS[it.kind];
    const cx = it.x + it.w / 2, cy = it.y;
    if (d.power === 'speed') { g.player.speedUp = 12; fx.text(cx, cy - 20, '¡TURBO!', { size: 40, burst: true }); audio.sfx('power'); }
    else if (d.power === 'pow') { g.player.pow = 15; fx.text(cx, cy - 20, '¡SUPERASPIRADORA!', { size: 36, burst: true }); audio.sfx('power'); }
    else if (d.power === 'freeze') { g.freeze = 6; fx.text(cx, cy - 20, '¡PAUSA PARLAMENTARIA!', { size: 34, burst: true }); fx.flash(0.4, '#9ff'); audio.sfx('power'); }
    else if (d.power === 'life') { gainLife(); }
    else audio.sfx(it.kind === 'coin' ? 'coin' : 'gem');
    addScore(d.value, cx, cy - 10, '#fff', 24);
    fx.spark(cx, cy + 10, 10, { hue: 50, max: 260 });
  }

  // ---------- Bucle de juego
  function updatePlay(dt) {
    const p = g.player;
    g.stageT += dt;
    g.freeze = Math.max(0, g.freeze - dt);
    p.pow = Math.max(0, p.pow - dt);
    g.tutorial = Math.max(0, g.tutorial - dt);
    const ev = updatePlayer(p, dt, input, g.plats, fx);
    if (ev.jumped) audio.sfx('jump');
    if (ev.landed) audio.sfx('land');
    if (ev.shoot) shoot();
    vacuum(dt);
    // Enemigos aspirados que se escapan
    if (p.alive && p.held.length) {
      g.warnT -= dt;
      if (p.heldT > V.warnAt && g.warnT <= 0) { g.warnT = 0.22; audio.sfx('warn'); }
      if (p.heldT > V.burstAt) { fx.text(p.x + p.w / 2, p.y - 60, THEME.juice.escape, { size: 40, burst: true }); hurt(); }
    }
    const ectx = { plats: g.plats, player: p, shots: g.shots, fx, freeze: g.freeze, difficulty: difficulty(), calm: g.stageIndex === 0 && g.loop === 0 };
    const living = g.enemies.filter((e) => e.state !== 'dead');
    if (!g.stage.boss && living.length === 1 && g.state === 'play' && !living[0].angry && living[0].state === 'walk') { living[0].angry = true; fx.text(living[0].x + 20, living[0].y - 30, '¡GRRR!', { size: 34, color: '#ff6b6b' }); }
    for (const e of g.enemies) {
      const before = g.shots.length;
      updateEnemy(e, dt, ectx);
      if (g.shots.length > before) audio.sfx('shot');
    }
    g.enemies = g.enemies.filter((e) => !e.gone);
    // Jefe
    if (g.boss) {
      updateBoss(g.boss, dt, {
        player: p, shots: g.shots, fx,
        spawnMinion: (type, x, y, vx, vy) => { const e = createEnemy(type, x, y + 86, { dir: -1, vy, thrown: true }); e.vx = vx; e.state = 'walk'; g.enemies.push(e); },
      });
      if (g.boss.dead && g.state === 'play') { addScore(20000 * (1 + g.loop), g.boss.x, g.boss.y - 200, '#ffe14d', 60); for (const e of g.enemies) if (e.state !== 'dead') killEnemy(e, 1); }
    }
    // Bolas
    for (const b of g.balls) {
      const r = updateBall(b, dt, g.plats);
      fx.trail(b.x, b.y, b.r, b.hue);
      if (r === 'wall') { audio.sfx('boing'); fx.dust(b.x + b.dir * b.r, b.y + b.r, 6, b.dir); fx.shake(0.12); fx.text(b.x, b.y - b.r - 20, THEME.juice.wall, { size: 28, color: '#9fe7ff', life: 0.5 }); }
      if (r === 'land') { fx.dust(b.x, b.y + b.r, 8); fx.shake(0.15); }
      if (r === 'shatter') { shatter(b); continue; }
      for (const e of g.enemies) {
        if (e.state === 'dead' || (e.state === 'enter' && e.enterDelay > 0)) continue;
        const cx = clamp(b.x, e.x, e.x + e.w), cy = clamp(b.y, e.y, e.y + e.h);
        if ((cx - b.x) ** 2 + (cy - b.y) ** 2 < b.r * b.r) killByBall(e, b);
      }
      if (g.boss && !g.boss.dying && b.alive) {
        const bb = bossBox(g.boss);
        const cx = clamp(b.x, bb.x, bb.x + bb.w), cy = clamp(b.y, bb.y, bb.y + bb.h);
        if ((cx - b.x) ** 2 + (cy - b.y) ** 2 < b.r * b.r) { hitBoss(g.boss, b.held.length + b.chain, fx); audio.sfx('bosshit'); addScore(500, b.x, b.y - 60); shatter(b); }
      }
    }
    g.balls = g.balls.filter((b) => b.alive);
    // Disparos enemigos
    g.shots = g.shots.filter((s) => updateShot(s, dt));
    // Premios y letras
    g.items = g.items.filter((it) => updateItem(it, dt, g.plats));
    g.letterBubbles = g.letterBubbles.filter((l) => updateLetter(l, dt));
    if (p.alive) {
      const pb = { x: p.x + 8, y: p.y + 10, w: p.w - 16, h: p.h - 14 };
      for (let i = g.items.length - 1; i >= 0; i--) if (overlap(pb, g.items[i])) { collect(g.items[i]); g.items.splice(i, 1); }
      for (let i = g.letterBubbles.length - 1; i >= 0; i--) {
        const l = g.letterBubbles[i];
        if (overlap(pb, { x: l.x - l.r, y: l.y - l.r, w: l.r * 2, h: l.r * 2 })) {
          g.letterBubbles.splice(i, 1); g.letters.add(l.i); g.letterPop[l.i] = 1;
          audio.sfx('letter'); addScore(500, l.x, l.y - 20, '#ffffff'); fx.ring(l.x, l.y, hsl(g.time * 200, 100, 70), 80, 0.4, 6);
          if (g.letters.size === CONFIG.letters.word.length) { g.bonusPending = true; fx.text(W / 2, 300, '¡TUMBLE DOG!', { size: 90, burst: true, life: 2, color: '#fff35c' }); fx.confetti(W / 2, 300, 80, 2); audio.sfx('oneup'); }
        }
      }
      if (p.invul <= 0 && g.state === 'play') {
        for (const e of g.enemies) {
          if (e.state !== 'walk' || e.beam || e.stun > 0 || g.freeze > 0) continue;
          if (overlap(pb, { x: e.x + 10, y: e.y + 12, w: e.w - 20, h: e.h - 16 })) { hurt(); break; }
        }
        for (const s of g.shots) if (p.alive && overlap(pb, { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 })) hurt();
        if (g.boss && !g.boss.dying && p.alive && overlap(pb, bossBox(g.boss))) hurt();
        if (g.chaser && p.alive && chaserHits(g.chaser, p)) hurt();
      }
    }
    // Prisa y perseguidor
    if (!g.stage.boss && g.state === 'play') {
      if (!g.hurried && g.stageT > CONFIG.stage.hurryAt) {
        g.hurried = true; audio.sfx('hurry'); audio.music('stage', 1.3);
        fx.text(W / 2, 330, THEME.hud.datePrisa, { size: 80, burst: true, life: 1.6, color: '#ff6b6b' });
        for (const e of g.enemies) e.angry = true;
      }
      if (!g.chaser && g.stageT > CONFIG.stage.chaserAt) { g.chaser = createChaser(); fx.text(W / 2, 260, THEME.juice.chaser, { size: 70, burst: true, life: 2, color: '#c9a3ff' }); fx.flash(0.5, '#6a2cff'); }
    }
    if (g.chaser) updateChaser(g.chaser, dt, p);
    // Muerte y reaparición
    if (!p.alive) {
      g.deadT += dt;
      if (g.deadT > 1.7) {
        if (g.lives > 0) { respawnPlayer(p); audio.music(g.stage.boss ? 'boss' : 'stage', g.hurried ? 1.3 : 1); }
        else { g.state = 'gameover'; g.stateT = 0; audio.stopMusic(); audio.sfx('gameover'); if (g.score >= g.hi) saveHi(g.hi); }
      }
    }
    // ¿Fase limpia?
    if (g.state === 'play' && p.alive) {
      const left = g.enemies.some((e) => e.state !== 'dead');
      const bossLeft = g.boss && !g.boss.dead;
      if (!left && !bossLeft) {
        g.state = 'clear'; g.stateT = 0; g.chaser = null;
        const bonus = g.stage.boss ? 0 : Math.max(0, Math.round((CONFIG.stage.hurryAt - g.stageT) * 100 / 10) * 10);
        g.clearBonus = bonus; if (bonus) addScore(bonus);
        fx.confetti(W / 2, 200, 120, 2.2); fx.flash(0.3); audio.sfx('clear'); audio.stopMusic();
        if (p.held.length) { p.held = []; p.heldT = 0; }
      }
    }
  }

  function updateBonus(dt) {
    const p = g.player;
    updatePlayer(p, dt, input, g.plats, fx);
    vacuum(dt);
    if (g.stateT < CONFIG.bonus.time && Math.random() < dt / CONFIG.bonus.rain * 0.1 * 10) {
      const it = createItem(Math.random() < 0.3 ? pick(['gemB', 'gemR', 'gemG']) : 'coin', rand(60, W - 60), -20);
      it.vy = rand(0, 200); it.vx = rand(-60, 60); g.items.push(it);
    }
    g.items = g.items.filter((it) => updateItem(it, dt, g.plats));
    const pb = { x: p.x + 4, y: p.y + 4, w: p.w - 8, h: p.h - 6 };
    for (let i = g.items.length - 1; i >= 0; i--) if (overlap(pb, g.items[i])) { collect(g.items[i]); g.items.splice(i, 1); }
    if (g.stateT >= CONFIG.bonus.time + 1.5 && !g.trans) {
      g.letters = new Set(); gainLife();
      const n = g.stageIndex + 1;
      if (n >= STAGES.length) startTransition(() => { g.state = 'ending'; g.stateT = 0; bg.setTheme('noche'); });
      else startTransition(() => startStage(n));
    }
  }

  function update(dt) {
    input.update();
    audio.update();
    if (input.pressed.mute) audio.toggleMute();
    if (g.trans) {
      g.trans.t += dt;
      if (g.trans.t >= g.trans.dur) {
        if (g.trans.phase === 'out') { g.trans.phase = 'in'; g.trans.t = 0; g.trans.cb(); } else g.trans = null;
      }
    }
    if (input.pressed.pause && ['play', 'intro', 'clear', 'bonus'].includes(g.state)) { g.paused = !g.paused; audio.suck(false); }
    if (g.paused) return;
    g.time += dt; g.stateT += dt;
    bg.update(dt);
    fx.update(dt);
    if (fx.hitstop > 0) return;
    const any = input.takeAny();
    switch (g.state) {
      case 'title':
        for (const d of g.parade) { d.x += 110 * dt; if (d.x > W + 140) d.x -= TYPE_KEYS.length * 150 + 140; }
        const nTemas = listThemes().length;
        if (input.pressed.left) { g.gameSel = (g.gameSel - 1 + nTemas) % nTemas; }
        else if (input.pressed.right) { g.gameSel = (g.gameSel + 1) % nTemas; }
        if ((input.pressed.jump || input.pressed.start || input.pressed.shoot || (any && input.touch)) && g.stateT > 0.6 && !g.trans) { audio.unlock(); startTransition(() => newGame(listThemes()[g.gameSel].id)); }
        else if (any) audio.unlock();
        if (g.stateT > 0.1 && !g.titleMusic) { g.titleMusic = true; audio.music('title'); }
        break;
      case 'intro':
        for (const e of g.enemies) updateEnemy(e, dt, { plats: g.plats, player: g.player, shots: [], fx, freeze: 0, difficulty: 1 });
        updatePlayer(g.player, dt, { held: { ...input.held, suck: false, shoot: false }, pressed: { ...input.pressed, shoot: false } }, g.plats, fx);
        if (g.stateT > CONFIG.stage.introTime) g.state = 'play';
        break;
      case 'play': updatePlay(dt); break;
      case 'clear':
        updatePlay(dt);
        if (g.stateT > CONFIG.stage.clearDelay + 1.2 && !g.trans) nextStage();
        break;
      case 'bonus': updateBonus(dt); break;
      case 'gameover':
        if (g.stateT > 1.5 && (input.pressed.jump || input.pressed.start || (any && input.touch)) && !g.trans) {
          startTransition(() => { g.lives = CONFIG.player.lives; g.score = 0; g.shownScore = 0; g.player = createPlayer(); startStage(g.stageIndex); });
        }
        if (g.stateT > 12 && !g.trans) startTransition(() => { g.state = 'title'; g.stateT = 0; g.titleMusic = false; bg.setTheme('manana'); });
        break;
      case 'ending':
        if (Math.random() < dt * 4) fx.confetti(rand(200, W - 200), -10, 20, 1);
        if (g.stateT > 3 && (input.pressed.jump || input.pressed.start || (any && input.touch)) && !g.trans) { saveHi(g.hi); startTransition(() => { g.loop++; startStage(0); }); }
        break;
      default: break;
    }
  }

  // ---------- Dibujo
  function shadow(ctx, cx, y, w) {
    const pl = groundBelow(cx, y, g.plats);
    if (!pl) return;
    const k = clamp(1 - (pl.y - y) / 400, 0.25, 1);
    ctx.fillStyle = `rgba(15,5,35,${0.32 * k})`;
    ctx.beginPath(); ctx.ellipse(cx, pl.y + 2, w * 0.55 * k, 7 * k, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawBeam(ctx) {
    const p = g.player;
    if (!p.alive || !p.sucking || !['play', 'bonus', 'clear'].includes(g.state)) return;
    const range = p.pow > 0 ? V.rangePow : V.range;
    const n = nozzle(p);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.translate(n.x, n.y); ctx.scale(p.facing, 1);
    const gr = ctx.createLinearGradient(0, 0, range, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.4, hsl(g.time * 300, 100, 70, 0.28)); gr.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(0, -V.halfStart * 0.5); ctx.lineTo(range, -V.halfEnd); ctx.lineTo(range, V.halfEnd); ctx.lineTo(0, V.halfStart * 0.5); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      const k = 1 - ((g.time * 2.2 + i / 5) % 1);
      const x = k * range, hh = lerp(V.halfStart * 0.5, V.halfEnd, k);
      ctx.strokeStyle = hsl(g.time * 400 + i * 70, 100, 65, 0.75 * (1 - k * 0.6));
      ctx.beginPath(); ctx.ellipse(x, 0, 8 + k * 10, hh, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawWorld(ctx) {
    const t = g.time;
    bg.draw(ctx, t);
    if (g.platLayer && g.state !== 'title') ctx.drawImage(g.platLayer, 0, 0);
    const p = g.player;
    if (g.state !== 'title' && g.state !== 'ending') {
      for (const e of g.enemies) if (e.state !== 'dead' && !(e.state === 'enter' && e.enterDelay > 0)) shadow(ctx, e.x + e.w / 2, e.y + e.h, e.w);
      if (p.alive) shadow(ctx, p.x + p.w / 2, p.y + p.h, p.w);
      for (const b of g.balls) shadow(ctx, b.x, b.y + b.r, b.r * 1.6);
      for (const it of g.items) drawItem(ctx, it, t);
      fx.drawBack(ctx);
      if (g.boss) drawBoss(ctx, g.boss, t);
      for (const e of g.enemies) drawEnemy(ctx, e, t);
      if (g.freeze > 0) for (const e of g.enemies) if (e.state === 'walk') { ctx.fillStyle = 'rgba(160,240,255,0.25)'; ctx.fillRect(e.x - 4, e.y - 4, e.w + 8, e.h + 8); }
      drawBeam(ctx);
      drawPlayer(ctx, p, t);
      drawHeld(ctx, p, t);
      for (const b of g.balls) drawBall(ctx, b, t);
      for (const s of g.shots) drawShot(ctx, s, t);
    }
    fx.draw(ctx);
    for (const l of g.letterBubbles) drawLetter(ctx, l, t);
    if (g.chaser) drawChaser(ctx, g.chaser, t);
    // Noche: luz alrededor del jugador, bolas y letras
    const night = bg.nightLevel();
    if (night > 0 && dark) {
      const d = dark.getContext('2d');
      d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
      d.fillStyle = `rgba(6,8,34,${night})`; d.fillRect(0, 0, W, H);
      d.globalCompositeOperation = 'destination-out';
      const light = (x, y, r, a = 1) => { const gr = d.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gr; d.fillRect(x - r, y - r, r * 2, r * 2); };
      if (g.state !== 'title') light(p.x + p.w / 2, p.y + 40, 260);
      for (const b of g.balls) light(b.x, b.y, 230);
      for (const l of g.letterBubbles) light(l.x, l.y, 100, 0.7);
      for (const s of g.shots) light(s.x, s.y, 90, 0.6);
      if (g.boss) light(g.boss.x, g.boss.y - 120, 300, 0.8);
      light(640, 300, 520, 0.35);
      ctx.drawImage(dark, 0, 0);
    }
  }

  function banner(ctx, title, sub, k, hue = 45) {
    const s = easeOutBack(clamp(k, 0, 1));
    ctx.save(); ctx.translate(W / 2, 300); ctx.scale(s, s); ctx.rotate(-0.04);
    burst(ctx, 420, 120, hue, g.time);
    outlinedText(ctx, title, 0, -14, 84, '#ffffff');
    if (sub) outlinedText(ctx, sub, 0, 58, 34, '#fff35c');
    ctx.restore();
  }

  function drawTitle(ctx) {
    const t = g.time;
    for (const d of g.parade) drawSprite(ctx, d.type + (Math.floor(t * 6 + d.x) % 2 ? '-walkA' : '-walkB'), d.x, FLOOR_Y, { s: 0.42 });
    ctx.fillStyle = 'rgba(20,10,50,0.35)'; ctx.fillRect(0, 0, W, H);
    drawSprite(ctx, 'portrait-presi', 230, 560, { s: 1, rot: Math.sin(t * 2) * 0.04 });
    drawSprite(ctx, 'presi-suck', 1060, FLOOR_Y, { s: 0.85, flip: true, sy: 1 + Math.sin(t * 4) * 0.02 });
    const word = THEME.title;
    ctx.font = `132px ${FONT}`;
    const widths = [...word].map((ch) => (ch === ' ' ? 44 : ctx.measureText(ch).width + 6));
    let x = W / 2 - widths.reduce((a, b) => a + b, 0) / 2;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (ch === ' ') { x += widths[i]; continue; }
      x += widths[i] / 2;
      const y = 170 + Math.sin(t * 4 + i * 0.6) * 14;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3 + i) * 0.08);
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowOffsetY = 8;
      outlinedText(ctx, ch, 0, 0, 132, hsl(t * 90 + i * 36, 95, 60), '#1a1030');
      ctx.restore();
      x += widths[i] / 2;
    }
    outlinedText(ctx, THEME.tagline, W / 2, 270, 32, '#ffffff');
    const temas = listThemes();
    const nTemas = temas.length;
    const sel = temas[g.gameSel];
    const selX = W / 2;
    outlinedText(ctx, 'JUEGO', selX - 140, 300, 24, '#ffb3d9');
    const arrows = nTemas > 1 ? ((g.gameSel === 0 ? '' : '← ') + sel.theme.title + (g.gameSel === nTemas - 1 ? '' : ' →')) : sel.theme.title;
    outlinedText(ctx, arrows, selX, 300, 40, '#ffe14d');
    if (Math.floor(t * 2) % 2 === 0) outlinedText(ctx, input.touch ? THEME.titleScreen.startTouch : THEME.titleScreen.startKeyboard, W / 2, 360, 46, '#fff35c');
    ctx.save(); ctx.fillStyle = 'rgba(20,10,50,0.7)'; ctx.beginPath(); ctx.roundRect(W / 2 - 290, 410, 580, 120, 18); ctx.fill(); ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    outlinedText(ctx, `${THEME.titleScreen.move}    ${THEME.titleScreen.jump}    ${THEME.titleScreen.down}`, W / 2, 440, 22, '#fff');
    outlinedText(ctx, `${THEME.titleScreen.suck}    ${THEME.titleScreen.shoot}`, W / 2, 474, 22, '#9fe7ff');
    outlinedText(ctx, `${THEME.titleScreen.lettersHint}   ·   ${THEME.titleScreen.mute}   ·   ${THEME.titleScreen.pause}`, W / 2, 508, 18, '#ffb3d9');
    outlinedText(ctx, THEME.hud.record + ' ' + String(g.hi).padStart(7, '0'), W / 2, 590, 28, '#ffb3d9');
    outlinedText(ctx, THEME.titleScreen.parody, W / 2, 700, 16, 'rgba(255,255,255,0.7)');
  }

  function render(ctx) {
    const o = fx.offset();
    ctx.save();
    ctx.translate(W / 2 + o.x, H / 2 + o.y); ctx.rotate(o.r); ctx.translate(-W / 2, -H / 2);
    drawWorld(ctx);
    fx.drawTexts(ctx);
    ctx.restore();
    if (g.state === 'title') drawTitle(ctx);
    else if (g.state !== 'ending') drawHud(ctx, g, g.time);
    if (g.tutorial > 0 && g.state === 'play' && g.player.alive) {
      const p = g.player; const a = Math.min(1, g.tutorial);
      ctx.save(); ctx.globalAlpha = a;
      const msg = input.touch ? 'MANTÉN ASPIRA · LUEGO LANZA' : 'MANTÉN X PARA ASPIRAR · Z PARA LANZAR';
      ctx.font = `24px ${FONT}`;
      const tw = ctx.measureText(msg).width + 44;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 4;
      const bx = clamp(p.x + p.w / 2, tw / 2 + 10, W - tw / 2 - 10), by = p.y - 70;
      ctx.beginPath(); ctx.roundRect(bx - tw / 2, by - 26, tw, 46, 20); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1a1030'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(msg, bx, by - 2);
      ctx.restore();
    }
    if (g.state === 'intro') banner(ctx, g.stage.boss ? THEME.banner.jefe : `FASE ${g.stageIndex + 1}`, g.stage.name, g.stateT / 0.4, g.stage.boss ? 350 : 45);
    if (g.state === 'clear' && g.stateT < CONFIG.stage.clearDelay + 1.2) banner(ctx, THEME.banner.faseLimpia, g.clearBonus ? `BONUS TIEMPO +${g.clearBonus}` : THEME.banner.adios, g.stateT / 0.4, 140);
    if (g.state === 'bonus') {
      outlinedText(ctx, THEME.banner.bonus, W / 2, 140, 70, hsl(g.time * 120, 95, 62));
      outlinedText(ctx, `${THEME.banner.cogeTodo} ${Math.max(0, Math.ceil(CONFIG.bonus.time - g.stateT))}`, W / 2, 200, 40, '#fff');
    }
    if (g.state === 'gameover') {
      ctx.fillStyle = 'rgba(10,0,30,0.55)'; ctx.fillRect(0, 0, W, H);
      const k = easeOutBack(clamp(g.stateT / 0.6, 0, 1));
      drawSprite(ctx, 'ui-gameover', W / 2, 400, { s: 1.15 * k, rot: Math.sin(g.time * 2) * 0.05 });
      outlinedText(ctx, THEME.gameOver.puntos + ' ' + g.score, W / 2, 470, 40, '#ffe14d');
      if (g.stateT > 1.5 && Math.floor(g.time * 2) % 2 === 0) outlinedText(ctx, `${THEME.gameOver.continuar} ${Math.max(0, Math.ceil(12 - g.stateT))}`, W / 2, 540, 46, '#fff');
    }
    if (g.state === 'ending') {
      ctx.fillStyle = 'rgba(10,0,30,0.4)'; ctx.fillRect(0, 0, W, H);
      drawSprite(ctx, 'presi-win', W / 2, FLOOR_Y, { s: 1.4, sy: 1 + Math.sin(g.time * 5) * 0.03 });
      outlinedText(ctx, THEME.ending.completed, W / 2, 140, 76, hsl(g.time * 90, 95, 62));
      outlinedText(ctx, THEME.ending.puntos + ' ' + g.score, W / 2, 220, 44, '#ffe14d');
      if (g.stateT > 3) outlinedText(ctx, THEME.ending.next, W / 2, 290, 30, '#fff');
    }
    if (g.paused) { ctx.fillStyle = 'rgba(10,0,30,0.6)'; ctx.fillRect(0, 0, W, H); outlinedText(ctx, 'PAUSA', W / 2, H / 2, 100, '#fff'); }
    drawVignette(ctx);
    fx.drawFlash(ctx, W, H);
    if (g.trans) {
      const k = g.trans.t / g.trans.dur;
      const r = (g.trans.phase === 'out' ? 1 - k : k) * 900;
      const p = g.player; const cx = g.state === 'title' ? W / 2 : p.x + p.w / 2, cy = g.state === 'title' ? H / 2 : p.y + 40;
      ctx.save(); ctx.fillStyle = '#0d0820'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2, true); ctx.fill('evenodd');
      ctx.restore();
    }
  }

  return { update, render, state: g, debug: { g, fx, startStage } };
}
