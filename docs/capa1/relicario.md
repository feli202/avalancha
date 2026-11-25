# Capa 1 · Relicario de Cristal

Núcleo: `src/core/relicario.ts`. UI: `src/ui/Relicario.svelte`, `IconoTipo.svelte`. Config: `config_capa1.json → relicario`, `escarcha.pulido`. Test: `tests/relicario.test.ts`.

## Tipos (efecto por nivel n = 0, 1, 2…)

| Tipo | Efecto |
|---|---|
| **Cauce** | Valor de los colores ^(1 + 0,015 × (n+1)) (suma `colores_log10 × 0,015 × (n+1)` a log V) |
| **Cascada** | +0,02 × (n+1) a `c` de la Cascada |
| **Mutaciones** | Mutaciones de Caudal y Colores ^(1 + 0,08 × (n+1)) |

Solo dan efecto las **engarzadas**; dos del mismo tipo se suman. 1 engarce al inicio; Engarces da 2/2/3/3 (Engarces II: 3). Equipar es gratis (arrastrar o tocar).

## Inventario

- Cada Infinito da **una** reliquia (dos con Engarces nv4, `reliquias_por_infinito`) y el jugador **elige el tipo**. Nace Ámbar (n = 0).
- Grilla fija de `relicario.casilleros` = 24 (`casilleros(s)` es el único lugar a tocar para agrandarla). Lleno: la nueva espera en `relicario.espera` (casillero aparte, con aviso) y entra sola cuando una fusión hace lugar (`acomodar`). Fusionando nunca se llena (test).
- La cara de cada reliquia es la pila de ese Infinito: instantánea 32×32 a 2 bits (256 bytes) teñida con el color de su nivel.

## Fusión

3 del mismo tipo y nivel → 1 del nivel siguiente (arrastrando, con "Fusionar" o sola con Engarces II). Conserva la pila de la más vieja. Nivel n = 3^n Ámbar. Colores: Ámbar, Coral, Jade, Violeta, después Ámbar +1… Animación: las tres vuelan al casillero nuevo y se cristalizan.

## Elección

- A mano: pop-up de cristal con los tres tipos, lo que da cada uno y cuánto falta para su próxima fusión; no se cierra solo, la corrida sigue detrás; "Reliquia 1 de 2" y "Las dos del mismo tipo" con Engarces nv4; con inventario lleno ofrece Fusionar todo. La del primer Infinito se elige en el Relicario, con su guía.
- Automática (Infinito automático): regla en Automatización: *Tipo fijo*, *Rotar*, *Completar fusiones* (por defecto; empate: el que tiene alguna engarzada; nunca un tipo que no puede engarzar), *Subir el más bajo*, *Prioridad* (lista ordenable). Opciones: fusionar solas (Engarces II; sí por defecto) y engarzar las mejores (no por defecto). La primera vez sale una nota con "Configurar".
- Builds recomendadas por las guías: *Torrente* (Cauce + Cascada), *Mutante* (Mutaciones + Cauce, para Dislocación), *Avalancha* (Cascada + Mutaciones, con el Infinito roto).

## Pulido (con la Escarcha)

Esquirlas para subir **una** reliquia un nivel sin fusionar (conserva pila y engarce; si completa tres y está "fusionar solas", se fusiona). Costo `10^round(1 + 1,5 × n × pulido_x)`; `pulido_x` = 1, o 0,7/0,5/0,35/0,25 con Engarces II. Calibrado para no reemplazar a la fusión.

## Cómo se ve

Pantalla fija: engarces hexagonales y la elección (o la ficha de la elegida) a la izquierda, inventario a la derecha (solo la grilla scrollea; 6 columnas en el celular). Sello por tipo (Cauce: dos corrientes que se juntan; Cascada: derrumbe en anillos; Mutaciones: doble hélice), el mismo en sus filas de la Arena. Efectos como `^1,015`, `+0,02 a c`.
