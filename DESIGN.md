# DESIGN — cómo es Tumble Dog (decisiones del coordinador, 2026-11-01)

Referencia de género: arcades de pantalla fija tipo *Tumblepop*. No se copia arte, sonido ni niveles de nadie.

## Pantalla y feeling
- Resolución lógica **320×224**, escalada a la ventana con píxel nítido. Una sola pantalla fija, **La Moncloa de fondo**.
- Paso fijo **60 Hz**, render interpolado. Objetivo: 60 fps estables también en móvil.
- «Fluido» = respuesta inmediata: sin retraso de entrada, salto con **coyote time** (6 frames) y **buffer de salto** (6 frames), aceleración corta al andar.
- **Todos los números del feeling viven en `src/config.js`.** Ajustar el juego = cambiar un número, nunca reescribir lógica.

## Bucle de juego
1. Aparece una **oleada** de enemigos en las plataformas.
2. Don Presi los **aspira** (mantener acción, rango corto frente a él). Un enemigo aspirado se encoge y entra en la boquilla.
3. Con un enemigo dentro, Don Presi puede **lanzarlo**: sale como **bola** en línea recta, rebota en paredes y suelo.
4. La bola **elimina** a los enemigos que toca (cadena). Si toca varios, **combo**: 100, 200, 400, 800 puntos.
5. Sin enemigos → siguiente oleada (más enemigos o más rápidos).
6. **3 vidas.** Tocar a un enemigo libre cuesta una vida, con 2 s de invulnerabilidad al reaparecer.
7. Un enemigo aspirado tarda en escaparse si no se lanza (**3 s**), para que haya tensión.

## Controles
- Teclado: A/D o flechas mover · Espacio salto · X aspirar · Z lanzar.
- Mando: stick/cruceta, A salto, X aspirar, B lanzar.
- Táctil: botones en pantalla (izquierda/derecha, salto, aspirar, lanzar).

## Personajes (TODOS INVENTADOS — ver ORDERS.md)
- **Don Presi:** presidente ficticio, traje oscuro, flequillo, sonrisa de político.
- **Enemigos (8):** La Portavoz Airada, El Tertuliano, El Asesor Misterioso, El Influencer Bulero, El Líder Eterno de la Oposición, El Barón Regional, La Activista Municipal, El Diputado Gruñón. Cada uno con **un comportamiento distinto** (p. ej. salta, dispara bulos, se esconde, corre en línea recta).
- Estilo visual: tebeo clásico español (cabezones, líneas gruesas, onomatopeyas «¡PAF!», «¡ZAS!»). Sin personajes ni nombres protegidos.

## Calidad
- Todo se entiende sin manual: el primer nivel enseña aspirar y lanzar con una pista en pantalla.
- Cada PR con cambios visibles pasa por el smoke test del CI y, cuando exista, adjunta captura.
- Prueba humana de 10 minutos al final de cada oleada de tareas.
