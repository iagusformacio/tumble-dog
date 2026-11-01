# TASKS — cola de trabajo (orden fijo)

Estados: `libre` · `en-curso (agente)` · `bloqueada (por ID)` · `hecha`.
Criterio general de «hecha»: CI en verde, `main` jugable, 60 fps, nota en `PROGRESS.md`.

| ID | Tarea | Depende de | Estado |
|---|---|---|---|
| T01 | Bucle de juego a paso fijo (60 Hz) con render interpolado, escalado de canvas responsive, pausa al perder foco | — | libre |
| T02 | Entrada unificada: teclado, mando (Gamepad API) y táctil con botones en pantalla | T01 | bloqueada (T01) |
| T03 | Fondo de **La Moncloa** dibujado por código (cielo, palacio, jardines, columnas) en capa cacheada | T01 | bloqueada (T01) |
| T04 | Plataformas y colisiones (AABB), gravedad, salto | T01 | bloqueada (T01) |
| T05 | Protagonista *Don Presi* con sprite provisional, andar/saltar/aspirar | T02, T04 | bloqueada |
| T06 | Primer enemigo (La Portavoz Airada) con IA simple y estado «aspirado» | T04 | bloqueada |
| T07 | Aspirar y lanzar bola: aplastar enemigos, rebotes, combos | T05, T06 | bloqueada |
| T08 | Resto de enemigos (7) con comportamientos distintos | T06 | bloqueada |
| T09 | Puntuación, vidas, HUD, victoria/derrota, siguiente oleada | T07 | bloqueada |
| T10 | Arte final estilo tebeo: sprites por código/SVG, onomatopeyas, hoja de personajes | T05 | bloqueada |
| T11 | Sonido y música (WebAudio sintetizado) | T07 | bloqueada |
| T12 | PWA/offline, rendimiento en móvil, prueba de 60 fps | T09 | bloqueada |
| T13 | CI: smoke test en navegador headless (arranca, juega 5 s, sin errores JS) | T01 | libre |
