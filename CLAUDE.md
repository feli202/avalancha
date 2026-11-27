# Avalancha — instrucciones para Claude Code

Juego incremental web sobre una pila de arena abeliana. Versión 1.0: Capa 0 (Arena) y Capa 1 (Cristalización) completas. Estado actual: `PROGRESO.md`.

## Cómo leer la documentación

- **Leé solo los archivos de `docs/` del sistema que vas a tocar; nunca toda la documentación.** Mapa en `docs/INDICE.md`.
- `archivo/` y `docs/historial/` no se leen salvo que el usuario lo pida (SPEC originales, correcciones viejas, historia).

## Mapa

| Para… | Leé |
|---|---|
| Estructura del código, configs, build | `docs/general/arquitectura.md` |
| Colores, textos, sonido, accesibilidad | `docs/general/estilo.md` |
| Guardado, respaldos, migraciones, pase de partida | `docs/general/guardado.md` |
| fps, batería, modo ahorro | `docs/general/rendimiento.md` |
| GitHub Pages, itch, PWA, aviso de versión | `docs/general/distribucion.md` |
| Pila visual, worker, shader, marcos | `docs/capa0/pila.md` |
| Fórmulas de la Arena, precios, tiempos de la Capa 0 | `docs/capa0/economia.md` |
| Compresión e Infinito | `docs/capa0/compresion.md` |
| Tienda, revelado, ajustes, logros | `docs/capa0/interfaz.md` |
| Tabla de tiempos de la Capa 1, producción completa | `docs/capa1/bucle_y_balance.md` |
| Cristales / Red / Relicario / Estratos / Defectos / Escarcha | `docs/capa1/<sistema>.md` |
| Autocompradores y panel de Automatización | `docs/capa1/automatizacion.md` |
| Offline | `docs/capa1/offline.md` |
| Barra de capas, estética helada, guías | `docs/capa1/interfaz.md` |

## Reglas de trabajo

- Constantes de balance **solo** en `balance/config.json` (Capa 0) y `balance/config_capa1.json` (Capa 1). Nunca números de balance en el código. Los nodos de la Red, Defectos y reliquias se leen de config.
- Si un cambio toca el balance: **simulador → doc del sistema → código**. Nunca al revés (skill `balance`).
- `src/core/` es puro y determinista: sin DOM, sin `Date.now()`, sin aleatoriedad. Todo lo visual va aparte.
- Números grandes de la Capa 1 (Cristales, `s_k`, `logX`) en log10 o break_infinity.
- Textos de interfaz en español rioplatense (e inglés) solo en `src/strings/es.ts` y `en.ts`, nunca en los componentes.
- Valores como multiplicadores o notación matemática (×3, ^1,015, +0,02 a c), nunca porcentajes.
- **Pantallas sin scroll**: cada pantalla entra entera en 1366×768 y 390×844; una lista larga scrollea solo su caja.
- Escenas pesadas (Estratos, Red) se crean al entrar a su pantalla y se destruyen al salir. Nunca más de 60 fps.
- Antes de dar algo por terminado: tests en verde y mirarlo funcionando en el navegador (1366×768 y 390×844, 60 fps, nada roto en el celular).
- Al terminar una tarea, actualizá `PROGRESO.md` (corto: estado, hecho, falta, problemas) y el doc de `docs/` del sistema que cambió.
- `master` = código. `main` = solo la build publicada en GitHub Pages: nunca commitear código ni docs ahí.

## Capa 2

- La spec está en `docs/capa2/`; leé solo los archivos que nombra cada fase de `PROGRESO.md`.
- Constantes de la Capa 2 solo en `balance/config_capa2.json`.
- Todo lo de la Capa 2 queda detrás de la marca de beta de la partida: sin la marca, el juego público no cambia.
- Las partidas beta pueden estar más adelantadas que lo implementado: cada fase funciona con ellas, y si la partida llega más lejos que lo hecho, muestra "próximamente" sin romperse.
- Cada cambio de guardado lleva migración y test, también para partidas beta.
- Si toca el balance: primero `balance/sim_capa2.py`, después `docs/capa2`, después código.
- Números grandes en log10 o break_infinity. Nada de análisis largos de balance si no hacen falta.
- Antes de cada push: decime cómo probarlo en local y esperá mi OK.

## Comandos (en esta máquina es `python`, no `python3`)

```bash
npm run dev            # juego + panel de debug, http://localhost:5173 (preview_start "avalancha")
npm test               # tests unitarios + balance de la Capa 0
npm run test:lento     # balance completo de la Capa 1 (~45 s)
npm run test:capa2     # balance de la Capa 2 de punta a punta en el núcleo (~1,5 min)
npm run typecheck      # tsc
npx svelte-check       # tipos de los .svelte
npm run build          # dist/
python balance/sim.py              # Capa 0: atento 3 h 28 min
python balance/sim_capa1.py --robustez   # Capa 1: tarda minutos
python balance/sim_capa2.py              # Capa 2: tabla de hitos, fuentes y huecos (~30 s; --rapido ~15 s)
```

## Skills del proyecto (`.claude/skills/`)

- `balance` — correr simuladores, probe y tests de balance; orden para cambiar números.
- `publicar-pages` — publicar la build en GitHub Pages (rama `main`).
- `zip-itch` — zip para itch.io y galaxy.click y prueba con `itch-falso`.
