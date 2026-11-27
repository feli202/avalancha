### Escarcha eterna (Frío con fuego)

- La Escarcha deja de romperse. La de la vuelta en que se compra queda eterna (logX, Esquirlas y mejoras) y el espesor sigue creciendo, también durante la Capa 0 de cada vuelta. Da Esquirlas por segundo: Esquirlas/s = (logX / 103,7)² × 2^Geoda × (1 + 0,5 × calor del sector Escarcha). Con 10^(logX/40) (el punto de partida) la partida real de fin de Capa 1 (logX 10.195) daba 10^255 por segundo y el bucle Esquirlas → mejoras → logX se disparaba.
- Pasado el Punto de ruptura P (el de la Capa 1: 40 × 1,55^Umbral × Frío × Inclusión) crece g × (P / logX)^5,33.

- Las mejoras se transforman (mismo lugar en el panel, nombre nuevo, compras repetibles):

| Antes | Con fuego | Efecto |
|---|---|---|
| Crecimiento | Cristalización continua | Más velocidad de crecimiento, sin tope |
| Brillo | Fulgor | El aporte de la Escarcha a la producción crece más fuerte |
| Umbral | Templanza | Sube el Punto de ruptura, donde la Escarcha eterna empieza a crecer más lento (la 1.0 ya no tiene Aguante ni penalidad) |

- Todo lo comprado con fuego es permanente. Cuestan lo de la Capa 1 con el paso ×3,86 (Cristalización continua 10^(1,54 L), Fulgor 10^(3,86 L), Templanza 10^(1,93 L) Esquirlas). Los autocompradores de estas mejoras llegan con Deshielo automático.

- Las Esquirlas siguen sirviendo para el Pulido de reliquias y, ahora, para las compras escaladas (ver Escalado).

### Relicario de fuego (Engarces con fuego)

- Inventario doble (el tamaño fijo de la Capa 1 × 2). Templado (Horno) y el sector Relicario multiplican el efecto de las engarzadas.

- Todo automático: en cada Infinito se elige sola una reliquia de cada tipo (Cauce, Cascada, Mutaciones), se fusionan solas las de 3 iguales y se engarzan solas las mejores. El jugador puede mirar, pero no hay que tocar nada.

- El pop-up de reliquias deja de aparecer en el Infinito manual (queda un aviso chico y opcional).

- Engaste de lava (Engarces II con fuego): un espacio más, y las reliquias engarzadas cuentan como un nivel más. También automático.

### Cómo quedó (fase 7, beta)

- **Escarcha eterna** (`src/core/escarcha.ts`): `escarchaEterna` (Frío de fuego). Sin tope: `crecerEscarcha` suma g × dt y `esquirlasPorSegundo` × dt (Esquirlas como número con decimales; al cargar se redondean para abajo). El freno pasado P es el factor `templanza` de `factoresCrecimiento` y Hielo y fuego el factor `hieloYFuego` (×(1 + 0,5 × (T − 300)/1000)). `puedeRomperEscarcha` es falso y el interruptor de Romper desaparece. Costos con `costoMejoraEscarchaLog10(k, L, eterna)` (paso × `escarcha_eterna.paso_x`). `fundir` conserva la Escarcha entera. Crece también con la Arena frenada en 1e308 y fuera de línea (mismo tick, al 10 %). Geoda (fase 9, [escalado_ignicion.md](escalado_ignicion.md)): `geodaX`.
- **Deshielo automático**: interruptor `escarcha_mejoras` (en `AUTOS`; una partida de antes lo recibe prendido). `mejorarEscarchaSola` compra las tres, la más barata primero, en cada tick (también con la Arena frenada, esperando la Fundición).
- **Relicario de fuego** (`src/core/relicario.ts`): `relicarioFuego`; `casilleros` × `engarces.casilleros_x`; cada Infinito `reliquiasDeFuego` (una de cada tipo, sin pendiente, así no sale el pop-up) y `ordenarDeFuego`: elige la pendiente con la regla, junta la espera con el inventario, fusiona todo, engarza las mejores (`equiparMejores`: una engarzada solo sale por otra de nivel mayor) y deja esperando las de menor nivel si no entran. Es la migración: al encenderlo desde la Red (`encenderFuego`) y al cargar una partida beta que ya lo tenga. El aviso juntado de reliquias del Infinito (también a mano) dice las tres; se apaga en Ajustes.
- **Engaste de lava**: `espacios` + `engarces2.espacios` y `efectoTipo` cuenta `engarces2.niveles` más; al encenderlo se ordena en el acto.
- Efecto de las engarzadas: `efectoTipo` = Templado × sector Relicario × Σ efecto(nivel + Engaste), igual que `mods` de `sim_capa2.py`. El Relicario muestra ese total.
- Interfaz: la Escarcha cambia en el mismo lugar (Cristalización continua, Fulgor, Templanza, con sus tooltips; en lugar de la barra y Romper, las Esquirlas/s y si pasó la Templanza; una fila más de factores para Hielo y fuego). Automatización: "Mejoras de la Escarcha" en lugar de "Romper la Escarcha" y la regla de reliquias reemplazada por una nota. Relicario: nota de fuego y "Todo automático".
- Tests: `tests/escarcha_reliquias.test.ts` contra `tests/fixtures/capa2_escarcha.json` (escrito por `balance/ref_capa2.py`): g, P, m, Esquirlas/s, costos, espacios y reliquias; elección automática, migración sin perder poder, inventario lleno sin trabarse, guardado.
- Balance: con fuego las mejoras encarecen mucho. En el simulador la Escarcha eterna arranca con las mejoras de esa vuelta (0/0/0 a las 3:52) y termina en 6/3/4; una vuelta que ya tenga niveles altos al encenderla queda con precios de 1e14 o más contra ~1e4 Esquirlas/s.
