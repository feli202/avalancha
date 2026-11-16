# Avalancha — Especificación de la Capa 1: Cristalización

> Continúa `SPEC.md` (Capa 0, "Arena"). Todo lo que no se dice acá sigue igual que en la Capa 0.
> Constantes: **solo** en `balance/config_capa1.json` (Capa 1) y `balance/config.json` (Capa 0).
> Simulador de referencia: `balance/sim_capa1.py`. Si un número de esta spec y el simulador no coinciden, manda el simulador.

---

## 1. Qué es

Al llegar al primer Infinito la pila de arena se **cristaliza**. Aparece una segunda pantalla de juego, **Cristalización**, con su propia moneda (**Cristales**) y cinco sistemas que se van abriendo de a uno:

| Sistema | Qué hace en una línea | Llega en |
|---|---|---|
| **Relicario de Cristal** | Cada Infinito elegís el tipo de una reliquia nueva; 3 iguales se funden en el color siguiente. | 1.1 (primer Infinito) |
| **Red** | Una "pila" de nodos con 4 niveles de color; maxear un nodo abre sus vecinos. Mejoras y llaves (la Automatización se configura en su propio panel, §11). | 1.1 |
| **Estratos** | Lo que te deja ir más allá del Infinito: 8 pilas debajo de la pila principal que se llenan solas con la arena que cae y empujan la producción (Presión). Vista 2D: un embudo de arena de colores. | 1.1 (con Romper el Infinito) |
| **Defectos** | Desafíos: jugar un Infinito con una regla rota. Recompensa permanente. | 1.1 (4) y 1.2 (4) |
| **Escarcha** | Una capa de hielo que crece sola con el tiempo, multiplica todo y se "rompe" para dar Esquirlas. | 1.2 |

Se publica en **dos actualizaciones**:

- **1.1 (~7 h)**: Relicario, Red (anillos 0–2), Estratos, Defectos 1–4. Termina con un **hito**: el **Estrato 8 lleno** (1e100 granos) teniendo los 4 primeros Defectos. Se celebra y anuncia la Escarcha ("Próximamente" en la 1.1).
- **1.2 (~8 h más, total ~15 h)**: Escarcha, anillo 3 de la Red, Pulido de reliquias, Defectos 5–8. Termina en **1e308 Cristales totales**: fin de la Capa 1 (hito grande + pantalla de "Capa 2 próximamente").

Progresión **horizontal**: en todo momento hay 2–3 cosas para empujar (un nodo, un estrato, un Defecto) y ninguna espera vacía. El juego offline siempre rinde menos que el activo (×0,7) pero nunca castiga al que deja la pestaña abierta.

---

## 2. Duración objetivo (medida con el simulador)

Tiempo de juego **desde el primer Infinito** (la Capa 0 completa dura ~3 h 30). `python3 balance/sim_capa1.py --robustez`, con los precios en potencias de 10 puras, el softcap de la Arena más allá de 1e308 (`SPEC.md` §4.11) y los Estratos detrás de Romper el Infinito:

| Hito | revisa cada 15 s | cada 60 s | cada 5 min |
|---|---|---|---|
| Segundo Infinito | 1,21 h | 1,37 h | 2,33 h |
| Memoria completa (Infinito automático) | 1,81 h | 1,97 h | 3,00 h |
| Defecto Vacancia | 2,18 h | 2,33 h | 3,36 h |
| Romper el Infinito (nodo) | 2,26 h | 2,42 h | 3,45 h |
| Estratos (primer estrato abierto, en la misma tanda) | 2,26 h | 2,42 h | 3,45 h |
| Defecto Dislocación | 3,53 h | 3,69 h | 4,72 h |
| Defecto Macla | 4,46 h | 4,62 h | 5,65 h |
| Defecto Impureza | 5,53 h | 5,69 h | 6,72 h |
| **FIN 1.1**: Estrato 8 lleno → Escarcha | **7,29 h** | 7,45 h | 8,48 h |
| Defecto Fatiga | 9,71 h | 9,86 h | 10,90 h |
| Defecto Frontera | 12,25 h | 12,32 h | 13,36 h |
| Defecto Inclusión | 12,78 h | 12,99 h | 14,07 h |
| Defecto Vidrio | 13,82 h | 14,01 h | 15,09 h |
| **FIN CAPA 1**: 1e308 Cristales | **14,82 h** | 15,02 h | 16,11 h |

- Hueco máximo entre compras de la Capa 1 (después de la hora 1,5): **31 min** (31 min cada 60 s; 40 min para el jugador de cada 5 min). Durante esos huecos siempre hay compras de Arena y la Escarcha creciendo; son las corridas largas del final, donde el jugador espera un Infinito grande.
- **Abrir un estrato se nota enseguida** (se llena de golpe, §7.2). Lo que multiplica la producción en el momento de abrirlo, `10^(D × Presión que suma)`, medido en el simulador: E1 ×1e2,3 · E2 ×1e7,9 · E3 ×1e13,3 · E4 ×1e16,1 · E5 ×1e18,3 · E6 ×1e40,8 · E7 ×1e74,5 · E8 ×1e104 (las tres revisiones dan lo mismo). El mínimo pedido es ×100.
- **El softcap casi no mueve la capa** (sin él: fin 1.1 a las 7,24 h y fin de la capa a las 14,78 h): con el Infinito roto la producción la llevan la Presión, el Eco y la Escarcha, no los niveles de color. Frena sobre todo las Mutaciones y los colores altos en los Defectos largos (~0,1 h cada uno). No hubo que recalibrar multiplicadores.
- **Estratos después de Romper**: el bot compra Ruptura nv1 y en la misma tanda el nodo Estratos y los primeros estratos (2,26 h). La Vacancia (sin estratos) queda justo antes; Dislocación, Macla e Impureza siguen pidiendo 3, 5 y 7 estratos y caen todos con el Infinito roto, en el mismo orden que antes.
- La segunda corrida (~1 h) es intencional: es la Capa 0 de nuevo pero con la primera reliquia y la primera compra de la Red; enseña que "volver a empezar" ahora es rápido.
- Peso de cada fuente de producción (en log10 de V) al final de cada parte:

| | Colores | Anillos | Cascada | Mutaciones | **Presión** | Eco | Cauce | **Escarcha** |
|---|---|---|---|---|---|---|---|---|
| Fin 1.1 | 19 % | 2 % | 4 % | 0 % | **58 %** | 12 % | 5 % | — |
| Fin 1.2 | 7 % | 1 % | 1 % | 0 % | **45 %** | 5 % | 2 % | **40 %** |

  La Presión (Estratos) es el motor de la capa a propósito: es el sistema nuevo más visual. Si en las pruebas con gente se siente que "solo importan los estratos", el primer ajuste es bajar `estratos.w_base_por_profundidad` y subir `escarcha.g_log10_por_s`, siempre volviendo a correr el simulador.

---

## 3. El bucle

1. Jugás la **Arena** igual que en la Capa 0 hasta 1e308 Energía → **Infinito**.
2. El Infinito da **Cristales** y **una reliquia** (elegís su tipo).
3. En **Cristalización** gastás Cristales en la **Red** y, con el Infinito roto, en los **Estratos**.
4. La Arena vuelve a empezar pero mucho más rápido: la Red conserva compresiones y automatiza; los Estratos y el Relicario multiplican.
5. Cuando la Red lo permite, entrás a un **Defecto** (un Infinito con una regla rota) para una recompensa permanente.
6. Con **Romper el Infinito** (un nodo) la Energía pasa de 1e308 y los Cristales escalan con cuánto la pasás. Ahí se abren los **Estratos**: lo que te deja ir más allá. Las mejoras de la Arena que pasan de 1e308 entran en softcap (cada nivel ×10 el siguiente, `SPEC.md` §4.11).
7. En la 1.2 la **Escarcha** crece sola; la rompés cada tanto para Esquirlas y con ellas la mejorás y pulís reliquias.

Lo que **se conserva** en un Infinito: Cristales, Red, Relicario, Estratos (la arena de los estratos sigue ahí), Defectos, Escarcha. Lo que **se reinicia**: todo lo de la Arena (Energía, granos, Caudal, colores, Cascada, Mutaciones, compresiones), salvo las compresiones que conserve la Red.

---

## 4. Cristales

Todo en log10. `E` = log10 de la Energía al hacer Infinito. `INF` = 308,2547.

**Sin Romper el Infinito**, la Energía se frena en 1e308 y cada Infinito da `floor(10^(mult + 0,35))` Cristales (2 al principio).

**Con Romper el Infinito**:

```
lc = mult + 0,35 + max(0, E − INF) / Q          (Q = 150 − Ruptura II)
si lc > 50:  lc = 50 + (lc − 50) × 0,3            (blando, para que no explote)
si lc < 6:   Cristales = floor(10^lc)             (números chicos enteros)
```

- `mult` (en log10) = Ruptura (0/1/2/3) + Cristalografía (0,5/1/1,5/2) + Cristalografía II (0,125/0,25/0,375/0,5 por Defecto completo) + 3 si completaste Vidrio. En el Defecto Vidrio `mult` = 0.
- **Cuándo hacer Infinito** (cuando la Energía ya pasó 1e308): conviene cuando los Cristales por segundo (`10^lc / duración`) dejan de subir. La interfaz muestra "Cristales al hacer Infinito: X (Y/min)" y marca con un brillo el momento óptimo. El Infinito automático (Memoria nivel 4) hace el Infinito **apenas llegás**; Romper el Infinito (Ruptura nv1) lo mejora: puede esperar "al llegar a X Cristales" (correcciones, bloque 10; se configura en Automatización).
- `Cristales totales` (nunca bajan) es lo que piden los Defectos 5–8 y el fin de la capa (1e308).

---

## 5. Relicario de Cristal

Tres tipos de reliquia. Efectos pasivos y moderados:

| Tipo | Efecto por nivel `n` (n = 0, 1, 2…) |
|---|---|
| **Cauce** | El valor de los colores ^(1 + 0,015 × (n+1)) (se suma `colores_log10 × 0,015 × (n+1)` a log V). |
| **Cascada** | +0,02 × (n+1) al exponente `c` de la Cascada. |
| **Mutaciones** | Las Mutaciones de Caudal y Colores ^(1 + 0,08 × (n+1)) (su exponente × (1 + 0,08 × (n+1))). |

**Inventario (correcciones, bloque 8)**: cada Infinito te da **una** reliquia y **vos elegís el tipo** (Cauce, Cascada o Mutaciones); nace Ámbar (nivel 0) y va a una grilla de casilleros (24 al principio; si se llena, crece). La cara de cada reliquia es **la pila de ese Infinito**: una instantánea de 32×32 celdas a 2 bits (256 bytes) teñida con el color de su nivel, dibujada por el generador de miniaturas compartido.

**Fusión (escalera de colores)**: **3 reliquias del mismo tipo y nivel se fusionan en 1 del nivel siguiente** (a mano: arrastrando una sobre otra igual o con "Fusionar"; con Engarces II, sola si está la opción). La nueva conserva la pila de la más vieja. Una reliquia de nivel n sale de 3^n Ámbar:

| Reliquias | 1 | 3 | 9 | 27 | 81 | 243 | … |
|---|---|---|---|---|---|---|---|
| Color | Ámbar | Coral | Jade | Violeta | Ámbar +1 | Coral +1 | … |
| Nivel n | 0 | 1 | 2 | 3 | 4 | 5 | … |

(Los 4 colores son los de la Capa 0. Después de Violeta vuelve Ámbar con un "+1" y un brillo más fuerte.) La fusión se anima: las tres vuelan al casillero de la nueva y se cristalizan.

**Elección automática**: si no elegís en 30 s, o con el Infinito automático, elige una regla (se configura en Automatización): *Tipo fijo*, *Rotar*, *Completar fusiones* (al que le falten menos Ámbar para fusionar; empate: el que tiene alguna engarzada), *Subir el más bajo* (el tipo cuya mejor engarzada tiene menor nivel) o *Prioridad* (lista ordenable: el primero va un nivel arriba del segundo y dos arriba del tercero). Opciones: fusionar solas (con Engarces II) y engarzar siempre las mejores (mayor nivel primero). Por defecto: Completar fusiones, fusionar solas sí, engarzar no.

**Engarces (espacios)**: solo las reliquias **equipadas** dan efecto, y **dos del mismo tipo se suman**. Empezás con 1 espacio; Engarces da 2/2/3/3. Equipar es gratis (arrastrar del inventario o tocar). Las guías recomiendan builds:
- *Torrente* (Cauce + Cascada): mejor a mitad de la 1.1, cuando los colores pesan.
- *Mutante* (Mutaciones + Cauce): en los Defectos sin Cascada (Dislocación).
- *Avalancha* (Cascada + Mutaciones): con Romper el Infinito y pilas enormes.

**Pulido (1.2)**: con Esquirlas sumás reliquias "virtuales" a un tipo equipado. Costo (log10 de Esquirlas) = `1 + 0,477 × pulidos × pulido_x + log10(reliquias del tipo)`. `pulido_x` = 1, o 0,7/0,5/0,35/0,25 con Engarces II.

**Cómo se ve** (correcciones, bloque 8): pantalla fija. Engarces hexagonales y la elección (o la ficha de la reliquia elegida) a la izquierda, el inventario a la derecha (solo la grilla scrollea; 6 columnas en el celular). Cada tipo tiene su sello (`IconoTipo.svelte`): Cauce dos corrientes que se juntan, Cascada un derrumbe que se abre en anillos, Mutaciones una doble hélice; el mismo sello marca sus filas en la Arena. Sin porcentajes: los efectos se escriben como `^1,015`, `+0,02 a c`.

Un cuarto tipo de reliquia y builds guardadas quedan para la Capa 2 (ver §15).

---

## 6. Red

### 6.1 Forma

La Red es una pila de arena vista desde arriba: un rombo de nodos alrededor de **Memoria** (centro). Cada nodo tiene 4 niveles; cada nivel se pinta con un color de la Capa 0: **nv1 Ámbar, nv2 Coral, nv3 Jade, nv4 Violeta**. Un nodo se abre cuando un vecino ortogonal **más cercano al centro** está en nivel 4. Al maxear un nodo, la arena "se derrumba" hacia sus vecinos (animación de toppling de la Capa 0): eso es lo que los abre.

```
 y\x   -3            -2            -1             0              1              2              3
  3                                               Eco II
  2                                Ruptura II     RUPTURA        Germen
  1                  Deshielo      Cristalog.     Eco            Cascada+       Frío
  0    Cristalog.II  Engarces      Defectos       MEMORIA        Sedimentación  Compactación   Compactación II
 -1                  Engarces II   Inercia        Estratos       Mutación+      Sedimento II
 -2                                Defectos II    Presión        Capilaridad
 -3                                               Abismo
```

Anillo = |x| + |y|. Anillos 0–2 en la 1.1 (13 nodos). Anillo 3 (12 nodos) en la 1.2, se ve bajo el hielo hasta abrir la Escarcha.

**Cómo se ve** (correcciones, bloque 9, versión final en SVG; la pila 3D de three.js se probó y se descartó): la Red es plana. Cada nodo es una mini pila abeliana teñida con el color de su nivel, con su emblema, su nombre y cuatro cuadros de nivel; los completos se unen a sus vecinos con escarcha (trazo fino con ramitas a 60°). Al completar uno, el nodo late y salen fragmentos hacia cada vecino (se saltea con Reducir destellos). Los nodos del anillo 3 se ven como bloques escarchados con un copo, sin nombre; más allá, dos anillos de puntos que se apagan: la Red sigue. **Sorpresa**: un nodo que todavía no se abrió no dice qué da. Zoom propio (rueda, pellizco, barra; doble clic = encuadre), que no se guarda. Ficha al costado (abajo en el celular) con nivel, efecto, siguiente nivel y el botón con el costo.

### 6.2 Costos (log10 de Cristales)

Como todo precio del juego, el exponente se redondea al entero más cercano (`SPEC.md` §4.11): el anillo 1 cuesta 1 Cristal cada nivel (0,15 × L redondea a 0) y el anillo 2 cuesta 100, 100, 100 y 1000.

| Anillo | Costo nivel L (L = 0..3) |
|---|---|
| 0 (Memoria) | 0 (1 Cristal cada nivel) |
| 1 | 0 + 0,15 × L |
| 2 | 1,6 + 0,3 × L |
| 3 | `costo_base_log10` del nodo + 5 × L |

Bases del anillo 3: Eco II 45, Defectos II 55, Germen 65, Compactación II 78, Frío 92, Sedimento II 108, Capilaridad 126, Cristalografía II 146, Abismo 168, Engarces II 192, Deshielo 220, Ruptura II 250.

### 6.3 Nodos

| Nodo | nv1 / nv2 / nv3 / nv4 |
|---|---|
| **Memoria** | Autocompradores y compresión automática desde el inicio de cada Infinito / + Cascada automática / + Mutaciones automáticas / + Infinito automático. Conserva 3/5/7/9 compresiones. |
| **Eco** | `+p × log10(Cristales totales)` a log V; p = 0,5 / 1,5 / 3 / 5. ("Los cristales recuerdan la arena".) |
| **Sedimentación** | Conserva 11/13/15/17 compresiones. nv4 además conserva los niveles de Cascada (ni la Compresión ni el Infinito los reinician). |
| **Estratos** | **Pide Ruptura nv1** (`requiere` en config) además de Memoria en 4: es lo que te deja ir más allá del Infinito. Abre la pantalla de Estratos. Velocidad del flujo ×1 / ×1,5 / ×2 / ×3. Un guardado que ya lo tenía sin Ruptura lo conserva y lo sigue subiendo. |
| **Defectos** | Abre Vacancia / Dislocación / Macla / Impureza. |
| **Ruptura** | nv1 = **Romper el Infinito**. Cristales ×1 / ×10 / ×100 / ×1000 (log 0/1/2/3). |
| **Compactación** | Densidad +0,08 / 0,16 / 0,24 / 0,32. |
| **Presión** | Peso de la Presión de todos los estratos ×1,2 / 1,44 / 1,73 / 2,07. |
| **Engarces** | Espacios de reliquia 2/2/3/3. |
| **Cascada+** | Nivel máximo de Cascada +5/10/15/20 (y amplía el panel). |
| **Mutación+** | Nivel máximo de Mutaciones +1/2/3/5. |
| **Inercia** | Impulso: dentro de cada Infinito el flujo sube lineal con el tiempo de corrida hasta ×1,2/1,4/1,6/2 a los 10 min, y se queda ahí. |
| **Cristalografía** | Cristales ×10^0,5 / 10^1 / 10^1,5 / 10^2. |
| **Eco II** | Eco de la Escarcha: su crecimiento × (1 + 0,001/0,002/0,003/0,004 × log10(Cristales totales)). |
| **Defectos II** | Abre Fatiga / Frontera / Inclusión / Vidrio. |
| **Germen** | Crecimiento de la Escarcha ×1,5/2,25/3,4/5,1. |
| **Frío** | Aguante H de la Escarcha ×1,5/2,25/3,4/5,1. |
| **Compactación II** | Densidad +0,0001/0,0002/0,0003/0,0004 por cada anillo de la corrida actual. |
| **Sedimento II** | Profundidad: el peso de cada estrato pasa de `k` a `k^1,05 / k^1,1 / k^1,15 / k^1,2`. |
| **Capilaridad** | Separación entre estratos: el tope pasa de `s_(k−1) − 2` a `− 1,75 / − 1,5 / − 1,25 / − 1`. |
| **Abismo** | Estratos llenos: cada estrato en su tope pesa ×1,1/1,2/1,3/1,4 (el estrato 1 no tiene tope: cuenta siempre como lleno). |
| **Engarces II** | Fusión automática de reliquias, espacios 3 y Pulido más barato (×0,7/0,5/0,35/0,25 en el exponente). |
| **Cristalografía II** | Facetas: Cristales ×10^(0,125/0,25/0,375/0,5 × Defectos completos). Con los 8 y nv4, ×1e4. |
| **Deshielo** | Rompe la Escarcha sola cada 30 min; Esquirlas ×1/2/4/8. |
| **Ruptura II** | Q −1/−2/−3/−4. |

Cada nodo tiene una mecánica propia (ninguno repite el efecto de otro). Los valores de Compactación II y Eco II salen del simulador: con los del primer borrador (+0,001 de Densidad por anillo, +0,05 por orden de Cristales) la 1.2 duraba menos de una hora.

**Romper el Infinito es un nodo** (Ruptura nv1, anillo 2, detrás de Eco) y es la llave de los Estratos: el nodo Estratos (anillo 1) no se abre sin él, y Presión y Abismo, que están detrás, tampoco. El primer Defecto (Vacancia) se juega justo antes; los siguientes ya con el Infinito roto y los estratos que piden.

---

## 7. Estratos

### 7.1 Qué son

Los Estratos son **lo que te deja ir más allá del Infinito**: se abren con el nodo Estratos, que pide Romper el Infinito (Ruptura nv1). Debajo de la pila principal hay 8 pilas más (estratos 1 a 8, de arriba a abajo). La arena que se escurre de la pila principal llena el estrato 1; el 1 alimenta al 2, y así. Cada estrato guarda una cantidad `s_k` (log10 de granos) que **no se pierde en el Infinito**. Cuanto más llenos y más profundos, más **Presión**, y la Presión multiplica la producción de la Arena.

### 7.2 Fórmulas (por segundo de juego de Arena; no corren en el Defecto Vidrio)

```
al abrir el estrato k:  s_1 = 25,  s_k = s_(k−1) − sep          (se llena de golpe hasta su tope)
sep     = 2, o 1,75 / 1,5 / 1,25 / 1 con Capilaridad
flujo   = 0,00042 × Estratos.flujo_x × impulso                    (log10/s)
impulso = 1 + (Inercia.impulso_x − 1) × min(1, t / 600)          (t = segundos desde el último Infinito)
γ_k     = flujo × (1 + 0,3 × Permeabilidad_k) × (k == 1 ? f1 : 1) × (1 + 0,003 × s_(k+1))
f1      = clamp(log10(Caudal) / 30, 0,5, 3)          (más Caudal, más rápido se llena el primero)
s_k    += γ_k × dt,  pero nunca más que s_(k−1) − sep  (un estrato no puede pasar al de arriba)
Presión = Σ_k  0,03 × k^e × Presión.w_x × (1 + 0,25 × NivelPresión_k) × lleno_k × s_k
e       = 1, o 1,05 / 1,1 / 1,15 / 1,2 con Sedimento II
lleno_k = Abismo.lleno_x si el estrato está en su tope (el 1 siempre), si no 1
```

- **Empuje**: el estrato de abajo acelera al de arriba (`empuje_por_estrato_inferior` = 0,003 por orden de magnitud de `s_(k+1)`; el último abierto no tiene empuje). Abrir uno profundo acelera a los de arriba. Con 0,1 (el primer borrador) la cadena crece sin control: el fin de la capa llegaba a las 3 h.
- El salto al abrir es el "cada estrato te destraba" (§2): la Presión que suma el estrato nuevo es `0,03 × k × s_k` desde el primer segundo.

La Presión se **suma a log10 V** (o sea, queda multiplicada por la Densidad como todo lo demás).

### 7.3 Compras (en Cristales, log10)

- Abrir el estrato k: 0, 2, 4, 7, 11, 16, 22, 29.
- Permeabilidad del estrato k (k = 0..7), nivel L: `1 + 1×k + 0,6×L + 0,1×L³/6`, redondeado al entero más cercano como todo precio.
- Presión del estrato k, nivel L: misma fórmula (`presion` en config).

El término cúbico es lo que frena la explosión: el jugador sube todos los estratos parejo en vez de uno solo al infinito.

**Hito de la 1.1**: Estrato 8 con `s_8 ≥ 100` (1e100 granos) teniendo Vacancia, Dislocación, Macla e Impureza completos.

### 7.4 Vista: el embudo (2D)

Correcciones, bloque 11: la escena 3D descendente de three.js se reemplazó por un **embudo en 2D**, en pixel art (se eligió entre cinco maquetas, `mockups/estratos/`). three.js ya no está en el juego.

- Arriba, el casquete de la pila principal llena; debajo, ocho bandejas cada vez más angostas unidas por paredes en diagonal. **Física de arena que cae** (gravedad y deslizamiento a 45°, grilla de 120×92, `src/render/embudo.ts`, pura) en un worker a 20 pasos/s que se crea al entrar y se termina al salir. Cada grano guarda su color: los de la **paleta equipada**, en la misma proporción que en la pila llena.
- Los poros del piso de cada bandeja se abren cuando pasa su nivel; los estratos cerrados son roca con "Estrato N · costo" grabado (lo que cae encima se pierde). El próximo, si alcanza, se agrieta; al abrirlo la roca salta en pedazos y la bandeja se llena de golpe.
- Lo lleno que se ve cada bandeja y el chorro son visuales (`s_k / (s_k + 6)` hasta 0,9; el chorro crece con `log2(1 + γ/γ_base)`), no balance.
- Ficha del estrato de tamaño fijo: granos, ritmo (×N por minuto), aporte como ×10^(aporte × Densidad), desglose de la velocidad local y las dos mejoras (Permeabilidad, una gema de hielo; Presión, una placa de prensa). Se elige un estrato tocándolo o con las flechas.
- En la Arena, debajo de la pila, una flecha discreta "↓ Estratos" cuando ya hay estratos.
- Medido: 60 fps en 1366×768 (0,42 ms por cuadro) y ~59 en 390×844 con la CPU ÷4. Sin scroll de página.

---

## 8. Defectos

Un Defecto es un Infinito con una regla rota. Se entra desde su pantalla (sale de la corrida actual de Arena, sin Cristales). Se gana al llegar a la **meta** de Energía; entonces da los Cristales normales de ese Infinito y la recompensa permanente. Se puede abandonar cuando quieras (sin castigo, sin Cristales). Dentro de cada grupo se hacen en orden.

| # | Defecto | Regla | Meta (log10 E) | Recompensa | Requisito |
|---|---|---|---|---|---|
| 1 | **Vacancia** | Los 4 colores siguen, pero **Violeta no multiplica** (se compra, no suma). | 200 | Hito de color ×4 → ×6 | Defectos nv1 |
| 2 | **Dislocación** | La Cascada no funciona y la Presión vale la mitad. | 1250 | Multiplicador por anillo ×1,10 → ×1,12 | Defectos nv2, 3 estratos |
| 3 | **Macla** | No hay Mutaciones y la Densidad vale ×0,85. | 1800 | Crecimiento cuadrático de los colores ×0,9 (más baratos) | Defectos nv3, 5 estratos |
| 4 | **Impureza** | Derrumbes por grano con tope 1e4 y colores a la mitad. | 2900 | Cascada +0,1 de `c` | Defectos nv4, 7 estratos |
| 5 | **Fatiga** | La producción se divide por 10 cada 10 min (`−t/600` en log). | 1200 | Escarcha crece ×2 | Defectos II nv1, 1e60 Cristales totales |
| 6 | **Frontera** | Densidad = 1. | 700 | Densidad +0,2 | Defectos II nv2, 1e80 |
| 7 | **Inclusión** | La Presión de los Estratos no funciona. | 1800 | Aguante de la Escarcha ×1,5 | Defectos II nv3, 1e105 |
| 8 | **Vidrio** | Sin Relicario, sin Eco y sin Escarcha (la Red sí funciona). | 25000 | Cristales ×1000 | Defectos II nv4, 1e150 |

- Las metas se calibraron con `balance/probe.py` (mide hasta dónde llega el jugador en cada Defecto con su estado de esa hora). Si cambia el balance, se vuelven a medir.
- En la Vacancia el color Violeta aparece "agrietado" y su número tachado: se ve que se compra pero no suma.
- Si fallás, el juego sugiere volver cuando tengas ~30 veces más Cristales totales (el bot reintenta a +1,5 en log10).
- Visualmente cada Defecto deforma la pila: grieta (Vacancia), corrimiento (Dislocación), espejo (Macla), manchas (Impureza), pulso que se apaga (Fatiga), bordes duros (Frontera), burbujas (Inclusión), pila de vidrio sin color (Vidrio).

---

## 9. Escarcha (1.2)

Una capa de hielo que cubre la pila principal y **crece sola con el tiempo** (también con el juego cerrado, al 70 %).

```
logX   += g × dt                                   (logX = "espesor", en log10)
g       = 0,004 × (1 + 0,003 × Presión) × 1,12^Crecimiento × Germen × (2 si Fatiga)
aporte  = m × logX                                  (se suma a log10 V)
m       = 1 + 0,04 × Brillo
penal.  = −log10(1 + logX / H)                      (se resta a log10 de la producción)
H       = 50 × 1,5^Aguante × Frío × (1,5 si Inclusión)
```

- **Romper la Escarcha** (botón, cada 30 min como mínimo; automático con Deshielo): conserva el 50 % de `logX` y da `floor(logX × 0,5 / 10) × Deshielo.esquirlas_x` **Esquirlas**. Animación: el hielo se agrieta en hexágonos y salta.
- **Mejoras con Esquirlas** (costo en log10 de Esquirlas, nivel L, redondeado al entero más cercano como todo precio, también el Pulido): Crecimiento `0 + 0,4L` (×1,12 a g), Brillo `0,5 + 0,5L` (+0,04 a m), Aguante `0,5 + 0,4L` (×1,5 a H). Y el Pulido de reliquias (§5).
- No funciona en el Defecto Vidrio.
- Se desbloquea al llegar al hito de la 1.1 (Estrato 8 lleno con los 4 primeros Defectos): los Defectos ayudan a abrirla.

---

## 10. Producción completa

```
log10(producción/s) = log10(Caudal) + log10(K × G) + D × log10 V − penal. Escarcha − (Fatiga: t/600)
log10 V = colores + anillos + cascada + mutaciones          (Capa 0)
        + Presión + Eco + Cauce + Escarcha                    (Capa 1)
D       = 1 + 0,12 × compresiones + Compactación + Compactación II + (0,2 si Frontera)
```

Pantalla de estadísticas (estilo AD): desglose de log10 V por fuente, con porcentaje, igual a la tabla de §2.

---

## 11. Interfaz

- **Barra lateral de capas** (izquierda, 5 rem; neutra, con la sobriedad de la Arena): Arena (una mini pila ámbar en píxeles) → Cristalización (un prisma de hielo), con el nombre debajo del ícono; la activa se enciende con su color. Abajo, separada por una línea, **Automatización** (no es una capa sino de todo el juego). La Capa 2 aparece como silueta gris al final de la 1.2.
- **Panel de Automatización** (correcciones, bloque 10): "Encender todo" / "Apagar todo"; a la izquierda las compras (Caudal, los cuatro colores, Cascada, Mutaciones), cada una con su intervalo (como mínimo `automatizacion.intervalo_s` = 1 s), su cantidad (×1 / ×10 / Máx) y su interruptor; a la derecha la Compresión automática (al llegar al umbral / esperar X s más) y el Infinito automático (apenas llega; con Romper el Infinito, "al llegar a X Cristales") con la regla de reliquias (§5). Se ven los que el jugador tiene y el siguiente como silueta con lo que lo desbloquea. Una sola regla (`autoDisponible`) decide si un autocomprador existe para la economía, la tienda y el panel. Con los valores por defecto el núcleo hace lo mismo que antes del panel.
- La fila de íconos (foto, logros, estadísticas, ajustes, ayuda) está en todas las capas.
- Dentro de Cristalización, **segunda barra** con: **Red · Estratos · Defectos · Escarcha · Relicario**. Cada una es su propia pantalla a pantalla completa; nunca paneles encima de la pila. Las que no están abiertas no se muestran (o se muestran como "???" solo la siguiente).
- La pila principal **no se mueve nunca** por la interfaz (misma regla de la Capa 0).
- **Estética helada** (correcciones, bloque 13; `src/ui/hielo.css`): fondo azul noche casi negro, blancos fríos, cian para lo de la capa. Paneles = **placas de hielo** (`.placa`: escarcha en ruido fino, esquinas facetadas a 60° con `clip-path`, arista fría arriba, cuerpo apenas translúcido); botones de compra = **gemas** (`.gema`: biselados, un reflejo que cruza lento, se encienden desde adentro en 0,6 s cuando alcanza). Escarcha cayendo detrás de Cristalización (tres capas lentas, solo `transform`). Pestañas rectas con un ícono propio por sistema. Los 4 colores de la Capa 0 siguen siendo los colores de nivel. Sin `backdrop-filter`, sin tarjetas con sombra, sin emojis. Automatización y la barra de capas son neutras (de todo el juego).
- **Reducir destellos** (Ajustes → Juego, prendido por defecto): las compras automáticas no destellan ni suenan; los números de la tienda y los contadores se refrescan a 10 Hz como mucho; nada cambia de brillo más de 3 veces por segundo. La pila no se toca. **Reducir movimiento** (aparte) apaga además los destellos de la pila, la escarcha y los reflejos.
- **Sonido**: lo automático no suena; como mucho 4 sonidos a la vez, el mismo no se repite antes de 80 ms, "Comprar todo" / "Máx" suenan una vez; los derrumbes seguidos bajan de volumen.
- **Multiplicadores a la vista** (bloque 7): cada fila muestra su valor final y el tooltip la cuenta ("512 niveles × 27 Mutación × 2,21 Reliquia = 30.490 granos/s"). Siempre como multiplicadores o notación matemática (×3, ^1,015, +0,02 a c), nunca porcentajes.
- **Pantallas sin scroll**: cada pantalla entra entera en la ventana (1366×768 y 390×844); si hay una lista larga, scrollea solo esa caja.
- Contadores arriba: Energía (Arena), Cristales, Cristales totales, Esquirlas (1.2).
- Primer Infinito: cinemática corta (la pila se congela desde abajo, se rompe en cristales, la cámara cae a la pantalla de Cristalización). Explica en 3 líneas qué son los Cristales y abre el primer Relicario.
- **Guías** (correcciones, bloques 4 y 12): cada guía tiene un id y se anota como vista en el guardado: sale **una sola vez en la vida de la partida**. Las de la Capa 1 salen la primera vez que se mira cada pantalla (así llegan de a una): Cristales (al cerrar la presentación), Relicario, Red, Estratos (cuando ya están abiertos) y Automatización. Cada una tiene su página en "Cómo funciona" (?) con la fórmula y los valores actuales. Defectos y Escarcha tienen su lugar preparado, cerrado hasta C7 y C10. Las de la Capa 0 se muestran con la Arena al frente; las de la Capa 1, fuera de ella.
- Textos en español rioplatense en el archivo de cadenas.

---

## 12. Offline

Mismo sistema de la Capa 0, con eficiencia **0,7** (`fuera_de_linea_eficiencia`) aplicada a la Energía, al llenado de los Estratos y al crecimiento de la Escarcha. Infinitos offline solo con Memoria nv4 (con la regla del Infinito automático). La Escarcha no se rompe sola offline salvo con Deshielo. Pantalla de regreso: qué ganaste (Cristales, estratos, Escarcha) en una tarjeta simple con la estética helada.

El simulador no modela el offline: hay que probarlo con un test aparte (12 h offline nunca rinden más que 12 h activas).

---

## 13. Guardado

- Versión de guardado nueva (v2) con migración desde v1: un jugador que ya tenía el Infinito de la Capa 0 arranca la Capa 1 con 1 Cristal y la primera reliquia del Relicario.
- Se guarda: Cristales (break_infinity), Cristales totales, niveles de la Red, inventario de reliquias (tipo, nivel, pila, Infinito) + pulidos + engarzadas + regla automática, número de Infinito, estratos abiertos, `s_k` (log10), niveles de Permeabilidad y Presión, Defectos completos, Escarcha `logX`, Esquirlas, mejoras de Escarcha, temporizador de la Escarcha.
- Exportar/importar como en la Capa 0. Test de ida y vuelta.

---

## 14. Problemas a evitar (lecciones del balance)

1. **Bucles multiplicativos**: Cristales → Presión → más Cristales explota. Por eso: costos cúbicos de los estratos, blando de Cristales sobre 1e50, Escarcha lineal en el tiempo. Cualquier efecto nuevo que escale con Cristales se mete en el simulador antes que en el código.
2. **Esperas vacías**: hueco máximo 31 min medido. Si un cambio crea un hueco > 40 min, el test de balance falla.
3. **Defectos imposibles o triviales**: las metas salen de `probe.py`, no a ojo.
4. **Elección frustrante**: no hay azar en el Relicario (elegís el tipo); la regla automática es configurable.
5. **Números**: todo lo grande en log10 o break_infinity. `s_k`, `logX` y Cristales nunca en float lineal.
6. **Rendimiento**: la única escena WebGL es la pila; la Red es SVG y los Estratos canvas 2D con su física en un worker que se termina al salir. La pila sigue a 60 fps.
7. **Demasiadas monedas juntas**: en la 1.1 solo hay Cristales; Esquirlas recién en la 1.2.
8. **Árbol ilegible**: la Red se lee como una pila (rombo), con 4 colores; nada de líneas cruzadas ni árbol de habilidades clásico.
9. **Offline mejor que activo**: prohibido (test).
10. **Interfaz "de IA"**: nada de tarjetas con sombra y gradiente genéricas ni emojis; tipografía y layout de la Capa 0.

---

## 15. Ganchos para la Capa 2

- La Red crece: un anillo 4 (los datos de nodos están en config; se agrega sin tocar código).
- Builds de reliquias guardadas, cuarto tipo de reliquia.
- Estratos 9+ y una "presión inversa" hacia la Capa 2.
- Más Defectos (un tercer grupo) que mezclan dos reglas.
- La Escarcha puede pasar a ser "permanente" como recompensa de la Capa 2.

---

## 16. Plan de implementación

**Actualización 1.1** (hitos C1–C9) y **1.2** (C10–C14). Detalle y prompts en `GUIA_CAPA1.md`.

| Hito | Contenido | Modelo |
|---|---|---|
| C1 | Guardado v2 + migración, Cristales, Infinito nuevo, barra lateral de capas y de Cristalización (pantallas vacías) | Fable |
| C2 | Red: datos desde config, forma de rombo, compra, apertura de vecinos, Memoria (automatización) | Opus |
| C3 | Relicario: fusión, engarces, efectos (ofertas reemplazadas por el inventario en las correcciones, bloque 8) | Opus |
| C4 | Estratos: lógica (`s_k`, Presión, compras) + interfaz 2D provisoria | Fable |
| C5 | Estratos: escena descendente + optimización (reemplazada por el embudo 2D en las correcciones, bloque 11) | Fable |
| C6 | Romper el Infinito + fórmula de Cristales + Infinito automático óptimo | Fable |
| C7 | Defectos 1–4 + visuales | Opus |
| C8 | Test de balance de la 1.1 + offline + estadísticas | Fable |
| C9 | Pulido y auditoría 1.1 → publicar | Opus + Fable (auditoría) |
| C10 | Escarcha (lógica + visual) | Fable |
| C11 | Anillo 3 de la Red, Pulido, Deshielo | Opus |
| C12 | Defectos 5–8 | Opus |
| C13 | Fin de la Capa 1 (hito + pantalla) + test de balance completo | Fable |
| C14 | Pulido y auditoría 1.2 → publicar | Opus + Fable |

---

## 17. Test de balance

`tests/balance_capa1.test.ts` corre el núcleo real del juego con un bot igual al de `sim_capa1.py` (revisa cada 15 s) y verifica, con ±10 %:

- Segundo Infinito ~1,2 h; Memoria completa ~1,8 h; Romper ~2,25 h; Vacancia ~2,2 h; Estratos nunca antes que Romper.
- Fin 1.1 en 6,5–7,5 h; fin de la capa en 14–16 h.
- Hueco máximo entre compras de la Capa 1 (desde la hora 1,5) < 40 min.
- Ninguna fuente de log V > 65 % al final de la 1.2.
- 12 h offline < 12 h activas.

El test puede ser lento: correrlo con un paso de tiempo grande (2 s) y marcarlo como "lento" (no en cada guardado, sí al cerrar cada hito).

---

## 18. Qué es aproximado (honesto)

- El bot elige reliquias y compras con reglas simples ("lo más barato primero", con prioridades). Una persona va a ir un poco más rápido o más lento; la robustez (cada 60 s / 5 min) muestra que el ritmo aguanta.
- Las corridas del final de la 1.2 duran 30–60 min (Infinitos grandes). Si en pruebas reales se sienten largas, bajar `cristales.blando_factor` hace más corto cada Infinito pero acelera el final: volver a calibrar `escarcha.g_por_presion`.
- La Presión pesa 57 % al final de la 1.1 y 43 % al final de la 1.2. Está pensado así, pero es lo primero a revisar con jugadores.
- Los Defectos 6 y 7 (Frontera, Inclusión) quedan a ~30 min uno del otro; está bien, pero se pueden separar subiendo el requisito de Inclusión.
- El offline no está simulado (ver §12).
