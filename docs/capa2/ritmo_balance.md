## Resumen

La Capa 2 dura 10–12 h, tiene su propio reinicio (la Fundición) y no agrega sistemas sueltos: el fuego transforma lo que ya existe. Cada nodo de la Red tiene un nivel de fuego que lo cambia; la Escarcha se vuelve eterna; el Relicario, la Cascada, las Mutaciones y las compresiones se liberan; los Defectos ganan 5 cargas. Encima de todo hay tres cosas nuevas: la Temperatura (que sube el exponente de la producción), el Horno (el estrato 9, que funde arena en Vidrio) y el Motor de Brasas (la pantalla central, donde se reparte el calor).

- Monedas nuevas: Brasas (al fundir) y Vidrio (del Horno, todo el tiempo).

- Ritmo: la primera Fundición es apenas empieza la capa (la partida ya está en 1e308); la vuelta que sigue tarda alrededor de 1 h y después cada vuelta se acelera mucho con cada mejora de fuego.

- Final: la Ignición. La Temperatura llega tan alto que la arena se vuelve plasma, el cuarto estado de la materia. Es el puente a la Capa 3, que cambia las físicas de la pila (derrumbes en diagonal), toca el espacio y el tiempo y tiene a π como símbolo y mecánica.

- Sin velocidad del juego ni Fuelle por ahora: quedan guardados para más adelante.

Los números de `docs/capa2/` están calibrados con `balance/sim_capa2.py` (fase 2, 2026-11-26); las constantes viven solo en `balance/config_capa2.json`. Si un número de la doc y el simulador no coinciden, manda el simulador.

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

### Calibración (`python balance/sim_capa2.py`, jugador que revisa cada 15 s)

Arranca en la partida real de fin de Capa 1 migrada a 1e308 y funde a las 0:00 (la partida ya está en el tope: la primera Fundición es inmediata y da 1 Brasa para Memoria eterna; la vuelta larga y despareja es la que sigue). Hito "en rango" = ±30 min de la ventana.

| Hito | Objetivo | Sim |
|---|---|---|
| Primera Fundición | 0:00 | 0:00 |
| Memoria eterna (primera vuelta) | 0:00–1:00 | 0:13 |
| Fin de la primera vuelta (2.ª Fundición) | ~1:00 | 1:10 |
| Lecho infinito (LECHO) | 1:00–2:00 | 1:11 |
| DESBORDE | ~1:30 | 1:45 |
| El Horno (Motor etapa 2) | 1:00–2:00 y ~2:30 | 2:14 |
| METAMORFOSIS | ~2:30 | 2:39 |
| Fallas | ~3:30 | 3:22 |
| Escarcha eterna (Motor etapa 3) | ~4:00 | 3:52 |
| INERCIA ETERNA | ~4:00 | 4:11 |
| Fusión del Infinito | ~5:00 | 5:26 |
| Relicario de fuego (Motor etapa 4) | ~6:30 | 6:30 |
| Fallas profundas | ~8:00 | 8:05 |
| 3.000 K | ~8:00 | 8:28 |
| Vueltas de 3–5 min (desde ahí, todas ≤ 5 min) | 9:00–11:00 | 9:33 |
| Abismo ardiente | 9:00–11:00 | 9:43 |
| Fusión (Ruptura II) | 9:00–11:00 | 9:48 |
| Cargas 5 de los 8 Defectos | 9:00–11:00 | 9:56 |
| **Ignición (5.778 K)** | 10–12 h | **9:56** |

20/20 en rango. 106 vueltas; las vueltas 2.ª a 4.ª duran 33, 29 y 25 min; ninguna pasa de 20 min después de la 5.ª.

- **Fuentes** (log10 V al fundir, desde la 2.ª vuelta): la más pesada llega a **40,3 %** (Presión, vuelta 14, ~3:58); el resto del tiempo todas quedan ≤ 40 %. Al empezar, la partida real (fin de Capa 1) tiene la Escarcha en 89 %: es el estado de la Capa 1 y no cuenta.
- **Huecos**: el más largo es de **34,8 min**, en la primera vuelta (Esquirla de fuego/Geoda nv1 a las 0:20 y nv2 a las 0:55). Con eso, estas dos reglas quedan apenas fuera.
- **Robustez**: revisando cada 60 s entran 13/20 (casi todo llega entre 10 y 50 min más tarde y las cargas 5 no terminan antes de la Ignición), parecido a la columna de 60 s de la Capa 1.
- **Sensible**: cambios chicos (redondear un parámetro) corren eventos discretos (cargas, compras) y mueven hitos de a decenas de minutos. Recalibrar con el simulador, nunca a mano.
- **Antes de la Fusión** (4:00–5:26) las vueltas duran 1,5–2 min: sin Fusión cada Fundición da M_B Brasas, así que conviene fundir lo más seguido posible. Después de la Fusión vuelven a 6–8 min y bajan a 2–5 min al final.
- **Cristales**: e450 a las 6:40, e520 a las 8:00, e700 a las 9:30 y ~e1.000 en la Ignición (no llegan a e1e6).

### Reglas de balance

- Simulador primero. Nada de esto se implementa sin que el simulador de la Capa 2 dé la tabla de arriba (±30 min por hito). Ajustar con `python balance/tune_capa2.py '{...}'` (cambia el config en memoria).

- Ninguna fuente pesa más del 40 % de la producción total en ningún momento (desglose por fuente en el simulador y en Estadísticas). El simulador lo mide al fundir, desde la 2.ª vuelta, con log10 V (la Densidad y la Temperatura multiplican todo y no son fuente).

- Huecos: nunca más de 30 min activos sin una compra nueva que se sienta. Cuentan: nodos de fuego, mejoras del Horno, Esquirla de fuego y Geoda, mejoras de la Escarcha eterna, cargas y cada Fundición.

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
