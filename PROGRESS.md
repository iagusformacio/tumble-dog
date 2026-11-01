# PROGRESS

**Última actualización:** 2026-11-01 (FETS)

- Estructura base creada: ORDERS, AGENTS, TASKS, CI, Pages, página provisional.
- T01: bucle fijo de 60 Hz, render interpolado, canvas responsive y pausa por pérdida de foco/visibilidad; pruebas automatizadas verdes.
- T02: entrada unificada por teclado, mando (Gamepad API) y controles táctiles; integración básica en `main.js` y pruebas automatizadas.
- T03: fondo original de La Moncloa dibujado por código y cacheado fuera de pantalla; PR #3 pendiente de CI/merge.
- T04 en curso (AGB): plataformas y colisiones AABB (`src/physics.js`), para evitar pisar trabajo paralelo.
- Enlace jugable: disponible en `main` si GitHub Pages está habilitado (en repos privados puede requerir plan de pago).

| Hito | Estado |
|---|---|
| Base del repo | hecho |
| T01 bucle de juego | hecho (CI verde y fusionado en PR #1) |
| T02 entrada unificada | hecho (CI verde y fusionado en PR #1) |
| T03 fondo Moncloa | listo (pruebas locales verdes; pendiente de CI/merge) |
| T04 física de plataformas | en curso (AGB) |
