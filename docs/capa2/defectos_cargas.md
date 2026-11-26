### Defectos con 5 cargas

- Los 8 Defectos ganan las cargas 2 a 5. La carga 1 es la de la Capa 1 (se conserva hecha). Fallas abre las cargas 2–5 de los Defectos 1–4; Fallas profundas, las de los 5–8.

- Cada carga es más dura: la regla del Defecto se aplica con más fuerza y la meta sube: meta_n = meta_1 + k·(n−1) en log10 de Energía.
  - Regla de la carga n: Vacancia, los n colores más caros no multiplican (Violeta, Jade, Coral, Ámbar); Dislocación, Presión ×0,5^n; Macla, Densidad ×0,85^n; Impureza, colores ×0,5^n; Fatiga, ×10^(−n·t/600). Frontera (Densidad = 1), Inclusión y Vidrio son reglas de sí o no: la carga sube solo la meta.
  - k (log10): Vacancia 181.000, Dislocación 152.000, Macla 143.000, Impureza 309.000, Fatiga 292.000, Frontera 14.000, Inclusión 104.000, Vidrio 181.000. Calibrados midiendo hasta dónde llega cada Defecto con la regla de la carga 5 cerca de las 9:30 (Frontera ignora la Temperatura, por eso su k es mucho menor).

- Cada carga da más: la recompensa de la Capa 1 se eleva a 1 + 0,375·(n−1) (carga 5: ^2,5; las que suman, como la Cascada de Impureza o la Densidad de Frontera, ×2,5). Cada carga completa da una sola vez 2, 3, 7 y 14 Brasas (cargas 2 a 5) y M_B ×1,002 permanente.

- Muy difíciles: la carga 5 de cada Defecto tiene que costar intentos y una buena configuración del reparto del calor. Las cargas completas se conservan siempre (no se resetean con la Fundición); con alguna hecha, el Defecto cuenta como completo desde el inicio de cada vuelta. La carga 1 sí se rehace en cada vuelta.
- Bot del simulador: hasta 2 intentos por vuelta, en el tope antes de fundir, la carga más baja primero; abandona como en la Capa 1 pero a los 2 min (ventana de 1 min, meta a más de 5 min, tope 10 min) y reintenta cuando la Temperatura subió ×1,05. En el simulador las cargas 2 empiezan a las ~4:30, las 5 de los Defectos 1–4 llegan entre 9:30 y 9:56 y las de los 5–8 entre 9:42 y 9:56 (justo antes de la Ignición).
