function makeCanvas(width, height) {
  if (typeof globalThis.OffscreenCanvas === 'function') {
    return new globalThis.OffscreenCanvas(width, height);
  }
  if (globalThis.document?.createElement) {
    const canvas = globalThis.document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return null;
}

function polygon(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function drawCloud(ctx, x, y, scale = 1) {
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.beginPath();
  ctx.arc(x, y, 7 * scale, 0, Math.PI * 2);
  ctx.arc(x + 9 * scale, y - 3 * scale, 9 * scale, 0, Math.PI * 2);
  ctx.arc(x + 20 * scale, y, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawTree(ctx, x, y, scale = 1) {
  ctx.fillStyle = '#70503c';
  ctx.fillRect(x - 2 * scale, y - 10 * scale, 4 * scale, 13 * scale);
  ctx.fillStyle = '#39764c';
  ctx.beginPath();
  ctx.arc(x, y - 15 * scale, 10 * scale, 0, Math.PI * 2);
  ctx.arc(x - 7 * scale, y - 9 * scale, 7 * scale, 0, Math.PI * 2);
  ctx.arc(x + 7 * scale, y - 8 * scale, 7 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawMoncloaScene(ctx, width, height) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#6ab9eb');
  sky.addColorStop(0.72, '#d7eddf');
  sky.addColorStop(1, '#a7ce8b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffe7a1';
  ctx.beginPath();
  ctx.arc(276, 39, 17, 0, Math.PI * 2);
  ctx.fill();
  drawCloud(ctx, 42, 39, 0.8);
  drawCloud(ctx, 219, 55, 0.65);

  // Lomas y arboleda: formas originales, sin usar fotografías ni calcos.
  polygon(ctx, [[0, 137], [35, 108], [82, 133], [122, 112], [169, 137], [221, 109], [320, 137], [320, 189], [0, 189]], '#8ebc82');
  polygon(ctx, [[0, 151], [47, 130], [93, 150], [145, 128], [202, 151], [260, 127], [320, 150], [320, 194], [0, 194]], '#719e69');

  // Palacio estilizado: alas bajas, cuerpo central y cubierta rojiza.
  ctx.fillStyle = '#eee3c8';
  ctx.fillRect(67, 108, 186, 59);
  ctx.fillRect(104, 91, 112, 76);
  ctx.fillStyle = '#d8c9a9';
  ctx.fillRect(60, 104, 199, 8);
  ctx.fillRect(99, 87, 122, 7);

  polygon(ctx, [[57, 104], [73, 91], [103, 91], [111, 104]], '#a75f48');
  polygon(ctx, [[209, 104], [218, 91], [247, 91], [263, 104]], '#a75f48');
  polygon(ctx, [[96, 89], [115, 72], [205, 72], [224, 89]], '#a75f48');
  polygon(ctx, [[119, 73], [132, 59], [188, 59], [201, 73]], '#bd7251');
  polygon(ctx, [[127, 62], [160, 43], [193, 62]], '#a75f48');
  ctx.fillStyle = '#e9dcc0';
  ctx.fillRect(151, 37, 18, 10);
  ctx.fillStyle = '#cf7954';
  ctx.fillRect(155, 29, 10, 8);
  ctx.fillStyle = '#fff0cc';
  ctx.fillRect(159, 21, 2, 8);

  // Pórtico de columnas y ventanas regulares de la fachada.
  ctx.fillStyle = '#f5ebd4';
  ctx.fillRect(111, 115, 98, 6);
  for (let i = 0; i < 7; i += 1) {
    const x = 116 + i * 14;
    ctx.fillRect(x, 121, 5, 35);
    ctx.fillRect(x - 2, 119, 9, 3);
    ctx.fillRect(x - 2, 155, 9, 3);
  }
  ctx.fillStyle = '#537889';
  for (const x of [75, 89, 226, 240]) {
    for (const y of [117, 137]) {
      ctx.fillRect(x, y, 8, 12);
      ctx.fillStyle = '#d8e8dc';
      ctx.fillRect(x + 3, y, 1, 12);
      ctx.fillStyle = '#537889';
    }
  }
  ctx.fillStyle = '#76533e';
  ctx.fillRect(154, 140, 12, 27);
  ctx.fillStyle = '#f6efd9';
  ctx.fillRect(151, 137, 18, 4);
  ctx.fillStyle = '#d2b86b';
  ctx.beginPath();
  ctx.arc(163, 153, 1, 0, Math.PI * 2);
  ctx.fill();

  // Jardines, setos y camino en primer plano.
  ctx.fillStyle = '#5d8c52';
  ctx.fillRect(0, 170, width, 54);
  polygon(ctx, [[143, 167], [177, 167], [212, height], [108, height]], '#d7c49b');
  ctx.fillStyle = '#477746';
  ctx.fillRect(0, 179, 92, 12);
  ctx.fillRect(228, 179, 92, 12);
  for (const x of [13, 42, 278, 307]) drawTree(ctx, x, 172, x < 50 || x > 270 ? 0.9 : 0.75);

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(0, 192, width, 1);
  ctx.fillStyle = '#355b38';
  ctx.font = '7px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('JARDINES DE LA MONCLOA', 8, 216);
}

/** Crea una ilustración original cacheada del Palacio y sus jardines. */
export function createMoncloaBackground({ width = 320, height = 224, canvasFactory = makeCanvas } = {}) {
  const layer = canvasFactory(width, height);
  if (layer) {
    layer.width = width;
    layer.height = height;
  }
  const layerContext = layer?.getContext?.('2d') ?? null;
  if (layerContext) drawMoncloaScene(layerContext, width, height);

  return {
    render(context) {
      if (layerContext) context.drawImage(layer, 0, 0, width, height);
      else drawMoncloaScene(context, width, height);
    },
  };
}
