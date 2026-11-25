# Capa 0 · Economía (fórmulas y balance)

Constantes: **solo** `balance/config.json`. Núcleo: `src/core/formulas.ts`, `shop.ts`, `tick.ts`, `state.ts` (único que importa el config: `config.ts`). Referencia: `balance/sim.py`. Tests: `tests/formulas.test.ts`, `tests/balance.test.ts`.

Notación: `log10` en todos los costos. `G` = granos en la pila en esta corrida. Niveles desde 0.

## Precios: potencias de 10 puras

Todo precio del juego (Capa 0 y 1) es `10^redondear(exponente)` (al entero más cercano, x,5 sube). Más allá de 1e308, mejoras de la Arena (Caudal, colores, Cascada, Mutaciones):

```
costo = 10^redondear(exp_normal(nivel) + max(0, nivel − nivel_1e308))
```

`nivel_1e308` = primer nivel cuyo `exp_normal` pasa `softcap_desde_log10` (308): desde ahí cada nivel ×10 el siguiente. En la Capa 0 no se llega (la Energía se frena en 1e308); actúa con el Infinito roto. La tienda marca esas filas con una gema de hielo con "∞". Se redondea al más cercano y no hacia arriba (hacia arriba el primer Infinito pasaba de 3 h 14 a 4 h 10).

## Producción

```
Energía/s = F × (0,035 × G) × V^D
```

- `F` = granos/s (Caudal). `0,035 × G` = derrumbes por grano. `V` = producto de multiplicadores (colores, anillos, Cascada, Mutaciones). `D` = Densidad (ver [compresion.md](compresion.md)), solo sobre V.
- G crece F por segundo. Primera corrida con G = 39; las siguientes vacías. Granos y Caudal con tope `GRANOS_MAX` = 1e300 (`formulas.ts`).

## Caudal

```
F = 2^nivel × 3^(mutación Caudal)
costo = 10^(1 + 0,6·nivel + 0,075·nivel²)
```

## Colores

El color más raro en la pila es el más caro y el más fuerte.

| Color | Altura | % celdas | Mult./nivel | c0 | g | s | Aparece en |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ámbar | 3 | 59 % | ×1,25 | 1 | 0,35 | 0,04 | inicio (8 de Energía) |
| Coral | 2 | 22 % | ×1,5 | 4 | 0,50 | 0,08 | 1e4 |
| Jade | 0 | 14 % | ×2 | 9 | 0,70 | 0,15 | 1e9 |
| Violeta | 1 | 5 % | ×3 | 16 | 1,00 | 0,25 | 1e16 |

```
costo = 10^(c0 + g·nivel + s·nivel²/2)
mult. = (mult. por nivel)^nivel × 4^floor(nivel / 25)      (hito ×4 cada 25 niveles; ×6 con Vacancia)
```

Un color aparecido queda desbloqueado para siempre (sus niveles no sobreviven a la Compresión, salvo Sedimentación nv2).

## Anillos (Expansión)

```
anillos = G ≥ 64 ? floor(log2(G / 64)) + 1 : 0
mult. = (1,10 + 0,02 × mutación Expansión)^anillos           (base ×1,12 con Dislocación)
```

## Cascada (desde la Compresión 2)

```
c = 0,04 × nivel + (nivel ≥ 1 ? 0,03 × mutación Cascada : 0)   (+ reliquias Cascada, + Impureza)
mult. = G^(0,478·c) / 10^(0,131·c)   (mínimo ×1)
costo = 10^(40 + 6·nivel), nivel máximo 10 (+5/10/15/20 con Cascada+)
```

## Mutaciones (5 compresiones y haber llegado a 1e120)

Permanentes entre compresiones; nivel máximo 5 (+ Mutación+).

| Mutación | Efecto/nivel | Costo n → n+1 |
| --- | --- | --- |
| Caudal | Caudal ×3 | 10^(120 + 18n) |
| Colores | V ×10 | 10^(130 + 22n) |
| Expansión | +0,02 al mult. de cada anillo | 10^(125 + 20n) |
| Cascada | +0,03 a c (si Cascada ≥ 1) | 10^(140 + 28n) |

## Autocompradores

| Compresión | Desbloquea |
| --- | --- |
| 2 | Caudal |
| 3 | Ámbar y Coral |
| 4 | Jade y Violeta |
| 6 | Compresión automática |

Viven dentro de `tick` (con reloj en el estado). Configuración y Cascada/Mutaciones automáticas: [../capa1/automatizacion.md](../capa1/automatizacion.md).

## Puñado

Clic/toque sobre la pila o barra espaciadora: 5 granos (suman a G), máximo 8 por segundo (`punado` en config). Sin efecto en el balance pasado el minuto 2.

## Duración objetivo (medida con `python balance/sim.py`)

| Jugador | Primer Infinito | Compresiones |
| --- | --- | --- |
| Muy activo (5 s) | 3 h 20 min | 17 |
| **Atento (15 s), referencia** | **3 h 28 min** | 17 |
| Cada minuto | 4 h 00 min | 17 |
| Casi idle (5 min) | 6 h 41 min | 17 |

Línea de tiempo (`--timeline`): 0:20 Caudal y Ámbar · 1:25 Coral · 4:20 Jade · 12:55 Violeta · 16:05 Compresión 1 · 33 C2 (Cascada, auto Caudal) · 47 C3 · 62 C4 · 87 C6 (Compresión automática) · 128 C10 y 1e120 → Mutaciones · 206 C17 · 208 **Infinito**. Corridas de 15–17 min bajando a ~11; ninguna > 17 min.

## Test de balance (`tests/balance.test.ts`, núcleo real, jugador de 15 s)

| Medida | Rango |
| --- | --- |
| Primera Compresión | 13–17 min |
| Compresiones totales | 17 |
| Primera Mutación | 120–140 min |
| Infinito | 195–225 min |
| Ninguna corrida | > 17 min |

Decisiones del núcleo: estado inmutable (cada acción devuelve un estado nuevo, o el mismo si no se puede); `Decimal` para Energía/producción/costos/V, `number` para G y niveles; Euler explícito como `sim.py`; ítems con id de texto (`caudal`, `color0..3`, `cascada`, `mut_*`).
