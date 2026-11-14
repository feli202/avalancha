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

Capa 1 — Cristalización (agregar al final de CLAUDE.md)
Estamos construyendo la Capa 1. La spec es `SPEC_CAPA1.md`; leela entera antes de cada hito C1–C14 (sección 16) y seguí el orden.
Constantes de la Capa 1: solo en `balance/config_capa1.json`. Los datos de los nodos de la Red, Defectos y reliquias se leen de ahí: agregar un nodo no debería requerir tocar código.
`balance/sim_capa1.py` es el simulador de referencia de la Capa 1. `python3 balance/sim_capa1.py` tiene que dar la tabla de la sección 2 de `SPEC_CAPA1.md` (±0,1 h). Tarda unos minutos.
`balance/probe.py` mide hasta dónde llega el jugador en un Defecto a una hora dada; úsalo si cambia una meta.
Si un cambio toca el balance: primero simulador, después `SPEC_CAPA1.md`, después código. Nunca al revés.
Todo número grande de la Capa 1 (Cristales, `s_k` de los estratos, espesor de la Escarcha) vive en log10 o break_infinity.
La escena three.js de los Estratos se crea al entrar a su pantalla y se destruye al salir. Medí fps antes de cerrar C5.
Llevá `PROGRESO.md` al día: hito actual, qué quedó hecho, qué falta, decisiones tomadas.
