# Capa 1 · Cristales e Infinito

Núcleo: `src/core/infinito.ts`. Config: `config_capa1.json → cristales`, `infinito_auto`. Referencia: `balance/ref_cristales.py`, `tests/cristales.test.ts`.

Todo en log10. `E` = log10 de la Energía al hacer Infinito. `INF` = 308,2547.

**Sin Romper el Infinito**: la Energía se frena en 1e308 y cada Infinito da `floor(10^(mult + 0,35))` Cristales (2 al principio).

**Con Romper el Infinito** (Ruptura nv1):

```
lc = mult + 0,35 + max(0, E − INF) / Q          (Q = 150 − Ruptura II)
si lc > 50:  lc = 50 + (lc − 50) × 0,3            (blando)
si lc < 6:   Cristales = floor(10^lc)
```

- `mult` = Ruptura (0/1/2/3) + Cristalografía (0,5/1/1,5/2) + Cristalografía II (0,125/0,25/0,375/0,5 por Defecto completo) + 3 si Vidrio completo. En el Defecto Vidrio `mult` = 0.
- `Cristales totales` nunca bajan; los piden los Defectos 5–8 y el fin de la capa (1e308).
- Cristales en break_infinity; contadores arriba: Cristales, Cristales totales, Esquirlas.

## Cuándo hacer Infinito

Con la Energía pasada 1e308 conviene cuando los Cristales/s (`10^lc / duración`) dejan de subir. La interfaz muestra "Cristales al hacer Infinito: X (Y/min)" y marca con un brillo el óptimo.

## Infinito automático (Memoria nv4)

Modos: **Apenas llegás**; con Romper el Infinito, **Al llegar a X Cristales** o **Multiplicar mis Cristales** ×N (por defecto ×10, `infinito_auto.multiplicar_x`; guardado en log10 en `automat.infinito.mult`). Los campos aceptan notación científica (1e12, 1,5e30) vía `leerLog10` (`numeroTexto.ts`) y muestran cómo se entendió. Un guardado con "óptimo" pasa a Apenas llegás. Dentro de un Defecto el Infinito (manual o automático) no corre. Offline no hay Infinitos.

Cada Infinito da una reliquia (dos con Engarces nv4): ver [relicario.md](relicario.md). Los avisos de Infinitos automáticos se juntan (sección Avisos en Ajustes).
