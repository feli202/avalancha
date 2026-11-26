# Capa 1 · Bucle, producción y balance

Constantes: **solo** `balance/config_capa1.json`. Referencia: `balance/sim_capa1.py` (si un número de la doc y el simulador no coinciden, manda el simulador). Medir metas: `balance/probe.py`.

## Qué es

Al primer Infinito la pila se cristaliza y aparece **Cristalización**, con su moneda (**Cristales**) y cinco sistemas que se abren de a uno: [Relicario](relicario.md), [Red](red.md), [Estratos](estratos.md) (con Romper el Infinito), [Defectos](defectos.md) (4 + 4) y [Escarcha](escarcha.md). Publicado como 1.0 (fin de la Capa 1). Hitos internos:

- **Fin 1.1**: Estrato 8 con `s_8 ≥ 100` teniendo Vacancia, Dislocación, Macla e Impureza → abre la Escarcha y el anillo 3.
- **Fin de la capa**: 1e308 Cristales totales (`finCapa1`) → pantalla "Capa 2 próximamente".

Progresión horizontal: siempre 2–3 cosas para empujar. Offline siempre rinde menos que activo ([offline.md](offline.md)).

## Bucle

1. Arena igual que la Capa 0 hasta 1e308 → **Infinito** → Cristales + reliquia.
2. Cristales en la Red y (con el Infinito roto) en los Estratos.
3. La Arena vuelve a empezar mucho más rápido (Red conserva compresiones y automatiza; Estratos y Relicario multiplican).
4. Defectos: un Infinito con una regla rota, recompensa permanente.
5. Romper el Infinito (Ruptura nv1): la Energía pasa 1e308, los Cristales escalan con cuánto la pasás; la Arena entra en softcap más allá de 1e308.
6. Escarcha: crece sola hasta su Punto de ruptura; romperla da Esquirlas.

**Se conserva en un Infinito**: Cristales, Red, Relicario, Estratos (con su arena), Defectos, Escarcha. **Se reinicia**: todo lo de la Arena, salvo lo que conserven Memoria y Sedimentación nv4.

## Producción completa

```
log10(producción/s) = log10(Caudal) + log10(K × G) + D × log10 V − (Fatiga: t/600)
log10 V = colores + anillos + cascada + mutaciones          (Capa 0)
        + Presión + Eco + Cauce + Escarcha                    (Capa 1)
D       = 1 + 0,12 × compresiones + Compactación + Compactación II + (0,2 si Frontera)
```

Estadísticas (estilo AD): desglose de log10 V por fuente (`desglose.ts`).

## Duración (desde el primer Infinito; `python balance/sim_capa1.py --robustez`)

| Hito | 15 s | 60 s | 5 min |
|---|---|---|---|
| Segundo Infinito | 0,89 h | 1,03 h | 2,00 h |
| Romper el Infinito | 1,39 h | 1,70 h | 3,67 h |
| Estratos (primero abierto) | 1,89 h | 2,55 h | 6,17 h |
| Memoria completa | 2,56 h | 3,71 h | 10,51 h |
| Vacancia | 2,60 h | 3,74 h | 10,54 h |
| Dislocación | 3,99 h | 5,10 h | 11,68 h |
| Macla | 4,65 h | 5,75 h | 12,28 h |
| Impureza | 5,92 h | 7,04 h | 13,54 h |
| **Fin 1.1** | **7,39 h** | 8,50 h | 14,98 h |
| Fatiga | 9,69 h | 10,81 h | 17,29 h |
| Frontera | 13,14 h | 14,29 h | 20,83 h |
| Inclusión | 13,43 h | 14,37 h | 20,93 h |
| Vidrio | 13,88 h | 15,41 h | 21,99 h |
| **Fin de la capa** | **14,03 h** | 15,64 h | 22,21 h |

Medida con la Escarcha con Punto de ruptura recalibrada (2026-11-25, [escarcha.md](escarcha.md)): 42 rupturas (39 a 60 s, 37 a 5 min), hueco máximo entre compras 30,2 min (< 40; el de 5 min tiene 100 min, sin test); el núcleo real da 9,86 / 12,98 / 13,27 / 13,86 / 14,01 h. Ganar un Defecto cuenta como compra.

Peso de cada fuente en log10 V:

| | Colores | Anillos | Cascada | Mutaciones | **Presión** | Eco | Cauce | Escarcha |
|---|---|---|---|---|---|---|---|---|
| Fin 1.1 | 19 % | 2 % | 4 % | 0 % | **58 %** | 13 % | 5 % | — |
| Fin capa | 13 % | 1 % | 2 % | 0 % | **66 %** | 9 % | 4 % | 5 % |

(La Escarcha medida en el instante del último Infinito, justo después de romperse; a mitad de su ciclo pesa mucho más, ver [escarcha.md](escarcha.md).)

La Presión es el motor a propósito. Si con jugadores "solo importan los estratos": bajar `estratos.w_base_por_profundidad` y subir `escarcha.g_log10_por_s`, siempre con el simulador.

Notas que siguen vigentes:
- El jugador de 5 min queda muy atrás porque hasta Memoria nv4 cada Infinito espera a que mire (decisión del usuario: no hay Memoria más barata).
- Abrir un estrato multiplica la producción al instante: E1 ×1e2,3 … E8 ×1e113,4 (mínimo pedido ×100).
- El softcap casi no mueve la capa (frena Mutaciones y colores altos en Defectos largos, ~0,1 h cada uno).
- La segunda corrida (~1 h) es intencional: enseña que volver a empezar ahora es rápido.

## Test de balance (`tests/balance_capa1.test.ts`, "lento": `npm run test:lento`)

Núcleo real con el bot de `sim_capa1.py` (15 s, pasos 0,5/1/2 s), ±10 %:
- La columna de 15 s entera; Estratos nunca antes que Romper.
- Fin de la capa en 14–16 h; ninguna fuente de log V > 65 % al final.
- El bot rompe la Escarcha al llegar al Punto de ruptura (o Deshielo) y gasta Esquirlas en lo más barato entre Crecimiento, Brillo, Umbral y pulir una pieza engarzada.
- Hueco máximo entre compras (desde la hora 1,5) < 40 min.
- 12 h offline < 12 h activas.

El bot del Infinito automático usa el modo "óptimo" (salió de la interfaz; el núcleo lo conserva solo para el bot). Con ×10 el bot no termina la 1.1.

## Problemas a evitar

1. Bucles multiplicativos (Cristales → Presión → Cristales): costos cúbicos de estratos, blando sobre 1e50, Escarcha con tope. Todo efecto que escale con Cristales va primero al simulador.
2. Esperas vacías: hueco > 40 min hace fallar el test.
3. Defectos imposibles o triviales: metas de `probe.py`, no a ojo.
4. Elección frustrante: sin azar en el Relicario.
5. Números grandes en log10 o break_infinity (`s_k`, `logX`, Cristales).
6. Rendimiento: la única escena WebGL es la pila; Red en SVG, Estratos en canvas 2D con worker.
7. Monedas: Esquirlas recién con la Escarcha.
8. Red ilegible: rombo, 4 colores, nada de árbol clásico.
9. Offline mejor que activo: prohibido (test).
10. Interfaz "de IA": nada de tarjetas con sombra y gradiente ni emojis.

## Qué es aproximado

- El bot elige con reglas simples; una persona irá algo más rápido o más lento.
- Corridas del final de 30–60 min. Si se sienten largas: bajar `cristales.blando_factor` y recalibrar `escarcha.g_por_presion`.
- Frontera e Inclusión quedan a ~30 min una de otra (se separan subiendo el requisito de Inclusión).

## Ganchos para la Capa 2

Anillo 4 de la Red (solo datos en config), builds guardadas y cuarto tipo de reliquia, estratos 9+ y "presión inversa" (el noveno estrato vacío es el futuro Horno), un tercer grupo de Defectos que mezcla reglas, Escarcha permanente como recompensa.
