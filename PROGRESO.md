# Progreso

Estado: **hitos 0, 1 y 2a terminados** (proyecto base, núcleo económico, pila visual). Sigue el hito 2b (anillos, textos flotantes y demás efectos de la pila) y el 3 (interfaz).

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

1. **Constantes que faltaban en `config.json`.** Los efectos de las Mutaciones (×3, ×10, +0,02, +0,03) y el Puñado (5 granos, 8 por segundo) estaban solo en `SPEC.md` y escritos a mano en `sim.py`. Agregué `mutaciones.*.por_nivel` y `punado` a `config.json` con los valores de la spec. `sim.py` ahora lee los `por_nivel` de `config.json` (su salida quedó idéntica); el Puñado no está en el simulador.
2. **Puñado (SPEC 4.10).** La spec no dice si da Energía. Lo implementé como 5 granos de Caudal: suman a G y cada uno rinde `K × G × V^D`. El límite de 8 por segundo es un enfriamiento en el estado.
3. **`objetivo_minutos` de `config.json` está desactualizado** (193 / 226 / 397) frente a `sim.py` y SPEC 2 (194 / 229 / 376). El test usa el de 15 s (193) como referencia del ±5 %; los otros dos no se usan.
4. **Paso de 50 ms en el juego real.** Con Euler, un paso más chico da un poco más de Energía que el paso de 1 s del simulador, así que el juego real va a ser algo más rápido que el test. No lo medí.

## Cómo correr y probar

```bash
npm install
npm run dev        # juego + panel de debug en http://localhost:5173
npm test           # tests unitarios, de balance y de la pila
npm run typecheck  # tsc sobre los .ts (no revisa los .svelte)
npm run build
python balance/sim.py             # referencia (en esta máquina es `python`, no `python3`)
python balance/sim.py --timeline
```

Para ver los tiempos del bot: `npx vitest run tests/balance.test.ts --reporter=verbose`.

## Hito 2a, la pila visual

| Archivo | Contenido |
| --- | --- |
| `src/render/pila.ts` | La pila de arena: `Uint8Array` de 513×513, sumidero en el borde, cola de celdas inestables, multi-derrumbe. Pura (sin DOM ni reloj): la usan el worker y el test. |
| `src/render/pila.worker.ts` | Web Worker. Recibe `{ granos, reiniciar, gen }`; devuelve `{ hechos, tamano, celdas, alturas, radio, perdidos, estable, ms }`: las celdas derrumbadas y el tamaño de la avalancha de ese cuadro. |
| `src/render/pilaVisual.ts` | `PilaVisual`: reparte los granos, habla con el worker y dibuja con WebGL2 (textura R8 de alturas + textura R32F con el instante del último derrumbe de cada celda + un shader de fragmentos). |
| `src/ui/Pila.svelte` | El canvas a ventana completa detrás de la interfaz; conecta el estado del núcleo (G, Caudal, niveles de color) y el Puñado (clic, toque, barra espaciadora). |
| `tests/pila.test.ts` | Criterio del hito y prueba del sumidero. |

Cómo funciona:

- **Granos.** Mientras no cayó ningún grano al sumidero, la pila de pantalla es la real: cada cuadro se manda al worker `floor(G)` menos lo ya mandado (Caudal y Puñados entran solos porque los dos suman a G). Cuando el worker avisa del primer grano perdido, esa cantidad queda como capacidad (medida: **489.700 granos**; la spec dice ~470.000) y se pasa al estado estacionario: `min(F, 3000)` granos por segundo. Si G baja (Compresión), la pila se vacía.
- **Etiqueta de escala.** "1 grano = 10^k granos" con `k = floor(log10(G / capacidad))`; aparece cuando k ≥ 1, o sea con G diez veces la capacidad.
- **Avalanchas repartidas entre cuadros.** El worker trabaja hasta 12 ms por pedido y, si la avalancha no terminó, sigue en el pedido siguiente. Así una avalancha grande se ve como una onda que sale del centro y nunca congela la pila (sin esto, una sola avalancha con la pila llena tardaba hasta 300 ms).
- **Dibujo.** Colores de SPEC 6.1 por altura; "adentro de la pila" = la celda tiene granos o se derrumbó alguna vez, afuera se ve el fondo (azul noche con viñeteado, hecho en el shader). Celdas de un número entero de píxeles reales del dispositivo, pila centrada, encuadre que sigue al radio. `u_brillo` (un valor por altura) sale de `log10(mult. del color)` y satura suave. Destello aditivo que decae en 300 ms; con `prefers-reduced-motion` queda apagado.

### Verificación

**Criterio G = 10.000** (`npx vitest run tests/pila.test.ts --reporter=verbose`): idéntico a la referencia.

```
visual  N 10000 T 1830917 r 38.6 h0 597 h1 452 h2 1360 h3 2276
pila.c  N 10000 T 1830917 r 38.6 h0 597 h1 452 h2 1360 h3 2276
```

**Ojo:** en esta máquina no hay compilador de C (ni gcc, clang, MSVC ni WSL), así que `balance/pila.c` no se compiló. La línea "pila.c" sale de un port literal de su modo `bulk` escrito dentro del test (pila LIFO, todos los granos de una vez), contra la pila del juego (cola FIFO, granos en lotes desparejos, en tandas). Falta correr `gcc -O3 -o pila balance/pila.c -lm && ./pila bulk 10000` y comparar con esa línea.

**Rendimiento** (AMD Radeon integrada, canvas de 1280×960 px reales, pila llena, Caudal 4.096/s):

| Medida | Resultado |
| --- | --- |
| fps del panel de debug | **No se pudo medir**: el navegador integrado corre la página a 1 fps cuando la ventana no está a la vista, y no hay Chrome instalado. Falta leerlo con el juego a la vista. |
| Hilo principal por cuadro (repartir granos, subir texturas, dibujar) | 0,2–0,8 ms |
| GPU por dibujo (dibujar + `readPixels` para forzar que termine) | 1,7 ms |
| Granos por segundo sostenidos con la pila llena | ~2.900 de 3.000 (30 muestras de 1 s: entre 2.268 y 3.780) |
| Worker | 850–1.000 ms de cada segundo: **un núcleo casi entero** (~17.500 derrumbes por grano, ~50 millones de derrumbes por segundo) |

Lo que dicen los números: el dibujo usa ~2,5 ms de los 16,7 ms de un cuadro, así que los 60 fps no deberían depender de la pila; el límite es el worker, que en esta máquina llega justo a los 3.000 granos/s. En una máquina más lenta soltará menos granos por segundo (el ritmo baja solo, sin acumular deuda ni afectar los fps). Si hace falta más margen, el paso siguiente es pasar el bucle de derrumbes a WebAssembly. No está medido el costo de recibir cada respuesta del worker en el hilo principal (un bucle sobre las celdas derrumbadas).

### Decisiones donde la spec no alcanzaba (revisar)

1. **Cola FIFO en vez de pila LIFO** para las celdas inestables. Con LIFO una celda puede esperar mientras sus vecinas se derrumban cientos de veces y pasarse de 255: no entra en un `Uint8Array`. Con FIFO el máximo demostrable es 255. El resultado final es el mismo (la pila es abeliana).
2. **El panel de debug suma "Caudal +1 nivel"** (para llegar a 3.000 granos/s sin jugar) y las medidas de la pila.
3. **Una deuda grande de granos se pone al día a toda velocidad** (saltos de debug, velocidad ×50, pestaña oculta): llenar la pila desde cero tarda ~90 s de worker. Para cargar partidas (hito 5) conviene un llenado directo.
4. **La pantalla mínima del hito 0 quedó arriba a la izquierda** para no tapar la pila.

### Queda afuera (otra sesión)

- Anillos, textos flotantes "Avalancha ×N", animación de alejamiento al saltar de escala, animación de color nuevo.
- Los colores todavía bloqueados se pintan igual que los desbloqueados.
- Opción "Reducir destellos" en Ajustes (hoy solo sigue al sistema) y pérdida de contexto WebGL.
