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
