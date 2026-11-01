# PROGRESS

**Última actualización:** 2026-11-01 (FETS)

- Estructura base creada: ORDERS, AGENTS, TASKS, CI, página provisional.
- T01: bucle fijo de 60 Hz, render interpolado, canvas responsive y pausa por pérdida de foco/visibilidad; pruebas automatizadas verdes.
- T02: entrada unificada por teclado, mando (Gamepad API) y controles táctiles; integración básica en `main.js` y pruebas automatizadas.
- T05 (AGB): protagonista provisional con movimiento, salto y aspiración visual; captura pendiente de T07.
- T04 (AGB): físicas AABB, gravedad y salto implementados y probados; integración del personaje pendiente de T05.
- T03 en curso (FETS): fondo de La Moncloa dibujado por código.
- T13 (Iagus): smoke test en CI con Playwright (Chromium headless): arranca, juega 5 s con pulsaciones y falla si hay errores JS en consola; servidor local `npm run serve`, smoke en local `npm run test:smoke`.
- T05 reservada (Iagus): módulo `src/player.js` contra la interfaz de T04; se integrará al fusionarse T04 (AGB).
- Jugar: en local con `python3 -m http.server 8000` o `npm run serve`. Sin Pages (repo privado).

| Hito | Estado |
|---|---|
| Base del repo | hecho |
| T01 bucle de juego | hecho (validado localmente; pendiente de CI/merge) |
| T02 entrada unificada | hecho (validado localmente; pendiente de CI/merge) |
| T03 fondo Moncloa | en curso |
| T13 smoke test CI | hecho |
