# Capa 0 · Interfaz de la Arena

Componentes: `src/ui/App.svelte`, `Tienda.svelte`, `Pila.svelte`, `Sismografo.svelte`, `Titulo.svelte`, `Paneles.svelte`, `Pantalla.svelte`, `Logros.svelte`, `Estadisticas.svelte`, `Opciones.svelte`, `Ayuda.svelte`, `ComoFunciona.svelte`. Estado y bucle: `juego.svelte.ts`. Textos: `src/strings/es.ts` y `en.ts`. Estilo general: [../general/estilo.md](../general/estilo.md).

## Revelado progresivo (`revelado` en config)

| Cuándo | Aparece |
| --- | --- |
| Inicio | Pila, Energía, pista "Tocá la pila" |
| Primer derrumbe | Derrumbes por grano |
| 5 de Energía | Tienda con Caudal |
| 8 de Energía | Ámbar |
| 1e4 / 1e9 / 1e16 | Coral / Jade / Violeta (animación de su color recorriendo la pila) |
| Primer anillo | Indicador de anillos |
| 1e12 por primera vez | Barra de Compresión (bloqueada, meta 1e17) |
| Compresión 2 | Cascada |
| Mutaciones disponibles | Mutaciones |

Cada aparición: una frase de una línea, sin modales.

## Inicio

El título sale siempre ("Continuar" con partida), sobre la pila quieta y lejos; la economía y el offline esperan. Al tocar Jugar la cámara se acerca, cae el primer grano y la interfaz aparece en orden. "Mientras no estabas" se muestra después de entrar.

## Distribución

- **Escritorio**: Energía y producción arriba a la izquierda (Densidad), pila en el centro exacto de la ventana (en ventanas angostas se achica, no se corre), tienda en columna a la derecha, sismógrafo y contadores (derrumbes/grano, anillos, escala) abajo, barra de Compresión abajo. Barra de capas a la izquierda (ver [../capa1/interfaz.md](../capa1/interfaz.md)).
- **Celular/tablet en vertical** (hasta 1100 px, `orientation: portrait`): pila arriba, tienda como hoja inferior deslizable apoyada en la barra de capas de abajo (`--nav`), Energía fija arriba. El canvas de la pila llega hasta arriba y hasta la tienda con el fondo difuminado. Un celular acostado usa el diseño de escritorio.
- **Apaisada chica** (reproductor de itch.io, 640×360): columnas de 12,5 rem, letra al 87,5 %, `--pila-radio-max` ≥ 4 rem.
- La pila no se mueve nunca por la interfaz. Sin scroll de página (regla general).

## Tienda

Fila: nombre, nivel, efecto, costo, botón. Modo de compra ×1 / ×10 / Máx global; "Comprar todo" con la tecla M. Cada fila muestra su valor final y el tooltip la cuenta ("512 niveles × 27 Mutación × 2,21 Reliquia = 30.490 granos/s"); siempre en multiplicadores, nunca porcentajes. Filas con softcap: gema de hielo "∞".

## Iconos y paneles

Fila de íconos (foto, logros, estadísticas, ajustes, ayuda) en todas las capas. Paneles a pantalla completa con barra fija y cuerpo que scrollea solo. Ajustes: Juego (notaciones, tasa 15/30/60, Reducir destellos, Reducir movimiento, ahorro de batería, idioma, sonido), Aspecto (paletas, efectos, marcos, fondos), Partida (exportar/importar, respaldos, instalar), Avisos, Créditos (versión `1.0.0 · fecha · commit`, línea de IA, Discord, itch.io).

**Notaciones** (`formato.ts`, un solo formateador): científica, ingeniería, letras, en palabras, logarítmica, mixta y raras (pila en base 4, arena de la Tierra, romanos, binario, una banda, ciego). Por defecto hasta 999.999 con separador de miles y después `1,23e45`. NaN/Infinity → "—".

**Foto del mandala**: guarda una imagen de la pila con el marco elegido. **Ayuda**: guías una sola vez por partida + "Cómo funciona" con la fórmula y los valores actuales.

## Logros

- **Capa 0**: 24 logros (grilla 6×4), umbrales en `config.json → logros`; cada uno da un cosmético (paleta, efecto de avalancha o marco, 8 de cada uno). Orden: primer derrumbe · 100 granos · avalancha de 1.000 · los cuatro colores · primer hito ×4 · anillo 10 · hasta el borde · alud (10.000) · primera Compresión · Compresión sin Ámbar · anillo 25 · mandala pleno (4 colores en 25) · Cascada al máximo · 10 Compresiones · corrida relámpago (< 8 min) · piloto automático · primera Mutación · Densidad ^2 · anillo 50 · avalancha de 1e6 · Mutaciones al máximo · Densidad ^3 · Infinito · Infinito en < 2 h.
- **Capa 1** (pestaña propia desde el primer Infinito, 9): Primer Cristal, Primera helada, Quebrar el hielo, Anillo de hielo, Sin aliento (Fatiga), Grano por grano (Frontera), Burbuja (Inclusión), Amorfo (Vidrio), Cristalización total (1e308). `src/ui/logros.ts`.
- **Secretos**: 18 (`config.json → secretos`, `src/ui/secretos.ts`), entre ellos Témpano y Terco. Sin efecto en el balance; ids de Steam listos.

## Debug (solo `import.meta.env.DEV`)

`Debug.svelte`: velocidad ×1/×10/×50, dar Energía, saltar a la Compresión N, exportar estado. No entra en la build.
