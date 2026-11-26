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

- `temperatura(s)` y `densidadFuego(s)` en `src/core/fuego.ts`: por ahora solo el término de las Brasas totales (Esquirla de fuego, Compresión térmica y Calor latente llegan con sus fases). Sin Brasas da 300 K y no cambia nada.
- `densidad` (`formulas.ts`) suma `densidadFuego` dentro del paréntesis, antes del multiplicador de Macla y no en Frontera (como `dAdd` del simulador). Con 600 Brasas el simulador y el juego dan 2.584 K (los ~3.000 K de arriba incluyen las otras fuentes).
- El Motor y el reparto del calor son de la fase 4.
