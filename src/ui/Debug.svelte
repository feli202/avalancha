<script lang="ts">
  // Panel de debug: solo se monta en desarrollo (ver App.svelte).
  import Decimal from 'break_infinity.js'
  import { CFG, estadoInicial } from '../core'
  import { es } from '../strings/es'
  import { juego } from './juego.svelte'

  const umbrales = CFG.compresion.umbrales_log10
  let n = $state(1)

  function darEnergia() {
    juego.s = { ...juego.s, energia: juego.s.energia.mul(1000).add(1000) }
  }

  function saltar() {
    const c = Math.max(0, Math.min(umbrales.length, Math.floor(n)))
    const alcanzada = c > 0 ? Decimal.pow10(umbrales[c - 1]) : new Decimal(0)
    // Corrida nueva en la Compresión c; tick() desbloquea los colores a partir de maxEnergia.
    juego.s = {
      ...estadoInicial(),
      compresiones: c,
      mutaciones: juego.s.mutaciones,
      maxEnergia: Decimal.max(juego.s.maxEnergia, alcanzada),
    }
  }

  const formatoMedida = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

  function exportar() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(juego.s, null, 2)], { type: 'application/json' }))
    a.download = 'avalancha-estado.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
</script>

<details>
  <summary>{es.debug.titulo}</summary>
  <div>
    {es.debug.velocidad}
    {#each [1, 10, 50] as v}
      <button aria-pressed={juego.velocidad === v} onclick={() => (juego.velocidad = v)}>×{v}</button>
    {/each}
  </div>
  <button onclick={darEnergia}>{es.debug.darEnergia}</button>
  <label>
    {es.debug.saltar}
    <input type="number" min="0" max={umbrales.length} bind:value={n} />
    <button onclick={saltar}>{es.debug.ir}</button>
  </label>
  <button onclick={exportar}>{es.debug.exportar}</button>
  <button onclick={() => (juego.s = { ...juego.s, caudal: juego.s.caudal + 1 })}>{es.debug.caudalMas}</button>
  <div>
    {#each [50_000, 400_000] as n}
      <button onclick={() => (juego.s = { ...juego.s, granos: Math.max(juego.s.granos, n) })}>{es.debug.pilaA(n)}</button>
    {/each}
  </div>
  <label>
    {es.debug.nivelColores} ({juego.nivelColores})
    <input type="range" min="0" max="200" step="5" bind:value={juego.nivelColores} />
  </label>
  {#if juego.medidas}
    <dl>
      {#each ['fps', 'peorCuadro', 'cuadroMs', 'granosSeg', 'derrumbesSeg', 'workerMs'] as const as k}
        <dt>{es.debug[k]}</dt><dd>{formatoMedida.format(juego.medidas[k])}</dd>
      {/each}
    </dl>
  {/if}
</details>

<style>
  details {
    position: fixed; left: 0.5rem; top: 50%; translate: 0 -50%; z-index: 10; display: grid; gap: 0.5rem; padding: 0.75rem;
    border: 1px solid #ffb547; background: #07080f; font-size: 0.85rem; max-height: 90vh; overflow: auto;
  }
  input { width: 3.5rem; }
  dl { display: grid; grid-template-columns: 1fr auto; gap: 0.1rem 0.75rem; margin: 0; font-variant-numeric: tabular-nums; }
  dd { margin: 0; text-align: right; }
  button[aria-pressed='true'] { outline: 2px solid #ffb547; }
</style>
