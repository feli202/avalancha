# Correcciones de la Capa 1 (después del paso 6 de la guía)

> Leé este archivo entero antes de tocar nada. Las capturas están en `capturas/` (las que terminan en `_MAL` muestran cómo está ahora; las de `referencia_` muestran la idea, NO para copiar su estética).
> Manda este archivo sobre `SPEC_CAPA1.md` donde se contradigan. Al terminar, actualizá `SPEC_CAPA1.md`, `config_capa1.json` y `balance/sim_capa1.py` para que digan lo mismo que este archivo.
> Regla de siempre: si algo toca el balance, primero el simulador, después la spec, después el código.

Hay 13 bloques, que se hacen en **9 sesiones** (una conversación nueva cada una, prompts en `PROMPTS.md`). Orden: 1–4 (arreglos rápidos) → 5–6 (balance) → 13 (estética base y barra lateral, así todo lo que sigue ya nace con el estilo nuevo) → 7 → 8 → 9 → 11 → 10 → 12 y cierre. En cada sesión hacé SOLO los bloques que te pidan. Al terminar cada bloque: tests verdes, abrí el juego, probalo, commit, y anotalo en `PROGRESO.md`.

---

## 1. Antiparpadeo (urgente)

Con los autocompradores andando la pantalla es un "quilombo": filas que destellan, números que saltan, brillos en cada compra automática.

- Opción en Ajustes → Juego: **"Reducir destellos"**, **activada por defecto**.
- Con la opción activada: las compras automáticas **no** hacen destello, ni pulso, ni brillo en la fila. Solo las compras con clic tienen feedback visual.
- Los números de la tienda y los contadores se actualizan a 10 Hz como máximo y con una transición suave, nunca parpadeando entre dos valores.
- Ningún elemento puede cambiar de brillo más de 3 veces por segundo (es también un tema de accesibilidad: fotosensibilidad).
- Los efectos de avalancha de la pila no se tocan: la pila es el espectáculo, la interfaz no.

## 2. Sonido sin amontonarse (urgente)

Los sonidos de compra se apilan y "no se puede estar".

- **Las compras automáticas no suenan.** Nunca.
- Las compras con clic suenan, con un límite: el mismo sonido no se repite antes de 80 ms, y "Comprar todo" / "Máx" suena **una sola vez** por clic aunque compre 50 niveles.
- Limitador global: como máximo 4 sonidos a la vez; si llega uno más, se descarta (no se encola).
- Los sonidos de la pila (derrumbes) bajan de volumen automáticamente cuando hay muchos seguidos, en vez de sumarse.

## 3. Bug: el "AUTO" no aparece con Memoria (captura 05)

Con Memoria nv1 los autocompradores funcionan desde el inicio de cada Infinito, pero la fila de la tienda no muestra el indicador "AUTO" hasta que se desbloquea por la vía normal (compresiones).

- Causa probable: la interfaz pregunta "¿está desbloqueado por compresiones?" en vez de "¿está activo?". Que haya **una sola función** (ej. `autobuyerActivo(id)`) que use tanto la lógica como la interfaz.
- Test: con Memoria nv1, al empezar una corrida, todas las filas con autocomprador muestran "AUTO".

## 4. Guías: una sola vez

Hoy las guías emergentes vuelven a aparecer en cada Infinito cuando algo se "re-desbloquea" (por ejemplo un autocomprador).

- Cada guía tiene un id y se marca como vista **en el guardado**. Se muestra **una sola vez en la vida de la partida**, la primera vez que se desbloquea esa mecánica. Nunca más, aunque se reinicie la corrida.
- Todas las guías vistas se pueden volver a leer desde el panel de ayuda (?).
- Migración: en los guardados existentes, marcar como vistas todas las guías de cosas que el jugador ya tiene.

---

## 5. Balance: los Estratos tienen que sentirse fuertes al desbloquearlos

Hoy un estrato nuevo arranca vacío ("Granos 1", "Presión 0,00 · cada derrumbe vale ×1", captura 08) y tarda mucho en notarse. Tienen que sentirse como las Infinity Dimensions de Revolution Idle / Antimatter: **cada estrato que abrís te destraba**, se nota en el multiplicador enseguida y después sigue creciendo.

Cambio de diseño (hacelo primero en `sim_capa1.py`):

1. **Al abrir el estrato k se llena de golpe hasta su tope**: `s_k = s_(k−1) − separación` (el estrato 1 arranca en un valor base, ej. `s_1 = 3`, o sea 1.000 granos). Así cada apertura da un salto inmediato de Presión.
2. **Cada estrato acelera al de arriba**, como las dimensiones: el flujo del estrato k se multiplica por `(1 + 0,1 × s_(k+1))` (el estrato de abajo "empuja"). Así abrir uno profundo también acelera a todos los de arriba. Parametrizalo en config (`estratos.empuje_por_estrato_inferior`).
3. Recalibrá `w_base_por_profundidad`, `gamma_log10_por_s` y los costos de apertura para que la tabla de tiempos de la sección 2 de `SPEC_CAPA1.md` se mantenga dentro de estos rangos: segundo Infinito 1,0–1,3 h, fin 1.1 entre 6,5 y 7,5 h, fin de la capa entre 14 y 16 h, hueco máximo < 40 min.
4. Objetivo medible: **abrir cualquier estrato tiene que multiplicar la producción por al menos ×100** en el momento (medilo en el simulador y anotalo).

Usá `python3 -c "import tune; tune.run({...})"` para probar sin tocar config. Mostrá la tabla nueva en `PROGRESO.md`.

## 6. Balance: la Red no puede tener 8 mejoras que hacen lo mismo

Hoy varios nodos repiten efecto con otro nombre: Presión / Sedimento II / Abismo (peso de Presión), Cristalografía / Cristalografía II (Cristales), Compactación / Compactación II (Densidad), Estratos / Inercia / Capilaridad (flujo), Eco / Eco II. Cada nodo tiene que tener **una mecánica propia**. Rediseño (el poder total tiene que quedar parecido; calibralo en el simulador junto con el bloque 5):

| Nodo | Efecto nuevo (nv1 → nv4) |
|---|---|
| **Estratos** | Abre los Estratos. **Velocidad del flujo** ×1 / ×1,5 / ×2 / ×3. |
| **Inercia** | **Impulso**: dentro de cada Infinito el flujo de los estratos va subiendo con el tiempo, hasta ×1,2 / ×1,4 / ×1,6 / ×2 a los 10 min de corrida (crece lineal y se queda ahí). Premia corridas un poco más largas. |
| **Capilaridad** (1.2) | **Separación** entre estratos: el tope pasa de `s_(k−1) − 2` a `− 1,75 / − 1,5 / − 1,25 / − 1`. Los estratos de abajo se pueden llenar más. |
| **Presión** | Peso de la Presión ×1,2 / 1,44 / 1,73 / 2,07 (se queda igual). |
| **Sedimento II** (1.2) | **Profundidad**: el peso de cada estrato pasa de `k` a `k^(1,05 / 1,1 / 1,15 / 1,2)`. Los profundos pesan cada vez más. |
| **Abismo** (1.2) | **Estratos llenos**: cada estrato que está en su tope da ×1,1 / ×1,2 / ×1,3 / ×1,4 a su propio peso. Premia llenar todos parejo. |
| **Cristalografía** | Cristales ×10^0,5 / 10^1 / 10^1,5 / 10^2 (se queda igual). |
| **Cristalografía II** (1.2) | **Facetas**: Cristales ×10^(0,125 / 0,25 / 0,375 / 0,5 × Defectos completos). Con los 8 Defectos y nv4 = ×1e4. |
| **Compactación** | Densidad +0,08 / 0,16 / 0,24 / 0,32 (se queda igual). |
| **Compactación II** (1.2) | **Densidad por anillo**: +0,001 / 0,002 / 0,003 / 0,004 de Densidad por cada anillo de la corrida actual. |
| **Eco** | `+p × log10(Cristales totales)` a log V (se queda igual). |
| **Eco II** (1.2) | **Eco de la Escarcha**: el Eco también suma al crecimiento de la Escarcha: g × (1 + 0,05 / 0,1 / 0,15 / 0,2 × log10(Cristales totales)). |
| **Sedimentación** | Conserva 11 / 13 / 15 / 17 compresiones. **nv4 además conserva los niveles de Cascada** entre Infinitos. |

El resto de los nodos (Memoria, Defectos, Ruptura, Engarces, Cascada+, Mutación+, Germen, Frío, Defectos II, Engarces II, Deshielo, Ruptura II) ya tiene efecto propio: se quedan. Con el inventario nuevo del bloque 8, **Engarces II** pasa a ser: "Fusión automática + espacios 3 + Pulido más barato".

Los tooltips de cada nodo dicen en una frase **qué cambia en el juego** (no "flujo ×3", sino "Los estratos se llenan 3 veces más rápido").

---

## 7. Multiplicadores visibles donde actúan

Hoy un nodo dice "Flujo ×3" y no se entiende qué hizo ni dónde.

- **Cada mejora muestra su valor final**, con todos los multiplicadores externos aplicados. Ej.: si un nodo multiplica el Caudal, la fila de Caudal muestra los granos/s finales.
- Al pasar el mouse por un número, un tooltip chico con el desglose: "8 base × 3 Red × 1,2 Reliquia = 28,8".
- En Estratos, cada estrato muestra su **velocidad local** ("×1,46 por minuto") y al pasar el mouse el desglose: Estratos ×3 · Inercia ×1,4 · Permeabilidad ×2,8 · empuje del de abajo ×1,3.
- La **Presión** se explica con números que se entienden: "Presión 12,4 → cada derrumbe vale ×10^(12,4 × Densidad) = ×4,1e13". Y el aporte de cada estrato como "×1e3", no "+0,01".

## 8. Relicario: rediseño completo (capturas 01, 02, 03)

Claude lo implementó como una mejora más; **está mal**. Tiene que ser un **inventario de piezas**, como el panel de zodíacos de Revolution Idle (captura 02) o los glifos de Antimatter Dimensions (captura 03), con nuestra estética.

### Cómo funciona

1. **Cada Infinito te da una reliquia.** No hay ofertas al azar: **vos elegís el tipo** entre los tres: **Cauce**, **Cascada** o **Mutaciones**. La reliquia nueva es nivel Ámbar y va al **inventario**.
2. **Inventario**: una grilla de casilleros (24 al principio). Se ve todo lo que tenés.
3. **Fusión**: **3 reliquias del mismo tipo y del mismo color se fusionan en 1 del color siguiente**: Ámbar → Coral → Jade → Violeta → Ámbar+1 → Coral+1… Se hace arrastrando una sobre otra o con un botón "Fusionar" cuando hay 3 iguales; con Engarces II, automática. Animación: las tres se juntan y se cristalizan en una.
4. **Engarces**: los espacios donde **equipás** reliquias (arrastrar del inventario). Solo las equipadas dan efecto. 1 espacio al principio, más con el nodo Engarces. Si equipás dos del mismo tipo, sus efectos se suman.
5. **Efecto según tipo y color** (nivel n: Ámbar 0, Coral 1, Jade 2, Violeta 3, Ámbar+1 = 4…), con las fórmulas de la sección 5 de la spec: Cauce `+1,5 % × (n+1)` a los colores, Cascada `+0,02 × (n+1)` a c, Mutaciones `+8 % × (n+1)`. Una reliquia de nivel n equivale a 3^n reliquias sueltas, así que el balance queda igual que antes si el jugador fusiona; verificalo en el simulador.

### Cómo se ven

- **El símbolo de cada reliquia es la pila con la que hiciste ese Infinito, renderizada** (no un ícono, no una imagen fija): al hacer Infinito se guarda una instantánea chica de la pila (ej. 32×32 celdas, 2 bits por celda = 256 bytes) y esa es la cara de la reliquia, cristalizada y teñida con el color de su nivel (Ámbar, Coral, Jade, Violeta, y un brillo extra para los +1). Cada reliquia es única y te cuenta tu historia.
- Al fusionar, la reliquia nueva conserva la pila de la reliquia más vieja de las tres.
- El tipo se marca con un sello chico en la esquina (tres formas simples y distintas), no con el dibujo principal.
- Se dibujan con el **generador de miniaturas compartido** (un solo renderizador, cacheado). Nada de un contexto WebGL por reliquia.

### Elección automática (Infinito automático)

En el panel de Automatización (bloque 10), la sección del Infinito automático tiene la regla para elegir la reliquia:

- **Tipo fijo**: siempre Cauce / Cascada / Mutaciones.
- **Rotar** entre los tres.
- **Completar fusiones**: el tipo al que le falte menos para la próxima fusión.
- **Subir el más bajo**: el tipo cuya mejor reliquia equipada tenga menor nivel.
- **Prioridad personalizada**: una lista ordenable de los tres tipos.
- Además, dos opciones: **fusionar automáticamente** (si tiene Engarces II) y **equipar siempre las mejores**.

Si hacés Infinito a mano, tenés 30 s para elegir; si no elegís, se aplica esa misma regla.

## 9. Red: pila 3D de cristal (capturas 04 y 07)

La Red de ahora es una grilla de cuadrados, "tosca", y no se lee como una pila. Tiene que ser **una pila de cristal en 3D**, vista en diagonal (cámara a ~35° de altura, rotable un poco arrastrando), mítica.

- Cada nodo es una **columna de cristal** sobre una base de hielo. **La altura de la columna es su nivel** (0 a 4 cubos de cristal apilados, como los granos de una celda). Cada cubo con el color de su nivel: Ámbar, Coral, Jade, Violeta. Facetas, refracción falsa (environment map chico), brillo en los bordes.
- Los nodos bloqueados son **hielo escarchado opaco**, sin candados de ícono. Los del anillo 3 (antes de la Escarcha) están dentro de un bloque de hielo más grueso, con grietas.
- Al **maxear** un nodo: animación de derrumbe abeliano real. La columna de 4 cubos se desarma y manda un fragmento de cristal a cada vecino, que se "despierta" (pasa de escarcha a cristal vacío).
- Hover: la columna brilla. Clic: se abre un **panel lateral** con nombre, qué hace en una frase, nivel actual y siguiente, costo y botón de compra. Nunca un panel encima de la pila.
- El nombre del nodo flota encima de la columna, legible (texto HTML posicionado, no texto 3D borroso).
- Mismas reglas de rendimiento que los Estratos: un solo renderer, creado al entrar y destruido al salir, render a demanda, sin shadowMap, `pixelRatio` tope 1,5.

## 10. Panel de Automatización (captura 06)

Nueva entrada en la barra lateral: **Automatización**. Como el panel de Autobuyers de Antimatter Dimensions (captura 06) en organización, con nuestra estética:

- Una fila por autocomprador: Caudal, cada color, Cascada, Mutaciones, Compresión, Infinito, y después los de la Capa 1 a medida que existan (estratos, Escarcha).
- Cada fila: interruptor encendido/apagado, intervalo, cantidad (×1 / ×10 / máx) cuando aplique, y su condición (ej. Compresión "al llegar al umbral" o "esperar X segundos más").
- **Infinito automático**: modo "en el óptimo" / "al llegar a X Cristales" / "cada X minutos" + la regla de reliquias del bloque 8.
- Botones arriba: "Encender todo" / "Apagar todo".
- Los que todavía no se desbloquearon no aparecen (o aparece solo el siguiente como silueta).

## 11. Estratos: rediseño visual y físicas (captura 08)

Hoy son losas chiquitas, la pila de arriba parece un agujero negro, y no tienen vida. Lo que más le gustó a la gente de Avalancha fueron las **físicas de la pila**: los Estratos tienen que tenerlas también.

- **Cada estrato es una pila abeliana de verdad**, simulada (decorativa, no cambia la economía): una grilla chica (32×32 o 48×48) donde caen granos desde el estrato de arriba (a un ritmo proporcional a su flujo, con tope para el rendimiento) y se derrumban con la regla de 4. **Los granos que se caen por el borde de un estrato caen al de abajo.** Se ve la avalancha pasar de un estrato a otro.
- La simulación de los 8 estratos va en el **worker** (o en la GPU, como la pila principal), a un ritmo fijo y bajo (ej. 20 pasos por segundo), y solo mientras la pantalla está abierta.
- Las losas son **grandes**: el estrato enfocado ocupa casi el ancho de la escena. Se ve su pila en pixel art sobre una losa de hielo translúcido, con la paleta del jugador.
- Arriba, en vez del "agujero negro": **la base de la pila principal vista desde abajo**, con la arena escurriéndose por el centro.
- A medida que un estrato se llena, **evoluciona**: la losa se vuelve más gruesa, cambia de hielo claro a sedimento compacto y más profundo de color, y aparece una veta brillante cuando está en su tope.
- Los estratos cerrados son roca oscura con el costo grabado; al abrirlo, la roca se rompe y cae el primer chorro de arena (y se llena de golpe, bloque 5).
- La interfaz de cada estrato (al costado) con el estilo nuevo del bloque 13, explicando: granos, velocidad local con desglose, aporte a la Presión en "×", y las dos mejoras. **Que las dos mejoras no se vean iguales**: Permeabilidad (velocidad) con ícono de gotas; Presión (peso) con ícono de prensa.

---

## 12. Guías nuevas

Guías integradas (una sola vez, bloque 4) y una página en el panel de ayuda con la fórmula, para cada cosa nueva:

- **Cristales y el Infinito nuevo**.
- **Red**: "maxear un nodo hace que se derrumbe y despierte a sus vecinos".
- **Relicario**: elegir tipo, inventario, fusión de 3, engarces, la pila de cada reliquia.
- **Estratos**: qué es la Presión en palabras simples ("los estratos aprietan la pila desde abajo: cada derrumbe vale más"), velocidad local, por qué abrir uno nuevo te destraba.
- **Automatización**.
- Dejá preparadas (bloqueadas) las de Defectos y Escarcha, para escribirlas en esos pasos.

## 13. Estética de la Capa 1: cristal y escarcha, como un juego (no como una página web)

La interfaz de la Capa 0 quedó muy bien: misma tipografía, mismos números grandes, misma sobriedad. La Capa 1 tiene que ser **de la misma familia pero con personalidad propia**: mítica, helada. Hoy todos los paneles de la Capa 1 son "súper IA": tarjetas con borde fino, botones de página web.

- **Paneles**: sin cajas con borde de 1 px. Los paneles son placas de hielo: fondo azul muy oscuro con textura de escarcha sutil (ruido), esquinas cortadas a 60° (como facetas, con `clip-path`), un brillo frío fino en el borde superior, y grietas tenues en algunos.
- **Botones de compra**: como cristales: biselados, con un reflejo que se mueve muy lento, que se "encienden" desde adentro cuando alcanza la plata. Nada de rectángulos con borde.
- **Color**: azul noche casi negro, blancos fríos, cian para lo de la capa. Los 4 colores de la Capa 0 siguen siendo los colores de nivel.
- **Movimiento**: partículas de escarcha muy suaves cayendo en el fondo de Cristalización (pocas, lentas), shimmer en los bordes. Todo respetando "Reducir destellos".
- **Prohibido**: tarjetas genéricas con sombra, gradientes violeta-azul de plantilla, emojis, íconos de librería sin adaptar, `backdrop-filter: blur` como recurso principal.
- **Barra lateral de capas**: un poco más ancha. Cada capa con su ícono con color y personalidad: **Arena** = una mini-pila cálida en ámbar; **Cristalización** = un cristal cian con brillo frío. Nombre de la capa visible debajo del ícono. La capa activa se nota claramente.

---

## Al terminar todo

1. `python3 balance/sim_capa1.py --robustez` y la tabla nueva en `PROGRESO.md` y en la sección 2 de `SPEC_CAPA1.md`.
2. `SPEC_CAPA1.md` actualizado con todo lo de este archivo (Relicario, nodos, Estratos, Automatización).
3. Tests verdes, incluido el de balance (aunque sea lento).
4. Capturas nuevas de: Relicario, Red, Estratos, Automatización y la barra lateral, guardadas en `correcciones-capa1/capturas_despues/` para comparar.
