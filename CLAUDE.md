# Avalancha — instrucciones para Claude Code

Juego incremental web sobre una pila de arena abeliana. Estamos construyendo la **Capa 0** (del primer grano al primer Infinito).

- La especificación completa está en `SPEC.md`. Leela entera antes de empezar y seguí el plan de hitos de la sección 9, en orden.
- Las constantes de balance viven **solo** en `balance/config.json`. Nunca escribas números de balance en el código.
- `balance/sim.py` es el simulador de referencia (Python 3, sin dependencias). `python3 balance/sim.py` debe dar los tiempos de la sección 2 de `SPEC.md`.
- La economía (`src/core/`) es pura y determinista: sin DOM, sin `Date.now()`, sin aleatoriedad. Todo lo visual va aparte.
- `tests/balance.test.ts` usa el núcleo real del juego. Tiene que pasar al terminar cada hito.
- Si un cambio toca el balance: primero simulador, después `SPEC.md`, después código.
- Textos de interfaz en español rioplatense, en un archivo de cadenas (nunca en los componentes).
- Antes de dar un hito por terminado, abrí el juego y miralo funcionando (60 fps, nada roto en móvil).
- Al terminar una tarea, actualizá `PROGRESO.md`.
