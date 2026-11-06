# Capturas del juego

Fotogramas **reales del motor** (Canvas 2D), tema «Dieta de Marcos»:

| Fichero | Qué se ve |
|---|---|
| `giro-tumbledog.jpg` / `giro-marcos.jpg` | B94 (#94): captura real en Chromium de cada juego girando a la izquierda sin soltar aspirar, con un enemigo capturado; reproducible con `npx playwright test tests/giro.spec.js`. |
| `perseguidor-*-aviso.jpg` / `perseguidor-*-canvas.jpg` | #111: aviso y perseguidor aturdido en ambos temas; escenas controladas capturadas con Chromium en `tests/chaser.spec.js`. |
| `musica-bucle.jpg` | #101: título en Chromium con la canción cruzando el final del bucle; reproducible con `npx playwright test tests/music-loop.spec.js`. |
| `titulo-marcos.png` | Pantalla de título del tema: logo, Marcos con el bocadillo, selector de juego y de modo (Campaña / Arcade). |
| `ruta-campana.png` | Mapa de la campaña: los 4 bares con sus mecánicas y el progreso guardado. |
| `bar-la-taca-ronda1.png` | Juego: Bar La Taca, ronda 1 de 3, con la barra de máscaras, un carajillo y Marcos. |
| `escenarios-bar-la-taca.png` | Escenarios E1 (#96): Bar La Taca con la barra larga, taburetes, mesas con mantel, estantería de botellas y barriles como plataformas. |
| `escenarios-mercado.png` | Escenarios E1 (#96): Bar Los Concursos, el mercado con mostradores, cajas de cerveza y toldos como plataformas. |
| `escenarios-terraza.png` | Escenarios E1 (#96): Bar Pols, la terraza con toldo, mesas y sillas; abajo, la barra deslizante de la mecánica. |
| `i18n-es.jpg` | I18N (#102): título de Tumble Dog en castellano, con selector de idioma. |
| `i18n-val.jpg` | I18N (#102): título de Tumble Dog en valencià. |
| `i18n-marcos-val.jpg` | I18N (#102): título de Dieta de Marcos en valencià («Marcos, el golut»). |
| `i18n-movil-val.jpg` | I18N (#102): título en móvil horizontal 800×360, selector táctil dentro del canvas. |
| `i18n-juego-val.jpg` | I18N (#102): campaña en valencià, HUD y palancas EMPASSA/VOMITA. |
| `escenarios-bar-del-jefe.png` | Escenarios E1 (#96): Bar del Jefe de noche, con neveras, estantería, barriles y mostradores de mercado mezclados. |
| `movil-horizontal.png` | #105: teléfono (844×390, táctil) con el juego a pantalla completa: 16:9 centrado sobre el degradado, joystick y palancas en la zona segura y el botón «SALIR DE PANTALLA COMPLETA» del título. |
| `movil-vertical.png` | #105: el mismo teléfono en vertical — aviso «GIRA EL MÓVIL» con el icono animado, que tapa y pausa el juego. |
| `b94-giro-derecha.png` | B94 (#94): Marcos con X pulsado y 3 esmorzars tragados mirando a la **derecha**: cono y boquilla a la derecha, mochila a la espalda (izquierda).
| `b94-giro-izquierda.png` | B94 (#94): el mismo instante tras pulsar izquierda **sin soltar X**: sprite, cono, boquilla y mochila volteados en un frame (par antes/después con la anterior). |

## Cómo se regeneran

No hace falta navegador ni Playwright (el sandbox no puede descargar Chromium). Se
dibuja un fotograma de verdad con un canvas nativo de Node:

```bash
npm install --no-save @napi-rs/canvas     # dependencia opcional, no va en package.json
node tools/shot.mjs --tema marcos --modo title     --salida /tmp/titulo.png
node tools/shot.mjs --tema marcos --modo campaña   --salida /tmp/ruta.png
node tools/shot.mjs --tema marcos --modo juego --segundos 5 --salida /tmp/juego.png
node tools/shot.mjs --tema marcos --modo juego --fase 4  --salida /tmp/mercado.png   # ronda de campaña
node tools/shot.mjs --tema marcos --arcade --modo juego --giro izquierda --salida /tmp/giro.png  # B94
node tools/shot.mjs --tema marcos --modo juego --arcade --fase 7 --salida /tmp/arcade.png
```

`tools/shot.mjs` sustituye el `document`/`Image` del navegador por los equivalentes
de Node y usa `__setImagesForNode()` de `src/sprites.js` para servir los sprites
desde disco. Después se recomprimen a PNG8 ≤ 200 KB (Pillow) antes de commitear.

Las dos capturas de **móvil** no salen de `tools/shot.mjs` (necesitan CSS y
emulación táctil): las hace Playwright en `tests/mobile.spec.js` y se copian de
`test-results/*/canvas-movil-*.png` a esta carpeta, reducidas a PNG8 ≤ 200 KB.

Las capturas se hacen en local; el smoke test de Playwright sigue siendo el que
valida el juego en el CI.

## I18N (#102)

Las capturas `i18n-*.jpg` son fotogramas reales de Chromium (Playwright, `tests/i18n.spec.js`), recomprimidos a JPEG ≤ 200 KB. El texto incrustado en imágenes (logo, onomatopeyas y carteles de `assets/`) sigue en castellano: traducirlo es trabajo de arte futuro, no de código.
