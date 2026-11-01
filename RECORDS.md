# RECORDS — registro global de partidas (ESPECIFICACIÓN para un agente)

**Objetivo:** que cada partida que se juegue, **desde cualquier sitio**, quede registrada y exista un **récord global** (puntuación máxima). Hoy el récord solo vive en `localStorage` de cada navegador (`tumbledog-hi`).

## Qué se registra por partida
`{ id, fecha (UTC), puntos, fase_alcanzada, vueltas (legislaturas), duración_s, iniciales (3 letras), dispositivo (táctil|teclado|mando), versión_juego }`

## Requisitos
1. **Registro:** al terminar una partida (Game Over o final) el juego envía el resultado a un servicio externo. Si falla (sin red), se guarda en `localStorage` y se reenvía luego. **El juego nunca se bloquea ni da error por esto.**
2. **Récord global:** el juego descarga el Top 10 y muestra «RÉCORD MUNDIAL» en el título y en el HUD. Si no hay red, usa el récord local.
3. **Pantalla de iniciales:** al entrar en el Top 10, se piden 3 letras (teclado, mando o táctil).
4. **Antitrampas básico:** el servidor valida rangos (puntos máx. plausibles por fase, duración mínima) y limita envíos por IP. No hace falta nada más.
5. **Privacidad:** no se guardan datos personales; las iniciales son opcionales.
6. **Tests:** el cliente (`src/records.js`) debe funcionar con un servicio simulado; `npm test` en verde.

## DECISIONES QUE FALTAN (las toma la persona)
- **Dónde vive el servicio** (necesita un backend aunque sea mínimo). Opciones: Supabase, Firebase, Cloudflare Worker + KV/D1, o un servidor propio. El juego es una página estática: no puede guardar datos compartidos por sí sola.
- **URL pública y clave de solo-escritura** del servicio (la clave de cliente va en `src/config.js`, nunca claves de administrador en el repo).
- Si el repo sigue privado, el juego se aloja donde la persona decida; el servicio debe aceptar peticiones (CORS) desde ese dominio.

## Fases para el agente
1. `src/records.js`: cliente (enviar, descargar Top 10, cola offline) con servicio intercambiable.
2. Integrar en `src/game.js`: enviar al terminar; pedir iniciales; mostrar récord mundial en título/HUD.
3. Servicio y esquema (tabla `partidas` + vista Top 10) según lo que decida la persona.
4. Tests y nota en `PROGRESS.md`.

> Nota: el enlace jugable publicado como artefacto de Claude **bloquea las peticiones a otros dominios**; el registro global solo funcionará en el juego alojado fuera de ahí.
