## Capa 1 — Cristalización (agregar al final de CLAUDE.md)

- Estamos construyendo la **Capa 1**. La spec es `SPEC_CAPA1.md`; leela entera antes de cada hito C1–C14 (sección 16) y seguí el orden.
- Constantes de la Capa 1: **solo** en `balance/config_capa1.json`. Los datos de los nodos de la Red, Defectos y reliquias se leen de ahí: agregar un nodo no debería requerir tocar código.
- `balance/sim_capa1.py` es el simulador de referencia de la Capa 1. `python3 balance/sim_capa1.py` tiene que dar la tabla de la sección 2 de `SPEC_CAPA1.md` (±0,1 h). Tarda unos minutos.
- `balance/probe.py` mide hasta dónde llega el jugador en un Defecto a una hora dada; úsalo si cambia una meta.
- Si un cambio toca el balance: primero simulador, después `SPEC_CAPA1.md`, después código. Nunca al revés.
- Todo número grande de la Capa 1 (Cristales, `s_k` de los estratos, espesor de la Escarcha) vive en log10 o break_infinity.
- La escena three.js de los Estratos se crea al entrar a su pantalla y se destruye al salir. Medí fps antes de cerrar C5.
- Llevá `PROGRESO.md` al día: hito actual, qué quedó hecho, qué falta, decisiones tomadas.
