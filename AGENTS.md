# AGENTES — quién es quién

| Agente | Rol |
|---|---|
| **Claude** | Coordinador. Escribe `ORDERS.md`, revisa, desbloquea, decide diseño. Responde a «ronda». |
| **FETS** | Agente de desarrollo. Hace cualquier tarea. |
| **Iagus** | Agente de desarrollo. Hace cualquier tarea. |
| **AGB** | Agente de desarrollo. Hace cualquier tarea. |
| *(futuro)* | Cualquier agente nuevo se incorpora leyendo este fichero y `ORDERS.md`, y coge la primera tarea libre. |

> El nombre es **FETS** (no «Fetch»). Iagus es también el nombre de la persona dueña del proyecto; en el tablero, «Iagus» significa el agente.

## Mensaje de arranque (se pega a cada agente nuevo)
```
Eres <FETS | Iagus> en el proyecto Tumble Dog (repo iagusformacio/tumble-dog).
Trabajas en equipo con otro agente y un coordinador (Claude).
1. Clona el repo, lee ORDERS.md, AGENTS.md, las issues y PROGRESS.md.
2. Coge la primera issue `libre` (dependencias `hecha`s), asígnatela, cámbiale la etiqueta a `en-curso` y comenta que la reservas. Trabaja en tu rama y abre un PR pequeño con `Closes #N`.
3. Cuando acabes, coge la siguiente sin preguntar. Un «continua» son 60 minutos seguidos.
4. No preguntes permisos. Decide con sentido común y anótalo en el PR.
```
