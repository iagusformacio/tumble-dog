# ORDERS — fuente única de verdad (la escribe solo el coordinador)

**Fecha:** 2026-11-01 · **Coordinador:** Claude · **Dueño del proyecto:** Iagus (la persona)

## PRIORIDAD ACTUAL
1. Tener `main` siempre jugable en local (`python3 -m http.server 8000`) y un bucle de juego fluido a 60 fps. El repo es privado: NO hay Pages ni despliegue web.
2. Después, por hitos pequeños y siempre jugables (ver las issues del repo).

## El juego
**Tumble Dog** — homenaje a los arcades de pantalla fija tipo *Tumblepop*: una sola pantalla, plataformas, el protagonista **aspira** a los enemigos, los convierte en bola y los **lanza** para aplastar a los demás.
- **Web, sin build, módulos ES, Canvas 2D.** Máxima calidad: 60 fps estables, controles de teclado, mando y táctil.
- **Una sola pantalla fija** con **el Palacio de la Moncloa de fondo** (dibujado por código/SVG, estilo ilustración propia; no se copian fotos ni obras de nadie).
- **Tono:** sátira política en estilo tebeo clásico español (trazo de la escuela Bruguera: cabezones, golpes, onomatopeyas, humor físico).

## Reparto (DECISIÓN DEL COORDINADOR — NO NEGOCIABLE)
- **Protagonista:** *Don Presi*, un presidente de gobierno **inventado** (traje oscuro, flequillo, sonrisa de político). No es ninguna persona real.
- **Fantasmas/enemigos:** **personajes inventados** que parodian *tipos* de la política (no personas reales, sin nombres ni rasgos reconocibles de nadie): La Portavoz Airada, El Tertuliano, El Asesor Misterioso, El Influencer Bulero, El Líder Eterno de la Oposición, El Barón Regional, La Activista Municipal, El Diputado Gruñón.
- **Motivo:** no hacemos retratos ni parodia realista de personas reales con nombre. Si un agente tiene dudas, elige lo inventado y sigue.

## Reglas de trabajo
1. **Un «continua» = 1 hora de trabajo seguida.** Al acabar una tarea se coge la siguiente sin escribir a la persona ni esperar aprobación.
2. **No preguntar «¿qué autorizas?».** Ante la duda: elegir lo razonable, anotarlo en el PR, seguir.
3. **Cualquier agente hace cualquier tarea.** Se coge la primera **issue** con etiqueta `libre` cuyas dependencias estén `hecha`s. Vale también para un agente nuevo.
4. **Reservar = asignarse la issue y cambiar su etiqueta de `libre` a `en-curso` + comentar «Reservada por <agente>»**, ANTES de empezar. Si ya está `en-curso`, se salta. Al abrir el PR, escribir `Closes #N`; al fusionar, la issue se cierra y se pone `hecha`. **Las issues son la única fuente de verdad del tablero; `TASKS.md` es solo el plan por oleadas y no se usa para reservar.**
5. **Ramas cortas** `agente/ID` → **PR pequeño** (1 tarea ≈ 1 hora). Si el CI pasa, se fusiona sin esperar revisión, salvo cambios de diseño.
6. **Integrar al menos cada hora.** Si quien integra tarda más de 2 h, integra cualquiera.
7. **`main` siempre jugable.** Una sola rama principal, un solo `PROGRESS.md`.
8. **Primero el código, luego el arte.** Si falta un dibujo, se pone un provisional claro.
9. **Entregas parciales cada 15–20 min** (commit/nota corta) sin dejar de trabajar.
10. **Idioma del proyecto: castellano** (código en inglés, textos y notas en castellano).
11. **Disco:** unos 125 MB por agente. Nada de assets pesados; si hacen falta, se generan por código.
12. Si algo choca con una orden nueva de la persona: manda la persona, luego el coordinador, luego esta guía.

## Al empezar cada turno, el agente
1. Lee este fichero y cita la fecha de arriba.
2. Hace `git pull`, lee `PROGRESS.md` y mira las issues abiertas con `gh api repos/iagusformacio/tumble-dog/issues` (`gh issue list` no funciona: GraphQL bloqueado).
3. Coge la primera tarea libre.

## Ahorro de tokens (orden de 2026-11-01)
- El repo es privado: **no hay GitHub Pages ni despliegue**. No se pierde tiempo en eso.
- Documentación mínima: solo se actualiza una línea en `PROGRESS.md` por tarea. Nada de informes largos ni README extra; los PR llevan 3 líneas.
