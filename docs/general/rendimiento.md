# Rendimiento y batería

Medición: `scripts/medir-rendimiento.mjs` (build de producción, Edge headless por CDP, 390×844 densidad 3, CPU ×4 más lenta, partida a mitad de la Capa 1). Medidas crudas en `capturas/rendimiento/`. Estratos: `scripts/medir-estratos.mjs`.

## Reglas vigentes

- **Nunca más de 60 fps**: tasa 15 / 30 / 60 (`fpsTope()` en `ajustes.svelte.ts`; un 0 guardado vale 60). La economía corre en su propio reloj (paso fijo de 50 ms con acumulador).
- **Pila pixel art a baja resolución**: canvas ≤ 1 px real por px CSS (0,5 con ahorro), `image-rendering: pixelated`. La relación se mide al cambiar de tamaño, nunca en cada cuadro (leer `clientWidth` fuerza layout).
- **Render a demanda** (`PilaVisual.dibujar`): no se pinta si no hay granos nuevos, destellos, cámara, brillo, ajustes o fundido; destellos que se apagan a 30 fps; respiración de la arena a 15 fps (nunca con ahorro). Setters marcan cambio solo si el valor cambia.
- **Nada se dibuja si no se ve**: con Cristalización o Automatización encima la pila ni simula ni dibuja (bucle a 4 Hz). Pestaña oculta: sin cuadros, economía con temporizador (~1 Hz).
- **Pila decorativa**: worker 4 ms por pedido, ≤ 20 pedidos/s.
- **Interfaz ≤ 10 Hz** (4 con ahorro): el bucle de `juego.svelte.ts` corre cada `uiMs()`; mismos pasos de 0,05 s. Guías y tooltips siguen su objetivo a 10 Hz. `crearRefresco` siempre muestra el último valor.
- **Sismógrafo** a 20 fps, densidad ≤ 2, tamaño por ResizeObserver, sin sombra con ahorro, quieto tapado.
- CSS continuo solo con `transform`/`opacity`; sin `backdrop-filter`. El marco gira con animación CSS y solo si hay marco.
- Red (SVG) y Estratos (canvas 2D + worker) a demanda; **se crean al entrar y se destruyen al salir**. Única escena WebGL: la pila. three.js ya no está en el juego.
- Audio suspendido cuando no suena nada.

## Modo ahorro de batería (Ajustes → Juego, `ajustes.bateria`)

Prendido de entrada en celular (`esMovil()`), apagado en PC. 20 fps de tope; pila a media resolución; `quieto()` (= Reducir movimiento o ahorro): sin brillos, partículas, rotación del marco ni efectos pesados de avalancha; `:root.ahorro` corta los bucles CSS tras una vuelta; pila a 5 pedidos de 3 ms/s y quieta tras 1 min sin toques.

## Resultado medido (2026-11-23, CPU total vs. antes)

Arena: 43 % sin ahorro, 24 % con ahorro. Cristalización/Automatización: 10–31 % sin ahorro, 5–8 % con ahorro. Pestaña oculta: ~20 ms/s.

Antes de cerrar algo visual: 60 fps en la Arena (laptop), nada roto en 390×844. No medido nunca: temperatura y batería en un celular real.
