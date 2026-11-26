# Progreso

Historia completa hasta la 1.0: `docs/historial/progreso_hasta_1.0.md` (no leer salvo pedido).

## Estado (2026-11-26)

**Versión 1.0.0**: Capa 0 + Capa 1 completas. Publicada en https://feli202.github.io/avalancha/ (rama `main`, build de 2b31992, Escarcha recalibrada). Código en `master`.

## Hecho

- Capa 0 entera (Arena, Compresión, Mutaciones, Infinito), logros, secretos, cosméticos, sonido, accesibilidad.
- Capa 1 entera (C1–C14): Relicario, Red (25 nodos), Estratos (embudo 2D), Defectos 1–8, Escarcha, Automatización, fin de capa.
- 1.0: guardado validado con 3 respaldos, notaciones, inglés, PWA instalable, pase de partida itch → GitHub / Safari → app, aviso de versión, comunidad, rendimiento y modo ahorro, offline débil (2 h a ×0,1, sin Infinitos).
- 2026-11-25: Escarcha con Punto de ruptura (estilo Replicanti), recalibrada solo en sus números contra el ritmo de la vieja: Fatiga 9,86 · Frontera 12,98 · Inclusión 13,27 · Vidrio 13,86 · fin 14,01 h (núcleo real, 15 s). Ver `docs/capa1/escarcha.md`.
- `release/` lista para itch.io, galaxy.click, Reddit y redes (`release/CHECKLIST.md`).
- 2026-11-25: limpieza de documentación: `docs/` por sistema, SPEC, guías y maquetas a `archivo/`, skills del proyecto; tabla de la Capa 1 medida entera con la Escarcha nueva.

## Verificación al último cambio

Fase 6: `npm test` 491 en verde con `--maxWorkers=4` (`tests/liberaciones.test.ts` contra `tests/fixtures/capa2_liberaciones.json` de `balance/ref_capa2.py`: softcap, costos de Desborde y Metamorfosis, umbrales y Densidad de Lecho, Densidad ígnea, impulso de Inercia eterna y peso de Magma; autocompradores y "Máx" pasado el tope; guardado y migración desde la fase 5), `test:lento` 20/20, `tsc` y `svelte-check` 0 errores, build sin errores. Mirado con la partida real fundida y marcada como beta: Desborde encendido desde la Red en 1366×768, el autocomprador de Cascada pasó de 30 a 36 en el juego; la palabra en 1366×768 y 390×844 (METAMORPHOSIS entra en una línea), también con Reducir destellos (capturas en `capturas/capa2_fase6/`). El panel del navegador estaba oculto: la animación de la palabra se miró congelada en cuadros sueltos, no en movimiento; los fps no se midieron.

Fase 5: `npm test` 479 en verde con `--maxWorkers=4` (con los 31 workers por defecto la máquina se quedó sin memoria; `tests/horno.test.ts` contra `tests/fixtures/capa2_horno.json` de `balance/ref_capa2.py`: mismo estado ⇒ mismo Vidrio/s, T, flujo, M_B, costos y Templado; Cristal fundido, estratos llenos, guardado y migración desde la fase 4; física del fondo en `tests/embudo.test.ts`), `test:lento` 20/20, `tsc` y `svelte-check` 0 errores, build sin errores. Mirado con la partida real fundida y marcada como beta en 1366×768 y 390×844 (Estratos con la ficha del Horno y una compra, Motor etapa 2, Red con Cristal fundido; capturas en `capturas/capa2_fase5/`). El panel del navegador estaba oculto: el worker y la animación quedaban frenados, así que la caída y el derretido se vieron en el test y en cuadros sueltos, no en movimiento; los fps no se midieron.

Fase 4: `npm test` 462 en verde (`tests/motor.test.ts`: partes, porcentajes, arrastre, 3 repartos, etapas, efectos de Pila y Red, guardado y migración desde la fase 3), `test:lento` 20/20, `tsc` y `svelte-check` 0 errores, build sin errores. Mirado con la partida real de fin de Capa 1 fundida y marcada como beta en 1366×768, 390×844 y 360×640 (Motor y Red de fuego; capturas en `capturas/capa2_fase4/`): porcentaje, ±, repartos I/II/III, manija con flechas y arrastrando; el fuego se mueve, queda quieto con ahorro y se destruye al salir. Los fps no se midieron (el panel del navegador estaba oculto).

Fase 3: `npm test` 449 en verde (`tests/fuego.test.ts`: Brasas, Temperatura y Densidad contra `balance/ref_capa2.py`, Fundición, nodos de fuego, guardado y migración desde la 1B), `test:lento` 20/20, `tsc` y `svelte-check` 0 errores, build sin errores. Mirado con la partida real de fin de Capa 1 marcada como beta en 1366×768 y 390×844: confirmación, cinemática (también con Reducir destellos), Brasas/K, llama y Encender, segunda Fundición con Memoria eterna. Los fps no se midieron (el panel del navegador estaba oculto).

Fase 1B: `npm test` en verde (`tests/beta.test.ts`), `tsc` y `svelte-check` 0 errores, mirado con la partida real en 1366×768 y 390×844 (código inválido, válido, aviso, entrar con marca y respaldo, pantalla en la beta, volver desde Ajustes). Primero se hizo con Google Apps Script (0eb9ee5); no se pudo abrir Apps Script en la cuenta y se pasó a códigos sin servidor.

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
- [x] 1B puerta de la beta (2026-11-26): botón "Jugar beta" en la pantalla de la Capa 2, tarjeta con código (verificado en el juego contra hashes, sin servidor) y pedido por mail o Discord, marca `beta` en la partida con respaldo "Antes de la beta" y vuelta en Ajustes, `esBeta`, privacidad. 100 códigos en `privado/codigos_beta.txt` (fuera de git; más con `python scripts/codigos_beta.py N`). Ver `docs/capa2/beta.md`.
- [x] 2 simulador (2026-11-26): `balance/sim_capa2.py` (importa `sim_capa1`, arranca de la partida real migrada, funde a las 0:00) y `balance/tune_capa2.py`; constantes calibradas en `balance/config_capa2.json` y en `docs/capa2/`. Tabla abajo.
- [x] 3 Fundición (2026-11-26, solo en la beta): Fundición con su cinemática y confirmación, Brasas y Temperatura (sumada a la Densidad) arriba, quinto nivel de fuego en el panel de la Red (funcionan Memoria eterna, Lecho infinito y Resonancia; el resto "próximamente"), `estado.fuego` en el guardado. Ver `docs/capa2/fundicion.md`, `red_fuego.md`, `temperatura_motor.md`.
- [x] 4 Motor y Red de fuego (2026-11-26, solo en la beta): pantalla del Motor de Brasas en la barra de capas (iris en etapa 1, las demás preparadas), reparto del calor (arrastrando o con porcentajes, 3 repartos guardados) con los sectores Pila y Red funcionando, nodos de fuego con lava y conexiones de brasa en la Red, la llama del panel con "Ahora / Con fuego" y precio. Ver `docs/capa2/temperatura_motor.md` y `red_fuego.md`.
- [x] 5 Horno (2026-11-26, solo en la beta): El Horno enciende el estrato 9 (Vidrio/s de config, permanente), las 5 mejoras con Vidrio (Temperatura del Horno, Tiro, Crisol, Calor latente, Templado), Cristal fundido (10 s de Vidrio por Infinito), Motor etapa 2 (Vidrio y sector Estratos), el fondo del embudo naranja con la arena que se derrite en gotas de vidrio. Se adelantó "estratos llenos" de la fase 9 (sin eso el Horno no da nada). Ver `docs/capa2/horno.md`.
- [x] 6 liberaciones (2026-11-26, solo en la beta): softcap común (`nivelLiberado`/`extraLiberado`), Desborde y Metamorfosis (Cascada y Mutaciones sin máximo, también con los autocompradores y el "Máx"), Densidad ígnea, Inercia eterna (reloj `fuego.vuelta` en el guardado) y Magma; la palabra LECHO / DESBORDE / METAMORFOSIS / ETERNA al encenderlas (`Palabra.svelte`, respeta Reducir destellos). Lecho queda con su escalado propio. Ver `docs/capa2/liberaciones.md`.
- [ ] 7 Escarcha eterna y Relicario
- [ ] 8 Defectos con 5 cargas
- [ ] 9 Fusión y escalado
- [ ] 10 Ignición
- [ ] 11 auditoría y publicación

### Fase 2: tabla calibrada (`python balance/sim_capa2.py`, revisando cada 15 s; ~30 s con la columna de 60 s, `--rapido` ~15 s)

| Hito | Objetivo | Sim |
|---|---|---|
| Primera Fundición / Memoria eterna | 0:00 / 0:00–1:00 | 0:00 / 0:13 |
| Fin de la primera vuelta | ~1:00 | 1:10 |
| Lecho / DESBORDE | 1:00–2:00 / ~1:30 | 1:11 / 1:45 |
| El Horno (Motor etapa 2) / METAMORFOSIS | 2:00–2:30 / ~2:30 | 2:14 / 2:39 |
| Fallas / Escarcha eterna / INERCIA ETERNA | ~3:30 / ~4:00 / ~4:00 | 3:22 / 3:52 / 4:11 |
| Fusión del Infinito / Relicario de fuego | ~5:00 / ~6:30 | 5:26 / 6:30 |
| Fallas profundas / 3.000 K | ~8:00 | 8:05 / 8:28 |
| Vueltas ≤ 5 min / Abismo / Fusión / cargas 5 | 9:00–11:00 | 9:33 / 9:43 / 9:48 / 9:56 |
| **Ignición** | 10–12 h | **9:56** |

20/20 hitos en rango (±30 min). Fuente más pesada 40,3 % (Presión, ~3:58) y hueco máximo 34,8 min (primera vuelta): las dos reglas quedan apenas fuera. Revisando cada 60 s: 13/20.

Cambios de diseño aplicados (con OK): Brasas = M_B × (log10 C / 308)^5,2 con freno de Cristales pasado el tope (^0,757); Esquirlas eternas (logX/103,7)²; escalado solo sobre Permeabilidad. Además: Templanza = Umbral (no hay Aguante en la 1.0), carga 1 se rehace en cada vuelta, estratos llenos con s_8 = 291, orden de nodos según la tabla. Ver `docs/capa2/ritmo_balance.md`.

## Problemas conocidos

- Capa 2 (fase 3): el primer Infinito de cada vuelta repite la cinemática del primero si no está Memoria eterna. (La barra de capas ya no se esconde después de fundir: queda con el Motor.) La Temperatura de 600 Brasas es 2.584 K (el doc decía ~3.000 contando fuentes que todavía no existen).
- Capa 2 (simulador): la fuente más pesada llega a 40,3 % y hay un hueco de 34,8 min en la primera vuelta (0:20–0:55, entre Esquirla nv1 y nv2); la calibración es sensible (redondear un parámetro corre hitos de a decenas de minutos); entre las 4:00 y la Fusión las vueltas duran 1,5–2 min (sin Fusión cada Fundición da M_B Brasas, conviene fundir seguido); las últimas cargas 5 terminan justo con la Ignición; revisando cada 60 s entran 13/20.

- El fin de la capa queda ~0,9 h antes que con la Escarcha vieja (14,0 h contra 14,9) y pegado a Vidrio; tocando solo la Escarcha no se separan (ver `docs/capa1/escarcha.md`).
- Nunca probado en celulares reales (iPhone/Android: instalación, notch, temperatura, batería, fps).
- itch.io real: no confirmado si su iframe deja abrir la ventana del pase (si no, sale el paso a mano).
- Con Engarces nv4, el aviso juntado del Infinito automático cuenta las dos reliquias como del último tipo (shortcut comentado).
- En 360×640: rótulos de estratos cerrados se pisan un poco; fichas de Escarcha y Defectos scrollean adentro.
- En escritorio hay botones de menos de 44 px (cuadros de la Red, campos de Automatización): aceptado con mouse.
- La nota de la reliquia automática tapa un momento el sismógrafo en el celular.
- Logro Témpano: con Deshielo prendido no se puede (hay que apagarlo).
- Feedback de jugadores: anotarlo acá.
