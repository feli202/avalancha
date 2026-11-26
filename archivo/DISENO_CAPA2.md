# Avalancha — Capa 2: Fuego (diseño final)

Nov 25, 2026 · @Felipe

## Resumen

La Capa 2 dura 10–12 h, tiene su propio reinicio (la Fundición) y no agrega sistemas sueltos: el fuego transforma lo que ya existe. Cada nodo de la Red tiene un nivel de fuego que lo cambia; la Escarcha se vuelve eterna; el Relicario, la Cascada, las Mutaciones y las compresiones se liberan; los Defectos ganan 5 cargas. Encima de todo hay tres cosas nuevas: la Temperatura (que sube el exponente de la producción), el Horno (el estrato 9, que funde arena en Vidrio) y el Motor de Brasas (la pantalla central, donde se reparte el calor).

- Monedas nuevas: Brasas (al fundir) y Vidrio (del Horno, todo el tiempo).

- Ritmo: la primera Fundición tarda alrededor de 1 h; después cada vuelta se acelera mucho con cada mejora de fuego.

- Final: la Ignición. La Temperatura llega tan alto que la arena se vuelve plasma, el cuarto estado de la materia. Es el puente a la Capa 3, que cambia las físicas de la pila (derrumbes en diagonal), toca el espacio y el tiempo y tiene a π como símbolo y mecánica.

- Sin velocidad del juego ni Fuelle por ahora: quedan guardados para más adelante.

Los números de este documento son puntos de partida: se calibran en el simulador antes de programar.

## Antes de empezar: migración de partidas

Lo primero que se programa, antes que cualquier cosa de fuego: los Cristales pasan a tener un tope duro en 1e308 hasta el fuego de Ruptura, así que las partidas que hoy pasaron ese número tienen que volver atrás sin romperse.

- Cristales y Cristales totales por encima de 1e308 → quedan en 1e308.

- Todo lo comprado con Cristales por encima de lo que se puede pagar con menos de 1e308 se devuelve: se bajan niveles (Estratos, Permeabilidad, Presión, nodos de la Red) del más caro al más barato hasta que lo gastado entre en 1e308. Lo devuelto no se reembolsa (ya están en el tope).

- Lo mismo con las Esquirlas si su economía se recalibra.

- Antes de migrar, se guarda una copia de respaldo de la partida original.

- Al cargar, un aviso corto: "Avalancha se actualizó a la Capa 2. Tu partida llegó al límite de la Capa 1 (1e308 Cristales): ya podés hacer tu primera Fundición."

- Tests con partidas reales de fin de Capa 1, de mitad de Capa 1 (no se tocan) y con valores rotos.

## La Fundición

El reinicio de la Capa 2: fundís las Capas 0 y 1 enteras y ganás Brasas.

- Requisito: llegar a 1e308 Cristales totales en la vuelta actual. Hasta el fuego de Ruptura, los Cristales se frenan ahí, así que 1e308 es a la vez el tope y la puerta.

- Brasas al fundir (punto de partida):

\text{Brasas} = \left\lfloor 10^{\frac{\max(0,\ \log_{10} C - 308)}{50}} \times M_B \right\rfloor

Antes del fuego de Ruptura el exponente es 0, así que cada Fundición da M_B Brasas (al principio, 1). M_B sube con el Horno (mejora Crisol), con Cristalografía II de fuego (según las cargas de Defectos completas) y con Ruptura II de fuego (las Brasas escalan mejor cuanto más pasás de 1e308). Las primeras Fundiciones dan pocas Brasas (1, 2, 3…), como los primeros Puntos de Eternidad, y cada una vale mucho.

| Al fundir | Qué pasa |
|---|---|
| Se reinicia | Toda la Capa 0 (Energía, granos, compras, compresiones, Mutaciones) y toda la Capa 1 (Cristales, niveles normales de la Red, reliquias e inventario, Estratos, Escarcha no eterna, Esquirlas, Defectos completos) |
| Se conserva | La Automatización y su configuración |
| Permanente (es de fuego) | Brasas, Vidrio, Temperatura, niveles de fuego de los nodos, el Horno y sus mejoras, Escarcha eterna y sus mejoras, inventario doble, liberaciones, cargas de Defectos, el reparto del calor |

- Fundición automática: más adelante (con un nivel de fuego), con las mismas reglas que el Infinito automático ("apenas llegás" o "multiplicar mis Brasas").

- Visual: la pila se derrite desde el centro hacia afuera, el hielo de la Capa 1 se evapora y queda una brasa en el medio. Es el momento más grande de la capa: tiene que sentirse.

## Temperatura, Motor de Brasas y reparto del calor

### La Temperatura

Se mide en Kelvin, arranca en 300 K (temperatura ambiente) y la Ignición es a 5.778 K, la temperatura de la superficie del Sol. Es permanente y nunca baja.

- Sube con: las Brasas totales (la fuente principal), Compactación II de fuego (cada compresión suma un poco) y una mejora del Horno.

- Efecto base, siempre activo: se suma a la Densidad, o sea, al exponente de toda la producción:

$$ D_{\text{total}} = D_{\text{Capa 0/1}} + \frac{T - 300}{1000} $$

A 5.778 K son +5,5 de Densidad: por eso los números explotan al final de la capa. Densidad ígnea (Compactación de fuego) aumenta este efecto.

### El Motor de Brasas

La pantalla nueva de la capa, en la barra lateral (ícono de brasa, color naranja): fondo oscuro, casi vacío, y un gran círculo de piedra en el centro. Adentro se ve el fuego, que sube con la Temperatura, y alrededor giran las Brasas y el Vidrio.

Se abre por etapas, como un iris:

| Etapa | Cuándo | Qué aparece |
|---|---|---|
| 1 | Primera Fundición | El círculo se entreabre: Temperatura y Brasas. Sectores Pila y Red |
| 2 | Se enciende el Horno | Vidrio. Sector Estratos |
| 3 | Escarcha eterna | Sector Escarcha |
| 4 | Relicario de fuego | Sector Relicario. El Motor queda abierto del todo |

### El reparto del calor

El calor disponible (T − 300) se reparte entre los sectores abiertos arrastrando o con porcentajes. Cada sector da un extra a su sistema según cuánto calor recibe:

| Sector | Extra (punto de partida) |
|---|---|
| Pila | Caudal y colores multiplican más |
| Red | Más Cristales por segundo |
| Estratos | Más flujo en los 8 estratos y más arena al Horno |
| Escarcha | Más Esquirlas por segundo |
| Relicario | Las reliquias equipadas rinden más |

No hay un reparto perfecto: conviene cambiarlo según qué te frena. Se pueden guardar 3 repartos y cambiar con un toque. Está en la Automatización (cambiar de reparto según la etapa de la vuelta), más adelante.

## El Horno y el Vidrio

El fondo vacío del embudo de los Estratos (el estrato 9) se enciende con el fuego del nodo Estratos y funde en Vidrio la arena que baja. El Vidrio es permanente (no se pierde al fundir); el Horno produce más cuanto más llenos están los estratos de esa vuelta, así que cada vuelta arranca lento y acelera.

\text{Vidrio/s} = v_0 \cdot 10^{\,0{,}01 \cdot s_8} \cdot M_{\text{Horno}}

(s_8 = log10 de los granos del estrato 8; v_0 y 0,01 son puntos de partida.) M_Horno sube con las mejoras del Horno, el sector Estratos del Motor, Sedimento II, Abismo y Eco II de fuego. Cristal fundido (Cristalografía de fuego) suma dos fuentes más: Vidrio extra en cada Infinito, y por segundo un 1 % (o menos, a calibrar) del Vidrio que darían los Infinitos al ritmo de tus Cristales por segundo.

### Mejoras del Horno (con Vidrio, precios en 1eN, escalado fuerte)

| Mejora | Qué hace |
|---|---|
| Temperatura del Horno | Más Vidrio por segundo |
| Tiro | El calor sube más por el embudo: más flujo en los estratos (se suma a Convección) |
| Crisol | Más Brasas al fundir (sube M_B) |
| Calor latente | Suma Temperatura (K) |
| Templado | Las reliquias equipadas rinden más (automático, sin tocar nada) |

Visual: el fondo del embudo brilla naranja; la arena que cae se derrite en gotas de vidrio que se juntan abajo. Los estratos de abajo se ponen rojizos con la Convección (Capilaridad de fuego).

## La Red de fuego

Cada nodo tiene un quinto nivel, el de fuego, que se compra con Brasas, es permanente y transforma el nodo: nombre nuevo, efecto nuevo y aspecto nuevo. Para comprarlo, el nodo tiene que estar en nivel 4 en la vuelta actual; una vez comprado, su efecto de fuego está activo desde el inicio de cada vuelta.

Cómo se ve:

- En la Red: el nodo de fuego cambia por completo: la columna o el anillo se llena de lava que late despacio, el nombre cambia, y las conexiones con sus vecinos se vuelven brasas.

- En el panel del nodo (el que se abre al tocarlo, con los 4 cuadraditos de nivel): aparece un quinto cuadradito especial, con forma de llama, después de Ámbar, Coral, Jade y Violeta. Muestra el efecto de fuego ("Ahora / Con fuego") y el precio en Brasas.

| Nodo | Con fuego | Qué hace | Precio (Brasas, punto de partida) |
|---|---|---|---|
| Memoria | Memoria eterna | Cada vuelta arranca con Memoria al máximo y los autocompradores van el doble de rápido | 1 |
| Estratos | El Horno | Enciende el estrato 9 (Vidrio) | 2 |
| Sedimentación | Lecho infinito | Compresiones sin tope de 17, con escalado propio | 3 |
| Eco | Resonancia | El Eco también cuenta las Brasas totales | 3 |
| Cascada+ | Desborde | Cascada sin máximo de niveles, con softcap fuerte | 5 |
| Mutación+ | Metamorfosis | Mutaciones sin máximo de niveles, con softcap fuerte | 8 |
| Compactación | Densidad ígnea | La Temperatura suma más a la Densidad | 10 |
| Engarces | Relicario de fuego | Inventario doble; se elige sola una reliquia de cada tipo y suben con lo que tenés | 15 |
| Presión | Magma | El peso de los Estratos crece con la Temperatura | 20 |
| Cristalografía | Cristal fundido | Vidrio en cada Infinito y un 1 % por segundo del Vidrio que darían tus Infinitos | 25 |
| Frío | Escarcha eterna | La Escarcha no se rompe y da Esquirlas por segundo | 30 |
| Inercia | Inercia eterna | El impulso de los estratos no tiene tope (softcap) | 40 |
| Defectos | Fallas | Abre las cargas 2–5 de los Defectos 1–4 | 50 |
| Ruptura | Fusión del Infinito | Los Cristales pasan de 1e308 (las Brasas empiezan a escalar) | 75 |
| Germen | Hielo y fuego | La Escarcha crece más rápido cuanta más Temperatura | 100 |
| Capilaridad | Convección | El calor del Horno sube por el embudo y acelera los 8 estratos | 150 |
| Sedimento II | Sedimento fundido | Los estratos profundos mandan más arena al Horno | 200 |
| Abismo | Abismo ardiente | Cada estrato lleno multiplica el Horno | 300 |
| Eco II | Eco del Horno | El Eco multiplica el Vidrio | 400 |
| Compactación II | Compresión térmica | Cada compresión suma Temperatura | 500 |
| Deshielo | Deshielo automático | Autocompradores para las mejoras de la Escarcha | 700 |
| Defectos II | Fallas profundas | Abre las cargas 2–5 de los Defectos 5–8 | 1.000 |
| Engarces II | Engaste de lava | Un espacio más de reliquia; las equipadas cuentan como un nivel más (todo automático) | 1.500 |
| Cristalografía II | Facetas de fuego | Más Brasas al fundir según las cargas de Defectos completas | 2.500 |
| Ruptura II | Fusión | Las Brasas escalan mejor cuanto más pasás de 1e308 Cristales | 5.000 |

El orden de precios es una propuesta: primero calidad de vida (Memoria eterna), después el Horno y las liberaciones, a mitad de capa la Escarcha eterna y romper el tope de Cristales, y al final los nodos que hacen explotar el Horno y las Brasas. Se calibra en el simulador.

## Escarcha eterna, Relicario de fuego, liberaciones y Defectos

### Escarcha eterna (Frío con fuego)

- La Escarcha deja de romperse. El espesor sigue creciendo y da Esquirlas por segundo: Esquirlas/s = 10^(logX/40) × M_Esq (punto de partida).

- Las mejoras se transforman (mismo lugar en el panel, nombre nuevo, compras repetibles):

| Antes | Con fuego | Efecto |
|---|---|---|
| Crecimiento | Cristalización continua | Más velocidad de crecimiento, sin tope |
| Brillo | Fulgor | El aporte de la Escarcha a la producción crece más fuerte |
| Aguante | Templanza | La penalidad de la Escarcha baja (nunca a 0: mínimo 20 %) |

- Todo lo comprado con fuego es permanente. Los autocompradores de estas mejoras llegan con Deshielo automático.

- Las Esquirlas siguen sirviendo para el Pulido de reliquias y, ahora, para las compras escaladas (ver Escalado).

### Relicario de fuego (Engarces con fuego)

- Inventario doble (el tamaño fijo de la Capa 1 × 2).

- Todo automático: en cada Infinito se elige sola una reliquia de cada tipo (Cauce, Cascada, Mutaciones), se fusionan solas las de 3 iguales y se engarzan solas las mejores. El jugador puede mirar, pero no hay que tocar nada.

- El pop-up de reliquias deja de aparecer en el Infinito manual (queda un aviso chico y opcional).

- Engaste de lava (Engarces II con fuego): un espacio más, y las reliquias engarzadas cuentan como un nivel más. También automático.

### Las liberaciones (se abren en momentos distintos)

Cada una rompe un tope de la Capa 1 con un softcap fuerte: pasado el tope, cada nivel cuesta ×10 más y rinde la raíz cuadrada de lo que rendía. Cada una tiene su palabra icónica, que aparece grande al comprarla.

| Liberación | Nodo | Momento aproximado | Palabra |
|---|---|---|---|
| Compresiones sin tope | Sedimentación | Fundición 1–2 | LECHO |
| Cascada sin máximo | Cascada+ | ~1,5 h | DESBORDE |
| Mutaciones sin máximo | Mutación+ | ~2,5 h | METAMORFOSIS |
| Inercia sin tope | Inercia | ~4 h | ETERNA |

### Defectos con 5 cargas

- Los 8 Defectos ganan las cargas 2 a 5. La carga 1 es la de la Capa 1 (se conserva hecha). Fallas abre las cargas 2–5 de los Defectos 1–4; Fallas profundas, las de los 5–8.

- Cada carga es más dura: la regla del Defecto se aplica con más fuerza (carga n = regla × n) y la meta sube: meta_n = meta_1 × 10^(k·(n−1)), con k propio de cada Defecto.

- Cada carga da más: la recompensa crece con la carga (carga 5 = la recompensa de la Capa 1 elevada a 2,5) y además cada carga completa da Brasas una sola vez y un +0,2 % de M_B permanente.

- Muy difíciles: la carga 5 de cada Defecto tiene que costar intentos y una buena configuración del reparto del calor. Las cargas completas se conservan siempre (no se resetean con la Fundición).

## Escalado e Ignición

### Escalado después de la primera Fundición

La primera vuelta es larga y despareja a propósito; desde la segunda, las compras repetibles crecen mucho más y la vuelta se vuelve rápida.

- Estratos: cada compra de los 8 estratos rinde ×(1 + 0,5 · Fundiciones) más, con softcap a las 20 Fundiciones. Los estratos se abren llenos desde el inicio de cada vuelta.

- Compras con Esquirlas: aparecen dos repetibles nuevas: Esquirla de fuego (multiplica la Temperatura ganada por Fundición) y Geoda (multiplica las Esquirlas/s). Costo ×10 por nivel; sin tope.

- Cristales: con Fusión del Infinito los Cristales pasan de 1e308; los números llegan a e1.000–e5.000 a mitad de capa y a ~e1e6 en la Ignición.

- Regla: ninguna vuelta después de la quinta debería durar más de 20 minutos activos; las últimas, 3–5 minutos.

### Ignición (5.778 K, el fin de la Capa 2)

- Al llegar a 5.778 K (la temperatura de la superficie del Sol) la pila deja de ser arena fundida: se vuelve plasma.

- Cinemática: el Horno se pone blanco, la pila se ilumina desde adentro, los granos dejan de caer en cruz y por un instante caen también en diagonal; el borde de la pila se curva hasta formar un círculo y aparece, apenas un segundo, el símbolo π. Corte a negro: "Capa 3 próximamente".

- Pantalla de resumen como la de la Capa 1 (tiempo, Fundiciones, Temperatura máxima, Vidrio, foto de la pila en plasma), descargable, con links a Discord e itch.io.

- Puente a la Capa 3: en la barra lateral aparece la silueta de la Capa 3 (un círculo). La Capa 3 cambia las físicas de la pila (derrumbes en diagonal), toca el espacio y el tiempo, y π es clave en lo simbólico y en lo jugable. En la Capa 2 solo se insinúa: nada de mecánicas de la Capa 3 todavía.

## Ritmo, balance e implementación

### Ritmo objetivo (10–12 h activas)

| Hora | Hito |
|---|---|
| 0:00 | Migración; empieza la primera vuelta hacia 1e308 Cristales |
| ~1:00 | Primera Fundición (cinemática de derretido, Motor etapa 1) |
| 1:00–2:00 | Memoria eterna, El Horno, Lecho infinito; primeras vueltas de 20–30 min |
| ~1:30 | DESBORDE (Cascada sin máximo) |
| ~2:30 | METAMORFOSIS; Motor etapa 2 (Horno) |
| ~3:30 | Fallas: cargas 2–5 de los Defectos 1–4 |
| ~4:00 | Escarcha eterna; INERCIA ETERNA; Motor etapa 3 |
| ~5:00 | Fusión del Infinito (Cristales > 1e308; las Brasas empiezan a escalar) |
| ~6:30 | Relicario de fuego completo; Motor etapa 4 |
| ~8:00 | Fallas profundas; ~3.000 K |
| 9:00–11:00 | Vueltas de 3–5 min, cargas 5 de los Defectos, Abismo ardiente y Fusión |
| 10–12 h | Ignición a 5.778 K |

### Reglas de balance

- Simulador primero. Nada de esto se implementa sin que el simulador de la Capa 2 dé la tabla de arriba (±30 min por hito).

- Ninguna fuente pesa más del 40 % de la producción total en ningún momento (desglose por fuente en el simulador y en Estadísticas).

- Huecos: nunca más de 30 min activos sin una compra nueva que se sienta.

- Offline: sigue nerfeado como en la Capa 1 (2 h, 10 %, sin Infinitos ni Fundiciones). La Escarcha eterna crece offline al mismo 10 %.

- No hacer análisis largos de balance si no hacen falta: calibrar con el simulador y una tabla, y listo.

- Todo número de la Capa 2 en log10 o break_infinity, y todas las constantes en un solo archivo de configuración.

### Plan de implementación (orden)

- Migración de partidas terminadas a 1e308 Cristales, con reversión de compras (sección Migración). Tests con partidas reales. Se publica sola, antes que todo lo demás.

- Simulador de la Capa 2 sobre el simulador actual del repo (no sobre el viejo): Fundición, Temperatura, Motor, Horno, nodos de fuego, liberaciones, Defectos con cargas. Calibrar la tabla de ritmo.

- Spec corta en docs/ partida por sistema (fundicion.md, horno.md, red_fuego.md, escarcha_eterna.md, defectos_cargas.md) y una línea en docs/INDICE.md por cada uno.

- Núcleo: Fundición + Brasas + Temperatura + guardado v3 con migración.

- Motor de Brasas y reparto del calor (pantalla del iris, 3 repartos guardados).

- Red de fuego: quinto nivel en los 25 nodos, visual de lava y el quinto cuadradito con forma de llama en el panel.

- El Horno y el Vidrio (estrato 9 encendido, mejoras, visual).

- Escarcha eterna, Relicario de fuego y liberaciones.

- Defectos con 5 cargas.

- Escalado, Ignición, resumen final y test de balance completo de la Capa 2.

- Auditoría, pulido en celular, capturas y publicación.

La guía paso a paso con un prompt por sesión (y qué modelo usar en cada una) va aparte, apuntando a los archivos de docs/ para no gastar créditos leyendo todo.
