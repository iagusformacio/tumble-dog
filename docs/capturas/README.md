# Capturas del juego

Fotogramas **reales del motor** (Canvas 2D), tema «Dieta de Marcos»:

| Fichero | Qué se ve |
|---|---|
| `titulo-marcos.png` | Pantalla de título del tema: logo, Marcos con el bocadillo, selector de juego y de modo (Campaña / Arcade). |
| `ruta-campana.png` | Mapa de la campaña: los 4 bares con sus mecánicas y el progreso guardado. |
| `bar-la-taca-ronda1.png` | Juego: Bar La Taca, ronda 1 de 3, con la barra de máscaras, un carajillo y Marcos. |
| `escenarios-bar-la-taca.png` | Escenarios E1 (#96): Bar La Taca con la barra larga, taburetes, mesas con mantel, estantería de botellas y barriles como plataformas. |
| `escenarios-mercado.png` | Escenarios E1 (#96): Bar Los Concursos, el mercado con mostradores, cajas de cerveza y toldos como plataformas. |
| `escenarios-terraza.png` | Escenarios E1 (#96): Bar Pols, la terraza con toldo, mesas y sillas; abajo, la barra deslizante de la mecánica. |
| `escenarios-bar-del-jefe.png` | Escenarios E1 (#96): Bar del Jefe de noche, con neveras, estantería, barriles y mostradores de mercado mezclados. |

## Cómo se regeneran

No hace falta navegador ni Playwright (el sandbox no puede descargar Chromium). Se
dibuja un fotograma de verdad con un canvas nativo de Node:

```bash
npm install --no-save @napi-rs/canvas     # dependencia opcional, no va en package.json
node tools/shot.mjs --tema marcos --modo title     --salida /tmp/titulo.png
node tools/shot.mjs --tema marcos --modo campaña   --salida /tmp/ruta.png
node tools/shot.mjs --tema marcos --modo juego --segundos 5 --salida /tmp/juego.png
node tools/shot.mjs --tema marcos --modo juego --fase 4  --salida /tmp/mercado.png   # ronda de campaña
node tools/shot.mjs --tema marcos --modo juego --arcade --fase 7 --salida /tmp/arcade.png
```

`tools/shot.mjs` sustituye el `document`/`Image` del navegador por los equivalentes
de Node y usa `__setImagesForNode()` de `src/sprites.js` para servir los sprites
desde disco. Después se recomprimen a PNG8 ≤ 200 KB (Pillow) antes de commitear.

Las capturas se hacen en local; el smoke test de Playwright sigue siendo el que
valida el juego en el CI.
