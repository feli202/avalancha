## Antes de empezar: migración de partidas

Lo primero que se programa, antes que cualquier cosa de fuego: los Cristales pasan a tener un tope duro en 1e308 hasta el fuego de Ruptura, así que las partidas que hoy pasaron ese número tienen que volver atrás sin romperse.

- Cristales y Cristales totales por encima de 1e308 → quedan en 1e308.

- Todo lo comprado con Cristales por encima de lo que se puede pagar con menos de 1e308 se devuelve: se bajan niveles (Estratos, Permeabilidad, Presión, nodos de la Red) del más caro al más barato hasta que lo gastado entre en 1e308. Lo devuelto no se reembolsa (ya están en el tope).

- Lo mismo con las Esquirlas si su economía se recalibra.

- Antes de migrar, se guarda una copia de respaldo de la partida original.

- Al cargar, un aviso corto: "Avalancha se actualizó a la Capa 2. Tu partida llegó al límite de la Capa 1 (1e308 Cristales): ya podés hacer tu primera Fundición."

- Tests con partidas reales de fin de Capa 1, de mitad de Capa 1 (no se tocan) y con valores rotos.

### Cómo quedó (fase 1A, para todos, sin la marca de beta)

- El tope es `topeCristales(s)` en `src/core/infinito.ts`, el único lugar: hoy es `INFINITO` (1,797e308, el mismo umbral de `finCapa1`; nunca menor, si no el fin no llega). El fuego de Ruptura lo va a levantar ahí.
- El cierre del Infinito deja Cristales y Cristales totales en el tope.
- `toparCristales` (`src/core/tope.ts`) corre en `deserializar` cuando Cristales o totales pasan el tope: los baja al tope, saca todo nivel que solo ya cuesta más que el tope y después baja de a un nivel el más caro (Red, abrir Estratos, Permeabilidad, Presión) hasta que `gastado` entre. Una partida justo en el tope no se toca, así que no migra dos veces.
- `cargar` guarda la original en `COPIA_TOPE` (ver `docs/general/guardado.md`) y el aviso sale al dejar el título.
- Esquirlas: no se compran con Cristales ni cambian todavía, no se tocan.
- El aviso no menciona la Fundición (todavía no existe para el juego público): "…quedó en el tope, lista para la Capa 2."
- En el tope, el Infinito automático "×10 los Cristales" no se dispara (no hay qué multiplicar; si no, la Arena se reiniciaba sin parar) y los avisos de Infinito no muestran "+0 Cristales".
- Partida real de fin de Capa 1 (`docs/capa2/partidas/mi_partida_fin_capa1.txt`, 1,4e1672 Cristales): se devuelven Permeabilidad de los 8 estratos (30–42 → 26) y Presión de los estratos 1–6 (30–42 → 26). La Red y los Estratos abiertos quedan enteros.
