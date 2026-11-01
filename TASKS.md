# TASKS — cola de trabajo (orden fijo)

Estados: `libre` · `en-curso (agente)` · `bloqueada (por ID)` · `hecha`.
Criterio general de «hecha»: CI en verde, `main` jugable, 60 fps, nota en `PROGRESS.md`.

| ID | Tarea | Depende de | Estado |
|---|---|---|---|
| T01 | Bucle de juego a paso fijo (60 Hz) con render interpolado, escalado de canvas responsive, pausa al perder foco | — | hecha |
| T02 | Entrada unificada: teclado, mando (Gamepad API) y táctil con botones en pantalla | T01 | hecha |
| T03 | Fondo de **La Moncloa** dibujado por código (cielo, palacio, jardines, columnas) en capa cacheada | T01 | hecha |
| T04 | Plataformas y colisiones (AABB), gravedad, salto | T01 | en-curso (AGB) |
| T05 | Protagonista *Don Presi* con sprite provisional, andar/saltar/aspirar | T02, T04 | bloqueada |
| T06 | Primer enemigo (La Portavoz Airada) con IA simple y estado «aspirado» | T04 | bloqueada |
| T07 | Aspirar y lanzar bola: aplastar enemigos, rebotes, combos | T05, T06 | bloqueada |
| T08 | Resto de enemigos (7) con comportamientos distintos | T06 | bloqueada |
| T09 | Puntuación, vidas, HUD, victoria/derrota, siguiente oleada | T07 | bloqueada |
| T10 | Arte final estilo tebeo: sprites por código/SVG, onomatopeyas, hoja de personajes | T05 | bloqueada |
| T11 | Sonido y música (WebAudio sintetizado) | T07 | bloqueada |
| T12 | PWA/offline, rendimiento en móvil, prueba de 60 fps | T09 | bloqueada |
| T13 | CI: smoke test en navegador headless (arranca, juega 5 s, sin errores JS) | T01 | en-curso (Iagus) |

## Plan por oleadas (orden de ataque)
- **Oleada 1:** FETS → T01 y T02 (hechas) y T03 (fondo listo, pendiente de integrar) · Iagus → T13 · AGB → T04 (plataformas y colisiones, `src/physics.js`).
- **Oleada 2:** T02 entrada, T04 plataformas/colisiones (en paralelo; tocan ficheros distintos: `src/input.js`, `src/physics.js`).
- **Oleada 3:** T05 protagonista, T06 primer enemigo.
- **Oleada 4:** T07 aspirar y lanzar (el corazón del juego). Hito jugable: se puede jugar una pantalla.
- **Oleada 5:** T08 resto de enemigos, T09 puntuación y vidas, T10 arte final.
- **Oleada 6:** T11 sonido, T12 móvil/PWA/rendimiento.
- **Tras cada oleada:** el coordinador actualiza `PROGRESS.md` y la persona prueba 10 min.
- **Convención de ficheros** (para no pisarse): un módulo por tarea en `src/` (`loop.js`, `input.js`, `physics.js`, `background.js`, `player.js`, `enemies/`, `hud.js`, `audio.js`).
