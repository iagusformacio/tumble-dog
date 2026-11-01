# PROGRESS

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
