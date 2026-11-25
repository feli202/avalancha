# Progreso

Historia completa hasta la 1.0: `docs/historial/progreso_hasta_1.0.md` (no leer salvo pedido).

## Estado (2026-11-25)

**Versión 1.0.0**: Capa 0 + Capa 1 completas. Publicada en https://feli202.github.io/avalancha/ (rama `main`, build del commit "Escarcha con Punto de ruptura"). Código en `master`.

## Hecho

- Capa 0 entera (Arena, Compresión, Mutaciones, Infinito), logros, secretos, cosméticos, sonido, accesibilidad.
- Capa 1 entera (C1–C14): Relicario, Red (25 nodos), Estratos (embudo 2D), Defectos 1–8, Escarcha, Automatización, fin de capa.
- 1.0: guardado validado con 3 respaldos, notaciones, inglés, PWA instalable, pase de partida itch → GitHub / Safari → app, aviso de versión, comunidad, rendimiento y modo ahorro, offline débil (2 h a ×0,1, sin Infinitos).
- 2026-11-25: Escarcha con Punto de ruptura (estilo Replicanti). Fin de la capa 15,12 h (jugador de 15 s).
- `release/` lista para itch.io, galaxy.click, Reddit y redes (`release/CHECKLIST.md`).
- 2026-11-25: limpieza de documentación: `docs/` por sistema, SPEC y guías a `archivo/`, skills del proyecto.

## Verificación al último cambio

`npm test` 404 en verde, `tsc` 0 errores, build sin errores, `python balance/sim.py` igual (atento 208 min, 17 compresiones). **`npm run test:lento` 18/20** desde la Escarcha nueva (ver Problemas conocidos).

## Falta

- Subir la 1.0 a itch.io, galaxy.click y redes a mano (`release/CHECKLIST.md`); textos de galaxy y Reddit del usuario; tráiler a YouTube.
- Crear la cuenta de GoatCounter y pegar el código en `src/comunidad.ts` (`GOATCOUNTER`).
- Revisión de un nativo de `marketing/textos_en_dudas.md`.
- Tráiler horizontal (línea de tiempo `h` escrita sin probar en `marketing/trailer/`).
- Columnas de 60 s y 5 min de la tabla de la Capa 1 sin volver a medir tras la Escarcha nueva.
- Capa 2 (ganchos en `docs/capa1/bucle_y_balance.md`).

## Problemas conocidos

- **`npm run test:lento` falla 2 de 20 desde "Escarcha con Punto de ruptura"** (antes de la limpieza de docs; no se tocó código): Frontera a 12,6 % de la referencia del test (12,66 h; la tabla del simulador dice 14,40 h, la lista del test no se actualizó) y la Presión pesa 72,6 % al final de la 1.2 (tope 65 %; el simulador dice 70 %). Decidir: actualizar referencias/tope del test o rebalancear (skill `balance`).

- Nunca probado en celulares reales (iPhone/Android: instalación, notch, temperatura, batería, fps).
- itch.io real: no confirmado si su iframe deja abrir la ventana del pase (si no, sale el paso a mano).
- Con Engarces nv4, el aviso juntado del Infinito automático cuenta las dos reliquias como del último tipo (shortcut comentado).
- En 360×640: rótulos de estratos cerrados se pisan un poco; fichas de Escarcha y Defectos scrollean adentro.
- En escritorio hay botones de menos de 44 px (cuadros de la Red, campos de Automatización): aceptado con mouse.
- La nota de la reliquia automática tapa un momento el sismógrafo en el celular.
- Logro Témpano: con Deshielo prendido no se puede (hay que apagarlo).
- Feedback de jugadores: anotarlo acá.
