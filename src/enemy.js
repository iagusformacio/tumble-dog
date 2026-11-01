import { CONFIG } from './config.js';
import { DEFAULT_PLATFORMS, overlaps } from './physics.js';
import { drawAnchoredSprite, getSharedAssets } from './assets.js';

/**
 * Enemigos inventados de Tumble Dog (ninguno es una persona real).
 * - T06: La Portavoz Airada ('portavoz') patrulla su plataforma y se para al girar.
 * - T07: estado 'defeated' (aplastada por la bola lanzada).
 * - T08: los otros 7 tipos, cada uno con un comportamiento distinto (ver CONFIG.enemy).
 * - T10: hojas de sprites de assets/enemigos/ con fallback dibujado por código.
 * Estados: 'patrol' (libre), 'sucked' (dentro de Don Presi), 'stunned' (escapado),
 * 'hidden' (escondido, T08) y 'defeated' (aplastado, T07).
 */
const TIPO = 'portavoz';

function plataformaDeApoyo(platforms, x, y, height) {
  let mejor = null;
  for (const platform of platforms) {
    const encima = x >= platform.x - 0.01 && x <= platform.x + platform.width + 0.01 &&
      Math.abs(y + height - platform.y) < 1.5;
    if (!encima) continue;
    if (!mejor || platform.y < mejor.y) mejor = platform;
  }
  return mejor;
}

export function createEnemy({
  type = TIPO,
  x = 40,
  y = 136,
  platforms = DEFAULT_PLATFORMS,
  speed = CONFIG.enemy[type]?.speed ?? CONFIG.enemy.portavoz.speed,
  direction = 1,
  assets = getSharedAssets(),
} = {}) {
  const size = CONFIG.enemy[type] ?? CONFIG.enemy.portavoz;
  const body = { x, y, width: size.width, height: size.height };
  const spawnX = x;
  const spawnY = y;
  let dir = direction < 0 ? -1 : 1;
  let state = 'patrol';
  let pauseLeft = 0;
  let elapsed = 0;
  let containLeft = 0;   // segundos que lleva aspirado
  let stunLeft = 0;      // segundos mareado tras escaparse
  let hiddenLeft = 0;    // segundos que falta para salir de 'hidden' (T08)
  let vy = 0;
  let airborne = false;  // en el aire por un salto (vy solo no vale: puede ser 0 en el cenit)
  let shootCycle = size.shootEverySeconds ?? 0;   // Tertuliano: bulos
  let hideCycle = size.hideEverySeconds ?? 0;     // Asesor: escondite
  let jumpCycle = size.jumpEverySeconds ?? 0;     // Líder / Activista: saltos
  let burstCycle = size.burstEverySeconds ?? 0;   // Diputado: ráfagas
  let burstLeft = 0;
  let erraticCycle = 0;                            // Activista: cambio al azar
  let previousX = x;
  let previousY = y;
  let wobble = 0;

  /** Plataforma sobre la que patrulla: la primera que lo sostiene. */
  const soporte = plataformaDeApoyo(platforms, x, y, size.height);
  const left = soporte ? soporte.x : 0;
  const right = soporte ? soporte.x + soporte.width : CONFIG.screen.width;
  const supportY = soporte ? soporte.y - size.height : y;

  function currentPose() {
    if (state === 'defeated') return 'defeated';
    if (state === 'sucked' || state === 'stunned' || state === 'hidden') return 'sucked';
    if (pauseLeft > 0) return 'walkA';
    return Math.floor(wobble * 8) % 2 === 0 ? 'walkA' : 'walkB';
  }

  function update(dt, { player, bullets } = {}) {
    previousX = body.x;
    previousY = body.y;
    elapsed += dt;
    wobble += dt;

    if (state === 'defeated') return;

    if (state === 'sucked') {
      containLeft -= dt;
      if (containLeft <= 0 && player) {
        // Se escapa: sale despedido un poco por delante de Don Presi, mareado.
        escapeFrom(player);
      }
      return;
    }

    if (state === 'stunned') {
      stunLeft -= dt;
      if (stunLeft <= 0) state = 'patrol';
      return;
    }

    if (state === 'hidden') {
      hiddenLeft -= dt;
      if (hiddenLeft <= 0) state = 'patrol';
      return;
    }

    // --- Comportamientos distintos por tipo (T08) ---
    let speedNow = speed;
    if (size.burstEverySeconds) {
      // El Diputado Gruñón: ráfagas de velocidad.
      burstCycle -= dt;
      if (burstCycle <= 0) { burstLeft = size.burstSeconds; burstCycle = size.burstEverySeconds; }
      if (burstLeft > 0) { burstLeft -= dt; speedNow = size.burstSpeed; }
    }
    if (size.hideEverySeconds) {
      // El Asesor Misterioso: se esconde (ni hace daño ni se puede aspirar).
      hideCycle -= dt;
      if (hideCycle <= 0) {
        state = 'hidden';
        hiddenLeft = size.hiddenSeconds;
        hideCycle = size.hideEverySeconds;
        return;
      }
    }
    if (size.shootEverySeconds && bullets && player) {
      // El Tertuliano: dispara bulos hacia Don Presi si está a su altura.
      shootCycle -= dt;
      const playerMidX = player.body.x + player.body.width / 2;
      const myMidX = body.x + body.width / 2;
      const playerMidY = player.body.y + player.body.height / 2;
      const myMidY = body.y + body.height / 2;
      if (shootCycle <= 0 && Math.abs(playerMidY - myMidY) < 40) {
        shootCycle = size.shootEverySeconds;
        bullets.push(createBulo({
          x: dir > 0 ? body.x + body.width : body.x,
          y: myMidY,
          direction: playerMidX >= myMidX ? 1 : -1,
          speed: size.bulletSpeed,
          range: size.bulletRange,
          platforms,
        }));
      }
    }
    if (size.jumpEverySeconds) {
      // El Líder Eterno y la Activista Municipal saltan.
      jumpCycle -= dt;
      if (jumpCycle <= 0 && !airborne && body.y >= supportY - 0.5) {
        vy = -(size.jumpSpeed ?? CONFIG.physics.jumpSpeed);
        airborne = true;
        jumpCycle = size.jumpEverySeconds;
      }
    }
    if (size.erratic) {
      // La Activista Municipal cambia de dirección al azar.
      erraticCycle -= dt;
      if (erraticCycle <= 0) {
        erraticCycle = 0.6;
        if (Math.random() < 0.5) dir = -dir;
      }
    }

    // Patrulla horizontal sobre su plataforma.
    if (pauseLeft > 0) {
      pauseLeft -= dt;
    } else {
      body.x += dir * speedNow * dt;
      const margenIzq = left + 2;
      const margenDer = right - body.width - 2;
      if (body.x <= margenIzq) { body.x = margenIzq; dir = 1; pauseLeft = size.turnPauseSeconds ?? 0; }
      if (body.x >= margenDer) { body.x = margenDer; dir = -1; pauseLeft = size.turnPauseSeconds ?? 0; }
    }

    // Salto vertical: parábola simple que vuelve a supportY.
    if (airborne) {
      vy += CONFIG.physics.gravity * dt;
      body.y += vy * dt;
      if (body.y >= supportY) { body.y = supportY; vy = 0; airborne = false; }
    }
  }

  function escapeFrom(player) {
    state = 'stunned';
    stunLeft = CONFIG.suck.escapeStunSeconds;
    containLeft = 0;
    const p = player.body;
    body.x = p.x + (player.facing >= 0 ? p.width + 2 : -body.width - 2);
    body.x = Math.max(0, Math.min(CONFIG.screen.width - body.width, body.x));
    body.y = p.y;
    dir = player.facing >= 0 ? 1 : -1;
  }

  /** La mete en la boquilla: deja de patrullar y cuenta atrás para escaparse. */
  function suck() {
    if (state !== 'patrol') return false;
    state = 'sucked';
    containLeft = CONFIG.suck.escapeSeconds;
    return true;
  }

  /** La saca de Don Presi (al lanzar la bola). Devuelve false si no estaba dentro. */
  function release() {
    if (state !== 'sucked') return false;
    state = 'patrol';
    containLeft = 0;
    return true;
  }

  /** La aplasta la bola lanzada (T07). Vale desde 'patrol', 'stunned' e 'hidden'. */
  function crush() {
    if (state !== 'patrol' && state !== 'stunned' && state !== 'hidden') return false;
    state = 'defeated';
    return true;
  }

  /** Vuelve a aparecer en su punto de partida (T08: reaparición por enemigo). */
  function respawn() {
    state = 'patrol';
    body.x = spawnX;
    body.y = spawnY;
    vy = 0;
    airborne = false;
    pauseLeft = 0;
    containLeft = 0;
    stunLeft = 0;
    hiddenLeft = 0;
  }

  function canBeSucked() { return state === 'patrol'; }
  function isContained() { return state === 'sucked'; }
  function isDangerous() { return state === 'patrol'; }
  function isDefeated() { return state === 'defeated'; }
  function isHidden() { return state === 'hidden'; }

  function drawBody(ctx, alpha = 1, { atOrigin = false } = {}) {
    const x = atOrigin ? -body.width / 2 : previousX + (body.x - previousX) * alpha;
    const y = atOrigin ? -body.height / 2 : previousY + (body.y - previousY) * alpha;
    const bob = atOrigin || state === 'stunned' ? 0 : Math.sin(wobble * 6) * 0.6;
    const tilt = state === 'stunned' ? Math.sin(wobble * 18) * 0.12 : 0;
    const pose = currentPose();
    const sprite = assets?.getSprite(type, pose) ?? assets?.getSprite(type, 'walkA') ?? null;

    if (drawAnchoredSprite(ctx, sprite, {
      x,
      y: y + bob,
      bodyWidth: body.width,
      bodyHeight: body.height,
      targetHeight: body.height + 3,
      facing: atOrigin ? 1 : dir,
      rotation: tilt,
    })) {
      return;
    }

    // Fallback por código si aún no hay PNG de este tipo (T08/T10).
    ctx.save();
    ctx.translate(x + body.width / 2, y + body.height / 2 + bob);
    if (tilt) ctx.rotate(tilt);
    if (!atOrigin) ctx.scale(dir, 1);
    drawTipo(ctx, type, body.width, body.height);
    ctx.restore();
  }

  function render(ctx, alpha = 1) {
    if (state === 'sucked') return; // se dibuja encogido en la boquilla (enemies.js)
    if (state === 'defeated') {
      const x = previousX + (body.x - previousX) * alpha;
      const y = previousY + (body.y - previousY) * alpha;
      const defeatedSprite = assets?.getSprite(type, 'defeated') ?? null;
      if (drawAnchoredSprite(ctx, defeatedSprite, {
        x,
        y,
        bodyWidth: body.width,
        bodyHeight: body.height,
        targetHeight: 16,
        facing: dir,
      })) {
        return;
      }
      ctx.save();
      ctx.translate(x + body.width / 2, y + body.height);
      ctx.scale(1.35, 0.22);
      ctx.translate(0, -body.height / 2);
      drawTipo(ctx, type, body.width, body.height);
      ctx.restore();
      return;
    }
    if (state === 'hidden') {
      ctx.save();
      ctx.globalAlpha = 0.35; // semienterrado
      drawBody(ctx, alpha);
      ctx.restore();
      return;
    }
    drawBody(ctx, alpha);
  }

  return {
    type, body, update, render, drawBody, suck, release, crush, respawn,
    canBeSucked, isContained, isDangerous, isDefeated, isHidden,
    get state() { return state; },
    get pose() { return currentPose(); },
    get direction() { return dir; },
    get containedSeconds() { return state === 'sucked' ? containLeft : 0; },
  };
}

/** Un bulo disparado por El Tertuliano (T08): vuela recto y muere al recorrer su rango. */
export function createBulo({
  x, y, direction = 1,
  speed = 95, range = 130,
  platforms = DEFAULT_PLATFORMS,
  size = CONFIG.enemy.bulletSize ?? 6,
} = {}) {
  const body = {
    x: direction > 0 ? x : x - size,
    y: y - size / 2,
    width: size,
    height: size,
    vx: direction * speed,
    vy: 0,
  };
  let left = range;

  function update(dt) {
    body.x += body.vx * dt;
    left -= Math.abs(body.vx) * dt;
    if (body.x < 0 || body.x + body.width > CONFIG.screen.width) left = 0;
    for (const platform of platforms) {
      if (!platform.oneWay && overlaps(body, platform)) { left = 0; break; }
    }
  }

  function render(ctx) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(body.x, body.y, body.width, body.height);
    ctx.fillStyle = '#111';
    ctx.fillRect(body.x + 2, body.y + 1, 2, 3); // «!» del bulo
    ctx.fillRect(body.x + 2, body.y + body.height - 2, 2, 1);
  }

  return { body, update, render, get alive() { return left > 0; } };
}

/** Dibujo provisional por código de cada tipo (solo fillRect), si no hay PNG (T08/T10). */
function drawTipo(ctx, type, width, height) {
  switch (type) {
    case 'tertuliano': return drawTertuliano(ctx, width, height);
    case 'asesor': return drawAsesor(ctx, width, height);
    case 'influencer': return drawInfluencer(ctx, width, height);
    case 'lider': return drawLider(ctx, width, height);
    case 'baron': return drawBaron(ctx, width, height);
    case 'activista': return drawActivista(ctx, width, height);
    case 'diputado': return drawDiputado(ctx, width, height);
    default: return drawPortavoz(ctx, width, height);
  }
}

function cabezaBase(ctx, w, h, piel, pelo) {
  ctx.fillStyle = '#111';
  ctx.fillRect(-w + 2, -h, w * 2 - 4, h * 2); // contorno
  ctx.fillStyle = piel;
  ctx.fillRect(-w + 3, -h + 1, w * 2 - 6, 11);
  ctx.fillStyle = pelo;
  ctx.fillRect(-w + 2, -h + 1, w * 2 - 4, 4);
}

function ojo(ctx, w, h) {
  ctx.fillStyle = '#111';
  ctx.fillRect(w - 7, -h + 6, 2, 2);
}

/** La Portavoz Airada: cabezona, melena y dedo acusador. */
function drawPortavoz(ctx, width, height) {
  const w = width / 2;
  const h = height / 2;
  ctx.fillStyle = '#111';
  ctx.fillRect(-w + 1, -h + 11, width - 2, height - 11);
  ctx.fillStyle = '#b03a63';
  ctx.fillRect(-w + 2, -h + 12, width - 4, height - 13);
  cabezaBase(ctx, w, h, '#f0c8a0', '#3a2634');
  ctx.fillStyle = '#3a2634';
  ctx.fillRect(-w + 1, -h + 3, 3, 8);
  ojo(ctx, w, h);
  ctx.fillStyle = '#111';
  ctx.fillRect(w - 4, -h + 5, 2, 2);
  ctx.fillRect(w - 6, -h + 9, 4, 1);
  ctx.fillStyle = '#f0c8a0';
  ctx.fillRect(w, -h + 10, 4, 2);
}

/** El Tertuliano: chaqueta a cuadros, gafas cuadradas y dedo señalando. */
function drawTertuliano(ctx, width, height) {
  const w = width / 2;
  const h = height / 2;
  ctx.fillStyle = '#111';
  ctx.fillRect(-w + 1, -h + 11, width - 2, height - 11);
  ctx.fillStyle = '#7a6a4a';
  ctx.fillRect(-w + 2, -h + 12, width - 4, height - 12);
  ctx.fillStyle = '#9c8a63';
  ctx.fillRect(-w + 2, -h + 12, 4, 4);
  ctx.fillRect(-w + 8, -h + 17, 4, 4);
  cabezaBase(ctx, w, h, '#f0c8a0', '#4a3a2a');
  ctx.fillStyle = '#4a3a2a'; // pelo revuelto
  ctx.fillRect(w - 4, -h, 3, 3);
  ctx.fillStyle = '#fff'; // gafas cuadradas
  ctx.fillRect(-w + 4, -h + 5, 4, 3);
  ctx.fillRect(w - 8, -h + 5, 4, 3);
  ctx.fillStyle = '#111';
  ctx.fillRect(-w + 5, -h + 6, 2, 2);
  ctx.fillRect(w - 7, -h + 6, 2, 2);
  ctx.fillStyle = '#f0c8a0'; // dedo acusador
  ctx.fillRect(w, -h + 9, 5, 2);
}

/** El Asesor Misterioso: abrigo largo oscuro, gafas de sol y sonrisa aviesa. */
function drawAsesor(ctx, width, height) {
  const w = width / 2;
  const h = height / 2;
  ctx.fillStyle = '#111';
  ctx.fillRect(-w, -h + 9, width, height - 9);
  ctx.fillStyle = '#26262e';
  ctx.fillRect(-w + 1, -h + 10, width - 2, height - 10);
  cabezaBase(ctx, w, h, '#e8bd97', '#111');
  ctx.fillStyle = '#111'; // gafas de sol
  ctx.fillRect(-w + 3, -h + 5, w * 2 - 6, 3);
  ctx.fillStyle = '#7a2a2a'; // sonrisa aviesa
  ctx.fillRect(w - 6, -h + 9, 4, 1);
  ctx.fillStyle = '#444'; // maletín
  ctx.fillRect(w, -h + 13, 5, 4);
}

/** El Influencer Bulero: camiseta llamativa, pelo frondoso y móvil en mano. */
function drawInfluencer(ctx, width, height) {
  const w = width / 2;
  const h = height / 2;
  ctx.fillStyle = '#111';
  ctx.fillRect(-w + 1, -h + 11, width - 2, height - 11);
  ctx.fillStyle = '#e8a13a';
  ctx.fillRect(-w + 2, -h + 12, width - 4, height - 12);
  ctx.fillStyle = '#fff'; // estrella de la camiseta
  ctx.fillRect(0, -h + 14, 3, 3);
  cabezaBase(ctx, w, h, '#f0c8a0', '#d8b13a');
  ctx.fillStyle = '#d8b13a'; // pelo frondoso
  ctx.fillRect(-w + 1, -h - 1, 3, 3);
  ctx.fillRect(w - 4, -h - 1, 3, 3);
  ctx.fillRect(-1, -h - 1, 3, 2);
  ojo(ctx, w, h);
  ctx.fillStyle = '#111'; // sonrisa presumida
  ctx.fillRect(w - 6, -h + 9, 4, 1);
  ctx.fillStyle = '#222'; // móvil
  ctx.fillRect(w, -h + 11, 4, 5);
}

/** El Líder Eterno de la Oposición: traje azul, corbata ancha y pelo canoso. */
function drawLider(ctx, width, height) {
  const w = width / 2;
  const h = height / 2;
  ctx.fillStyle = '#111';
  ctx.fillRect(-w + 1, -h + 11, width - 2, height - 11);
  ctx.fillStyle = '#2c3a5e';
  ctx.fillRect(-w + 2, -h + 12, width - 4, height - 12);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-2, -h + 12, 4, 6);
  ctx.fillStyle = '#c03030'; // corbata ancha
  ctx.fillRect(-2, -h + 12, 4, 9);
  cabezaBase(ctx, w, h, '#f0c8a0', '#cfcfcf');
  ctx.fillStyle = '#111'; // cejas marcadas
  ctx.fillRect(w - 8, -h + 4, 4, 1);
  ctx.fillRect(-w + 4, -h + 4, 3, 1);
  ojo(ctx, w, h);
  ctx.fillStyle = '#111';
  ctx.fillRect(w - 6, -h + 9, 4, 1); // boca seria
}

/** El Barón Regional: corpulento, chaleco y barriga. */
function drawBaron(ctx, width, height) {
  const w = width / 2;
  const h = height / 2;
  ctx.fillStyle = '#111';
  ctx.fillRect(-w, -h + 9, width, height - 9);
  ctx.fillStyle = '#5e4632';
  ctx.fillRect(-w + 1, -h + 10, width - 2, height - 10);
  ctx.fillStyle = '#8a6a48'; // barriga
  ctx.fillRect(-w + 4, -h + 13, width - 8, 6);
  cabezaBase(ctx, w, h, '#f0c8a0', '#3a3a3a');
  ctx.fillStyle = '#888'; // barba canosa
  ctx.fillRect(-w + 4, -h + 9, w * 2 - 8, 2);
  ojo(ctx, w, h);
  ctx.fillStyle = '#111';
  ctx.fillRect(w - 6, -h + 7, 3, 1); // ceja caída
}

/** La Activista Municipal: camiseta verde, pelo suelto y megáfono. */
function drawActivista(ctx, width, height) {
  const w = width / 2;
  const h = height / 2;
  ctx.fillStyle = '#111';
  ctx.fillRect(-w + 1, -h + 11, width - 2, height - 11);
  ctx.fillStyle = '#3a9e5e';
  ctx.fillRect(-w + 2, -h + 12, width - 4, height - 12);
  cabezaBase(ctx, w, h, '#f0c8a0', '#6a4a2a');
  ctx.fillStyle = '#6a4a2a'; // pelo suelto
  ctx.fillRect(-w + 1, -h + 4, 3, 6);
  ctx.fillRect(w - 4, -h + 4, 3, 6);
  ojo(ctx, w, h);
  ctx.fillStyle = '#7a2a2a'; // sonrisa
  ctx.fillRect(w - 6, -h + 9, 4, 1);
  ctx.fillStyle = '#d8d8d8'; // megáfono
  ctx.fillRect(w, -h + 10, 5, 3);
}

/** El Diputado Gruñón: traje gris, cejas bajas y cara de pocos amigos. */
function drawDiputado(ctx, width, height) {
  const w = width / 2;
  const h = height / 2;
  ctx.fillStyle = '#111';
  ctx.fillRect(-w + 1, -h + 11, width - 2, height - 11);
  ctx.fillStyle = '#555a63';
  ctx.fillRect(-w + 2, -h + 12, width - 4, height - 12);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-2, -h + 12, 4, 6);
  ctx.fillStyle = '#222'; // corbata negra
  ctx.fillRect(-1, -h + 12, 3, 8);
  cabezaBase(ctx, w, h, '#eab890', '#333');
  ctx.fillStyle = '#111'; // cejas bajas y juntas
  ctx.fillRect(-w + 4, -h + 5, w * 2 - 8, 1);
  ojo(ctx, w, h);
  ctx.fillStyle = '#111'; // boca recta, abajo
  ctx.fillRect(w - 6, -h + 10, 4, 1);
}
