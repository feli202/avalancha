<script lang="ts">
  // Panel de debug: solo se monta en desarrollo (ver App.svelte).
  import Decimal from 'break_infinity.js'
  import { CFG, estadoInicial } from '../core'
  import { txt } from '../strings'
  import { borrarPartida, juego } from './juego.svelte'
  import { IDS, grabarClips } from './clips'
  import { grabacion } from './grabacion'
  import { RITMO_MAX } from '../render/pilaVisual'

  // ?grabar=todos (o ?grabar=regla,unica): graba solo al cargar, para un navegador aparte que no frene los cuadros.
  const pedidos = new URLSearchParams(location.search).get('grabar')
  if (pedidos) {
    dispatchEvent(new Event('pointerdown')) // arranca el audio (el navegador se abre con autoplay permitido)
    setTimeout(() => grabarClips(pedidos === 'todos' ? IDS : pedidos.split(',')), 2000)
  }

  const umbrales = CFG.compresion.umbrales_log10
  let n = $state(1)

  function darEnergia() {
    juego.s = { ...juego.s, energia: juego.s.energia.mul(1000).add(1000) }
  }

  // Capa 1: al borde del Infinito, con el final de la Arena comprado (compresiones, Cascada y Mutaciones al máximo);
  // los autocompradores gastan la Energía y la producción llega a 1e308 en unos segundos.
  function casiInfinito() {
    const energia = Decimal.pow10(Math.floor(CFG.infinito_log10) - 1)
    const m = CFG.mutaciones.nivel_max
    juego.s = {
      ...juego.s, energia, maxEnergia: energia, compresiones: umbrales.length, cascada: CFG.cascada.nivel_max,
      mutaciones: { caudal: m, colores: m, expansion: m, cascada: m },
    }
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

  const formatoMedida = new Intl.NumberFormat(txt.locale, { maximumFractionDigits: 1 })

  function exportar() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(juego.s, null, 2)], { type: 'application/json' }))
    a.download = 'avalancha-estado.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
</script>

<details>
  <summary>{txt.debug.titulo}</summary>
  <div>
    {txt.debug.velocidad}
    {#each [1, 10, 50] as v}
      <button aria-pressed={juego.velocidad === v} onclick={() => (juego.velocidad = v)}>×{v}</button>
    {/each}
  </div>
  <button onclick={darEnergia}>{txt.debug.darEnergia}</button>
  <button onclick={casiInfinito}>{txt.debug.casiInfinito}</button>
  <button onclick={() => (juego.s = { ...juego.s, cristales: juego.s.cristales.mul(10).add(10), cristalesTotales: juego.s.cristalesTotales.add(juego.s.cristales.mul(9).add(10)) })}>{txt.debug.darCristales}</button>
  <label>
    {txt.debug.saltar}
    <input type="number" min="0" max={umbrales.length} bind:value={n} />
    <button onclick={saltar}>{txt.debug.ir}</button>
  </label>
  <button onclick={exportar}>{txt.debug.exportar}</button>
  <!-- Sin confirmación: es una herramienta de desarrollo (en Ajustes lleva doble confirmación). -->
  <button onclick={borrarPartida}>{txt.debug.borrar}</button>
  <button onclick={() => (juego.s = { ...juego.s, caudal: juego.s.caudal + 1 })}>{txt.debug.caudalMas}</button>
  <div>
    {#each [50_000, 400_000] as n}
      <button onclick={() => (juego.s = { ...juego.s, granos: Math.max(juego.s.granos, n) })}>{txt.debug.pilaA(n)}</button>
    {/each}
    <!-- Más que la capacidad (~463.000) más el relleno del 12 %: la pila llega al círculo y queda redonda. -->
    <button onclick={() => (juego.s = { ...juego.s, granos: Math.max(juego.s.granos, 600_000) })}>{txt.debug.pilaLlena}</button>
    <button onclick={() => grabacion.pila?.echar(RITMO_MAX)}>{txt.debug.avalancha}</button>
  </div>
  <label>
    {txt.debug.nivelColores} ({juego.nivelColores})
    <input type="range" min="0" max="200" step="5" bind:value={juego.nivelColores} />
  </label>
  <!-- Modo grabación: cada clip en español e inglés, a marketing/clips/ (clips.ts). -->
  <div>
    {txt.debug.grabar}
    <button onclick={() => grabarClips(IDS)}>{txt.debug.grabarTodo}</button>
    {#each IDS as id}<button onclick={() => grabarClips([id])}>{id}</button>{/each}
  </div>
  {#if juego.medidas}
    <dl>
      {#each ['fps', 'peorCuadro', 'cuadroMs', 'granosSeg', 'derrumbesSeg', 'workerMs'] as const as k}
        <dt>{txt.debug[k]}</dt><dd>{formatoMedida.format(juego.medidas[k])}</dd>
      {/each}
    </dl>
  {/if}
</details>

<style>
  details {
    position: fixed; left: 3.5rem; top: 50%; translate: 0 -50%; z-index: 10; display: grid; gap: 0.5rem; padding: 0.75rem;
    border: 1px solid #ffb547; background: #07080f; font-size: 0.85rem; max-height: 90vh; overflow: auto;
  }
  input { width: 3.5rem; }
  dl { display: grid; grid-template-columns: 1fr auto; gap: 0.1rem 0.75rem; margin: 0; font-variant-numeric: tabular-nums; }
  dd { margin: 0; text-align: right; }
  button[aria-pressed='true'] { outline: 2px solid #ffb547; }
</style>
