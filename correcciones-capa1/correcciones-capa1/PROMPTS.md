# Prompts de las correcciones (Opus 5.5, una conversación nueva por sesión)

Cada prompt empieza con el mismo encabezado. Copiá el bloque entero de la sesión que toca.

---

## Sesión 1 — Bloques 1 a 4: antiparpadeo, sonido, bug del AUTO, guías una sola vez

```
Leé CLAUDE.md, PROGRESO.md, SPEC_CAPA1.md y correcciones-capa1/CORRECCIONES_CAPA1.md entero, y mirá las capturas de
correcciones-capa1/capturas/ (las "_MAL" son cómo está ahora; las "referencia_" son la idea de funcionamiento, no de
estética). Vamos a hacer las correcciones en 9 sesiones; en PROGRESO.md anotá la lista de las 9 sesiones (está en
correcciones-capa1/PROMPTS.md) y marcá esta como en curso.

En esta sesión hacé SOLO los bloques 1, 2, 3 y 4: antiparpadeo ("Reducir destellos" activado por defecto), sonidos
sin amontonarse (las compras automáticas no suenan), el bug del indicador AUTO con Memoria (una sola función para
lógica e interfaz, con test) y las guías que se muestran una sola vez en la vida de la partida (con migración).

Después de cada bloque: tests verdes, abrí el juego y probalo con los autocompradores andando, commit con el nombre
del bloque, y anotalo en PROGRESO.md.
```

**Qué revisar:** con todos los autocompradores prendidos, la pantalla está tranquila y no suena nada; las filas con Memoria dicen AUTO; hacer un Infinito no vuelve a mostrar guías viejas.

---

## Sesión 2 — Bloques 5 y 6: balance de Estratos y Red

```
Leé CLAUDE.md, PROGRESO.md, SPEC_CAPA1.md y los bloques 5 y 6 de correcciones-capa1/CORRECCIONES_CAPA1.md.

En esta sesión hacé SOLO los bloques 5 y 6 (balance). Orden obligatorio:
1) Implementá los cambios en balance/sim_capa1.py: estratos que se llenan de golpe al abrirse y que aceleran al de
   arriba, y los nodos nuevos de la Red (Inercia, Capilaridad, Sedimento II, Abismo, Cristalografía II,
   Compactación II, Eco II, Sedimentación nv4 conserva Cascada), y el Relicario como inventario de reliquias por
   nivel (bloque 8, solo la parte de números).
2) Calibrá con tune.py (sin tocar config) hasta que la tabla quede en los rangos del bloque 5 y abrir cualquier
   estrato multiplique la producción por al menos x100. Mostrame la tabla y esa medición.
3) Si no lográs los rangos, FRENÁ y explicame qué pasa. No fuerces números.
4) Recién con la tabla aprobada: config_capa1.json, SPEC_CAPA1.md (secciones 2, 6 y 7) y el núcleo del juego
   (lógica y tests; la parte visual de Red y Estratos va en otras sesiones). Tooltips de nodos en una frase clara.

Tests verdes (incluido el de balance), commit y PROGRESO.md con la tabla nueva.
```

**Qué revisar:** la tabla de tiempos que te muestra. Si algo no te cierra, pasámela antes de que siga.

---

## Sesión 3 — Bloque 13: estética de cristal y escarcha, barra lateral

```
Leé CLAUDE.md, PROGRESO.md y el bloque 13 de correcciones-capa1/CORRECCIONES_CAPA1.md. Mirá la interfaz de la
Capa 0 (es la referencia de calidad y tipografía) y las capturas "_MAL" de la Capa 1.

En esta sesión hacé SOLO el bloque 13: un sistema de estilo para toda la Capa 1 (placas de hielo con esquinas
facetadas, textura de escarcha, botones de cristal biselados, colores, partículas suaves de escarcha en el fondo,
todo respetando "Reducir destellos") como componentes reutilizables, y aplicalo a lo que ya existe: encabezado de
Cristalización, pestañas, paneles de Estratos y Relicario actuales. Barra lateral más ancha con íconos de capa con
color y personalidad (Arena ámbar, Cristalización cian) y el nombre debajo.

Sacá capturas antes y después, miralas con ojo crítico: si algo parece página web o plantilla, todavía no está.
Commit y PROGRESO.md.
```

**Qué revisar:** que se sienta helado y de juego, no de página web, y que siga siendo de la misma familia que la Capa 0.

---

## Sesión 4 — Bloque 7: multiplicadores visibles

```
Leé CLAUDE.md, PROGRESO.md y el bloque 7 de correcciones-capa1/CORRECCIONES_CAPA1.md.

En esta sesión hacé SOLO el bloque 7: cada mejora muestra su valor final con todos los multiplicadores aplicados,
tooltip con el desglose al pasar el mouse, velocidad local de cada estrato con su desglose, y la Presión explicada
en "×" (cada derrumbe vale ×...). Usá el estilo de la sesión 3.

Test de que el valor mostrado coincide con el del núcleo. Abrí el juego, probalo, commit y PROGRESO.md.
```

**Qué revisar:** comprá un nodo que multiplique el Caudal y fijate que la fila de Caudal cambie su número.

---

## Sesión 5 — Bloque 8: Relicario como inventario

```
Leé CLAUDE.md, PROGRESO.md y el bloque 8 de correcciones-capa1/CORRECCIONES_CAPA1.md. Mirá las capturas
01_relicario_actual_MAL (lo que hay que tirar), 02_referencia_revolution_idle_zodiacos y
03_referencia_antimatter_glifos (la idea de inventario, NO su estética).

En esta sesión hacé SOLO el bloque 8: elegir el tipo en cada Infinito, inventario en grilla, fusión de 3 iguales
con animación, engarces, efectos por nivel, la cara de cada reliquia = instantánea de la pila de ese Infinito
renderizada con el generador de miniaturas compartido (un solo renderizador), y la regla de elección automática
(se configura en el panel de Automatización de la sesión 8; dejá la lógica y una configuración provisoria).
Migración: convertí las reliquias que tenga el guardado al inventario nuevo sin que el jugador pierda poder.

Tests: fusión, efectos, migración, regla automática. Estilo de la sesión 3. Capturas, commit y PROGRESO.md.
```

**Qué revisar:** hacé varios Infinitos con debug, fusioná 3 Ámbar en un Coral y fijate que cada reliquia tenga su propia pila.

---

## Sesión 6 — Bloque 9: Red en 3D de cristal

```
Leé CLAUDE.md, PROGRESO.md y el bloque 9 de correcciones-capa1/CORRECCIONES_CAPA1.md. Mirá las capturas
04_red_actual_MAL y 07_red_actual_con_nodos_MAL (lo que hay que reemplazar).

En esta sesión hacé SOLO el bloque 9: la Red como pila 3D de cristal vista en diagonal con three.js: columnas cuya
altura es el nivel, colores por nivel, nodos bloqueados como escarcha (sin candados), anillo 3 dentro de hielo
grueso, animación de derrumbe al maxear, nombres en HTML posicionado, panel lateral al hacer clic. Mismas reglas de
rendimiento que los Estratos (un solo renderer, creado al entrar y destruido al salir, render a demanda).

Medí fps y memoria entrando y saliendo 10 veces. Capturas, commit y PROGRESO.md con los números.
```

**Qué revisar:** que se lea como una pila de cristal mítica y que la pila de la Arena siga a 60 fps después de entrar y salir.

---

## Sesión 7 — Bloque 11: Estratos con físicas

```
Leé CLAUDE.md, PROGRESO.md y el bloque 11 de correcciones-capa1/CORRECCIONES_CAPA1.md. Mirá la captura
08_estratos_actual_MAL.

En esta sesión hacé SOLO el bloque 11: cada estrato como pila abeliana simulada de verdad (decorativa) en el
worker o la GPU, los granos que caen por el borde pasan al de abajo, losas grandes, la base de la pila vista desde
abajo en vez del agujero negro, evolución visual al llenarse, roca que se rompe al abrir, y la interfaz de cada
estrato con el estilo de la sesión 3 y las dos mejoras con aspecto distinto.

Medí fps y memoria. La simulación solo corre con la pantalla abierta. Capturas, commit y PROGRESO.md.
```

**Qué revisar:** que se vea la arena pasar de un estrato a otro, y que al abrir uno nuevo la producción salte.

---

## Sesión 8 — Bloque 10: panel de Automatización

```
Leé CLAUDE.md, PROGRESO.md y el bloque 10 de correcciones-capa1/CORRECCIONES_CAPA1.md. Mirá la captura
06_referencia_antimatter_autocompradores (organización, NO estética).

En esta sesión hacé SOLO el bloque 10: entrada "Automatización" en la barra lateral, una fila por autocomprador con
interruptor, intervalo, cantidad y condición, Infinito automático con sus modos y la regla de reliquias completa
del bloque 8 (reemplaza la configuración provisoria de la sesión 5), y "Encender todo / Apagar todo".

Tests de que cada interruptor y regla hace lo que dice. Estilo de la sesión 3. Capturas, commit y PROGRESO.md.
```

**Qué revisar:** apagá un autocomprador y fijate que la fila de la tienda deje de decir AUTO; probá cada regla de reliquias.

---

## Sesión 9 — Bloque 12 y cierre

```
Leé CLAUDE.md, PROGRESO.md y el bloque 12 y la sección "Al terminar todo" de
correcciones-capa1/CORRECCIONES_CAPA1.md.

En esta sesión: escribí todas las guías del bloque 12 (una sola vez cada una, con su página en el panel de ayuda y
su fórmula), dejando bloqueadas las de Defectos y Escarcha. Después hacé la lista completa de "Al terminar todo":
simulador con --robustez, SPEC_CAPA1.md al día, todos los tests, y capturas en correcciones-capa1/capturas_despues/.

Al final decime qué quedó pendiente o qué decidiste distinto en todas las sesiones y por qué.
```

**Qué revisar:** empezá una partida nueva con debug hasta Cristalización y fijate que cada guía aparezca una vez y se entienda.
