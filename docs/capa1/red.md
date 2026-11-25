# Capa 1 · Red

Núcleo: `src/core/red.ts`. UI: `src/ui/Red.svelte` (SVG), `src/render/redCaras.ts`. Datos de nodos: `config_capa1.json → red.nodos` (agregar un nodo no requiere tocar código). Tests: `tests/red.test.ts`, `tests/anillo3.test.ts`.

## Forma

Rombo de nodos alrededor de **Memoria**. Cada nodo tiene 4 niveles: nv1 Ámbar, nv2 Coral, nv3 Jade, nv4 Violeta. Un nodo se abre cuando un vecino ortogonal más cercano al centro tiene su **primer nivel** (`red.abre_con_nivel` = 1, `ABRE_RED`), más requisitos propios (`requiere`: Estratos pide Ruptura nv1; el anillo 3, la Escarcha).

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

Anillo = |x| + |y|. Anillos 0–2: 13 nodos. Anillo 3: 12 nodos, bajo el hielo hasta abrir la Escarcha.

## Costos (log10 de Cristales)

Costo del nivel L (0..3) = `base + paso × L` (por anillo, o por nodo con `costo_base_log10` / `paso_log10` / `costos_log10`). Cada nivel cuesta al menos ×10 el anterior (test).

| | base | paso | Niveles 1/2/3/4 |
|---|---|---|---|
| Memoria | 0 | 1 | 1 / 10 / 100 / 1000 |
| Anillo 1 (Eco, Sedimentación, Estratos) | 0 | 2 | 1 / 1e2 / 1e4 / 1e6 |
| Defectos | — | — | 1 / 1e15 / 1e20 / 1e27 (`costos_log10`) |
| Ruptura, Cristalografía | 0 | 2 | 1 / 1e2 / 1e4 / 1e6 |
| Compactación, Engarces | 0 | 3 | 1 / 1e3 / 1e6 / 1e9 |
| Resto anillo 2 (Presión, Cascada+, Mutación+, Inercia) | 1 | 3 | 10 / 1e4 / 1e7 / 1e10 |
| Anillo 3 | del nodo | 5 | |

Bases del anillo 3: Eco II 45, Defectos II 55, Germen 65, Compactación II 78, Frío 92, Sedimento II 108, Capilaridad 126, Cristalografía II 146, Abismo 168, Engarces II 192, Deshielo 220, Ruptura II 250.

## Nodos

| Nodo | nv1 / nv2 / nv3 / nv4 |
|---|---|
| **Memoria** | Autocompradores y compresión automática desde el inicio del Infinito / + Cascada automática / + Mutaciones automáticas / + Infinito automático. Conserva 5/7/9/11 compresiones (comprada a mitad de corrida, la corrida salta ahí). |
| **Eco** | `+p × log10(Cristales totales)` a log V; p = 0,5 / 1,5 / 3 / 5 |
| **Sedimentación** | La Compresión deja de reiniciar: nv1 Caudal, nv2 colores, nv3 Cascada; nv4 el Infinito no reinicia las Mutaciones. No conserva compresiones. |
| **Estratos** | Pide Ruptura nv1. Abre los Estratos. Flujo ×1 / 1,5 / 2 / 3 |
| **Defectos** | Abre Vacancia / Dislocación / Macla / Impureza |
| **Ruptura** | nv1 = **Romper el Infinito**. Cristales ×1 / 10 / 100 / 1000 |
| **Compactación** | Densidad +0,08 / 0,16 / 0,24 / 0,32 |
| **Presión** | Peso de la Presión ×1,2 / 1,44 / 1,73 / 2,07 |
| **Engarces** | Engarces 2/2/3/3; nv4: 2 reliquias por Infinito |
| **Cascada+** | Nivel máximo de Cascada +5/10/15/20 |
| **Mutación+** | Nivel máximo de Mutaciones +1/2/3/5 |
| **Inercia** | Flujo de estratos sube lineal con el tiempo de corrida hasta ×1,2/1,4/1,6/2 a los 10 min |
| **Cristalografía** | Cristales ×10^0,5 / 10^1 / 10^1,5 / 10^2 |
| **Eco II** | Crecimiento de la Escarcha × (1 + 0,001/0,002/0,003/0,004 × log10(Cristales totales)) |
| **Defectos II** | Abre Fatiga / Frontera / Inclusión / Vidrio |
| **Germen** | Crecimiento de la Escarcha ×1,5/2,25/3,4/5,1 |
| **Frío** | Punto de ruptura de la Escarcha ×1,5/2,25/3,4/5,1 |
| **Compactación II** | Densidad +0,0001/0,0002/0,0003/0,0004 por anillo de la corrida |
| **Sedimento II** | Peso de cada estrato `k` → `k^1,05 / 1,1 / 1,15 / 1,2` |
| **Capilaridad** | Separación entre estratos 2 → 1,75 / 1,5 / 1,25 / 1 |
| **Abismo** | Estrato en su tope pesa ×1,1/1,2/1,3/1,4 (el 1 cuenta siempre como lleno) |
| **Engarces II** | Fusión automática, engarces 3, Pulido más barato (×0,7/0,5/0,35/0,25 en el exponente) |
| **Cristalografía II** | Cristales ×10^(0,125/0,25/0,375/0,5 × Defectos completos) |
| **Deshielo** | Rompe la Escarcha sola al llegar al Punto de ruptura; Esquirlas ×1/2/4/8 |
| **Ruptura II** | Q −1/−2/−3/−4 |

Cada nodo tiene mecánica propia. Romper el Infinito es la llave de los Estratos (y de Presión y Abismo, detrás).

## Cómo se ve

Plana, en SVG. Cada nodo es una mini pila abeliana teñida con el color de su nivel, con emblema, nombre y cuatro cuadros de nivel (44 px en el celular). Los nodos abiertos se unen con escarcha (trazo fino con ramitas a 60°). Al comprar el nv1 la arena "se derrumba" hacia los vecinos (sonido grande en el nv4); se saltea con Reducir destellos. Anillo 3: bloques escarchados con un copo, sin nombre; más allá, dos anillos de puntos que se apagan. Un nodo cerrado no dice qué da. Zoom propio (rueda, pellizco, barra; doble clic = encuadre), no se guarda. Ficha al costado (abajo en el celular): nivel, "Ahora: … · Siguiente: …", botón con costo.
