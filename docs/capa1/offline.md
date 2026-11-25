# Progreso fuera de línea (las dos capas)

Núcleo: `src/core/offline.ts` (`fueraDeLinea`, `Ausencia`). Detección: `src/ui/juego.svelte.ts`. Pantalla de regreso: `Paneles.svelte`. Config: `balance/config.json → fuera_de_linea` (`tope_horas` 2, `eficiencia` 0,1). Test: `tests/guardado.test.ts` (fixture `tests/fixtures/mitad_capa1.json`).

Vigente desde 2026-11-23: un empujoncito.

- La ausencia cuenta como mucho **2 h** y vale **×0,1**: 2 h fuera = 12 min de juego; lo que pasa de 2 h no da nada.
- Se simula con el mismo `tick` en pasos de 1 s (hasta 28.800; si hay más, pasos más largos) con `reglas = false`: autocompradores y compresión automática dentro de la corrida, **sin Infinitos** (tampoco el automático). La Energía se frena en el umbral (o donde estaba, con el Infinito roto) y espera. Sin Cristales ni reliquias.
- Estratos y Escarcha crecen con el mismo tiempo reducido. La Escarcha se rompe sola solo con Deshielo.
- **Dentro de un Defecto no avanza nada** (`Ausencia.defecto`).
- **Qué es ausencia**: juego cerrado, o el bucle sin correr más de 2 min (`SIN_BUCLE_S`: segundo plano, máquina dormida). La pestaña abierta y oculta sigue con la economía a 1 Hz y no se castiga; si se atrasa, se pone al día con `fueraDeLinea(s, t, false)` sin pantalla.
- Cálculo en tramos de ~12 ms por cuadro con barra de progreso (de hielo en la Capa 1).
- Pantalla de regreso (placa de hielo): "Estuviste 1 día fuera · cuenta como 12 min de juego", Energía, compresiones, crecimiento de cada estrato (×10^x), Escarcha y la regla; dentro de un Defecto lo dice.
- El simulador no modela el offline; el test exige 12 h offline < 12 h activas y que 24 h fuera no den Infinitos.
