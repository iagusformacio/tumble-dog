# DESIGN — Tumble Dog v2 (reescritura del 2026-11-01)

Homenaje a **Tumblepop** (Data East, 1991): plataformas de pantalla fija donde aspiras enemigos y los lanzas como bola. No se copia arte, música ni niveles del original; personajes y melodías son inventados.

## Lo que hace bueno a Tumblepop (y está implementado)
- **Aspirar** (mantener X): un cono arcoíris aturde y absorbe a los enemigos que tiene delante. Se pueden llevar **hasta 4**.
- **Si los guardas demasiado se escapan** (aviso a los 3 s, estallan a los 4,6 s y te hieren).
- **Lanzar** (Z): salen como **bola que rueda**, cae por los bordes, **rebota en las paredes** y se rompe tras 4 rebotes. Más enemigos dentro = bola más grande.
- **Combos** por cadena: 100, 200, 400, 800, 1600, 3200, 6400.
- Cada enemigo eliminado suelta **premios** (monedas, gemas, turbo, superaspiradora, pausa, 1UP) y a veces una **burbuja con letra**.
- **T-U-M-B-L-E-D-O-G**: con las 9 letras, **ronda bonus** con lluvia de premios y vida extra.
- **Prisa**: a los 32 s «¡DATE PRISA!» (enemigos furiosos, música más rápida); a los 42 s llega **el Inspector de Hacienda**, invencible, a perseguirte.
- El **último enemigo** se enfada (como en Bubble Bobble).
- **Jefes** en las fases 5 y 10: versiones gigantes que lanzan secuaces (munición) y proyectiles; solo se les hace daño con bolas.
- Se atraviesan las plataformas hacia arriba y hacia abajo (↓ + salto).

## Presentación
- Resolución lógica **1280×720**, HiDPI, simulación fija a 120 Hz.
- Fondo HD de La Moncloa dibujado por código con 5 horas del día (mañana, mediodía, atardecer, ocaso, noche con focos y luz dinámica).
- Sprites del tebeo procesados (recorte del verde, sin halo, escalas coherentes) en `assets/sprites/` con `tools/prepare_assets.py`.
- «Juice»: partículas, confeti, estrellas, ondas, temblor de cámara, hit-stop, squash & stretch, onomatopeyas (¡PAF!, ¡ZAS!, ¡CRAC!), rastro arcoíris de la bola, transición en iris, viñeta, luz nocturna.
- Música y efectos sintetizados (WebAudio), melodías originales.
- **Canción de «Dieta de Marcos» partida en 7 trozos** (título, 4 bares, jefes y ronda bonus) de ~20 s y ~230 KB: se descarga solo el trozo de la escena y se precarga el siguiente, así el título suena enseguida. El modo Arcade no usa trozos (sigue el sintetizador). Cada bucle premonta un fundido cruzado de 0,3 s; cortes, mezcla y ficheros: `tools/split_music.py`; figura: `docs/audio-trozos.png`.
- Controles: teclado, mando y táctil (botones en pantalla al tocar).

## Personajes (todos inventados)
Don Presi (protagonista) y 8 enemigos: La Portavoz Airada (grito), El Tertuliano (lanza «BULOS»), El Asesor Misterioso (rápido, se vuelve invisible), El Influencer Bulero (brinca, dispara corazones), La Activista Municipal (persigue), El Líder Eterno (lento, cuesta aspirarlo), El Barón Regional (persigue y se tira), El Diputado Gruñón (lento, lanza bulos).

## Dónde se toca cada cosa
- Números del juego: `src/config.js`. Fases: `src/stages.js`. Enemigos: `src/enemies.js`.
- Música por escena: `src/audio.js` (un `<audio>` en caché por sección) y `musicForStage` en `src/campaign.js`; trozos en `assets/audio/dieta-de-marcos/`.
- Reglas y estados: `src/game.js`. Efectos: `src/fx.js`. Fondo: `src/background.js`. HUD: `src/hud.js`.
- Arte nuevo: PNG con fondo verde en `assets/` → añadirlo a `tools/prepare_assets.py` → ejecutar el script.
- Enlace jugable: `python3 tools/bundle.py . salida.html`.
