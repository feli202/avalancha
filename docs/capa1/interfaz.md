# Capa 1 · Interfaz de Cristalización

UI: `src/ui/Capas.svelte`, `Paneles.svelte`, `Nevada.svelte`, `hielo.css`, pantallas de cada sistema. Guías: `ayudas.svelte.ts` (`PANTALLA_GUIA` en `juego.svelte.ts`). Estilo general: [../general/estilo.md](../general/estilo.md).

## Navegación

- **Barra de capas**: escritorio a la izquierda (5 rem, sin caja; sombra desde el borde, la activa con su color, resplandor y marca corta): Arena (mini pila ámbar) → Cristalización (prisma de hielo), nombre debajo del ícono; abajo, separada, **Automatización**. La Capa 2 aparece como silueta gris al final. Celular/tablet vertical: barra de navegación de lado a lado abajo (`--nav`, con safe area).
- Dentro de Cristalización, segunda barra: **Red · Estratos · Defectos · Escarcha · Relicario**, pestañas rectas con ícono propio y el nombre chico debajo. Cada una a pantalla completa; las cerradas no se muestran (o "???" la siguiente).
- Cabecera: Cristales grandes; Totales / Energía / Esquirlas en renglones chicos (compacta en el celular).
- Fila de íconos (foto, logros, estadísticas, ajustes, ayuda) en todas las capas.

## Estética helada (`hielo.css`)

Fondo azul noche, blancos fríos, cian para lo de la capa. Paneles = **placas de hielo** (`.placa`: escarcha en ruido fino, esquinas facetadas a 60° con `clip-path`, arista fría arriba). Botones de compra = **gemas** (`.gema`: biselados, reflejo lento, se encienden desde adentro en 0,6 s cuando alcanza). Escarcha cayendo detrás (tres capas, solo `transform`). Los 4 colores de la Capa 0 siguen siendo los de nivel. Sin `backdrop-filter`, sin tarjetas con sombra, sin emojis. Automatización y la barra de capas son neutras.

## En la Arena con la Capa 1

- **Carámbano hacia la Capa 2**: con el Infinito roto, en lugar del camino al Infinito, un carámbano que baja con log10(Cristales totales) / 308,25; tooltip "Cristales totales 1e142 / 1e308"; en el último 10 % la punta tiene una brasa tenue.
- Pop-up de reliquia, cartel del Defecto, multiplicadores del Defecto (ver sus docs).

## Momentos

- **Primer Infinito**: cinemática (la pila se congela desde abajo, se rompe en cristales, la cámara cae a Cristalización), 3 líneas sobre los Cristales y el primer Relicario.
- **Fin de la capa** (1e308 Cristales totales): pantalla "Capa 2 próximamente" en una placa de hielo con la brasa asomando; «Juntaste 1e308 Cristales. Debajo del hielo, algo arde.»; resumen de la partida descargable como imagen 1080×1350 (`ui/resumen.ts`) y links de Discord e itch.io.

## Guías

Cada guía tiene un id y se anota en `vistos`: sale **una sola vez en la vida de la partida**, la primera vez que se mira su pantalla: Cristales (al cerrar la presentación), Relicario, Red, Estratos (ya abiertos), Automatización, Defectos (al desbloquearlos), Escarcha; con la Escarcha abierta: `c1_anillo3`, `c1_pulido`, `c1_defectos2`. Cada una tiene su página en "Cómo funciona" con fórmula y valores actuales. Las de la Capa 0 salen con la Arena al frente; las de la Capa 1, fuera de ella.
