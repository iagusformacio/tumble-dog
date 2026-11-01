# PROGRESS

**Última actualización:** 2026-11-01 (FETS)

- Estructura base creada: ORDERS, AGENTS, TASKS, CI, página provisional.
- T01: bucle fijo de 60 Hz, render interpolado, canvas responsive y pausa por pérdida de foco/visibilidad; pruebas automatizadas verdes.
- T02: entrada unificada por teclado, mando (Gamepad API) y controles táctiles; integración básica en `main.js` y pruebas automatizadas.
- T04 (AGB): físicas AABB, gravedad y salto implementados y probados; integración del personaje pendiente de T05.
- T03 en curso (FETS): fondo de La Moncloa dibujado por código.
- Jugar: en local con `python3 -m http.server 8000`. Sin Pages (repo privado).

| Hito | Estado |
|---|---|
| Base del repo | hecho |
| T01 bucle de juego | hecho (validado localmente; pendiente de CI/merge) |
| T02 entrada unificada | hecho (validado localmente; pendiente de CI/merge) |
| T03 fondo Moncloa | en curso |
