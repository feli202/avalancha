# Capa 1 · Escarcha

Núcleo: `src/core/escarcha.ts`. UI: `src/ui/Escarcha.svelte`. Config: `config_capa1.json → escarcha`. Referencia: `balance/ref_escarcha.py` → `tests/escarcha.test.ts` (1 h: mismo logX, Esquirlas, g, P y m).

Versión vigente: **Punto de ruptura** (2026-11-25, estilo Replicanti). Crecer más rápido = romper más seguido.

```
logX   = min(P, logX + g × dt)                     (espesor en log10; espera en P sin perder nada)
g      = 0,004 × (1 + 0,003 × Presión) × 1,12^Crecimiento × Germen × Eco II × (2 si Fatiga)
aporte = m × logX                                   (se suma a log10 V, dentro de la Densidad)
m      = 1,4^Brillo
P      = 50 × 1,3^Umbral × Frío × (1,5 si Inclusión)   (Punto de ruptura)
```

- **Romper** (botón, solo con `logX = P`; automático con Deshielo): da `floor(P / 3) × Deshielo.esquirlas_x` Esquirlas y `logX` vuelve a `logX_tras_romper` (1). Animación: se agrieta en hexágonos y salta.
- **Mejoras con Esquirlas** (log10, nivel L, redondeado): Crecimiento `0 + 0,4L` (×1,12 a g), Brillo `0,5 + 0,5L` (×1,4 a m), Umbral `0,5 + 0,4L` (×1,3 a P). Más el Pulido de reliquias ([relicario.md](relicario.md)). **No hay freno** (la penalidad del viejo Aguante se sacó).
- `g` usa la Presión sin el ×0,5 de Dislocación. Frío = `escarcha_P_x`; Fatiga/Inclusión = `recompensa_escarcha_g_x` / `recompensa_escarcha_P_x`.
- `reloj` cuenta segundos desde la última ruptura (logro Témpano). Esquirlas como número. Un guardado viejo con `aguante` lo carga como `umbral`.
- No funciona en el Defecto Vidrio.
- Se desbloquea con el hito de la 1.1 (Estrato 8 lleno con los 4 primeros Defectos); abre el anillo 3 de la Red.
- Offline crece con las reglas de [offline.md](offline.md) y se rompe sola solo con Deshielo.

## Pantalla

Barra hacia P con % y "rompe en ~X"; botón Romper que se enciende al llegar; ficha con P; tooltip por mejora (qué hace · Ahora · Siguiente). La placa y la escarcha del borde de la pila crecen con `logX / P`. Guía, ayuda y "Cómo funciona" en 3 frases.

Peso al final de la capa: 4 % de log V (con el tope fijo pesa menos que la versión vieja).
