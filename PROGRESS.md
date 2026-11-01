# PROGRESS

- T15 (Arena): captura del canvas a los 3 s del smoke test, subida como artefacto del CI.

**Última actualización:** 2026-11-01 (FETS) — ART-2 (#21): 10 imágenes de enemigos 1-4 en assets/enemigos (poses + derrotado + 2 extras), todo ≤200 KB, prompts en assets/PROMPTS.md. Cupo de la sesión agotado.
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
