<script lang="ts">
  // Correcciones Capa 1, bloque 13: escarcha que cae muy lenta detrás de Cristalización. Tres capas de puntos en mosaico
  // que bajan con `transform` (solo composición, sin repintar). Con Reducir movimiento (y con ahorro) no se muestra.
  // Bajan unos 7 px por segundo: una animación CSS componía las tres capas (enormes) 60 veces por segundo; con 10 basta.
  import { onMount } from 'svelte'
  import { quieto } from './ajustes.svelte'

  const CAPAS = [{ t: 41, d: 95 }, { t: 29, d: 120 }, { t: 17, d: 150 }] // mosaico (rem) y segundos por mosaico
  const CADA_MS = 100
  let capas: HTMLElement[] = []
  onMount(() => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const mover = () => {
      if (quieto()) return // no se muestra
      const s = performance.now() / 1000
      CAPAS.forEach((c, i) => capas[i] && (capas[i].style.transform = `translateY(${(((s / c.d) % 1) * c.t * rem).toFixed(1)}px)`))
    }
    mover()
    const reloj = setInterval(mover, CADA_MS)
    return () => clearInterval(reloj)
  })
</script>

<div class="escarcha" aria-hidden="true">{#each CAPAS as c, i}<i bind:this={capas[i]} style:--t="{c.t}rem"></i>{/each}</div>

<style>
  .escarcha { position: fixed; inset: 0; overflow: hidden; pointer-events: none; }
  i {
    position: absolute; left: -10%; right: -10%; top: calc(-1 * var(--t)); height: calc(100% + var(--t)); /* baja un mosaico: no hace falta más capa */
    background: var(--puntos) 0 0 / var(--t) var(--t);
    will-change: transform;
  }
  /* Tres capas con mosaicos de tamaños que no se repiten juntos: cerca, copos blandos más grandes y rápidos; lejos, chicos y lentos. */
  i:nth-child(1) {
    opacity: 0.5;
    --puntos: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 656 656'%3E%3Cdefs%3E%3CradialGradient id='g'%3E%3Cstop offset='0' stop-color='%23eaf8ff'/%3E%3Cstop offset='.35' stop-color='%23eaf8ff' stop-opacity='.7'/%3E%3Cstop offset='1' stop-color='%23eaf8ff' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Cg fill='url(%23g)'%3E%3Ccircle cx='80' cy='120' r='4.5'/%3E%3Ccircle cx='430' cy='40' r='3.2'/%3E%3Ccircle cx='560' cy='470' r='5'/%3E%3Ccircle cx='250' cy='560' r='3.6'/%3E%3C/g%3E%3C/svg%3E");
  }
  i:nth-child(2) {
    opacity: 0.4; left: -23%;
    --puntos: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 464 464'%3E%3Cdefs%3E%3CradialGradient id='g'%3E%3Cstop offset='0' stop-color='%23bfeeff'/%3E%3Cstop offset='.35' stop-color='%23bfeeff' stop-opacity='.7'/%3E%3Cstop offset='1' stop-color='%23bfeeff' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Cg fill='url(%23g)'%3E%3Ccircle cx='60' cy='300' r='3'/%3E%3Ccircle cx='330' cy='90' r='2.6'/%3E%3Ccircle cx='400' cy='380' r='3.4'/%3E%3C/g%3E%3C/svg%3E");
  }
  i:nth-child(3) {
    opacity: 0.3; left: -37%;
    --puntos: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 272 272'%3E%3Cdefs%3E%3CradialGradient id='g'%3E%3Cstop offset='0' stop-color='%239fe3f5'/%3E%3Cstop offset='.35' stop-color='%239fe3f5' stop-opacity='.7'/%3E%3Cstop offset='1' stop-color='%239fe3f5' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Cg fill='url(%23g)'%3E%3Ccircle cx='40' cy='60' r='2'/%3E%3Ccircle cx='190' cy='200' r='2.2'/%3E%3C/g%3E%3C/svg%3E");
  }
  :global(.quieto) .escarcha { display: none; }
  @media (prefers-reduced-motion: reduce) { .escarcha { display: none; } }
</style>
