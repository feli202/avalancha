<script lang="ts">
  // Histograma log-log de las avalanchas y la recta de mínimos cuadrados (la ley de potencias).
  // Lo usan Estadísticas y "Cómo funciona".
  import { POR_DECADA } from '../guardado/historial'
  import { txt } from '../strings'
  import { formato } from './formato'

  let { avalanchas }: { avalanchas: number[] } = $props()

  const AV = { w: 640, h: 280, izq: 44, abajo: 34, arriba: 12, der: 12 }
  const n = (x: number) => x.toLocaleString(txt.locale, { maximumFractionDigits: 2 })
  const casillas = $derived(avalanchas.map((c, k) => ({ k, c })).filter((x) => x.c > 0))
  const xMax = $derived(Math.max(4, Math.ceil(avalanchas.length / POR_DECADA))) // décadas
  const yMax = $derived(Math.max(1, Math.ceil(Math.log10(Math.max(1, ...avalanchas)) + 0.2)))
  const ax = (dec: number) => AV.izq + (dec / xMax) * (AV.w - AV.izq - AV.der)
  const ay = (dec: number) => AV.h - AV.abajo - (dec / yMax) * (AV.h - AV.abajo - AV.arriba)
  const recta = $derived.by(() => {
    if (casillas.length < 3) return null
    const xs = casillas.map((p) => (p.k + 0.5) / POR_DECADA), ys = casillas.map((p) => Math.log10(p.c))
    const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length
    const m = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0)
    const x0 = xs[0], x1 = xs[xs.length - 1]
    return { m, x0, x1, y0: my + m * (x0 - mx), y1: my + m * (x1 - mx) }
  })
</script>

{#if casillas.length}
  <svg class="grafico" viewBox="0 0 {AV.w} {AV.h}" role="img" aria-label={txt.estadisticas.leyPotencias}>
    {#each { length: yMax + 1 } as _, d}
      <line class="guia" x1={AV.izq} x2={AV.w - AV.der} y1={ay(d)} y2={ay(d)} />
      <text class="eje" x={AV.izq - 8} y={ay(d) + 4} text-anchor="end">{formato(10 ** d)}</text>
    {/each}
    {#each { length: xMax + 1 } as _, d}
      <text class="eje" class:par={d % 2 === 1} x={ax(d)} y={AV.h - AV.abajo + 18} text-anchor={d === xMax ? 'end' : 'middle'}>{formato(10 ** d)}</text>
    {/each}
    {#each casillas as p, i (p.k)}
      {@const x = ax(p.k / POR_DECADA)}
      {@const w = ax(1 / POR_DECADA) - ax(0)}
      <rect class="columna" style:--i={i} x={x + 1} y={ay(Math.log10(p.c) + 0.12)} width={w - 2}
        height={ay(0) - ay(Math.log10(p.c) + 0.12)} />
    {/each}
    {#if recta}
      <line class="recta" x1={ax(recta.x0)} y1={ay(recta.y0)} x2={ax(recta.x1)} y2={ay(recta.y1)} />
      <text class="eje recta-t" x={ax(recta.x1)} y={ay(recta.y1) - 8} text-anchor="end">
        {txt.estadisticas.pendiente(n(recta.m))}
      </text>
    {/if}
    <text class="eje titulo-eje" x={AV.w - AV.der} y={AV.h - 2} text-anchor="end">{txt.estadisticas.ejeTamano} →</text>
  </svg>
{:else}
  <p class="vacio">{txt.estadisticas.sinAvalanchas}</p>
{/if}

<style>
  .vacio { margin: 2rem 0; color: var(--tenue); }
  .grafico { display: block; width: 100%; height: auto; margin: 0 0 2rem; overflow: visible; }
  .guia { stroke: var(--borde); stroke-width: 1; }
  .eje { fill: var(--apagado); font-size: 12px; font-variant-numeric: tabular-nums; }
  .columna { fill: var(--ambar); opacity: 0.85; transform-box: fill-box; transform-origin: bottom; animation: crecer 0.6s calc(var(--i) * 0.03s) cubic-bezier(0.2, 0.8, 0.2, 1) backwards; transition: y 0.6s, height 0.6s; }
  .recta { stroke: var(--tinta); stroke-width: 1.5; stroke-dasharray: 5 5; opacity: 0.7; }
  .recta-t { fill: var(--tenue); }
  @keyframes crecer { from { transform: scaleY(0); } }
  :global(.quieto) .columna { animation: none; }
  @media (max-width: 767px) {
    .eje { font-size: 22px; } /* el SVG se achica a la mitad: que el texto siga legible */
    .par, .titulo-eje { display: none; } /* una década sí y una no, sin pisarse */
  }
</style>
