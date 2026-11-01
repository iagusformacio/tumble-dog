# Tumble Dog

Arcade web de pantalla fija, homenaje a *Tumblepop*: aspira enemigos, conviértelos en bola y lánzalos. Sátira política en estilo tebeo clásico, con La Moncloa de fondo y personajes inventados.

- Canvas 2D, módulos ES, sin build.
- Probar en local: `python3 -m http.server 8000` y abrir http://localhost:8000
- Tests: `npm test`
- Sprites: `python3 tools/prepare_assets.py` (recorta el verde y genera `assets/sprites/` y `src/sprite-list.js`)
- Un solo HTML jugable: `python3 tools/bundle.py . tumble-dog.html`
- Diseño y controles: `DESIGN.md`
- Cómo trabajamos: ver `ORDERS.md`, `AGENTS.md`, `TASKS.md`.
