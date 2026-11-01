# ART — guía de imágenes

**Cupo:** 10 imágenes por agente y sesión. Se gastan todas, en issues `ART-n`.

## Estilo
- Tebeo clásico español (escuela Bruguera): cabezones, trazo negro grueso, colores planos y vivos, expresiones exageradas, humor físico.
- Vista lateral (el juego es de pantalla fija con scroll cero), personajes mirando a la derecha.
- Fondo **liso de un solo color** (verde chroma #00FF00) para poder recortarlo; sin sombras en el suelo ni texto dentro de la imagen, salvo onomatopeyas.
- Un personaje por imagen. Hoja de poses: cuadrícula alineada, mismo tamaño de celda, misma escala entre poses.

## Prohibido
Personas reales (ni parecidos reconocibles, ni nombres, ni siluetas características). Personajes de otros (Mortadelo y Filemón, etc.). Logotipos y marcas. Texto legible de partidos o siglas reales.

## Cómo se guarda
- `assets/<tipo>/<nombre>.png` (`personajes`, `enemigos`, `escenario`, `ui`).
- `assets/PROMPTS.md`: una línea por imagen con ruta, prompt y la herramienta usada.
- Máximo 200 KB por imagen y 125 MB de disco por agente: reducir antes de commitear.
- Los PR de arte llevan la etiqueta `arte` y `Closes #N`.
