# Automatización (de todo el juego)

UI: `src/ui/Automatizacion.svelte`. Núcleo: autocompradores dentro de `tick` (`src/core/tick.ts`, `autocomprar`), regla única `autoDisponible`. Config: `config.json → autocompradores`, `automatizacion` (`intervalo_s` = 1); `config_capa1.json → infinito_auto`. Test: `tests/automatizacion.test.ts`.

## Qué se desbloquea

- Capa 0: autocompradores de Caudal (C2), Ámbar y Coral (C3), Jade y Violeta (C4), Compresión automática (C6).
- Memoria (Red): nv1 todo eso desde el inicio de cada Infinito; nv2 Cascada automática; nv3 Mutaciones automáticas; nv4 Infinito automático ([cristales.md](cristales.md)).

Una sola regla (`autoDisponible`) decide si un autocomprador existe para la economía, la tienda y el panel. Con los valores por defecto el núcleo hace lo mismo que sin panel.

## Panel

- Ítem neutro en la barra de capas (abajo, separado por una línea), no es una capa.
- "Encender todo" / "Apagar todo".
- **Compras**: Caudal, cuatro colores, Cascada, Mutaciones; cada una con intervalo (mínimo 1 s), cantidad (×1 / ×10 / Máx) e interruptor.
- **Reinicios**: Compresión automática (al llegar al umbral / esperar X s más) e Infinito automático (apenas llega; con Romper: al llegar a X Cristales o Multiplicar ×N) con la regla de reliquias ([relicario.md](relicario.md)).
- Se ven los que el jugador tiene y el siguiente como silueta con lo que lo desbloquea.
- Celular: pestañas Compras / Reinicios (una lista a la vez) y controles de 44 px.
- Lo automático no destella ni suena.
