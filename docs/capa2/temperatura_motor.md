## Temperatura, Motor de Brasas y reparto del calor

### La Temperatura

Se mide en Kelvin, arranca en 300 K (temperatura ambiente) y la Ignición es a 5.778 K, la temperatura de la superficie del Sol. Es permanente y nunca baja.

- Sube con: las Brasas totales (la fuente principal), Compactación II de fuego (cada compresión suma un poco) y una mejora del Horno:

$$ T = 300 + 795 \cdot B_{\text{tot}}^{0{,}165} \cdot 1{,}01^{\text{Esquirla de fuego}} + 0{,}05 \cdot \text{compresiones (con Compresión térmica)} + 50 \cdot \text{Calor latente} $$

La primera Brasa ya da ~1.100 K (por eso la primera vuelta tarda ~70 min y no 17 h); 3.000 K llega con ~600 Brasas totales (8:28 en el simulador) y la Ignición con ~10^5.

- Efecto base, siempre activo: se suma a la Densidad, o sea, al exponente de toda la producción:

$$ D_{\text{total}} = D_{\text{Capa 0/1}} + \frac{T - 300}{1000} $$

A 5.778 K son +5,5 de Densidad: por eso los números explotan al final de la capa. Densidad ígnea (Compactación de fuego) lo multiplica por 1,5.

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

Calor de un sector: h = parte × (T − 300) / 1000. Extra = 1 + efecto × h:

| Sector | Efecto | Qué multiplica |
|---|---|---|
| Pila | 1,2 | colores y cauce (en log10 V) |
| Red | 1,0 | Cristales por Infinito: ×10^h |
| Estratos | 0,5 | flujo de los 8 estratos; también 0,5 al Vidrio/s |
| Escarcha | 0,5 | Esquirlas/s |
| Relicario | 0,3 | efecto de las reliquias engarzadas |

No hay un reparto perfecto: conviene cambiarlo según qué te frena. Se pueden guardar 3 repartos y cambiar con un toque. Está en la Automatización (cambiar de reparto según la etapa de la vuelta), más adelante.

Bot del simulador: hasta el primer Infinito de cada vuelta, todo a Pila. Después, Pila se lleva una parte que arranca en 0,87 y se ajusta al fundir según el desglose: si colores o cauce pasan de 35 %, ×0,85; si otra fuente pasa, /0,85 + 0,05 (tope 1). El resto se reparte Red 0,3, Estratos 0,1, Escarcha 0,05, Relicario 0,05 entre los sectores abiertos; Estratos no recibe nada mientras la Presión pase de 35 %, ni Escarcha mientras la Escarcha pase.

### Cómo quedó la Temperatura (fase 3, beta)

- `temperatura(s)` y `densidadFuego(s)` en `src/core/fuego.ts`: la fórmula entera desde la fase 9 (Esquirla de fuego en `fuego.compras`, Compresión térmica en `fuego.compresiones`). Sin Brasas da 300 K y no cambia nada.
- `densidad` (`formulas.ts`) suma `densidadFuego` dentro del paréntesis, antes del multiplicador de Macla y no en Frontera (como `dAdd` del simulador). Con 600 Brasas el simulador y el juego dan 2.584 K (los ~3.000 K de arriba incluyen las otras fuentes).

### Cómo quedó el Motor (fase 4, beta)

- Lógica en `src/core/fuego.ts`: `SECTORES` (pila, red, estratos, escarcha, relicario), `sectorAbierto` (Pila y Red con la primera Fundición; Estratos con El Horno, Escarcha con la Escarcha eterna, Relicario con el Relicario de fuego), `etapaMotor` (0–4), `partes` (las partes entre los abiertos suman 1; sin nada, todo a Pila), `calor`, `extraSector`, `redLog10Motor`, `ponerParte` (porcentaje: el resto se reparte en proporción), `moverBorde` (arrastrar: pasa calor entre dos vecinos), `ponerReparto` y `elegirReparto`.
- Efectos que ya funcionan: **Pila** multiplica el exponente de los colores y el cauce en `valor` (×(1 + 1,2 h), como `pilaX` del simulador) y **Red** suma `h` al log10 de los Cristales por Infinito en `lcBruto` (no en Vidrio). **Estratos** (fase 5, con El Horno) multiplica el flujo de los 8 estratos y el Vidrio/s por (1 + 0,5 h). Escarcha y Relicario abren con sus fuegos, que todavía no se compran. Desde la etapa 2 el medidor muestra el Vidrio y giran gotas de vidrio con las Brasas.
- Guardado: `fuego.repartos` (3 repartos de 5 partes) y `fuego.reparto` (el que se usa). Los de una partida nueva salen de `motor.repartos_iniciales` en config (I todo a Pila, II mitad y mitad, III todo a Red). Una partida de la fase 3 los recibe al cargar; valores rotos se recortan a 0–1. Sin beta no existen. Tests en `tests/motor.test.ts`.
- Pantalla `src/ui/Motor.svelte`, en la barra de capas (ícono de brasa) desde la primera Fundición; con el Motor la barra queda aunque la vuelta no tenga Infinitos. El círculo de piedra es un SVG quieto: dovelas, un enchufe por sector (encendido o tallado) y un iris de 9 hojas curvas que se abre por etapas (fracción de la apertura en `APERTURA`). Adentro, el fuego en píxeles de ~3 px en un lienzo chico: la fuente calienta con la Temperatura (llamas cortas y rojas a 300 K, llenas y casi blancas en la Ignición). Alrededor, el canal del reparto (arcos de brasa en trozos, con manijas para arrastrar o mover con las flechas) y las Brasas en órbita. Al costado (abajo en el celular): los 3 repartos guardados con su mini anillo, y por sector −/porcentaje/+ y su efecto (^1,84 a colores y cauce, ×1,99 Cristales).
- Rendimiento: el fuego dibuja a 10 Hz con un temporizador (6 Hz con Reducir destellos), se salta con la pestaña oculta y queda en un cuadro quieto con Reducir movimiento o el modo ahorro; halo y órbita son CSS de opacidad y transform (sin halo con Reducir destellos, nada con ahorro). Todo se crea al entrar y se destruye al salir.

### Etapas 3 y 4 (fase 7, beta)

- **Escarcha** multiplica las Esquirlas/s (`esquirlasPorSegundo`) y **Relicario** el efecto de las engarzadas (`efectoTipo`), los dos por (1 + efecto × h). Con la 4 el iris queda abierto del todo.
- Con los 5 sectores la columna del reparto no entraba en 1366×768 y, centrada, se subía sobre Vidrio/Brasas: ahora `align-content: safe center` (si no entra, scrollea su caja), los párrafos sin margen y, apaisado y bajo (≤ 800 px), filas un poco más juntas.
