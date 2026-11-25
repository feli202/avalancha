# Capa 0 · Compresión e Infinito

Núcleo: `src/core/compress.ts`, `infinito.ts`. Constantes en `balance/config.json` (`compresion`, `infinito_log10`).

## Compresión

Al alcanzar el umbral del siguiente nivel se puede comprimir.

- **Reinicia**: Energía, G, Caudal, niveles de colores, Cascada, anillos (Sedimentación nv1–3 conserva Caudal / colores / Cascada, ver [../capa1/red.md](../capa1/red.md)).
- **Conserva**: nivel de Compresión, Mutaciones, colores desbloqueados, autocompradores, estadísticas.

```
D = 1 + 0,12 × compresiones          (+ Compactación, Compactación II, Frontera en la Capa 1)
umbrales (log10 E) = 17, 28, 36, 46, 56, 65, 80, 91, 102, 117, 148, 172, 205, 233, 253, 275, 295
```

Con 17 compresiones D = 3,04; después no hay más umbrales y la corrida llega sola al Infinito. Umbrales fijos: comprimir temprano o tarde no rompe el balance.

Compresión automática desde la Compresión 6 (al llegar al umbral o esperando X s, ver [../capa1/automatizacion.md](../capa1/automatizacion.md)).

**Visual**: animación de 1,5 s, la pila implota al centro con estela de los cuatro colores, destello blanco y "Densidad ^1,60"; la pila arranca de cero. Con ahorro o Reducir movimiento, un destello simple. Debe sentirse recompensa, no pérdida.

**Barra**: avanza en escala log del umbral anterior al siguiente, con tiempo estimado; aparece al llegar a 1e12 por primera vez. Después de Romper el Infinito, la Compresión queda en su propio panel arriba ("11/17 compresiones · Compresión 12 · 1e172 · 100 %") y el botón grande pasa a Infinito.

**Camino al Infinito**: línea de 2 px en el margen izquierdo, log10(E) / `infinito_log10`, con marca en cada umbral, punta brillante y ∞ arriba. Aparece con la Compresión y se va al romper el Infinito (lo reemplaza el carámbano hacia la Capa 2, ver [../capa1/interfaz.md](../capa1/interfaz.md)).

## Infinito

Al llegar a 2^1024 ≈ 1,8e308 (`infinito_log10` = 308,2547) se congela la economía. Un solo número (`CFG.infinito_log10`) para tope, condición (`enInfinito`), barra y porcentaje.

Primer Infinito: la pila se vuelve blanca desde el centro, la Energía se transforma en "∞", la pila colapsa en un punto, un segundo de silencio y la cinemática de la Capa 1 (la pila se congela desde abajo, se rompe en cristales y la cámara cae a Cristalización). Lo que da cada Infinito después: [../capa1/cristales.md](../capa1/cristales.md).

Lección (v1.0, "trabado en 99 %"): la vista refrescaba limitada y descartaba el último cambio; como en 1e308 el estado no cambia, quedaba congelada. `crearRefresco` (`limite.ts`) siempre muestra el último valor. Un NaN/Infinity en la economía se anota y se sigue desde el último estado válido (`campoInvalido`, `valido.ts`).
