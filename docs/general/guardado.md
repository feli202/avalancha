# Guardado

Código: `src/guardado/guardado.ts` (`VERSION` = 3, `CLAVE` = `avalancha.guardado`, `RESPALDO`, `COPIAS`), `almacen.ts` (interfaz `Almacen`, `almacenLocal`; abstraída para empaquetar en Steam), `historial.ts` (últimas `MAX_CORRIDAS` = 10 compresiones), `pase.ts`. Tests: `tests/guardado.test.ts`, `tests/pase.test.ts`.

## Cuándo y cómo

- `localStorage` cada 10 s, al ocultar la pestaña y al cerrar (`pagehide`).
- Cada guardado se **valida antes de escribir** (sin NaN, se puede volver a leer): no pisa el bueno.
- **3 respaldos rotativos** `avalancha.copia.0..2`, uno por minuto como mucho; Ajustes → Partida los lista y recupera (la actual queda como "Partida anterior").
- Versión de guardado en el JSON con migraciones (`migrar` en `guardado.ts`; la 3 es la de la Capa 1: quien ya tenía el Infinito de la Capa 0 arranca con 1 Cristal y la primera reliquia; `migrarRelicario` pasa relicarios viejos a piezas). Campos viejos saneados (p. ej. `aguante` → `umbral`, contadores nuevos en cero).
- Exportar/importar como texto base64; test de ida y vuelta.
- "Reportar un problema" copia partida, versión y últimos errores (`errores.ts`).
- Ajustes del dispositivo (notación, ahorro, fps…) en `avalancha.ajustes`, fuera de la partida exportada.

## Qué guarda la Capa 1

Cristales (break_infinity), Cristales totales, niveles de la Red, inventario de reliquias (tipo, nivel, pila, Infinito) + espera + engarzadas + regla automática, número de Infinito, estratos abiertos, `s_k` (log10), niveles de Permeabilidad y Presión, Defectos completos y abandonos, Escarcha `logX`, Esquirlas, mejoras de Escarcha, reloj desde la última ruptura, guías vistas (`vistos`), configuración de Automatización.

## Pase de partida (itch.io → GitHub Pages, Safari → app instalada)

- Código `A<versión>-<FNV-1a del JSON>-<deflate-raw base64url>` en el **hash** (`#import=`, nunca la query). Más de 60.000 caracteres o ventana bloqueada → pasos a mano con Exportar.
- Al recibir: valida formato, checksum, versión (más nueva → "actualizá esta página") y que se pueda migrar; pregunta antes de reemplazar y guarda respaldo (`RESPALDO_PASE`).
- iOS: la app instalada tiene almacenamiento propio, separado de Safari. La guía de instalación copia la partida al portapapeles (dentro del toque) y la app sin partida ofrece pegarla (`TraerPartida.svelte`, `leerCodigo`).
