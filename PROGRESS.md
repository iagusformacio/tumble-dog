# PROGRESS

- A7 (#57, 2026-11-02): 10 imágenes de los jefes de campaña (Cocinero de la Plancha y Presentador del Bingo: reposo/atacar/herido/derrotado/enfadado), chroma #00FF00, ≤200 KB, sprites WebP registrados en `tools/prepare_assets.py` (bloque A7) y `src/sprite-list.js`, prompts en `assets/PROMPTS.md`.
- A4 (arena/79932f6e, #57): escenario y UI de «Dieta de Marcos» — 4 fondos de bar valenciano 1280×720 (barra, terraza, mercado, chiringuito), bola de vómito, logo del título y onomatopeyas ¡BLEEEH! ¡GLUP! ¡PLAF! en assets/ + bloque propio en tools/prepare_assets.py (fondos sin croma, UI recortada) y sprites en assets/sprites/; 9 imágenes ≤200 KB.
- A1 (#56): diez poses originales de Marcos en `assets/personajes/`, sprites normalizados en `assets/sprites/`, prompts registrados y generación reproducible; 12/12 tests de `npm test`.
- V2-6 (#53): joystick táctil con salto y palancas independientes; prueba multitáctil en Chromium.
- Jefe: arte propio de jefes (10 imágenes, norma 20) — boss-tertuliano y boss-lider (walkA/walkB/stun/down/shout) en assets/enemigos/, registrados en src/sprite-list.js y src/boss.js actualizado para usarlos; 11/11 tests verdes.

- Rescate de #40 (AGB): integrado el arte de FETS tras resolver el conflicto en `assets/PROMPTS.md` y registradas en `ASSET_MANIFEST` las hojas de poses ART-3 de enemigos 5-8; test de manifiesto para los 8 tipos.
- Arte de sesión (FETS, norma 20): 10 imágenes PNG8 ≤52 KB — derrotados y retratos de enemigos 5-8 (`lider`, `baron`, `activista`, `diputado`), icono de vida y cartel Game Over en `assets/` + registrados en `src/assets.js` y `assets/PROMPTS.md`.
- Mejoras de juego (FETS, sin issue libre): bug del lanzamiento (T07) — el portador queda encerrado dentro de la bola, la bola no le aplasta y lo libera al morir; tests nuevos `tests/enemies.test.js` y `tests/ball.test.js`; 78/78 tests verdes.
- T16 (FETS, #19): pantalla de título («TUMBLE DOG», controles, «pulsa Z o ESPACIO para jugar») y tutorial del primer nivel (pista amarilla: X aspira, Z lanza, solo en la oleada 1); `src/hud.js` nuevo (HUD, título, finales, pausa); 76/76 tests verdes.
- T11 (FETS, #13): sonido y música sintetizados por WebAudio en `src/audio.js` (melodía chiptune estilo tebeo, salto, aspirado, captura, lanzamiento, rebote, combo y daño, tecla M para silenciar); 49/49 tests verdes.
- T09 (Arena, #11): HUD completo (puntos, corazones de vida, oleada), oleadas con más enemigos y más rápidos (`CONFIG.wave`), victoria al limpiar la oleada 5 y GAME OVER a 0 vidas con reinicio con Z/ESPACIO; 65 tests verdes.
- ART-3 (Arena-3dd4b340, #22): 10 imágenes originales de enemigos 5-8 (Líder Eterno, Barón Regional, Activista Municipal y Diputado Gruñón) con poses andar/aspirado, 4 hojas derivadas, chroma #00FF00, ≤200 KB y prompts en `assets/PROMPTS.md`.
- T10 (FETS, #12): `src/assets.js` integra hojas de sprites estilo tebeo (recorte de viñeta, chroma #00FF00 con despill y caché), fondo de Moncloa, retratos/UI y onomatopeyas («¡GLUP!», «¡ZAS!», «¡PAF!») con fallback por código; 46/46 tests verdes.
- Arte de sesión (AGB, norma 20): 10 imágenes ≤200 KB — fondo completo de palacio inventado en assets/escenario y, en assets/ui, retratos de Don Presi y enemigos 1-4 para HUD/título (el de la Portavoz, recorte de ART-2: el generador lo bloqueó), efectos de polvo/aturdido, flecha de tutorial y «¡CRAC!»; prompts en assets/PROMPTS.md.
- T08 (Arena, #10): los 8 enemigos inventados en pantalla, cada uno con comportamiento propio (Tertuliano dispara bulos, Asesor se esconde, Influencer corre sin pausa, Líder salta alto, Barón es lento y grande, Activista patrulla errática y salta, Diputado da ráfagas); los aplastados reaparecen solos; 53 tests verdes.
- T14 (FETS): constantes de física, pantalla y jugador migradas a `src/config.js`; añadidos coyote time y buffer de salto (6 frames) con pruebas.
- T07 (Arena, #9): lanzar la bola — rebota en paredes/suelo/plataformas, aplasta enemigos en cadena con combo 100/200/400/800 (`src/ball.js`, `launchBall` en `src/enemies.js`, estado «defeated» en `src/enemy.js`); tests verdes.
- T15 (Arena): captura del canvas a los 3 s del smoke test, subida como artefacto del CI.

**Última actualización:** 2026-11-01 (AGB) — mejora del bucle fijo: máximo 5 pasos de recuperación por frame y descarte del backlog tras pausas largas; prueba de regresión añadida.
- ART-1 Don Presi (AGB, fusionado): diez poses en PNG optimizados, hoja 5×2 y prompts añadidos; falta integrarlos desde `src/assets.js`.

- Estructura base creada: ORDERS, AGENTS, TASKS, CI, página provisional.
- T01: bucle fijo de 60 Hz, render interpolado, canvas responsive y pausa por pérdida de foco/visibilidad; pruebas automatizadas verdes.
- T02: entrada unificada por teclado, mando (Gamepad API) y controles táctiles; integración básica en `main.js` y pruebas automatizadas.
- T05 (AGB): protagonista provisional con movimiento, salto y aspiración visual; captura pendiente de T07.
- T04 (AGB): físicas AABB, gravedad y salto implementados y probados; integración del personaje pendiente de T05.
- T03 en curso (FETS): fondo de La Moncloa dibujado por código.
- T13 (Iagus): smoke test en CI con Playwright (Chromium headless): arranca, juega 5 s con pulsaciones y falla si hay errores JS en consola; servidor local `npm run serve`, smoke en local `npm run test:smoke`. Siguiente de Iagus: T06 (issue #8).
- T06 (Arena-GPT): primer enemigo, La Portavoz Airada: patrulla su plataforma (pausa al girar), Don Presi la aspira con la boquilla, se escapa a los 3 s mareada, respawn si se queda el nivel vacío y quita una vida al tocarte (2 s de invulnerabilidad). Arte provisional por código; el PNG de `assets/enemigos/` se integrará en T10.
- Jugar: en local con `python3 -m http.server 8000` o `npm run serve`. Sin Pages (repo privado).

| Hito | Estado |
|---|---|
| Base del repo | hecho |
| T01 bucle de juego | hecho (validado localmente; pendiente de CI/merge) |
| T02 entrada unificada | hecho (validado localmente; pendiente de CI/merge) |
| T03 fondo Moncloa | en curso |
| T13 smoke test CI | hecho |
- A5 (arte, sesión 2026-11-02): Jefa de Sala del Bar Pols con 10 poses (reposo, andar A/B, bandeja, grito, herida, derrotada, enfadada, victoria, retrato) en `assets/enemigos/jefa-sala-*.png` + hoja derivada; sprites `boss-jefa-*` en `assets/sprites/`.
