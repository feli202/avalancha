# Avalancha — Especificación de la Capa 1: Cristalización

> Continúa `SPEC.md` (Capa 0, "Arena"). Todo lo que no se dice acá sigue igual que en la Capa 0.
> Constantes: **solo** en `balance/config_capa1.json` (Capa 1) y `balance/config.json` (Capa 0).
> Simulador de referencia: `balance/sim_capa1.py`. Si un número de esta spec y el simulador no coinciden, manda el simulador.

---

## 1. Qué es

Al llegar al primer Infinito la pila de arena se **cristaliza**. Aparece una segunda pantalla de juego, **Cristalización**, con su propia moneda (**Cristales**) y cinco sistemas que se van abriendo de a uno:

| Sistema | Qué hace en una línea | Llega en |
|---|---|---|
| **Relicario de Cristal** | Cada Infinito elegís 1 de 3 reliquias; 3 iguales se funden en el color siguiente. | 1.1 (primer Infinito) |
| **Red** | Una "pila" de nodos con 4 niveles de color; maxear un nodo abre sus vecinos. Automatización, mejoras y llaves. | 1.1 |
| **Estratos** | 8 pilas debajo de la pila principal que se llenan solas con la arena que cae y empujan la producción (Presión). Vista 3D descendente. | 1.1 |
| **Defectos** | Desafíos: jugar un Infinito con una regla rota. Recompensa permanente. | 1.1 (4) y 1.2 (4) |
| **Escarcha** | Una capa de hielo que crece sola con el tiempo, multiplica todo y se "rompe" para dar Esquirlas. | 1.2 |

Se publica en **dos actualizaciones**:

- **1.1 (~7 h)**: Relicario, Red (anillos 0–2), Estratos, Defectos 1–4. Termina con un **hito**: el **Estrato 8 lleno** (1e100 granos) teniendo los 4 primeros Defectos. Se celebra y anuncia la Escarcha ("Próximamente" en la 1.1).
- **1.2 (~8 h más, total ~15 h)**: Escarcha, anillo 3 de la Red, Pulido de reliquias, Defectos 5–8. Termina en **1e308 Cristales totales**: fin de la Capa 1 (hito grande + pantalla de "Capa 2 próximamente").

Progresión **horizontal**: en todo momento hay 2–3 cosas para empujar (un nodo, un estrato, un Defecto) y ninguna espera vacía. El juego offline siempre rinde menos que el activo (×0,7) pero nunca castiga al que deja la pestaña abierta.

---

## 2. Duración objetivo (medida con el simulador)

Tiempo de juego **desde el primer Infinito** (la Capa 0 completa dura ~3 h y no cambia). `python3 balance/sim_capa1.py --robustez`:

| Hito | revisa cada 15 s | cada 60 s | cada 5 min |
|---|---|---|---|
| Segundo Infinito | 1,10 h | 1,25 h | 2,25 h |
| Romper el Infinito (nodo) | 2,35 h | 2,51 h | 3,54 h |
| Memoria completa (Infinito automático) | 1,64 h | 1,80 h | 2,83 h |
| Estratos (primer estrato abierto) | 2,26 h | 2,42 h | 3,45 h |
| Defecto Vacancia | 2,44 h | 2,60 h | 3,63 h |
| Defecto Dislocación | 4,34 h | 4,49 h | 5,53 h |
| Defecto Macla | 5,21 h | 5,37 h | 6,40 h |
| Defecto Impureza | 6,04 h | 6,20 h | 7,24 h |
| **FIN 1.1**: Estrato 8 lleno → Escarcha | **6,96 h** | 7,12 h | 8,15 h |
| Defecto Fatiga | 9,43 h | 9,59 h | 10,63 h |
| Defecto Frontera | 11,89 h | 12,05 h | 13,08 h |
| Defecto Inclusión | 12,44 h | 12,60 h | 13,64 h |
| Defecto Vidrio | 13,49 h | 13,68 h | 14,74 h |
| **FIN CAPA 1**: 1e308 Cristales | **14,99 h** | 15,20 h | 16,27 h |

- Hueco máximo entre compras de la Capa 1 (después de la hora 1,5): **32 min** (35 min para el jugador de cada 5 min). Durante esos huecos siempre hay compras de Arena y la Escarcha creciendo; son las corridas largas del final, donde el jugador espera un Infinito grande.
- La segunda corrida (~1 h) es intencional: es la Capa 0 de nuevo pero con la primera reliquia y la primera compra de la Red; enseña que "volver a empezar" ahora es rápido.
- Peso de cada fuente de producción (en log10 de V) al final de cada parte:

| | Colores | Anillos | Cascada | Mutaciones | **Presión** | Eco | Cauce | **Escarcha** |
|---|---|---|---|---|---|---|---|---|
| Fin 1.1 | 23 % | 2 % | 4 % | 1 % | **55 %** | 13 % | 2 % | — |
| Fin 1.2 | 6 % | 1 % | 1 % | 0 % | **59 %** | 6 % | 1 % | **26 %** |

  La Presión (Estratos) es el motor de la capa a propósito: es el sistema nuevo más visual. Si en las pruebas con gente se siente que "solo importan los estratos", el primer ajuste es bajar `estratos.w_base_por_profundidad` y subir `escarcha.g_log10_por_s`, siempre volviendo a correr el simulador.

---

## 3. El bucle

1. Jugás la **Arena** igual que en la Capa 0 hasta 1e308 Energía → **Infinito**.
2. El Infinito da **Cristales** y te ofrece **3 reliquias** (elegís 1).
3. En **Cristalización** gastás Cristales en la **Red** y en los **Estratos**.
4. La Arena vuelve a empezar pero mucho más rápido: la Red conserva compresiones y automatiza; los Estratos y el Relicario multiplican.
5. Cuando la Red lo permite, entrás a un **Defecto** (un Infinito con una regla rota) para una recompensa permanente.
6. Con **Romper el Infinito** (un nodo) la Energía pasa de 1e308 y los Cristales escalan con cuánto la pasás.
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

- `mult` (en log10) = Ruptura (0/1/2/3) + Cristalografía (0,5/1/1,5/2) + Cristalografía II (1/2/3/4) + 3 si completaste Vidrio. En el Defecto Vidrio `mult` = 0.
- **Cuándo hacer Infinito** (cuando la Energía ya pasó 1e308): conviene cuando los Cristales por segundo (`10^lc / duración`) dejan de subir. La interfaz muestra "Cristales al hacer Infinito: X (Y/min)" y marca con un brillo el momento óptimo. El Infinito automático (Memoria nivel 4) usa exactamente esa regla (configurable: "en el óptimo" o "al llegar a X Cristales").
- `Cristales totales` (nunca bajan) es lo que piden los Defectos 5–8 y el fin de la capa (1e308).

---

## 5. Relicario de Cristal

Tres tipos de reliquia. Efectos pasivos y moderados:

| Tipo | Efecto por nivel `n` (n = 0, 1, 2…) |
|---|---|
| **Cauce** | Los colores valen +1,5 % × (n+1) más (se suma `colores_log10 × 0,015 × (n+1)` a log V). |
| **Cascada** | +0,02 × (n+1) al exponente `c` de la Cascada. |
| **Mutaciones** | Las Mutaciones de Caudal y Colores rinden +8 % × (n+1). |

**Fusión (escalera de colores)**: cada 3 reliquias iguales suben un color. Nivel = `floor(log3(reliquias del tipo))`:

| Reliquias | 1 | 3 | 9 | 27 | 81 | 243 | … |
|---|---|---|---|---|---|---|---|
| Color | Ámbar | Coral | Jade | Violeta | Ámbar +1 | Coral +1 | … |
| Nivel n | 0 | 1 | 2 | 3 | 4 | 5 | … |

(Los 4 colores son los de la Capa 0. Después de Violeta vuelve Ámbar con un "+1" y un brillo más fuerte.) La fusión es automática y se anima: tres cristales que se juntan en uno del color siguiente.

**Ofertas**: cada Infinito aparecen 3 reliquias al azar (4 con Engarces nv2+). Nunca las 3 iguales. Elegís una; si no elegís en 30 s o el Infinito es automático, se elige la que suba de color antes (empate: la del tipo equipado). El azar usa una **semilla guardada en la partida** (`relicario.semilla` + número de Infinito): recargar no cambia la oferta.

**Engarces (espacios)**: solo las reliquias **equipadas** dan efecto. Empezás con 1 espacio; Engarces da 2/2/3/3. Equipar es gratis (arrastrar). Las guías recomiendan builds:
- *Torrente* (Cauce + Cascada): mejor a mitad de la 1.1, cuando los colores pesan.
- *Mutante* (Mutaciones + Cauce): en los Defectos sin Cascada (Dislocación).
- *Avalancha* (Cascada + Mutaciones): con Romper el Infinito y pilas enormes.

**Pulido (1.2)**: con Esquirlas sumás reliquias "virtuales" a un tipo equipado. Costo (log10 de Esquirlas) = `1 + 0,477 × pulidos × pulido_x + log10(reliquias del tipo)`. `pulido_x` = 1, o 0,7/0,5/0,35/0,25 con Engarces II.

Inventario completo y auto-equipar quedan para la Capa 2 (ver §15).

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

Anillo = |x| + |y|. Anillos 0–2 en la 1.1 (13 nodos). Anillo 3 (12 nodos) en la 1.2, se ve en gris con un candado de hielo hasta abrir la Escarcha.

### 6.2 Costos (log10 de Cristales)

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
| **Sedimentación** | Conserva 11/13/15/17 compresiones. |
| **Estratos** | Abre la pantalla de Estratos. Flujo de los estratos ×1 / ×1,5 / ×2 / ×3. |
| **Defectos** | Abre Vacancia / Dislocación / Macla / Impureza. |
| **Ruptura** | nv1 = **Romper el Infinito**. Cristales ×1 / ×10 / ×100 / ×1000 (log 0/1/2/3). |
| **Compactación** | Densidad +0,08 / 0,16 / 0,24 / 0,32. |
| **Presión** | Peso de la Presión de todos los estratos ×1,2 / 1,44 / 1,73 / 2,07. |
| **Engarces** | Espacios de reliquia 2/2/3/3; ofertas 3/4/4/4. |
| **Cascada+** | Nivel máximo de Cascada +5/10/15/20 (y amplía el panel). |
| **Mutación+** | Nivel máximo de Mutaciones +1/2/3/5. |
| **Inercia** | Flujo de los estratos ×1,2/1,4/1,6/2. |
| **Cristalografía** | Cristales ×10^0,5 / 10^1 / 10^1,5 / 10^2. |
| **Eco II** | p +0,5/1/1,5/2. |
| **Defectos II** | Abre Fatiga / Frontera / Inclusión / Vidrio. |
| **Germen** | Crecimiento de la Escarcha ×1,5/2,25/3,4/5,1. |
| **Frío** | Aguante H de la Escarcha ×1,5/2,25/3,4/5,1. |
| **Compactación II** | Densidad +0,1/0,2/0,3/0,4. |
| **Sedimento II** | Peso de la Presión ×1,15/1,3/1,45/1,6. |
| **Capilaridad** | Flujo de los estratos ×1,1/1,2/1,3/1,4. |
| **Abismo** | Peso de la Presión ×1,1/1,2/1,3/1,4. |
| **Engarces II** | Espacios 3; Pulido más barato (×0,7/0,5/0,35/0,25 en el exponente). |
| **Cristalografía II** | Cristales ×10/100/1e3/1e4. |
| **Deshielo** | Rompe la Escarcha sola cada 30 min; Esquirlas ×1/2/4/8. |
| **Ruptura II** | Q −1/−2/−3/−4. |

**Romper el Infinito es un nodo** (Ruptura nv1, anillo 2, detrás de Eco). El primer Defecto (Vacancia) se juega antes o justo después; los siguientes ya con el Infinito roto.

---

## 7. Estratos

### 7.1 Qué son

Debajo de la pila principal hay 8 pilas más (estratos 1 a 8, de arriba a abajo). La arena que se escurre de la pila principal llena el estrato 1; el 1 alimenta al 2, y así. Cada estrato guarda una cantidad `s_k` (log10 de granos) que **no se pierde en el Infinito**. Cuanto más llenos y más profundos, más **Presión**, y la Presión multiplica la producción de la Arena.

### 7.2 Fórmulas (por segundo de juego de Arena; no corren en el Defecto Vidrio)

```
flujo   = 0,0013 × Estratos.flujo_x × Inercia.flujo_x × Capilaridad.flujo_x          (log10/s)
γ_k     = flujo × (1 + 0,3 × Permeabilidad_k) × (k == 1 ? f1 : 1)
f1      = clamp(log10(Caudal) / 30, 0,5, 3)          (más Caudal, más rápido se llena el primero)
s_k    += γ_k × dt,  pero nunca más que s_(k−1) − 2  (un estrato no puede pasar al de arriba)
Presión = Σ_k  0,009 × k × wx × (1 + 0,25 × NivelPresión_k) × s_k
wx      = Presión.w_x × Sedimento II.w_x × Abismo.w_x
```

La Presión se **suma a log10 V** (o sea, queda multiplicada por la Densidad como todo lo demás).

### 7.3 Compras (en Cristales, log10)

- Abrir el estrato k: 0, 2, 4, 7, 11, 16, 22, 29.
- Permeabilidad del estrato k (k = 0..7), nivel L: `1 + 1×k + 0,6×L + 0,1×L³/6`.
- Presión del estrato k, nivel L: misma fórmula (`presion` en config).

El término cúbico es lo que frena la explosión: el jugador sube todos los estratos parejo en vez de uno solo al infinito.

**Hito de la 1.1**: Estrato 8 con `s_8 ≥ 100` (1e100 granos) teniendo Vacancia, Dislocación, Macla e Impureza completos.

### 7.4 Vista 3D (three.js)

- En la pantalla de la Arena, debajo de la pila, una **flecha** discreta "↓ Estratos" (solo cuando ya hay estratos).
- La pantalla de Estratos es una escena 3D que **desciende**: arriba, la sombra de la pila principal (un disco oscuro difuso, no la pila real); debajo, cada estrato como una losa translúcida de hielo/sedimento con su mini-pila (un heightmap) y su número. Scroll o arrastre = la cámara baja de estrato en estrato. Los estratos sin abrir se ven como roca oscura con el costo encima.
- Cada estrato tiene **su propia interfaz** al costado (HTML, no en el canvas): `s_k`, su aporte a la Presión, y los botones Permeabilidad y Presión con costo y efecto.
- Partículas finas cayendo entre estratos con densidad proporcional a `γ_k` (visual, sin efecto).

**Optimización (obligatoria, medir 60 fps en una notebook integrada y en celular de gama media):**
- El renderer se crea al entrar a la pantalla y se **destruye** (`dispose` de geometrías, materiales, texturas y renderer) al salir. Nunca dos contextos WebGL a la vez además del de la pila.
- Render **a demanda**: un frame cuando cambia la cámara o el estado; las partículas a 30 fps como máximo; nada cuando la pestaña está oculta (`visibilitychange`).
- Los heightmaps se regeneran a 2 Hz como máximo, en una textura chica (64×64) desplazada en el shader de vértices; 8 losas = 8 mallas de 64×64 o una `InstancedMesh`.
- Partículas en un solo `Points` con buffer fijo (≤ 2000), sin crear objetos por frame.
- Sombras falsas (un quad con gradiente), sin `shadowMap`. `pixelRatio` tope 1,5 (1 en celular). Sin postprocesado en móvil.
- three.js con **versión exacta** en `package.json`, importando solo lo necesario.

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
- **Mejoras con Esquirlas** (costo en log10 de Esquirlas, nivel L): Crecimiento `0 + 0,4L` (×1,12 a g), Brillo `0,5 + 0,5L` (+0,04 a m), Aguante `0,5 + 0,4L` (×1,5 a H). Y el Pulido de reliquias (§5).
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

- **Barra lateral de capas** (izquierda, angosta): Arena → Cristalización. La Capa 2 aparece como silueta gris al final de la 1.2.
- Dentro de Cristalización, **segunda barra** con: **Red · Estratos · Defectos · Escarcha · Relicario**. Cada una es su propia pantalla a pantalla completa; nunca paneles encima de la pila. Las que no están abiertas no se muestran (o se muestran como "???" solo la siguiente).
- La pila principal **no se mueve nunca** por la interfaz (misma regla de la Capa 0).
- **Estética helada**: fondo azul noche casi negro, blancos fríos, cian tenue para lo nuevo; facetas de cristal (bordes con un brillo fino, ángulos de 60°). Los 4 colores de la Capa 0 siguen siendo los colores de nivel. Nada de "glassmorphism" genérico: el hielo es textura (grietas, escarcha en los bordes), no blur.
- Contadores arriba: Energía (Arena), Cristales, Cristales totales, Esquirlas (1.2).
- Primer Infinito: cinemática corta (la pila se congela desde abajo, se rompe en cristales, la cámara cae a la pantalla de Cristalización). Explica en 3 líneas qué son los Cristales y abre el primer Relicario.
- Guías integradas + panel de ayuda con las fórmulas (como en la Capa 0) para cada sistema nuevo.
- Textos en español rioplatense en el archivo de cadenas.

---

## 12. Offline

Mismo sistema de la Capa 0, con eficiencia **0,7** (`fuera_de_linea_eficiencia`) aplicada a la Energía, al llenado de los Estratos y al crecimiento de la Escarcha. Infinitos offline solo con Memoria nv4 (con la regla del Infinito automático). La Escarcha no se rompe sola offline salvo con Deshielo. Pantalla de regreso: qué ganaste (Cristales, estratos, Escarcha) en una tarjeta simple con la estética helada.

El simulador no modela el offline: hay que probarlo con un test aparte (12 h offline nunca rinden más que 12 h activas).

---

## 13. Guardado

- Versión de guardado nueva (v2) con migración desde v1: un jugador que ya tenía el Infinito de la Capa 0 arranca la Capa 1 con 1 Cristal y la primera oferta del Relicario.
- Se guarda: Cristales (break_infinity), Cristales totales, niveles de la Red, conteo de reliquias por tipo + pulidos + equipadas, número de Infinito y semilla, estratos abiertos, `s_k` (log10), niveles de Permeabilidad y Presión, Defectos completos, Escarcha `logX`, Esquirlas, mejoras de Escarcha, temporizador de la Escarcha.
- Exportar/importar como en la Capa 0. Test de ida y vuelta.

---

## 14. Problemas a evitar (lecciones del balance)

1. **Bucles multiplicativos**: Cristales → Presión → más Cristales explota. Por eso: costos cúbicos de los estratos, blando de Cristales sobre 1e50, Escarcha lineal en el tiempo. Cualquier efecto nuevo que escale con Cristales se mete en el simulador antes que en el código.
2. **Esperas vacías**: hueco máximo 32 min medido. Si un cambio crea un hueco > 40 min, el test de balance falla.
3. **Defectos imposibles o triviales**: las metas salen de `probe.py`, no a ojo.
4. **Azar frustrante**: semilla guardada, nunca 3 ofertas iguales, elección automática razonable.
5. **Números**: todo lo grande en log10 o break_infinity. `s_k`, `logX` y Cristales nunca en float lineal.
6. **Rendimiento**: three.js solo en su pantalla y destruido al salir; la pila sigue a 60 fps.
7. **Demasiadas monedas juntas**: en la 1.1 solo hay Cristales; Esquirlas recién en la 1.2.
8. **Árbol ilegible**: la Red se lee como una pila (rombo), con 4 colores; nada de líneas cruzadas ni árbol de habilidades clásico.
9. **Offline mejor que activo**: prohibido (test).
10. **Interfaz "de IA"**: nada de tarjetas con sombra y gradiente genéricas ni emojis; tipografía y layout de la Capa 0.

---

## 15. Ganchos para la Capa 2

- La Red crece: un anillo 4 (los datos de nodos están en config; se agrega sin tocar código).
- Inventario de reliquias, auto-equipar por build, cuarto tipo de reliquia.
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
| C3 | Relicario: ofertas con semilla, fusión, engarces, efectos | Opus |
| C4 | Estratos: lógica (`s_k`, Presión, compras) + interfaz 2D provisoria | Fable |
| C5 | Estratos: escena three.js descendente + optimización | Fable |
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

- Segundo Infinito ~1,1 h; Memoria completa ~1,6 h; Romper ~2,35 h; Vacancia ~2,45 h.
- Fin 1.1 en 6,5–7,5 h; fin de la capa en 14–16 h.
- Hueco máximo entre compras de la Capa 1 (desde la hora 1,5) < 40 min.
- Ninguna fuente de log V > 65 % al final de la 1.2.
- 12 h offline < 12 h activas.

El test puede ser lento: correrlo con un paso de tiempo grande (2 s) y marcarlo como "lento" (no en cada guardado, sí al cerrar cada hito).

---

## 18. Qué es aproximado (honesto)

- El bot elige reliquias y compras con reglas simples ("lo más barato primero", con prioridades). Una persona va a ir un poco más rápido o más lento; la robustez (cada 60 s / 5 min) muestra que el ritmo aguanta.
- Las corridas del final de la 1.2 duran 30–60 min (Infinitos grandes). Si en pruebas reales se sienten largas, bajar `cristales.blando_factor` hace más corto cada Infinito pero acelera el final: volver a calibrar `escarcha.g_por_presion`.
- La Presión pesa 55–59 %. Está pensado así, pero es lo primero a revisar con jugadores.
- Los Defectos 6 y 7 (Frontera, Inclusión) quedan a ~30 min uno del otro; está bien, pero se pueden separar subiendo el requisito de Inclusión.
- El offline no está simulado (ver §12).
