### Las liberaciones (se abren en momentos distintos)

Cada una rompe un tope de la Capa 1 con un softcap fuerte: pasado el tope, cada nivel rinde la raíz cuadrada de lo que rendía (la mitad en log10) y su costo suma j(j+1)/2 órdenes al normal (j = niveles pasados el tope: el primero ×10, el segundo ×1.000, …). Cada una tiene su palabra icónica, que aparece grande al comprarla.

- **Lecho**: la compresión 17 + j pide 295 × 1,25^j de Energía (log10) y suma 0,03 de Densidad (cada una de las 17 normales suma 0,12). No usa el softcap común: su costo es un umbral de Energía, no un precio, y su escalado es el calibrado en el simulador.
  Fase 3: `umbralLog10` (`compress.ts`) y `densidad` (`formulas.ts`); `ultimaCompresion` hace que sin Romper la meta siga siendo el Infinito (la 18 pide más de 1e308). El guardado deja pasar de 17 compresiones solo con Lecho.
- **Desborde** y **Metamorfosis**: niveles de Cascada y Mutaciones pasados el máximo, con el softcap de arriba.
- **Inercia eterna**: el impulso de los estratos (×2 a nv4) se multiplica por 1 + √(horas de la vuelta).

| Liberación | Nodo | Momento aproximado | Palabra |
|---|---|---|---|
| Compresiones sin tope | Sedimentación | Fundición 2 (1:11 en el simulador) | LECHO |
| Cascada sin máximo | Cascada+ | ~1,5 h (1:45) | DESBORDE |
| Mutaciones sin máximo | Mutación+ | ~2,5 h (2:39) | METAMORFOSIS |
| Inercia sin tope | Inercia | ~4 h (4:11) | ETERNA |

### Cómo quedó (fase 6, beta)

- Softcap común en `src/core/fuego.ts`: `nivelLiberado(n, tope)` (= `efectivo` de `sim_capa2.py`) y `extraLiberado(n, tope)` (= `extra`), con `liberaciones.rinde` y `paso_extra` de config. Lo usan Desborde y Metamorfosis; el tope es el máximo viejo (`maxCascada`, `maxMutacion`, que sube con Cascada+ y Mutación+ de la vuelta).
- **Desborde** / **Metamorfosis**: `limiteCascada` / `limiteMutacion` (Infinity con el nodo) en la tienda, el "Máx" y los autocompradores, que siguen pasado el tope viejo; el efecto usa `cascadaEf` / `mutEf` (caudal, anillos, c de la Cascada, valor, desglose y ayudas). Sin el nodo nada cambia. El guardado deja pasar del máximo solo con el nodo (y la marca de beta).
- **Densidad ígnea**: `densidadFuego` ×1,5; el calor del Motor sale de `milesK` (sin el ×1,5, como `dk` del simulador). **Inercia eterna**: `impulso` × (1 + √(horas de la vuelta)), con `fuego.vuelta` (segundos desde la última Fundición, nuevo en el guardado: las partidas de la fase 5 cargan con 0). **Magma**: peso de cada estrato × (1 + 0,2 × kK).
- La palabra (`Palabra.svelte`, textos en `fuego.palabras`): al encender Lecho infinito, Desborde, Metamorfosis o Inercia eterna aparece LECHO, DESBORDE, METAMORFOSIS o ETERNA en el centro de la pantalla, 2,8 s, una sola vez (la compra es permanente). Degradé de brasa con halo naranja, sube desenfocada y se apaga subiendo; titila dos veces (menos de 3 por segundo). Con Reducir destellos o ahorro solo aparece y se apaga. En inglés: BEDROCK, OVERFLOW, METAMORPHOSIS, ETERNAL.
- Tests: `tests/liberaciones.test.ts` contra `tests/fixtures/capa2_liberaciones.json`, que escribe `balance/ref_capa2.py` llamando a `efectivo`, `extra`, `costo`, `comprar` (Lecho), `Arena.D`, `Fuego.dens` y `Jugador.v` del simulador.
