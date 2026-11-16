# Avalancha — Especificación de la Capa 0

Documento de construcción para Claude Code. Todo lo que hace falta para implementar la Capa 0 completa (desde el primer grano hasta el primer Infinito) está acá. Las constantes de balance viven en `balance/config.json` y están verificadas con el simulador `balance/sim.py`.

---

## 1. Qué es

Un incremental sobre una **pila de arena abeliana**. Caen granos en el centro de una grilla; cada celda que junta 4 granos se derrumba y le da uno a cada vecina. Cada derrumbe da **Energía**. Con Energía se compran mejoras. El jugador nunca coloca nada: todas las decisiones son compras y reinicios.

Pilares, en orden de prioridad:

1. **El progreso se ve.** La pila es la pantalla. Cada mejora cambia algo visible.
2. **Rampa suave.** El primer minuto se entiende sin leer nada; cada sistema aparece recién cuando hace falta.
3. **Balance verificado.** Ninguna constante se toca sin correr el simulador (sección 10).
4. **Calidad comercial.** Pulido, sonido, accesibilidad y guardado sólidos desde el principio, no al final.

---

## 2. Duración objetivo (medida, no estimada)

El simulador juega la Capa 0 con un bot que compra lo de mejor retorno. Resultado con las constantes de `config.json`:

| Estilo de jugador | Primer Infinito | Compresiones |
| --- | --- | --- |
| Muy activo (revisa cada 5 s) | 3 h 20 min | 17 |
| **Atento (cada 15 s) — referencia** | **3 h 28 min** | 17 |
| Revisa cada minuto | 4 h 00 min | 17 |
| Casi idle (cada 5 min) | 6 h 41 min | 17 |

(Con los precios en potencias de 10 puras, §4.11. Antes del redondeo daba 3 h 07 / 3 h 14 / 3 h 48 / 6 h 16.)

Es el rango del primer Infinito de Antimatter Dimensions y Revolution Idle: unas 3 horas jugando atento, bastante más si se deja en segundo plano.

Línea de tiempo del jugador de referencia (salida real de `python3 balance/sim.py --timeline`):

| Minuto | Evento |
| --- | --- |
| 0:20 | Primera compra de Caudal y primera mejora de color (Ámbar) |
| 1:25 | Aparece Coral |
| 4:20 | Aparece Jade |
| 12:55 | Aparece Violeta |
| 16:05 | Compresión 1 (1e17) |
| 33 | Compresión 2 → se desbloquean Cascada y el autocomprador de Caudal |
| 47 | Compresión 3 → autocompradores de Ámbar y Coral |
| 62 | Compresión 4 → autocompradores de Jade y Violeta |
| 74 | Compresión 5 |
| 87 | Compresión 6 → Compresión automática |
| 128 | Compresión 10 y primer 1e120 → Mutaciones (primera a los 130) |
| 130–206 | Fase de Mutaciones, corridas de ~11 min |
| 206 | Compresión 17 (1e295) |
| 208 | **Infinito** (la última corrida dura menos de 2 minutos: es el clímax) |

Las corridas duran 15–17 min al principio y bajan a ~11 min. Nunca hay una corrida de más de 17 minutos para el jugador atento.

---

## 3. El bucle

```
caen granos ─► la pila crece ─► derrumbes ─► Energía ─► compras (caudal, colores, cascada)
     ▲                                                          │
     └──────────────────────────────────────────────────────────┘
al llegar al umbral: Compresión (reinicia la corrida, sube la Densidad) ─► corrida siguiente más rápida
al llegar a 2^1024: Infinito (fin de la Capa 0)
```

Detalle físico real que sostiene el juego (medido con una simulación exacta de la pila, ver `balance/`):

- Con G granos en la pila, cada grano nuevo provoca en promedio **0,035 × G derrumbes**. Por eso la producción sube sola aunque no compres: la pila crece.
- El radio de la pila es **0,375 × √G** celdas.
- En la pila estable, las celdas con 3 granos son ~59 %, con 2 ~22 %, con 0 ~14 % y con 1 ~5 %.
- El 75 % de los granos no provoca ningún derrumbe; el 1–2 % provoca avalanchas que concentran ~95 % de todos los derrumbes. Las avalanchas grandes son 100 a 400 veces el promedio. Ese es el "jackpot" natural del juego.

---

## 4. Economía: fórmulas exactas

Notación: `log10` en todos los costos. `G` = granos en la pila en esta corrida. Todos los niveles empiezan en 0.

**Todo precio es una potencia de 10 pura** (1e10, nunca 1,13e10): las fórmulas de costo de esta sección dan el exponente normal y el precio real es `10^redondear(exponente)`, al entero más cercano (x,5 sube). Vale para todo el juego, Capa 0 y Capa 1 (§4.11).

### 4.1 Producción

```
Energía/s = F × (0,035 × G) × V^D
```

- `F` = granos por segundo (Caudal).
- `0,035 × G` = derrumbes por grano.
- `V` = valor de cada derrumbe (producto de todos los multiplicadores de 4.3 a 4.6).
- `D` = Densidad, el exponente que da la Compresión (4.7). Se aplica **solo a V**, nunca a F ni a G.

`G` crece `F` por segundo. Energía arranca en 0. La primera corrida arranca con `G = 39` (`granos_iniciales`): el primer Puñado (4.10) cae sobre una pila al borde de una avalancha de ~20 derrumbes, así la primera avalancha llega con el primer toque. Las corridas después de comprimir arrancan vacías. Efecto medido en el simulador: la primera corrida dura unos 30 s menos; el primer Infinito del jugador de referencia no cambia.

### 4.2 Caudal

```
F = 1 × 2^nivel × 3^(mutación Caudal)
costo(nivel → nivel+1) = 10^(1 + 0,6·nivel + 0,075·nivel²)
```

Primeros costos (exponente redondeado): 10, 100, 1.000, 1.000, 1e5, 1e6… (el 3.º y el 4.º cuestan lo mismo: 2,5 sube a 3 y 3,475 baja a 3).

### 4.3 Colores

Cada color corresponde a una altura de celda en la pila. **El color más raro en la pila es el más caro y el más fuerte**: así lo que se ve y lo que se compra son lo mismo.

| Color | Altura de celda | % de celdas | Mult. por nivel | c0 | g | s | Aparece al alcanzar |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ámbar | 3 granos | 59 % | ×1,25 | 1 | 0,35 | 0,04 | desde el inicio |
| Coral | 2 granos | 22 % | ×1,5 | 4 | 0,50 | 0,08 | 1e4 |
| Jade | 0 granos | 14 % | ×2 | 9 | 0,70 | 0,15 | 1e9 |
| Violeta | 1 grano | 5 % | ×3 | 16 | 1,00 | 0,25 | 1e16 |

```
costo(nivel → nivel+1) = 10^(c0 + g·nivel + s·nivel²/2)
mult. del color = (mult. por nivel)^nivel × 4^floor(nivel / 25)
```

- **Hito cada 25 niveles: ×4 extra.** Es el momento de dopamina de cada color.
- Un color, una vez que apareció, queda desbloqueado para siempre (sobrevive a la Compresión; sus niveles no).

### 4.4 Anillos (Expansión)

Automático, sin compra. Cada vez que G se duplica a partir de 64 granos se gana un anillo.

```
anillos = G ≥ 64 ? floor(log2(G / 64)) + 1 : 0
mult. = (1,10 + 0,02 × mutación Expansión)^anillos
```

### 4.5 Cascada (se desbloquea con la Compresión 2)

Hace que las avalanchas grandes valgan más que proporcionalmente. El exponente sale de la distribución real de avalanchas medida.

```
c = 0,04 × nivel + (nivel ≥ 1 ? 0,03 × mutación Cascada : 0)
mult. = G^(0,478·c) / 10^(0,131·c)      (mínimo ×1)
costo(nivel → nivel+1) = 10^(40 + 6·nivel),  nivel máximo 10
```

### 4.6 Mutaciones (aparecen con 5 compresiones y haber llegado a 1e120)

Cuatro mejoras permanentes en la Capa 0 (no se pierden al comprimir). Nivel máximo 5 cada una.

| Mutación | Efecto por nivel | Costo nivel n → n+1 |
| --- | --- | --- |
| Caudal | Caudal ×3 | 10^(120 + 18n) |
| Colores | V ×10 | 10^(130 + 22n) |
| Expansión | +0,02 al multiplicador de cada anillo | 10^(125 + 20n) |
| Cascada | +0,03 a c (si Cascada ≥ 1) | 10^(140 + 28n) |

### 4.7 Compresión

Al alcanzar el umbral del siguiente nivel de Compresión se puede comprimir. **Reinicia:** Energía, G, Caudal, niveles de colores, Cascada, anillos. **Conserva:** nivel de Compresión, Mutaciones, colores desbloqueados, autocompradores, estadísticas.

```
Densidad D = 1 + 0,12 × (nivel de Compresión)
umbrales (log10 de Energía) = 17, 28, 36, 46, 56, 65, 80, 91, 102, 117, 148, 172, 205, 233, 253, 275, 295
```

Con 17 compresiones D = 3,04. Después de la 17 no hay más umbrales: la corrida final llega sola al Infinito.

Los umbrales son fijos (no dependen de cuánto esperes). Se calibraron para que cada corrida dure lo que marca la sección 2. Esto vuelve el balance robusto: comprimir "temprano" o "tarde" no rompe nada.

### 4.8 Autocompradores (recompensa de Compresión)

| Compresión | Desbloquea |
| --- | --- |
| 2 | Autocomprador de Caudal |
| 3 | Autocompradores de Ámbar y Coral |
| 4 | Autocompradores de Jade y Violeta |
| 6 | Compresión automática al llegar al umbral |

Cada autocomprador tiene un interruptor y, una vez por segundo, compra todos los niveles de lo suyo que se puedan pagar (como "Máx"). Cascada y Mutaciones siempre son manuales: son las decisiones.

### 4.9 Infinito

Al llegar a 2^1024 ≈ 1,8e308 de Energía: se congela la economía, se reproduce la secuencia de Infinito (sección 6.6) y la Capa 0 termina. Se guarda `infinitos = 1` para la Capa 1.

### 4.10 Puñado (interacción del primer minuto)

Clic o toque sobre la pila (o barra espaciadora): suelta 5 granos. Máximo 8 por segundo. No escala: es para que los primeros segundos sean activos y se sientan. No afecta el balance a partir del minuto 2.

### 4.11 Precios: potencias de 10 y softcap más allá del Infinito

```
precio = 10^redondear(exponente)                                (todo el juego)
mejoras de la Arena (Caudal, colores, Cascada, Mutaciones):
  costo = 10^redondear(exp_normal(nivel) + max(0, nivel − nivel_1e308))
```

- `exp_normal` es la fórmula de cada mejora (4.2, 4.3, 4.5, 4.6). `nivel_1e308` es el primer nivel cuyo `exp_normal` pasa de `softcap_desde_log10` (308): desde ahí cada nivel comprado multiplica ×10 el precio del siguiente, además de su escalado normal. Por debajo de 1e308 todo queda igual.
- En la Capa 0 no se llega nunca (la Energía se frena en 1e308); actúa en la Capa 1 con el Infinito roto.
- La tienda marca esas filas con una gema de hielo chica con "∞" ("Más allá del Infinito" en el tooltip).
- Se eligió redondear al más cercano y no hacia arriba: hacia arriba cada precio sube ×3 en promedio y el primer Infinito pasaba de 3 h 14 a 4 h 10 (fuera del ±10 %); compensarlo con multiplicadores no es estable (×1,01 en los multiplicadores lo bajaba a 2 h 21).

---

## 5. Revelado progresivo

Nada aparece antes de tiempo. La pantalla inicial tiene solo la pila, el contador de Energía y el texto "Tocá la pila".

| Cuándo | Aparece |
| --- | --- |
| Inicio | Pila, Energía, pista "Tocá la pila" |
| Primer derrumbe | Contador de derrumbes por grano |
| 5 de Energía | Tienda con Caudal |
| 8 de Energía | Ámbar |
| 1e4 / 1e9 / 1e16 | Coral / Jade / Violeta, cada uno con una animación de su color recorriendo la pila |
| Primer anillo | Indicador de anillos |
| 1e12 por primera vez | Barra de Compresión (todavía bloqueada, muestra la meta 1e17) |
| Compresión 2 | Pestaña de Cascada |
| Mutaciones disponibles | Pestaña de Mutaciones |

Cada aparición tiene una frase corta de una línea, sin ventanas modales. Ejemplo: "Coral: las celdas con 2 granos ahora valen más."

---

## 6. Dirección visual

### 6.1 Identidad

- Fondo azul noche casi negro (#07080F) con un viñeteado suave.
- Colores de celda con brillo propio: Ámbar #FFB547, Coral #FF6B6B, Jade #2DD4A7, Violeta #9B7BFF. Las celdas vacías fuera de la pila: transparentes.
- En la pila el brillo va al revés de la frecuencia, para que se lean las formas: Ámbar (celdas con 3 granos, ~59 %) es arena al atardecer #8A5320, sin luz propia, Coral intermedio #A4574F, Jade #3FE0B4 y Violeta #C2A8FF brillan con luz propia (Violeta, el más raro, la que más). Los colores de arriba quedan para la interfaz.
- Tipografía geométrica (Sora o Space Grotesk) y números con cifras tabulares (JetBrains Mono o la variante tabular de la principal) para que no "bailen".
- Nada de sombras pesadas ni degradados de botón. Paneles de vidrio translúcido con borde de 1 px.

### 6.2 La pila

- Ocupa el centro de la pantalla, siempre visible.
- Cada celda se pinta con el color de su altura. El brillo de cada color sube con su nivel (log del multiplicador del color, saturando suave). Así una pila "mejorada" se ve literalmente más luminosa.
- **Derrumbes:** cada celda que se derrumbó en el último frame recibe un destello aditivo que decae en ~300 ms. Una avalancha grande se ve como una onda de luz que sale del centro.
- **Avalanchas grandes:** si una avalancha supera 30× el tamaño promedio, se muestra un texto flotante "Avalancha ×N" y suena un golpe grave proporcional. Es solo visual: la Energía se acredita de forma continua según la fórmula.
- **Anillos:** al ganar un anillo, un círculo fino del color dominante se expande desde el borde de la pila y se desvanece, con el texto "Anillo 12 · ×1,10".

### 6.3 Escala de la pila

- Mientras G ≤ capacidad de la grilla visual, la pila de la pantalla es **exactamente** la pila real: se suelta cada grano.
- Grilla visual: 513 × 513 celdas con sumidero fuera del círculo inscrito (los granos que lo cruzan desaparecen), así la pila llena es redonda. Capacidad: el radio llega al borde con unos 463.000 granos.
- Cuando G supera la capacidad, la pila visual queda en estado crítico estacionario (sigue cayendo arena y sigue habiendo avalanchas para siempre) y aparece la etiqueta de escala "1 grano = 10^k granos", que sube cada vez que G se multiplica por 10. Cada salto de escala hace una animación corta de alejamiento de cámara.
- Ritmo de la simulación visual: `min(F, 3000)` granos por segundo, repartidos por frame. Nunca debe bajar de 60 fps.

### 6.4 Interfaz

Escritorio (16:9):

```
┌───────────────────────────────────────────────────────────────┐
│ Energía  1,23e45        +4,56e44/s        Densidad ^1,48      │
│                                                               │
│                      ┌─────────────────┐   ┌───────────────┐  │
│                      │                 │   │ TIENDA        │  │
│                      │      PILA       │   │ Caudal        │  │
│                      │                 │   │ Ámbar  ■      │  │
│                      │                 │   │ Coral  ■      │  │
│                      └─────────────────┘   │ Jade   ■      │  │
│  derrumbes/grano · anillos · escala        │ Violeta ■     │  │
│                                            │ [Comprar todo]│  │
│ ════════ Compresión 4 ▸ 1e46  ▓▓▓▓▓░░ 71% ══ [COMPRIMIR]      │
└───────────────────────────────────────────────────────────────┘
```

- La barra de Compresión avanza en escala logarítmica (de 1e(umbral anterior) al siguiente umbral) y muestra el tiempo estimado.
- Cada fila de la tienda: nombre, nivel, efecto actual, costo, botón. Modo de compra x1 / x10 / Máx global. "Comprar todo" con la tecla M.
- Pestañas: Tienda · Cascada · Mutaciones · Estadísticas · Logros · Ajustes. Las que no están desbloqueadas no existen todavía.
- Móvil (vertical): pila arriba (55 % de la pantalla), tienda como hoja inferior deslizable, Energía fija arriba.

### 6.5 Compresión

Animación de 1,5 s: toda la pila implota hacia el centro dejando una estela de los cuatro colores, destello blanco, y el texto "Densidad ^1,60". Luego la pila arranca de cero. Debe sentirse como una recompensa, no como una pérdida.

### 6.6 Infinito

La pila se vuelve blanca desde el centro hacia afuera, el número de Energía se transforma en "∞", la pila colapsa en un punto, silencio de un segundo y pantalla de fin de capa: tiempo total, compresiones, avalancha récord, y un adelanto de la Capa 1 ("Cristalización — próximamente"). El guardado queda listo para la Capa 1.

### 6.7 Sonido

Todo se genera por código con Web Audio: sin archivos de audio. Todo lo tonal usa una misma escala (pentatónica de Re).

- Derrumbes: textura granular de arena, cálida, que no cansa aunque suene durante horas; volumen, largo y tono según el tamaño de la avalancha. Limitar a 12 voces simultáneas.
- Avalanchas grandes: golpe grave y profundo con cola larga.
- Compras: una campana cristalina distinta por color, cada una en un grado de la escala.
- Hitos (×4 cada 25 niveles, anillos, aparición de color): acorde breve.
- Compresión: implosión que cae de tono y acorde de recompensa. Infinito: crescendo, un segundo de silencio y acorde final.
- Fondo: música generativa (pad) que gana una capa con cada color desbloqueado y nunca se repite igual.
- Volúmenes separados: general, efectos y música. El sonido arranca con la primera interacción.

### 6.8 Accesibilidad

- Opción "Reducir destellos" (desactiva destellos de avalancha y la animación blanca, deja transiciones suaves). Activada automáticamente si el sistema pide `prefers-reduced-motion`.
- Paleta alternativa para daltonismo (las cuatro alturas además se distinguen por brillo).
- Todo se puede jugar con teclado.

---

## 7. Logros (sin efecto en el balance, listos para Steam)

24 logros en la Capa 0, en este orden (grilla de 6×4). Cada uno da una recompensa cosmética: una paleta de la pila, un efecto de avalancha o un marco para la foto del mandala (8 de cada uno). Umbrales en `config.json → logros`.

1. Primer derrumbe
2. 100 granos en la pila
3. Avalancha de 1.000 derrumbes
4. Los cuatro colores
5. Primer hito ×4 de un color
6. Anillo 10
7. Hasta el borde: la pila de pantalla llega a su capacidad (toca el borde circular)
8. Alud: avalancha de 10.000 derrumbes
9. Primera Compresión
10. Compresión sin comprar Ámbar
11. Anillo 25
12. Mandala pleno: los cuatro colores en nivel 25 a la vez
13. Cascada al máximo
14. 10 Compresiones
15. Corrida relámpago: Compresión en menos de 8 min de corrida
16. Piloto automático: todos los autocompradores desbloqueados y encendidos
17. Primera Mutación
18. Densidad ^2
19. Anillo 50
20. Avalancha de 1e6 derrumbes en la pila visual (récord)
21. Todas las Mutaciones al máximo
22. Densidad ^3
23. Infinito
24. Infinito en menos de 2 horas

---

## 8. Arquitectura técnica

- **Stack:** Vite + TypeScript + Svelte 5 para la interfaz. Pila dibujada con WebGL2 (una textura con las alturas y un shader de fragmentos que pinta colores, brillo y destellos). Simulación visual de la pila en un Web Worker.
- **Números grandes:** `break_infinity.js` (Decimal) para Energía, producción y costos. La Capa 0 cabría en un double, pero las capas siguientes no.
- **Núcleo puro:** `src/core/` contiene la economía como funciones puras sin DOM ni tiempo real: `state.ts`, `formulas.ts`, `shop.ts`, `tick(state, dt)`, `compress(state)`. Las constantes se importan de `balance/config.json`; no hay números mágicos en el código.
- **Bucle:** economía en paso fijo de 50 ms con acumulador; render a la tasa de la pantalla. Si la pestaña está oculta, se calcula el tiempo transcurrido al volver.
- **Pila visual (worker):** `Uint8Array` de 513×513, pila de celdas inestables, envía al hilo principal cada frame la lista de celdas derrumbadas y el tamaño de la avalancha. Independiente de la economía (la economía usa la fórmula de 4.1).
- **Guardado:** `localStorage` cada 10 s y al cerrar; exportar/importar como texto base64; versión de guardado en el JSON para migraciones. Abstraer el almacenamiento en una interfaz para poder usar el sistema de archivos al empaquetar para Steam.
- **Progreso fuera de línea:** al cargar, simular el tiempo ausente con el mismo `tick` en pasos de 1 s (hasta 28.800 pasos, o sea 8 h exactas; si hay más tiempo, pasos más largos), aplicando autocompradores y compresión automática si están desbloqueados. Tope de 24 h. Mostrar un resumen "Mientras no estabas: +1e40 de Energía, 2 compresiones".
- **Formato de números:** hasta 999.999 con separador de miles; después notación científica con 2 decimales (`1,23e45`). Ajuste para notación de ingeniería.
- **Empaquetado para Steam:** fuera de alcance de la Capa 0, pero no usar APIs exclusivas del navegador fuera de la capa de almacenamiento.

---

## 9. Plan de implementación (hitos para Claude Code)

Cada hito termina con sus criterios cumplidos y el test de balance en verde.

1. **Núcleo económico + test de balance.** `src/core/` completo según la sección 4 y `tests/balance.test.ts` (sección 10). Sin interfaz.
   - Criterio: el test pasa con los mismos resultados que `balance/sim.py` (±5 %).
2. **Pila visual.** Worker + WebGL, granos reales hasta la capacidad, estado estacionario después, destellos de derrumbe, 60 fps con 3.000 granos/s.
   - Criterio: con G = 10.000 la pila visual tiene el mismo radio, derrumbes totales y proporción de alturas que la pila de referencia (`gcc -O3 -o pila balance/pila.c -lm && ./pila bulk 10000`).
3. **Interfaz principal.** Energía, tienda, revelado progresivo (sección 5), modos de compra, Comprar todo, formato de números.
   - Criterio: una persona nueva llega a la primera compra de Ámbar sin leer instrucciones.
4. **Compresión y sistemas tardíos.** Barra de Compresión, animación, autocompradores, Cascada, Mutaciones, Infinito.
   - Criterio: una partida completa acelerada (velocidad ×50 en modo debug) llega al Infinito sin errores.
5. **Persistencia.** Guardado, exportar/importar, fuera de línea, ajustes, estadísticas, logros.
   - Criterio: cerrar y abrir a mitad de una corrida no pierde nada; 8 h fuera producen lo que predice el núcleo.
6. **Pulido.** Animaciones de anillos y colores, sonido, accesibilidad, versión móvil, rendimiento.
   - Criterio: 60 fps estables en una laptop integrada; Lighthouse de accesibilidad ≥ 90.

Herramienta de desarrollo obligatoria: un panel de debug (solo en desarrollo) con velocidad del tiempo ×1/×10/×50, "dar Energía", "saltar a la Compresión N" y exportar el estado.

---

## 10. Test de balance

`tests/balance.test.ts` porta el bot de `balance/sim.py` a TypeScript **usando el núcleo real del juego** (no una copia de las fórmulas). Debe verificar, para el jugador que revisa cada 15 s con autocompradores:

| Medida | Rango aceptado |
| --- | --- |
| Primera Compresión | 13–17 min |
| Compresiones totales | 17 |
| Primera Mutación | 120–140 min |
| Infinito | 195–225 min |
| Ninguna corrida | > 17 min |

Regla: si se cambia cualquier valor de `config.json`, primero se corre `python3 balance/sim.py`, se actualizan las tablas de la sección 2 y recién después se cambia el juego.

---

## 11. Fuera de alcance de la Capa 0

Capa 1 (Cristalización) en adelante, logros con efecto, desafíos, monetización, Steamworks, localización a otros idiomas (pero todos los textos van en un archivo de cadenas desde el día uno, en español rioplatense neutro e inglés).

---

## 12. Decisiones abiertas

- **Nombre final.** "Avalancha" funciona en español; para Steam en inglés, *Topple* o *Criticality*.
- **Audio.** Componer o licenciar; el juego vive mucho del sonido de los derrumbes.
- **Profundidad de decisiones en la Capa 0.** El simulador muestra que el orden de compra importa poco en esta capa (un bot con decisiones ruidosas tarda casi lo mismo). Es coherente con "empezar simple", pero las decisiones fuertes tienen que llegar en la Capa 1.
