# Capa 0 · La pila (física y pila visual)

Código: `src/render/pila.ts` (pura), `pila.worker.ts`, `pilaVisual.ts`, `lienzo.ts` (shader), `src/ui/Pila.svelte`. Test: `tests/pila.test.ts`.

## Física real que sostiene la economía

Medido con la simulación exacta (`balance/pila.c`):

- Con G granos, cada grano nuevo da en promedio **0,035 × G derrumbes** (`K_derrumbes_por_grano`). La producción sube sola porque la pila crece.
- Radio de la pila: **0,375 × √G** celdas.
- Pila estable: celdas con 3 granos ~59 %, con 2 ~22 %, con 0 ~14 %, con 1 ~5 %.
- El 75 % de los granos no derrumba nada; el 1–2 % provoca avalanchas con ~95 % de los derrumbes (100–400× el promedio): el "jackpot" natural.

La economía usa la fórmula (ver [economia.md](economia.md)), no la pila visual. La pila visual es independiente.

## Pila visual

- Grilla `Uint8Array` de 513×513 con sumidero fuera del círculo inscrito (pila llena redonda). Capacidad medida: **463.250 granos**.
- Mientras G ≤ capacidad, la pila de pantalla es **exactamente** la real: cada cuadro se manda al worker `floor(G)` menos lo ya mandado (Caudal y Puñados suman a G).
- Al perder el primer grano por el sumidero pasa a estado crítico estacionario: `min(F, 3000)` granos/s, avalanchas para siempre.
- Etiqueta de escala "1 grano = 10^k granos", `k = floor(log10(G / capacidad))`, aparece con k ≥ 1; cada salto hace una animación corta de alejamiento.
- Avalanchas repartidas entre cuadros: el worker trabaja un tiempo acotado por pedido y sigue en el siguiente (nunca congela). Pila decorativa (llena, k ≥ 1): 4 ms por pedido, 20 pedidos/s como mucho (con ahorro: 5 pedidos de 3 ms y quieta tras 1 min sin toques). Ver [../general/rendimiento.md](../general/rendimiento.md).
- La primera corrida arranca con G = 39 (`granos_iniciales`): el primer Puñado dispara una avalancha de ~20 derrumbes.

## Dibujo

- WebGL2: textura R8 de alturas + R32F con el instante del último derrumbe por celda + shader de fragmentos (`lienzo.ts`). Pixel art: el canvas mide como mucho 1 px real por px CSS (0,5 con ahorro) y CSS lo agranda con `image-rendering: pixelated`.
- Color por altura (ver [../general/estilo.md](../general/estilo.md)). El brillo de cada color sube con log10 de su multiplicador, saturando suave: una pila mejorada se ve más luminosa.
- **Derrumbes**: destello aditivo que decae en ~300 ms; una avalancha grande es una onda de luz desde el centro.
- **Avalanchas grandes** (> 30× el promedio): texto flotante "Avalancha ×N" y golpe grave proporcional. Solo visual.
- **Anillos**: al ganar uno, un círculo fino del color dominante se expande desde el borde; el aviso "Anillo N · ×1,10" aparece 1,6 s junto al contador de anillos (no sobre la pila).
- **Zoom** propio de la pila (barra; en el celular arriba a la derecha, oculta con la hoja de la tienda subida).
- **Marco de la pila** (Ajustes → Aspecto): canvas 2D aparte, pegado al borde de la pila tal como se dibuja (`PilaVisual.bordeCss`, `marcos.ts`); la sigue al crecer, comprimir y con el zoom (se abre con la pila pero sus adornos no se agrandan). Gira una vuelta cada 90 s (`marco.segundos_por_vuelta`, cosmético); quieto con Reducir movimiento o ahorro.
- Render a demanda (no se pinta si nada cambió). La pila no simula ni dibuja tapada por Cristalización o Automatización.
- Fotos/miniaturas de pilas: `pilas.bin` (gzip; `fotos.ts` detecta la firma `1f 8b` porque itch.io lo sirve ya descomprimido), generador compartido `miniPilas.ts` (logros, vistas previas, caras de reliquias).
