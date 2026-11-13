# Progreso

Estado: **hitos 0, 1, 2a, 2b, 3 y 4 terminados** (proyecto base, núcleo económico, pila visual, efectos de la pila, interfaz principal, Compresión y sistemas tardíos), **Pulido 1** (estilo Arena) y **Pulidos 2, 3 y 4** (rediseño de la interfaz, borde circular, paleta invertida de la pila, supermuestreo). **Hito 5** terminado: 5a (guardado base y progreso fuera de línea) y 5b (exportar/importar, ajustes, estadísticas, logros, teclado). **Rediseño de Logros, Estadísticas y Ajustes**: las tres son pantallas completas (Ajustes: aspecto con vistas previas, juego, partida y teclado) (Logros: 24 logros, mini pilas y recompensas cosméticas; Estadísticas: desglose de la producción, corridas, avalanchas y general). Sigue el hito 6 (pulido: sonido, accesibilidad, rendimiento).

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

- `npm test`: 60 tests en verde (50 de antes + migración 1 → 2, exportar/importar con espacios y 4 textos inválidos, contadores del núcleo, notación de ingeniería en `tests/formato.test.ts`). tsc y svelte-check sin errores; `npm run build` bien; `python balance/sim.py` igual que antes (194 / 229 / 376 min).
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

