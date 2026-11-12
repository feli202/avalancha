# Progreso

Estado: **hitos 0, 1, 2a, 2b, 3 y 4 terminados** (proyecto base, núcleo económico, pila visual, efectos de la pila, interfaz principal, Compresión y sistemas tardíos), **Pulido 1** (estilo Arena) y **Pulidos 2, 3 y 4** (rediseño de la interfaz, borde circular, paleta invertida de la pila, supermuestreo). Sigue el hito 5 (persistencia).

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
- **Compresión 12 con Compresión automática, ×50, Edge headless 1280×720** (bot de `partida50.mjs`): 5 compresiones seguidas hasta el Infinito. Después de cada una, la pila de pantalla quedó llena (> 518.892 granos) en menos de 4 s y siguió goteando unos 3.000 granos/s; 60 fps todo el tiempo (peor cuadro 17 ms, un pico de 67–83 ms en la corrida de la Compresión 14, que ya estaba antes). Ráfaga de capturas cada ~0,3 s después de una Compresión: implosión → punto → pila llena con fundido, sin cortes.
- Corridas tempranas: con G chico el camino es el de antes (cada grano); las fotos solo entran si la pila queda más de 3.000 granos atrás.

### Arreglos que salieron en la verificación

1. **La implosión no terminaba nunca** (bug del Hito 4, y probablemente parte del "punto"): `implotando` se apagaba con el `animationend` de la estela, pero la estela puede salir de `efectos` antes de terminar (`slice(-3)`, cuando llegan textos de anillos) y con Reducir destellos tiene `display: none`. La pila de pantalla quedaba congelada y achicada al 2 % para siempre. Ahora se apaga con un reloj de 0,9 s (`IMPLOSION_MS` en `Pila.svelte`, igual a la animación del CSS).
2. Al cargar una foto la cámara se encuadra de golpe (si no, la pila grande aparecía muy ampliada y se alejaba), y el salto de escala ("1 grano = 10^k") no anima la cámara si viene de una foto: el fundido ya cubre el cambio.

### Pendiente / no verificado

- No lo miré en móvil real ni con el navegador integrado (estaba oculto); solo Edge headless, también a 375×812.
- La carga de partida no existe todavía (hito 5); el mecanismo ya la cubre.
