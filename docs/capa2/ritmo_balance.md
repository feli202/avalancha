## Resumen

La Capa 2 dura 10–12 h, tiene su propio reinicio (la Fundición) y no agrega sistemas sueltos: el fuego transforma lo que ya existe. Cada nodo de la Red tiene un nivel de fuego que lo cambia; la Escarcha se vuelve eterna; el Relicario, la Cascada, las Mutaciones y las compresiones se liberan; los Defectos ganan 5 cargas. Encima de todo hay tres cosas nuevas: la Temperatura (que sube el exponente de la producción), el Horno (el estrato 9, que funde arena en Vidrio) y el Motor de Brasas (la pantalla central, donde se reparte el calor).

- Monedas nuevas: Brasas (al fundir) y Vidrio (del Horno, todo el tiempo).

- Ritmo: la primera Fundición tarda alrededor de 1 h; después cada vuelta se acelera mucho con cada mejora de fuego.

- Final: la Ignición. La Temperatura llega tan alto que la arena se vuelve plasma, el cuarto estado de la materia. Es el puente a la Capa 3, que cambia las físicas de la pila (derrumbes en diagonal), toca el espacio y el tiempo y tiene a π como símbolo y mecánica.

- Sin velocidad del juego ni Fuelle por ahora: quedan guardados para más adelante.

Los números de este documento son puntos de partida: se calibran en el simulador antes de programar.

## Ritmo, balance e implementación

### Ritmo objetivo (10–12 h activas)

| Hora | Hito |
|---|---|
| 0:00 | Migración; empieza la primera vuelta hacia 1e308 Cristales |
| ~1:00 | Primera Fundición (cinemática de derretido, Motor etapa 1) |
| 1:00–2:00 | Memoria eterna, El Horno, Lecho infinito; primeras vueltas de 20–30 min |
| ~1:30 | DESBORDE (Cascada sin máximo) |
| ~2:30 | METAMORFOSIS; Motor etapa 2 (Horno) |
| ~3:30 | Fallas: cargas 2–5 de los Defectos 1–4 |
| ~4:00 | Escarcha eterna; INERCIA ETERNA; Motor etapa 3 |
| ~5:00 | Fusión del Infinito (Cristales > 1e308; las Brasas empiezan a escalar) |
| ~6:30 | Relicario de fuego completo; Motor etapa 4 |
| ~8:00 | Fallas profundas; ~3.000 K |
| 9:00–11:00 | Vueltas de 3–5 min, cargas 5 de los Defectos, Abismo ardiente y Fusión |
| 10–12 h | Ignición a 5.778 K |

### Reglas de balance

- Simulador primero. Nada de esto se implementa sin que el simulador de la Capa 2 dé la tabla de arriba (±30 min por hito).

- Ninguna fuente pesa más del 40 % de la producción total en ningún momento (desglose por fuente en el simulador y en Estadísticas).

- Huecos: nunca más de 30 min activos sin una compra nueva que se sienta.

- Offline: sigue nerfeado como en la Capa 1 (2 h, 10 %, sin Infinitos ni Fundiciones). La Escarcha eterna crece offline al mismo 10 %.

- No hacer análisis largos de balance si no hacen falta: calibrar con el simulador y una tabla, y listo.

- Todo número de la Capa 2 en log10 o break_infinity, y todas las constantes en un solo archivo de configuración.

### Plan de implementación (orden)

- Migración de partidas terminadas a 1e308 Cristales, con reversión de compras (sección Migración). Tests con partidas reales. Se publica sola, antes que todo lo demás.

- Simulador de la Capa 2 sobre el simulador actual del repo (no sobre el viejo): Fundición, Temperatura, Motor, Horno, nodos de fuego, liberaciones, Defectos con cargas. Calibrar la tabla de ritmo.

- Spec corta en docs/ partida por sistema (fundicion.md, horno.md, red_fuego.md, escarcha_eterna.md, defectos_cargas.md) y una línea en docs/INDICE.md por cada uno.

- Núcleo: Fundición + Brasas + Temperatura + guardado v3 con migración.

- Motor de Brasas y reparto del calor (pantalla del iris, 3 repartos guardados).

- Red de fuego: quinto nivel en los 25 nodos, visual de lava y el quinto cuadradito con forma de llama en el panel.

- El Horno y el Vidrio (estrato 9 encendido, mejoras, visual).

- Escarcha eterna, Relicario de fuego y liberaciones.

- Defectos con 5 cargas.

- Escalado, Ignición, resumen final y test de balance completo de la Capa 2.

- Auditoría, pulido en celular, capturas y publicación.

La guía paso a paso con un prompt por sesión (y qué modelo usar en cada una) va aparte, apuntando a los archivos de docs/ para no gastar créditos leyendo todo.
