# Índice de la documentación

Leé solo el archivo del sistema que vas a tocar. Lo vigente HOY (versión 1.0 + Escarcha con Punto de ruptura).

## General
- [general/arquitectura.md](general/arquitectura.md) — stack, núcleo puro, configs, bucle, build y carpetas de `src/`.
- [general/estilo.md](general/estilo.md) — reglas fijas (sin scroll, multiplicadores, textos), colores, sonido, accesibilidad.
- [general/guardado.md](general/guardado.md) — cuándo se guarda, validación, respaldos, migraciones, pase de partida.
- [general/rendimiento.md](general/rendimiento.md) — tope de fps, render a demanda, modo ahorro, cómo se mide.
- [general/distribucion.md](general/distribucion.md) — GitHub Pages, itch.io, galaxy, PWA, aviso de versión, comunidad.

## Capa 0 · Arena
- [capa0/pila.md](capa0/pila.md) — física de la pila, pila visual (worker + WebGL), escala, marcos, zoom.
- [capa0/economia.md](capa0/economia.md) — producción, Caudal, colores, anillos, Cascada, Mutaciones, precios, tiempos y test.
- [capa0/compresion.md](capa0/compresion.md) — Compresión (umbrales, Densidad, barra) e Infinito.
- [capa0/interfaz.md](capa0/interfaz.md) — revelado, distribución escritorio/celular, tienda, ajustes, notaciones, logros, debug.

## Capa 1 · Cristalización
- [capa1/bucle_y_balance.md](capa1/bucle_y_balance.md) — bucle, producción completa, tabla de tiempos, test lento, problemas a evitar.
- [capa1/cristales.md](capa1/cristales.md) — fórmula de Cristales, Romper el Infinito, Infinito automático.
- [capa1/red.md](capa1/red.md) — forma, costos y efectos de los 25 nodos, cómo se ve.
- [capa1/relicario.md](capa1/relicario.md) — tipos, inventario, fusión, elección, Pulido.
- [capa1/estratos.md](capa1/estratos.md) — fórmulas de `s_k` y Presión, compras, embudo 2D.
- [capa1/defectos.md](capa1/defectos.md) — los 8 Defectos, metas, abandono, visuales.
- [capa1/escarcha.md](capa1/escarcha.md) — Punto de ruptura, Esquirlas, mejoras.
- [capa1/automatizacion.md](capa1/automatizacion.md) — autocompradores, Memoria, panel de Automatización.
- [capa1/offline.md](capa1/offline.md) — progreso fuera de línea (las dos capas).
- [capa1/interfaz.md](capa1/interfaz.md) — barra de capas, estética helada, carámbano, primer Infinito, fin de capa, guías.

## Capa 2 · Fuego (spec de diseño; leer solo los archivos que nombra cada fase de PROGRESO.md)
- [capa2/migracion.md](capa2/migracion.md) — tope de 1e308 Cristales, devolución de compras, respaldo y aviso.
- [capa2/beta.md](capa2/beta.md) — puerta de la beta: `esBeta`, marca en la partida, tarjeta, códigos sin servidor (`scripts/codigos_beta.py`).
- [capa2/fundicion.md](capa2/fundicion.md) — reinicio de la Capa 2, Brasas, qué se reinicia y qué es permanente.
- [capa2/temperatura_motor.md](capa2/temperatura_motor.md) — Temperatura (K), Motor de Brasas, reparto del calor.
- [capa2/horno.md](capa2/horno.md) — estrato 9, Vidrio y mejoras del Horno.
- [capa2/red_fuego.md](capa2/red_fuego.md) — quinto nivel de los 25 nodos, efectos y precios en Brasas.
- [capa2/escarcha_reliquias.md](capa2/escarcha_reliquias.md) — Escarcha eterna y Relicario de fuego.
- [capa2/liberaciones.md](capa2/liberaciones.md) — Lecho, Desborde, Metamorfosis, Inercia eterna.
- [capa2/defectos_cargas.md](capa2/defectos_cargas.md) — Defectos con 5 cargas.
- [capa2/escalado_ignicion.md](capa2/escalado_ignicion.md) — escalado tras la 1.ª Fundición e Ignición (5.778 K).
- [capa2/ritmo_balance.md](capa2/ritmo_balance.md) — resumen, ritmo objetivo, tabla calibrada con `balance/sim_capa2.py`, reglas de balance, plan de implementación.

## No leer salvo pedido
- `historial/` — PROGRESO viejo completo hasta la 1.0.
- `../archivo/` — `DISENO_CAPA2.md` (diseño original entero de la Capa 2), SPEC originales, guías, correcciones y actualizaciones ya aplicadas.
