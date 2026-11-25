# Capa 1 · Escarcha

Núcleo: `src/core/escarcha.ts`. UI: `src/ui/Escarcha.svelte`. Config: `config_capa1.json → escarcha`. Referencia: `balance/ref_escarcha.py` → `tests/escarcha.test.ts` (1 h: mismo logX, Esquirlas, g, P y m).

Versión vigente: **Punto de ruptura** (2026-11-25, estilo Replicanti). Crecer más rápido = romper más seguido.

```
logX   = min(P, logX + g × dt)                     (espesor en log10; espera en P sin perder nada)
g      = 0,0045 × (1 + 0,003 × Presión) × 1,12^Crecimiento × Germen × Eco II × (2 si Fatiga)
aporte = m × logX                                   (se suma a log10 V, dentro de la Densidad)
m      = 1,6^Brillo
P      = 40 × 1,55^Umbral × Frío × (1,5 si Inclusión)   (Punto de ruptura)
```

- **Romper** (botón, solo con `logX = P`; automático con Deshielo): da `floor(P / 3) × Deshielo.esquirlas_x` Esquirlas y `logX` vuelve a `logX_tras_romper` (1). Animación: se agrieta en hexágonos y salta.
- **Mejoras con Esquirlas** (log10, nivel L, redondeado): Crecimiento `0 + 0,4L` (×1,12 a g), Brillo `0 + 1,0L` (×1,6 a m), Umbral `0 + 0,5L` (×1,55 a P). Los primeros niveles son baratos y después encarecen rápido: así pesa en el medio de la 1.2 y no se dispara al final. Más el Pulido de reliquias ([relicario.md](relicario.md)). **No hay freno** (la penalidad del viejo Aguante se sacó).
- `g` usa la Presión sin el ×0,5 de Dislocación. Frío = `escarcha_P_x`; Fatiga/Inclusión = `recompensa_escarcha_g_x` / `recompensa_escarcha_P_x`.
- `reloj` cuenta segundos desde la última ruptura (logro Témpano). Esquirlas como número. Un guardado viejo con `aguante` lo carga como `umbral`.
- No funciona en el Defecto Vidrio.
- Se desbloquea con el hito de la 1.1 (Estrato 8 lleno con los 4 primeros Defectos); abre el anillo 3 de la Red.
- Offline crece con las reglas de [offline.md](offline.md) y se rompe sola solo con Deshielo.

## Pantalla

Barra hacia P con % y "rompe en ~X"; botón Romper que se enciende al llegar; ficha con P; tooltip por mejora (qué hace · Ahora · Siguiente). La placa y la escarcha del borde de la pila crecen con `logX / P`. Guía, ayuda y "Cómo funciona" en 3 frases.

## Balance (2026-11-25)

Calibrada contra el ritmo de la Escarcha vieja tocando solo sus números (barrido con el núcleo real, `npm run test:lento`): Fatiga 9,86 · Frontera 12,98 · Inclusión 13,27 · Vidrio 13,86 · fin 14,01 h (vieja: 10,40 · 12,66 · 13,33 · 13,94 · 14,94). 42 rupturas en la 1.2; la primera llega a los ~20 min de abrirla (con P más alto el jugador esperaba 46 min sin nada que comprar).

- El fin queda ~0,9 h antes que con la vieja y pegado a Vidrio: con la Escarcha prendida los Cristales suben rápido mientras se reintenta Vidrio (donde está apagada) y su recompensa ×1000 cierra la capa. Ajustar solo la Escarcha no separa los dos; hacerla más débil al final atrasa Frontera más de 1 h.
- Su peso oscila con el ciclo: ~0 % justo después de romper, máximo en P. El Infinito óptimo cae justo al romper (ahí baja la producción), así que el test mide los pesos con `logX = P / 2`.
