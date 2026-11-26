## El Horno y el Vidrio

El fondo vacío del embudo de los Estratos (el estrato 9) se enciende con el fuego del nodo Estratos y funde en Vidrio la arena que baja. El Vidrio es permanente (no se pierde al fundir); el Horno produce más cuanto más llenos están los estratos de esa vuelta, así que cada vuelta arranca lento y acelera.

\text{Vidrio/s} = 0{,}001 \cdot 10^{\,0{,}01 \cdot s_8} \cdot M_{\text{Horno}}

(s_8 = log10 de los granos del estrato 8; con los estratos que abren llenos, s_8 ≥ 291.) M_Horno = 2^Temperatura del Horno × (1 + 0,5 × calor del sector Estratos) × 2^(estratos llenos) con Abismo ardiente × 10^(0,001 × p × log10 C) con Eco del Horno; Sedimento fundido multiplica el 0,01 del exponente por 1,5. Cristal fundido (Cristalografía de fuego): cada Infinito suma 10 s de Vidrio.

### Mejoras del Horno (con Vidrio; el nivel L cuesta 10^(c0 + paso·L + cub·L³/6), redondeado al exponente entero)

| Mejora | Qué hace | c0 | paso | cub |
|---|---|---|---|---|
| Temperatura del Horno | Vidrio/s ×2 por nivel | 1 | 1 | 0,1 |
| Tiro | Flujo de los 8 estratos +0,1 por nivel (se suma a Convección) | 2 | 1,5 | 0,2 |
| Crisol | M_B +1 por nivel (más Brasas al fundir) | 3 | 2 | 0,3 |
| Calor latente | +50 K por nivel | 3 | 2 | 0,2 |
| Templado | Reliquias engarzadas ×(1 + 0,1 por nivel) (automático) | 4 | 2 | 0,2 |

El bot compra la más barata primero. El Crisol llega a nv1 a las ~2:20 y a nv4 a las ~9:00: las Brasas por Fundición suben de a una ("1, 2, 3…"). Con el Vidrio del punto de partida (v0 = 1, Crisol c0 1) el Crisol llegaba a nv4 enseguida y las vueltas caían a 2 min a las 3 h.

Visual: el fondo del embudo brilla naranja; la arena que cae se derrite en gotas de vidrio que se juntan abajo. Los estratos de abajo se ponen rojizos con la Convección (Capilaridad de fuego).

### En el código (fase 5, solo en la beta)

- `src/core/fuego.ts`: `hornoEncendido` (El Horno y los 8 estratos abiertos), `vidrioLog10` / `vidrioPorSegundo` (como `vidrio_log` de `sim_capa2.py`, sin Sedimento fundido, Abismo ardiente ni Eco del Horno, que llegan con sus fuegos), `fundirVidrio` (en el tick, también con la Arena frenada en 1e308 y fuera de línea), `vidrioAlInfinito` (Cristal fundido), `costoHornoLog10` / `mejorarHorno`, `flujoFuego` (Tiro × sector Estratos, en `flujoEstratos`), `templadoX` (en el efecto de las reliquias). Crisol en `brasasAlFundir`, Calor latente en `temperatura`.
- Estratos llenos (de [escalado_ignicion.md](escalado_ignicion.md)) adelantado a esta fase: sin eso el Horno arranca en s_8 ≈ 0 y no da nada. `abrirLlenos` en `src/core/estratos.ts`, desde la primera Fundición. El escalado de la Permeabilidad sigue pendiente (fase 9).
- Guardado: `fuego.vidrio` (Decimal, como [mantisa, exponente]) y `fuego.horno` (niveles); una partida de la fase 4 los recibe en cero.
- Interfaz: el estrato 9 se elige en la pantalla de los Estratos (tocándolo o con ↓) y su ficha tiene el Vidrio, el Vidrio/s y las 5 mejoras. El Motor muestra el Vidrio y gotas en la órbita desde la etapa 2.
- Visual (`render/embudo.ts`, `estratosLienzo.ts`): con el Horno encendido la arena que llega al fondo no se pierde, se calienta y se derrite en gotas que se juntan abajo; pasado un nivel el vidrio de abajo se escurre. Fondo y resplandor naranjas, que laten salvo con Reducir destellos. Corre en el mismo worker de los Estratos (vive solo con la pantalla abierta, 20 pasos por segundo).
- Tests: `tests/horno.test.ts` contra `tests/fixtures/capa2_horno.json`, que escribe `python balance/ref_capa2.py` llamando a las funciones del simulador (mismo estado ⇒ mismo Vidrio/s, Temperatura, flujo, M_B, costos y Templado); física del fondo en `tests/embudo.test.ts`.
