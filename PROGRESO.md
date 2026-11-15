# Progreso

Estado: **hitos 0, 1, 2a, 2b, 3 y 4 terminados** (proyecto base, núcleo económico, pila visual, efectos de la pila, interfaz principal, Compresión y sistemas tardíos), **Pulido 1** (estilo Arena) y **Pulidos 2, 3 y 4** (rediseño de la interfaz, borde circular, paleta invertida de la pila, supermuestreo). **Hito 5** terminado: 5a (guardado base y progreso fuera de línea) y 5b (exportar/importar, ajustes, estadísticas, logros, teclado). **Rediseño de Logros, Estadísticas y Ajustes**: las tres son pantallas completas (Ajustes: aspecto con vistas previas, juego, partida y teclado) (Logros: 24 logros, mini pilas y recompensas cosméticas; Estadísticas: desglose de la producción, corridas, avalanchas y general). **Hito 6** (pulido técnico): sonido, móvil y tablet, accesibilidad (Lighthouse 100) y rendimiento (60 fps en GPU integrada). **Primeros 10 segundos**: pantalla de título, logo y primera avalancha con el primer toque. **Guardar imagen**: PNG de 2048×2048 de la pila (botón de cámara, tecla P, "Guardá tu mandala" en el Infinito). **Sonido sintetizado**: todo el audio generado por código con Web Audio (sin archivos), con música generativa. **Guías**: indicadores de sistema nuevo, tooltips y la pantalla "Cómo funciona". La Capa 0 está completa. **Clips verticales** para redes en `marketing/clips/` (modo grabación del panel de debug).

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
| Primera Compresión | 14,6 min | 14,6 min | 0 % | 13–17 |
| Compresiones | 17 | 17 | — | 17 |
| Primera Mutación | 122,3 min | 120,6 min | +1,4 % | 110–130 |
| Infinito | 196,4 min | 194 min | +1,2 % | 180–210 |
| Corrida más larga | 14,8 min | 14,8 min | 0 % | ≤ 16 |

Corridas del núcleo: 14,6 · 14,8 · 14,0 · 14,3 · 12,3 · 13,1 · 10,3 · 9,6 · 7,2 · 10,1 · 11,2 · 9,2 · 12,0 · 11,1 · 11,3 · 8,9 · 10,7 · 1,8.
Corridas de `sim.py`: 14,6 · 14,8 · 14,3 · 14,1 · 12,1 · 12,8 · 10,1 · 9,3 · 6,9 · 9,9 · 10,9 · 9,0 · 11,6 · 11,2 · 11,1 · 8,9 · 10,5 · 1,8.

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
3. **`objetivo_minutos` de `config.json` está desactualizado** (193 / 226 / 397) frente a `sim.py` y SPEC 2 (194 / 228 / 376; el 229 era un error). **Resuelto (M8 de la auditoría): ahora dice 194 / 228 / 376.** El test usa el de 15 s (193) como referencia del ±5 %; los otros dos no se usan.
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

- **Granos.** Mientras no cayó ningún grano al sumidero, la pila de pantalla es la real: cada cuadro se manda al worker `floor(G)` menos lo ya mandado (Caudal y Puñados entran solos porque los dos suman a G). Cuando el worker avisa del primer grano perdido, esa cantidad queda como capacidad (medida: **463.250 granos** con el borde circular del Pulido 2; con el borde cuadrado eran 489.700; la spec dice ~470.000) y se pasa al estado estacionario: `min(F, 3000)` granos por segundo. Si G baja (Compresión), la pila se vacía.
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

- ~~Anillos, textos flotantes, alejamiento al saltar de escala~~ (hito 2b). Animación de color nuevo.
- Los colores todavía bloqueados se pintan igual que los desbloqueados.
- ~~Opción "Reducir destellos"~~ (hito 2b, sin guardar). Pérdida de contexto WebGL.

## Pulido 1, el aspecto de la pila (estilo Arena)

Solo render: `src/render/pilaVisual.ts` (shaders y su configuración), más controles de debug. No se tocó `src/core/`, `balance/` ni el worker.

Se probaron tres estilos (Neón, Cristal, Arena) alternables; quedó **Arena**. Neón se borró. **Cristal queda reservado para la Capa 1, Cristalización**: está en `src/render/styles/cristal.ts`, sin usar (el comentario del archivo explica cómo enchufarlo).

Cómo dibuja ahora:

- **Dos pasadas.** La primera, a la resolución de la grilla (513×513, dos texturas RGBA8 con MRT): el color de la arena con la altura en alfa, y aparte "la luz" que emite cada celda (luz propia, violeta, destellos). La segunda, a pantalla: relieve, iluminación, grano y bloom (los mipmaps de la textura de luz).
- **Color en espacio lineal** y paso a sRGB al final, con un "hombro" que comprime los brillos altos según el canal más alto, sin cambiar el tono. Esto, más sacar el bloom de la textura de color (el promedio de los 4 colores vecinos es casi gris), es lo que arregló lo "pastel": ahora se ven los colores de SPEC 6.1.
- **Nítido a cualquier escala.** El color y el contorno salen de la celda exacta (sin mezclar vecinas). Con celdas chicas el relieve es una pendiente por celda; con celdas grandes (más de ~4–14 px CSS), un bisel solo en los bordes que bajan hacia una vecina más un domo leve.
- **Contorno limpio.** Afuera de la pila cuenta como la misma altura (sin la franja de luz del "barranco"), y la fila del borde se funde un 60 % con el fondo, porque sobre los lados rectos de la pila es una barra de un solo color.
- **Violeta (1 grano), el más raro:** color más profundo (`× (0,55; 0,4; 0,55)` sobre #9B7BFF) más una luz propia que late despacio. **Se aparta de la paleta plana de SPEC 6.1 a propósito** (revisar si hay que anotarlo en la spec).
- **Brillo por nivel (SPEC 6.2):** `brillo()` (log10 del multiplicador, saturando suave) controla una luz propia que se concentra en el centro de cada grano, y le quita peso a la luz de afuera, hasta que la arena parece iluminada desde adentro.
- **Destellos de derrumbe:** aditivos, intensos y del color de la celda, solo en las celdas que se derrumbaron (más su resplandor cercano).
- **Vida sin arena:** respiración lenta desfasada por celda, una onda tenue que sale del centro y puntos de mica que titilan.
- **Fondo:** azul noche con el centro índigo apenas más claro, esquinas casi negras, y ruido de 1/255 para que el degradado no haga escalones.
- **Reducir destellos** (`prefers-reduced-motion`, igual que antes): apaga los destellos y la mica; la respiración lenta queda.

Panel de debug: botones "Pila a 50.000" y "Pila a 400.000", y un control "Nivel de los colores" (0 = el real) que simula el nivel de los cuatro colores para ver el brillo.

### Verificación

- GPU de la pasada a pantalla (dibujar + `readPixels`, pila llena, canvas de 1600×900): **0,9 ms**. La pasada de la grilla es de 263.000 píxeles más mipmaps.
- **Los 60 fps con 3.000 granos/s no se midieron:** el navegador integrado estaba oculto (1–3 fps). El worker no cambió, así que su límite sigue igual que en el hito 2a.
- "Reducir destellos" se revisó en el código (el mismo uniforme `u_destello` en las dos pasadas), no se probó con el sistema en modo reducido.
- Se miró la pila chica (~200–700 granos), a 50.000 y a 400.000, con nivel 0 y 200, y en móvil (375×812). Sin errores en la consola.


## Hito 2b, efectos de la pila

Solo `src/render/pilaVisual.ts`, `src/ui/` y `src/strings/es.ts`. No se tocó `src/core/`, `balance/` ni el worker.

- **Avalancha ×N** (SPEC 6.2). `PilaVisual` arma cada avalancha con los pedidos seguidos al worker hasta que la pila queda estable, y lleva un promedio móvil de derrumbes por grano (últimas ~200 avalanchas; arranca después de 20). Si una supera 30× el promedio llama a `alAvalancha(N)` y `Pila.svelte` muestra "Avalancha ×N" que sube 4 rem y se desvanece en 1,6 s.
- **Anillos.** `Pila.svelte` compara `anillos(G)` cuadro a cuadro; al subir, un círculo de 1,5 px del color de la altura más frecuente de la pila (`colorDominante()`) sale del radio de la pila, crece a ×1,5 y se desvanece, con "Anillo 12 · ×1,10" debajo del centro. El ×1,10 sale de `multAnillos(s)^(1/anillos)` (incluye la Mutación Expansión sin repetir la fórmula). Si se ganan varios en un cuadro (saltos de debug), se muestra uno solo, el último.
- **Escala.** La etiqueta aparece con un fundido en cada salto, y la cámara arranca 1,6× más cerca y se aleja en 0,8 s (`u_escala` en el shader).
- **Reducir destellos** (SPEC 6.8): casilla en la pantalla mínima, arranca con `prefers-reduced-motion`. Apaga destellos de derrumbe y mica, y el alejamiento de cámara; los textos y el anillo solo aparecen y se desvanecen, sin moverse ni crecer.
- Textos y anillos son HTML con animaciones de CSS (`transform` y `opacity`, las compone la GPU); como mucho 4 a la vez.

### Verificación

- Se vieron en la página: "Anillo 10 · ×1,10" con su círculo, anillos 2 al 17, y "1 grano = 10^1 granos" al pasar 10× la capacidad. svelte-check y tsc sin errores; 30 tests en verde. Móvil (375×812): la casilla entra sin romper nada.
- Simulación (un grano por vez, umbral 30×, 20.000 granos): 254 avalanchas grandes, ~1 de cada 80 granos.
- Con la pila llena y 4.096 granos/s: hilo principal 0,4 ms por cuadro (antes 0,2–0,8), worker igual que antes (~2.500–4.000 granos/s, ~950 ms por segundo).
- **60 fps estables**, medidos a la vista en esta máquina (AMD Radeon integrada) con el panel de debug: Caudal nivel 12 (4.096/s, la pila suelta hasta 3.000), pila llena, salto de escala y anillos incluidos. No se anotaron peor cuadro ni granos/s de esa corrida.

### Decisiones donde la spec no alcanzaba (revisar)

1. **Qué es "una avalancha".** El worker suelta los granos en lotes y no separa avalanchas (no se podía tocar). Con flujo continuo (estado estacionario, 3.000 granos/s) cada avalancha mezcla decenas de granos y se compara por grano, así que **"Avalancha ×N" casi no sale en estado estacionario**; sale sobre todo con pocos granos por segundo. Para separarlas de verdad, el worker tendría que medir cada grano.
2. **N** es cuántas veces el promedio por grano (redondeado).
3. **Color dominante** = la altura más frecuente entre las celdas de la pila.
4. **Con "Reducir destellos" no hay alejamiento de cámara** (es un zoom, lo que más molesta con `prefers-reduced-motion`).
5. **La opción no se guarda**: vuelve a lo que pida el sistema al recargar. Se guarda con los ajustes del hito 5.
6. El umbral 30× y las duraciones son constantes visuales en `pilaVisual.ts` / `Pila.svelte`, no de balance.


## Hito 3, la interfaz principal

Reemplaza la pantalla de prueba del hito 0.

| Archivo | Contenido |
| --- | --- |
| `src/ui/App.svelte` | Layout (SPEC 6.4): Energía, Energía/s y Densidad arriba; la pila; estadísticas al pie; barra de Compresión; la tienda a la derecha (en móvil, hoja inferior). |
| `src/ui/Tienda.svelte` | Caudal y los colores aparecidos. Fila: muestra de color, nombre, nivel, efecto actual, costo y botón. Modos x1 / x10 / Máx; "Comprar todo" (botón y tecla M). |
| `src/ui/juego.svelte.ts` | Revelado progresivo (`juego.vistos`, `juego.aviso`) y `juego.escalaK`. |
| `src/ui/Pila.svelte` | La pila ahora ocupa una región (variables `--pila-arriba/-derecha/-abajo`) y se centra sola en ella; la ola del color nuevo. |
| `src/core/shop.ts` | `comprarN` (x10: compra 10 o nada) y `comprarTodo` (siempre lo más barato que se pueda pagar). Con tests en `formulas.test.ts`. |
| `src/strings/es.ts` | Todos los textos nuevos, incluidas las frases de cada aparición. |
| `index.html` | Tokens de color (SPEC 6.1), Space Grotesk (Google Fonts), `.num` = cifras tabulares. |

- **Revelado (SPEC 5).** Al inicio solo la pila, la Energía y "Tocá la pila", con la pila a pantalla completa. Primer derrumbe → derrumbes por grano; 5 de Energía → tienda con Caudal (y la pila se corre a la izquierda con una transición); 8 → Ámbar; Coral / Jade / Violeta cuando el núcleo los desbloquea; primer anillo → anillos; 1e12 → barra de Compresión con la meta. Cada aparición muestra su frase de una línea (una píldora que se desvanece en 6 s, `role="status"`) y entra con un fundido. Cada color nuevo manda una banda de su color del centro al borde de la pila (con "Reducir destellos": un tinte que se apaga, sin moverse).
- **Barra de Compresión**: logarítmica, del umbral anterior (0 para la primera) a la meta; el botón Comprimir está deshabilitado hasta el hito 4.
- **Números**: `formato` de SPEC 8; los multiplicadores y la Densidad con `formatoMult` (2 decimales por debajo de 1.000). Cifras tabulares verificadas: "1111" y "8888" miden lo mismo en Space Grotesk.
- **Móvil (< 768 px)**: Energía fija arriba, la pila en el 55 % de arriba (entre la Energía y la barra), la tienda como hoja inferior: se arrastra la manija (más de 40 px cambia de posición) o se toca para alternar entre media y alta.
- El panel de debug ahora es un `<details>` plegado a la izquierda para no tapar la tienda.

### Verificación

- svelte-check y tsc sin errores; 32 tests en verde (incluido el de balance); `npm run build` bien.
- En el navegador integrado: arranque mínimo, Puñado → frase y derrumbes por grano, aparición de la tienda, Ámbar, anillos, Coral/Jade y la barra (79 % con 3e13 hacia 1e17); "Comprar todo" con M (1.000 de Energía → Caudal 3, Ámbar 4, sobran 426: correcto); Máx muestra "+7 · 3,03e12"; escritorio a 800×600 y móvil a 375×812, hoja inferior abierta y cerrada. Sin errores en la consola.
- **No medí los 60 fps**: el navegador integrado estaba oculto y solo dibuja un cuadro por captura. Tampoco vi la ola de color en movimiento (solo que se dispara). El `backdrop-filter` de los paneles de vidrio sobre la pila es lo primero a revisar si baja de 60 fps.

### Decisiones donde la spec no alcanzaba (revisar)

1. **Umbrales del revelado en `config.json`** (`revelado`: tienda 5, Ámbar 8, Compresión 1e12). No son de balance (el simulador no los usa), pero así no hay números en el código. El primer derrumbe es G ≥ 4 (física de la pila, no balance).
2. **Energía/s aparece con la tienda y Densidad con la primera Compresión** (la spec no lo dice; con D = 1 no informa nada).
3. **"Tocá la pila" se va cuando aparece la tienda.**
4. **x10 compra exactamente 10 niveles o ninguno**; Máx muestra cuántos niveles y cuánto cuestan; con 0, el costo de uno, deshabilitado.
5. **"Comprar todo" compra siempre lo más barato** de la tienda visible, de a un nivel, hasta que no alcanza. No respeta el modo.
6. **Lo revelado no se guarda** (se recalcula desde el estado; G ≥ 4 y anillos vuelven a aparecer solos). Va al guardado del hito 5.
7. **La pila se achica a su región** en vez de quedar detrás de la tienda: el canvas termina donde empieza la tienda (detrás de la tienda se ve el fondo liso). En móvil se nota un corte suave arriba de la pila.
8. **Queda afuera**: tiempo estimado de la barra de Compresión (hito 4), pestañas (no hay ninguna desbloqueada todavía), fuente local para el empaquetado de Steam.


## Pulido 2, rediseño de la interfaz

La interfaz del hito 3 funcionaba pero se veía genérica (cajas dentro de cajas, píldoras, títulos en mayúsculas espaciadas, botones teñidos, barra arcoíris). No se tocó `src/core/` ni `balance/`.

| Archivo | Cambio |
| --- | --- |
| `src/render/pila.ts` | **Borde circular**: el sumidero son las celdas fuera del círculo inscrito (radio 256) que tocan una de adentro; a las demás nunca llega un grano. La pila llena es redonda, sin lados planos. `tomarCeldas` ya no recorre solo el interior del cuadrado: salta las celdas del sumidero por su marca. |
| `src/render/pilaVisual.ts` | Encuadre: la pila en el 80 % del lado corto (antes 94 %). `alTamano(derrumbes)` por cada avalancha terminada (el sismógrafo). `radioCss` sale del tamaño real del canvas, no de `devicePixelRatio` (con emulación o zoom no siempre coinciden y el anillo quedaba corrido). |
| `src/ui/App.svelte` | El canvas ocupa toda la ventana y la pila queda en el centro exacto. Interfaz flotante sin paneles ni bordes: izquierda Energía (grande), Energía/s y Densidad; derecha la tienda y debajo Comprimir (meta y porcentaje); las dos columnas con el mismo ancho. Abajo a la izquierda el sismógrafo, con anillos y escala en texto chico. El aviso de cada aparición es texto suelto arriba al centro (ya no una píldora). |
| `src/ui/Tienda.svelte` | Cada mejora es una fila de texto (muestra de color de 8 px, nombre, nivel, efecto, costo) separada por líneas de 1 px; se compra con un clic en la fila. Costo apagado si no alcanza, del color de la mejora si alcanza. x1 / x10 / Máx como texto (el activo en blanco y negrita). |
| `src/ui/Pila.svelte` | **Anillo de Compresión**: un círculo fino (SVG, 1,5 px) a 14 px del borde de la pila que se cierra con el progreso (misma escala logarítmica que la barra que reemplaza); al 100 % brilla y late suave (con Reducir destellos, brilla quieto). Publica `juego.radioPila` y alimenta el sismógrafo. |
| `src/ui/Sismografo.svelte` | Nuevo. Canvas 2D: una raya vertical por avalancha, alto = log10(derrumbes), escalado al pico de los últimos 20 s (mínimo 10²). Reemplaza "derrumbes por grano". |
| `src/ui/juego.svelte.ts` | `progresoCompresion(s)` (lo usan el anillo y el botón), `sismo` (buffer de avalanchas, sin `$state`), `radioPila`. |

- Jerarquía solo por tamaño y peso: nada en mayúsculas. Revelado progresivo y Reducir destellos igual que antes.
- **Móvil (< 768 px)**: Energía arriba, la pila arriba centrada (a 7 rem del borde), el sismógrafo con los anillos a su derecha justo encima de la hoja, la tienda como hoja inferior con el mismo estilo de filas (fondo casi opaco y una línea de 1 px arriba, sin esquinas redondeadas).

### Verificación

- svelte-check y tsc sin errores; 32 tests en verde (el del sumidero ahora prueba el círculo: la esquina de la grilla nunca recibe granos, el punto (0, 256) sí es sumidero, y se conserva cada grano). `npm run build` bien.
- **Capacidad con el borde circular: 463.250 granos** (lotes de 50, como el worker con ~3.000/s; 3.770 millones de derrumbes). Con la pila llena el radio por el eje llega a 249 y por la diagonal a 256: redonda.
- En el navegador integrado (1600×900 y 375×812): la pila centrada en la ventana, el anillo rodeándola con el hueco del 11 % que falta, la tienda y el sismógrafo sin tapar la pila, la hoja inferior en móvil. Sin errores en la consola.
- **No medí los 60 fps**: el navegador integrado estaba oculto (1–3 fps). Lo nuevo por cuadro es un canvas 2D chico (el sismógrafo, unos cientos de líneas) y un atributo del SVG; el `backdrop-filter` de los paneles se fue, así que debería ir igual o mejor que el hito 3. Falta mirarlo a la vista.

### Decisiones (revisar)

1. ~~El sismógrafo dibuja rayas~~ (Pulido 3: línea continua con picos que decaen).
2. **En estado estacionario "una avalancha" sigue siendo una tanda del worker** (ver hito 2b): el sismógrafo muestra tandas, no granos sueltos.
3. **Antes de llenarse, la pila tiene su forma natural** (un octógono con lados casi rectos); el borde circular solo se nota cuando llega al círculo. El anillo rodea la celda más lejana, así que mientras crece queda separado de los lados.
4. **El test de redondez de la pila llena tarda 200 s**, así que no quedó en la suite: los números de arriba son de una corrida a mano.
5. Comprimir sigue deshabilitado hasta el hito 4.


## Pulido 3, última vuelta de la interfaz

No se tocó `src/core/` ni `balance/`. `SPEC.md` 6.1 y 6.3 actualizados (colores de la pila, sumidero circular, capacidad).

- **Pila al 80 % del alto.** Con celdas de un número entero de píxeles, 517 celdas en 1.125 px reales daban 1 px por celda: la pila quedaba en ~46 %. Ahora por debajo de 3 px reales por celda (`ENTERO_DESDE`) el tamaño es fraccionario; desde 3 px se sigue redondeando a enteros. El anillo de Compresión queda a 8 px de la pila (antes 14).
- **Paleta invertida en la pila** (`COLORES_PILA` en `pilaVisual.ts`, aparte de los colores de la interfaz): Ámbar #55432F (arena en sombra, sin luz propia), Coral #A4574F, Jade #3FE0B4 y Violeta #C2A8FF con luz propia base (`PROPIA` = 0,3 / 0,55 / 0,05 / 0 por altura; Violeta además late). Se sacó el oscurecimiento que tenía Violeta desde el Pulido 1. El brillo por nivel (SPEC 6.2) sigue igual encima. La interfaz (muestras, costos) mantiene los colores de SPEC 6.1.
- **Pila llena redonda.** El borde circular ya estaba desde el Pulido 2, pero medido en 360 direcciones (script aparte, lotes de 50): al primer grano perdido la pila llega al círculo (256) en las diagonales y se queda en 249 en los ejes, o sea 4 lados planos de 7 celdas; con 50.000 granos más el contorno queda entre 255 y 256 en todas las direcciones, y sigue así con +100.000. Ahora, desde la capacidad hasta un 12 % más (`RELLENO`), la pila de pantalla recibe granos al ritmo máximo (3.000/s) aunque el Caudal sea bajo; después, al del Caudal. Antes de llegar a la capacidad la pila es la real y tiene su forma natural (octógono): eso no cambia.
- **Cruz de luz sobre el fondo.** El bloom muestreaba la textura de luz fuera de la grilla con `CLAMP_TO_EDGE` y estiraba la fila del borde en dos bandas (se notaba más con la pila llegando al borde en los ejes). Ahora se apaga fuera de la grilla.
- **Sismógrafo**: línea continua que corre de derecha a izquierda (20 s). Cada avalancha la levanta a log10(derrumbes) y cae con constante de tiempo de 0,35 s; la escala sigue al pico de la ventana (mínimo 10²) con transición suave. `sismo` ahora es una cola que vacía el sismógrafo.
- **Comprimir**: con `puedeComprimir` (núcleo) la raíz lleva `.lista`: el texto se enciende y late, y el anillo brilla y late con el mismo ritmo (2,4 s, arrancan en el mismo cuadro). Con Reducir destellos, encendidos y quietos. **El botón sigue deshabilitado** hasta el hito 4.
- **Ajustes**: ícono chico arriba a la derecha (en la fila del título de la tienda) que abre un panel con "Reducir destellos"; se cierra con Escape o tocando afuera. Está desde el arranque, antes de que aparezca la tienda.
- Las filas de la tienda tienen `aria-label` ("Comprar Ámbar · 10").

### Verificación

- svelte-check y tsc sin errores, 32 tests en verde.
- En el navegador integrado: antes/después de la paleta con la misma pila; la pila ocupa ~81 % del alto; Comprimir y el anillo encendidos al 100 %; el sismógrafo como línea; el panel de Ajustes. Sin errores en la consola.
- **No medí los 60 fps** (el navegador integrado seguía oculto). Lo nuevo por cuadro: el sismógrafo dibuja ~1.200 puntos (antes unas decenas de rayas) y la pasada de la pila hace 1 cálculo más por píxel en el bloom.

### Decisiones (revisar)

1. Con celdas fraccionarias (menos de 3 px reales) los anchos de celda alternan entre 1 y 2 px: a esa densidad no se nota a simple vista, pero si aparece moiré, la salida es supermuestrear la pasada a pantalla.
2. El "antes" del Pulido 2 decía que el sismógrafo dibujaba rayas: quedó reemplazado por la línea continua.
3. Ajustes no se guarda (igual que antes: va al guardado del hito 5).


## Pulido 4, Ámbar, pila redonda verificada, sismógrafo y supermuestreo

No se tocó `src/core/` ni `balance/`.

- **Ámbar**: se probaron tres variantes con la pila llena (destellos apagados para comparar), cambiando el uniforme en vivo: A #8A5320 (brasa), B #A3631F (atardecer), C #B87A2C (miel). Quedó **A**: dorado anaranjado profundo, sin luz propia; B ya empieza a competir con Jade y C con los dos. Para cambiarla es `COLORES_PILA[3]` en `pilaVisual.ts` (y SPEC 6.1).
- **Sin título en la tienda**: arriba de la lista quedan x1 / x10 / Máx (desde el borde izquierdo de la lista) y el ícono de Ajustes (al ras del borde derecho). `es.tienda` queda solo como `aria-label` del panel.
- **Pila llena redonda, verificada.** El sumidero circular está en `pila.ts`, que es lo que corre el worker (Pulido 2), y el relleno del 12 % del Pulido 3 completa los lados que la pila natural deja planos al primer grano perdido. Lo que se veía cuadrado era la pila **antes** de su capacidad (con "Pila a 400.000" o en una corrida con pocos granos): ahí la pila de pantalla es la real (SPEC 6.3) y su forma natural es un octógono con lados rectos. Panel de debug: botón nuevo **"Pila llena (redonda)"** (600.000 granos: capacidad más relleno); con Caudal 1 se llenó en ~2 min y quedó redonda (captura en la sesión).
- **Sismógrafo**: línea base plana desde el borde izquierdo (ocupa todo el ancho desde el arranque), trazo de 1,75 px al 95 % con un halo suave (`shadowBlur`), corre de derecha a izquierda.
- **Supermuestreo al reducir**: la pasada a pantalla promedia `u_ss × u_ss` muestras por píxel (3×3 con menos de 1 px real por celda, 2×2 con menos de 2,5 px, 1 desde ahí): el centro ya no titila como ruido con la pila alejada y con celdas grandes sigue siendo nítida. El sombreado de una celda pasó a una función `arenaEn(q)` que devuelve color y cobertura.
- Se sacó el `window.pila` de prueba.

### Verificación

- svelte-check y tsc sin errores, 32 tests en verde.
- Navegador integrado (1280×720 y 375×812): pila llena redonda desde cero con "Pila llena (redonda)" y Caudal 1; centro suave; sismógrafo; cabecera de la tienda alineada; móvil sin roturas. Sin errores en la consola.
- **No medí los 60 fps ni vi el titileo en movimiento** (el navegador integrado seguía oculto, 1–3 fps). Costo nuevo: con 1–2,5 px por celda la pasada a pantalla hace 4 muestras por píxel (antes 1; medida antes en 0,9 ms a 1600×900, así que ~3–4 ms en GPU integrada); en pantallas chicas, 9 muestras pero sobre pocos píxeles. Si baja de 60 fps, lo primero es pasar a 2×2 en vez de 3×3 o compartir las vecinas entre muestras.

### Ajustes después del Pulido 4

- **Ámbar**: confirmada la variante A (#8A5320).
- **Sismógrafo con escala sola**: con avalanchas todo el tiempo la envolvente quedaba pegada arriba y la línea se veía plana. Ahora el rango va del percentil 5 (ignora ceros sueltos, como los del arranque) al pico de los últimos 20 s, con un alto mínimo de 0,5 décadas para no agrandar ruido cuando todo es parejo, y transición suave. Medido en la página con la pila llena y 4.096 granos/s: la línea recorre de 5 a 40 px de los 60 del canvas (antes, pegada arriba).
- **Etiqueta de escala con superíndice**: "1 grano = 10³ granos" (`es.escala` convierte los dígitos de k a superíndices).



## Hito 4, Compresión y sistemas tardíos

No se tocó `src/core/` ni `balance/`: el núcleo ya hacía todo y no le encontré errores. Solo `src/ui/`, `src/strings/es.ts` y `scripts/partida50.mjs` (nuevo).

| Archivo | Cambio |
| --- | --- |
| `src/ui/App.svelte` | Comprimir funciona (`comprimir` del núcleo); meta, porcentaje y tiempo estimado. Casilla "Comprimir sola al llegar a la meta" desde la Compresión 6. Después de la 17 el botón pasa a "Infinito" (deshabilitado: llega solo) y el anillo sigue hacia 1e308. Energía → "∞" y pantalla de fin de capa. |
| `src/ui/Pila.svelte` | Animación de Compresión (SPEC 6.5) y la parte de la pila del Infinito (SPEC 6.6). Récord de avalancha. |
| `src/ui/Tienda.svelte` | Pestañas Tienda · Cascada · Mutaciones (aparecen solas), cada una con su línea de explicación; interruptor "auto" de cada autocomprador. |
| `src/ui/juego.svelte.ts` | `progresoCompresion` con meta final = Infinito; tiempo estimado (`juego.eta`); revelado de Cascada, Mutaciones y autocompradores; `juego.record`. |
| `scripts/partida50.mjs` | Partida completa a ×50 en Edge headless por CDP, con un bot que juega por la interfaz. Sin dependencias. |

- **Barra de Compresión**: sigue siendo el anillo alrededor de la pila más el botón (Pulido 2); escala logarítmica entre umbrales. **Tiempo estimado** = lo que falta en log10 dividido por el ritmo de log10(Energía) de los últimos 30 s de juego (una muestra por segundo, se reinicia en cada Compresión). Está en tiempo de juego: a ×50 dice "≈ 4 min" de algo que tarda 5 s reales.
- **Animación de Compresión** (1,5 s): el disco de la pila gira 120° y se achica hasta un punto mientras un remolino de los cuatro colores (gradiente cónico, borroso, `screen`) se cierra encima girando 540°; a los 0,82 s un destello blanco radial tapa el vaciado y aparece "Densidad ^1,24" grande, con brillo, que rebota y se va en 2,6 s. Mientras implota, la pila de pantalla se queda con los granos de antes (la economía ya comprimió). Sirve igual para la Compresión a mano y la automática. Con Reducir destellos: sin giro ni zoom, la pila se apaga, destello suave, el texto aparece y se va.
- **Autocompradores** (SPEC 4.8): un interruptor "auto" abajo a la derecha de la fila de Caudal y de cada color, con el color de la mejora cuando está prendido (`role="switch"`). Aparecen con su Compresión, con una frase ("Autocompradores de Ámbar y Coral: compran solos una vez por segundo.").
- **Cascada y Mutaciones**: ahí se compra de a un nivel (sin x10 / Máx ni "Comprar todo": son las decisiones). Al llegar al nivel máximo la fila dice "Máximo". Efectos: Cascada muestra su multiplicador actual; Mutaciones, el efecto total (con nivel 2: Caudal ×9, todo vale ×100, cada anillo ×1,14, +0,06 a la Cascada).
- **Infinito** (SPEC 6.6): 0–2 s un disco blanco crece desde el centro sobre la pila y la Energía pasa a "∞"; 2–2,8 s la pila colapsa en un punto (el resto de la interfaz se apaga); 2,8–3,8 s nada; 3,8 s el final: "Llegaste al Infinito", tiempo total, compresiones, avalancha récord y "Capa 1: Cristalización — próximamente". El estado queda con `infinitos = 1` (lo pone el núcleo).

### Verificación

- svelte-check y tsc sin errores; 32 tests en verde (el de balance igual que antes).
- **Partida completa a ×50**: llega al Infinito sin errores en la consola ni cuelgues. **Tiempo de juego: 4 h 10 min** (17 compresiones, avalancha récord 3,64e8 derrumbes); unos 5 min reales. Una segunda corrida, después de los últimos arreglos: 4 h 9 min, también sin errores. Corrida en Edge headless a 60 fps con `scripts/partida50.mjs`: el navegador integrado estaba oculto y no avanzaba (0,3–3 cuadros por segundo).
  - Es más que los 197 min del test de balance porque el bot del script es tonto: "Comprar todo" (siempre lo más barato), Comprimir apenas se puede, y Cascada y Mutaciones en cuanto alcanzan, sin elegir. No mide el balance; mide que la partida se puede jugar entera.
  - Desde la Compresión 6 comprimió sola (la automática), y la última corrida llegó sola al Infinito.
- Capturas (escritorio 1280×720 y móvil 375×812): la implosión (disco girando dentro del remolino), "Densidad ^1,12" con la pila vacía, el blanco del Infinito, la pantalla final, pestañas, interruptores.
- **No medí los 60 fps a la vista** en el navegador integrado (seguía oculto). En Edge headless, con la pila llena y 3.000 granos/s, el panel de debug marcó 60 fps y peor cuadro 16,8 ms durante el final.

### Decisiones donde la spec no alcanzaba (revisar)

1. **El tiempo estimado salta** cuando el jugador gasta (la Energía baja y el ritmo medido también): llegó a decir "≈ 32 min" al 98 %. Con el autocomprador casi no pasa. Si molesta: ventana más larga o no medir durante las compras.
2. **La Energía ya está en 0 durante la implosión**: la economía comprime en el clic y solo la pila de pantalla espera.
3. **Avalancha récord** = la avalancha más grande de la pila visual (en derrumbes), no un número del núcleo; no se guarda (hito 5).
4. **Avisos que llegan juntos**: se muestran hasta dos frases juntas (en la Compresión 2 llegan Cascada y el autocomprador de Caudal).
5. **"Comprar todo" y la tecla M** compran solo lo de la pestaña Tienda, estés en la pestaña que estés.
6. **En las filas con "auto"** la línea del efecto deja lugar al interruptor y con la columna angosta (1280 px) "celdas con 3 granos" pasa a dos líneas.
7. **El final no se puede cerrar** ni reiniciar: no hay a dónde ir hasta la Capa 1. "El guardado queda listo para la Capa 1" depende del hito 5.



## Arreglo: la pila de pantalla sigue a la real (fotos de la pila)

En las corridas tardías la pila se veía como un punto: la de pantalla arrancaba de cero en cada Compresión y soltando grano por grano tardaba 90–160 s en llenarse, más que la corrida. No se tocó `src/core/` ni `balance/`.

| Archivo | Cambio |
| --- | --- |
| `scripts/snapshots.mjs` | Nuevo. Con la misma `Pila` del worker suelta granos y guarda fotos de la pila estable con 1.000, 3.000, 10.000, 30.000, 100.000 y 300.000 granos, y la llena (capacidad 463.296 + 12 % = 518.892). Uso: `node scripts/snapshots.mjs` (~1 min; Node 23.6+ importa el `.ts` directo). |
| `src/assets/pilas.bin` | Las 7 fotos, gzip: **25,9 KB**. Por foto, un cuadrante de 257×257 bytes (la pila es simétrica; el script lo comprueba); 4 = celda de adentro con 0 granos. |
| `src/assets/pilas.json` | Capacidad, granos y radio de cada foto. |
| `src/render/pila.worker.ts` | Descomprime las fotos al arrancar (`DecompressionStream`). Pedido con `foto ≥ 0`: arma la pila espejando el cuadrante y la devuelve. |
| `src/render/pilaVisual.ts` | Cada cuadro, objetivo = min(G, pila llena). Si la pila de pantalla quedó más de `RITMO_MAX` (lo que alcanza en ~1 s) atrás, carga la foto más grande que no pase el objetivo y sigue soltando desde ahí. Fundido de 200 ms entre lo que se veía y la foto (copia del cuadro a una textura y `mix` en el shader). La capacidad ya no se mide en vivo: viene del JSON. `RELLENO` pasó al script. |

- **Después de una Compresión**: la implosión de siempre (Hito 4) y la pila arranca vacía; en las corridas tempranas crece grano por grano, en las tardías salta foto por foto (como mucho una cada 200 ms, el fundido) y queda llena en pocos segundos.
- **Al cargar una partida** (hito 5, todavía no hay guardado) va a andar sola: el primer cuadro ve G grande y salta a la foto.
- Las celdas de adentro con 0 granos se marcan con un derrumbe en t = 0 (sin destello): `inicio` arranca 1 s antes para que t = 0 ya sea pasado.

### Verificación

- tsc sin errores; 32 tests en verde; `vite build` incluye `pilas-*.bin` (25,9 KB).
- **Compresión 12 con Compresión automática, ×50, Edge headless 1280×720** (bot de `partida50.mjs`): 5 compresiones seguidas hasta el Infinito. Después de cada una, la pila de pantalla quedó llena (> 518.892 granos) en menos de 4 s y siguió goteando unos 3.000 granos/s; 60 fps todo el tiempo (peor cuadro 17 ms; un pico de 67–83 ms al 92 % de la corrida de la Compresión 14, en las dos corridas, sin coincidir con una foto: no lo investigué). Ráfaga de capturas cada ~0,3 s después de una Compresión: implosión → punto → pila llena con fundido, sin cortes.
- Corridas tempranas: con G chico el camino es el de antes (cada grano); las fotos solo entran si la pila queda más de 3.000 granos atrás.

### Arreglos que salieron en la verificación

1. **La implosión no terminaba nunca** (bug del Hito 4, y probablemente parte del "punto"): `implotando` se apagaba con el `animationend` de la estela, pero la estela puede salir de `efectos` antes de terminar (`slice(-3)`, cuando llegan textos de anillos) y con Reducir destellos tiene `display: none`. La pila de pantalla quedaba congelada y achicada al 2 % para siempre. Ahora se apaga con un reloj de 0,9 s (`IMPLOSION_MS` en `Pila.svelte`, igual a la animación del CSS).
2. Al cargar una foto la cámara se encuadra de golpe (si no, la pila grande aparecía muy ampliada y se alejaba), y el salto de escala ("1 grano = 10^k") no anima la cámara si viene de una foto: el fundido ya cubre el cambio.

### Pendiente / no verificado

- No lo miré en móvil real ni con el navegador integrado (estaba oculto); solo Edge headless, también a 375×812.
- La carga de partida no existe todavía (hito 5); el mecanismo ya la cubre.


## Hito 5a, guardado base y progreso fuera de línea

| Archivo | Contenido |
| --- | --- |
| `src/core/offline.ts` | `fueraDeLinea(s, segundos)`: el tiempo ausente con el mismo `tick`. Devuelve el estado, los segundos simulados, la Energía producida y las compresiones. Pura. |
| `src/guardado/almacen.ts` | Interfaz `Almacen` (`leer`, `escribir`) y `almacenLocal` sobre `localStorage`. Es el único archivo que toca el almacenamiento del navegador. |
| `src/guardado/guardado.ts` | `serializar` / `deserializar` (con `version` y `migrar`), `guardar` y `cargar` sobre un `Almacen`. |
| `src/ui/juego.svelte.ts` | Carga al arrancar, guarda cada 10 s y al cerrar u ocultar la pestaña (`pagehide`, `visibilitychange`). El bucle usa `Date.now()`. |
| `src/ui/App.svelte` | Cartel "Mientras no estabas" y cartel de guardado dañado. |
| `tests/guardado.test.ts` | 18 tests: fuera de línea, ida y vuelta del guardado, guardados corruptos. |
| `balance/config.json` | `fuera_de_linea`: `paso_s` 1, `max_pasos` 28.800, `tope_horas` 24 (los valores de SPEC 8; `sim.py` no los usa y su salida no cambió). |

- **Guardado** (clave `avalancha.guardado`): `{ version: 1, estado, guardadoEn, vistos, record }`. Los `Decimal` van como `[mantisa, exponente]` (dos doubles: JSON no pierde ningún dígito). Además del estado del núcleo se guardan lo revelado (`vistos`) y la avalancha récord, que estaban pendientes desde los hitos 3 y 4. "Reducir destellos" sigue sin guardarse (ajustes: otra sesión).
- **Migración**: `migrar()` existe y hoy no hace nada (solo hay versión 1). Un guardado de una versión más nueva que el juego se trata como dañado.
- **Fuera de línea**: un solo camino para cargar la partida y para volver a la pestaña. Si el bucle acumula más de 10 s (lo que antes iba en un paso largo), llama a `fueraDeLinea`: pasos de 1 s hasta 28.800 (8 h); con más tiempo, 28.800 pasos más largos (24 h = 3 s). Tope de 24 h. Los autocompradores y la Compresión automática salen del `tick`, sin código aparte.
- **"Mientras no estabas"**: aparece si la ausencia fue de 60 s o más (y no se está en el Infinito). Muestra el tiempo, la Energía **producida** (la suma de lo producido en cada paso, no la diferencia: las compras y las compresiones la gastan) y las compresiones. Se cierra con el botón, Escape o tocando afuera.
- **Guardado dañado**: `cargar` copia el texto tal cual a `avalancha.respaldo` y no toca el guardado. El juego muestra "No pudimos leer tu partida" con el botón "Empezar de nuevo"; hasta aceptarlo no se guarda nada. Después el guardado nuevo pisa el dañado, pero el respaldo queda.
- **La pila al cargar o al volver**: salta a la foto que corresponde (el sistema de fotos ya lo hacía con G grande). Lo nuevo: `juego.saltos` le avisa a `Pila.svelte` que hubo una ausencia, y las compresiones, anillos y colores ganados afuera no se animan (sin esto, al volver se veía una implosión).

### Verificación

- `npm test`: 50 tests en verde (32 de antes + 18). tsc y svelte-check sin errores; `npm run build` bien; `python balance/sim.py` igual que antes.
- **`max_pasos` pasó de 10.000 a 28.800** (SPEC 8 actualizada): 8 h fuera de línea ahora son 28.800 pasos de 1 s, idénticas al tick normal, y el test mide el ±1 % en Energía en los tres casos. Lo de abajo es la medición con 10.000 pasos que motivó el cambio.
- **8 h fuera de línea contra 8 h de tick de 1 s, con 10.000 pasos** (pasos de 2,88 s contra 28.800 de 1 s):

| Desde | Normal | Fuera de línea | Diferencia |
| --- | --- | --- | --- |
| Compresión 0 (sin autocompradores) | 1e7,517 · G 2,880e4 | 1e7,517 · G 2,880e4 | < 1 % en Energía |
| Compresión 3 (autocompradores) | 1e25,895 · G 6,534e8 | 1e25,894 · G 6,530e8 | < 1 % en Energía |
| Compresión 6 (Compresión automática) | 1e97,848 · G 2,720e13 · 8 compresiones | 1e97,670 · G 2,612e13 · 8 compresiones | **34 % en Energía**, 4 % en granos; 0,18 % en log10 |

  **Con 10.000 pasos el ±1 % en Energía no se cumplía con Compresión automática.** Las compresiones salen las mismas, pero cada una se atrasa (la 8 a los 23.538 s en vez de 23.449 s, 0,4 %), y después de una Compresión la Energía sube unas 2 décadas por hora, así que ese atraso son 0,18 décadas. Con 28.800 pasos la carga más larga simula 28.800 ticks (~0,2 s en esta máquina, medido en el test). Entre 8 y 24 h los pasos crecen hasta 3 s y vuelve a haber una diferencia, menor que la de antes; no la medí.
- **Guardar y cargar**: 10 min de juego con compras, guardar, cargar: estado idéntico, y 5 min más desde lo cargado dan exactamente lo mismo que sin guardar.
- **Corruptos** (9 casos: no es JSON, vacío, cortado, otra cosa, `null`, versión del futuro, tipo cambiado, campo que falta, número nulo): `cargar` devuelve `'corrupto'`, el texto queda en el respaldo y el guardado nuevo no lo borra.
- **En el navegador integrado** (1280×720 y 375×812, sin errores en la consola): un guardado de la Compresión 6 con fecha de 8 h atrás carga con el cartel ("Pasaron 8 h 0 min", +9,77e97, +2 compresiones), el foco en "Seguir", y la pila llena desde el primer momento, sin implosión; recargar conserva Energía y niveles y no muestra cartel; un guardado cortado muestra el cartel de dañado, el respaldo queda igual después de "Empezar de nuevo" y del guardado siguiente.

### Decisiones (revisar)

1. **Umbral de 60 s para el cartel** (constante de interfaz en `juego.svelte.ts`). Entre 10 y 60 s se simula igual, sin cartel.
2. **El tiempo fuera de línea se multiplica por la velocidad de debug**, como todo el bucle.
3. **Un guardado al que le falta un campo del estado actual se rechaza** (va al respaldo). Si `config.json` suma un color o un autocomprador, hace falta una migración.
4. **Un solo respaldo**: un segundo guardado dañado pisa al primero.
5. **Sin almacenamiento** (navegador que lo bloquea) el juego anda sin guardar y avisa por consola, no en pantalla.
6. Si se carga una partida ya en el Infinito, la animación del final se ve de nuevo.

### Pendiente / no verificado

- **No medí los 60 fps** (el navegador integrado estaba oculto). Por cuadro no hay nada nuevo; el guardado serializa un estado chico cada 10 s.
- La vuelta a una pestaña que estuvo oculta no la probé aparte: usa el mismo camino que la carga (más de 10 s acumulados).
- No probé en un móvil real ni el guardado al cerrar en iOS (`pagehide`).
- ~~El panel de debug no tiene "borrar partida"~~ (hito 5b).


## Hito 5b, exportar/importar, ajustes, estadísticas y logros

| Archivo | Cambio |
| --- | --- |
| `src/ui/Paneles.svelte` | Nuevo. Todo lo que flota sobre la pila: "Mientras no estabas", guardado dañado, el panel Estadísticas · Logros · Ajustes y la notificación de logro. Reemplaza los carteles del hito 5a y el panel chico de Ajustes del Pulido 3. |
| `src/ui/ajustes.svelte.ts` | Nuevo. Notación, volumen, Reducir destellos y paleta para daltonismo; se guardan solos en cada cambio (`avalancha.ajustes`, aparte de la partida). |
| `src/ui/logros.ts` | Nuevo. Los 16 logros de SPEC 7 como condiciones sobre el estado y el récord. |
| `src/core/state.ts`, `tick.ts`, `compress.ts` | Tres contadores: `granosTotales`, `mejorCorrida` (0 = ninguna), `compresionesSinAmbar`. Van en el núcleo porque la Compresión automática y el fuera de línea comprimen dentro de `tick`. No cambian la economía. |
| `src/guardado/guardado.ts` | Versión 2: `logros` en la partida y los tres contadores. `migrar` lleva la 1 a la 2 (granos totales = los de la corrida actual). `exportar` / `importar`: el mismo JSON en base64 (por bytes UTF-8). Constante `AJUSTES`. |
| `src/ui/formato.ts` | Notación de ingeniería (exponente múltiplo de 3: `12,34e6`). |
| `src/render/pilaVisual.ts` | `daltonismo` cambia los colores de la arena. `COLOR_CSS` ahora son variables CSS, así la interfaz y los efectos siguen la paleta. |
| `balance/config.json` | `logros`: umbrales de SPEC 7 (100 granos, 1.000 derrumbes, anillo 10/50, Densidad 2, récord 1e6, 2 h). No son de balance; `sim.py` no los usa y su salida no cambió. |
| `src/ui/App.svelte`, `Pila.svelte`, `Tienda.svelte`, `Debug.svelte` | El ícono abre el panel; tecla C comprime; `inert` en el juego con un panel encima (las teclas Espacio, M y C no hacen nada). Debug: "Borrar partida" sin confirmación. |

- **Estilo de los paneles**: velo oscuro translúcido sobre la pila (degradado radial, más opaco en móvil), sin bordes ni cajas; jerarquía solo por tamaño y peso; cifras tabulares. "Mientras no estabas": rótulo chico, la Energía ganada grande con brillo del color Ámbar, "de Energía", debajo el tiempo y las compresiones, y "Seguir"; entra escalonado (con Reducir destellos, solo fundidos).
- **Panel**: pestañas Estadísticas · Logros · Ajustes (flechas izquierda/derecha entre pestañas), se cierra con Esc, la ×, o tocando afuera; el foco vuelve a donde estaba.
- **Estadísticas**: tiempo total (grande), esta corrida, corrida más rápida, granos soltados, compresiones, avalancha récord.
- **Logros**: "N de 16" y la lista; los conseguidos con un punto encendido, los demás en gris con su descripción. Al conseguir uno, una línea abajo al centro ("Logro: Anillo 10") que se va en 5 s (en móvil, arriba, debajo de la Energía).
- **Ajustes**: notación, volumen, Reducir destellos, paleta para daltonismo, Guardar ahora, Exportar (copia al portapapeles; si no hay permiso, deja el texto seleccionable), Importar (pegar → validar → "Esto reemplaza tu partida actual por la importada (6 compresiones, 8 h 0 min de juego)" → Reemplazar), Borrar partida (dos confirmaciones; los ajustes quedan), y la lista de teclas.
- **Importar y borrar** escriben la partida y recargan la página: entran por el mismo camino que una carga (fuera de línea desde `guardadoEn`, fotos de la pila). Mientras tanto no se guarda nada (si no, el `pagehide` pisaba lo importado).
- **Daltonismo**: tonos de Okabe-Ito. En la pila, por altura: 3 granos azul oscuro #1F5C99, 2 bermellón #D55E00, vacías amarillo #F0E442, 1 grano rosa pálido #F6C6E6: además del tono, el brillo sube en el mismo orden que la paleta normal. En la interfaz, `:root.daltonismo` en `index.html`.

### Verificación

- `npm test`: 60 tests en verde (50 de antes + migración 1 → 2, exportar/importar con espacios y 4 textos inválidos, contadores del núcleo, notación de ingeniería en `tests/formato.test.ts`). tsc y svelte-check sin errores; `npm run build` bien; `python balance/sim.py` igual que antes (194 / 228 / 376 min).
- En el navegador integrado (1280×720 y 375×812, sin errores en la consola): exportar → cambiar `guardadoEn` 8 h atrás → importar (texto inválido rechazado; confirmación; recarga) → "Mientras no estabas" con +1,22e98, "8 h 0 min afuera · 2 compresiones" y el foco en Seguir; estadísticas; logros; ingeniería ("86,21e96") y daltonismo en la pila y la tienda, guardados al recargar; guardado dañado en móvil; borrar con teclado (Enter en cada paso: las dos confirmaciones, recarga en cero, ajustes intactos); C comprime; abrir el panel con Enter desde el ícono, flechas entre pestañas, Esc devuelve el foco al ícono.
- **No medí los 60 fps** (el navegador integrado sigue oculto, 1–3 fps). Por cuadro se suma revisar 16 condiciones de logros; los paneles no tienen `backdrop-filter`.

### Decisiones (revisar)

1. **Estadísticas, Logros y Ajustes son un panel flotante con pestañas**, abierto desde el ícono, no pestañas de la tienda (SPEC 6.4 las lista junto a Tienda · Cascada · Mutaciones). Las tres existen desde el arranque.
2. **El volumen se guarda pero no hace nada**: todavía no hay sonido (hito 6). El panel lo dice.
3. **"Avalancha de 1.000.000" sale apenas se llena la pila**: con flujo continuo una "avalancha" de la pila visual junta muchos granos (decisión 3 del hito 4; la partida a ×50 dio récord 3,64e8). Si tiene que costar más, hay que medir avalanchas por grano en el worker.
4. **"Los cuatro colores"** = los cuatro con al menos un nivel (no solo aparecidos). **"Compresión sin comprar Ámbar"** = comprimir con Ámbar en nivel 0 (el autocomprador también cuenta como compra).
5. **Granos totales de partidas viejas** arrancan con los de la corrida actual (lo de antes no se guardaba). Los logros que se pueden deducir del estado aparecen solos al cargar un guardado viejo; los de una corrida pasada (Anillo 10, 100 granos…) no.
6. **Importar respeta la fecha del exportado**: lo que pasó desde entonces se simula como fuera de línea (tope 24 h).
7. **La notificación de logro no se muestra** con el menú abierto ni con el guardado dañado (en móvil tapaba el panel); el logro queda en la lista.
8. **Teclas**: Espacio (puñado), M (comprar todo), C (comprimir), Tab, Esc, flechas en las pestañas. Las filas de la tienda que no se pueden pagar están deshabilitadas y Tab las salta (como antes).

## Rediseño de Logros: pantalla completa

Logros deja de ser una pestaña translúcida sobre la pila y pasa a ser una pantalla completa con fondo propio. Ajustes y Estadísticas siguen en el panel; Estadísticas pasa a pantalla completa en la próxima sesión.

| Archivo | Contenido |
| --- | --- |
| `src/render/lienzo.ts` | Nuevo. El dibujo WebGL2 de la pila (shaders, texturas, dos pasadas) sacado de `pilaVisual.ts`, sin worker ni economía. Lo usan la pila del juego y las mini pilas. Suma `u_efecto` (efectos de avalancha). |
| `src/render/paletas.ts` | Nuevo. Paleta de siempre, la de daltonismo, las 8 paletas, 8 efectos y 8 marcos de recompensa. |
| `src/render/miniPilas.ts` | Nuevo. La imagen de cada logro: una mini pila (las fotos de `pilas.bin`, o 4 y 100 granos calculados con `Pila`) dibujada con `Lienzo` en una escena propia: brillo, paleta, ondas de destellos, anillos, implosión, el blanco del Infinito. Se generan una vez y quedan en memoria (`ImageBitmap`). Acción `miniPila` para los `<canvas>`. |
| `src/render/marcos.ts` | Nuevo. Foto del mandala: recorta la pila del juego, le pone el marco y la descarga como PNG de 1080×1080. |
| `src/ui/Logros.svelte` | Nuevo. La pantalla (pestañas por capa, contador "15 / 24" con barra fina, grilla 6×4) y la notificación (la tarjeta en miniatura entra por la esquina y se va sola a los 5 s). |
| `src/ui/logros.ts` | 24 logros, `RECOMPENSA`, `desbloqueados`, `elegido` y `CAPAS` (la Capa 1 aparece bloqueada). |
| `src/ui/App.svelte` | Ícono de trofeo y tecla L. Con Logros abierta, la pila se aleja (escala 0,82, desenfoque y fundido; con Reducir destellos, solo fundido). |
| `src/ui/Paneles.svelte` | Sin la pestaña Logros ni la notificación vieja. Ajustes suma "Aspecto de la pila": paleta, efecto de avalancha, marco y "Sacar foto del mandala". |
| `balance/config.json` | `logros`: `alud`, `anillo_medio`, `compresiones`, `corrida_rapida_min`, `densidad_alta` (cosméticos: `sim.py` da lo mismo). |
| `tests/logros.test.ts` | 24 logros con textos, escena y recompensa; 8 de cada tipo, sin repetir; desbloqueo. |

Los 8 nuevos (SPEC 7): Hasta el borde, Alud, Anillo 25, Mandala pleno, 10 Compresiones, Corrida relámpago, Piloto automático, Densidad ^3.

### Verificación

- `npm test`: 64 tests en verde (incluido el de balance). `tsc` y `vite build` sin errores ni avisos.
- En el navegador integrado: la grilla, las pestañas de capa, el contador, tarjetas conseguidas y sin conseguir, la notificación, el cambio de paleta (Brasa) en la pila del juego, la foto con el marco Doble (PNG de 1080×1080) y el diseño en móvil (375 px, 2 columnas). Esc y la cruz vuelven al juego.
- La animación al pasar el mouse la comprobé reemplazando `requestAnimationFrame` por un temporizador (los cuadros cambian): con el panel oculto el navegador no da cuadros. **Los 60 fps no se midieron**, por el mismo motivo que en los hitos anteriores. Mientras la pantalla está abierta la pila del juego se sigue dibujando detrás. Cada cuadro de la animación es una pasada de 513×513 más una de 360×240.

### Decisiones (revisar)

1. **Las imágenes se rehacen en cada carga de la página** (en memoria, no en disco): las 24 tardan menos de un segundo. Se generan recién al abrir Logros o al llegar la primera notificación.
2. **Las pilas grandes se recortan** en la tarjeta (mínimo 2,4 px por celda), para que se lea el mandala. Hasta el borde y Anillo 10 muestran la pila entera.
3. **Paleta para daltonismo**: si está activada, la pila y las mini pilas la usan aunque haya otra paleta elegida.
4. **Piloto automático**: los autocompradores arrancan encendidos, así que en la práctica sale con la 6.ª Compresión, salvo que el jugador apague alguno.
5. **La foto del mandala no existía**: la sumé como botón en Ajustes, porque los marcos la necesitan.
6. **Capa 1**: `CAPAS` tiene la pestaña con `abierta: () => false` y sin logros. Cuando exista, hay que sumar sus logros y su condición real.

## Estadísticas: pantalla completa

Estadísticas deja el panel y pasa a pantalla completa, con cuatro pestañas. El panel queda solo para Ajustes. Para entrar: el ícono de barras o la tecla E. Esc o la cruz vuelven al juego.

| Archivo | Contenido |
| --- | --- |
| `src/ui/Pantalla.svelte` | Nuevo. El armazón compartido por Logros y Estadísticas: fondo propio, barra con pestañas (flechas, pestañas bloqueadas), un extra a la derecha y la cruz. |
| `src/ui/Estadisticas.svelte` | Nuevo. Las cuatro pestañas y sus gráficos (divs y SVG, sin bibliotecas). |
| `src/ui/desglose.ts` | Nuevo. Energía/s = F × (K × G) × V^D en factores log10: Caudal (base, niveles), Derrumbes por grano (K, G), los cuatro colores (niveles, hitos ×4), Anillos (cantidad, Expansión), Cascada (c), Mutaciones (Caudal ×3, Colores ×10) y Densidad: el exponente suma (D − 1) × log10 V. |
| `src/guardado/historial.ts` | Nuevo. Lo que el núcleo no guarda: las últimas 10 corridas, el histograma de avalanchas, la avalancha más grande de la corrida, los derrumbes, la Energía en el tiempo y el comienzo de la partida. Puro; va en el guardado como campo opcional, validado campo por campo (`limpiarHistorial`). |
| `src/render/pila.worker.ts` | El primer grano de cada pedido se suelta solo y se mide su avalancha hasta que la pila vuelve a estar estable (`muestras`). |
| `src/ui/juego.svelte.ts` | `registrar` en cada cuadro, contra el último estado que vio el bucle. `comprimirYa` (el botón y la tecla C) anota la corrida en el momento exacto. `verHistorial` sube una vez por segundo. |
| `tests/estadisticas.test.ts` | El desglose suma exactamente log10(Energía/s), y cada parte suma su factor; corridas, casillas del histograma, limpieza y viaje por el guardado. |

- **Producción**: la Energía/s en grande, una barra vertical apilada (cada factor ocupa lo que aporta en log10, con su color) y la lista. Al pasar el mouse por un segmento se resalta su fila, y al revés. Las filas se expanden en sus partes. Se actualiza en vivo; la barra se acomoda con una transición.
- **Corridas**: tabla de las últimas 10 compresiones (duración con una raya proporcional, Energía, Densidad, Energía/min). La más rápida va resaltada en ámbar.
- **Avalanchas**: histograma log-log con 4 casillas por década, la recta de mínimos cuadrados con su pendiente, la frase de la ley de potencias y, debajo, los récords: la avalancha récord, la más grande de la corrida, las avalanchas contadas y los derrumbes en la pila.
- **General**: tiempo de juego, de la corrida, desde que empezó la partida (reloj real), la corrida más rápida, las compresiones, los granos y los derrumbes. Debajo, la Energía en log10 a lo largo de la partida, con relleno y una animación que la traza.

### Verificación

- `npm test`: 68 en verde. `tsc` y `vite build` sin errores ni avisos.
- En el navegador: las cuatro pestañas en escritorio y en móvil (375 px), el resaltado de barra y fila, una fila expandida y dos compresiones a mano anotadas con la Energía exacta (8,20e240). Logros sigue igual después de pasarla al armazón compartido.
- **La ley de potencias la comprobé en Node**, con la misma `Pila`: 60.000 granos y después 4.000 sueltos. 3.000 no derrumban nada; de los 1.000 restantes, la cantidad baja de forma pareja con el tamaño (483 de 1 derrumbe, 110 en la casilla de 6 a 10, … 6 en la de ~1,8e5). En el navegador integrado llegan pocas muestras, porque oculto da ~1 cuadro por segundo.

### Decisiones (revisar)

1. **El histograma usa muestras, no todas las avalanchas.** Con flujo continuo el worker suelta tandas (ver hito 2b), y una tanda no es una avalancha. Por eso se mide aparte un grano solo por pedido (hasta ~60 por segundo). El récord, el sismógrafo, "la más grande de la corrida" y los derrumbes en la pila siguen contando tandas, como antes.
2. **Las avalanchas de 0 derrumbes no van al histograma** (en escala log no tienen lugar). Son las más comunes (~75 %).
3. **"Derrumbes"** (General) es la cuenta de la economía: K × G por cada grano que cae, sumada a medida que caen. No es la pila visual. Empieza en 0 en las partidas de antes de este cambio.
4. **Varias compresiones juntas fuera de línea no se anotan** en Corridas (no hay detalle de cada una). La serie de Energía sí toma el punto al volver.
5. **"Desde que empezó la partida"**: en las partidas de antes se estima con el reloj del guardado menos el tiempo de juego. La serie de Energía arranca en su primera muestra.
6. **Serie de Energía**: un punto cada 5 s de juego; al pasar de 600 se descarta uno de cada dos y el paso se duplica.

## Ajustes: pantalla completa

Ajustes deja el panel translúcido y pasa a pantalla completa, con el mismo armazón (`Pantalla.svelte`). Para entrar: el ícono o la tecla A. Ya no queda ningún panel sobre la pila, salvo "Mientras no estabas" y el guardado dañado.

| Archivo | Contenido |
| --- | --- |
| `src/ui/Opciones.svelte` | Nuevo. Cuatro pestañas: Aspecto, Juego, Partida, Teclado. Se llama así y no `Ajustes.svelte` porque en Windows ese nombre choca con `ajustes.svelte.ts`: `./ajustes.svelte` resolvía al componente. |
| `src/render/miniPilas.ts` | Claves de vista previa además de las de logros: `paleta:ID` (la pila llena y redonda con esa paleta) y `efecto:ID` (una onda de derrumbes con ese efecto, animada al pasar el mouse). |
| `src/render/marcos.ts` | `marco()` exportada, para dibujar las vistas previas. |
| `src/ui/logros.ts` | `nombreLogro`, `descLogro` (antes vivían en Logros.svelte) y `logroDe` (qué logro da un cosmético). |
| `src/ui/Paneles.svelte` | Solo "Mientras no estabas", el guardado dañado, Escape y el foco de todas las pantallas. |

- **Aspecto**: una grilla de tarjetas por tipo (paletas, efectos de avalancha, marcos), con la cuenta de desbloqueados ("6 / 9"). Cada tarjeta muestra su vista previa hecha con el motor de la pila. Los marcos se ven alrededor de la pila llena con la paleta en uso. La elegida va con borde ámbar y "En uso"; las bloqueadas, en gris con un candado y el logro que las da, y no se pueden elegir. Debajo, "Sacar foto del mandala".
- **Juego**: notación (con el mismo número escrito en cada una), volumen, Reducir destellos y paleta para daltonismo, cada uno con una línea que explica qué hace.
- **Partida**: un resumen (compresiones y tiempo de juego), y guardar, exportar, importar y empezar de cero, con la misma doble confirmación de antes.
- **Teclado**: las teclas, ahora con L, E y A.

### Verificación

- `npm test`: 68 en verde; `vite build` sin errores.
- En el navegador, escritorio y móvil (375 px): las cuatro pestañas y las vistas previas de paletas, efectos y marcos. Elegir Aurora la deja "En uso" y la guarda en los ajustes; una paleta bloqueada (Negativo) no se puede elegir.
- **Ojo:** el primer servidor de desarrollo de la sesión quedó vivo después de detenerlo, con la resolución vieja de `./ajustes.svelte` en caché. Lo cerré (era el del puerto 5176; los de 5173–5175 son de otras sesiones).


## Hito 6: pulido técnico

| Archivo | Contenido |
| --- | --- |
| `src/ui/sonido.ts` | Nuevo. Web Audio: derrumbes (los de 50 ms se juntan en uno, con volumen y tono según el tamaño), un clic por color al comprar a mano, acordes de hitos (cada ×4, anillo nuevo, color nuevo) y el pad de fondo con una capa por color visto. Tope de 12 voces (las que no entran se descartan; el pad no cuenta). Arranca con el primer toque o tecla (los navegadores no dejan antes) y se suspende con la pestaña oculta. |
| `scripts/sfx.py` | (Borrado en "Sonido sintetizado".) Genera los marcadores de posición en `public/sfx/` (`topple_small/medium/large`, `buy_caudal/ambar/coral/jade/violeta/other`, `chord_milestone/ring/color`, `pad_ambar/coral/jade/violeta`), en `.ogg` y en `.m4a`: Safari no decodifica Vorbis y usa el AAC. Necesita ffmpeg. El audio final se reemplaza con los mismos nombres. |
| `src/ui/ajustes.svelte.ts`, `Opciones.svelte` | Volumen general y uno por tipo (derrumbes, compras, hitos, fondo), en Ajustes → Juego. |
| `src/ui/Pila.svelte`, `Tienda.svelte` | Dónde suena cada cosa: la pila (derrumbes, hitos, fondo) y la compra a mano. |
| `src/render/lienzo.ts` | Rendimiento: la pasada a pantalla no muestrea la arena fuera del círculo de la grilla (las esquinas) y lee las 4 vecinas una vez por muestra (antes, dos). El dibujo no cambia. |
| `src/ui/App.svelte`, `Tienda.svelte` | Objetivos de 44 px. Tablet en vertical usa la hoja inferior del móvil; en pantallas de 16:9 o menos anchas la pila se corre a la izquierda de la tienda. |
| `index.html` | `--apagado` de 0,32 a 0,5 de opacidad: 2,5:1 → 4,6:1 de contraste (AA). Clase `.sr` (solo lectores de pantalla). |
| `src/ui/formato.ts` | `hablado`: "1,23e45" se lee "1,23 por diez a la 45" (Energía, Energía/s y costos de la tienda). |
| `vite.config.ts` | `server.host` y `preview.host`: el servidor escucha en la red local para probar desde el celular. |

### Probar desde el celular

1. `npm run dev` en la PC. Vite muestra la dirección de red (`Network: http://192.168.0.103:5173/` en esta máquina).
2. El celular, en la misma red Wi-Fi, abre esa dirección.
3. Si no carga, es el firewall de Windows: la primera vez pregunta si Node.js puede usar redes privadas (hay que aceptar). La versión compilada: `npm run build` y `npx vite preview` (puerto 4173).

### Verificación

- `npm test`: 69 en verde (uno nuevo, `hablado`). `tsc` y `vite build` sin errores ni avisos (también se fue el aviso de Svelte del sismógrafo).
- **Sonido**: en el navegador cargan y se decodifican los 16 archivos, sin errores. Al pedir 42 sonidos de golpe arrancaron 11 (más el derrumbe que ya sonaba: 12). No lo escuché: no tengo salida de audio.
- **Móvil (390×844) y tablet (768×1024 y 1024×768)**: un script recorre la pantalla principal y cada pestaña de Logros, Estadísticas y Ajustes buscando controles de menos de 44 px y cosas cortadas a la derecha. Antes: los íconos (36 px), la manija de la hoja (28), los modos x1/x10/Máx (15–28 de ancho), los interruptores "auto" (19 de alto), las pestañas de la tienda y los botones de Partida (40). Ahora ninguno. En tablet vertical la pila quedaba debajo de la tienda y en 1024×768 la tienda se escribía encima de la pila: los dos arreglados.
- **Foco visible**: con Tab, contorno ámbar de 2 px en cada control.
- **Lighthouse (accesibilidad), 12.8.2 con Edge** (no hay Chrome instalado), sobre una partida avanzada (Compresión 6, cuatro colores, autocompradores, Cascada): **100 en móvil, 100 en escritorio** y **100 en las 9 pestañas** de Logros, Estadísticas y Ajustes (modo instantánea). Con una partida nueva también da 100.
- **Rendimiento**, en esta laptop (Ryzen 7 4800H, **Radeon integrada**, pantalla de 60 Hz), Edge con ventana a 1366×800, versión compilada, pila llena y Caudal muy por encima del tope de 3.000 granos/s, 45 s por corrida: **60,0 / 59,9 / 60,0 fps**, p99 de 16,9 ms, 1–2 cuadros de más de 20 ms por corrida (peor: 83 ms, uno). Hilo principal: 0,4 ms por cuadro.

### Lo que encontré al perfilar

1. **El cuello era la GPU, no el código del juego**: en la traza, `Present` esperaba ~15 ms por cuadro. Ocultando el lienzo de la pila: 60,0 fps exactos. Con el arreglo del shader, `Present` bajó a ~13 ms.
2. **Las mediciones son ruidosas en esta máquina**: algunas corridas sueltas dieron 31–39 fps, con el shader viejo y con el nuevo por igual, y la siguiente volvía a 60. Coincidían con otras cosas usando la GPU (el navegador integrado tenía el juego abierto). Bajar a media resolución o sacar el supermuestreo no cambió nada en esas corridas, así que no es el dibujo.
3. **El worker no siempre llega a 3.000 granos/s**: con la pila llena está ocupado ~90 % del tiempo y suelta entre 1.500 y 3.000 granos/s según el momento (las avalanchas cambian de tamaño). Los fps no se enteran: el ritmo baja solo, sin acumular deuda. Si hace falta más, el paso siguiente sigue siendo el bucle de derrumbes en WebAssembly.

### Decisiones (revisar)

1. **Formato de audio**: la spec pide `.ogg`; van también `.m4a` del mismo nombre para Safari (iPhone). El final tiene que venir en los dos.
2. **Los autocompradores no hacen clic**; solo la compra a mano. Con los autocompradores andando sería un clic continuo. Los hitos sí suenan aunque los compre un autocomprador.
3. **Los volúmenes por tipo son cuatro deslizadores** debajo del general. Arrancan en 0,6 (derrumbes), 0,8 (compras e hitos) y 0,4 (fondo), a ojo: no se pudo escuchar.
4. **Objetivos de 44 px en todas las pantallas**, también con mouse. Las filas de la tienda con interruptor "auto" crecen de ~62 a 76 px.
5. **Tablet vertical (hasta 1100 px de ancho) usa el diseño del móvil.** Las pantallas completas (Logros, Estadísticas, Ajustes) siguen cambiando a 768 px.
6. **No toqué** las animaciones de anillos y colores del hito 6 de la spec: ya estaban (ola de color, anillo con texto).

## Inglés como segundo idioma

- `src/strings/en.ts`: la traducción completa, con el tipo de `es.ts` (`typeof es`), así que si falta una clave no compila. Un test en `tests/logros.test.ts` compara además las claves de los dos archivos.
- Nombres: Energy, Flow, Amber, Coral, Jade, Violet, Rings, Cascade, Compression, Density, Mutations, Infinity, Handful, Avalanche. "Derrumbe" quedó como *topple* (el término de la pila abeliana). El título del juego es "Avalanche" en inglés (ver Los primeros 10 segundos).
- `src/strings/index.ts` elige el idioma al cargar: el guardado en los ajustes o, si no hay, el del navegador (español si empieza con "es", si no, inglés). Todos los componentes importan `txt` de ahí. `es.ts` y `en.ts` llevan `locale` (`es-AR` / `en-US`) y `decimal`: los números salen 1.234 / 1,23e45 en español y 1,234 / 1.23e45 en inglés. El lector de pantalla lee la potencia en los dos.
- **Selector en Ajustes → Juego**, arriba de Notación. Cambiar el idioma **recarga la página** (la partida se guarda en el `pagehide`): hay textos que se arman una sola vez al cargar y así ninguno queda en el idioma viejo. `<html lang>` sigue al idioma.

### Verificación

- Script que recorre la pantalla principal, las tres pestañas de la tienda y cada pestaña de Logros, Estadísticas y Ajustes buscando texto cortado o fuera de la pantalla, en inglés, con una partida avanzada (Compresión 15): **nada en escritorio (1024×768) ni en móvil (375×812)**. Lo único que encontró fue el último número del eje del gráfico de avalanchas, que se cortaba 3 px en móvil también en español; ahora va alineado a la derecha.
- Cambiar de English a Español desde Ajustes recarga y conserva la partida.
- No revisé a ojo cada pantalla en inglés (el navegador integrado estaba oculto y casi no dibujaba la pila); sí vi Ajustes → Juego en móvil.

## Los primeros 10 segundos

- **Pantalla de título** (`src/ui/Titulo.svelte`): logo, el nombre (`txt.titulo`: Avalancha / Avalanche) en Space Grotesk 600 apretada, y un solo botón, Jugar / Play. Detrás, una pila propia (otra `PilaVisual`) que arranca en la foto de 1.000 granos y recibe 30 granos/s: cámara lenta. Al tocar Jugar se funde en 0,6 s. Mientras está, la economía no corre (`juego.titulo`; `hayPanel()` la cuenta, así Espacio no suelta granos).
- **Cuándo aparece**: sin partida guardada, o con una partida de 0 s de juego (recién borrada, o recargada en el título). **Con partida guardada se entra directo**; toda la página entra con un fundido de 0,5 s (`#app` en `index.html`). Por eso "Continuar" no existe: con partida nunca se ve el título.
- **Logo** (`public/logo.svg`, también favicon): una A de 7×7 celdas cuyos colores son las alturas reales de una pila de 472 granos soltados al centro (la que mejor reparte los cuatro colores: 6 Coral, 6 Violeta, 9 Jade, 9 Ámbar), con los colores de interfaz. `document.title` sigue al idioma.
- **Granos iniciales** (`granos_iniciales: 39` en `config.json`, SPEC 4.1): solo la primera corrida (después de comprimir, la pila arranca vacía). 39 ≡ 3 mod 4 deja la pila al borde: el primer Puñado hace una avalancha de ~20 derrumbes aunque el Caudal haya soltado hasta 4 granos antes (39 a 43 granos + 5 → 19–20 derrumbes). Aplicado a todas las corridas acortaba el Infinito ~4 min; solo en la primera, el núcleo da Infinito 196,4 min (antes 197,2) y la primera corrida 14,6 min (antes 15,1). SPEC 2 actualizada (tabla y línea de tiempo).
- **Primer derrumbe** (revelado y logro, `primerDerrumbe` en `logros.ts`): ahora `granosTotales ≥ 1 y G ≥ 4`; con 39 iniciales el primer grano soltado derrumba el centro.
- **La primera avalancha** después del primer toque (`Pila.svelte`): destello radial cálido desde la pila (`.chispa`, 0,8 s), el acorde de hito sobre el sonido del derrumbe y el contador de Energía que salta y se enciende en ámbar (`.salta`). Los derrumbes de los granos iniciales al montar no cuentan. Con Reducir destellos: sin escala, solo color y un fundido.
- **Pista "Tocá la pila"**: además del texto que late, dos ondas que salen del centro de la pila. Desaparece con el primer toque (o Espacio): `vistos.punado`. Las partidas de antes no lo tenían: con la tienda ya vista, tampoco se muestra (`invitaTocar()`).

### Verificación

- `npm test` (70), `npm run typecheck` y `npm run build` en verde.
- En el navegador: título en móvil (375 px) y escritorio (1280×760); Jugar arranca el juego; tras el toque aparecen el destello y el salto del contador (visto en el DOM), Energía ≈ 7 en el primer toque y la tienda enseguida.
- **No pude ver los 60 fps ni la animación fluida**: el navegador integrado estaba en segundo plano (~1 cuadro/s). Playwright no tenía Chrome instalado. Falta mirarlo a ojo, también en un celular.

## Guardar imagen (la foto del mandala)

- **Dónde**: botón de cámara, el primero de los íconos de arriba a la derecha (`aria-keyshortcuts="P"`), la **tecla P** (agregada a Ajustes → Teclado) y el botón de Ajustes → Aspecto que ya existía. En la pantalla final del Infinito, un botón destacado (píldora con brillo): **"Guardá tu mandala"**.
- **La imagen** (`sacarFoto` en `src/render/marcos.ts`): **2048×2048, dibujada de nuevo** con el mismo `Lienzo` WebGL sobre un `OffscreenCanvas` (se crea una vez y queda), no una captura. `PilaVisual.foto()` ahora devuelve una `Toma` (alturas, instantes de derrumbe, radio, brillos por nivel, paleta, efecto, Reducir destellos y px CSS por celda); la foto usa los mismos colores, brillo y efecto que la pantalla, y conserva el relieve que se ve (el `u_dpr` del shader se escala para que las celdas "midan" lo mismo en px CSS). La pila entra con radio 0,33 del lado (celdas de hasta 48 px si es chica), con el marco elegido de los logros alrededor. Abajo, tenue: el logo y `Energía X · Densidad ^Y · N anillos` (`txt.foto.pie`; Energía "∞" en el Infinito). Nada de la interfaz.
- **Entrega** (`src/ui/foto.svelte.ts`): con puntero táctil y `navigator.canShare({ files })`, el **menú de compartir del sistema**; si no (o si falla por algo que no sea cancelar), **descarga** `avalancha-mandala.png`. Si el jugador cierra el menú de compartir no hay aviso.
- **Foto**: destello blanco suave a pantalla completa (0,6 s; con Reducir destellos, más tenue y lento) al tocar, y al terminar el aviso "Imagen guardada" abajo al centro (fuera de `.juego`, así se ve también en la pantalla final).
- **Layout**: con cuatro íconos ya no entraban al lado de los modos (×1/×10/Máx) o las pestañas de la tienda en ventanas de menos de ~1480 px; en escritorio la tienda ahora arranca una fila más abajo (2,75 rem). En móvil no cambia (la tienda es la hoja inferior).

### Verificación

- `npm test` (70), `npm run typecheck`, `svelte-check` y `npm run build` en verde.
- En el navegador (descarga interceptada): con la pila llena, el botón da un PNG de **2048×2048** (~6 MB) y aparece "Imagen guardada"; mirada a tamaño real: celdas nítidas, pie legible. En el Infinito (Compresión 17 + Dar Energía): "Guardá tu mandala" aparece en la pantalla final y la foto sale con la pila entera (no colapsada), el brillo alto de los niveles y "Energía ∞".
- Móvil (375×812): los cuatro íconos entran junto a la Energía y el botón del mandala entra en la pantalla final.
- **No probado**: el menú de compartir real en un celular (el navegador integrado no tiene `navigator.canShare`, así que ahí descarga), el logo en Firefox (es un SVG sin tamaño propio; si no se puede dibujar, la foto sale sin logo) ni los 60 fps durante la foto (el navegador integrado estaba en segundo plano). El dibujo a 2048 px es un solo cuadro de GPU más el PNG; en móviles flojos puede trabar un instante.

## Sonido sintetizado

Los marcadores de posición (`public/sfx/`, `scripts/sfx.py`) se borraron: `src/ui/sonido.ts` genera todo con Web Audio, sin archivos ni sonidos de IA. SPEC 6.7 actualizada.

- **Escala común**: pentatónica mayor de Re (`nota(grado)`, Re3 = 146,83 Hz). Compras, acordes, Compresión, Infinito y música salen de ahí, así todo consuena entre sí.
- **Cadena**: efectos y música → general → limitador suave (`DynamicsCompressor`) → salida. Reverb de sala con respuesta de ruido generada (3,5 s).
- **Derrumbes**: un buffer de 4 s de chasquidos sueltos y suavizados ("granos"), tocado desde un punto al azar con un pasabanda (2,6 kHz → 900 Hz según el tamaño), ±15 % de tono al azar. Más derrumbes: más largo (60 ms a 1 s), más fuerte y más grave; desde ~300 derrumbes, con reverb. Se siguen juntando los de 50 ms y el tope de 12 voces (derrumbes y golpes).
- **Avalancha grande** (`pila.alAvalancha`, la misma que muestra "Avalancha ×N"): seno que cae de ~55 a ~27 Hz con 3 s de cola, más la arena a ¼ de velocidad bajo 300 Hz. Como mucho uno cada 1,5 s.
- **Compras**: campana con parciales inarmónicos (1; 2,76; 5,4; 8,93), un grado por color (Caudal Re5, Ámbar Mi5, Coral Fa#5, Jade La5, Violeta Si5, lo demás Re6).
- **Hitos**: arpegio rápido de triangulares más campanas, distinto para ×4, anillo y color nuevo.
- **Compresión**: diente de sierra y arena que caen de tono y se cierran en 0,9 s (lo que dura la implosión visual), y un acorde de recompensa.
- **Infinito**: siete sierras que suben una octava y abren el filtro durante 2,8 s (blanco y colapso), corte seco, 1 s de silencio y el acorde final largo al aparecer la pantalla final (3,8 s). La música vuelve despacio ~6 s después.
- **Música generativa**: cuatro capas, una por color visto (bordón grave, pad medio, pad alto, campanitas sueltas). Cada capa elige al azar su próxima nota, su largo (2–24 s) y a veces una quinta; las notas se superponen y el filtro respira. Nunca se repite igual.
- **Ajustes → Juego**: volumen general, efectos (0,8) y música (0,5). Los cuatro deslizadores por tipo de antes se fueron; los valores guardados de esos se ignoran.
- El sonido sigue arrancando con el primer toque o tecla y se suspende con la pestaña oculta.

### Verificación

- `npm test` (70), `npm run typecheck` y `npm run build` en verde.
- En el navegador, con un analizador enganchado a la salida: cada sonido da señal (pico sobre el fondo): derrumbe chico 0,05, de 100.000 0,10, golpe grave 0,45, compras 0,14–0,18, acordes 0,14–0,37, Compresión 0,38, música con 4 capas 0,08. Infinito: crescendo hasta 0,97, silencio 0,018 (cola de la reverb, −35 dB) y acorde final 0,55. Sin errores en la consola.
- **No lo escuché**: no tengo salida de audio. Los volúmenes relativos están puestos por medición, no a oído. Falta escucharlo, sobre todo una sesión larga de derrumbes para ver que no canse.

## Guías: ayuda integrada y "Cómo funciona"

Textos en `src/strings/{es,en}.ts`, bloque `guia`. Ningún número de balance escrito a mano: todo sale de `CFG` y del núcleo.

**Ayuda integrada**

| Archivo | Contenido |
| --- | --- |
| `src/ui/ayudas.svelte.ts` | `use:ayuda` (el tooltip), lo que dice cada mejora y número (`ayudaItem`, `ayudaProduccion`…), y `nombre`/`efecto`/`maximo` de la tienda (salieron de `Tienda.svelte`). Se llama `ayudas` y no `ayuda`: en Windows `./ayuda.svelte` resolvía a `Ayuda.svelte`. |
| `src/ui/Ayuda.svelte` | Dibuja el tooltip y el indicador de sistema nuevo. |

- **Indicador de sistema nuevo.** `revelar()` (juego.svelte.ts) encola en `juego.guias` cada sistema con indicador: Caudal, cada color, anillos, Compresión, Cascada, Mutaciones, el primer autocomprador de cada tanda y la Compresión automática. Cada objetivo tiene `data-guia="<clave>"`. Se ve un contorno fino del color del sistema que respira, más una línea de texto al lado (a la izquierda si está en la mitad derecha; arriba o abajo en móvil). Se cierra a los 9 s, o con un clic en el texto o en lo señalado; un clic en la pila no lo cierra (si no, los puñados lo borrarían al instante). Espera mientras hay un panel abierto. No vuelve: depende de que `vistos` cambie, y eso pasa una sola vez por partida. Si lo señalado no está en pantalla (por ejemplo, un color nuevo con la pestaña Cascada abierta), se descarta.
- **Tooltips.** Al pasar el mouse (350 ms), al mantener presionado en pantallas táctiles (450 ms; soltar después no compra) o con foco de teclado (`aria-describedby`). Muestran título, qué hace, "Ahora: …" y "Próximo nivel: … · Energía/s ×N" (N = `produccion(aplicar(s, id)) / produccion(s)`, sale del núcleo real). Lo tienen las filas de la tienda (también sin poder comprar: el botón deshabilitado deja pasar el puntero al `li`), los autocompradores, la Energía, la Energía/s (con la fórmula y tus valores), la Densidad, los anillos (próximo anillo), la escala, el sismógrafo, el botón Comprimir, la Compresión automática, y en Estadísticas los factores de Producción y todas las cifras.

**Pantalla "Cómo funciona"** (`ComoFunciona.svelte`, ícono "?" arriba a la derecha, tecla H)

- Pantalla completa sobre `Pantalla.svelte`, con un índice a la izquierda (se oculta en móvil). Una sección por sistema; las que todavía no aparecieron (según `juego.vistos`) se ven apagadas, con candado y "Seguí jugando para descubrirlo".
- En cada sección: 2 o 3 frases y "Para curiosos", con la fórmula exacta de SPEC 4 y debajo la misma con los valores del jugador (por ejemplo, `= 1 × 2^2 × 3^0 = 4 granos/s`, `= 10^(1 + 0,6·2 + 0,075·2²) = 10^2,5 = 316`).
- **La pila de arena**: qué es (Bak, Tang y Wiesenfeld), por qué cada grano da ~K·G derrumbes (T(N) ≈ K/2·N² y su derivada, con tu G), la ley de potencias (el histograma de Estadísticas, ahora `Histograma.svelte`, compartido) y por qué el orden no importa. Incluye `MiniPila.svelte`: 15×15 con clics, un derrumbe por paso cada 120 ms (se acelera de a uno más por paso cada 40 derrumbes para que una avalancha enorme no dure minutos), contador de derrumbes y de granos caídos por el borde, y Reiniciar. Teclado: Enter suelta un grano en el centro.

### Verificación

- `npm run typecheck`, `npm run build` y `npm test` (70) en verde. En la corrida completa, dos tests de `guardado.test.ts` (8 h fuera de línea) pasaron los 5 s de límite con dos servidores de desarrollo y el navegador corriendo; solos pasan (27/27). No tocan nada de este cambio.
- En el navegador (partida nueva, 1024×768): al aparecer la tienda, el indicador rodea Caudal con el texto a la izquierda; después Ámbar (en ámbar) y anillos (abajo a la izquierda). El tooltip de Caudal muestra "Ahora: 1 grano/s · Próximo nivel: 2 granos/s · Energía/s ×2,00". Saltando a la Compresión 6 (debug), las fórmulas de Caudal, Compresión, Cascada y Autocompradores salen con los valores del estado; Mutaciones queda bloqueada. La mini pila hizo una avalancha de 7 derrumbes. Tooltips de Estadísticas OK. Móvil (375×812): entran los cinco íconos, la pantalla se lee en una columna y el indicador va encima de lo señalado. Sin errores en la consola.
- **No probado**: mantener presionado en un celular real (el navegador integrado manda clics de mouse); los 60 fps (el navegador integrado estaba en segundo plano). El indicador y el tooltip siguen a su objetivo con un `requestAnimationFrame` mientras están visibles (un `getBoundingClientRect` por cuadro).

### Decisiones (revisar)

1. **Las secciones bloqueadas muestran el nombre** (apagado, con candado) pero no el texto. Si "sin spoilers" significa también esconder el nombre, cambiarlo es una línea en `ComoFunciona.svelte`.
2. **"La pila de arena" está abierta desde el inicio**: es el juego mismo.
3. Si aparecen muchos sistemas juntos (saltos de debug), solo se muestran los dos últimos indicadores, igual que las frases de aviso.

## Arreglos de la auditoría y `PENDIENTES.md`

Cada punto de `AUDITORIA.md` tiene su commit y su marca "✅ resuelto" con el detalle. Resumen:

| Punto | Qué cambió | Cubierto por |
| --- | --- | --- |
| B1 | El guardado lleva la fecha hasta la que se simuló (`simuladoHasta`), no `Date.now()`. | `tests/juego.test.ts` |
| I1 | `navigator.locks`: una sola pestaña juega y guarda; la otra muestra "El juego está abierto en otra pestaña" y puede robar el candado. | `tests/juego.test.ts` |
| I2 | Un guardado con campos de menos se completa con `estadoInicial()`; respaldos con fecha que no se pisan; "Copiar la partida dañada". | `tests/guardado.test.ts` |
| I3 | Aviso fijo tras dos guardados fallidos; importar o borrar no recarga si no pudo escribir. | `tests/juego.test.ts` |
| I4 | La pila siempre en el centro de la ventana en escritorio; se achica (`radioMax`) en vez de correrse. | Edge headless, 4 tamaños: 0 px |
| I5, M15 | Título siempre (Jugar / Continuar) como velo sobre la pila del juego, quieta y lejos (`PilaVisual.zoom`). Al entrar: acercamiento, primer grano y la interfaz en orden. El fuera de línea se simula al entrar. | Edge headless |
| I6, M12 | Sin `pilas.bin` el worker contesta `sinFotos` y la pila sigue; las mini pilas atrapan el fallo. | Edge headless con la red fallando |
| I7 | Pérdida y recuperación del contexto WebGL; aviso sin WebGL2. | Edge headless con `WEBGL_lose_context` |
| I8 | `comprarMax` sin `disponibles` por nivel: 70 → 5 ms en el peor caso. | `tests/tienda.test.ts` (equivale a comprar de a uno) |
| I9 | Récord y logros de avalancha con las muestras de un grano solo. | medido con la pila real |
| I10 | Íconos, logros ("???"), factores de Producción, tooltip, teclado y Cómo funciona respetan `vistos`. | `tests/logros.test.ts`, Edge headless |
| I11 | Con la pila llena, un pedido al worker por cuadro; ajuste "Ahorrar batería" (4 ms); buffers de alturas reusados. | worker 59 % (44 % con ahorro), 60 fps |
| M1 | `user-select: none` salvo campos y fórmulas. | — |
| M2 | Menús con la familia de la tienda (sin tarjetas, píldoras, vidrio ni teclas dibujadas). | capturas 1280×720 y 375×812 |
| M3 | Compresión en ausencia anotada con el umbral. | `tests/estadisticas.test.ts` |
| M4 | `puedeComprimir` con `gte`; costos redondeados para arriba. | `tests/formato.test.ts` |
| M5–M7 | Rangos al importar; la importada arranca ahora; exportar en trozos. | `tests/guardado.test.ts` |
| M9–M11, M14, M16 | Listener del tooltip, sismógrafo 4 veces por segundo, cartel de ausencia por tiempo real, salidas en la pantalla final (y final ya visto directo), bitmaps y voces de audio. | Edge headless (M14) |

Además: el test de 8 h fuera de línea tiene timeout de 30 s (estaba al borde de los 5 s y fallaba a veces en paralelo), y `scripts/partida50.mjs` toca el botón del título.

### Sin resolver (necesitan una decisión o permiso)

1. ~~**M8**~~ — resuelto con tu OK: `objetivo_minutos` = 194 / 228 / 376.
2. ~~**M13**~~ — resuelto con tu OK: la fuente viene de `@fontsource/space-grotesk`, sin Google Fonts.
3. **M17** — `balance/pila.c` sigue sin compilar: no hay compilador de C en esta máquina.
4. **Pila en móvil (I4)** — SPEC 6.4 dice "pila arriba (55 %)" y `PENDIENTES.md` pedía el centro exacto. Quedó como la spec.
5. **Logro de avalancha récord (I9)** — con avalanchas reales, 1e6 derrumbes sale en segundos con la pila llena. Si se quiere más raro, subir `logros.avalancha_record` (balance).

### Verificación

- `npm test`: 138 tests en verde. `npm run typecheck` y `npm run build` bien. `python balance/sim.py`: 187 / 194 / 228 / 376 min, sin cambios.
- Partida completa a ×50 con `scripts/partida50.mjs` (Edge headless, 1280×720): pasa por el título, 17 compresiones e Infinito a los 303 s reales, sin errores en la consola. El script se quedó esperando la segunda captura del final (`Page.captureScreenshot` no contestó); repetido aparte con el debug, el final se captura bien a 0,3–4 s y la página sigue respondiendo, así que lo atribuyo al Edge headless después de 5 min con la pila llena, no al juego.
- De esa prueba salió un arreglo más: después del Infinito la pila seguía simulando y sobre la pantalla final aparecían "Avalancha ×N" y logros nuevos. Ahora, con `infinitos > 0`, la pila no recibe arena ni dispara textos, sonidos ni récords.

## Demo para publicar (galaxy.click, itch.io)

- **Panel de debug**: ya se montaba solo con `import.meta.env.DEV` (`App.svelte`). Verificado en la build: ninguno de sus textos ni botones está en `dist/` (quedan solo sus cadenas en `strings/`).
- **Rutas relativas**: `base: './'` en `vite.config.ts`. `dist/index.html` pide `./assets/…` y `./logo.svg`; el worker y `pilas.bin` cargan con rutas relativas.
- **Créditos**: pestaña nueva "Créditos" en Ajustes ("Hecho por feli202" e "Inspirado en Antimatter Dimensions y Revolution Idle"), textos en `strings/es.ts` y `en.ts`. En móvil las cinco pestañas pasan a dos renglones.
- **`avalancha-demo.zip`**: el contenido de `dist/` con `index.html` en la raíz, **241 KB** (240.996 bytes, 14 archivos). Está en `.gitignore`: se regenera con **`npm run zip`** (build + `scripts/zip.py`). **Arreglo:** la primera versión se armó con `Compress-Archive` de PowerShell 5.1, que guarda las rutas como `assets\…`; en itch.io/galaxy.click no se crea la carpeta `assets/` y el juego queda en negro. `scripts/zip.py` escribe las rutas con `/` y lo verifica sobre los nombres crudos. Probado: descomprimido con el `tar.exe` de Windows en una carpeta nueva y servido por HTTP en un iframe de otro origen, arranca sin errores en la consola.
- **Portada** (`marketing/portada.png`, 1260×1000, la proporción 630×500 que pide itch.io): la pila grande de la captura 2, el logo y "Avalancha" en Space Grotesk 700, armada en HTML y capturada con Edge headless. Versión apaisada `marketing/portada-500x300.png` (título a la izquierda, la pila a la derecha).
- **`PUBLICACION.md`**: título, descripción corta y larga y etiquetas, en inglés.
- **Capturas** en `marketing/` a 1920×1080, sacadas de una partida a ×50 en Edge headless (panel de debug, tooltips e indicadores de guía ocultos por CSS solo para la foto; 17 compresiones e Infinito en 326 s reales, sin errores en la consola): `1-pila-chica.png` (primera corrida, ~6.000 granos), `2-pila-grande-avalancha.png` (Compresión 9, pila llena), `3-compresion.png` (el destello de la Compresión 5 con la pila nueva) y `4-infinito.png` (la pila volviéndose blanca desde el centro). 6,7 MB en total.

### Verificación dentro de un iframe

Página anfitriona en `127.0.0.1:8765` con un iframe a `localhost:8765/juegos/sub/avalancha/` (otro origen y una subcarpeta), `allow="fullscreen; autoplay"`:

| Qué | Resultado |
| --- | --- |
| Carga, clics, Puñado, worker y pila | Bien (navegador integrado, clics reales). |
| Guardado | Bien: al recargar la anfitriona el título dice "Continuar"; `avalancha.guardado` y `avalancha.ajustes` en el `localStorage` del iframe. |
| Sonido | El `AudioContext` queda `running` después del clic en Jugar (Edge headless, mismo origen, clic real por CDP). |
| Pantalla completa | **No se pudo probar de verdad**: el navegador integrado y Edge headless rechazan `requestFullscreen` ("Permissions check failed" / "not granted"). Simulado agrandando el iframe a 1920×1080: el canvas pasa a 1920×1080 y la interfaz se reacomoda. El juego no tiene botón propio de pantalla completa; usa el del sitio. |
| Consola | Sin errores. |

`npm test` (138), `npm run typecheck` y `npm run build` en verde.

### Ventanas apaisadas chicas (reproductor de itch.io)

El reproductor de itch.io mide 640×360 por defecto, y el diseño de celular entraba con cualquier ancho menor de 768 px, aunque la ventana fuera apaisada: la pila quedaba en una franja y la tienda como hoja abajo. Ahora:

- El diseño de celular entra solo en vertical (`orientation: portrait` hasta 1100 px), en `App.svelte` y `Tienda.svelte`. Un celular acostado usa el de escritorio.
- Apaisada hasta 900 px de ancho: columnas de 12,5rem, márgenes de 1rem y letra al 87,5 %.
- `--pila-radio-max` nunca baja de 4rem: a 640 px daba 0, y 0 se leía como "sin límite" (la pila salía gigante, debajo de la tienda).

Visto en Edge headless a 640×360, 800×450, 812×375 y 375×812: la pila entra entre las columnas y el vertical no cambia. `npm test` (138) y typecheck en verde; zip rearmado (241.021 bytes).

### GitHub Pages (para galaxy.click)

- Repo público **github.com/feli202/avalancha** con **solo la build** (el contenido de `dist/` más `.nojekyll`, rama `main`); el código fuente no está ahí. Pages publica desde `main` / raíz.
- Link: **https://feli202.github.io/avalancha/**. Probado: todos los recursos dan 200 (también `pilas.bin` y el worker), entra, el Puñado hace la primera avalancha y al recargar dice "Continuar".
- **Actualizado el 14/11/2026** (commit `49f362b` de ese repo) con el arreglo de las vistas previas, los logros secretos y los fondos y marcos nuevos. Probado en la página publicada: 47/47 vistas previas en Ajustes → Aspecto, consola sin errores.
- Para actualizarlo: `npm run build`, copiar `dist/*` a un clon de ese repo (dejando `.nojekyll`), commit y push. Este proyecto no tiene remoto: el repo de Pages es aparte.

### Vistas previas vacías en itch.io (Logros y Ajustes → Aspecto)

**Causa:** `pilas.bin` es un gzip y el juego lo abría siempre con `DecompressionStream`. itch.io sirve los archivos gzip con `Content-Encoding: gzip`, el navegador los entrega ya abiertos y descomprimir de nuevo falla ("Failed to fetch"). Sin fotos solo se dibujaba lo que se calcula sin ellas: los 2 primeros logros (4 y 100 granos). El worker de la pila perdía las fotos igual (quedaba en `sinFotos`). No era ninguna de las otras sospechas: `base` ya es `./`, no hay nombres con mayúsculas cruzadas, el archivo entra al build y da 200, hay 3 contextos WebGL en total (la pila, uno compartido para las miniaturas, uno para la foto) y nada de origen cruzado.

- **Arreglo:** `src/render/fotos.ts` (`leerFotos`) mira la firma `1f 8b`: si es gzip lo descomprime, si no lo usa tal cual. Lo usan `miniPilas.ts` y `pila.worker.ts`. Test: `tests/fotos.test.ts`.
- **Diferido:** `imagen()` genera una miniatura por rato libre (`requestIdleCallback`, `setTimeout` en Safari), en el orden de las tarjetas. Antes, la primera apertura de un panel hacía tareas de hasta ~300 ms; ahora ninguna de más de 50 ms y las 24 de Logros están en menos de 1 s.
- **Secretos sin conseguir:** la silueta sale borrosa (`blur` en `Logros.svelte`).
- **`scripts/itch-falso.mjs`**: sirve `dist/` como itch (subcarpeta, iframe de otro origen, `Content-Encoding: gzip` para los gzip). `npm run build && node scripts/itch-falso.mjs dist` y abrir `http://localhost:4180/`. Con el código viejo reproduce el bug.
- **Verificado** en `npm run preview` y en el itch falso (directo y dentro del iframe): 24/24 en Logros, 47/47 en Aspecto (paletas, efectos, marcos nuevos, fondos), 40 aperturas y cierres sin errores, sin `webglcontextlost`. `npm test` (161), typecheck y build en verde; zip rearmado (252.262 bytes).
- **No se hizo:** no se reescribió el generador (ya era un solo renderizador offscreen con caché por clave, y la paleta de daltonismo la vacía); la vista de Marcos sigue usando la pila llena con la paleta en uso, no la foto del mandala actual. **Falta:** medir fps con la ventana visible (el navegador de prueba estaba oculto y no corre `requestAnimationFrame`) y subir el zip a itch como borrador para confirmarlo ahí.

## Clips verticales (TikTok, Reels, Shorts)

Diez MP4 de 1080×1920, H.264 + AAC, en **`marketing/clips/`** (~245 MB, en `.gitignore`: se regeneran). Cinco guiones, cada uno en español (`-es`) y en inglés (`-en`):

| Clip | Dura | Qué pasa |
| --- | --- | --- |
| `regla` | 15 s | "1 regla. 4 granos y se derrumba.": un grano cada 0,6 s (el cuarto derrumba) y timelapse hasta la pila llena, con la cámara alejándose. |
| `avalancha` | 10 s | Pila llena: 3.000 granos de golpe en el centro (onda de luz + golpe grave), y otra tanda en cámara lenta (×0,2) mientras la cámara se acerca. |
| `compresion` | 8 s | La pila llena implota (giro, remolino de colores, destello) y renace de cero hasta llenarse. |
| `infinito` | 15 s | Compresiones 15, 16 y 17 rápidas, la última pila, el blanco desde el centro, el colapso y la pantalla blanca con ∞. Con el sonido del Infinito. |
| `unica` | 12 s | Cuatro mandalas (30.000, 100.000, 300.000 granos y llena) con las paletas Brasa, Glaciar, Aurora y Oro viejo, girando, con un golpe de luz en cada cambio. |

Todos: texto grande desde el primer cuadro, dentro de la zona segura (arriba, centro en y = 330, de x = 140 a 940; nada en los 480 px de abajo), el nombre del juego y "Un incremental de arena" los últimos 2,5 s, y los últimos 0,5 s funden hacia el primer cuadro para que el loop no corte.

**Cómo se graban**

- Panel de debug → "Grabar clips 9:16" (un botón por clip o "Todos"; cada uno en los dos idiomas). O, mejor, en un Edge aparte que no frene los cuadros (con el servidor en el puerto que diga `npm run dev`):
  ```
  msedge --user-data-dir=D:\tmp\edge-clips --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --app=http://localhost:5173/?grabar=todos
  ```
  `?grabar=todos` (o `?grabar=regla,unica`) arranca solo al cargar; al terminar recarga sin el parámetro. ~4,5 min para los diez.
- `src/ui/clips.ts`: los guiones. Granos, Caudal, cámara (`zoom`), cámara lenta (`ritmo`) y transformación del disco salen del tiempo, así que el clip sale igual cada vez (la música de fondo es generativa: esa sí cambia). Un canvas 2D de 1080×1920 compone la pila (WebGL, el canvas del juego agrandado a 1080×1920 px reales) con los textos y los efectos que en el juego son CSS (implosión, blanco del Infinito, destellos); `captureStream` solo vería el canvas. Audio: `sonido.salida()` (un `MediaStreamDestination` después del limitador). `MediaRecorder` → WebM.
- `scripts/clips.mjs` (plugin de Vite, solo `npm run dev`, solo pedidos de esta máquina): guarda el WebM, ffmpeg `-preset veryfast -crf 18`, a 60 fps, corta desde el inicio exacto del clip (`-ss`), borra el WebM y revisa con ffprobe que el video dure lo que tiene que durar; si quedó corto contesta 409 y el navegador graba ese clip de nuevo (hasta 3 veces).
- `pilaVisual.ts`: `ritmo` (velocidad del reloj de la pila: destellos, granos y presupuesto del worker) y `echar(n)` (tanda de granos de golpe con la pila llena). En el juego `ritmo` es siempre 1.
- La economía no se toca: el modo grabación pone la velocidad en 0, maneja la pila él solo (Pila.svelte le cede el cuadro con `grabacion.cuadro`) y recarga al final. Textos de los clips en `strings/es.ts` y `en.ts` (`clips`).

**Verificación**

- Los diez: video y audio de la duración exacta; 1080×1920.
- Cuadros distintos: entre 44 y 58 por segundo según el clip (la pantalla blanca y el cierre son quietos a propósito; la máquina no llega siempre a 60 con la pila llena a 1080×1920).
- Empalme último cuadro / primer cuadro: PSNR 21–47 dB (la diferencia es el brillo de la arena, que nunca está quieta; el fundido de 0,5 s lo tapa).
- Revisado con hojas de contacto: textos sin pisarse, el primer cuadro con el texto, el cierre bien.
- **Ojo:** en el panel del navegador integrado oculto la página corre a ~1 fps y los clips salen trabados; con la ventana chica a la vista, a 30. Por eso el Edge aparte.
- `npm test` (138), typecheck y svelte-check en verde.

---

# Capa 1 — Cristalización

Spec: `SPEC_CAPA1.md`. Constantes: `balance/config_capa1.json`. Simulador: `balance/sim_capa1.py`.

**Hito actual: C3 (sin empezar). C2 terminado el 2026-11-15.**

## Plan (SPEC_CAPA1 §16)

**Actualización 1.1**

- [x] C1 — Guardado v2 + migración, Cristales, Infinito nuevo, barra lateral de capas y de Cristalización (pantallas vacías)
- [x] C2 — Red: datos desde config, forma de rombo, compra, apertura de vecinos, Memoria (automatización)
- [ ] C3 — Relicario: ofertas con semilla, fusión, engarces, efectos
- [ ] C4 — Estratos: lógica (`s_k`, Presión, compras) + interfaz 2D provisoria
- [ ] C5 — Estratos: escena three.js descendente + optimización
- [ ] C6 — Romper el Infinito + fórmula de Cristales + Infinito automático óptimo
- [ ] C7 — Defectos 1–4 + visuales
- [ ] C8 — Test de balance de la 1.1 + offline + estadísticas
- [ ] C9 — Pulido y auditoría 1.1 → publicar

**Actualización 1.2**

- [ ] C10 — Escarcha (lógica + visual)
- [ ] C11 — Anillo 3 de la Red, Pulido, Deshielo
- [ ] C12 — Defectos 5–8
- [ ] C13 — Fin de la Capa 1 (hito + pantalla) + test de balance completo
- [ ] C14 — Pulido y auditoría 1.2 → publicar

## C2 — Red (2026-11-15)

| Archivo | Contenido |
| --- | --- |
| `src/core/red.ts` | Nuevo. `NODOS` (`red.nodos` + `red.anillo3_1.2` de config), `anillo`, `vecinos`, `abierto`, `costoRedLog10`/`costoRed`, `puedeComprarRed`, `comprarRed`, `efectoRed` (como `v()` de `sim_capa1.py`) y los efectos que ya usa la Arena. |
| `src/core/state.ts` | `red`: nivel de cada nodo (las claves salen de `NODOS`, así un nodo nuevo en config entra solo, también en guardados viejos). |
| `src/core/formulas.ts` | Densidad + Compactación; `maxCascada`/`maxMutacion` (Cascada+ y Mutación+); Eco en `valor`. |
| `src/core/compress.ts` | `autoActivo`: con Memoria nv1, todos los autocompradores y la Compresión automática desde el inicio. |
| `src/core/tick.ts` | Memoria nv2/nv3: Cascada y Mutaciones automáticas (lo más barato primero, con el margen `autocompradores_umbral_log10`, igual que el simulador). Memoria nv4: Infinito automático en el tick siguiente a llegar a 1e308. |
| `src/core/infinito.ts` | Conserva la Red y `max(Memoria, Sedimentación)` compresiones; multiplicador de Cristales de Ruptura y Cristalografía. |
| `src/guardado/guardado.ts` | Valida la Red (enteros 0..4); los topes de Cascada y Mutaciones al cargar respetan Cascada+/Mutación+. `completar()` ahora completa también un objeto entero que falta (antes devolvía `undefined`). |
| `src/ui/Red.svelte` | Nuevo. La pantalla de la Red dentro de Cristalización. |
| `src/strings/es.ts`, `en.ts` | `cristal.red`: nombre, nombre corto y efecto de cada nodo (con los valores de config); `debug.darCristales`. |
| `tests/red.test.ts` | Nuevo, 9 tests. |

- **Forma.** Grilla de 7×7 con cada nodo en su `pos` de config, Memoria al centro. Cada nodo es una celda de la pila: vacío se ve el borde; con niveles, el relleno es el color del último nivel (Ámbar/Coral/Jade/Violeta, los mismos tokens de la Capa 0, también con daltonismo) y abajo cuatro marcas con los niveles comprados. Lo comprable tiene borde y brillo cian. Lo cerrado, atenuado. El anillo 3 se ve gris, con trama de hielo y un candado.
- **Apertura.** Memoria siempre; el resto cuando un vecino ortogonal con anillo menor está en nivel 4. El anillo 3, además, espera `escarchaAbierta()` (hoy `false`, llega con C10).
- **Derrumbe al maxear.** La celda destella y se vacía, cuatro granos violeta salen hacia los vecinos ortogonales (los que existen) y cada vecino se enciende al recibirlo; con el sonido de arena y el acorde de anillo. Con Reducir destellos no hay animación.
- **Tooltip** (el `use:ayuda` de siempre: mouse, mantener presionado o foco): nombre, nivel (o por qué está cerrado), efecto actual, efecto del siguiente nivel y costo. Clic compra.
- **Móvil.** Las celdas se achican a ~40 px y muestran el nombre corto (container query). Sin scroll horizontal a 375 px.
- **Debug.** "Cristales ×10 (+10)" (también suma a Cristales totales).

### Verificación

- `npm test`: **176 en verde** (antes 167). `tsc` y `svelte-check` sin errores. No se tocó el balance de la Capa 0 (con la Red en 0 todo da igual).
- En el navegador integrado (1280×800 y 375×812): partida nueva → casi Infinito → Cristalización → Red. Con Cristales de debug: Memoria 1→4 (cuesta 1 cada uno) abre Eco, Sedimentación, Estratos y Defectos; Eco 1→4 (1+2+2+3) abre Ruptura, Cristalografía y Cascada+. Los cuatro granos y los cuatro destellos de vecinos aparecen en el DOM con sus direcciones. La Red se conserva al recargar. Con Memoria nv4 y Sedimentación nv4 la Arena hizo 5 Infinitos solos conservando las 17 compresiones.
- **No vi la animación del derrumbe en movimiento ni medí fps**: la ventana estaba oculta y las capturas se cortaban. Lo nuevo es CSS (9 elementos con `translate`/`opacity` durante 1,1 s).

### Decisiones (revisar)

1. **Costos redondeados para arriba a Cristales enteros** cuando son menores a 1e6 (10^0,15 = 1,41 → 2). El simulador cobra el costo exacto en log10. Anillo 1: 1/2/2/3 en vez de 1/1,41/2/2,82; anillo 2: 40/80/159/317. Diferencia chica, no corrí el simulador con esto.
2. **Cascada y Mutaciones automáticas no tienen interruptor** (los autocompradores de la Capa 0 sí). Compran después de Caudal y colores, que casi siempre se gastan la Energía antes: igual que el orden del simulador.
3. **El Infinito automático es inmediato** al llegar a 1e308. El "en el óptimo / al llegar a X Cristales" de §4 es de C6 (con el Infinito roto).
4. **Efectos que esperan su hito:** Estratos (flujo), Defectos, Engarces, Presión, Inercia y Ruptura nv1 (Romper el Infinito) solo guardan el nivel y muestran el texto; los lee C3, C4, C6 y C7 con `efectoRed`. Ya actúan: Memoria, Sedimentación, Eco, Compactación, Cascada+, Mutación+, Cristalografía y los ×10 de Ruptura nv2+.
5. **Nombres en inglés** de la Red (Lattice, Echo, Settings…) son provisorios.
6. Aviso "+N Cristales" también para el Infinito automático.

## C1 — Guardado, Cristales, Infinito nuevo y barras de capas (2026-11-15)

| Archivo | Contenido |
| --- | --- |
| `src/core/config1.ts` | Única puerta a `balance/config_capa1.json` (`CFG1`). Tipa solo lo que el código ya usa (`cristales.primer_infinito`, `cristales.base_log10`); cada hito agrega lo suyo. |
| `src/core/infinito.ts` | `cristalesAlInfinito(s)` y `infinito(s)`: cobra los Cristales y reinicia la Arena. |
| `src/core/state.ts` | `cristales` y `cristalesTotales` (`Decimal`). `infinitos` ahora **cuenta** los Infinitos hechos. |
| `src/core/formulas.ts` | `enInfinito(s)`: la Energía llegó a 1e308 y la economía espera el Infinito. Reemplaza a todos los `infinitos > 0` que querían decir "congelado" (tick, puñado, tienda, Compresión, fuera de línea, secretos, foto, test de balance). |
| `src/core/tick.ts` | La Energía se frena en 1e308 (`Decimal.min`), también con el Puñado. Ya no pone `infinitos = 1`. |
| `src/guardado/guardado.ts` | `VERSION = 3`, Cristales serializados como `[mantisa, exponente]`, migración. |
| `src/ui/Capas.svelte` | Nuevo. Barra lateral de capas y la pantalla de Cristalización con su segunda barra. |
| `src/ui/juego.svelte.ts` | `juego.capa`, `juego.cinematica`, `infinitoYa()`, la cinemática del primer Infinito (`CINEMATICA_MS`), `hayCartel()`. |
| `src/ui/Pila.svelte` | La cinemática (reemplaza el blanco y el colapso de SPEC 6.6). |
| `src/ui/App.svelte` | Botón Infinito, línea de Cristales, lugar para la barra. Se fue la pantalla "Llegaste al Infinito". |
| `tests/fixtures/guardado_capa0_infinito.json` | Guardado real de la Capa 0 para el test de migración. |

- **Infinito (SPEC_CAPA1 §4, sin Romper).** Al llegar a 1e308 la Energía se frena y la Arena queda quieta. El **primer** Infinito llega solo, con la cinemática; los siguientes se hacen con el botón (donde estaba Comprimir; tecla C), que muestra cuántos Cristales da. El primero da `primer_infinito` (1, igual que `sim_capa1.py`, que arranca con 1 Cristal); después `floor(10^(mult + base_log10))` = 2, con `mult = 0` hasta que exista la Red.
- **Reinicio (§3).** Vuelve a `estadoInicial()` con 0 granos: Energía, granos, Caudal, colores, Cascada, Mutaciones, compresiones, Energía máxima y colores desbloqueados. Se conservan Cristales, Cristales totales, número de Infinitos, tiempo total, granos totales, mejor corrida, compresiones sin Ámbar y los interruptores de los autocompradores.
- **Guardado.** La spec lo llama "v2", pero el 2 ya lo había usado el hito 5b de la Capa 0: en el archivo es **versión 3**. Los campos nuevos los completa `completar()` desde el modelo. Migración: si el guardado es anterior a la 3 y tenía el Infinito de la Capa 0 (`infinitos > 0`), al cargar se cobra ese Infinito: 1 Cristal y la Arena reiniciada. Entra directo a Cristalización, con la presentación.
- **Barras (§11).** Barra angosta a la izquierda (Arena / Cristalización), solo después del primer Infinito; en vertical va a la esquina de arriba de la región de la pila. La columna izquierda de la Arena se corre 2,75 rem para dejarle lugar; **la pila no se mueve**. Cristalización es una pantalla completa con los contadores (Cristales, Cristales totales, Energía de la Arena) y la segunda barra: Red · Estratos · Defectos · Escarcha · Relicario, por ahora vacías con el nombre. La Arena sigue corriendo detrás.
- **Cinemática (3,2 s).** 0–1,8 s el hielo sube desde abajo sobre la pila (seis facetas de 60° con arista fina; la pila se ve debajo sin color); 1,8–2,9 s la pila se apaga y 18 cristales (rombos de 60°) salen del centro; a los 3,2 s se cobra el Infinito y Cristalización entra desde abajo, con tres líneas que explican los Cristales y "Seguir". La pila no se mueve ni se escala en ningún momento. Con Reducir destellos: el hielo aparece y se va, sin cristales, y la pantalla entra con un fundido. Si se cierra la página a mitad, se repite al volver.
- **Estética helada.** Tokens nuevos en `index.html`: `--hielo`, `--escarcha`, `--noche`. Sin desenfoque: líneas de grieta a 60° sobre azul noche.
- **Debug.** "Energía a 1e307 (casi Infinito)" en el panel de debug (solo en desarrollo, plegado): 1e307 de Energía con las 17 compresiones, Cascada y Mutaciones al máximo. Los autocompradores gastan la Energía y el Infinito llega en ~30 s. Con solo la Energía no alcanzaba: sin Mutaciones la producción quedaba en 1e259/s.

### Verificación

- `npm test`: **167 en verde** (antes 158). Nuevos: freno en 1e308, Infinito (primero 1, después 2, reinicio campo por campo), ida y vuelta con Cristales (también exportar/importar), migración con el guardado real y migración de una partida sin Infinito. `tsc`, `svelte-check` y `npm run build` sin errores. `python balance/sim_capa1.py`: igual que antes (no se tocó el balance).
- **Guardado real de la Capa 0**: lo escribió el código de antes de este hito (versión 2 del archivo), con el bot de 15 s jugando el núcleo hasta el Infinito (3,3 h de juego, 17 compresiones).
- En el navegador integrado (1280×720 y 375×812), sin errores de consola del juego:
  - Partida nueva → botón de debug → ∞ → cinemática → Cristalización con 1 Cristal → Seguir → las cinco pantallas.
  - Segunda corrida: "Cristales 1" bajo la Energía, botón "Infinito · +2 Cristales", clic → 3 Cristales, Arena en cero, guardado con `infinitos: 2`.
  - Migración: el guardado real puesto en `localStorage` → Continuar → 1 Cristal, Arena reiniciada, entra por Cristalización y se vuelve a guardar como versión 3.
  - La cinemática se miró congelada en 1,3 s y 2,2 s (hielo a media altura, cristales en vuelo).
- **No medí los 60 fps ni vi la cinemática en movimiento**: la ventana estaba oculta y el navegador integrado solo dibuja un cuadro por captura. Lo nuevo por cuadro es CSS (un `backdrop-filter` de saturación sobre el disco de la pila durante 1,8 s y 18 elementos con `transform`).
- Con la ventana oculta (tamaño 0) la consola muestra `<svg> attribute width: NaN` del anillo de Compresión. Sale del radio de la pila sin tamaño de canvas, código que este hito no tocó; no lo investigué.

### Decisiones (revisar)

1. **El primer Infinito es automático y los siguientes manuales.** La spec no lo dice; §12 ("Infinitos offline solo con Memoria nv4") implica que sin Memoria es a mano.
2. **Se reinician también la Energía máxima y los colores desbloqueados** ("todo lo de la Arena"). Los colores vuelven a aparecer con sus umbrales de siempre.
3. **Los Infinitos siguientes no tienen animación**: aviso "+2 Cristales" arriba, el mismo texto flotando sobre la pila y el sonido de hito. Lo vistoso queda para el pulido (C9) o C6.
4. **Se fue la pantalla final de la Capa 0** (tiempo total, compresiones, récord, "Guardá tu mandala", "Empezar de nuevo"). El botón de cámara y "Borrar partida" siguen en su lugar. Quedó sin usar `txt.foto.mandala`.
5. **Desde Cristalización no se abren Logros, Estadísticas ni Ajustes** (los íconos y las teclas son de la Arena). Falta decidir dónde van cuando haya más de una capa.
6. **Al volver de una ausencia con la Energía ya en 1e308 no se muestra "Mientras no estabas"** (igual que antes con el Infinito). El offline de la Capa 1 es de C8.
7. **`dist/` quedó compilado con la Capa 1** (por el `npm run build` de la verificación): no subirlo como demo de la Capa 0.
8. Quedan para sus hitos: la primera oferta del Relicario al llegar (C3), "???" en los sistemas cerrados y ocultar Escarcha hasta la 1.2, el logro "Primer Cristal" y la pestaña de logros de la Capa 1.

## Simulador con la Capa 0 real (2026-11-14)

`python balance/sim_capa1.py --robustez` con `balance/config.json` (la Capa 0 del juego). Tarda ~1 min.
Da **exactamente** la tabla de SPEC_CAPA1 §2 en las tres columnas (diferencia 0,00 h en todos los hitos).

| Hito | cada 15 s | cada 60 s | cada 5 min |
|---|---|---|---|
| Segundo Infinito | 1,10 h | 1,25 h | 2,25 h |
| Romper el Infinito | 2,35 h | 2,51 h | 3,54 h |
| Memoria completa | 1,64 h | 1,80 h | 2,83 h |
| Estratos | 2,26 h | 2,42 h | 3,45 h |
| Defecto Vacancia | 2,44 h | 2,60 h | 3,63 h |
| Defecto Dislocación | 4,34 h | 4,49 h | 5,53 h |
| Defecto Macla | 5,21 h | 5,37 h | 6,40 h |
| Defecto Impureza | 6,04 h | 6,20 h | 7,24 h |
| **FIN 1.1** | **6,96 h** | 7,12 h | 8,15 h |
| Defecto Fatiga | 9,43 h | 9,59 h | 10,63 h |
| Defecto Frontera | 11,89 h | 12,05 h | 13,08 h |
| Defecto Inclusión | 12,44 h | 12,60 h | 13,64 h |
| Defecto Vidrio | 13,49 h | 13,68 h | 14,74 h |
| **FIN CAPA 1** | **14,99 h** | 15,20 h | 16,27 h |

- Hueco máximo entre compras (desde 1,5 h): 32,3 min (35,0 min cada 5 min). Pesos de log V iguales a la spec (Presión 55 % / 59 %, Escarcha 26 %).
- `config.json` tiene todas las claves de `config_capa0_snapshot.json` con los mismos valores de balance; solo agrega claves nuevas (`granos_iniciales`, `punado`, `logros`, `revelado`, `fuera_de_linea.*`, `mutaciones.*.por_nivel`) y cambian los `objetivo_minutos` (metas informativas, el simulador no los lee). No hizo falta tocar `sim_capa1.py`.
- Ojo: `_load` cae al snapshot solo si falta el **archivo** `config.json`, no por clave suelta. Hoy no importa (no falta ninguna).
- En Windows `python3` es el alias de la Store y no anda: usar `python` o `py`.

## Zoom de la pila (2026-11-14)

Cosmético: no se tocó `src/core/`, `balance/` ni el worker. Tests: 139 en verde (incluido el de balance), svelte-check y tsc sin errores, `npm run build` bien.

- **Control**: barra (`input.zoom` en `App.svelte`) abajo a la derecha de la pila; rueda del mouse (y pellizco de trackpad, que llega como rueda con Ctrl); pellizco con dos dedos sobre la pila (el canvas pasó a `touch-action: none`; el segundo dedo no suelta un Puñado). Doble clic en la barra = encuadre automático. La barra aparece con la tienda y queda deshabilitada mientras la pila es tan chica que el encuadre ya es el máximo.
- **Límites**: `juego.zoom` son px CSS por celda; 0 = encuadre automático (el de siempre, que es también el mínimo y sigue a la pila cuando crece). Máximo = `PX_MAX` (28 px CSS por celda: la escala de la pila con 5 granos). La barra va en escala logarítmica entre los dos.
- **Bordes estables**: el zoom elegido siempre se redondea a un número entero de px reales por celda (`encuadre()` en `pilaVisual.ts`); solo durante la transición (~0,5 s) la escala es fraccionaria.
- **Desenfoque, en el shader** (`lienzo.ts`, sin `backdrop-filter`): `u_foco` = radio en px del círculo nítido (el tamaño de la pila encuadrada: 40 % del lado corto, o `--pila-radio-max`). Afuera, con borde suave (`smoothstep` de 1 a 1,3 radios), se lee un mip de la textura de celdas (ahora con mipmaps, que se generan solo si la pila se sale del foco) a ~8 px CSS de grano, al 30 % de luz, y se apaga hacia el borde del canvas (en móvil el canvas no llega al borde de la ventana). Fuera del foco no se calcula la arena nítida: con zoom el shader hace menos trabajo, no más.
- El anillo de Compresión y los efectos (ola, implosión) rodean el foco cuando la pila es más grande que él (`radioCss`).
- **Guardado**: `zoom` y `zoomMaxS` en la partida (opcionales; un valor raro se descarta). `juego.zoomMaxS` = segundos reales con el zoom elegido al máximo en la Compresión actual (se pone en 0 al comprimir; no cuenta el título ni la pestaña oculta). Para el logro secreto Microscopio del paso B: leer `juego.zoomMaxS`.

### Verificación

Edge headless con la GPU real de la notebook (Radeon integrada), pila llena y 3.000 granos/s, 5 s por caso:

| Ventana | Zoom mínimo | Medio | Máximo |
| --- | --- | --- | --- |
| 1366×768 | 60,3 fps (peor cuadro 20,6 ms) | 60,2 (19,0) | 60,3 (18,8) |
| 1920×1080 | 60,3 (19,9) | 60,3 (22,1) | 60,3 (21,2) |
| 390×844 emulado | 60,3 (19,7) | 60,3 (21,2) | 60,4 (18,7) |

- **Celular real: sin medir.** La fila de 390×844 es emulación en la notebook, y encima el canvas quedó en 390×296 px reales (la emulación no aplica el dpr al canvas): no dice nada de la GPU de un teléfono. Falta abrirlo en el celular y mirar los fps del panel de debug con zoom mínimo y máximo.
- Probado en la página: barra, doble clic, rueda (eventos sintéticos), guardado (`zoom 28` en `localStorage`). **El pellizco con dos dedos no se probó** (hace falta una pantalla táctil).

### Decisiones (revisar)

1. **No hay botón de pantalla completa en el juego** (se usa el del sitio, ver "Demo para publicar"), así que la barra quedó sola abajo a la derecha de la pila, pegada a la columna de la tienda; en móvil, abajo a la derecha del canvas, arriba del sismógrafo.
2. El tiempo en zoom máximo cuenta solo si el jugador eligió el máximo; al principio de una corrida el encuadre automático tiene esa misma escala y no cuenta.
3. Un zoom elegido es una escala fija: cuando la pila crece no se aleja (para eso está el automático).

## Arreglo: el halo se cortaba en líneas rectas (2026-11-14)

Solo `src/render/lienzo.ts` (shader de pantalla) y un botón de debug. La pila no cambió de lugar ni de tamaño.

- **Causa**: no era CSS ni el canvas. El bloom sale de los mipmaps de la textura de luz, que mide justo la grilla de 513×513 (el cuadrado que circunscribe la pila llena), sin margen. Fuera de la grilla `halo()` apagaba el resplandor en ~5 celdas (`enGrilla`, el arreglo de la "cruz de luz" del Pulido 3). Con la pila llena el círculo toca ese cuadrado en los cuatro ejes: el halo de una avalancha que llega al borde terminaba en una recta arriba, abajo y a los costados. El desenfoque del zoom usaba el mismo corte.
- **Arreglo**: `redondo(q, lod)` reemplaza a `enGrilla`. Fuera de la grilla se lee la fila del borde (`CLAMP_TO_EDGE`, lo que la textura tiene de margen) y cada mip del halo se apaga en forma radial alrededor del círculo de la pila, a 1,5 texeles suyos (3 celdas el mip 1, 48 el mip 5: el alcance real de cada uno). Lo mismo para la pila desenfocada del zoom. Además el halo y el desenfoque se apagan en el último 8 % antes del borde del canvas (en móvil el canvas no llega al borde de la ventana; también vale para la foto con marcos, que usa el mismo `Lienzo`).
- Fuera del foco del zoom la luz de las celdas pesa la mitad, para que un destello grande no tape la interfaz.
- Panel de debug: botón **"Avalancha grande"** (`pila.echar(RITMO_MAX)`).

### Verificación

- Edge headless 1366×768, pila llena, avalancha de 3.000 granos con cada uno de los 9 efectos, captura del borde antes y después: zoom mínimo (borde de arriba), primer paso de zoom (2 px por celda, borde izquierdo dentro del desenfoque) y zoom máximo. Antes: recta horizontal sobre la pila y recta vertical en el desenfoque. Después: degradado redondo en los 9 efectos, sin rectas. Con zoom máximo y la pila llena el borde queda fuera de pantalla: ahí solo se ve el centro.
- 60,3 fps con una avalancha grande por segundo, a zoom mínimo y máximo (peor cuadro 19,2 y 19,6 ms). 139 tests en verde, tsc y svelte-check sin errores, build bien.
- **Sin mirar**: las otras paletas (solo cambian los colores que entran al mismo shader), la foto con marcos, y un celular real.

## Fondos y logros secretos (paso B, 2026-11-14)

Cosmético: no se tocó `src/core/` (salvo los tipos de `config.ts`), `balance/` (salvo datos nuevos que `sim.py` no lee; su salida no cambió) ni el worker. 158 tests en verde (incluido el de balance), tsc y svelte-check sin errores, build bien. **Las miniaturas de lo nuevo quedan para el paso C**: los secretos usan una mini pila genérica (`escena()` en `miniPilas.ts`) y no hay ícono de galleta dibujado (el dato `icono: "galleta"` está en config).

| Archivo | Contenido |
| --- | --- |
| `balance/config.json` | `secretos`: los 16, con umbrales, `api` (nombre del logro oculto en Steam) y `recompensa` [tipo, id]. `fondos`: id → logro que lo da, en orden (`null` = de inicio). |
| `src/ui/secretos.ts` | Nuevo. Condiciones puras (sin DOM ni reloj): `capicua`, `monocromo`, `volviste`, `transicion(antes, después, zoomMaxS)` (Conmutativo, Minimalista, Microscopio, Monocromo) y la clase `Vigia` (clics, quietud, horas, Al borde, avalanchas, teclas, fotos). |
| `src/ui/logros.ts` | `Cosmetico` suma `fondo`. `PREMIOS` junta las recompensas de los 24, de los secretos y de los fondos: `desbloqueados` y `logroDe` las leen de ahí. `SECRETOS`, `premioSecreto`. `nombreLogro`/`descLogro` también para secretos. |
| `src/ui/juego.svelte.ts` | `vigia`, `ganarSecreto` (anota en `juego.logros` y avisa una vez), `tocarLogo`, la lluvia (`juego.lluvia`), escuchas globales de toques, rueda y teclas. `transicion` después de cada cuadro normal (no en saltos fuera de línea) y al comprimir a mano. Volviste al cargar (`guardadoEn` de hace 7 días o más). |
| `src/guardado/guardado.ts` | `secretos?: { capturas, horas }` opcional (sin cambio de versión: un guardado de antes no lo tiene y arranca en cero); se valida (enteros, horas en 24 bits). |
| `src/render/lienzo.ts` | `fondoEn()` en el shader de pantalla: Noche, Arena seca, Papel milimetrado, Desierto de noche, Fractal (la pila llena en una textura R8 aparte, muy tenue), Hielo (Voronoi), Aurora (quieta con Reducir destellos) y Vacío. Efectos 9–13: Rayo, Lupa, Arcoíris vivo, Estela espejo, Estela horizonte. |
| `src/render/paletas.ts`, `marcos.ts` | Paletas Papel viejo, Todo Ámbar, Simetría; marcos Galleta, Polaroid, Arena dorada, Exponent; `FONDOS` (de config). |
| `src/ui/Opciones.svelte` | Aspecto suma **Fondo** (mismo sistema: "En uso", candado con el logro; un secreto sin conseguir dice "Logro: secreto"). Créditos suma "Estudio" con el logo de Exponent (logro «e»). |
| `src/ui/Logros.svelte` | Pestaña **Secretos** después de las capas: "???" con la pista en cursiva; conseguido, nombre, descripción, miniatura y recompensa. |
| `src/ui/Pila.svelte`, `Tienda.svelte`, `foto.svelte.ts` | Clics (todos, aunque el Puñado tenga tope), avalanchas, fondo elegido, la lluvia (80 granos de CSS de un color al azar de la paleta en uso, 10 s, no se muestra con Reducir destellos); compra manual (cada fila y "Comprar todo"); fotos. |
| `tests/secretos.test.ts` | Nuevo: datos (16, textos en los dos idiomas, nombres de Steam únicos, recompensas existentes y sin repetir, fondos coherentes) y la condición de cada secreto, incluido que Capicúa no cuenta con autocompradores. `tests/guardado.test.ts`: los contadores. |

### Verificación

- En el navegador (1024×768): «arena» y «sand» con teclas reales (logro, lluvia, Ajustes abierto por la A se cierra solo); Konami (la A final no abre Ajustes); 10 clics reales en 110 ms contados todos; logo de Exponent en Créditos; Capicúa con un clic real en Caudal (2·1·0·1·2) y su notificación; la pestaña Secretos (ocultos con pista, conseguidos con recompensa) en escritorio y en 375×812; las tarjetas de Fondo, efectos y marcos nuevos; los 8 fondos detrás de la pila; los contadores y logros siguen después de recargar.
- **60,3 fps** con Noche, Hielo, Aurora y Fractal (1024×768, dpr 1,25, pila chica). Sin medir con la pila llena ni en un celular real.
- No probados en vivo (solo con tests): Paciencia (10 min), Insomnio (24 h), Volviste (7 días), Al borde, Microscopio, Minimalista, Monocromo, Conmutativo, Tormenta, 1987, Fotógrafo (111 fotos).
- De paso: los íconos de recompensa de Logros (marco, efecto) salían como un círculo negro relleno (sin `stroke`): arreglado. En móvil las pestañas de las pantallas completas ya no dejan 1,5 rem entre filas (con Secretos eran tres filas).

### Decisiones (revisar)

1. **Ids**: `anio1987` (1987) y `firma` («e»), porque una clave que empieza con número o de una letra es incómoda. Los nombres que se ven son los pedidos.
2. **Ya existía un efecto "Arcoíris"** (récord de 1.000.000): el de Konami se llama **Arcoíris vivo** (el tono gira con el tiempo y el ángulo). **"Estelas"** no era una categoría: Espejo y Horizonte son efectos de avalancha con estela larga (×3), en la misma lista.
3. **Volviste usa `guardadoEn`** (el guardado ya trae cuándo se cerró la pestaña); no hizo falta guardar "último día abierto" aparte.
4. **Microscopio**: segundos con el zoom al máximo elegido ≥ tiempo de la corrida − 3 s (`margen_s`). El tiempo de corrida es de juego: con velocidad de debug o fuera de línea no se puede.
5. **Paciencia**: cuenta con la pila sin título ni paneles encima; un hueco de más de 1 s entre cuadros (pestaña oculta) reinicia. **Insomnio** marca la hora en cada cuadro del juego (pestaña visible, fuera del título).
6. **Tormenta perfecta**: contra el promedio de las avalanchas de un grano de la corrida (las mismas del récord), desde 100 avalanchas (`muestras_min`).
7. **Los textos de los secretos llevan los números escritos** (50, 10 min, 111…): si cambia un umbral en config hay que cambiar el texto.
8. **Logo de Exponent y marco Exponent**: marca de texto «eˣ» provisoria (no hay archivo del logo). Hielo (Capa 1) queda bloqueado con "Logro: Primer Cristal" (`cristal` en `txt.logros.lista`).
9. La foto del mandala sigue con fondo Noche (no lleva el fondo elegido).
