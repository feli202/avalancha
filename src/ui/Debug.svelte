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

  function exportar() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(juego.s, null, 2)], { type: 'application/json' }))
    a.download = 'avalancha-estado.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
</script>

<aside>
  <strong>{es.debug.titulo}</strong>
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
</aside>

<style>
  aside {
    position: fixed; right: 0.5rem; bottom: 0.5rem; display: grid; gap: 0.5rem; padding: 0.75rem;
    border: 1px solid #ffb547; background: #07080f; font-size: 0.85rem;
  }
  input { width: 3.5rem; }
  button[aria-pressed='true'] { outline: 2px solid #ffb547; }
</style>
