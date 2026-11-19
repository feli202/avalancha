# Progreso

Estado (2026-11-18): **Capa 1 hasta C14 (pulido de la 1.2 hecho; falta la auditoría y publicar)**. **hitos 0, 1, 2a, 2b, 3 y 4 terminados** (proyecto base, núcleo económico, pila visual, efectos de la pila, interfaz principal, Compresión y sistemas tardíos), **Pulido 1** (estilo Arena) y **Pulidos 2, 3 y 4** (rediseño de la interfaz, borde circular, paleta invertida de la pila, supermuestreo). **Hito 5** terminado: 5a (guardado base y progreso fuera de línea) y 5b (exportar/importar, ajustes, estadísticas, logros, teclado). **Rediseño de Logros, Estadísticas y Ajustes**: las tres son pantallas completas (Ajustes: aspecto con vistas previas, juego, partida y teclado) (Logros: 24 logros, mini pilas y recompensas cosméticas; Estadísticas: desglose de la producción, corridas, avalanchas y general). **Hito 6** (pulido técnico): sonido, móvil y tablet, accesibilidad (Lighthouse 100) y rendimiento (60 fps en GPU integrada). **Primeros 10 segundos**: pantalla de título, logo y primera avalancha con el primer toque. **Guardar imagen**: PNG de 2048×2048 de la pila (botón de cámara, tecla P, "Guardá tu mandala" en el Infinito). **Sonido sintetizado**: todo el audio generado por código con Web Audio (sin archivos), con música generativa. **Guías**: indicadores de sistema nuevo, tooltips y la pantalla "Cómo funciona". La Capa 0 está completa. **Clips verticales** para redes en `marketing/clips/` (modo grabación del panel de debug).

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

**Hito actual: C13 terminado el 2026-11-18 (fin de la capa, test completo y logros de la 1.2). Sigue C14. Antes: C8 terminado el 2026-11-17 (test de balance de la 1.1 en verde con el núcleo real; ver C8 al final). Sigue C9. C7 terminado el 2026-11-16 (ver abajo; falta medir fps con los Defectos). C5: falta probarlo en un celular de verdad.**

## Correcciones de la Capa 1 (9 sesiones)

Lista en `correcciones-capa1/correcciones-capa1/CORRECCIONES_CAPA1.md` (13 bloques); prompts en `PROMPTS.md` de la misma carpeta. Ese archivo manda sobre `SPEC_CAPA1.md` donde se contradigan. Los hitos C6–C14 siguen después.

- [x] Sesión 1 — bloques 1 a 4: antiparpadeo, sonido, bug del AUTO, guías una sola vez (2026-11-15; falta que lo revises jugando: ver abajo)
- [x] Sesión 2 — bloques 5 y 6: balance de Estratos y Red (2026-11-16; el Relicario como inventario solo en el simulador, el núcleo va en la sesión 5)
- [x] Sesión 3 — bloque 13: estética de cristal y escarcha, barra lateral (2026-11-16)
- [x] Sesión 4 — bloque 7: multiplicadores visibles (2026-11-16)
- [x] Sesión 5 — bloque 8: Relicario como inventario (2026-11-16)
- [x] Sesión 6 — bloque 9: la Red (terminó plana en SVG; ver más abajo) (2026-11-16)
- [x] Sesión 7 — bloque 11: Estratos en 2D, el embudo (2026-11-16)
- [x] Sesión 8 — bloque 10: panel de Automatización (2026-11-16)
- [x] Sesión 9 — bloque 12 (guías nuevas) y cierre (2026-11-16)

### Sesión 9 (2026-11-16) — bloque 12: guías nuevas, y cierre

**Guías de la Capa 1.** Mismo sistema que las de la Capa 0 (bloque 4): un id en `juego.vistos` (va al guardado), el indicador que señala algo con una frase, y su página en "Cómo funciona" (?) con la fórmula y los valores actuales.

| Guía | Sale | Señala |
| --- | --- | --- |
| `c1_cristales` | al tocar "Seguir" en la presentación | el contador de Cristales |
| `c1_relicario` / `c1_red` | la primera vez que mirás esa pantalla | su pestaña |
| `c1_estratos` | la primera vez que mirás Estratos **ya abiertos** (antes no: no habría nada que explicar) | su pestaña |
| `c1_automat` | la primera vez que entrás a Automatización | su botón de la barra lateral |
| `c1_defectos`, `c1_escarcha` | nunca todavía: texto provisorio y página cerrada (??? con candado) hasta C7 y C10 | — |

- `src/ui/juego.svelte.ts`: las condiciones de arriba en `condiciones()`; `esGuiaCapa1`. Un aviso sin frase ya no deja un `juego.aviso` vacío.
- `src/ui/Ayuda.svelte`: **arreglo necesario**: el indicador no salía nunca fuera de la Arena (`hayPanel()` es verdadero en cualquier otra capa). Ahora cada guía se muestra en su lugar (`guiaEnSuLugar`): las de la Arena con la Arena al frente; las de cada pantalla de la Capa 1, solo con esa pantalla al frente (si quedó en cola, espera: en la primera tanda de capturas la de Estratos salía estando en el Relicario). `cerrar` saca la que se mostró (antes, la primera de la cola). Color hielo por defecto para las de la Capa 1.
- `src/ui/Capas.svelte`: `data-guia` en el contador, las pestañas y el botón de Automatización.
- `src/ui/ComoFunciona.svelte`: siete secciones nuevas (aparecen con el primer Infinito), en color hielo: Cristales (`⌊10^(mult + 0,35)⌋` y el multiplicador de la Red), Red (anillo, costo por anillo, regla de apertura, nodos completos), Relicario (efecto por nivel de cada tipo con lo engarzado ahora, fusión, engarces), Estratos (Presión con ×10^(P × D), velocidad local del estrato 1, llenado al abrir y el próximo estrato), Automatización (intervalo mínimo, Memoria, Infinito automático), Defectos y Escarcha (cerradas). Las reglas sin valor no dibujan un renglón vacío.
- `src/strings/es.ts`, `en.ts`: textos de las guías, las páginas y las piezas de las fórmulas.
- `tests/juego.test.ts`: test nuevo: recorriendo todas las pantallas salen las cinco, en orden y una vez; otra vuelta y un Infinito no traen ninguna; Defectos y Escarcha siguen cerradas; una guía en cola no sale en otra pantalla.
- **Partidas de antes**: la migración del bloque 4 ya corrió (`vistos.guias`), así que un jugador que ya estaba en la Capa 1 ve cada guía nueva una vez, al volver a mirar cada pantalla. Me pareció mejor que darlas por vistas sin que las haya leído nunca.

**Probado en el navegador integrado** (partida nueva, debug "casi Infinito" a ×10, cinemática real): Cristales al tocar Seguir → Relicario → (elegí Cauce) Red → Estratos cerrados: nada → Automatización → nodo Estratos puesto por consola → Estratos. Cada una salió una vez, señalando lo suyo. En 390×844 la frase queda arriba de la pestaña, sobre fondo oscuro. "Cómo funciona" con las siete secciones nuevas y sus fórmulas, sin errores en la consola.

**Cierre ("Al terminar todo")**

1. `python balance/sim_capa1.py --robustez`: **la misma tabla de la sesión 2** (el balance no cambió desde entonces). Afiné en `SPEC_CAPA1.md` §2 los decimales de "abrir un estrato" (E3 ×1e13,2 · E4 ×1e16,4 · E5 ×1e18,7 · E6 ×1e39,5 · E7 ×1e71,8).

| Hito | 15 s | 60 s | 5 min | Rango |
|---|---|---|---|---|
| Segundo Infinito | 1,10 h | 1,25 | 2,25 | 1,0–1,3 |
| **FIN 1.1** | **7,30 h** | 7,45 | 8,49 | 6,5–7,5 |
| **FIN CAPA 1** | **14,82 h** | 15,04 | 16,09 | 14–16 |
| Hueco máximo | 30,6 min | 30,8 | 35,0 | < 40 |

2. `SPEC_CAPA1.md` al día con las correcciones: §1 (Estratos en 2D, Automatización fuera de la Red), §5 (sin porcentajes, cómo se ve el Relicario, ya no dice que el inventario es de la Capa 2), §6.1 (la Red plana en SVG, sorpresa, zoom), §7.4 reescrito (el embudo 2D; three.js ya no está), §11 (barra de capas, panel de Automatización, estética de hielo, Reducir destellos, sonido, multiplicadores, pantallas sin scroll, guías), §14–16.
3. **Tests**: 242 en verde (18 archivos, incluido `balance.test.ts` de la Capa 0), `tsc` y `svelte-check` sin errores. `tests/balance_capa1.test.ts` **no existe todavía**: es del hito C8 (SPEC_CAPA1 §17), no de las correcciones.
4. Capturas en `correcciones-capa1/capturas_despues/cierre/` (Arena con la barra lateral, Red, Estratos, Relicario, Defectos, Automatización; 1366×768 y 390×844), con `scripts/capturas-capa1.mjs` (ahora da las guías de la Capa 1 por vistas, para que no tapen las capturas).


**Bloque 1 — antiparpadeo**

- Ajuste nuevo `calma` (`ajustes.svelte.ts`), **prendido por defecto**: es el "Reducir destellos" de Ajustes → Juego. Los ajustes guardados de antes no lo tienen, así que les queda prendido.
- **Decisión (revisar):** el "Reducir destellos" que ya existía apaga los destellos de la pila y el zoom de cámara; prenderlo por defecto le sacaba el espectáculo a la pila, contra lo que pide el bloque. Quedó como opción aparte, con otro nombre: **"Reducir movimiento"** (misma clave `reducirDestellos`, mismo valor guardado, sigue arrancando con `prefers-reduced-motion`).
- Qué parpadeaba: el costo de cada fila pasa de apagado a su color cuando alcanza la Energía, y el autocomprador la gasta una vez por segundo. Con `calma`, la fila que se compra sola (autocomprador prendido; Cascada con Memoria nv2, Mutaciones con nv3) deja el costo apagado y fijo (`.fila.sola` en `Tienda.svelte`). Las filas a mano se siguen encendiendo.
- Números a 10 Hz: `juego.ver` es el estado que muestran la tienda y los contadores de la Arena; un efecto de `App.svelte` lo copia de `juego.s` cada 100 ms como mucho. La economía, la pila y los clics siguen usando `juego.s`. Con la opción apagada, cada cuadro como antes.
- No había destello ni pulso por compra en la interfaz (solo ese cambio de color). La pila no se tocó.
- Probado en el navegador integrado con los cinco autocompradores andando (Compresión 12): 0 cambios de color en las filas en 5 s; la opción aparece en Ajustes → Juego prendida. **No medido a 60 fps:** el navegador integrado iba a ~7–16 cuadros por segundo, así que el tope de 10 Hz se ve en el código y no en una medida. "Transición suave" de los números = menos refrescos y cifras tabulares; no hay interpolación entre valores.

**Bloque 2 — sonido sin amontonarse**

- `src/ui/limite.ts` (nuevo, puro, con `tests/limite.test.ts`): `crearLimite(4, 80)` (como mucho 4 sonidos a la vez, el mismo no se repite antes de 80 ms, el que sobra se descarta) y `crearAtenuador` (derrumbes seguidos). `sonido.ts` los usa en `compra`, `hito` y `compresion`, y en el volumen de cada derrumbe: hasta 3 por segundo suenan enteros; con más, cada uno baja para que el total no crezca.
- **Lo automático no suena.** Las compras automáticas ya no sonaban, pero sí sus consecuencias: el acorde del hito ×4 de un color (salía de mirar los niveles en `Pila.svelte`) ahora suena solo desde el clic (`Tienda.svelte`), y la implosión de la Compresión y el acorde del Infinito suenan solo si se hicieron a mano (`juego.aMano`). La animación de la Compresión automática sigue igual.
- "Comprar todo" (botón y tecla M) no sonaba nunca: ahora suena una vez. "Máx" ya sonaba una vez.
- **Decisiones (revisar):** (1) el tope de 4 es para compras, acordes e implosión; los derrumbes de la pila siguen con sus 12 voces de SPEC 6.7 más el atenuador (si contaran en los 4, una compra casi nunca sonaría). (2) Anillos y color nuevo siguen sonando aunque lleguen solos: son de la pila, no compras; el límite evita que se encimen. (3) La Compresión automática quedó muda: es un cambio para el jugador de la Capa 0, que antes la escuchaba.
- Probado en el navegador integrado contando osciladores de Web Audio (no se puede escuchar desde acá): 5 s con los cinco autocompradores y la Compresión automática andando → solo la música de fondo; "Comprar todo" → una campana; 5 clics seguidos en una fila → una campana. **Falta escucharlo con oídos**, sobre todo el volumen de los derrumbes con la pila llena.

**Bloque 3 — el "auto" no aparecía con Memoria**

- Causa: la regla estaba escrita cuatro veces. La economía (`autoActivo`) contaba Memoria nv1; la tienda mostraba el interruptor según `juego.vistos.auto_*`, que salía de `compresiones >= n` (igual que el logro Piloto automático y la tabla de "Cómo funciona").
- Ahora hay una sola: `autoDisponible(s, clave)` en `src/core/compress.ts` (compresiones o Memoria nv1). `autoActivo` = disponible y prendido. La usan `tick`, el interruptor de cada fila (`Tienda.svelte`), la casilla de Compresión automática (`App.svelte`), el revelado, el logro y "Cómo funciona". El interruptor ya no depende de `vistos`.
- Test en `tests/red.test.ts`: con Memoria nv1, recién hecho el Infinito y sin ninguna Compresión, todos los autocompradores están disponibles y activos; apagado sigue a la vista pero no compra.
- Probado en el navegador integrado repitiendo la captura 05 (partida nueva, "Infinito ya" de debug, Memoria nv1, vuelta a la Arena): Caudal, Ámbar, Coral y Jade muestran "auto" prendido.

**Bloque 4 — guías: una sola vez**

- Cómo estaba: cada guía ya se anotaba en `vistos` (va en el guardado) y no volvía, **salvo la de los autocompradores**, que salía de nuevo con cada grupo que llegaba (Caudal, después Ámbar y Coral, después Jade y Violeta…) y, con el bloque 3, habría vuelto al comprar Memoria. No encontré otra guía que se repitiera por hacer un Infinito; en una partida con Infinitos hechos con debug, lo que aparece en cada corrida son guías de cosas que esa partida nunca había mostrado.
- Ahora la guía de los autocompradores tiene su id (`vistos.auto`): sale con el primero y nunca más. Las demás siguen con el id de su sistema (`tienda`, `color0`…`color3`, `anillos`, `compresion`, `cascada`, `mutaciones`, `auto_compresion_auto`). Todo en `revelar()` (`juego.svelte.ts`).
- **Migración** (`yaVisto`, al cargar, una sola vez; la marca es `vistos.guias`): da por vistas, sin mostrarlas, las guías de todo lo que el jugador ya tiene (lo que cumple su condición en ese momento, y la de los autocompradores si ya tenía alguno). No cambió la versión del guardado: `vistos` es un mapa abierto.
- Releerlas: "Cómo funciona" (?) ya abre la sección de cada sistema visto; no hubo que tocarlo.
- Tests en `tests/juego.test.ts` (2): la guía de los autocompradores sale una vez y recorrer de nuevo las 17 compresiones después de un Infinito no muestra ninguna; la migración.
- Probado en el navegador integrado: el guardado de la prueba del bloque 3 se migró al cargar (`guias` y `auto` en `vistos`); después, cuatro Infinitos seguidos con debug a ×10: en los dos primeros salieron Mutaciones y Violeta (nunca vistas en esa partida), en los dos siguientes ninguna.
- **Decisión (revisar):** la frase de arriba ("Autocompradores de Ámbar y Coral: compran solos…") sigue saliendo una vez por autocomprador nuevo; lo que quedó en una sola vez es el indicador que señala el interruptor.

**Cierre de la sesión 1:** 200 tests, `tsc` y `svelte-check` en verde. No se tocó el balance (`balance/`, `SPEC_CAPA1.md`, `config_capa1.json`). Las capturas de `correcciones-capa1/correcciones-capa1/capturas/` de las otras sesiones (01–04, 06–08) no las miré: solo la 05.

### Sesión 2 (2026-11-16) — balance: Estratos que destraban y una mecánica por nodo

Orden seguido: simulador → calibración con `tune.py` → tabla aprobada → `config_capa1.json` → `SPEC_CAPA1.md` (§2, §4, §6, §7) → núcleo.

**Tabla nueva** (`python balance/sim_capa1.py --robustez`):

| Hito | 15 s | 60 s | 5 min | Rango |
|---|---|---|---|---|
| Segundo Infinito | 1,10 h | 1,25 | 2,25 | 1,0–1,3 |
| Memoria completa | 1,64 h | 1,80 | 2,83 | |
| Estratos | 2,26 h | 2,42 | 3,45 | |
| Romper el Infinito | 2,34 h | 2,50 | 3,53 | |
| Vacancia / Dislocación / Macla / Impureza | 2,41 / 3,53 / 4,52 / 5,52 h | | | |
| **FIN 1.1** | **7,30 h** | 7,45 | 8,49 | 6,5–7,5 |
| Fatiga / Frontera / Inclusión / Vidrio | 9,70 / 12,21 / 12,81 / 13,82 h | | | |
| **FIN CAPA 1** | **14,82 h** | 15,04 | 16,09 | 14–16 |
| Hueco máximo | 30,6 min | 30,8 | 35,0 | < 40 |

Peso al final de la 1.2: Presión 43 %, Escarcha 41 %, Colores 7 % (antes 59 / 26 / 6).

**Abrir un estrato** (×producción en el momento, `10^(D × Presión que suma)`): E1 ×1e2,3 · E2 ×1e6,3 · E3 ×1e13 · E4 ×1e16 · E5 ×1e19 · E6 ×1e40 · E7 ×1e72 · E8 ×1e103. Mínimo pedido ×100: lo cumple el primero con ×200. El simulador lo imprime en cada corrida.

**Qué cambió**

- Estratos (bloque 5): al abrirse se llenan de golpe (`s_1 = 25`, `s_k = s_(k−1) − separación`); el de abajo empuja al de arriba `× (1 + 0,003 × s_(k+1))`. Recalibrado: `w_base` 0,009 → 0,03, `γ` 0,0013 → 0,00042. Costos de apertura sin cambios. Se sacó `capacidad_log10` (no hacía nada).
- Red (bloque 6): Inercia = Impulso (sube los primeros 10 min de cada Infinito; `tiempoInfinito` nuevo en el estado, no se reinicia con la Compresión); Capilaridad = separación 1,75…1; Sedimento II = peso `k^1,05…1,2`; Abismo = ×1,1…1,4 a los estratos en su tope (el 1 cuenta siempre como lleno); Cristalografía II = ×10^(0,125…0,5 × Defectos completos); Compactación II = +0,0001…0,0004 de Densidad por anillo; Eco II = crecimiento de la Escarcha × (1 + 0,001…0,004 × log10 Cristales totales); Sedimentación nv4 conserva la Cascada (ni Compresión ni Infinito la reinician).
- Tooltips de los 25 nodos (es y en) en una frase sobre qué cambia en el juego.
- Relicario (bloque 8, solo números, en el simulador): el jugador elige el tipo, 3 iguales se fusionan, se equipan las mejores piezas y dos del mismo tipo se suman.
- Bot: el primer Infinito no tenía la Energía máxima cargada y elegía Cascada como primera reliquia (segundo Infinito a 2,1 h). Arreglado.
- `ref_estratos.py` corre la Arena del simulador sin Energía (antes hacía decenas de Infinitos en 600 s y eso reiniciaba el Impulso) y tiene un caso nuevo con los nodos del anillo 3.

**Verificación**: 204 tests en verde (balance de la Capa 0 incluido; `balance_capa1.test.ts` todavía no existe, es C8), `tsc` y `svelte-check` sin errores. En el navegador integrado: abrir E1 y E2 con Presión nv4 llenó 25 y 23 y subió la producción ×10^4,7 y ×10^8,7; la pantalla de Estratos muestra el estrato 1 con 1,07e25 granos; los tooltips se leen bien. No medí fps (no se tocó nada visual).

**Decisiones (revisar)**

1. **Empuje 0,003, no 0,1.** Con 0,1 la cadena crece sin control (fin de la capa a las 3 h, Presión 91 %).
2. **Compactación II y Eco II diez y cincuenta veces más chicos** que en el bloque: con esos valores la 1.2 duraba menos de una hora.
3. **Fusionar reliquias resta** con efecto `(n+1)` por pieza y piezas repetidas que se suman: 3 Ámbar equipadas valen 3, una Coral vale 2. El bot fusiona siempre. Con "una por tipo" el fin da 15,5 h (también en rango). Hay que decidir la regla en la sesión 5.
4. **Inercia casi no rinde**: las corridas del bot duran 12–25 s, así que el Impulso llega a ×1,03.
5. **El bot elige siempre Cauce** (ya no hay ofertas al azar): Cauce pesa 5 % al final de la 1.1.
6. **Cristalografía II no suma nada todavía**: los Defectos llegan en C7 (`defectosCompletos` devuelve 0). Eco II no tiene dónde actuar hasta la Escarcha (C10).
7. **El núcleo del Relicario no se tocó** (ofertas con semilla, como en C3): el inventario es la sesión 5. El tooltip de Engarces II ya describe la fusión automática.
8. En el navegador integrado quedó la partida de prueba con Cristales y nodos puestos a mano.

### Sesión 8 (2026-11-16) — bloque 10: panel de Automatización

Balance sin cambios: con los valores por defecto (cada 1 s, máx, comprimir al llegar, Infinito apenas llega) el núcleo hace exactamente lo de antes. `tests/balance.test.ts` da lo mismo. Entró `automatizacion.intervalo_s: 1` en `balance/config.json` (el intervalo base y mínimo; antes era un `1` escrito en `tick.ts`). `sim.py` y `sim_capa1.py` no cambian (compran en cada paso).

| Archivo | Contenido |
| --- | --- |
| `src/core/state.ts` | `automat`: `intervalo` y `cantidad` (×1 / ×10 / máx = 0) por autocomprador de compras, `compresion` (al llegar al umbral / esperar X s más), `infinito` (apenas llega / al llegar a X Cristales, X en log10), el reloj `segundos` y la `espera` de la Compresión. `COMPRAS_AUTO` y `AUTOS` (todos los interruptores, en el orden del panel). `auto` suma `cascada`, `mutaciones` e `infinito`. |
| `src/core/compress.ts` | `autoDisponible` sabe de Cascada, Mutaciones e Infinito (Memoria nv2, nv3, nv4): una sola regla para la economía, la tienda y el panel. `encenderTodo(s, si)`: solo los que el jugador tiene. |
| `src/core/tick.ts` | Cada autocomprador dispara cada `intervalo` (múltiplos del intervalo base) y compra su cantidad; Cascada y Mutaciones con su interruptor (antes, siempre con la Memoria). `comprimirSola` con la espera. El Infinito automático respeta el interruptor y `infinitoAutoListo`. |
| `src/core/infinito.ts` | `infinitoRoto` (Ruptura nv1) e `infinitoAutoListo`: siempre apenas llega; "al llegar a X Cristales" solo cuenta con Romper el Infinito. El Infinito conserva `automat` (como `auto`). |
| `src/guardado/guardado.ts` | `leerAutomat`: modos que existen, intervalos ≥ el mínimo y enteros, cantidades 0/1/10, nada negativo. Un guardado de antes arranca con todo prendido y los valores por defecto (sin cambio de versión). |
| `src/ui/Automatizacion.svelte` | Nuevo. Encabezado con "Encender todo" / "Apagar todo"; a la izquierda las compras (Caudal, cuatro colores, Cascada, Mutaciones: intervalo, ×1/×10/máx, interruptor), a la derecha Compresión (condición) e Infinito (modo, "hoy el Infinito da X" y la regla de reliquias completa del bloque 8: los 5 modos, el orden para Fijo/Prioridad, fusionar solas y engarzar las mejores). Se ven los que el jugador tiene y el siguiente como silueta con lo que lo desbloquea. Pantalla fija: solo scrollea cada lista. |
| `src/ui/Capas.svelte` | Entrada **Automatización** en la barra lateral (abajo, separada por una línea, dos engranajes). Pestañas: **Relicario primero**. En el celular el contenido empieza debajo de la fila de íconos. |
| `src/ui/App.svelte` | **La fila de íconos (foto, logros, estadísticas, ajustes, ayuda) está en todas las capas**: salió de `.juego` (que queda inert fuera de la Arena) a un contenedor propio por encima de Cristalización; las teclas L, E, A, P, H también andan desde cualquier capa. |
| `src/ui/Tienda.svelte` | Cascada y las Mutaciones tienen su interruptor como las demás filas; apagado dice "manual" (antes "auto" apagado). |
| `src/ui/Relicario.svelte` | Sin la regla provisoria: queda "Elección automática: <modo>", que lleva a Automatización. |
| `tests/automatizacion.test.ts` | Nuevo, 18 tests: cada interruptor apagado deja de comprar lo suyo, Memoria nv2/3/4, Encender/Apagar todo, intervalo, ×1/×10/máx (también Cascada y Mutaciones), Compresión al llegar / esperar / apagada, Infinito apenas llega / apagado / al llegar a X Cristales solo con Ruptura, cada regla de reliquias aplicada por el Infinito automático (fijo, rotar, completar, subir, prioridad, fusionar solas, engarzar las mejores), guardado y limpieza. |
| `scripts/capturas-capa1.mjs` | Suma Automatización y la prueba de apagar Caudal (la tienda dice "manual"). Capturas en `correcciones-capa1/capturas_despues/bloque10/` (sin commitear, como el resto de esa carpeta). |

**Verificación**: 241 tests en verde (balance de la Capa 0 incluido), `tsc` y `svelte-check` sin errores. Edge headless con el servidor de desarrollo, en 1366×768 y 390×844: la página no scrollea (en el celular solo las dos listas), sin errores en la consola; apagar Caudal con su interruptor deja la fila de la tienda en "manual" y `s.auto.caudal = false`. **Sin mirar**: fps (la pantalla es DOM quieto, sin animación propia), un celular real, inglés en pantalla.

**Decisiones (revisar)**

1. **Estética neutra** (pedido durante la sesión: no hielo): como la barra de capas, fondo de la página y líneas de 1 px. Cada fila lleva el detalle de lo que automatiza: los de la Arena su color (raya, interruptor, cantidad elegida) y su ícono; el Infinito, el cristal y la luz fría de la Cristalización.
2. **Infinito automático** (pedido durante la sesión): siempre apenas llegás; con Romper el Infinito se mejora y suma "al llegar a X Cristales". Se fue "cada X minutos". Romper todavía no cambia la economía (C6), pero el nodo Ruptura ya existe y la mejora ya se ve.
3. **Automatización vive en la barra lateral**, que aparece con el primer Infinito. Antes del Infinito los autocompradores se siguen manejando desde la tienda.
4. **Intervalo mínimo = 1 s** (el de siempre): el jugador lo puede alargar, no acortar. ×10 compra solo si alcanzan los diez, como el modo ×10 de la tienda. En Cascada y Mutaciones la cantidad cuenta compras (las Mutaciones, entre las cuatro).
5. **"Esperar más" de la Compresión** cuenta desde que se llega al umbral; si la Energía baja del umbral, la espera vuelve a 0.
6. "Al llegar a X Cristales" se guarda en log10 (CLAUDE.md); se escribe "1000" o "1e6".

### Sesión 5 (2026-11-16) — bloque 8: el Relicario como inventario

Balance sin cambios: el simulador ya modelaba el inventario desde la sesión 2 (piezas en base 3, engarzar las mejores, dos del mismo tipo se suman). `python balance/sim_capa1.py` da la misma tabla (FIN 1.1 7,30 h, FIN CAPA 1 14,82 h). De `config_capa1.json` salieron `ofertas_por_infinito`, `semilla` y `engarces.ofertas` (el simulador no los leía) y entró `relicario.casilleros: 24`.

| Archivo | Contenido |
| --- | --- |
| `src/core/relicario.ts` | Reescrito. Piezas `{id, tipo, nivel, foto, inf}`. `elegir(s, tipo)` (la pieza nace Ámbar con la pila del Infinito pendiente), `fusionables`, `fusionar` (3 iguales → nivel + 1, pila de la más vieja, hereda el engarce), `fusionarTodo` (en cadena), `equipar`/`desequipar` por id, `equiparMejores`, `tipoAutomatico` (las 5 reglas), `elegirSola`, `conFoto` (la interfaz pone la pila; el núcleo no la ve), efectos sumando las engarzadas, `migrarRelicario`. Sin azar: se fue la semilla. |
| `src/core/state.ts` | `relicario: { piezas, equipadas (ids), pendiente, foto, ultimo, regla }`, tipos `Pieza` y `Regla`. |
| `src/core/infinito.ts` | El Infinito deja la reliquia esperando su tipo (`foto: ''` hasta que la interfaz la pone). |
| `src/guardado/guardado.ts` | `leerRelicario`: valida piezas (tipo existente, id único, nivel ≤ 60, foto de 256 bytes en base64 o vacía), engarzadas que existan y entren, regla. **Migración**: un Relicario viejo (cantidad por tipo + tipos engarzados) pasa a piezas fusionadas (los dígitos en base 3 de cada cantidad) y cada tipo que estaba engarzado engarza su mejor pieza, que es justo el nivel `floor(log3(n))` del efecto viejo: mismo poder. Sin cambio de versión (sigue en 3). |
| `src/render/instantanea.ts` | Nuevo, puro. `instantanea(alturas, radio)`: la pila en 32×32 celdas de 2 bits (muestrea el círculo de la pila: una chica se agranda, una grande se lee de a saltos). `desdeFoto` la vuelve pila para el `Lienzo`. |
| `src/render/miniPilas.ts` | Escena `rel:<color>:<foto>` en el generador compartido (un solo `Lienzo`, imágenes en caché y en cola): la pila teñida con el color del nivel (mismo orden de brillo que la arena). Sin foto (reliquias migradas), una pila genérica. Acción `caraReliquia` (un cuadrado del centro). |
| `src/ui/juego.svelte.ts` | `fotoPila()` desde `camara.foto()`; una instantánea por segundo antes de los pasos (por si llega un Infinito automático) y una justo en `infinitoYa`. El aviso de "elegida sola" usa `ultimo`. |
| `src/ui/Relicario.svelte` | Reescrito: elegir el tipo (la cara de la nueva, tres gemas, cuánto falta para fusionar, cuenta de 30 s); Engarces hexagonales con la cara y el total de efectos; grilla de 8 (6 en el celular) con caras, sello de tipo en la esquina, "+1", cristal de engarzada, brillo en las que se pueden fusionar; ficha de la elegida (efecto, de qué Infinito es, Engarzar/Quitar, Fusionar); "Fusionar todo"; arrastrar a un engarce o sobre otra igual. Fusión animada: las tres vuelan al casillero de la nueva y nace con un destello. **Regla automática provisoria** en un desplegable (modo, orden para Fijo/Prioridad, las dos opciones). |
| `src/strings/es.ts`, `en.ts` | Textos nuevos; Engarces ya no habla de ofertas. |
| `tests/relicario.test.ts` | Reescrito, 17 tests: elegir, foto (también la del Infinito automático), fusión (pila de la más vieja, otro tipo/nivel no, hereda el engarce, en cadena, automática solo con Engarces II y la opción), engarces, efectos por nivel y suma de iguales, equipar las mejores, las 5 reglas, Infinito automático con la regla, guardado (limpieza), migración sin perder poder, guardado de antes del Relicario, instantánea. `desglose.test.ts` usa `migrarRelicario`. |
| `scripts/capturas-capa1.mjs` | Reliquias de prueba con pilas abelianas de verdad. Capturas en `correcciones-capa1/capturas_despues/bloque8/` (el "antes" es `01_relicario_actual_MAL.png`). |
| `SPEC_CAPA1.md` | §5 sin ofertas: inventario, fusión, elección automática, engarces que se suman. |

**Verificación**: 222 tests en verde (balance de la Capa 0 incluido), `tsc` y `svelte-check` sin errores. Edge headless (CDP) con el servidor de desarrollo: partida nueva, cinco Infinitos con "Infinito ya" y la pila a distintos granos, eligiendo el tipo con las gemas; cada reliquia con su pila distinta; tres Cauce Ámbar → una Coral con la pila del Infinito 1 (capturada a mitad de la animación), engarzada tocándola; el total de efectos cambia. 60,5 fps en el Relicario con el inventario lleno en 1366×800 y 60,4 en 390×844 (peor cuadro 17 ms). En el navegador integrado (oculto, a 1 fps) se vio la elección con la cara de la pila. **Sin mirar**: arrastrar con un mouse real (solo eventos simulados en la sesión C3; esta vez se probó tocando), un celular real, la migración con una partida vieja real (solo con tests), inglés en pantalla.

**Decisiones (revisar)**

1. **Regla automática provisoria dentro del Relicario** (desplegable "Elección automática"), hasta el panel de Automatización (sesión 8). Por defecto *Completar fusiones*, fusionar solas sí (solo hace algo con Engarces II) y engarzar las mejores no.
2. **Nada se engarza solo** salvo con "engarzar siempre las mejores" (como en C3). "Las mejores" = mayor nivel; en empate, la que ya estaba y después Cauce, Cascada, Mutaciones (no compara el efecto real de cada tipo).
3. **Prioridad** no estaba definida en el bloque: elige el tipo que minimiza `mejor nivel + posición en la lista` (el primero queda un nivel arriba del segundo). Sola, una lista sería igual a Tipo fijo.
4. **Completar fusiones** cuenta Ámbar sueltas (lo que nace siempre es Ámbar).
5. **El inventario no tiene tope**: 24 casilleros a la vista y, si se llenan, aparece otra fila. Nada se pierde.
6. **La instantánea es de la pila visual**, no de la economía (el núcleo no tiene pila). Con la pila llena se muestrea de a ~16 celdas: se ve el dibujo grande, no el detalle. Si el Infinito automático llega mientras la Arena no está a la vista, la foto es la de la última vez que se dibujó la pila (shortcut; no lo noté en las pruebas).
7. ~~**Pulido (C11)** suma "reliquias virtuales" a un tipo según la spec vieja: con piezas hay que redefinirlo (¿sube el nivel de una pieza?). Queda para C11.~~ Resuelto en C11: sube una pieza un color.
8. Arrastrar una sobre otra igual fusiona esas dos con la más vieja que quede del mismo tipo y nivel.

**Vuelta de revisión (pedidos sobre la primera versión)**

- **Bug de las caras lisas** (un disco de un color con un cuadradito): después de un Infinito automático la foto salía de la pila visual ya reiniciada con el radio viejo. Ahora `instantanea(alturas)` mide el radio en las mismas alturas y no da foto si la pila tiene menos de 12 celdas de radio; el juego se queda con la última buena. Al cargar, una foto casi toda en cero se descarta (la reliquia pasa a la pila genérica).
- **Símbolo del tipo arriba de cada reliquia**: ficha oscura tallada con el símbolo en el color del nivel. Cauce dos ondas, Cascada tres escalones que caen, Mutaciones una macla (antes un rombo, un hexágono y la macla, chicos en la esquina). El cristal de "engarzada" pasó abajo a la derecha.
- **Sin porcentajes**: Cauce "El valor de los colores ^1,015", Mutaciones "^1,08", Cascada "Exponente c +0,02"; Permeabilidad y Presión "× (1 + 0,3 × nivel)"; Eco II "× (1 + 0,001 × log₁₀ Cristales totales)". Quedan dos `%` que son proporciones, no efectos: la barra de progreso y "el X % de la Energía/s" de Estadísticas.
- **Pantalla fija**: el Relicario entra entero en la ventana y solo scrollea la grilla (`.cristalizacion.fija` en `Capas.svelte`). Escritorio: engarces y elección/ficha a la izquierda, inventario a la derecha; la regla automática se abre encima de la grilla. Celular: engarces en una fila, elección con un tipo por renglón, grilla de 6. Regla nueva en `CLAUDE.md` (pantallas sin scroll y valores sin porcentajes, para todo lo que sigue). `capturas-capa1.mjs` ahora usa 1366×768, 30 reliquias, y anota qué elementos scrollean. **Red y Estratos todavía scrollean la página** (se rehacen en los bloques 9 y 11).

**Sin scroll en toda Cristalización e íconos de los tipos**

- `.cristalizacion.fija` vale para todas las pantallas de sistema: Red se achica con unidades de contenedor (`cqw`/`cqh`) para entrar en el alto y el ancho que quedan; en Estratos la escena toma lo que deja la ficha (en el celular se esconde el párrafo explicativo, que está en "Cómo funciona"). Medido con `capturas-capa1.mjs` en 1366×768 y 390×844: nada scrollea salvo la grilla del Relicario.
- **Íconos de los tipos, versión C ("sello", elegida entre tres)**: `src/ui/IconoTipo.svelte`, un anillo con un emblema. Cauce dos corrientes que se juntan, Cascada un derrumbe abeliano que se abre en anillos de granos, Mutaciones una doble hélice con un cristal en el centro. En la Capa 0, en ámbar, en las pestañas Cascada y Mutaciones y en sus filas. En el Relicario, en el centro de cada reliquia (engarces, grilla y ficha) en blanco de escarcha con un halo del color del nivel, sobre una placa hexagonal de escarcha; y en las gemas de elección, los totales y el orden de la regla. Reemplazó el símbolo de arriba de la versión anterior.
- **Cauce va en la fila de Caudal** (en el color de esa fila). **Cada Mutación tiene su variante** (prop `centro` de `IconoTipo`): la hélice cambia el cristal del centro por lo que muta y toma un color propio. Caudal un grano hueco en blanco, Colores los cuatro colores en jade, Expansión dos anillos en violeta, Cascada un derrumbe en cruz en coral. La columna del ícono de la tienda es fija (1,375 rem) para que las filas queden alineadas.

### Sesión 4 (2026-11-16) — bloque 7: multiplicadores visibles

No se tocó `src/core/`, `balance/` ni el worker: todo sale de las fórmulas del núcleo.

| Archivo | Contenido |
| --- | --- |
| `src/ui/desglose.ts` | `valorMejora(s, id)`: el valor final de cada mejora partido en factores (log10). Caudal en granos/s (base × niveles × Mutación × Reliquia); colores (niveles × hitos × Cauce × Densidad), Cascada (cada fuente de `c`: niveles, Mutación, Reliquia; × Densidad), Mutación de Caudal y de Colores (niveles × Reliquia; la de Colores, × Densidad). `velocidadEstrato(s, k)`: base × Estratos × Inercia × Permeabilidad × Caudal (solo el 1) × empuje del de abajo. |
| `src/ui/ayudas.svelte.ts` | `efecto()` muestra el valor final; `cuenta()` arma "512 niveles × 27 Mutación × 2,21 Reliquia = 30.490 granos/s" (los ×1 no se nombran). `Tip` suma `desglose` y `hielo`. |
| `src/ui/Ayuda.svelte` | El tooltip muestra la cuenta debajo, separada por una línea; con `hielo`, raya y "próximo" en color hielo (estilo de la sesión 3). |
| `src/ui/Estratos.svelte` | Presión: "Presión 10,66 → cada derrumbe vale ×10^(10,66 × Densidad 2,28) = ×1,97e24" (antes ×10^Presión, sin la Densidad: mostraba de menos). Aporte de cada estrato como ×10^(aporte × Densidad), con tooltip de la cuenta. Tooltip en la velocidad local con sus factores. "Frenado" usa `lleno()` del núcleo (antes ignoraba Capilaridad). |
| `src/strings/es.ts`, `en.ts` | `factor` (nombres de cada factor), textos de los tooltips nuevos y de la Presión. |
| `tests/desglose.test.ts` | Nuevo, con una partida avanzada (Red, tres reliquias, Mutaciones, Densidad, estratos): Caudal = `caudal()`; cada mejora = cuánto cae `produccion()` del núcleo sin ella; velocidad = `gammaEstrato()`; ×10^(Presión × Densidad) = cuánto cae la Energía/s sin estratos. |

- **De paso**: los guiones blandos de la sesión 3 en los nombres de nodos se habían guardado como el texto `00ad` ("Cristalo00adgrafía", "Compac00adtación", en los dos idiomas): ahora son el carácter U+00AD.

**Verificación**: 213 tests en verde, `tsc` y `svelte-check` sin errores. En el navegador integrado: compré Compactación nv1 con un clic en la Red y la fila de Ámbar pasó de ×3.262 a ×4.378 (Densidad 2,20 → 2,28); equipar la reliquia Mutaciones subió la fila de Caudal de 13.824 a 30.490 granos/s; tooltips de Caudal, Ámbar, velocidad y aporte mirados en captura; Estratos en 375×812 (la línea de la Presión baja a 1 rem). `medir-estratos.mjs` 1280×720: 60,4 fps en Arena y Estratos. **Sin mirar**: un celular real, el tooltip con el teclado en Estratos (los números no reciben foco), inglés en pantalla.

**Decisiones (revisar)**

1. **El valor final incluye la Densidad** en todo lo que está dentro del valor del derrumbe (colores, Cascada, Mutación de Colores): es lo que de verdad multiplica la Energía/s, y así un nodo como Compactación cambia las filas. Caudal no va elevado a la Densidad. Las filas de colores muestran números más grandes que antes.
2. **Ningún nodo de la Red multiplica el Caudal hoy**: lo que lo cambia es la reliquia Mutaciones (rinde más la Mutación de Caudal). Los nodos que mueven filas son Compactación (Densidad), Cascada+ (más niveles) y Mutación+.
3. Mutación de Expansión y de Cascada siguen como estaban ("cada anillo ×", "+c"): no tienen multiplicadores de afuera.
4. En la velocidad del estrato 1 aparece "Caudal ×0,50" cuando el Caudal es bajo: el factor frena, y se muestra igual.

### Sesión 3 (2026-11-16) — bloque 13: hielo y cristal

Solo interfaz: no se tocó `src/core/`, `balance/` ni las escenas WebGL.

| Archivo | Contenido |
| --- | --- |
| `src/ui/hielo.css` | Nuevo. El sistema de estilo de la Capa 1, por clases (se ponen sobre el elemento que ya existe): `.placa` (placa de hielo: azul noche, escarcha en ruido SVG, esquinas facetadas a 60° con `clip-path`, arista fría fuerte arriba y casi nada a los costados, un brillo que la recorre cada 14 s), `.placa.grietas`, `--luz` (luz extra adentro), `.gema` (botón de cristal: hexágono alargado, corona clara y pabellón oscuro como bisel, un reflejo que cruza cada 11 s; sin `aria-disabled` se enciende desde adentro en 0,6 s; `--c` cambia el color), `.pestanas-hielo` (pestañas rectas con un ícono propio por sistema; la elegida, texto en blanco frío, ícono en hielo y una raya de 2 px con un cristal sobre la línea). Tokens `--hielo-*`, `--tex-escarcha`, `--tex-grietas`. |
| `src/ui/Escarcha.svelte` | Nuevo. Escarcha cayendo detrás de Cristalización: tres capas de copos blandos en mosaicos de 41, 29 y 17 rem (no se repiten juntos), 95–150 s por vuelta, solo `transform`. |
| `src/ui/Capas.svelte` | Encabezado con el cristal de emblema junto a los Cristales; pestañas `.pestanas-hielo`; "Seguir" de la presentación es una gema. **Barra de capas**: 5 rem (antes 2,75), **neutra** (fondo del juego y borde de 1 px, como la Arena: va a tener todas las capas, no es de la Capa 1); cada capa con ícono y nombre debajo: Arena = mini pila de píxeles ámbar con dos granos cayendo; Cristalización = prisma de hielo con caras de distinta luz y un destello. La activa: ícono a color con resplandor, nombre en su color, marca de 2 px y luz de su color. |
| `src/ui/Estratos.svelte` | La ficha del estrato es una placa con grietas; Permeabilidad, Presión y Abrir son gemas. |
| `src/ui/Relicario.svelte` | Ofertas = gemas de punta arriba y abajo con la arista del color de la reliquia; engarces = huecos hexagonales (vacío apagado, lleno encendido de su color); las tres pilas = placas (la engarzada, con grietas, arista de su color y luz desde abajo). |
| `src/ui/App.svelte` | `--barra` 5,25 rem: la columna izquierda de la Arena le deja lugar a la barra más ancha. |
| `src/strings/es.ts`, `en.ts` | Guion blando en "Crista·lización" / "Crystal·lization" (en el móvil la barra mide 4 rem y el nombre corta ahí; en otros lados no se ve). |
| `scripts/capturas-capa1.mjs` | Nuevo. Capturas de la Arena, Red, Estratos, Relicario y Defectos en 1366×800 y 390×844 (Edge headless). Antes y después de este bloque en `correcciones-capa1/capturas_despues/bloque13/` (sin commitear, como el resto de esa carpeta). |

- **Reducir movimiento** (`.quieto`): sin escarcha, sin reflejos ni brillos que recorren, granos de la barra quietos. **Reducir destellos** (`calma`, prendido por defecto): el destello del cristal (barra y emblema) queda fijo en vez de titilar. Lo que cambia de estado (una gema que pasa a alcanzar) cambia en 0,6 s, nunca de golpe.
- Arreglo de paso en los scripts de medición: después de un cambio en caliente Vite sirve `juego.svelte.ts` con `?t=`, y el `import('/src/ui/juego.svelte.ts')` de los scripts cargaba **otra instancia** del módulo (el estado de prueba no llegaba al juego). `medir-estratos.mjs` y `capturas-capa1.mjs` ahora importan la URL que cargó la página.

**Verificación**: 204 tests en verde, `tsc` y `svelte-check` sin errores. Capturas antes/después en escritorio y móvil, miradas una por una (dos vueltas: la escarcha en ruido salía como humo gris y los copos formaban una grilla de estrellas; se bajó la textura y se pasó a tres mosaicos de tamaños sin relación). Edge headless con `medir-estratos.mjs`: 1280×720, 60,4 fps en Arena y en Estratos (cámara quieta y bajando); 390×844 con la CPU ÷4, 58,2 fps en Estratos con la cámara quieta (55,6 sin nada de lo nuevo: los brillos eran `background-position` y repintaban, ahora son `transform`). **Sin mirar**: un celular real, Firefox/Safari (`@property` para la transición del encendido; sin él la gema se enciende de golpe), daltonismo.

**Decisiones (revisar)**

1. **Componentes por clase CSS, no componentes Svelte**: `.placa` y `.gema` se ponen sobre el botón o el `aside` que ya existe; envolverlos habría obligado a pasar a mano `onclick`, `aria-*`, arrastre, etc. Solo la escarcha (que tiene marcado propio) es un componente.
2. **La Red no se tocó**: se rehace en 3D en el bloque 9. Defectos y Escarcha siguen con su pantalla vacía.
3. La barra de capas quedó de 5 rem para que "Cristalización" entre en una línea a 0,6875 rem; en el móvil, 4 rem con el nombre cortado en dos.
4. **La barra de capas no lleva estética de capa** (pedido después de la primera versión, que era una placa de hielo): la estética de cada capa vive solo en su ícono y en el color con que se enciende al estar activa.
5. **Pestañas sin esquirla torcida ni resplandor** (pedido: se veían inclinadas y "de IA"): rectas, sin fondo ni brillo; la personalidad la dan los íconos (Red rombo de celdas, Estratos losas apiladas, Defectos una dislocación, Escarcha copo, Relicario gema tallada) y la marca de la elegida.
6. **Menos "de IA"** (pedido): placas y gemas pasaron de degradados blandos y resplandores a hielo tallado: arista pareja de 1 px, filo claro duro arriba, caras de corte recto (sin humo de ruido: la escarcha es solo el punteado fino), gemas con el bisel cortado en seco (`--corte`) y un reflejo angosto de bordes duros; encendidas se tiñen apenas (9 %) de su color. Sin resplandor en el número de Cristales ni en el borde de las placas.
6b. **Después, vidrio de hielo** (pedido: "más calidad, como liquid glass"): placas y gemas con cuerpo apenas translúcido, arista especular (luz blanca arriba a la izquierda, rebote abajo a la derecha; en las gemas se vuelve del color de la reliquia), espesor con sombras internas, cúpula de reflejo arriba y una cáustica abajo; la gema encendida tiene luz de su color que sube desde adentro. **Sin `backdrop-filter`**: detrás cae la escarcha y el desenfoque se recalcularía en cada cuadro. Con la CPU ÷4 en 390×844, Estratos sigue en 60 fps con la cámara quieta.
7. **En el celular (≤ 760 px) las pestañas son solo íconos**, repartidas a lo ancho en una fila; el nombre queda para lectores de pantalla.
8. Las ofertas del Relicario siempre se pueden tomar, así que siempre están encendidas (con el color de la reliquia); las mejoras de Estratos se apagan cuando no alcanza.

## Plan (SPEC_CAPA1 §16)

**Actualización 1.1**

- [x] C1 — Guardado v2 + migración, Cristales, Infinito nuevo, barra lateral de capas y de Cristalización (pantallas vacías)
- [x] C2 — Red: datos desde config, forma de rombo, compra, apertura de vecinos, Memoria (automatización)
- [x] C3 — Relicario: ofertas con semilla, fusión, engarces, efectos
- [x] C4 — Estratos: lógica (`s_k`, Presión, compras) + interfaz 2D provisoria
- [x] C5 — Estratos: escena three.js descendente + optimización
- [x] C6 — Romper el Infinito + fórmula de Cristales + Infinito automático óptimo
- [x] C7 — Defectos 1–4 + visuales
- [x] C8 — Test de balance de la 1.1 + offline + estadísticas
- [ ] C9 — Pulido y auditoría 1.1 → publicar

**Actualización 1.2**

- [x] C10 — Escarcha (lógica + visual)
- [x] C11 — Anillo 3 de la Red, Pulido, Deshielo
- [x] C12 — Defectos 5–8
- [x] C13 — Fin de la Capa 1 (hito + pantalla) + test de balance completo + logros de la 1.2
- [ ] C14 — Pulido y auditoría 1.2 → publicar

## C5 — Estratos: escena three.js descendente (2026-11-15)

| Archivo | Contenido |
| --- | --- |
| `src/render/estratosVisual.ts` | Nuevo. `EstratosVisual`: la escena three.js (sombra de la pila, 8 losas hexagonales, 8 mini pilas de 64×64, un `Points` de 2000 partículas), la cámara que baja y el dibujo a demanda. `soltar()`: la mini pila abeliana de cada estrato. |
| `src/ui/Estratos.svelte` | Reescrito (reemplaza la tabla provisoria de C4): el canvas con los rótulos HTML de cada losa y, al costado, la interfaz del estrato que mira la cámara (granos, ritmo, aporte a la Presión, Permeabilidad y Presión, o Abrir). |
| `src/ui/Pila.svelte` | La flecha "↓ Estratos" debajo de la pila (solo con el nodo Estratos comprado). |
| `src/ui/juego.svelte.ts`, `Capas.svelte` | `juego.pantalla`: la pantalla de Cristalización pasó de estado local de `Capas` a `juego`, para que la flecha pueda abrir Estratos. |
| `scripts/medir-estratos.mjs` | Nuevo. Mide fps y memoria en Edge headless por CDP (ver abajo). |
| `tests/estratosVisual.test.ts` | Nuevo, 2 tests de la mini pila (estable, simétrica, conserva granos, sumidero). |
| `package.json` | `three` **0.187.0** y `@types/three` 0.187.0, versión exacta. |

- **Escena.** Arriba un disco oscuro difuso con un aro tenue (la sombra de la pila, un quad con gradiente). Debajo, cada estrato es un prisma hexagonal (aristas a 60°): abierto es hielo translúcido con brillo fino en los bordes; cerrado es roca oscura con grano. Sobre cada losa abierta, su mini pila: una pila abeliana real de 64×64 con sumidero circular, en una textura R8 que el shader de vértices usa para levantar un montículo (más alto cuanto mayor `s_k`) y el de fragmentos para pintar con los cuatro colores de la pila (o los de daltonismo).
- **Cámara.** Rueda, arrastre, flechas del teclado (con el canvas enfocado) o los botones ↑ ↓ de la ficha: baja de a un estrato, con una transición corta (con Reducir destellos salta sin animar). El estrato enfocado es el que muestra la ficha del costado.
- **Rótulos.** El número de cada losa (y el costo en las cerradas) es HTML: la escena avisa la posición proyectada en cada cuadro y se mueven con `translate`, sin pasar por Svelte.
- **Partículas.** Un solo `Points` con buffer fijo de 2000 (250 por hueco); la posición sale de una fase y del tiempo en el shader, así que el buffer no se toca nunca. Caen `30 × γ_k / γ_base` por hueco, hasta 250. Con Reducir destellos quedan quietas.
- **Móvil (< 760 px).** La escena arriba (44 % del alto) y la ficha debajo; la cámara se aleja para que entre la losa.

### Lista de optimización de §7.4

| Punto | Cómo quedó |
| --- | --- |
| Renderer creado al entrar, destruido al salir | `Estratos.svelte` lo crea en un `$effect` y `destruir()` hace `dispose` de geometrías, materiales, las 8 texturas y el renderer, más `forceContextLoss()` (si no, el contexto queda vivo hasta que pase el recolector). Nunca hay más de un contexto además del de la pila. |
| Render a demanda | Un cuadro cuando cambia la cámara, el tamaño o los estratos abiertos. Sin partículas (o con Reducir destellos) no hay bucle. |
| Partículas a 30 fps como máximo | Medido: 27–30 dibujos/s con la cámara quieta (también se salta cuadros en pantallas de 120 Hz). |
| Nada con la pestaña oculta | No se piden cuadros ni se regeneran heightmaps con `document.hidden`; al volver (`visibilitychange`) se dibuja uno. |
| Heightmaps a 2 Hz, 64×64, en el shader de vértices | `setInterval` de 500 ms: hasta 8 granos por estrato y se vuelve a subir la textura. 8 mallas de 64×64 que comparten geometría. |
| Un `Points`, ≤ 2000, sin objetos por cuadro | Sí (ver arriba). |
| Sombra falsa, sin `shadowMap` | Sí. Tampoco hay luces: el sombreado sale de las derivadas en el shader. |
| `pixelRatio` tope 1,5 (1 en celular) | "Celular" = `(pointer: coarse)`. Sin antialias en celular. No hay postprocesado en ningún lado. |
| three.js con versión exacta, solo lo necesario | 0.187.0, importaciones con nombre. Va en un trozo aparte que se baja recién al abrir Estratos: 537 kB (134 kB gzip). |

### Medidas

`node scripts/medir-estratos.mjs http://localhost:5173 <carpeta> [ancho alto]`, Edge headless con GPU (la notebook de siempre, gráfica integrada). Estado de prueba: pila llena con Caudal 12, los 8 estratos abiertos con Permeabilidad 20 (las 2000 partículas cayendo). fps = `requestAnimationFrame` de la página durante 5 s.

| Medida | 1280×720 | 375×812 (DPR 2) |
| --- | --- | --- |
| fps en la Arena, antes | 60,4 | 60,6 |
| **fps en Estratos**, cámara quieta | 58,8 (escena: 27 dibujos/s) | 59,4 (29 dibujos/s) |
| **fps en Estratos**, cámara bajando sin parar | 59,4 (50 dibujos/s) | 60,4 (52 dibujos/s) |
| **fps en la Arena después de entrar y salir 10 veces** | **60,6** (no bajó) | **59,6** (60,6 antes: 1 fps menos, con un cuadro de 83 ms en la muestra) |
| Costo de un cuadro de la escena (con `gl.finish`) | 0,5 ms | 0,6 ms |
| Costo de regenerar los 8 heightmaps (cada 500 ms) | 1,7 ms | 1,9 ms |
| Escena | 13 llamadas de dibujo, 63.600 triángulos, 4 geometrías, 8 texturas | igual |

Memoria (heap de JS después de forzar el recolector, por CDP):

| Momento | 1280×720 | 375×812 |
| --- | --- | --- |
| Arena, sin haber entrado nunca a Estratos | 6,6 MB | 6,1 MB |
| Arena, después de la 1.ª visita | 12,2 MB | 12,3 MB |
| Arena, después de 11 visitas | 13,1 MB | 13,2 MB |
| Arena, después de 31 visitas | 12,6 MB | 12,7 MB |

- **El salto de ~6 MB de la primera visita es el módulo de three.js**, que se carga una vez y queda. Desde ahí la memoria no acumula: 12,2 → 13,1 → 12,6 MB en 31 visitas (sube y baja; a las 31 visitas está 0,4 MB arriba de la primera). Los nodos del DOM vuelven a la misma cuenta y el contexto WebGL de la pila sigue vivo después de las 31 visitas.
- La memoria de GPU no se puede leer desde la página; lo que sí se ve es que `renderer.info.memory` queda en 4 geometrías y 8 texturas mientras la escena vive y que todo pasa por `dispose`.
- Las primeras corridas del script no valen: el Edge de la corrida anterior quedaba vivo y el juego mostraba "abierto en otra pestaña". El script ahora cierra el navegador y corta si lo detecta; los números de arriba son de corridas limpias (una por tamaño).

### Verificación

- `npm test`: **194 en verde** (antes 192). `tsc` y `svelte-check` sin errores ni avisos. `vite build` bien. No se tocó `src/core/` ni el balance.
- Mirado andando (navegador integrado a 800×600 y capturas de Edge a 1280×720 y 375×812): la flecha en la Arena y el salto a Estratos; sombra, losas, mini pilas y partículas; la rueda baja de estrato y la ficha cambia; estratos cerrados como roca con su costo; los 8 abiertos. Sin errores en la consola.

### Pendiente / no verificado (revisar)

1. **No lo probé en un celular de verdad.** Solo en tamaño de celular en Edge de escritorio, que no dice nada de una GPU de gama media. Probar con `npm run dev` (muestra la dirección de la red local). Tampoco corrió la rama de celular: en headless `(pointer: coarse)` es falso, así que el `pixelRatio` quedó en 1,5 y no en 1.
2. **Frenar la CPU ÷4 en Edge no sirvió como "celular"**: con ese freno la Arena sola ya cae a 15 fps en headless (y esa corrida además fue de las contaminadas).
3. ~~La pila principal sigue dibujando detrás de Cristalización~~ (resuelto: ver "La pila no se dibuja tapada", abajo). Su worker sigue trabajando igual (casi un núcleo con el Caudal alto): eso no se tocó.
4. **Las mini pilas son decorativas**: cada una es una pila abeliana real, pero la cantidad de granos sale de una curva visual de `s_k` (`s/(s+15)`), no de una fórmula de la spec. Lo mismo el `30 × γ` de las partículas. Son constantes visuales en `estratosVisual.ts`, no de balance.
5. **Arrastre**: no lo probé (ni con mouse ni con el dedo); probé la rueda y `ir()`. Reducir destellos y las flechas del teclado tampoco: están en el código, sin mirar.
6. La paleta elegida en Ajustes no se usa en las mini pilas (sí la de daltonismo).
7. El hielo es un material plano translúcido con brillo en las aristas; grietas y escarcha (§11) quedan para el pulido de C9.

### La pila no se dibuja tapada (después de C5, 2026-11-15)

Cristalización es una pantalla opaca y la pila principal seguía dibujándose detrás, en todas sus pantallas (desde C1).

- `PilaVisual.tapada` (`src/render/pilaVisual.ts`): con `true`, `cuadro()` sigue repartiendo granos y hablando con el worker pero no llama a `dibujar()`. Lo pendiente (alturas nuevas, fundido de foto) se sube en el primer cuadro al destaparla.
- `Pila.svelte` la pone en `true` 1,5 s después de salir de la Arena (la entrada más larga de `Capas.svelte` dura 1,1 s y deja ver la pila) y en `false` en el mismo cuadro en que se vuelve.
- Los paneles de la Arena (Estadísticas, Logros, Ajustes) no la tapan: ahí la pila se sigue viendo.

Medido de nuevo con `scripts/medir-estratos.mjs` (una corrida por tamaño):

| Medida | 1280×720 | 375×812 (DPR 2) |
| --- | --- | --- |
| fps en la Arena, antes | 59,0 (un cuadro de 100 ms en la muestra) | 60,4 |
| fps en Estratos, cámara quieta | 60,6, peor cuadro 17 ms (antes 58,8 y 83 ms) | 60,2, peor 33 ms (antes 59,4 y 67 ms) |
| fps en Estratos, cámara bajando | 60,6, peor 17 ms (antes 59,4 y 33 ms) | 60,4, peor 17 ms |
| fps en la Arena después de entrar y salir 10 veces | 60,4 | 60,4 |
| Memoria: 1.ª visita → 11 → 31 | 12,3 → 13,0 → 13,1 MB | 11,8 → 13,1 → 13,1 MB |

- En esta notebook la mejora es chica (ya estaba en 60 fps): se nota en el peor cuadro. Donde debería pesar es en un celular, que sigue sin probarse.
- La memoria entre la visita 11 y la 31 queda plana; entre la 1.ª y la 11 sube ~1 MB en las dos corridas (en las de antes del cambio, lo mismo y después bajaba). No lo investigué más: con 31 visitas no sigue subiendo.
- Captura de la Arena 300 ms después de volver: la pila entera, sin cuadro negro. 194 tests, `tsc` y `svelte-check` en verde.
- **No verificado:** volver a la Arena en medio de una Compresión o de un salto de foto ocurridos mientras estaba tapada (el código los deja pendientes; no lo miré), ni el modo grabación.

## C4 — Estratos: lógica e interfaz 2D provisoria (2026-11-15)

| Archivo | Contenido |
| --- | --- |
| `src/core/estratos.ts` | Nuevo. `flujoEstratos`, `factorCaudal` (f1), `gammaEstrato`, `crecerEstratos`, `presionEstrato`/`presion`, costos (`costoAbrirLog10`, `costoMejoraLog10`) y compras (`abrirEstrato`, `mejorarEstrato`). |
| `src/core/state.ts` | `estratos: { abiertos, s, perm, pres }`: `s` en log10 de granos (0 = vacío), `perm` y `pres` los niveles por estrato. |
| `src/core/tick.ts` | Los estratos crecen en cada tick de Arena (no con la Energía frenada en el Infinito), con el Caudal del momento. |
| `src/core/formulas.ts` | `valor`: la Presión se suma a log10 V junto con el Eco, así queda multiplicada por la Densidad (§10). |
| `src/core/infinito.ts`, `src/guardado/guardado.ts` | Se conservan en el Infinito y en el guardado (sigue en versión 3; un guardado de antes arranca con los estratos vacíos). |
| `src/core/red.ts` | `cristalesDe(log10)`: el redondeo a Cristales enteros de la Red, ahora compartido con los Estratos. |
| `src/ui/Estratos.svelte` | Nuevo. La interfaz 2D **provisoria**: Presión total y 8 filas con granos, ritmo, aporte a la Presión y los botones de Permeabilidad y Presión (o Abrir). |
| `src/ui/desglose.ts`, `Estadisticas.svelte` | Factor "Presión" en el desglose de la producción, con una parte por estrato abierto. |
| `balance/ref_estratos.py` | Nuevo. Corre el bloque de estratos de `play_arena` (el real, importando `sim_capa1`) 600 s y escribe `tests/fixtures/estratos_sim.json`. |
| `tests/estratos.test.ts` | Nuevo, 8 tests. |

- **Fórmulas (§7.2).** `flujo = γ × Estratos × Inercia × Capilaridad`; `γ_k = flujo × (1 + 0,3 × Permeabilidad_k)`, por `f1 = clamp(log10(Caudal)/30, 0,5, 3)` en el primero; `s_k` nunca pasa de `s_(k−1) − 2` y nunca baja. Sin el nodo Estratos de la Red no corren ni dan Presión (igual que el simulador).
- **Compras (§7.3).** Abrir 0/2/4/7/11/16/22/29; Permeabilidad y Presión `1 + k + 0,6 L + 0,1 L³/6`. En Cristales enteros, redondeando para arriba por debajo de 1e6 (como la Red).
- **Interfaz.** Tabla en escritorio; en móvil cada estrato es un bloque. "Frenado por el de arriba" cuando el estrato está en el tope.

### Comparación con `sim_capa1.py`

`python balance/ref_estratos.py` corre la Arena del simulador hasta juntar 600 s (si llega al Infinito, empieza otra: los estratos persisten) y guarda los `s_k` y la Presión de `Player.mods`. El test juega 600 s con el núcleo desde el mismo estado y compara con ±1 %:

| Caso | Red | Resultado |
| --- | --- | --- |
| Recién abiertos | Estratos nv1, 3 abiertos, Arena nueva (f1 en el mínimo) | dentro del ±1 % |
| A mitad | Estratos nv4, Inercia nv3, Presión nv2, 5 abiertos, niveles desparejos, Caudal fijo (f1 = 0,6) | dentro del ±1 % |
| Caudal alto | Estratos nv2, 8 abiertos, Caudal fijo (f1 = 1,5) | dentro del ±1 % |

En los dos casos con Caudal fijo el script reemplaza `Arena.lF` por una constante (el Caudal del bot cambia solo y el test no podría seguirlo); el bloque de estratos y los `dt` son los del simulador, sin copiar.

### Verificación

- `npm test`: **192 en verde** (antes 184). `tsc` y `svelte-check` sin errores. No se tocó el balance.
- En el navegador integrado (1024 y 375 px): sin el nodo, el cartel de cerrado; con Estratos nv1 y Cristales de debug, abrir dos estratos y comprar Permeabilidad y Presión (5.000 → 4.789: 1 + 100 + 10 + 100); con cinco estratos cargados a mano la Presión dio 3,07 y la Arena pasó a 1e84 en segundos; los `s_k` subieron solos y se conservaron al recargar. Sin desborde horizontal en móvil.
- **No medí fps** (el panel estaba oculto). No corrí `sim_capa1.py` entero: no cambió ninguna constante.

### Decisiones (revisar)

1. **La Presión es en vivo.** El simulador la calcula al empezar cada corrida y en cada Compresión (`A.m = P.mods()`); el juego la recalcula en cada tick, como dice §7.2. El juego va apenas más rápido que el simulador dentro de una corrida larga.
2. **`s_k` arranca en 0** (1 grano) en vez del "vacío" del simulador (`−∞`, que pasa a 0 en el primer paso): da lo mismo en las fórmulas.
3. **Estado puesto a mano en la prueba**: los niveles de la Red y los `s_k` altos los cargué desde la consola, no jugando.
4. **Falta para otros hitos**: ~~la escena 3D y la flecha "↓ Estratos" en la Arena~~ (hecho en C5); que los estratos no corran en el Defecto Vidrio y las reglas de Dislocación e Inclusión sobre la Presión (C7 y C12); `meta_1_1_estrato8_log10` (C8/C13). El Eco y las reliquias siguen sin aparecer en el desglose de Estadísticas.

## C3 — Relicario (2026-11-15)

| Archivo | Contenido |
| --- | --- |
| `src/core/relicario.ts` | Nuevo. `oferta` (mulberry32 con `relicario.semilla` + número de Infinito), `elegir`, `elegirSola`, `nivelFusion`/`escalon`/`faltan`, `espacios`, `equipar`/`desequipar` y los tres efectos (`cauceRel`, `cascadaRel`, `mutacionesRel`). |
| `src/core/state.ts` | `relicario: { semilla, reliquias, equipadas, pendiente }`. `pendiente` = número del Infinito cuya oferta espera elección (0 = ninguna). |
| `src/core/formulas.ts` | Cauce: los colores a la `1 + pct×(n+1)`. Cascada: suma a `c` (solo con la Cascada comprada). Mutaciones: el exponente de las de Caudal y Colores × `(1 + pct×(n+1))`. Igual que `mods()` de `sim_capa1.py`. |
| `src/core/infinito.ts`, `tick.ts` | Cada Infinito deja una oferta (si había una sin elegir, se elige sola antes). El Infinito automático (Memoria nv4) elige solo en el mismo tick. |
| `src/guardado/guardado.ts` | Valida el Relicario (cantidades enteras; equipadas sin repetir, solo tipos que se tienen, hasta los Engarces). Un guardado de C1–C2 con Infinitos hechos arranca con una oferta pendiente. Sigue en versión 3 (lo completa `completar()`). |
| `src/ui/Relicario.svelte` | Nuevo. La oferta con su cuenta regresiva, los Engarces y las tres pilas. |
| `src/ui/juego.svelte.ts` | La espera de 30 s (`juego.ofertaS`), el aviso "Reliquia elegida sola: X" y la semilla al azar de cada partida nueva. |
| `src/ui/Capas.svelte`, `Debug.svelte` | Rombo ámbar en la barra de capas y en la pestaña Relicario cuando hay oferta; después de la presentación del primer Infinito se entra por el Relicario. Debug: "Infinito ya". |
| `balance/config_capa1.json` | `relicario.espera_eleccion_s: 30` (el simulador no lo usa). |
| `tests/relicario.test.ts` | Nuevo, 8 tests. |

- **Ofertas.** 3 (4 con Engarces nv2+), nunca todas iguales (si salen iguales, la última pasa al tipo siguiente, como el simulador). Puede repetirse un tipo dentro de la oferta.
- **Elección sola.** La que le falten menos reliquias para subir de color; en empate, la del tipo equipado; si sigue el empate, la primera de la oferta.
- **Fusión.** `floor(log3(n))`; color = nivel mod 4, y cada vuelta completa suma "+1" con un brillo más fuerte. Al subir de color (a mano o sola, con la pantalla abierta) tres rombos del color anterior caen al centro y nace el cristal nuevo; con Reducir destellos, solo cambia el color.
- **Engarces.** 1 espacio, 2/2/3/3 con el nodo (3 con Engarces II). Se arrastra una pila a un espacio (HTML5) o se toca: tocar la engarza en el primer espacio libre (o reemplaza el último) y tocar de nuevo la saca; tocar un espacio lo vacía. Arrastrar una ya puesta a otro espacio las intercambia.
- **Formas.** Cauce un rombo largo, Cascada un hexágono facetado, Mutaciones una macla.

### Verificación

- `npm test`: **184 en verde** (antes 176). `tsc` y `svelte-check` sin errores. `python balance/sim_capa1.py`: igual que antes (14,99 h).
- En el navegador integrado (escritorio y 375×812), sin errores de consola: partida nueva → "Infinito ya" → presentación → Relicario con la oferta. Elegir, engarzar tocando, 3 Cauce → fusión a Coral, 9 → Jade (capturada a mitad), 81 → "Ámbar +1". Recargar con una oferta pendiente: la misma oferta. Sin tocar nada 30 s: se eligió sola la que predecía la regla, con su aviso. Con Engarces nv2: 4 ofertas y 2 espacios; arrastrar a un espacio y cambiar de lugar (eventos de arrastre simulados).
- **No medí fps ni vi la fusión en movimiento**: el panel estaba oculto y solo dibuja un cuadro por captura. Lo nuevo es CSS (3 elementos, 0,6 s).
- **No probé arrastrar con un mouse real ni en un teléfono**: el arrastre de HTML5 no anda con el dedo; en móvil se engarza tocando.

### Decisiones (revisar)

1. **La espera de 30 s es tiempo real** (no de juego: a ×50 serían 0,6 s). No corre con un cartel abierto ni durante la presentación, y un cuadro largo cuenta 1 s: al recargar o volver, la cuenta arranca de 30.
2. **Nada se engarza solo**, ni la primera reliquia (auto-equipar es de la Capa 2, §5). Con Infinito automático y sin engarzar nada, las reliquias no dan efecto.
3. **Semilla por partida**: `estadoInicial()` usa la de config (el núcleo no tira dados) y la interfaz la cambia por una al azar al empezar una partida nueva.
4. **Si se compra Engarces nv2 con una oferta abierta**, aparece la cuarta reliquia (y si las tres eran iguales, puede cambiar la tercera).
5. **Los textos de la Arena no muestran las reliquias**: el efecto de las Mutaciones en la Tienda, las fórmulas de "Cómo funciona" y el desglose de Estadísticas (`desglose.ts`) siguen con los números de la Capa 0 (la producción real sí las usa). Con una reliquia engarzada el desglose no suma lo que dice Energía/s. Queda para C8 (estadísticas).
6. Pulido (Esquirlas) es de C11; "sin Relicario" del Defecto Vidrio, de C12. Nombres en inglés provisorios (Channel, Sockets).

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
3. ~~**El Infinito automático es inmediato** al llegar a 1e308.~~ Hecho en C6: con el Infinito roto, "en el óptimo" o "al llegar a X Cristales".
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

## Correcciones Capa 1, bloque 9: la Red como pila 3D de cristal (2026-11-16)

Solo visual: no se tocó `src/core/`, `balance/` ni la config. Tests: 216 en verde más el de balance, tsc sin errores.

| Archivo | Contenido |
| --- | --- |
| `src/render/redVisual.ts` | Nuevo. La escena three.js: cámara en diagonal a 35° (arrastrar gira ±0,45 rad y sube o baja la cámara), encuadre automático (proyecta las puntas del rombo y ajusta la distancia), cada nodo una columna de 0 a 4 cubos de cristal del color de su nivel sobre una base de hielo. Cristal: facetas (bisel falso), refracción y reflejo de un entorno procedural chico, brillo en las aristas. Cerrado: losa baja de escarcha lisa; anillo 3: losa más gruesa y oscura. Abierto sin niveles: cubo de vidrio vacío. Hover y elegido: halo aditivo. Derrumbe al maxear: los cubos se separan y tiemblan, un fragmento vuela en arco a cada vecino y el vecino se despierta cuando le llega. |
| `src/ui/Red.svelte` | Reescrito. Carga la escena en un trozo aparte al entrar y la destruye al salir. Nombres en HTML sobre cada columna (cortos en pantallas angostas), con desamontonado: si dos se pisan queda el de adelante; el elegido y el del puntero siempre se ven; los cerrados solo con el puntero encima. Ficha al costado (abajo en el celular): nombre, nivel con los cuatro colores, qué hace, siguiente nivel, estado y botón de compra con el costo. |
| `src/strings/es.ts`, `en.ts` | `red.comprar`, `red.ahora`, `red.escena`. |
| `scripts/medir-red.mjs` | Copia de `medir-estratos.mjs` para la Red (puerto 9335). |

Mismas reglas que los Estratos: un solo renderer, `shadowMap` apagado, `pixelRatio` tope 1,5 (1 con puntero grueso), render a demanda (solo dibuja si cambió un nodo, la cámara o hay un derrumbe en curso; el juego llama a `poner()` en cada tick y sin cambios no dibuja), sin cuadros con la pestaña oculta, `dispose` de todo y `forceContextLoss` al salir. Los colores de los cubos salen de las variables CSS de la interfaz (respetan daltonismo). Reducir destellos: sin animación de derrumbe.

### Medidas

`node scripts/medir-red.mjs http://localhost:5177 correcciones-capa1/capturas_despues/bloque9 <ancho> <alto>`, Edge headless con la GPU integrada de la notebook. Estado de prueba: pila llena, Red con nodos en todos los niveles.

| Medida | 1366×768 | 390×844 (DPR 2) |
| --- | --- | --- |
| fps en la Arena, antes | 60,4 | 60,6 |
| **fps en la Red**, quieta | 60,4 (escena: **0 dibujos/s**) | 60,4 (0 dibujos/s) |
| **fps en la Red**, girando sin parar | 60,4 (59 dibujos/s) | 60,4 (60 dibujos/s) |
| **fps en la Red**, un derrumbe tras otro | 60,4 (56 dibujos/s) | 60,6 (56 dibujos/s) |
| **fps en la Arena después de entrar y salir 10 veces** | **60,4** (no bajó) | **60,4** |
| Costo de un cuadro de la escena (con `gl.finish`) | 0,19 ms | 0,28 ms |
| Escena | 56 llamadas de dibujo, 662 triángulos, 3 geometrías, 0 texturas | igual |

Memoria (heap de JS después de forzar el recolector):

| Momento | 1366×768 | 390×844 |
| --- | --- | --- |
| Arena, sin haber entrado nunca | 5,9 MB | 6,0 MB |
| Arena, después de la 1.ª visita (baja three.js) | 12,0 MB | 11,6 MB |
| En la Red | 12,4 MB | 12,4 MB |
| Arena, después de 11 visitas | 12,3 MB | 12,3 MB |
| Arena, después de 31 visitas | 12,9 MB | 12,3 MB |

- No acumula: los nodos del DOM vuelven a la misma cuenta (1232 / 1229), la cantidad de canvas también, el contexto WebGL de la pila sigue vivo y no hubo errores en la consola.
- Primera medición: con la Red quieta dibujaba 20 cuadros/s (un cuadro por tick del juego). Arreglado: `armar()` dice si cambió algo y `poner()` solo pide cuadro en ese caso.
- Pantalla fija verificada: sin scroll en 1366×768 ni en 390×844; en 390×844 todos los nombres quedan dentro de la escena y la ficha termina en y = 812.

Capturas en `correcciones-capa1/capturas_despues/bloque9/` (Red, derrumbe a mitad de camino y la Arena al volver, en los dos tamaños).

### Decisiones (revisar)

1. **El hielo quedó liso, sin grietas** (pedido del usuario en la sesión: las texturas de hielo con grietas Voronoi y ruido se veían mal y la escena confusa). Los cerrados son losas bajas para que el cristal sea lo único alto; el anillo 3 se distingue por ser más grueso y más oscuro. El bloque 9 pedía grietas en el anillo 3: si se quieren, hacerlas como pocas líneas finas, no como textura.
2. Los nombres de los cerrados no se muestran a la vista (aparecen al pasar el puntero o al elegirlos); con 25 nombres la pila no se leía.
3. El suelo y las bases no proyectan sombra (no hay shadowMap): el resplandor frío debajo de la pila la apoya.
4. **Celular real: sin medir.** La fila de 390×844 es emulación en la notebook.

## Correcciones Capa 1, bloque 9 (v3): la Red plana en SVG (2026-11-16)

Reemplaza la pila 3D de three.js por el boceto `correcciones-capa1/bocetos-red/escarcha-v3.html`, llevado al juego.

- `src/ui/Red.svelte`: la Red en SVG. Cada nodo es una mini pila abeliana teñida con el color de su nivel, con emblema, nombre y cuatro cuadros de nivel. Los completos se unen a sus vecinos con escarcha (trazo fino con ramitas a 60°). El viewBox se ajusta a los nodos (sin los puntos de hielo del anillo 3), así la red llena su caja.
- Ficha al costado, como en el boceto: cara del nodo, "Nv 3 · Jade", efecto, siguiente nivel, botón con el costo a la derecha y la regla abajo.
- Derrumbe al completar: el nodo late y salen tres fragmentos hacia cada vecino (se saltea con "Reducir destellos").
- `src/render/redCaras.ts`: caras (canvas → data URL, en caché), escarcha y emblemas. Los colores salen de las variables CSS (respetan daltonismo).
- Responsive: con la caja de la red por debajo de 560 px de ancho pasa a modo compacto (nombres cortos, letra y cuadros más grandes en unidades del dibujo, rombo más apretado). En ≤760 px la ficha va debajo y compacta, sin la regla; en celulares bajos (≤740 px de alto) también sin el "siguiente nivel".
- Borrados: `src/render/redVisual.ts` y `scripts/medir-red.mjs` (eran del 3D). three.js queda solo para los Estratos.
- Teclado: cada nodo es un botón (Tab, Enter o Espacio).

### Verificación
- Sin scroll de página en 1366×768, 768×1024, 390×844 y 360×640. Sin errores en consola. Compra y derrumbe probados (Estratos 3 → 4: abre Inercia y Presión).
- `vitest`: 222 de 222. `svelte-check`: 0 errores. Build ok.

### Decisiones (revisar)
- Sin giro ni arrastre: la red es plana.
- Emblemas nuevos para Presión, Engarces e Inercia. Los del anillo 3 todavía no tienen y muestran solo el disco.

## La Red: lo que viene, zoom y sorpresa (2026-11-16)

- **Lo que viene**: los nodos del anillo 3 (bajo el hielo) se ven como bloques escarchados con un copo, sin nombre, unidos con caminos punteados a sus vecinos. Más allá, dos anillos de puntos que se apagan con la distancia, y los bordes de la red se desvanecen: se lee que la Red sigue.
- **Zoom solo en la Red**, como el de la pila: barra abajo a la derecha (escala logarítmica, doble clic = encuadre), rueda y pellizco de trackpad hacia el puntero, pellizco con dos dedos y arrastre para moverla (`touch-action: none` en la red: la página no hace zoom ni scroll). Un toque quieto sigue eligiendo el nodo; el clic después de arrastrar no. Mínimo: se ve la trama entera; máximo ×3. El centro no puede irse de la Red. El zoom no se guarda: al volver a la pantalla arranca encuadrado.
- **Sorpresa**: un nodo que todavía no se abrió no dice qué da ("Lo que da se descubre cuando se abre."), ni muestra emblema ni botón de compra. Los del hielo tampoco dicen su nombre ("Bajo el hielo"). El "Siguiente nivel" de un nodo que ya tenés sigue a la vista.

### Verificación
- Rueda, barra, doble clic, arrastre y clic tras arrastre probados con eventos sintéticos en 1366×768. 390×844 sin scroll, con zoom mínimo. **El pellizco con dos dedos no se probó** (falta pantalla táctil).
- `vitest` en verde, `svelte-check` sin errores ni avisos, build ok.

## Correcciones Capa 1, bloque 11: Estratos en 2D, el embudo (2026-11-16)

Cambio de dirección: la escena 3D de three.js se sacó. Antes de tocar el juego se mostraron 5 maquetas (`mockups/estratos/opcion-1.html` … `opcion-5.html`, con su PNG; `node mockups/estratos/capturar.mjs` las vuelve a capturar). Se eligió la **4, embudo**.

| Archivo | Qué |
| --- | --- |
| `src/render/embudo.ts` | Nuevo. La física, pura (sin DOM): una grilla de 120×92 de **arena que cae** (gravedad y deslizamiento a 45°). Cada grano guarda su color (índice de la paleta). Ocho bandejas cada vez más angostas unidas por paredes en diagonal; el piso de cada una tiene poros (uno cada 7 columnas y el cuello del centro) que se abren cuando la bandeja pasa su nivel. Los estratos cerrados son roca: lo que cae encima se pierde. |
| `src/render/estratos.worker.ts` | Nuevo. Corre el embudo a 20 pasos por segundo y manda las celdas. Lo crea la pantalla al entrar y lo termina al salir. |
| `src/render/estratosLienzo.ts` | Nuevo. Dibujo en canvas 2D, en pixel art (celdas de px físicos enteros). Arriba, el casquete de la **pila principal llena de verdad** (`celdasLlena()`), con su aro; debajo, el embudo. Evolución: el fondo de cada bandeja pasa de hielo claro a sedimento más hondo y el piso engorda al llenarse; veta violeta en los estratos al tope. Cerrados: roca con "Estrato N · costo" grabado; el próximo, si alcanza, se agrieta; al abrirlo la roca salta en pedazos y la bandeja se llena de golpe. Dibuja solo cuando llegan celdas o hay animación. |
| `src/ui/Estratos.svelte` | Sin three.js. Ficha con granos, ritmo, aporte en ×, el desglose de la velocidad local a la vista y las dos mejoras distintas: Permeabilidad = gema de hielo con gotas; Presión = placa de prensa de metal con remaches. **Ficha de tamaño fijo** (no late con cada Infinito): alto fijo, desglose con dos renglones reservados (todos los factores en el tooltip), cifras en un renglón. |
| `package.json` | Fuera `three` y `@types/three` (la Red ya era SVG: nada más los usaba). Borrados `estratosVisual.ts` y su test. |
| `tests/embudo.test.ts` | Nuevo: la arena se asienta sin perderse ni meterse en paredes, gotea pasado su nivel, se pierde en la roca. |
| `scripts/capturas-estratos.mjs` | Nuevo: capturas (3 abiertos, abrir el 4, cambiar paleta), scroll de página y alto de la ficha en 8 estratos y 6 "Infinitos" seguidos. `medir-estratos.mjs` adaptado al 2D. |

### Colores
La arena de los estratos es la de la pila: sus colores son los de la **paleta equipada** (o daltonismo) y vienen en la misma proporción que en la pila llena (se cuentan de `celdasLlena()` y se le pasan al worker). Cambiar la paleta recolorea los granos al instante.

### Medido (Edge headless, notebook de siempre)
| | 1366×768 | 390×844, CPU ÷4 |
| --- | --- | --- |
| fps en Estratos, quieta | 60,4 (peor 17 ms) | 58,8 (peor 50 ms) |
| fps cambiando de estrato | 60,4 (peor 17 ms) | 59,2 (peor 33 ms) |
| Costo de un cuadro | 0,42 ms | 1,67 ms |
| Heap en la Arena: antes / 1 visita / 31 visitas | 6,7 / 6,5 / 7,5 MB | — |

Nodos del DOM iguales tras 11 y 31 visitas; el contexto WebGL de la pila sigue vivo. Sin scroll de página en 1366×768 ni 390×844. Alto de la ficha: un solo valor (424 px y 232 px). `vitest` 223/223, `svelte-check` 0, build ok.

### Decisiones (revisar)
1. **Física de arena que cae en vez de la regla de 4.** El bloque 11 pedía pilas abelianas, pero en un corte de perfil con granos de colores que se mezclan la regla de 4 no conserva qué grano es cuál; la arena que cae sí (pedido del usuario: "colores mezclados con físicas reales").
2. **Lo lleno que se ve cada bandeja es visual**: `s_k / (s_k + 6)` hasta 0,9, llena si está al tope; el chorro, `0,6 + 0,8 × log2(1 + γ/γ_base)` granos por paso con tope 5. No son balance.
3. Sin rueda ni arrastre: se elige un estrato tocándolo, con las flechas de la ficha o del teclado.
4. **Celular real: sin medir** (emulación).

## Balance: precios 1eN, softcap más allá del Infinito y Estratos tras Romper (2026-11-16)

Antes del paso 7 (Romper el Infinito). Orden seguido: simuladores → specs → config y código.

1. **Precios en potencias de 10 puras, en todo el juego.** El exponente se **redondea al entero más cercano** (x,5 sube), en la fórmula de costo: `precioLog10` en `src/core/config.ts`, usado por la Arena (`formulas.ts`), la Red (`red.ts`) y los Estratos (`estratos.ts`); `precio()` en `sim.py` y `sim_capa1.py` (también Escarcha y Pulido, que todavía no están en el juego). Primero se probó **hacia arriba**, como se había pedido: la Capa 0 pasaba de 3 h 14 a 4 h 10 (+29 %), y compensarlo con multiplicadores no era estable (×1,01 en los multiplicadores la bajaba a 2 h 21). Se frenó y el usuario eligió el redondeo al más cercano.
2. **Softcap más allá del Infinito** en las mejoras de la Arena (Caudal, colores, Cascada, Mutaciones): `costo = 10^redondear(exp_normal(n) + max(0, n − n_1e308))`, con `softcap_desde_log10: 308` en `config.json` (SPEC §4.11). `precioArenaLog10` busca `n_1e308` por bisección. La tienda marca esas filas con una gema de hielo chica con "∞" (tooltip "Más allá del Infinito: cada nivel cuesta ×10 más que el anterior").
3. **Estratos detrás de Romper el Infinito**: `"requiere": {"ruptura": 1}` en el nodo Estratos de `config_capa1.json`; `requisitoRed` en `red.ts` lo lee (sirve para cualquier nodo). La ficha del nodo dice "Se abre con Romper el Infinito (Ruptura nv1): es lo que te deja ir más allá del Infinito". Textos de la pantalla cerrada, del nodo y de las guías (es/en) los presentan así. Los requisitos de Dislocación, Macla e Impureza (3, 5 y 7 estratos) siguen teniendo sentido: los Estratos se abren a las 2,26 h, justo después de la Vacancia (2,18 h), y los tres caen en el mismo orden de antes.

### Capa 0 (`python3 balance/sim.py`)

| Estilo | Antes | Ahora | |
| --- | --- | --- | --- |
| cada 5 s | 187 min | 200 min | +7 % |
| **cada 15 s** | **194 min** | **208 min** | +7 % |
| cada 60 s | 228 min | 240 min | +5 % |
| cada 5 min | 376 min | 401 min | +7 % |

17 compresiones. Primera Compresión a los 16,1 min y primera Mutación a los 130 min; la corrida más larga del jugador de 15 s dura 16,8 min. El test de balance (núcleo real) da 214,2 min. Rangos de SPEC §10 y del test: Mutación 120–140, Infinito 195–225, ninguna corrida de más de 17 min; `objetivo_minutos` 208 / 240 / 401.

### Capa 1 (`python3 balance/sim_capa1.py --robustez`), sin recalibrar

| Hito | 15 s | 60 s | 5 min |
| --- | --- | --- | --- |
| Segundo Infinito | 1,21 h | 1,37 h | 2,33 h |
| Memoria completa | 1,81 h | 1,97 h | 3,00 h |
| Vacancia | 2,18 h | 2,33 h | 3,36 h |
| Romper el Infinito = Estratos | 2,26 h | 2,42 h | 3,45 h |
| Dislocación | 3,53 h | 3,69 h | 4,72 h |
| Macla | 4,46 h | 4,62 h | 5,65 h |
| Impureza | 5,53 h | 5,69 h | 6,72 h |
| **FIN 1.1** | **7,29 h** | 7,45 h | 8,48 h |
| Fatiga | 9,71 h | 9,86 h | 10,90 h |
| Frontera | 12,25 h | 12,32 h | 13,36 h |
| Inclusión | 12,78 h | 12,99 h | 14,07 h |
| Vidrio | 13,82 h | 14,01 h | 15,09 h |
| **FIN CAPA 1** | **14,82 h** | 15,02 h | 16,11 h |
| Hueco máximo | 30,8 min | 30,8 min | 40,0 min |

Abrir un estrato: E1 ×1e2,3 · E2 ×1e7,9 · E3 ×1e13,3 · E4 ×1e16,1 · E5 ×1e18,3 · E6 ×1e40,8 · E7 ×1e74,5 · E8 ×1e104 (mínimo ×100). Dentro de los rangos pedidos (1.1 en 6,5–7,5 h, capa en 14–16 h, hueco < 40 min) **sin tocar ningún multiplicador**: el softcap mueve la capa ~0,05 h (sin él, 7,24 h y 14,78 h) porque con el Infinito roto mandan la Presión, el Eco y la Escarcha, no los niveles de la Arena. `tune.py` acepta `L0.` para probar cambios de `config.json`, y `sim.py` acepta `--over '{...}'`.

### Guardados
No hace falta migración: los precios se calculan, no se guardan. Un guardado que ya tenía el nodo Estratos sin Ruptura lo conserva y lo puede seguir subiendo (`requisitoRed` solo frena el nivel 0 → 1; tiene test).

### Verificación
- `vitest` 243/243 (tests nuevos del softcap, del redondeo y del requisito de Estratos; precios de los tests viejos al día). `svelte-check` 0 errores. Build ok.
- Juego abierto (1366×768 y 390×844, sin scroll de página): precios redondeados en la tienda (Caudal nv3 1.000, Coral nv2 1e5, Jade nv1 1e10); Violeta nv46 con la gema "∞" y costo 1e328; nodo Estratos cerrado con Memoria en 4 y su mensaje; con Ruptura nv1 se compra y abre la pantalla de Estratos con la guía nueva. Sin errores en consola.
- **No medí fps**: el cambio no toca el dibujo.

### Decisiones (revisar)
- Con el redondeo, algunos precios seguidos quedan iguales (Caudal nv2 y nv3 cuestan 1.000) y el anillo 1 de la Red cuesta 1 Cristal por nivel (antes 1, 2, 2, 3); el anillo 2 cuesta 100, 100, 100, 1000 (antes 40…317).
- El jugador de cada 5 min queda con un hueco de 40,0 min en la Capa 1 (antes 35), justo en el límite. El de referencia, 30,8.
- La gema "∞" usa colores fijos de hielo, no una variable CSS de la Capa 1 (no hay una de cian suelta).

## C6 — Romper el Infinito, fórmula de Cristales, Infinito automático en el óptimo (2026-11-16)

| Archivo | Contenido |
| --- | --- |
| `src/core/formulas.ts` | `infinitoRoto` (Ruptura nv1, se mudó desde `infinito.ts`) y `congelada`: la economía solo se frena en 1e308 sin Romper. `enInfinito` sigue siendo "llegó a 1e308, se puede hacer Infinito". |
| `src/core/tick.ts`, `shop.ts`, `compress.ts`, `offline.ts` | Usan `congelada` donde antes `enInfinito` frenaba todo. Con el Infinito roto la Energía (tick y Puñado) pasa de 1e308 y se sigue comprando; el softcap de precios ya estaba. |
| `src/core/infinito.ts` | `cristalesAlInfinito` devuelve `Decimal`: `lc = mult + 0,35 + max(0, E − INF)/Q` (elevado a `beta`), blando sobre 1e50, enteros debajo de 1e6, `Q = 150 − Ruptura II` (`ordenesQ`). `enElOptimo`: el ritmo `10^lc / t` dejó de subir, `(P/E) × t × k ≤ Q`. `infinitoAutoListo` con tres modos: `llegar`, `optimo`, `cristales`. |
| `src/core/config1.ts`, `state.ts`, `guardado/guardado.ts` | Tipos de las constantes de Cristales; modo `optimo` (el guardado lo acepta; sin migración). |
| `src/ui/App.svelte` | Con el Infinito roto y la Energía pasada de 1e308: "Cristales al hacer Infinito: X (Y/min)" en el botón de Infinito, que brilla en el óptimo (fijo con "reducir destellos"). La Energía se ve como número, no "∞". |
| `src/ui/Automatizacion.svelte` | El modo "En el óptimo" se suma a los del Infinito automático (sale de las cadenas) con su nota. |
| `src/ui/juego.svelte.ts` | Guía nueva `c1_romper` (la presentación de Romper el Infinito): sale en la Arena la primera vez que la Energía pasa 1e308 con el Infinito roto y señala el indicador. Dice que la Energía sigue de largo, que brilla en el óptimo, que arriba de 1e308 las mejoras se encarecen (∞) y que en la Red ya se abren los Estratos. |
| `src/ui/ComoFunciona.svelte` | Sección "Romper el Infinito": fórmula con los valores de ahora, el blando y el precio con softcap. |
| `src/strings/es.ts`, `en.ts` | Textos de lo anterior; el nodo Ruptura nv1 menciona Estratos y softcap. `cristal.ganados` recibe el número ya formateado (los Cristales pueden pasar de 1e308). |
| `balance/ref_cristales.py`, `tests/fixtures/cristales_sim.json`, `tests/cristales.test.ts` | 5 casos contra `infinity_reward` de `sim_capa1.py` (sin romper, roto, sobre el blando, chico, con Ruptura II), más el freno/paso de 1e308 en el tick y los modos del automático. |

### Verificación
- `vitest` 253/253. `svelte-check` 0 errores.
- Juego abierto en 1366×768 y 390×844, sin scroll de página: la Energía pasa de 1e308 con Ruptura nv1; el indicador muestra X e Y/min y brilla cuando el ritmo baja; el Infinito automático "en el óptimo" lo hace en ese momento y "apenas llegás" sigue igual; la guía `c1_romper` aparece sobre el indicador; el panel de Automatización muestra los tres modos. Sin errores en consola.
- **No medí fps**: es texto y una animación CSS de `text-shadow`.

### Decisiones (revisar)
- **Óptimo analítico, no con memoria.** `sim_capa1.py` guarda el mejor ritmo y corta cuando cae 0,01 en log10 durante 5 s; el núcleo usa la derivada (`(P/E) × t × k ≤ Q`), sin estado nuevo en el guardado. Corta un poco antes que el simulador (cuando deja de subir, no cuando ya bajó un 2 %). Como en el simulador, si al pasar 1e308 el ritmo ya baja, el óptimo es enseguida. `t` es `tiempoInfinito`.
- **El primer Infinito sigue dando `primer_infinito` (1)**, como antes; `sim_capa1.py` no tiene ese caso especial (da 2). No lo toqué.
- El +3 de `mult` por completar Vidrio y el `mult = 0` dentro del Defecto Vidrio quedan para C7/C12 (Defectos).
- El indicador Y/min usa `tiempoInfinito`, que empieza en cada Infinito (no en cada Compresión).

## C7 — Defectos 1–4 (2026-11-16)

### Metas y requisitos, medidos de nuevo

Antes de programar: el simulador sacaba al bot de cada Defecto por el "Infinito óptimo" a los ~12 s, así que las metas viejas (200 / 1250 / 1800 / 2900) se ganaban en menos de un minuto. Con la regla nueva (dentro de un Defecto el Infinito no corre), `probe.py` mide la curva entera con el estado del jugador a la hora de la tabla de §2 (la foto sale del simulador de antes de este cambio, para que sea "la hora de la tabla actual"):

| Defecto | Estado de | 1 min | 20 min | 30 min | 40 min | Meta vieja → nueva |
|---|---|---|---|---|---|---|
| Vacancia | 2,17 h (al entrar) | 215 | 235 | 237 | 238 | 200 → **237** |
| Dislocación | 3,53 h | 1340 | 1346 | 1347 | 1348 | 1250 → **1347** |
| Macla | 4,46 h | 1810 | 1816 | 1816 | 1817 | 1800 → **1816** |
| Impureza | 5,53 h | 3463 | 3470 | 3471 | 3472 | 2900 → **3471** |

**Ojo (revisar):** más allá de 1e308 la curva dentro de un Defecto es casi plana (≈ +1 orden cada 10 min): la ventana de 20–40 min es de 1–2 órdenes. Lo que decide un Defecto es el estado con que se entra, no el tiempo adentro. Si se quiere que los 30 min "se jueguen", hace falta una mecánica (por ejemplo, que algo crezca dentro del Defecto), no otra meta. La Vacancia, antes de Romper, sí tiene curva.

Requisitos: sin cambios (Defectos nv1–4; 0 / 3 / 5 / 7 estratos). Siguen funcionando como compuertas: la Vacancia se juega antes de Romper; Dislocación entra apenas se abre el 3.er estrato (y así exige el Infinito roto, que su regla sobre la Presión necesita); Impureza, apenas se abre el 7.º.

`sim_capa1.py`: dentro de un Defecto el Infinito no saca (sin romper, la Energía se frena en 1e308); ganar con meta < 1e308 da los Cristales de un Infinito sin romper; el bot espera si está a ≤ 2 órdenes de la meta. Las reglas y recompensas se leen de `config_capa1.json` (antes estaban escritas a mano en el sim). Tabla nueva (`--robustez`, en rango): Romper 2,46 h, Vacancia 2,53 h, Dislocación 3,78 h, Macla 4,62 h, Impureza 5,67 h, **fin 1.1 6,75 h**, **fin de la capa 14,29 h**; hueco máximo 30,6 / 30,8 / 40,0 min. Actualizado en `SPEC_CAPA1.md` §2, §8, §11 y §17. Las metas 5–8 (C12) no se volvieron a medir.

### Qué se hizo

| Archivo | Contenido |
| --- | --- |
| `balance/config_capa1.json` | Metas nuevas; números de cada regla (`color_sin_efecto`, `cascada_x`, `presion_x`, `sin_mutaciones`, `densidad_x`, `derrumbes_tope_log10`, `colores_x`), de cada recompensa (`recompensa_*`) y `reintento_cristales_totales_log10` (1,5). |
| `balance/probe.py` | Reescrito: foto a la hora pedida, saca ese Defecto y los siguientes de los completos y juega sin meta ni abandono; imprime log10 E a 1/5/10/20/30/40 min. |
| `balance/ref_defectos.py`, `tests/fixtures/defectos_sim.json` | Una Arena fija del simulador en cada Defecto y con cada recompensa: `Arena.D`, `logV_parts` y `lograte`. |
| `src/core/defectos.ts` | Qué cambia cada regla y cada recompensa, `falta` (requisitos, en orden), `puedeEntrar`, `metaAlcanzada`, `conReintento`. |
| `src/core/formulas.ts`, `shop.ts` | Las fórmulas consultan `defectos.ts`: Violeta sin efecto, Cascada × 0, Presión × 0,5, sin Mutaciones, Densidad × 0,85, tope de derrumbes por grano, colores ^0,5; hito ×6, anillo ×1,12, término cuadrático ×0,9, +0,1 a c. |
| `src/core/infinito.ts` | `reiniciarArena` (la comparten el Infinito, entrar y abandonar), `entrarDefecto`, `abandonarDefecto`, `ganarDefecto`. `infinito()` no hace nada dentro de un Defecto. |
| `src/core/tick.ts` | El Infinito automático no corre en un Defecto; al llegar a la meta se gana (con `elegirSola` si el Infinito automático está prendido). El autocomprador de Violeta no compra en la Vacancia. |
| `src/core/red.ts` | Cristalografía II cuenta los Defectos completos. |
| `src/core/state.ts`, `guardado/guardado.ts` | `defectos: { completos, actual, reintento }`; al cargar se descartan ids que no existen. Sin versión nueva (lo completa `completar`). |
| `src/ui/Defectos.svelte` | La pantalla: los cuatro en una cadena de escarcha, cada uno con su red cristalina rota (un átomo que falta, media red corrida, la red reflejada, un átomo ajeno); ficha de placa con regla, meta, requisito y recompensa; gema Entrar (con lo que falta) o Abandonar (con lo que cambia: adentro y, tachado, afuera). Sugerencia "volvé con X Cristales totales" después de abandonar. |
| `src/ui/defectos.ts` | Textos de regla y recompensa con los números de config, y `cambios(s)`: los multiplicadores del Defecto en curso con y sin la regla. |
| `src/ui/App.svelte` | En la Arena, debajo de los contadores: "Defecto · X", la meta, los multiplicadores que cambia y Abandonar. El botón de abajo muestra la meta del Defecto en vez del Infinito. |
| `src/ui/Tienda.svelte` | Vacancia: la muestra de Violeta agrietada y su nivel y efecto tachados. |
| `src/render/lienzo.ts`, `pilaVisual.ts`, `Pila.svelte` | `u_defecto` en la pasada a pantalla: grieta con luz violeta (Vacancia), la mitad de arriba corrida 14 celdas (Dislocación), espejo en un plano inclinado (Macla), manchas apagadas (Impureza). |
| `src/ui/juego.svelte.ts` | `entrarDefectoYa`, `abandonarDefectoYa`; aviso al ganar; guía `c1_defectos` una sola vez al tener Defectos nv1 (sale al mirar su pantalla); el botón de Infinito no hace nada en un Defecto. En desarrollo, `juego` queda en `window`. |
| `src/ui/ComoFunciona.svelte` | Página de Defectos: una fila por Defecto (regla → recompensa, meta, ✓). Las fórmulas de colores y anillos usan el hito, el término cuadrático y la base con sus recompensas. |
| `src/ui/Debug.svelte` | "Lista para los Defectos (mitad de la 1.1)". |

### Verificación
- `vitest` 277/277 (24 nuevos en `tests/defectos.test.ts`: las 10 combinaciones contra el simulador, cada regla, cada recompensa, requisitos, entrar/abandonar/ganar, el Infinito automático que no saca, Cristalografía II y el guardado). `svelte-check` 0 errores.
- Juego abierto (1366×768 y 390×844, sin scroll de página): entrar a Dislocación (la Energía pasa 1e308 y el Infinito automático no la saca; el cartel muestra Cascada ×1 y la Presión a la mitad), abandonar (sin perder Cristales, con la sugerencia ×30), ganar Vacancia (queda superada, da Cristales y la reliquia la elige la regla). Las cuatro deformaciones de la pila y Violeta agrietado, vistos.
- **No medí fps**: el panel del navegador quedó oculto (la página corre en segundo plano). El cambio en el shader son unas pocas operaciones por píxel y solo con un Defecto en curso.

### Decisiones (revisar)
- **Macla** apaga el multiplicador de la Mutación de Colores (como `logV_parts`) además de sacar las Mutaciones de la tienda; como entrar reinicia la corrida, en el juego es lo mismo.
- **Vacancia**: el autocomprador de Violeta no compra dentro del Defecto (el bot del simulador tampoco); a mano sí se puede.
- **Ganar con la meta por debajo de 1e308** (Vacancia) da los Cristales de un Infinito sin romper; antes el simulador no daba nada.
- El aviso "+X Cristales" puede decir +0 cuando lo ganado es mucho menor que los Cristales totales (resta de `Decimal`); ya pasaba con el Infinito automático.
- El estado de debug "Lista para los Defectos" es tan fuerte que, desde cero, hace un Infinito automático por tick: sirve para entrar, no para jugar adentro.

## C8 — Test de balance de la 1.1, offline y Estadísticas (2026-11-17)

### Qué se hizo

| Archivo | Contenido |
| --- | --- |
| `tests/balance_capa1.test.ts` | Nuevo, **lento** (no corre con `npm test`; `npm run test:lento`, ~2 s de reloj). El bot de `sim_capa1.py` con el núcleo real hasta el fin de la 1.1: humano cada 15 s (Caudal y colores lo más barato primero, Cascada y Mutaciones con margen, Compresión, Infinito a mano antes de Memoria nv4), mismos pasos (0,5 / 1 / 2 s), tienda de la Capa 1 lo más barato primero con `prioridad_bot`, Defectos en orden con el abandono del sim (0,5 órdenes en 2 min a más de 2 de la meta, o 45 min) y el reintento ×30. Reliquias: la regla del panel de Automatización (Completar fusiones) y engarzar las mejores; fusiona a mano mientras no hay Engarces II. Infinito automático "en el óptimo". Verifica la tabla de §2 con ±10 %, Estratos ≥ Romper, hueco < 40 min, y 12 h offline < 12 h activas. |
| `src/core/offline.ts` | `fueraDeLinea(s, segundos, eficiencia = 1)`: simula `segundos × eficiencia` de juego con el mismo tick. Ya no corta en 1e308: con el Infinito automático prendido sigue haciendo Infinitos (la reliquia la elige la regla, dentro de tick); si no, para ahí. Devuelve además Infinitos, Cristales ganados y los `s_k` de antes. |
| `src/ui/juego.svelte.ts` | El primer salto después de cargar (juego cerrado) usa `fuera_de_linea_eficiencia` (0,7) si ya hay Capa 1. Los saltos con la pestaña abierta pero oculta siguen enteros. La tarjeta sale si algo cambió (antes no salía con la Energía en 1e308, que con el Infinito roto es casi siempre). |
| `src/ui/Paneles.svelte` | "Mientras no estabas" de la Capa 1: placa de hielo con los Cristales ganados (o la Energía, sin Infinitos), Infinitos y reliquias con su regla, cuánto creció cada estrato (×10^x) y la nota "rinde ×0,7 del tiempo". La de la Capa 0 no cambió. |
| `src/ui/desglose.ts`, `src/ui/Estadisticas.svelte` | `desgloseV`: log10 V por fuente (colores, anillos, Cascada, Mutaciones, Presión, Eco, reliquias engarzadas, Defectos) que suma exacto `valor(s).log10()`. Cada fuente se mide sin Defectos; "Defectos" es lo que cambian sus recompensas (positivo) y la regla en curso (negativo). Pestaña nueva **Valor** en Estadísticas (aparece con el primer Infinito): barra sobre placa de hielo y filas con su % y +log10. |
| `src/core/config1.ts`, `src/core/tick.ts` | Tipos de `prioridad_bot`, `abandono_min`, `meta_1_1_estrato8_log10`, `fuera_de_linea_eficiencia`; `comprarConMargen` exportada (la usa el bot). |
| `src/strings/es.ts`, `en.ts` | Textos de la tarjeta y de la pestaña Valor. |
| `tests/desglose.test.ts` | 3 tests de `desgloseV` (suma exacta, Eco, recompensas suman y una regla resta). |

### El test de balance no da: en qué se diferencia el juego del simulador

`python balance/sim_capa1.py` da la tabla de §2 (fin 1.1 6,75 h). El núcleo con el bot:

| Hito | Juego | Sim | | Juego con la diferencia 1 "arreglada" (solo diagnóstico) |
|---|---|---|---|---|
| Segundo Infinito | 1,87 h | 1,21 | +55 % | **1,21** |
| Memoria completa | 3,06 h | 1,81 | | **1,81** |
| Romper = Estratos | 3,73 h | 2,46 | | 2,23 (−9 %) |
| Vacancia | 3,78 h | 2,53 | | 2,28 (−10 %) |
| Dislocación | 6,04 h | 3,78 | | 4,54 (+20 %) |
| Macla | 6,66 h | 4,62 | | 5,16 |
| Impureza | 7,20 h | 5,67 | | 5,70 |
| **Fin 1.1** | 7,50 h | **6,75** | +11 % | 6,01 (−11 %) |
| Hueco máximo | 71 min | 31 | | 45 |

No cambié ningún número. Las diferencias, en orden de peso:

1. **La Memoria comprada después del Infinito no le da sus compresiones a la corrida que ya empezó.** En el juego el Infinito reinicia la Arena con las compresiones que conserva la Red *en ese momento*; el jugador recién después compra Memoria nv1 y su corrida sigue en la Compresión 0. El simulador compra en la Red *antes* de armar la corrida siguiente y arranca en la 3. Son 3 corridas de más (15,5 + 13,4 + 10,6 = 39,5 min); el resto de esa corrida coincide al décimo de minuto (72,9 min en los dos). Pasa con cada nivel de Memoria y de Sedimentación. Dándole al bot esas compresiones (solo para medir), el segundo Infinito y la Memoria completa salen idénticos al sim: la Arena del núcleo y la del sim son la misma.
2. **Las reliquias.** El bot del sim elige con su propia estimación y en el 2.º y 3.er Infinito toma Mutaciones y Cascada, que no puede engarzar (un solo espacio). La regla del panel (Completar fusiones) apila Cauce y llega antes a Coral y Jade: el juego rompe el Infinito ~14 min antes. Además, en el sim **abandonar un Defecto también da reliquia** (`pick_relic` corre después de cada corrida); en el juego no.
3. **El abandono de los Defectos está en el filo.** Más allá de 1e308 la Energía dentro de un Defecto sube ~0,25–0,5 órdenes por minuto, justo alrededor del umbral de abandono (0,5 en 2 min). El sim abandona la Dislocación a los ~8 min y reintenta con ×30 Cristales; el juego, que entra con 4 estratos (por 1 y 2) en vez de 3, sube ~1 orden/min, nunca "se estanca" y se queda los 45 min enteros sin ganar nada, tres veces (2,25 h perdidas). Eso explica la Dislocación tarde y el hueco de 45–71 min.

Falta decidir: (a) si la Memoria/Sedimentación comprada sube las compresiones de la corrida en curso (lo que asume el sim y lo que un jugador espera al comprarla), o si el sim compra después de armar la corrida; (b) si el bot del test elige reliquias como el sim o con la regla del panel (se pidió la regla); (c) si abandonar da reliquia; (d) un criterio de abandono más robusto en los dos bots (por ejemplo, "al ritmo actual no llega a la meta antes de N min") en vez del umbral de 0,5 órdenes.

### Verificación

- `npm test`: 280 tests en verde (el lento, saltado). `npm run test:lento`: el offline y "Estratos ≥ Romper" pasan; los tiempos fallan (tabla de arriba). `tsc` y `svelte-check` sin errores.
- Juego abierto (1366×768 y 390×844, sin scroll de página): partida de mitad de la 1.1 (Ruptura nv1, 4 estratos, Infinito automático en el óptimo) guardada y atrasada 12 h → 2.679 Infinitos automáticos, +1,53e6 Cristales, cada estrato ×10^30,8, en la placa de hielo. Pestaña Valor con Presión y Eco y su %. Sin errores en consola.
- **No medido:** fps (pantallas de DOM quieto con una animación de entrada); cuánto tarda el cálculo de 12 h en el navegador (unos segundos en negro tras "Continuar"; en Node, ~1 s); celular real.

### Decisiones (revisar)

- **El ×0,7 es del tiempo, no de la producción.** 12 h afuera = 8,4 h de juego (Energía, Estratos, Infinitos con su reliquia). Multiplicar la producción por 0,7 en un juego exponencial casi no cambia nada. Así "offline nunca rinde más que activo" vale por construcción.
- **Solo con el juego cerrado y solo en la Capa 1.** La pestaña abierta (oculta) sigue entera (§1: "nunca castiga al que deja la pestaña abierta"); la Capa 0 offline sigue como antes.
- **Los Infinitos offline no tienen foto de la pila** (esas reliquias quedan sin cara, como las migradas).
- En "Valor", el % es sobre la suma de lo que suma (como en Producción); una fuente que resta muestra "—".

### C8, segunda parte (2026-11-17): las cuatro decisiones, y el test da

1. **Memoria y Sedimentación, en el juego** (`src/core/red.ts`, `comprarRed`): si la corrida está en menos compresiones de las que el nodo conserva, salta ahí al comprarlo. La corrida conserva lo que tenía (Energía, niveles); solo sube la Densidad, y la pila hace la implosión de la Compresión (la que ya tenía `Pila.svelte` al subir `compresiones`). Test en `tests/red.test.ts`.
2. **Reliquias, en el simulador** (`pick_relic` de `sim_capa1.py`): la regla por defecto del panel (Completar fusiones, como `tipoAutomatico`), nunca un tipo que no puede engarzar, y engarza las mejores como `equiparMejores`. Abandonar un Defecto ya no da reliquia ni cuenta como Infinito. **Además encontré otro desvío del sim**: al abandonar con la Energía pasada de 1e308 cobraba los Cristales de ese Infinito (`infinity_reward` no miraba si se ganó); el juego no da nada. Arreglado en el sim.
3. **Abandono de Defectos** (sim y test, mismo criterio, constantes nuevas en `config_capa1.json`): desde los 10 min de Defecto, si al ritmo de los últimos 3 min la meta queda a más de 30 min, abandona (o a los 45 min, como antes); se reintenta con ×30 Cristales totales.
4. **Offline sin pantalla negra**: `fueraDeLineaPasos` (generador en `src/core/offline.ts`; `fueraDeLinea` lo consume entero). El bucle corre ~12 ms de cálculo por cuadro y `Paneles.svelte` muestra una barra (placa de hielo en la Capa 1, ámbar en la Capa 0). Mientras calcula no avanza ni guarda nada nuevo (si se cierra, el guardado sigue siendo el de antes de la ausencia). Medido: 12 h de una partida de mitad de la 1.1 en ~2,5 s, con la barra. **No hice** los "saltos grandes donde no hay decisiones": con el Infinito automático hay decisiones cada pocos segundos de juego (cada Infinito), así que un salto largo cambiaría el resultado; queda para cuando haga falta.

**Simulador** (`python balance/sim_capa1.py --robustez`, sin recalibrar: la tabla se movió poco y quedó en rango, no toqué multiplicadores):

| Hito | 15 s | 60 s | 5 min | antes (15 s) |
|---|---|---|---|---|
| Segundo Infinito | 1,21 | 1,37 | 2,33 | 1,21 |
| Memoria completa | 1,81 | 1,97 | 3,00 | 1,81 |
| Romper = Estratos | 2,30 | 2,46 | 3,49 | 2,46 |
| Vacancia | 2,37 | 2,53 | 3,56 | 2,53 |
| Dislocación | 3,70 | 3,85 | 4,88 | 3,78 |
| Macla | 4,52 | 4,68 | 5,71 | 4,62 |
| Impureza | 5,29 | 5,45 | 6,48 | 5,67 |
| **Fin 1.1** | **6,63** | 6,78 | 7,82 | 6,75 |
| **Fin capa** | **14,16** | 14,35 | 15,42 | 14,29 |
| Hueco máximo (min) | 30,6 | 30,8 | 40,0 | 30,6 |

Ningún hueco de más de 40 min (el jugador de cada 5 min queda justo en 40,0, como antes). Pesos por fuente sin cambios (fin 1.1: Presión 58 %, Colores 19 %, Eco 13 %).

**Test de balance con el núcleo real** (`npm run test:lento`, 12/12 en verde):

| Hito | Juego | Sim | |
|---|---|---|---|
| Segundo Infinito | 1,21 | 1,21 | 0 % |
| Memoria completa | 1,81 | 1,81 | 0 % |
| Romper = Estratos | 2,30 | 2,30 | 0 % |
| Vacancia | 2,35 | 2,37 | −1 % |
| Dislocación | 3,59 | 3,70 | −3 % |
| Macla | 4,19 | 4,52 | −7 % |
| Impureza | 5,36 | 5,29 | +1 % |
| **Fin 1.1** | **6,26** | 6,63 | −6 % |
| Hueco máximo | 32,4 min | 30,6 | |

Lo que queda de diferencia (dentro del ±10 %) está en los Defectos: el Infinito automático del juego corta en el óptimo analítico (un poco antes que el sim, que espera a que el ritmo caiga 0,01) y los autocompradores compran por tipo en orden fijo en vez de lo más barato primero (ya pasaba en la Capa 0, +3 %).

**Verificación**: 281 tests en verde con `npm test`, 12/12 en `npm run test:lento`, `svelte-check` 0 errores. En el navegador: la barra de hielo avanza (35/100 al segundo y medio) y después sale la tarjeta de regreso. `SPEC_CAPA1.md` al día: §2 (tabla, aperturas de estratos, nota C8), §6.3 (Memoria a mitad de corrida), §8 (abandono), §12 (offline), §17.

**Decisión (revisar)**: comprar Memoria a mitad de corrida **no reinicia** la corrida (sube la Densidad y sigue). Es lo que favorece al jugador; el sim siempre la compra al principio, así que para el balance da igual.

## Auditoría de la 1.1: inventario de reliquias con tope (2026-11-18)

**Problema**: el inventario crecía sin límite. Con el Infinito automático en el óptimo hay un Infinito cada ~10 s, y en la 1.1 no hay fusión automática (Engarces II es del anillo 3, 1.2): miles de piezas offline, guardado de ~1 MB y una grilla enorme.

**Decisión (del usuario)**: 24 casilleros fijos. **Con el inventario lleno el Infinito no deja reliquia**, y se explica. Así la fusión automática de Engarces II pasa a importar.

- `src/core/relicario.ts`: `inventarioLleno(s)`; `elegir` descarta la reliquia si no hay lugar, salvo que con Engarces II la nueva complete tres iguales y la fusión le haga lugar. Un guardado viejo con más de 24 conserva todas sus piezas, pero no suma ninguna hasta bajar de su cantidad.
- `Relicario.svelte`: la grilla ya no crece (muestra todas si son más de 24); el encabezado dice `n/24` (en rojo coral si está lleno); en la elección, la cuenta cambia a "Inventario lleno: fusioná en N s o se pierde"; sin elección pendiente, la ayuda explica que los Infinitos no dejan reliquias hasta fusionar y que Engarces II las fusiona solas. Cadenas en `es.ts` y `en.ts`.
- **Balance sin cambios**: el sim modela el inventario siempre fusionado y el bot del test lento fusiona en cada revisión; el test lento ahora comprueba que **el inventario nunca se llena** jugando así (13/13). No hizo falta tocar el simulador. `SPEC_CAPA1.md` §5 al día.

**Verificación**: 282 tests en verde (`npm test`, uno nuevo en `relicario.test.ts`), 13/13 en `npm run test:lento`, `tsc` y `svelte-check` 0 errores. En el navegador con 24 piezas: 1366×768 y 390×844 sin scroll de página (el aviso en una línea con la cuenta; la primera versión, en un renglón aparte, empujaba la elección 27 px fuera de la ventana). En el celular el `n/24` no se ve (el encabezado del inventario se oculta en móvil), pero sí los avisos.

**Pendiente de la auditoría**: el aviso "+X Cristales" en cada Infinito automático (uno cada pocos segundos, va contra "Reducir destellos"); fps con el Relicario lleno; el build dentro de un iframe; terminar la pasada de accesibilidad.

## Auditoría de la 1.1: avisos del Infinito automático y sección "Avisos" en Ajustes (2026-11-18)

**Problema**: cada Infinito automático (uno cada pocos segundos) sacaba dos avisos: el de abajo ("+X Cristales") y el texto que flota sobre la pila. Va contra "Reducir destellos".

- El texto sobre la pila y el sonido quedan solo para el Infinito **a mano**.
- Los Cristales del Infinito automático van juntos: el primero sale, y después uno cada 30 s de juego con la suma ("+X Cristales en N Infinitos"). `avisoAutomatico` en `juego.svelte.ts`, con test en `tests/juego.test.ts`.
- **Decisión (del usuario)**: Ajustes → Juego → **Avisos**, una sección desplegable con un interruptor por tipo: Algo nuevo, Infinito a mano, Infinito automático, Reliquia elegida sola, Defectos, Logros. Todos prendidos por defecto; se guardan con los ajustes (`aviso_*` en `ajustes.svelte.ts`). Todos los avisos de abajo pasan por `avisar(tipo, texto)`; el de logros, por `ajustes.aviso_logros` en `Logros.svelte`.
- En el celular, las casillas de Ajustes quedan siempre a la derecha (antes bajaban a la izquierda según el largo del texto).

**Verificación**: 283 tests en verde, `tsc` y `svelte-check` 0 errores. En el navegador: la sección abre, el contador marca 5/6 al apagar uno y queda guardado en el almacenamiento local; sin scroll de página en 1366×768 ni en 390×844 (solo scrollea la lista de Ajustes).

## Auditoría de la 1.1: fps, iframe y accesibilidad (2026-11-18)

Medido en Edge headless (GPU por ANGLE/D3D11), servidor de desarrollo, con el Relicario lleno (24 piezas con foto), la Red, 8 estratos abiertos, la Arena y Automatización:

| Pantalla | 1366×768 | 390×844 (dpr 3) | Scroll de página |
|---|---|---|---|
| Relicario lleno | 60 fps (un cuadro de 67 ms al dibujarlo por primera vez; en una segunda medición de 6 s, ninguno de más de 25 ms) | 60 | no |
| Red, Estratos, Arena, Automatización | 60 fps, peor cuadro 17 ms | 60 | no |

**Ojo con las mediciones por CDP**: después de editar un módulo, Vite lo sirve con `?t=` y `import('/src/ui/juego.svelte.ts')` da otra copia; hay que importar la URL que figura en `performance.getEntriesByType('resource')`. La primera tanda de esta auditoría midió la Arena cinco veces por eso.

**Build en el iframe de itch** (`scripts/itch-falso.mjs`: subcarpeta, otro origen, gzip): arranca, 1280×720 sin scroll, carga el worker de la pila y el almacenamiento local funciona dentro del iframe. Las pantallas de la Capa 1 dentro del iframe no se probaron (en el build no se puede inyectar un estado).

**Accesibilidad** (revisión por DOM de Relicario, Red, Estratos, Defectos y Automatización, sin el panel de debug): ningún control sin nombre, ningún texto con contraste por debajo de 4,5 (3 en texto grande), ningún `tabindex` positivo. Arreglado:
- Los cuadros de nivel de la ficha de la Red ("Ver qué da el nivel N") medían 12×24 px; ahora 24×24 (WCAG 2.5.8). El cuadro visible sigue de 8 px, solo más separados.
- `Relicario.svelte`: `bind:this` a un objeto común daba un aviso de Svelte por pieza; ahora las celdas se buscan por `data-pieza`. La animación de fusión sigue (3 vuelos y la nueva naciendo).
- La casilla de "Comprimir sola" mide 17×20, pero su etiqueta entera (200×44) es tocable: está bien.

**Queda afuera**: Lighthouse sobre las pantallas de la Capa 1 (Lighthouse solo mira la carga, que es la pantalla de título); probar con lector de pantalla real.

## C10: la Escarcha (2026-11-18)

**Hito actual: C10 terminado.** Sigue C11 (anillo 3 de la Red, Pulido, Deshielo completo).

**Antes de programar**, `python balance/sim_capa1.py` con los números de antes del rebalanceo: fin de la capa 14,16 h (rango 14–16), Defectos 5–8 a 9,11 / 11,61 / 12,16 / 13,16 h, hueco máximo 30,6 min (< 40), fuente más pesada al fin de la 1.2 Presión 45 % (Escarcha 40 %, < 65 %). **No hizo falta recalibrar.**

Hecho:
- **Núcleo** (`src/core/escarcha.ts`): `logX` crece con `g = g_base × (1 + g_por_presion × Presión) × 1,12^Crecimiento × Germen × Eco II × Fatiga`; aporte `m × logX` a log10 V (dentro de la Densidad) y penalidad `−log10(1 + logX/H)` en `energiaPorGrano` (la Producción y el Puñado). Romper: reloj de 30 min, conserva ×0,5 y da `⌊logX × 0,5 / 10⌋ × Deshielo` Esquirlas. Mejoras Crecimiento, Brillo y Aguante a `10^round(c0 + paso × L)` Esquirlas. No corre en el Defecto Vidrio. Se abre (y queda abierta) con el Estrato 8 en 1e100 y los 4 primeros Defectos; con ella se abre el anillo 3 de la Red (`escarchaAbierta`). Deshielo la rompe sola desde `tick` (interruptor `auto.escarcha`).
- **Offline**: sin cálculo aparte; la hace crecer el mismo `tick` del worker de a tramos (×0,7 del tiempo). La tarjeta de regreso muestra "Escarcha: espesor +x".
- **Guardado**: `escarcha` en el estado (completado y saneado al cargar); persiste en el Infinito y al entrar o salir de un Defecto.
- **Interfaz**: pantalla Escarcha (`src/ui/Escarcha.svelte`, placa de hielo y gemas): placa de 61 hexágonos que se cubre de escarcha desde el borde con el espesor y salta en pedazos al romperla (con Reducir destellos o Reducir movimiento solo se apaga); ficha con Espesor, Suma (×), Frena (÷), los factores de g, Romper con su cuenta regresiva y las tres mejoras con efecto y fórmula; tooltips con la cuenta. Contador de Esquirlas arriba. Fila "Romper la Escarcha" en Automatización → Reinicios (se ve desde que se abre; se activa con Deshielo). Estadísticas: Escarcha en Valor y en Producción (aporte y freno). "Cómo funciona" con sus cuatro fórmulas. Guía `c1_escarcha` abierta. La nevada decorativa se llama ahora `Nevada.svelte`.
- **Pila**: uniforme `u_escarcha` en `lienzo.ts`: una franja fría fina por dentro del borde y un ribete de cristales por fuera, que se ensanchan con `logX / (logX + 50)`; los cristales no titilan con Reducir destellos.
- **Test**: `balance/ref_escarcha.py` → `tests/fixtures/escarcha_sim.json` (3 casos, 1 h con el mismo estado: logX, Esquirlas, rupturas, g, H, m). `tests/escarcha.test.ts`: los 3 casos idénticos al sim, más producción, Vidrio, hito, persistencia en el Infinito, romper, mejoras, offline y guardado.
- **Arreglo de la tarjeta de regreso** (pedido durante el hito): la cifra, las fichas de los estratos y el pie se salían de la placa; ahora el ancho incluye el relleno y la cifra se achica. Con el Infinito roto y sin Infinitos en la ausencia decía "la Arena te espera en 1e308" (falso): ahora dice "Sin Infinitos en este rato: la Energía siguió subiendo".

**Decisiones (revisar)**:
- Las recompensas de Fatiga e Inclusión para la Escarcha estaban escritas a mano en el sim (×2, ×1,5): pasaron a `config_capa1.json` y el sim las lee (salida idéntica).
- `g` lee la Presión en vivo; el sim la toma al empezar cada corrida. El test compara con los estratos quietos.
- El hito se marca en `tick` apenas se cumple; el sim lo marca al terminar ese Infinito (unos minutos de diferencia).
- El anillo 3 se puede comprar desde que se abre la Escarcha, pero Sedimento II, Capilaridad, Abismo, Engarces II y Cristalografía II ya tenían efecto; **Defectos II no abre nada todavía** (Defectos 5–8 son de C12) y el Pulido es de C11.

**Verificación**: 292 tests en verde (`npm test`), 13/13 en `npm run test:lento`, `tsc` y `svelte-check` 0 errores, el sim da lo mismo que antes. En el navegador (1366×768 y 390×844, sin scroll de página): pantalla Escarcha, romper (60,9 → 30,5 de espesor, +3 Esquirlas, reloj a 30 min; la animación de los hexágonos verificada por su estado a mitad de camino), fila de Automatización con Deshielo, contador arriba, tarjeta de regreso arreglada, franja de escarcha en el borde de la pila. Durante la prueba apareció y se arregló un bug: el Infinito borraba la Escarcha (`reiniciarArena` no la conservaba).

**No medido**: fps (el panel del navegador estaba oculto); celular real.

**Ajuste de la ficha de la Escarcha**: los nombres de las mejoras quedaban amontonados porque la ficha tenía alto fijo y la grilla aplastaba las gemas (con `overflow` oculto pueden achicarse por debajo de su contenido, y se perdía la línea del efecto). Ahora la ficha toma el alto de lo que tiene (si no entra, scrollea solo ella), los botones no se achican y tienen más aire. En ventanas bajas se oculta la fórmula y en el celular los factores de g (están en los tooltips y en "Cómo funciona"). Medido: entra entera, sin scroll, en 1366×768, 1280×720 y 390×844.

## C11: anillo 3 de la Red, Pulido y Deshielo (2026-11-18)

**Hito actual: C11 terminado.** Siguió C12 (abajo).

**Qué ya estaba** (de C10 y del rebalanceo del bloque 6), revisado contra `sim_capa1.py`: Capilaridad (separación), Sedimento II (`k^e`), Abismo (estratos llenos), Cristalografía II (facetas por Defecto), Compactación II (Densidad por anillo), Eco II, Germen y Frío (en g y H de la Escarcha), Ruptura II (Q), Deshielo (rompe sola desde `tick` con el interruptor `auto.escarcha`, Esquirlas ×), Engarces II (3 espacios y fusión automática en `elegir`). La apertura del anillo 3 con la Escarcha también.

Hecho:
- **Pulido nuevo** (`pulir`, `puedePulir`, `costoPulido(Log10)` en `relicario.ts`): gasta Esquirlas y sube **una** pieza un color, sin fusionar; conserva pila y engarce; si completa tres iguales con "fusionar solas" y Engarces II, se fusiona. Costo `10^round(1 + 1,5 × n × pulido_x)` (`escarcha.pulido` en config; Engarces II da `pulido_x`).
- **Calibración en el simulador**: `esq_items` ofrece pulir cada pieza engarzada (la más barata primero) y al comprar suma `2 × 3^n` al conteo en base 3 (es pasar una pieza de n a n+1). Probado (Ámbar equivalente que da el Pulido en toda la partida, contra 1531 Infinitos): `paso` 0,477 → 1,59 M (Cauce de nv6 a nv13 en la última media hora); 1 → 2126 (reemplaza a la fusión); `c0` 2 → nunca se compra; **1,5 → 56** (Ámbar → Coral a las 11,5 h y nv3 → nv4 con Engarces II nv4). La tabla de §2 no cambia (fin 14,16 h, hueco 30,6 min). `SPEC_CAPA1.md` §5 lo explica.
- **Relicario**: en la ficha de la pieza, con la Escarcha abierta, "Pulir → Color · costo" (gema; apagada si no alcanza; tooltip y etiqueta con las Esquirlas). La pieza se cristaliza al subir y, si se fusiona, vuelan las tres.
- **Red**: la primera vez que se mira con la Escarcha abierta, el hielo grueso de los 12 nodos del anillo 3 se agrieta, gotea y se derrite en cadena (~3,5 s); se anota en `vistos.red_anillo3` (guardado), una vez por partida. Con Reducir destellos solo se anota.
- **Tooltips** en una frase: Eco II ("Cuantos más Cristales juntaste, más rápido crece la Escarcha: × (1 + 0,001 por cada orden…)") y Ruptura II ("Pasar el Infinito rinde más: cada ×10 de Cristales pide N órdenes de Energía menos"), en español e inglés.
- **Cómo funciona**: fila del Pulido en el Relicario (fórmula y `pulido_x` actual) con la Escarcha abierta.
- **Tests**: `tests/anillo3.test.ts` (9): apertura con la Escarcha, Germen, Eco II, Frío, Ruptura II, Deshielo (rompe desde `tick`, Esquirlas ×, no sin el nodo ni con el interruptor apagado), Engarces II (3 espacios), costo del Pulido (crece con el nivel, Engarces II lo abarata), pulir (sube una, gasta, no hace nada sin alcanzar / sin Escarcha / con id falso) y fusión al completar tres.

**Decisiones (revisar)**:
- Se puede pulir cualquier pieza (también sin engarzar); el bot del sim solo pule las engarzadas.
- `pulido_x` multiplica solo el término del nivel (como en la spec vieja): pulir una Ámbar cuesta 10 siempre.
- **Defectos II** sigue sin abrir nada: los Defectos 5–8 son de C12.

**Verificación**: 301 tests en verde, `tsc` y `svelte-check` 0 errores, `python balance/sim_capa1.py` igual que antes. En el navegador (1366×768 y 390×844, sin scroll de página): deshielo del anillo 3 (los 12 bloques en el DOM a 0,6 s y a la vista en captura), Pulir Coral +1 → Jade +1 (5.000 → 4.000 Esquirlas, engarce y efecto ^1,105 al día), Deshielo nv2 rompiendo sola (100 → 50 de espesor, +10 Esquirlas) con la fila "AUTO" en Automatización, Red y Relicario enteros en el celular.

**Después (pedido del usuario): la placa de Escarcha crece de verdad.** En [Escarcha.svelte](src/ui/Escarcha.svelte) la placa nace como un solo hexágono y se agranda hacia afuera con el espesor (6 anillos, 127 hexágonos). Cada hexágono aparece chico y crece cuando el borde lo alcanza, y el ruido hace el borde irregular. El alcance es `0,6 + 6,5 × logX / (logX + H)`, con H la base de config (es solo visual). El borde que está creciendo titila apenas. Al romperla, la placa se sacude, se raja con 7 grietas blancas desde el centro y los hexágonos que había saltan en pedazos; debajo queda la placa con la mitad del espesor, ya más chica. Con Reducir destellos o con prefers-reduced-motion no hay sacudón ni vuelo, los pedazos solo se apagan. Probado en el navegador: espesor 0,5 → semilla, 15 → 7 hexágonos, 400 → casi entera; Romper con 120 → pedazos volando y placa de 60. Sin scroll en 390×844.

**No medido**: fps (la animación del deshielo son 12 grupos SVG con CSS, unos segundos y una vez); no corrí `npm run test:lento`.

## C12: Defectos 5–8 (2026-11-18)

**Hito actual: C12 terminado.** Sigue C13 (fin de la Capa 1 y test de balance completo).

**Balance (primero simulador, después spec, después código).** Las metas viejas (1200 / 700 / 1800 / 25000) se ganaban en 0 min: el jugador ya entraba muy por encima. Medidas con `probe.py` con el estado con que el bot entra a cada uno (las fotos salen del simulador con las metas nuevas):
- Fatiga **11464** (30 min), Frontera **7067** (30 min), Inclusión **23500** (~25 min: se aplana entre 30 y 40 y con la de 30 el bot perdía y la tabla se corría 0,6 h), Vidrio **41518** (~20 min; su curva es casi plana: con 41520 el bot abandonaba).
- **Ganar un Defecto cuenta como compra** en el hueco máximo (simulador y `balance_capa1.test.ts`): da una recompensa permanente. Sin eso Vidrio dejaba 49 min sin compras (19 de Defecto + un Infinito de 30).
- Tabla nueva (15 s): Fatiga 9,47 h, Frontera 11,95 h, Inclusión 12,57 h, Vidrio 13,49 h, **fin de la capa 14,49 h** (era 14,16); 60 s: 14,35 h; 5 min: 15,48 h. Hueco máximo 30,8 min. La 1.1 no cambia.
- Constantes que estaban fijas en el simulador, a config: `fatiga.decada_s` (600) y `frontera.recompensa_densidad` (0,2).
- `SPEC_CAPA1.md` §2 (tabla) y §8 (metas, tabla de calibración, qué siente cada uno).

**Núcleo** (`defectos.ts`; las fórmulas lo consultan): `DEFECTOS` tiene los 8 y `DEFECTOS_11` los 4 que abren la Escarcha; "en orden" es dentro de cada grupo de 4.
- Fatiga: `fatigaLog10` = tiempoCorrida / 600, se resta fuera de la Densidad (como la penalidad de la Escarcha). La Compresión reinicia el reloj, igual que `rt` del sim.
- Frontera: Densidad = 1 (`densidadFija`); recompensa +0,2 (`densidadExtra`).
- Inclusión: `presionX` = 0.
- Vidrio (`enVidrio`): sin efectos de reliquias, sin Eco, sin Escarcha, estratos quietos y `cristalesRedLog10` = 0 (como `crys_mult` del sim). Recompensa ×1000 Cristales dentro de `cristalesRedLog10`.
- Fatiga ×2 a g e Inclusión ×1,5 a H ya estaban desde C10.

**Interfaz**:
- Pantalla de Defectos: con la Escarcha abierta, dos pestañas arriba de la cadena (Defectos / Defectos II), cuatro por vez (la pantalla sigue sin scroll). Redes cristalinas nuevas: Fatiga se apaga hacia la derecha, Frontera con un grano girado y su borde, Inclusión con una burbuja, Vidrio sin orden. Requisitos con el nodo y los Cristales totales que piden.
- Lo que cambia ahora (ficha y Arena): Fatiga "Producción ×10^−x" y "÷10 en m:ss"; Frontera "Densidad ^1" con la de afuera tachada; Inclusión "Presión ×1" y lo que aporta la Escarcha; Vidrio Eco, Escarcha y Reliquias ×1.
- Pila (shader, `lienzo.ts`): 5 latido que se apaga hacia el borde, 6 bordes de grano (Voronoi), 7 burbujas con borde de luz, 8 vidrio gris azulado con un reflejo.
- La ficha scrollea por dentro si no entra (Vidrio en 390×844 se encimaba).
- Debug: "Lista para Defectos II (1.2)".
- Textos en español e inglés.

**Tests**: `ref_defectos.py` genera los 8 Defectos adentro y completos (más Frontera completo dentro de Macla) con `tiempo_corrida` 900 para la Fatiga; el núcleo da lo mismo que el sim en los 19 casos. Test nuevo del orden en Defectos II.

**Verificación**: 311 tests en verde, `npm run test:lento` en verde (13), `tsc` y `svelte-check` 0 errores. En el navegador (1366×768 y 390×844, sin scroll de página): pestañas, ficha de cada uno, entrar a Fatiga (cuenta regresiva en la Arena), y la pila con Frontera, Inclusión y Vidrio.

**No medido**: fps con los shaders de Frontera e Inclusión (9 muestras de Voronoi por píxel, solo dentro de esos Defectos). Fatiga y Vidrio tienen la curva casi plana (§8): son un muro a propósito (decisión del usuario), te obligan a avanzar en la Capa 1 antes de ganarlos.

## C13: fin de la Capa 1 y test de balance completo (2026-11-18)

**Hito actual: C13 terminado** (los logros de la 1.2, con el OK del usuario, al final de esta sección). Sigue C14.

**Fin de la capa** (1e308 Cristales totales = `infinito_log10`, igual que el sim):
- Núcleo: `finCapa1(s)` en `src/core/infinito.ts`.
- `juego.svelte.ts`: `juego.cinematica` pasa de booleano a `'' | 'infinito' | 'fin'`. Al llegar, `finDeCapa()` lleva a la Arena y corre la cinemática (6,4 s, `FIN_CAPA_MS`); al terminar anota `vistos.capa2` (guardado: una vez por partida; si se cierra antes, se repite al volver) y abre la pantalla de la Capa 2. La economía sigue corriendo.
- Cinemática (`Pila.svelte`): el hielo sube y cubre la pila entera y se queda (no se rompe como en el primer Infinito); a los 2,4 s se abren nueve grietas desde el centro (`src/ui/grietas.ts`, semilla fija) y a los 3,2 s se enciende en ellas un resplandor de brasas (tres trazos: halo naranja desenfocado, la grieta blanca y un núcleo ámbar) que queda latiendo lento. Suena el crescendo del Infinito, más largo. Reducir movimiento: todo aparece sin abrirse ni latir.
- Pantalla "Capa 2 / Próximamente" (`Capas.svelte`, `juego.capa = 'capa2'`): el azul helado de Cristalización con un resplandor tenue rojo y naranja desde abajo, las mismas grietas apenas encendidas y 16 chispas que suben despacio (solo transform y opacidad). Reducir destellos: la mitad de las chispas y más lentas; Reducir movimiento: sin chispas. Sin más texto.
- Barra de capas: con `vistos.capa2`, la Capa 2 como silueta oscura (una roca) con grietas de brasa que laten en 4,5 s (quietas con Reducir movimiento); lleva a la pantalla de arriba.
- Debug: "Fin de la Capa 1" (estado de Defectos II + 1e309 Cristales totales y vuelve a mostrar la cinemática).
- Textos: `capas.capa2` y `capas.proximamente` (es/en).

**Test de balance completo** (`tests/balance_capa1.test.ts`, `npm run test:lento`, ~45 s, **20/20 en verde**). El bot ahora sigue hasta 1e308 Cristales totales con las mismas reglas que el sim: reliquias con la regla por defecto, abandono de C8, Memoria que hace saltar la corrida (en el núcleo), y además lo de la 1.2: rompe la Escarcha a mano cada 30 min (con Deshielo la rompe `tick`) y entre corridas gasta Esquirlas lo más barato primero entre Crecimiento, Brillo, Aguante y pulir una pieza engarzada (como `esq_items`); esas compras cuentan en el hueco. Defectos 5–8 los toma la misma regla de entrada.

| Hito | Juego | Sim (§2) | |
|---|---|---|---|
| Segundo Infinito | 1,21 | 1,21 | 0 % |
| Memoria completa | 1,81 | 1,81 | 0 % |
| Romper = Estratos | 2,30 | 2,30 | 0 % |
| Vacancia | 2,35 | 2,37 | −1 % |
| Dislocación | 3,59 | 3,70 | −3 % |
| Macla | 4,19 | 4,52 | −7 % |
| Impureza | 5,36 | 5,29 | +1 % |
| Fin 1.1 | 6,26 | 6,63 | −6 % |
| Fatiga | 8,94 | 9,47 | −6 % |
| Frontera | 11,89 | 11,95 | −1 % |
| Inclusión | 12,54 | 12,57 | 0 % |
| Vidrio | 13,05 | 13,49 | −3 % |
| **Fin de la capa** | **14,45** | 14,49 | 0 % (rango 14–16) |
| Hueco máximo (desde 1,5 h) | 36,9 min | 30,8 | < 40 |

Pesos de log10 V en la corrida que llega a 1e308 (antes de su Infinito): Escarcha 58 %, Presión 32 %, Colores 4 %, Eco 4 %, Reliquias 1 % (máximo < 65 %). El sim da Escarcha 42 %, Presión 43 %. **No es una diferencia de balance sino de fase**: las mejoras de Escarcha llegan iguales (Crecimiento 9, Brillo 6, Aguante 8; g ≈ 10/s en los dos), pero el juego mide justo antes de una ruptura (espesor 18.286) y el sim justo después (9.474, la mitad: `conserva_al_romper` 0,5). Con g ≈ 10/s el espesor se duplica en cada ciclo de 30 min, así que el peso de la Escarcha al final oscila entre ~40 y ~60 % según dónde caiga el último Infinito. Queda debajo del 65 % en los dos extremos, pero está cerca: si se toca la Escarcha, mirar este número. No cambié ningún número.

**Verificación**: 311 tests en verde (`npm test`), 20/20 en `npm run test:lento`, `tsc` y `svelte-check` 0 errores, `python balance/sim_capa1.py` da la tabla de §2 sin cambios. En el navegador (1366×768 y 390×844): la cinemática entera con una pila de 400.000 granos (hielo a los 2 s, grietas con brasas a los 4–5 s) y la pantalla de la Capa 2 con la silueta en la barra; sin scroll de página en 390×844; sin errores en consola. Reducir destellos (8 chispas, 13,5 s) y Reducir movimiento (sin chispas, brasa quieta) comprobados por los estilos computados.

**No medido**: fps (el panel del navegador estaba oculto y lo frena a ~30; la pantalla nueva son 16 puntos con transform y un SVG quieto); celular real; la cinemática con Reducir movimiento solo por el CSS, no mirada.

**Decisiones (revisar)**:
- La silueta lleva el nombre "Capa 2" debajo, como los otros botones de la barra; la pantalla dice solo "Capa 2" y "Próximamente".
- El fin de la capa no frena nada: se puede seguir jugando la Capa 1 (y la cinemática no vuelve).
- Las grietas son las mismas en la cinemática y en el fondo de la pantalla de la Capa 2, para que se lea como "lo que quedó".

### Logros de la 1.2 (C13, con el OK del usuario)

Pestaña **Capa 1 · Cristalización** de Logros abierta desde el primer Infinito (antes estaba vacía y bloqueada), con 9 logros: el **Primer Cristal** (ya tenía texto y daba el fondo Hielo, pero no existía la condición: nadie podía conseguirlo) y los 8 de la 1.2. Cada uno con su mini pila y un cosmético nuevo.

| Logro | Condición | Recompensa |
|---|---|---|
| Primer Cristal | el primer Infinito | fondo Hielo (ya existía) |
| Primera helada | abrir la Escarcha | paleta Escarcha |
| Quebrar el hielo | romperla y juntar la primera Esquirla | efecto Hielo en pedazos |
| Anillo de hielo | los 12 nodos del anillo 3 al máximo | marco Anillo helado |
| Sin aliento | superar Fatiga | efecto Latido |
| Grano por grano | superar Frontera | marco Bordes de grano |
| Burbuja | superar Inclusión | efecto Burbujas |
| Amorfo | superar Vidrio | paleta Vidrio |
| Cristalización total | 1e308 Cristales totales (`finCapa1`) | fondo Grietas |

Secretos (18 ahora): **Témpano** («Agua que no has de romper, dejala crecer.»: el reloj de la Escarcha llega a 3 h sin romperla; fondo Témpano) y **Terco** («A la tercera no fue la vencida.»: superar un Defecto abandonado 3 veces antes; marco Terco).

- `src/ui/logros.ts`: `LOGROS_C1` (puros, sobre el estado), recompensas, `SISTEMA` (los de la 1.2 salen como ??? hasta ver la Escarcha), `CAPAS`.
- `src/ui/secretos.ts`: Témpano en `Vigia.cuadro`; Terco con `abandono(id)` / `defectoGanado(id)` y un contador nuevo `abandonos` en `Contadores` (va al guardado, saneado en `guardado.ts`; los guardados de antes arrancan en cero). `juego.svelte.ts` los llama al abandonar a mano y al detectar un Defecto superado.
- Cosméticos: paletas Escarcha y Vidrio (`paletas.ts`); efectos 14–16 en el shader de celdas (`lienzo.ts`); fondos 8 (Grietas: Voronoi grande con calor de brasas desde abajo) y 9 (Témpano: capas de hielo horizontales); el Voronoi del fondo Hielo pasó a una función `grietaEn` que comparten los dos. Marcos en `marcos.ts`. Mini pilas en `miniPilas.ts` (los marcos se dibujan con el mismo `marco()` de la foto).
- `balance/config.json`: los dos secretos (`horas`, `abandonos`, Steam `SECRET_ICEBERG` / `SECRET_STUBBORN`) y los dos fondos. Son cosméticos (sim.py no los lee), así que van junto a los otros secretos y no en `config_capa1.json`.
- Textos en español e inglés.
- Tests: `logros.test.ts` (los 9 con textos, escena y recompensa sin repetir; cada condición), `secretos.test.ts` (18 secretos; Témpano; Terco cuenta por Defecto), `guardado.test.ts` (los abandonos se guardan y se sanean).

**Verificación**: 315 tests en verde, `svelte-check` 0 errores. En el navegador: la pestaña con las 9 mini pilas (desbloqueadas a mano un momento para verlas y después vueltas atrás), los dos secretos, y en Ajustes → Aspecto los 10 cosméticos nuevos con su vista previa (fondo Grietas probado detrás de la pila). Bajé el brillo de Burbujas y Hielo en pedazos después de verlos (quedaban casi blancos).

**Decisiones (revisar)**:
- Quebrar el hielo se mira por las Esquirlas o mejoras de Escarcha que hay (no hay contador de rupturas): una ruptura que da 0 Esquirlas no cuenta hasta la siguiente.
- Témpano lee el reloj de la Escarcha: con Deshielo prendido no se puede (la rompe a los 30 min); hay que apagar su interruptor. El reloj no corre en Vidrio, así que tampoco suma ahí.
- Terco cuenta los abandonos desde esta versión (antes no se guardaban).
- Al cargar una partida que ya pasó el primer Infinito, el Primer Cristal se consigue enseguida (con su aviso).


## C14: pulido final de la 1.2 (2026-11-18)

**Hito actual: C14, pulido hecho.** Falta la auditoría (Fable) y publicar la 1.2.

**Guías de la 1.2** (una sola vez por partida, cada una en su pantalla, anotadas en `vistos`):
- `c1_escarcha` reescrita: antes decía "multiplica todo", que es falso; ahora dice que hace valer más cada derrumbe, que gruesa frena la producción y que romperla conserva la mitad y da Esquirlas. "Cómo funciona" → Escarcha pasó de una línea a tres párrafos (qué es, frena y romper, para qué sirven las Esquirlas y Deshielo).
- Nuevas: `c1_anillo3` (Red, señala un nodo del anillo 3: qué trae), `c1_pulido` (Relicario, señala los engarces: cómo se pule) y `c1_defectos2` (Defectos, señala la pestaña Defectos II). Salen la primera vez que mirás esas pantallas con la Escarcha abierta. `PANTALLA_GUIA` en `juego.svelte.ts` dice en qué pantalla va cada una. Los guardados que ya pasaron la Escarcha las ven una vez al entrar a esas pantallas.
- Test nuevo en `tests/juego.test.ts`: las cuatro salen en orden, una vez cada una, y no vuelven en una segunda vuelta por las pantallas.

**Estética de cristal:**
- Fin de la capa (`Capas.svelte`, pantalla Capa 2): el título va ahora en una `.placa` de hielo de la Capa 1 (facetada, con grietas en la esquina) con la brasa asomando desde abajo, y el fondo lleva la textura de escarcha. Una línea nueva cierra la capa: «Juntaste 1e308 Cristales. Debajo del hielo, algo arde.» (`capas.finCapa1`).
- Escarcha: en la ficha, la Suma (×2,32e135) y "+0,279 por minuto" salían cortadas con "…". La columna de la Suma es más ancha, "por minuto" pasó a "por min" y en el celular la línea chica se achica un poco.
- Defectos: las etiquetas de la ficha (Regla, Meta…) ya no van en mayúsculas espaciadas; quedan como en la ficha de la Escarcha.
- El anillo 3 de la Red ya tenía el mismo lenguaje que los otros anillos (deshielo de C11); no lo toqué.

**Textos**: la regla de Inclusión decía "Te llevan la Escarcha y el Eco" (se leía como que te las sacaban): ahora "La Presión de los Estratos no cuenta. Para avanzar quedan la Escarcha y el Eco." Todo en español e inglés.

**Verificación**: 316 tests en verde (`npm test`), 20/20 en `npm run test:lento`, `svelte-check` y `tsc` 0 errores. En el navegador, a 1366×768 y 390×844, sin scroll de página: las cuatro guías en su lugar, la ficha de la Escarcha sin cortes, la pantalla de fin de capa. Capturas en `capturas/c14/` (la de la Escarcha a 1366 es de antes del arreglo de la ficha).

**No medido**: fps (el panel del navegador iba a 1 cuadro por segundo; las capturas a veces quedaban viejas, así que parte de lo de 390×844 está comprobado por el DOM y no a la vista); celular real.

**Decisiones (revisar)**:
- La guía del anillo 3 sale junto con el deshielo, no después.
- La guía del Pulido señala los engarces y no el botón Pulir, porque el botón aparece recién al tocar una reliquia.


## Mejoras visuales: marcos de la pila, refresco, arena seca, camino al Infinito, barra de capas, borde del fondo (2026-11-18)

Sin tocar el balance (ni `config.json` ni los simuladores).

- **Marcos de la pila** (`Pila.svelte`): el marco elegido en Ajustes → Aspecto ("Marco de la pila", antes "Marco de la foto") se ve en la pantalla principal, dibujado con el mismo `marco()` de la foto en un canvas 2D aparte. Va pegado al círculo fijo de la pila en pantalla (`PilaVisual.focoCss`, el mismo del desenfoque del zoom), no a la pila: no cambia con el zoom, al crecer, al comprimir (las reglas de la implosión son solo del canvas de la pila), ni en pantalla completa; se redibuja solo si cambia el radio, el marco o la paleta. Está debajo del anillo de Compresión (Galleta y Polaroid no lo tapan) y recortado a la región de la pila (en el celular no tapa la Energía ni el sismógrafo). La foto sigue con su marco.
- **Tasa de refresco** (Ajustes → Juego): 15 / 30 / 60 / Sin límite (`ajustes.fps`, por defecto sin límite). Saltea cuadros del bucle de `Pila.svelte`; la economía corre en su propio reloj.
- **Reducir movimiento**: ya existía para la pila (y por defecto sigue `prefers-reduced-motion`); ahora además pone `reducir-movimiento` en `<html>` y una regla en `index.html` deja en la interfaz los bucles en una sola vuelta y las transiciones instantáneas (la pila no entra: tiene su versión quieta).
- **Arena seca** (`lienzo.ts`): grano de 3 px CSS más contrastado, con granos sueltos de 7 px más claros.
- **Camino al Infinito** (`App.svelte`, `caminoInfinito` en `juego.svelte.ts`): línea de 2 px en el margen izquierdo, log10(Energía) / `infinito_log10`, con una marca en cada umbral de Compresión (se encienden al pasarlas), la punta brillante y un ∞ arriba. Aparece con la Compresión y se va al romper el Infinito (`infinitoRoto`).
- **Barra de capas** (`Capas.svelte`): sin caja ni borde; una sombra desde el borde izquierdo que se desvanece arriba y abajo, la capa activa con su color, un resplandor y una marca corta; Automatización separada por una rayita. En el celular baja a 8 rem para no pisar las líneas de la Energía.
- **Borde del fondo**: el fondo va solo en la pantalla de la pila (como antes). En el celular el canvas de la pila ahora sigue hasta arriba de todo y hasta la tienda (`--fondo-abajo`), con la pila centrada en su región (`u_centroY`, `altoRegion`), y el fondo se difumina en los 3 rem de arriba y de abajo en vez de cortarse de golpe. En escritorio no cambia nada.

**Verificación**: 316 tests en verde, `svelte-check` y `tsc` 0 errores. `scripts/capturas-visual.mjs` (Edge headless) en 1366×768, 1000×640 y 390×844: el marco mide lo mismo con los 16 marcos, en los zooms 0/6/14/28, comprimiendo y al volver de Cristalización; centrado en la pila; el anillo de Compresión visible; sin scroll de página; 60 fps en la Arena; sin errores. Capturas en `capturas/visual/antes` y `capturas/visual/despues`.

**No medido**: celular real; el panel del navegador de la app estaba oculto (sus capturas salían recortadas), por eso las capturas son de Edge headless.

**Decisiones (revisar)**:
- Polaroid en escritorio es grande (1,54 radios hacia abajo) y pasa por encima del sismógrafo; en el celular queda recortado por la región de la pila.
- En el celular, tocar el fondo detrás de la Energía ahora también suelta un Puñado (el canvas llega hasta ahí).
- El camino usa `infinito_log10` del config (308,25) y no 308 a mano.


## Diseño para celular (2026-11-19)

Sin tocar el balance. Todo en vertical hasta 1100 px (celular y tablet); el escritorio no cambia.

- **Barra de capas abajo** (`Capas.svelte`): Arena / Cristalización / Automatización (y Capa 2) pasan a una barra de navegación de lado a lado, abajo, con la marca de la activa en el borde de arriba. Su alto es `--nav` (`index.html`, con `safe-area-inset-bottom`). La hoja de la tienda se apoya sobre ella (`App.svelte`, solo con la barra) y las pantallas de la Capa 1 terminan arriba. Ya no tapa la Energía ni corre el cartel del Defecto ni el camino al Infinito.
- **Cabecera de Cristalización compacta**: los Cristales grandes a la izquierda y Totales / Energía / Esquirlas en renglones chicos a la derecha. En celulares bajos (≤720 px de alto) se achica más.
- **Pestañas de sistemas** (`hielo.css`): ícono con el nombre chico debajo (antes solo íconos, no se sabía cuál era cuál).
- **Automatización**: pestañas Compras / Reinicios (una lista a la vez, que llena el alto) y controles de 44 px.
- **Estratos**: el bloque se corre a la izquierda en pantallas angostas para que el aporte (×1,82e14) entre entero; la ficha toma lo que necesita y scrollea sola si no entra; en celulares bajos se esconde la línea de Presión total para darle lugar a la escena.
- **Paneles** (Logros, Estadísticas, Ajustes, Ayuda; `Pantalla.svelte`): la barra queda fija y scrollea solo el cuerpo.
- Botones táctiles de 44 px: cuadros de nivel de la Red (en el celular), Fusionar todo, flechas de Estratos, Defectos / Defectos II, pestañas de los paneles.
- Arreglo: en "Cómo funciona" tres rótulos (Cristales con el Infinito roto, Blando, Mejoras más allá de 1e308) estaban fuera de `rotulo` en `es.ts`/`en.ts` y salían vacíos (además daba un error de Svelte por claves repetidas).

**Herramienta**: `scripts/capturas-celular.mjs` (Edge headless, perfil en D:) saca todas las pantallas de la Capa 1, los paneles y "Mientras no estabas" en los tamaños que se le pasen, y anota por cada una si la página scrollea, qué cajas scrollean, qué queda afuera y qué botón mide menos de 44 px.
`node scripts/capturas-celular.mjs http://localhost:5173 <salida> 390x844,360x640,768x1024,1366x768`

**Verificación**: 316 tests en verde, `svelte-check` y `tsc` 0 errores. Con el script: 390×844 y 360×640 sin nada marcado en las 13 pantallas. Capturas en `capturas/celular/antes` (390×844) y `capturas/celular/despues` (390×844, 360×640, 768×1024).

**No medido**: celular real; fps en celular.

**Quedó así (revisar)**:
- En 768×1024 y 1366×768 el script marca "la página scrollea" con un panel abierto: es la Arena de atrás, que se achica con `transform` y hace que sus canvas fijos cuenten para el documento. `body` tiene `overflow: hidden`, así que no se puede scrollear; viene de antes.
- En escritorio siguen marcados botones de menos de 44 px (cuadros de la Red de 24 px, campos de Automatización de 32 px, índice de "Cómo funciona"): con mouse no hacen falta; no los toqué.
- En 360×640 los rótulos de los estratos cerrados (Estrato 6 · 1,00e16) se pisan un poco con su número.
- Escarcha y Defectos en 360×640: la ficha scrollea sola (entra la mitad).

### Caché del juego publicado (2026-11-19)
- El `index.html` de GitHub Pages quedaba viejo en la caché del navegador (los `.js`/`.css` ya llevan hash). Ahora cada build tiene un número (`__VERSION__`, `vite.config.ts`) y deja `version.json`; `src/version.ts` lo pide sin caché al abrir y al volver a la pestaña y, si es otro, recarga una vez (la partida se guarda en el `pagehide`). Una recarga por versión como mucho (`sessionStorage`), así no hay bucle si el servidor tarda. En itch.io no hay `version.json` y no hace nada. Además `<meta http-equiv="Cache-Control" content="no-cache">`.
- Probado con `vite preview`: al cambiar `version.json` y volver a la pestaña se recarga una vez y después sigue.
- Publicar: `npm run build`, copiar `dist/*` a la rama `main` (dejando `.nojekyll`), commit y push.

### Zoom adentro del marco y slider con la tienda subida (2026-11-19)
- Con un marco puesto (Ajustes → Aspecto), el zoom pasa adentro del marco: la pila se corta con borde limpio en el círculo del marco (`u_recorte` en `lienzo.ts`, `PilaVisual.recorte`, `Pila.svelte`) y afuera queda solo el fondo, sin la pila desenfocada. Sin marco sigue como antes (desenfocada afuera).
- Celular: con la hoja de la tienda subida, el slider de zoom no se muestra (quedaba encima de la hoja y se tocaba sin querer).
- Verificado: `capturas-visual.mjs` a 390×844 y 1366×768 (el marco mide lo mismo en todos los zooms) y en el navegador, subir y bajar la hoja saca y vuelve a poner el slider. 316 tests en verde, `svelte-check` y `tsc` 0 errores.

## Siete cambios pedidos (2026-11-19)

Del 1 al 6 sin tocar el balance, con un commit cada uno. El 7 (Red) espera el OK del usuario: abajo.

1. **Marco pegado a la pila** (`Pila.svelte`, `PilaVisual.bordeCss`, `marcos.ts`): el marco va en el borde de la pila tal como se dibuja (`(radio + 1,5) × px`; un grano suelto, 0,5) y la sigue suave al crecer, al comprimir (implota con ella) y con el zoom. Con zoom el marco se abre con la pila **pero no se agranda** (pedido del usuario a mitad de la tarea): `marco()` recibe `u`, el tamaño de los adornos, que en pantalla es `min(radio, foco)`; en la foto y las vistas previas `u = r` y queda igual que antes. Se sacó el recorte del zoom adentro del marco (`u_recorte`, commit anterior). Fuera del círculo nítido el marco se apaga como la pila desenfocada (máscara radial). Se dibuja en un canvas del tamaño de la región, solo cuando cambia el radio.
2. **Barra de zoom en el celular**: en la fila de la manija de la tienda, a la derecha; fuera de la región de la pila, así nada la toca con ningún zoom.
3. **Barra del Infinito**: arranca debajo del bloque de números (`--izq-alto`, medido), con lugar para el ∞; en escritorio también.
4. **Aviso del anillo**: "Anillo N · ×1,10" ya no va sobre la pila; aparece 1,6 s junto al contador de anillos (`juego.anilloNuevo`). El anillo de luz sobre la pila queda.
5. **Carámbano hacia la Capa 2** (`App.svelte`, `caminoCapa2`): con el Infinito roto, en el lugar del camino, un carámbano de hielo que baja con log10(Cristales totales) / 308,25; tooltip "Cristales totales 1e142 / 1e308"; en el último 10 % la punta tiene una brasa tenue (quieta con Reducir destellos).
6. **Reliquias**: con el Infinito a mano, pop-up de cristal (`Paneles.svelte`) con los tres tipos, lo que da cada uno y cuánto falta para la próxima fusión; no se cierra solo (se sacó la espera de 30 s y `espera_eleccion_s` del config), la corrida sigue detrás; con el inventario lleno avisa y ofrece Fusionar todo. La reliquia del primer Infinito se sigue eligiendo en el Relicario, con su guía. Con el Infinito automático: la primera vez, con la regla por defecto, una nota con "Configurar" (lleva a Automatización → Reinicios, a la regla); después las reliquias van en el aviso juntado de cada 30 s (se apagan con el aviso de reliquias de Ajustes). `SPEC_CAPA1.md` §5 al día.

**Verificación**: 317 tests en verde, 20/20 en `npm run test:lento`, `svelte-check` y `tsc` 0 errores. Capturas antes/después en `capturas/pedido/` (Edge headless, 390×844, 360×640, 412×915, 768×1024 y 1366×768): marcos rosa, polaroid, galleta y denso en varios zooms, pila chica, creciendo y comprimiendo; sin scroll de página.

**No medido / revisar**: celular real; fps. La nota de la reliquia automática en el celular tapa un momento el sismógrafo (se cierra con un toque). La reliquia que se pierde con el inventario lleno no sale bien en el aviso juntado (toma el último tipo; comentado como shortcut).
