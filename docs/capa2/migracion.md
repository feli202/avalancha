## Antes de empezar: migración de partidas

Lo primero que se programa, antes que cualquier cosa de fuego: los Cristales pasan a tener un tope duro en 1e308 hasta el fuego de Ruptura, así que las partidas que hoy pasaron ese número tienen que volver atrás sin romperse.

- Cristales y Cristales totales por encima de 1e308 → quedan en 1e308.

- Todo lo comprado con Cristales por encima de lo que se puede pagar con menos de 1e308 se devuelve: se bajan niveles (Estratos, Permeabilidad, Presión, nodos de la Red) del más caro al más barato hasta que lo gastado entre en 1e308. Lo devuelto no se reembolsa (ya están en el tope).

- Lo mismo con las Esquirlas si su economía se recalibra.

- Antes de migrar, se guarda una copia de respaldo de la partida original.

- Al cargar, un aviso corto: "Avalancha se actualizó a la Capa 2. Tu partida llegó al límite de la Capa 1 (1e308 Cristales): ya podés hacer tu primera Fundición."

- Tests con partidas reales de fin de Capa 1, de mitad de Capa 1 (no se tocan) y con valores rotos.
