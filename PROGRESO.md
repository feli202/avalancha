# Progreso

Estado: **hitos 0 y 1 terminados** (proyecto base + núcleo económico). Sigue el hito 2 (pila visual).

## Qué se hizo

**Hito 0, proyecto base**

- Vite + TypeScript estricto + Svelte 5. Dependencias: `break_infinity.js`; de desarrollo, `vite`, `svelte`, `@sveltejs/vite-plugin-svelte`, `typescript`, `vitest`.
- Estructura: `src/core/` (economía), `src/render/` (vacío), `src/ui/` (Svelte y bucle), `src/strings/es.ts` (textos), `tests/`.
- `src/core/config.ts` importa `balance/config.json` con tipos. Es el único archivo que lo importa.
- Pantalla mínima (`src/ui/App.svelte`): Energía, Energía/s, G y el botón de Caudal.
- Panel de debug (`src/ui/Debug.svelte`), solo en desarrollo: velocidad ×1/×10/×50, dar Energía (×1000), saltar a la Compresión N, exportar el estado como JSON.

**Hito 1, núcleo económico (SPEC 4 completa)**

| Archivo | Contenido |
| --- | --- |
| `state.ts` | `State` y `estadoInicial()` |
| `formulas.ts` | costos, Caudal, colores e hitos, anillos, Cascada, Densidad, `valor`, `produccion`, `INFINITO` |
| `shop.ts` | `disponibles`, `costo`, `nivel`, `puedeComprar`, `comprar`, `comprarMax`, `aplicar` |
| `compress.ts` | `puedeComprimir`, `comprimir`, `autoActivo` |
| `tick.ts` | `tick(state, dt)`, `autocomprar`, `punado` |

- `tests/formulas.test.ts`: 22 tests, cada fórmula contra valores calculados a mano.
- `tests/balance.test.ts`: el bot de `sim.py` portado, jugando con el núcleo real; verifica los rangos de SPEC 10.

## Resultados del balance (jugador que revisa cada 15 s)

| Medida | Núcleo (test) | `sim.py` | Diferencia | Rango SPEC 10 |
| --- | --- | --- | --- | --- |
| Primera Compresión | 15,1 min | 15,1 min | 0 % | 13–17 |
| Compresiones | 17 | 17 | — | 17 |
| Primera Mutación | 123,1 min | 120,6 min | +2,1 % | 110–130 |
| Infinito | 197,2 min | 193,6 min | +1,9 % | 180–210 |
| Corrida más larga | 15,1 min | 15,1 min | 0 % | ≤ 16 |

Corridas del núcleo: 15,1 · 14,8 · 14,3 · 14,3 · 12,3 · 13,1 · 10,3 · 9,6 · 7,2 · 10,1 · 11,2 · 9,2 · 12,0 · 11,1 · 11,3 · 8,9 · 10,7 · 1,8.
Corridas de `sim.py`: 15,1 · 14,8 · 13,8 · 14,1 · 12,1 · 12,8 · 10,1 · 9,3 · 6,9 · 9,9 · 10,9 · 9,0 · 11,6 · 11,2 · 11,1 · 8,9 · 10,5 · 1,8.

La diferencia aparece desde la Compresión 2 (cuando llegan los autocompradores): el núcleo los dispara una vez por segundo y cada uno compra el máximo de lo suyo (SPEC 4.8); `sim.py` los deja comprar en cada paso (0,2 s al principio de la corrida) y en orden de mejor retorno.

## Decisiones de arquitectura

- **Estado inmutable.** `tick`, `comprar`, `comprimir` y `punado` devuelven un estado nuevo; si la acción no se puede hacer devuelven el mismo objeto. Es lo que hace el núcleo determinista y fácil de testear, y encaja con `$state.raw` de Svelte (se reemplaza el estado entero por cuadro; un proxy profundo rompería los `Decimal`).
- **`Decimal` para Energía, producción, costos y V.** G, Caudal y niveles son `number`: G no pasa de ~1e25 en la Capa 0.
- **Integración de Euler explícito**, igual que `sim.py`, para que los tiempos sean comparables. El test usa el mismo paso que el simulador (0,2 s los primeros 5 min de la corrida, después 1 s).
- **Los autocompradores y la Compresión automática viven dentro de `tick`** (con un reloj en el estado), así el progreso fuera de línea del hito 5 sale gratis. Orden fijo: Caudal, después los colores en el orden de `config.json`.
- **Ítems de la tienda con id de texto** (`caudal`, `color0`…`color3`, `cascada`, `mut_caudal`…), igual que `sim.py`: una sola función `comprar` para todo.
- **El bucle (`src/ui/juego.svelte.ts`) es lo único que conoce el tiempo real**: paso fijo de 50 ms con acumulador, multiplicado por la velocidad de debug.

## Decisiones que tomé donde la spec no alcanzaba (revisar)

1. **Constantes que faltaban en `config.json`.** Los efectos de las Mutaciones (×3, ×10, +0,02, +0,03) y el Puñado (5 granos, 8 por segundo) estaban solo en `SPEC.md` y escritos a mano en `sim.py`. Agregué `mutaciones.*.por_nivel` y `punado` a `config.json` con los valores de la spec. **`sim.py` sigue con sus valores escritos a mano**: si se cambia `por_nivel`, el simulador no se entera.
2. **Puñado (SPEC 4.10).** La spec no dice si da Energía. Lo implementé como 5 granos de Caudal: suman a G y cada uno rinde `K × G × V^D`. El límite de 8 por segundo es un enfriamiento en el estado.
3. **`objetivo_minutos` de `config.json` está desactualizado** (193 / 226 / 397) frente a `sim.py` y SPEC 2 (194 / 229 / 376). El test usa el de 15 s (193) como referencia del ±5 %; los otros dos no se usan.
4. **Paso de 50 ms en el juego real.** Con Euler, un paso más chico da un poco más de Energía que el paso de 1 s del simulador, así que el juego real va a ser algo más rápido que el test. No lo medí.

## Cómo correr y probar

```bash
npm install
npm run dev        # juego + panel de debug en http://localhost:5173
npm test           # tests unitarios y de balance
npm run typecheck  # tsc sobre los .ts (no revisa los .svelte)
npm run build
python balance/sim.py             # referencia (en esta máquina es `python`, no `python3`)
python balance/sim.py --timeline
```

Para ver los tiempos del bot: `npx vitest run tests/balance.test.ts --reporter=verbose`.

## Qué queda para el hito 2 (pila visual)

- Worker con la pila de 513×513 (`Uint8Array`, pila de celdas inestables, sumidero en el borde) en `src/render/`.
- WebGL2: textura de alturas + shader con colores, brillo por nivel y destellos de derrumbe.
- Ritmo `min(F, 3000)` granos por segundo; estado estacionario y etiqueta de escala al pasar la capacidad.
- Criterio: con G = 10.000, mismo radio, derrumbes totales y proporción de alturas que `balance/pila.c` (hace falta `gcc`).
- Conectar `punado()` al clic sobre la pila.
- Pendiente de esta sesión: medir los 60 fps con el panel del navegador visible (estaba oculto y no se pudo medir; un `tick` cuesta ~0,002 ms).
