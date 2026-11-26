# Progreso

Historia completa hasta la 1.0: `docs/historial/progreso_hasta_1.0.md` (no leer salvo pedido).

## Estado (2026-11-25)

**Versión 1.0.0**: Capa 0 + Capa 1 completas. Publicada en https://feli202.github.io/avalancha/ (rama `main`, build de 2b31992, Escarcha recalibrada). Código en `master`.

## Hecho

- Capa 0 entera (Arena, Compresión, Mutaciones, Infinito), logros, secretos, cosméticos, sonido, accesibilidad.
- Capa 1 entera (C1–C14): Relicario, Red (25 nodos), Estratos (embudo 2D), Defectos 1–8, Escarcha, Automatización, fin de capa.
- 1.0: guardado validado con 3 respaldos, notaciones, inglés, PWA instalable, pase de partida itch → GitHub / Safari → app, aviso de versión, comunidad, rendimiento y modo ahorro, offline débil (2 h a ×0,1, sin Infinitos).
- 2026-11-25: Escarcha con Punto de ruptura (estilo Replicanti), recalibrada solo en sus números contra el ritmo de la vieja: Fatiga 9,86 · Frontera 12,98 · Inclusión 13,27 · Vidrio 13,86 · fin 14,01 h (núcleo real, 15 s). Ver `docs/capa1/escarcha.md`.
- `release/` lista para itch.io, galaxy.click, Reddit y redes (`release/CHECKLIST.md`).
- 2026-11-25: limpieza de documentación: `docs/` por sistema, SPEC, guías y maquetas a `archivo/`, skills del proyecto; tabla de la Capa 1 medida entera con la Escarcha nueva.

## Verificación al último cambio

Fase 1B: `npm test` 442 en verde (+23: `tests/beta.test.ts`, `tests/beta_script.test.ts` con el script y datos falsos), `tsc` y `svelte-check` 0 errores. Mirado con la partida real en 1366×768 y 390×844 con el servicio simulado: cerrada, inválido, enviando, sin conexión, enviado, aviso, entrar (marca + respaldo), pantalla en la beta, volver desde Ajustes. El servicio real de Apps Script no está probado (falta el SETUP).

Fase 1A: `npm test` 419 en verde (`tests/tope.test.ts` con la partida real), `test:lento` 20/20, `tsc` y `svelte-check` 0 errores, mirado en 1366×768 y 390×844 con la partida real.

Antes: `npm test` 404 en verde, `npm run test:lento` 20/20 (pesos de log V con la Escarcha a mitad de su ciclo), `tsc` 0 errores, build sin errores. `python balance/sim.py` igual (atento 208 min, 17 compresiones); `sim_capa1.py --robustez`: fin de la capa 14,03 / 15,64 / 22,21 h (15 s / 60 s / 5 min).

## Falta

- Subir la 1.0 a itch.io, galaxy.click y redes a mano (`release/CHECKLIST.md`); textos de galaxy y Reddit del usuario; tráiler a YouTube.
- Crear la cuenta de GoatCounter y pegar el código en `src/comunidad.ts` (`GOATCOUNTER`).
- Revisión de un nativo de `marketing/textos_en_dudas.md`.
- Tráiler horizontal (línea de tiempo `h` escrita sin probar en `marketing/trailer/`).
- Capa 2 (ganchos en `docs/capa1/bucle_y_balance.md`).

## Capa 2 (Fuego, en beta)

Spec en `docs/capa2/`. Orden de fases:

- [x] 0 preparación (spec partida en `docs/capa2/`, diseño original en `archivo/DISENO_CAPA2.md`, reglas en CLAUDE.md)
- [x] 1A bloquear Capa 1 (2026-11-25): tope de Cristales en 1e308 (`topeCristales`) y migración al cargar con respaldo `COPIA_TOPE`, para todos. Ver `docs/capa2/migracion.md`. Falta probar en un celular real.
- [x] 1B puerta de la beta (2026-11-26): botón "Jugar beta" en la pantalla de la Capa 2, tarjeta de código y pedido por mail, marca `beta` en la partida con respaldo "Antes de la beta" y vuelta en Ajustes, `esBeta`, servicio `apps-script/beta.gs` + `SETUP_BETA.md`, privacidad. Ver `docs/capa2/beta.md`. **Falta:** hacer el SETUP (hoja, clave, implementar) y pegar la URL en `BETA_URL` (`src/comunidad.ts`); sin eso el botón dice "La beta todavía no está abierta".
- [ ] 2 simulador
- [ ] 3 Fundición
- [ ] 4 Motor y Red de fuego
- [ ] 5 Horno
- [ ] 6 liberaciones
- [ ] 7 Escarcha eterna y Relicario
- [ ] 8 Defectos con 5 cargas
- [ ] 9 Fusión y escalado
- [ ] 10 Ignición
- [ ] 11 auditoría y publicación

## Problemas conocidos

- El fin de la capa queda ~0,9 h antes que con la Escarcha vieja (14,0 h contra 14,9) y pegado a Vidrio; tocando solo la Escarcha no se separan (ver `docs/capa1/escarcha.md`).
- Nunca probado en celulares reales (iPhone/Android: instalación, notch, temperatura, batería, fps).
- itch.io real: no confirmado si su iframe deja abrir la ventana del pase (si no, sale el paso a mano).
- Con Engarces nv4, el aviso juntado del Infinito automático cuenta las dos reliquias como del último tipo (shortcut comentado).
- En 360×640: rótulos de estratos cerrados se pisan un poco; fichas de Escarcha y Defectos scrollean adentro.
- En escritorio hay botones de menos de 44 px (cuadros de la Red, campos de Automatización): aceptado con mouse.
- La nota de la reliquia automática tapa un momento el sismógrafo en el celular.
- Logro Témpano: con Deshielo prendido no se puede (hay que apagarlo).
- Feedback de jugadores: anotarlo acá.
