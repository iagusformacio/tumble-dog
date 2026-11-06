// Iconos de la PWA (issue #105), dibujados por código: no hay logo en PSD ni
// fotografía, así que el icono se genera con el mismo lenguaje gráfico del juego
// (perro de tebeo con corbata + bola arcoíris, todo inventado).
//
// Requiere el canvas nativo opcional (igual que tools/shot.mjs):
//   npm install --no-save @napi-rs/canvas
// Uso:
//   node tools/make_icons.mjs            # escribe assets/icons/*.png
//   node tools/make_icons.mjs --check    # falla si lo que hay en disco no cuadra
//
// Se generan 4 tamaños: 512 y 192 (manifest), 180 (apple-touch-icon) y 48 (favicon).
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'icons');
const SIZES = [512, 192, 180, 48];
const NAME = { 512: 'icon-512.png', 192: 'icon-192.png', 180: 'apple-touch-icon.png', 48: 'favicon.png' };

// Paleta del juego (mismo morado y amarillo del lienzo).
const INK = '#1a1030', CREAM = '#ffe9c9', FUR = '#6b3f1d', TIE = '#ff4fa3', SKY = '#ffe14d';

function draw(ctx, S) {
  const u = S / 512; // unidad: todo se dibuja en coordenadas de 512
  ctx.clearRect(0, 0, S, S);

  // Fondo: degradado del cielo nocturno del Moncloa + sol de tebeo.
  const bg = ctx.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, '#3a1a7a'); bg.addColorStop(1, '#140a32');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);
  ctx.save();
  ctx.globalAlpha = 0.16; ctx.fillStyle = SKY;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(256 * u, 250 * u);
    ctx.lineTo((256 + Math.cos(a) * 400) * u, (250 + Math.sin(a) * 400) * u);
    ctx.lineTo((256 + Math.cos(a + 0.16) * 400) * u, (250 + Math.sin(a + 0.16) * 400) * u);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // Suelo.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(256 * u, 470 * u, 190 * u, 34 * u, 0, 0, Math.PI * 2); ctx.fill();

  // Bola arcoíris (los enemigos aspirados) en una esquina, como en el juego.
  const bx = 118 * u, by = 388 * u, br = 66 * u;
  ctx.save();
  ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#fff'; ctx.fillRect(bx - br, by - br, br * 2, br * 2);
  const stripes = ['#ff3b3b', '#ff9f1c', '#ffe14d', '#3ddc84', '#4cc9f0', '#b14cff'];
  stripes.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(bx, by - br + (i + 0.5) * (br * 2 / stripes.length), br * 1.2, br * 2 / stripes.length / 2.1, 0, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
  ctx.lineWidth = 7 * u; ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke();

  // Don Presi: perro de tebeo con traje y corbata.
  const cx = 272 * u, cy = 250 * u;
  // orejas caídas
  ctx.fillStyle = FUR; ctx.strokeStyle = INK; ctx.lineWidth = 7 * u;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * 128 * u, cy - 4 * u, 44 * u, 92 * u, s * 0.22, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
  // traje
  ctx.fillStyle = '#20233f';
  ctx.beginPath();
  ctx.moveTo(cx - 150 * u, cy + 240 * u); ctx.quadraticCurveTo(cx - 128 * u, cy + 74 * u, cx - 40 * u, cy + 62 * u);
  ctx.lineTo(cx + 40 * u, cy + 62 * u); ctx.quadraticCurveTo(cx + 128 * u, cy + 74 * u, cx + 150 * u, cy + 240 * u);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // corbata
  ctx.fillStyle = TIE;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 66 * u); ctx.lineTo(cx + 20 * u, cy + 96 * u); ctx.lineTo(cx + 10 * u, cy + 176 * u);
  ctx.lineTo(cx - 10 * u, cy + 176 * u); ctx.lineTo(cx - 20 * u, cy + 96 * u);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // cabeza
  ctx.fillStyle = CREAM;
  ctx.beginPath(); ctx.ellipse(cx, cy, 118 * u, 106 * u, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // flequillo de político
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.moveTo(cx - 112 * u, cy - 34 * u);
  ctx.quadraticCurveTo(cx - 60 * u, cy - 128 * u, cx + 40 * u, cy - 108 * u);
  ctx.quadraticCurveTo(cx - 6 * u, cy - 70 * u, cx - 66 * u, cy - 46 * u);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // ojos
  ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 5 * u;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(cx + s * 44 * u, cy - 18 * u, 27 * u, 30 * u, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.ellipse(cx + s * 50 * u, cy - 14 * u, 9 * u, 11 * u, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
  }
  // hocico y sonrisa
  ctx.lineWidth = 7 * u; ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.ellipse(cx + 6 * u, cy + 40 * u, 52 * u, 40 * u, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fff3dd'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(cx + 6 * u, cy + 22 * u, 19 * u, 14 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 6 * u; ctx.strokeStyle = INK; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 30 * u, cy + 52 * u);
  ctx.quadraticCurveTo(cx + 6 * u, cy + 84 * u, cx + 42 * u, cy + 50 * u);
  ctx.stroke();
}

function render(S) {
  const c = createCanvas(S, S);
  const ctx = c.getContext('2d');
  draw(ctx, S);
  return c.toBuffer('image/png');
}

// Cabecera IHDR de un PNG: ancho/alto en big-endian, bytes 16..24.
function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const check = process.argv.includes('--check');
let bad = 0;
for (const S of SIZES) {
  const path = join(OUT, NAME[S]);
  if (check) {
    if (!existsSync(path)) { console.error(`falta ${NAME[S]}`); bad++; continue; }
    const buf = readFileSync(path);
    const dim = pngSize(buf);
    if (dim.w !== S || dim.h !== S) { console.error(`${NAME[S]}: ${dim.w}x${dim.h}, se esperaba ${S}x${S}`); bad++; continue; }
    if (buf.length > 200 * 1024) { console.error(`${NAME[S]}: ${buf.length} bytes (máx. 200 KB)`); bad++; continue; }
    console.log(`${NAME[S]}: ${S}x${S} · ${Math.round(buf.length / 1024)} KB ok`);
    continue;
  }
  mkdirSync(OUT, { recursive: true });
  const buf = render(S);
  writeFileSync(path, buf);
  console.log(`${NAME[S]}: ${S}x${S} · ${Math.round(buf.length / 1024)} KB`);
}
if (bad) process.exit(1);
