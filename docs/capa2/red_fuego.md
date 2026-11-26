## La Red de fuego

Cada nodo tiene un quinto nivel, el de fuego, que se compra con Brasas, es permanente y transforma el nodo: nombre nuevo, efecto nuevo y aspecto nuevo. Para comprarlo, el nodo tiene que estar en nivel 4 en la vuelta actual; una vez comprado, su efecto de fuego está activo desde el inicio de cada vuelta.

Cómo se ve:

- En la Red: el nodo de fuego cambia por completo: la columna o el anillo se llena de lava que late despacio, el nombre cambia, y las conexiones con sus vecinos se vuelven brasas.

- En el panel del nodo (el que se abre al tocarlo, con los 4 cuadraditos de nivel): aparece un quinto cuadradito especial, con forma de llama, después de Ámbar, Coral, Jade y Violeta. Muestra el efecto de fuego ("Ahora / Con fuego") y el precio en Brasas.

En el orden en que los compra el bot (por precio; empate: el orden de esta tabla), con la hora en el simulador:

| Nodo | Con fuego | Qué hace | Precio (Brasas) | Sim |
|---|---|---|---|---|
| Memoria | Memoria eterna | Cada vuelta arranca con Memoria al máximo y los autocompradores van el doble de rápido | 1 | 0:13 |
| Sedimentación | Lecho infinito | Compresiones sin tope de 17, con escalado propio ([liberaciones.md](liberaciones.md)) | 1 | 1:11 |
| Cascada+ | Desborde | Cascada sin máximo de niveles, con softcap fuerte | 1 | 1:45 |
| Estratos | El Horno | Enciende el estrato 9 (Vidrio, [horno.md](horno.md)) | 1 | 2:14 |
| Mutación+ | Metamorfosis | Mutaciones sin máximo de niveles, con softcap fuerte | 1 | 2:39 |
| Eco | Resonancia | El Eco también cuenta las Brasas totales: Eco += p × 300 × B_tot^0,2 | 2 | 2:58 |
| Compactación | Densidad ígnea | La Temperatura suma ×1,5 a la Densidad | 3 | 3:06 |
| Defectos | Fallas | Abre las cargas 2–5 de los Defectos 1–4 | 5 | 3:22 |
| Frío | Escarcha eterna | La Escarcha no se rompe y da Esquirlas por segundo | 9 | 3:52 |
| Inercia | Inercia eterna | El impulso de los estratos ×(1 + √(horas de la vuelta)) | 15 | 4:11 |
| Presión | Magma | El peso de los Estratos ×(1 + 0,2 × (T − 300)/1000) | 26 | 4:31 |
| Cristalografía | Cristal fundido | Cada Infinito suma 10 s de Vidrio | 32 | 4:55 |
| Ruptura | Fusión del Infinito | Los Cristales pasan de 1e308 (las Brasas empiezan a escalar) | 43 | 5:26 |
| Germen | Hielo y fuego | La Escarcha crece ×(1 + 0,5 × (T − 300)/1000) | 45 | 6:02 |
| Engarces | Relicario de fuego | Inventario doble; una reliquia de cada tipo por Infinito, fusión y engarce solos | 63 | 6:30 |
| Capilaridad | Convección | Flujo de los 8 estratos ×(1 + 0,5 × (T − 300)/1000) | 88 | 7:05 |
| Sedimento II | Sedimento fundido | El exponente del Vidrio (0,01 × s_8) ×1,5 | 122 | 7:40 |
| Defectos II | Fallas profundas | Abre las cargas 2–5 de los Defectos 5–8 | 123 | 8:05 |
| Compactación II | Compresión térmica | Cada compresión suma 0,05 K | 241 | 8:28 |
| Eco II | Eco del Horno | Vidrio ×10^(0,001 × p × log10 C) | 337 | 8:53 |
| Deshielo | Deshielo automático | Autocompradores para las mejoras de la Escarcha | 472 | 9:18 |
| Cristalografía II | Facetas de fuego | M_B ×(1 + 0,05 × cargas completas) | 661 | 9:34 |
| Engarces II | Engaste de lava | Un espacio más de reliquia; las equipadas cuentan como un nivel más | 926 | 9:38 |
| Abismo | Abismo ardiente | Vidrio ×2 por estrato lleno | 1.296 | 9:43 |
| Ruptura II | Fusión | Las Brasas escalan mejor: el exponente 5,2 ×1,387 | 1.814 | 9:48 |

El orden cambió respecto del punto de partida para seguir la tabla de ritmo: el Horno va después de Lecho y Desborde (DESBORDE ~1:30, Horno 2:00–2:30), Fallas antes que la Escarcha eterna, y el Relicario de fuego después de la Fusión del Infinito (~6:30). Los precios quedaron más chicos (5.000 → 1.814 el último) porque antes de la Fusión cada Fundición da solo M_B = 1–2 Brasas. En el simulador, Memoria eterna no duplica la velocidad de los autocompradores (el bot ya compra cada segundo) y Deshielo automático no cambia nada (el bot compra las mejoras de la Escarcha igual).

### Cómo quedó (fase 3, beta)

- `fuego.nodos` en la partida; precios de `red_fuego` en config; `puedeComprarFuego`/`comprarFuego` en `src/core/fuego.ts` (nodo en nv4 en la vuelta, Brasas, permanente). Los 25 nombres en `src/strings`.
- Funcionan solo **Memoria eterna** (al fundir, Memoria nv4 y sus 11 compresiones; autocompradores ×`autocompradores_x` = 2 más seguido: el paso del tick se divide), **Lecho infinito** (`umbralLog10` y `densidad`, ver [liberaciones.md](liberaciones.md)) y **Resonancia** (`ecoLog10`). El resto dice "Próximamente" y no se compra (`FUEGO_HECHO`); una partida beta que ya tenga otro nodo de fuego lo conserva.
- Panel del nodo (`Red.svelte`): una llama después de Violeta (naranja tenue apagada, degradé encendida). Al tocarla, o sola con el nodo en nv4: "Con fuego: nombre: efecto", el precio en Brasas y Encender. La lava en la Red y el aspecto definitivo son de la fase 4.

### Cómo quedó el aspecto (fase 4, beta)

- En la Red, un nodo con fuego cambia en cualquier nivel de la vuelta: su pila teñida de lava bajo un degradé que late despacio y a saltos (`steps(14)` en 5 s: menos de 3 cambios por segundo, quieto con Reducir movimiento o ahorro), aro de brasa, nombre de fuego (en el celular, el corto de `fuego.cortos`) y una llamita después de sus 4 cuadros. Sus conexiones con los vecinos son vetas de brasa (sin ramitas de escarcha) con un halo naranja.
- Panel del nodo: la llama es un SVG (contorno de brasa apagada, llena y con brillo encendida). Con fuego el título pasa al nombre de fuego y la cara a lava. "Ahora:" el efecto del nivel, "Con fuego:" el nombre y lo que hace (los que todavía no funcionan, con la descripción de `fuego.descripciones`) y el precio en Brasas, también en los "Próximamente".
