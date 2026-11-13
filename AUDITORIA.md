# Auditoría de la Capa 0

Fecha: 13/11/2026 · commit auditado: `395d3aa` · no se cambió código.

## Resumen

- **1 bloqueante**: con la pestaña en segundo plano el guardado automático pisa la partida con un estado viejo y fecha nueva; al recargar se pierde todo lo que pasó en segundo plano (B1, reproducido).
- **11 importantes**: dos pestañas que se pisan, guardados que se dan por dañados, fallos de guardado sin aviso, la pila descentrada, el inicio, dos formas de que la pila quede congelada o negra para siempre, caída de fps con el modo Máx, logros de avalancha regalados, cosas que se muestran antes de tiempo y el uso de CPU en sesiones largas.
- **17 menores**, entre ellos el texto de los botones que se selecciona al arrastrar y los menús con patrones genéricos.
- **El núcleo está bien**: las fórmulas coinciden con SPEC 4 y con `balance/sim.py`, el test de balance usa el núcleo real, y no encontré fugas de memoria en 4 h de juego a ×50.

Los tres puntos de `PENDIENTES.md` están en I4 (pila descentrada), I5 (inicio) y M2 (menús).

## Cómo se auditó

| Qué | Cómo | Resultado |
| --- | --- | --- |
| Lectura | `CLAUDE.md`, `PROGRESO.md`, `SPEC.md`, `PENDIENTES.md`, todo `src/core`, `src/guardado`, `balance/`, `tests/balance.test.ts`, el bucle, la tienda, la pila (interfaz, dibujo, worker) y, por partes, el resto de `src/ui` y `src/render` | — |
| Suite | `npm test`, `npm run typecheck` | 70 tests en verde, tipos sin errores |
| Simulador | `python balance/sim.py` y `--timeline` | 187 / 194 / 228 / 376 min, 17 compresiones; la línea de tiempo coincide con SPEC 2 |
| Casos límite del núcleo | test temporal contra `src/core` (borrado al terminar) | ver "Lo que está bien" y M4, M5 |
| Partida a ×50 | Edge headless por CDP, 1280×720, bot por la interfaz (Puñado, M, Comprimir, Cascada y Mutaciones), memoria con GC forzado cada 20 s | Infinito a las 4 h 09 min de juego, sin errores de consola |
| Pestaña oculta | mismo arnés, con `requestAnimationFrame` pausado y los temporizadores vivos (lo que hace el navegador con una pestaña oculta) | B1 reproducido; la Compresión automática durante la ausencia anda bien |
| Centrado y título | mismo arnés, 7 tamaños de ventana | I4 e I5 medidos |

Limitaciones: no escuché el sonido, no probé en un celular real ni en Safari o Firefox, y la partida a ×50 son 6 minutos reales: una fuga que dependa del tiempo real (por cuadro) y no del tiempo de juego necesita una sesión real de horas para verse. La memoria medida es el heap de JS del hilo principal; no incluye el worker ni los arreglos tipados.

## Lo que está bien (verificado)

- **Fórmulas (SPEC 4 = `formulas.ts` = `sim.py`).** Producción `F × (K × G) × V^D` con D solo sobre V; Caudal `2^nivel × 3^mutación` y costo `10^(1 + 0,6n + 0,075n²)`; colores con `s·n²/2` e hito ×4 cada 25; anillos `floor(log2(G/64)) + 1`; Cascada con mínimo ×1 y la Mutación solo si Cascada ≥ 1; Mutaciones; Densidad `1 + 0,12 × compresiones`; los 17 umbrales; Infinito. Ningún número de balance escrito en el código: todo sale de `config.json` por `src/core/config.ts`.
- **Diferencias con `sim.py`, las dos ya anotadas en `PROGRESO.md`**: los autocompradores compran una vez por segundo en orden fijo (SPEC 4.8) y no en cada paso por mejor retorno; el núcleo da Infinito a los 196,4 min contra 194 (+1,2 %).
- **Test de balance.** `tests/balance.test.ts` importa `tick`, `comprar`, `comprimir`, `costo`, `disponibles`, `produccion`, `aplicar` y `puedeComprimir` de `src/core`. Lo único propio es la heurística del bot. No hay copia de fórmulas.
- **Umbral exacto.** Con Energía = 10^umbral exacta (construida de tres formas) se puede comprimir en los 17 umbrales. Con Energía = costo exacto se compra y queda 0. Coral aparece con 1e4 exacto y las Mutaciones con 1e120 exacto.
- **Máx al borde del Infinito.** Con 0,999 × Infinito, Máx en las cinco filas compra 323 niveles (Caudal de 40 a 61; colores a 116, 82, 59 y 45) sin errores; el tick siguiente sigue normal y el Infinito llega cuando la Energía vuelve a pasar. Después del Infinito no se puede comprar ni comprimir. Un paso fuera de línea que se pasa de largo queda en Infinito y el guardado va y vuelve sin perder la Energía. (El costo en fps de Máx está en I8.)
- **Pestaña oculta durante una Compresión automática.** 59 min de juego sin cuadros desde la Compresión 6: al volver, 7 compresiones, cartel "59 min afuera · 1 compresión", sin implosión ni errores. Menos de 10 s oculta: son ticks normales y la implosión se ve al volver (por lectura del código, no lo medí aparte).
- **Fuera de línea = tick.** 2 h desde la Compresión 6: 7 compresiones y log10 E 85,46 con ticks de 50 ms contra 85,45 fuera de línea. 24 h: 9 compresiones por los dos caminos.
- **Partida larga a ×50** (4 h 09 min de juego, 17 compresiones):

| Tiempo de juego | Heap JS | Nodos DOM | Listeners | fps (2 s) | Guardado |
| --- | --- | --- | --- | --- | --- |
| 0 h 11 | 5,9 MB | 817 | 147 | 43 | 5 KB |
| 0 h 46 | 6,2 MB | 833 | 183 | 58 | 19 KB |
| 1 h 27 | 6,5 MB | 847 | 213 | 59 | 20 KB |
| 2 h 26 | 6,6 MB | 857 | 214 | 51 | 18 KB |
| 2 h 59 | 6,6 MB | 857 | 214 | 59 | 21 KB |
| 3 h 32 | 6,6 MB | 857 | 214 | 59 | 25 KB |
| Infinito + 1 min | 6,5 MB | 861 | 133 | 61 | 16 KB |

  Sin fugas a la vista: heap, nodos y listeners quedan planos. Las muestras de 43–51 fps (peor cuadro 67–133 ms) coinciden con otras pruebas que corrí a la vez en la misma máquina; solas dieron 59–61 fps con peor cuadro de 17–34 ms. No las puedo atribuir al juego ni descartarlas.
- **Guardados dañados**: no se pisan, queda la copia en `avalancha.respaldo` (ya cubierto por `tests/guardado.test.ts`).
- **Textos**: no encontré textos de interfaz escritos en los componentes.

---

## Bloqueante

### B1. En segundo plano, el guardado automático pisa la partida con un estado viejo y fecha nueva — ✅ resuelto

- **Resuelto:** `guardadoEn` es `simuladoHasta`, el reloj hasta el que llegó el bucle. Test en `tests/juego.test.ts`.

- **Dónde:** `src/ui/juego.svelte.ts:160-161` (`partidaActual` pone `guardadoEn: Date.now()`), `:205-207` (el `setInterval` de 10 s y el `pagehide`).
- **Qué pasa:** con la pestaña oculta el navegador deja de dar cuadros, así que `juego.s` queda congelado, pero el `setInterval` sigue (en Chrome, una vez por segundo o por minuto). Cada guardado escribe el estado del momento en que se ocultó con la hora de ahora. Si la pestaña se recarga, se cierra o el navegador la descarta sin haber vuelto a verla, la carga calcula el tiempo fuera de línea desde ese `guardadoEn` falso y todo lo que pasó en segundo plano se pierde. Es el caso del jugador "casi idle", que es justo el que deja el juego atrás por horas. Cerrar la ventana con la pestaña atrás también lo dispara (el `pagehide` guarda igual).
- **Cómo reproducirlo:** abrir el juego, pasar a otra pestaña 10 minutos y cerrar el navegador sin volver. Al abrir de nuevo no hay cartel "Mientras no estabas" y faltan esos 10 minutos. Medido con el arnés: 25 s sin cuadros; el guardado quedó con `tiempoTotal` 13,55 s y `guardadoEn` de hace 1,4 s; recargada, 11 s después tenía 24,0 s en vez de ~50.
- **Arreglo propuesto:** que `guardadoEn` sea el instante hasta el que se simuló (la variable `antes` del bucle), no `Date.now()`. Una línea en `partidaActual` más exponer `antes`. Con eso un guardado tardío es inofensivo: el estado y su fecha siempre coinciden. Sumar un test: guardar dos veces sin tick en el medio tiene que dar el mismo `guardadoEn`.

---

## Importante

### I1. Dos pestañas del juego se pisan el guardado — ✅ resuelto

- **Resuelto:** `navigator.locks`: la pestaña que no consigue el candado no simula ni guarda y muestra "El juego está abierto en otra pestaña" con "Jugar en esta pestaña" (roba el candado y recarga; la otra guarda una vez y queda quieta). Test en `tests/juego.test.ts`.

- **Dónde:** `src/ui/juego.svelte.ts:165-174, 205-207`; no hay evento `storage`, `BroadcastChannel` ni `navigator.locks` en todo `src/`.
- **Qué pasa:** cada pestaña guarda su copia cada 10 s en la misma clave. La de atrás, congelada (B1), le pisa el guardado a la que se está jugando; al recargar gana la última que escribió.
- **Cómo reproducirlo:** abrir el juego en dos pestañas, jugar 5 minutos en una, cerrarla y recargar la otra: vuelve al estado de hace 5 minutos.
- **Arreglo propuesto:** `navigator.locks.request('avalancha', …)` al arrancar; la pestaña que no consigue el candado muestra "El juego está abierto en otra pestaña" y no guarda. Alternativa más corta: escuchar `storage` y dejar de guardar si otra pestaña escribió.

### I2. Un guardado al que le falta un campo se trata como dañado, y la única salida es empezar de nuevo — ✅ resuelto

- **Resuelto:** `deserializar` completa con `estadoInicial()` los campos que faltan (también autocompradores y colores al final) y rechaza solo tipos equivocados, o un guardado sin estado o sin fecha. Un respaldo distinto mueve el anterior a `avalancha.respaldo.<fecha>`. El cartel tiene "Copiar la partida dañada". Tests en `tests/guardado.test.ts`.

- **Dónde:** `src/guardado/guardado.ts:53-65` (`mismaForma` contra `MODELO`), `src/ui/Paneles.svelte:34-42`.
- **Qué pasa:** si el estado suma un campo (la Capa 1 lo va a hacer) y alguien se olvida de la migración, todos los guardados existentes pasan a "No pudimos leer tu partida" con un solo botón, "Empezar de nuevo". El respaldo queda en `avalancha.respaldo`, pero no hay forma de verlo ni de exportarlo desde el juego, y es uno solo (el segundo dañado pisa al primero). Lo mismo con un guardado de una versión más nueva.
- **Cómo reproducirlo:** borrar `compresionesSinAmbar` del JSON en `localStorage` y recargar. Verificado en el test temporal: falta un campo o un autocomprador → rechazado.
- **Arreglo propuesto:** completar lo que falta con `estadoInicial()` (mezcla campo por campo, como ya hace `ajustes.svelte.ts`) y rechazar solo tipos equivocados. En el cartel, un segundo botón "Copiar la partida dañada" que copie el texto del respaldo. Guardar el respaldo con fecha en la clave para no pisar el anterior.

### I3. Si el guardado falla, el jugador no se entera — ✅ resuelto

- **Resuelto:** dos fallos seguidos de `guardarYa` muestran "No se pudo guardar. Exportá tu partida desde Ajustes." (fijo, se apaga al volver a guardar). `reemplazarPartida` no recarga si no pudo escribir y Ajustes → Partida muestra el error. Tests en `tests/juego.test.ts`.

- **Dónde:** `src/ui/juego.svelte.ts:165-174` (solo `console.warn`), `:192` (sin almacenamiento, también por consola), `:177-181` (`reemplazarPartida` recarga aunque no haya podido escribir).
- **Qué pasa:** con el almacenamiento lleno, bloqueado o en modo privado, el juego sigue horas sin guardar nada y sin avisar. Importar o borrar con el almacenamiento lleno recarga igual y vuelve la partida vieja.
- **Cómo reproducirlo:** en la consola, `Storage.prototype.setItem = () => { throw new Error('lleno') }`, jugar y recargar.
- **Arreglo propuesto:** si `guardarYa()` falla dos veces seguidas, un aviso fijo de una línea ("No se pudo guardar. Exportá tu partida desde Ajustes."). En `reemplazarPartida`, no recargar si la escritura falló y mostrar el error.

### I4. La pila se descentra (`PENDIENTES.md` 1) — ✅ resuelto

- **Resuelto:** en escritorio el canvas es siempre la ventana entera y la pila queda en el centro exacto (medido: 0 px de corrimiento en 1280×720, 1920×1080, 1024×768 y 1440×900); en ventanas angostas se achica con `PilaVisual.radioMax` (`--pila-radio-max`: 50vw − columna − 2 márgenes) en vez de correrse. Con una sola pila (I5) ya no salta al tocar Jugar.
- **⚠️ Sin resolver en móvil (requiere SPEC):** SPEC 6.4 dice "pila arriba (55 % de la pantalla)" y `PENDIENTES.md` pide el centro exacto de la ventana también en móvil. Quedó como dice la spec: centro exacto en horizontal, centrada en la zona de arriba en vertical (155 px sobre el centro a 375×812). Para cambiarlo hay que decidir primero la spec.

- **Dónde:** `src/ui/App.svelte:322` (`@media (max-aspect-ratio: 16/9) { --pila-derecha: calc(var(--col) + 2 * var(--margen)) }`, agregado en el hito 6), `:325` (móvil: `--pila-arriba` y `--pila-abajo`), `src/ui/Pila.svelte:190`.
- **Qué pasa:** en cualquier ventana de 16:9 o más angosta, la región de la pila se achica por la derecha y la pila queda corrida a la izquierda, con o sin tienda. Incluye 16:9 exacto, o sea pantalla completa en un monitor 1080p. Medido (centro de la pila menos centro de la ventana):

| Ventana | Corrimiento |
| --- | --- |
| 1920×950, 1366×768 | 0 px |
| 1280×720 | 166 px a la izquierda |
| 1920×1080 | 200 px a la izquierda |
| 1440×900 | 183 px a la izquierda |
| 1024×768 | 160 px a la izquierda |
| 375×812 (móvil) | 155 px hacia arriba |

  Además la pila del título está centrada en la ventana, así que al tocar Jugar la pila salta de lugar.
- **Cómo reproducirlo:** abrir el juego a 1280×720 o en pantalla completa (F11) en 1920×1080.
- **Arreglo propuesto:** sacar la regla de `:322` y dejar el canvas siempre a ventana completa. Para que la tienda no tape la pila en ventanas angostas, achicar la pila en vez de correrla: que `PilaVisual.encuadre` reciba un radio máximo en px (`50vw − columna − 2 márgenes`) además del 80 % del lado corto. En móvil hay que decidir: SPEC 6.4 dice "pila arriba (55 % de la pantalla)" y el pendiente dice "centro exacto de la ventana". Con la hoja inferior ocupando el 45 % de abajo, el centro exacto queda medio tapado. Propongo centro exacto en horizontal y centrada en la zona visible en vertical, y anotarlo en la spec.

### I5. El inicio no es cinematográfico (`PENDIENTES.md` 2) — ✅ resuelto

- **Resuelto:** el título sale siempre ("Continuar" con partida). No tiene pila propia: es un velo sobre la pila del juego, quieta (Caudal 0 en pantalla) y con la cámara lejos (`PilaVisual.zoom` = 0,5). Al entrar, la cámara se acerca en 1,4 s, la economía arranca (el primer grano del Caudal cae al segundo) y la interfaz aparece en orden: Energía, sismógrafo, pista, tienda, íconos. En el título el reloj no avanza: el fuera de línea se simula y se muestra recién después de entrar (verificado: 1 h de ausencia, el cartel aparece al tocar Continuar).

- **Dónde:** `src/ui/App.svelte:70-71, 187` (el juego entero se monta debajo del título), `src/ui/Titulo.svelte:19-33, 36` (pila propia que suelta 30 granos/s, fundido de 0,6 s), `src/ui/juego.svelte.ts:203, 211, 214-216` (título solo sin partida; el fuera de línea se calcula en el primer cuadro).
- **Qué pasa:**
  - La economía **sí** está en pausa durante el título (medido: Energía 0 después de 5 s). Lo que se ve correr es la pila decorativa, que no está quieta, y debajo ya están montados la pila del juego y toda la interfaz: dos contextos WebGL y dos workers a la vez.
  - Al tocar Jugar hay solo un fundido: sin acercamiento de cámara, sin "primer grano", y la interfaz aparece toda junta.
  - Con partida guardada no hay título: se entra directo y el fuera de línea se calcula antes de mostrar nada.
- **Cómo reproducirlo:** borrar la partida y mirar el título; después recargar con partida guardada.
- **Arreglo propuesto:** el título siempre (con partida, "Continuar"). La pila de fondo quieta: una foto fija, sin soltar granos. Usar una sola `PilaVisual`: la del juego hace de fondo y el título es solo el velo con el nombre y el botón; así el acercamiento es animar la escala que ya existe (`u_escala`) y no hay salto de lugar (I4). Montar la interfaz recién al tocar Jugar, en orden y con retardos (Energía, tienda, el resto). Mover la carga del fuera de línea a ese momento: guardar `antes = p.guardadoEn` y sumar a `acum` recién cuando `juego.titulo` pasa a `false`.

### I6. Si no cargan las fotos de la pila, la pila queda congelada para siempre — ✅ resuelto

- **Resuelto:** el worker atrapa el fallo de `pilas.bin` (o la falta de `DecompressionStream`) y contesta `sinFotos`; `PilaVisual` deja de pedir fotos y sigue soltando granos. Las mini pilas de Logros y Ajustes también atrapan el fallo (antes eran errores sin atrapar). Verificado en Edge headless con `pilas.bin` fallando: la pila sigue creciendo, sin errores en la consola. Sin test automático (es el worker con la red).

- **Dónde:** `src/render/pila.worker.ts:37-39, 56-65` (`await fotos` sin `catch`), `src/render/pilaVisual.ts:200-208` (`ocupado` no vuelve a `false` si no hay respuesta).
- **Qué pasa:** si falla el `fetch` de `pilas.bin` (sin conexión, error de red, empaquetado) o no existe `DecompressionStream` (Safari anterior a 16.4), el primer pedido de foto rechaza la promesa, el worker no contesta nunca y la pila no vuelve a recibir granos ni a dibujar cambios. No hay error en pantalla.
- **Cómo reproducirlo:** en las herramientas de desarrollo, bloquear la URL de `pilas-*.bin`, recargar y saltar a la Compresión 12 con el panel de debug.
- **Arreglo propuesto:** `try/catch` en el camino de la foto del worker: si falla, responder `foto: -1` con una marca; `PilaVisual` deja de pedir fotos y sigue soltando granos al ritmo máximo. De paso, reiniciar `midiendo` al cargar una foto (M12).

### I7. Sin manejo de pérdida de contexto WebGL — ✅ resuelto

- **Resuelto:** `Lienzo` hace `preventDefault()` en `webglcontextlost` y en `webglcontextrestored` vuelve a armar programas, texturas y uniformes (paleta, destellos, efecto); `PilaVisual` vuelve a subir las alturas. Sin WebGL2, la pila muestra un aviso en vez de la pantalla vacía. Verificado en Edge headless con `WEBGL_lose_context`: la pila vuelve a dibujarse, sin errores.

- **Dónde:** `src/render/lienzo.ts:173`; no hay `webglcontextlost` ni `webglcontextrestored` en `src/`. Estaba anotado como pendiente en el hito 2a.
- **Qué pasa:** si el navegador pierde el contexto (driver, cambio de GPU en una laptop, celular que vuelve de segundo plano), la pila queda negra hasta recargar. En sesiones de horas pasa.
- **Cómo reproducirlo:** en la consola, `document.querySelector('.pila canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`.
- **Arreglo propuesto:** en `Lienzo`, `preventDefault()` en `webglcontextlost` y rearmar programas y texturas en `webglcontextrestored`; `PilaVisual` marca `sucio` para volver a subir las alturas. Si no hay WebGL2, un mensaje en vez de la pantalla vacía.

### I8. El modo Máx recalcula la compra máxima de cada fila en cada cuadro — ✅ resuelto

- **Resuelto:** `comprarMax` revisa la disponibilidad una vez (lo único que la cambia al subir es el nivel máximo, que se compara directo) y calcula un costo por nivel. Con 0,999 × Infinito, las cinco filas pasan de 70 ms a 5 ms por cuadro (mismos 523 niveles). `tests/tienda.test.ts` compara contra comprar de a uno en 5 Energías × 11 filas; la economía no cambia (balance en verde). Además: el test de 8 h fuera de línea, que estaba al borde de los 5 s y fallaba a veces con la suite en paralelo, tiene un timeout de 30 s.

- **Dónde:** `src/ui/Tienda.svelte:34-44, 88` (`oferta` llama a `comprarMax`), `src/core/shop.ts:53-64` (cada nivel llama a `disponibles`, que arma un arreglo, y dos veces a `costo`).
- **Qué pasa:** `juego.s` cambia en cada cuadro, así que con Máx elegido se simula la compra máxima de las cinco filas 60 veces por segundo. Medido en Node con el núcleo: 323 niveles pagables = 32 ms, o sea dos cuadros enteros. Con poca Energía sin gastar no se nota; con mucha (autocompradores apagados o antes de tenerlos, con Energía acumulada) baja de 60 fps.
- **Cómo reproducirlo:** saltar a la Compresión 17 con el debug, apagar los autocompradores, elegir Máx y dejar acumular Energía (o "Dar Energía" varias veces); mirar los fps del panel de debug.
- **Arreglo propuesto:** en `comprarMax`, revisar `disponibles` una vez y comparar la Energía contra el costo dentro del bucle (el costo depende solo del nivel). Si no alcanza, calcular el nivel máximo con la fórmula cerrada del costo cuadrático. Como la economía no cambia, el test de balance tiene que dar igual.

### I9. Los logros de avalancha y el récord cuentan tandas, no avalanchas — ✅ resuelto

- **Resuelto:** `juego.record` (y con él los logros Avalancha, Alud y Récord y la cifra de la pantalla final) sale de las muestras de un grano solo (`alMuestra`); las tandas quedan para el sismógrafo y el sonido. Medido en Node con la pila real a 90 % de su capacidad: de 60.000 granos sueltos, 1.528 pasan 1.000 derrumbes, 782 pasan 10.000 y 163 pasan 1e6 (máximo 1,6e7). O sea: los tres se consiguen con avalanchas de verdad, pero recién con la pila grande.
- **Para decidir (balance, no lo toqué):** con la pila llena el logro de 1e6 sale en segundos. Si se quiere más raro, hay que subir `logros.avalancha_record` en `config.json`. Las partidas guardadas conservan el récord inflado de antes (no se puede recalcular).

- **Dónde:** `src/render/pilaVisual.ts:252-263`, `src/ui/Pila.svelte:61-73` (`juego.record`), `src/ui/logros.ts:14, 19, 31`.
- **Qué pasa:** con flujo continuo, una "avalancha" es todo lo que se derrumbó hasta que la pila quedó estable, con decenas o miles de granos adentro. Los logros 3 (1.000 derrumbes), 8 (10.000) y 20 (1e6, "récord") salen solos apenas se llena la pila, y la "avalancha récord" de la pantalla final es una suma de tandas (3,64e8 en la partida a ×50 del hito 4). Estaba anotado como decisión en `PROGRESO.md`; contra SPEC 7 es un defecto.
- **Cómo reproducirlo:** jugar hasta llenar la pila de pantalla y mirar Logros.
- **Arreglo propuesto:** el worker ya mide la avalancha de un grano solo por pedido (`muestras`). Usar esas muestras para `juego.record` y para los tres logros, y dejar las tandas para el sismógrafo y el sonido.

### I10. Cosas que se muestran antes de tiempo (SPEC 5) — ✅ resuelto

- **Resuelto:** Ajustes está desde el inicio; foto, Logros, Estadísticas y Cómo funciona (íconos y teclas P, L, E, H) aparecen con la tienda. Logros sin conseguir cuyo sistema no se vio: "???", sin descripción ni recompensa y con la mini pila apagada (`SISTEMA` y `secreto` en `logros.ts`, test en `tests/logros.test.ts`). Estadísticas → Producción filtra los factores con `juego.vistos` (Densidad desde la primera Compresión). El tooltip de Energía/s no nombra la Densidad ni muestra el exponente antes de la primera Compresión. Ajustes → Teclado solo lista las teclas de lo que ya apareció. Cómo funciona: "???" en vez del nombre de las secciones bloqueadas.

- **Dónde y qué:**
  - `src/ui/App.svelte:82-106`: los cinco íconos (foto, logros, estadísticas, ajustes, ayuda) están desde el primer segundo. SPEC 5: la pantalla inicial tiene solo la pila, la Energía y "Tocá la pila".
  - `src/ui/Logros.svelte`: los 24 logros con nombre y descripción desde el inicio: Cascada, Mutaciones, Densidad ^3, Infinito.
  - `src/ui/Estadisticas.svelte:24` y `src/ui/desglose.ts:26-47`: Producción lista todos los factores desde el inicio (los cuatro colores, Anillos, Cascada, Mutaciones, Densidad), sin mirar `juego.vistos`.
  - `src/ui/ayudas.svelte.ts:102-106` y `src/strings/es.ts:359`: el tooltip de Energía/s dice "elevado a la Densidad" y muestra `^1,00` antes de la primera Compresión.
  - `src/ui/ComoFunciona.svelte:124, 132`: los nombres de las secciones bloqueadas se leen (anotado como decisión).
  - `src/strings/es.ts:294-305`: Ajustes → Teclado lista "C comprimir" y "M comprar todo" antes de que existan.
- **Cómo reproducirlo:** partida nueva, tocar Jugar y abrir L, E, A y H sin jugar.
- **Arreglo propuesto:** íconos: Ajustes desde el inicio (hace falta para accesibilidad y sonido); los demás aparecen con la tienda. Logros: los no conseguidos cuyo sistema no se vio, como "???" con la mini pila apagada. Estadísticas: filtrar `factores` con `juego.vistos` (el desglose sigue sumando igual, porque los ocultos valen ×1). Tooltip: sin Densidad mientras `compresiones === 0`. Teclado: filtrar por `vistos`. Cómo funciona: "???" en vez del nombre.

### I11. Un núcleo de CPU casi entero, siempre, con la pila llena — ✅ resuelto

- **Resuelto:** con la pila llena el worker recibe un pedido por cuadro (antes pedía de nuevo apenas contestaba) y el ajuste nuevo "Ahorrar batería" (Ajustes → Juego) baja su presupuesto de 12 a 4 ms. Las alturas viajan en un arreglo que vuelve al worker con el pedido siguiente (`transfer` de ida y vuelta), sin 263 KB nuevos por respuesta. Medido en Edge headless con la pila llena: worker 594 ms/s (≈59 %) normal y 438 ms/s con Ahorrar batería, 60 fps en los dos. Sin test automático (worker y tiempos reales).

- **Dónde:** `src/render/pilaVisual.ts:167-178, 246` (pide de nuevo apenas llega la respuesta), `src/render/pila.worker.ts:31, 85` (12 ms por pedido; `pila.h.slice()` de 263 KB y un `Int32Array` de celdas por respuesta).
- **Qué pasa:** en estado estacionario con Caudal ≥ 3.000 el worker trabaja ~90 % del tiempo (medido en el hito 6) mientras el juego esté abierto y visible. Los fps no bajan, pero en una laptop o un celular es batería y ventilador durante horas, en un juego pensado para dejar abierto. Aparte, cada respuesta crea 263 KB de alturas más las celdas, unos 16 MB por segundo de memoria para el recolector.
- **Cómo reproducirlo:** saltar a la Compresión 6, esperar que la pila se llene y mirar el administrador de tareas.
- **Arreglo propuesto:** un ajuste "Calidad de la pila" (o bajar solo con batería) que limite el presupuesto del worker, por ejemplo a 4 ms por cuadro; con la pila llena el dibujo casi no cambia. Devolverle al worker los buffers ya usados (`transfer` de ida y vuelta) en vez de crear uno por respuesta. El paso a WebAssembly ya está anotado.

---

## Menor

### M1. El texto de los botones se selecciona al arrastrar — ✅ resuelto

- **Resuelto:** `index.html`: `user-select: none` (y `-webkit-touch-callout`, `tap-highlight`) en el cuerpo; se vuelve a permitir en `textarea`, `input`, `code` (las fórmulas de Cómo funciona) y `.seleccionable`.

- **Dónde:** ninguna regla `user-select` en `index.html` ni en los componentes, salvo `src/ui/MiniPila.svelte:93`. Medido: los 26 botones de la pantalla principal tienen `user-select: auto`.
- **Qué pasa:** arrastrar el mouse sobre una fila de la tienda, una pestaña, x1 / x10 / Máx, Comprimir, "Comprar todo" o los rótulos selecciona el texto como si fuera un documento. En móvil, mantener presionado para ver el tooltip (450 ms) también puede abrir la selección del sistema.
- **Cómo reproducirlo:** arrastrar el mouse desde "Caudal" hasta "Ámbar" en la tienda.
- **Arreglo propuesto:** en `index.html`, `body { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }` y volver a permitirlo donde sí hay que copiar: `textarea, input, .seleccionable { user-select: text; }` (el texto exportado en Ajustes → Partida y las fórmulas de "Cómo funciona").

### M2. Menús con patrones genéricos (`PENDIENTES.md` 3)

- **Dónde y qué**, contra la regla de la interfaz principal (sin cajas, jerarquía por tipografía):
  - `src/ui/Pantalla.svelte:75-79`: pestañas como píldoras con borde y fondo teñido. La tienda usa texto con una línea debajo.
  - `src/ui/Logros.svelte:96-112` y `src/ui/Opciones.svelte:276-284`: grillas de tarjetas con borde, esquinas redondeadas, fondo y resplandor, y adentro otra franja con borde y fondo (caja dentro de caja).
  - `src/ui/Logros.svelte:131-132`: la notificación de logro es una tarjeta con sombra.
  - `src/ui/Opciones.svelte:314-315` (opciones como fichas con borde), `:339` (área de texto en caja), `:348-349` (teclas dibujadas como teclas).
  - `src/ui/Titulo.svelte:58-59`, `src/ui/App.svelte:279-282, 292-294`, `src/ui/MiniPila.svelte:111`: botones píldora; el del título con vidrio y `backdrop-filter`, el del mandala con resplandor.
- **Cómo reproducirlo:** abrir Logros (L), Ajustes (A) y comparar con la tienda.
- **Arreglo propuesto:** una sola familia de controles, la de `Paneles.svelte` y la tienda. Pestañas: texto con línea de 1 px. Tarjetas: la mini pila sin marco, con nombre y estado debajo, separadas por espacio; el estado ("En uso", bloqueado) por color y peso del texto. Botones: texto con línea de 1 px, sin píldoras ni vidrio. Notificación: una línea de texto con la mini pila al lado, como los avisos.

### M3. Una Compresión hecha en ausencia se anota con la Energía equivocada — ✅ resuelto

- **Resuelto:** `registrar` anota la corrida con `max(log10 E antes, umbral)`: en una ausencia es el umbral; a mano, la Energía exacta. Test en `tests/estadisticas.test.ts`.

- **Dónde:** `src/guardado/historial.ts:47-51`.
- **Qué pasa:** si en una ausencia hubo exactamente una Compresión, la corrida se anota con `log10E(antes)`, la Energía del comienzo de la ausencia, que puede estar muy por debajo del umbral.
- **Cómo reproducirlo:** con Compresión automática, dejar la pestaña oculta hasta que comprima una vez y mirar Estadísticas → Corridas.
- **Arreglo propuesto:** anotar el umbral de esa Compresión (`CFG.compresion.umbrales_log10[antes.compresiones]`) cuando el paso viene de `fueraDeLinea`.

### M4. Comparaciones y redondeos que no coinciden en el borde

- **Dónde:** `src/core/compress.ts:7` (compara `log10`), `src/core/shop.ts:54` (compara con `gte`), `src/ui/formato.ts:11` (`Math.floor`), `src/strings/es.ts:48`.
- **Qué pasa:** `puedeComprimir` acepta 10^umbral × (1 − 1e-15) por el redondeo del logaritmo (inofensivo, pero no es la misma regla que las compras). En pantalla, costo y Energía se redondean para abajo los dos: con 47,1 de Energía y Caudal a 47,3 se lee "47" y "47" con la fila apagada.
- **Cómo reproducirlo:** comprar Caudal una vez y mirar la fila cuando la Energía llega a 47.
- **Arreglo propuesto:** comparar con `energia.gte(Decimal.pow10(umbral))`. Mostrar los costos redondeados para arriba (`Math.ceil` por debajo de 1e6).

### M5. Importar no valida rangos

- **Dónde:** `src/guardado/guardado.ts:53-58`.
- **Qué pasa:** se aceptan granos negativos, 99 compresiones o una Energía con mantisa negativa (verificado). No rompe el juego (con 99 compresiones no hay más umbrales y sigue), pero deja estados imposibles.
- **Arreglo propuesto:** después de `mismaForma`, acotar: niveles y granos ≥ 0, `compresiones` entre 0 y 17, Cascada y Mutaciones hasta su máximo, Energía ≥ 0.

### M6. Importar un guardado viejo regala hasta 24 h

- **Dónde:** `src/ui/juego.svelte.ts:177-184, 200`. Anotado como decisión en el hito 5b.
- **Qué pasa:** la partida importada conserva su `guardadoEn`, así que importar un texto de ayer simula 24 h; se puede repetir con el mismo texto.
- **Arreglo propuesto:** al importar, poner `guardadoEn: Date.now()`.

### M7. `exportar` arma el base64 con un `spread` de todos los bytes

- **Dónde:** `src/guardado/guardado.ts:80`.
- **Qué pasa:** `String.fromCharCode(...bytes)` falla si los bytes pasan el máximo de argumentos del motor (unos 65.000 en Safari). Hoy el guardado llega a 16–25 KB (medido) y anda; si el historial crece, deja de exportar.
- **Arreglo propuesto:** armar el texto en trozos de 8.192 bytes.

### M8. `objetivo_minutos` de `config.json` está viejo

- **Dónde:** `balance/config.json:51`, `tests/balance.test.ts:85-88`, `PROGRESO.md` (dice 229).
- **Qué pasa:** dice 193 / 226 / 397 y `sim.py` da 194 / 228 / 376 (SPEC 2 dice 194 / 228 / 376). El test del ±5 % compara contra 193. Hoy pasa igual.
- **Arreglo propuesto:** actualizar los tres valores con la salida de `sim.py` y corregir el 229 de `PROGRESO.md`.

### M9. El tooltip deja un listener de `scroll` cada vez que se muestra

- **Dónde:** `src/ui/Ayuda.svelte:43-44`.
- **Qué pasa:** se agrega con `once` y no se saca en la limpieza del efecto; si nadie hace scroll, se acumulan (uno por tooltip mostrado). No se notó en la partida larga porque el bot no pasa el mouse.
- **Arreglo propuesto:** guardar la función y sacarla en el `return` del efecto, igual que `fuera`.

### M10. El sismógrafo ordena todas sus muestras en cada cuadro

- **Dónde:** `src/ui/Sismografo.svelte:22-28`.
- **Qué pasa:** copia y ordena ~1.200 muestras por cuadro (2.880 a 144 Hz) para un percentil y un máximo, y `shift()` es lineal. Es poco, pero es por cuadro y para siempre.
- **Arreglo propuesto:** recalcular piso y tope 4 veces por segundo en vez de 60.

### M11. A velocidad ×50, un tirón de 1,2 s abre "Mientras no estabas"

- **Dónde:** `src/ui/juego.svelte.ts:211-216` (el tiempo acumulado ya viene multiplicado por la velocidad).
- **Qué pasa:** solo en desarrollo. Tapa la interfaz y frena al bot de `scripts/partida50.mjs` (deja de comprar hasta que alguien toca Seguir).
- **Arreglo propuesto:** comparar el umbral de 60 s contra el tiempo real, no el de juego.

### M12. Cargar una foto no reinicia la muestra de avalancha — ✅ resuelto

- **Resuelto:** `midiendo = false` al cargar una foto (con I6).

- **Dónde:** `src/render/pila.worker.ts:58-65`.
- **Qué pasa:** `midiendo` queda como estaba; el primer pedido después de la foto puede anotar una muestra vieja en el histograma. Un dato falso por foto.
- **Arreglo propuesto:** `midiendo = false` en el camino de la foto.

### M13. La fuente viene de Google Fonts

- **Dónde:** `index.html:8-10`. Anotado como pendiente en el hito 3.
- **Qué pasa:** sin conexión (o empaquetado) cae a la fuente del sistema, y las cifras tabulares y los anchos cambian. SPEC 8 pide no depender del navegador fuera del almacenamiento.
- **Arreglo propuesto:** servir Space Grotesk desde `public/` con `@font-face`.

### M14. Después del Infinito no hay salida visible

- **Dónde:** `src/ui/App.svelte:163-181, 264`. Anotado en el hito 4.
- **Qué pasa:** los íconos se apagan y la pantalla final no tiene cómo empezar otra partida ni ver logros; solo quedan las teclas (A, L, E). Al recargar, la secuencia del final se repite entera.
- **Arreglo propuesto:** en la pantalla final, enlaces de texto a Logros, Estadísticas y "Empezar de nuevo". Guardar en `vistos` que el final ya se vio y, al cargar, mostrar la pantalla final directo.

### M15. Dos pilas vivas durante el título — ✅ resuelto

- **Resuelto:** con I5: una sola `PilaVisual` (un contexto WebGL y un worker).

- Es parte de I5: `Titulo.svelte` crea su propia `PilaVisual` (otro contexto WebGL y otro worker) con la del juego ya montada debajo. Se arregla con I5.

### M16. Cosas chicas de memoria y audio

- `src/render/miniPilas.ts:163-169`: al cambiar la paleta para daltonismo se vacía el caché sin cerrar los `ImageBitmap` (`close()`).
- `src/ui/sonido.ts:112-128`: `arenita` crea los nodos de audio aunque ya no haya voces libres; conviene preguntar antes de crearlos.

### M17. `PROGRESO.md` dice que `pila.c` nunca se compiló

- **Dónde:** `PROGRESO.md` (hito 2a). No hay compilador de C en esta máquina, así que tampoco lo pude correr. El criterio del hito 2 de SPEC 9 sigue verificado solo contra un port del mismo algoritmo.
- **Arreglo propuesto:** correr una vez `gcc -O3 -o pila balance/pila.c -lm && ./pila bulk 10000` en una máquina con gcc y pegar la línea en `PROGRESO.md`.

---

## `PENDIENTES.md`, punto por punto

| Punto | Diagnóstico | Dónde está |
| --- | --- | --- |
| 1. La pila se descentró | La regla `max-aspect-ratio: 16/9` del hito 6 le recorta la región por la derecha en toda ventana de 16:9 o más angosta (166–200 px de corrimiento medidos). En móvil está centrada en su zona, no en la ventana. | I4 |
| 2. Inicio poco cinematográfico | La economía está en pausa, pero la pila decorativa suelta granos, el juego entero ya está montado debajo, Jugar es solo un fundido y con partida guardada no hay título. | I5 (y M15) |
| 3. Menús con patrones genéricos | Píldoras, tarjetas con borde y resplandor, cajas dentro de cajas y teclas dibujadas en Logros, Ajustes, el armazón de pantallas y los botones del título y del final. | M2 |

## Orden sugerido para arreglar

1. B1 (una línea y un test), después I1 e I3: son los que pierden progreso.
2. I2 antes de tocar el estado para la Capa 1.
3. I4 e I5 juntos (comparten la pila única a ventana completa).
4. I6 e I7 (pila congelada o negra).
5. M1 (cuatro líneas de CSS) y M2.
6. El resto.
