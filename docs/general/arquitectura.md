# Arquitectura

- **Stack**: Vite + TypeScript estricto + Svelte 5. Pila con WebGL2; simulación visual de la pila y del embudo en Web Workers. Dependencias: `break_infinity.js`, `@fontsource/space-grotesk`. Desarrollo: `vitest`, `playwright-core` (scripts de capturas con el Edge instalado).
- **Núcleo puro** (`src/core/`): economía determinista, sin DOM, sin `Date.now()`, sin aleatoriedad. `state.ts`, `formulas.ts`, `shop.ts`, `compress.ts`, `tick.ts` (`tick(state, dt, reglas)`, `autocomprar`, `punado`), `infinito.ts`, `red.ts`, `relicario.ts`, `estratos.ts`, `defectos.ts`, `escarcha.ts`, `offline.ts`, `valido.ts`. Estado inmutable.
- **Constantes**: solo `balance/config.json` (Capa 0, importado únicamente por `src/core/config.ts`) y `balance/config_capa1.json` (`config1.ts`). Sin números de balance en el código.
- **Números grandes**: `Decimal` (break_infinity) para Energía, producción, costos, Cristales; log10 para `s_k`, `logX`, Esquirlas en log. Granos y Caudal con tope 1e300.
- **Bucle** (`src/ui/juego.svelte.ts`): lo único que conoce el tiempo real. Economía en pasos de 50 ms con acumulador, interfaz a ≤ 10 Hz; render a demanda. Ver [rendimiento.md](rendimiento.md).
- **Render** (`src/render/`): `pila.ts`/`pila.worker.ts`/`pilaVisual.ts`/`lienzo.ts`, `embudo.ts`/`estratos.worker.ts`, `marcos.ts`, `paletas.ts`, `miniPilas.ts`, `fotos.ts`, `instantanea.ts`, `redCaras.ts`.
- **Guardado**: `src/guardado/` ([guardado.md](guardado.md)).
- **Otros**: `src/version.svelte.ts` (aviso de versión), `src/instalar.svelte.ts` (PWA), `src/comunidad.ts` (links y GoatCounter). Ver [distribucion.md](distribucion.md).
- **Build**: `base: './'` (rutas relativas, anda en subcarpetas e iframes). `vite.config.ts` pone `__VERSION__` = `1.0.0 · fecha · commit` y escribe `version.json`. `VITE_IDIOMA=en` fija el idioma de entrada; `VITE_URL_APP` cambia la URL de la app (pruebas con `itch-falso`).
- **Steam**: fuera de alcance; no usar APIs exclusivas del navegador fuera de la capa de almacenamiento.
