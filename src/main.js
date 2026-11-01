// Provisional: bucle de paso fijo (T01 lo sustituirá/mejorará).
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const STEP = 1000 / 60;
let last = performance.now();
let acc = 0;
let t = 0;

function update() { t += 1; }

function render() {
  ctx.fillStyle = '#7ec8ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2d6a2d';
  ctx.fillRect(0, 190, canvas.width, 34);
  ctx.fillStyle = '#fff';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TUMBLE DOG', canvas.width / 2, 40 + Math.sin(t / 20) * 4);
  ctx.font = '10px monospace';
  ctx.fillText('en construcción', canvas.width / 2, 60);
}

function frame(now) {
  acc += Math.min(now - last, 250);
  last = now;
  while (acc >= STEP) { update(); acc -= STEP; }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
