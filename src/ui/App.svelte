<script lang="ts">
  // Pantalla mínima para probar el núcleo. La interfaz real llega en el hito 3.
  import { comprar, costo, nivel, produccion, puedeComprar } from '../core'
  import { es } from '../strings/es'
  import Debug from './Debug.svelte'
  import Pila from './Pila.svelte'
  import { formato } from './formato'
  import { juego } from './juego.svelte'
</script>

<Pila />

<main>
  <h1>{es.titulo}</h1>
  <dl>
    <dt>{es.energia}</dt><dd>{formato(juego.s.energia)}</dd>
    <dt>{es.energiaPorSegundo}</dt><dd>{formato(produccion(juego.s))}</dd>
    <dt>{es.granos}</dt><dd>{formato(juego.s.granos)}</dd>
  </dl>
  <button disabled={!puedeComprar(juego.s, 'caudal')} onclick={() => (juego.s = comprar(juego.s, 'caudal'))}>
    {es.comprarCaudal} · {formato(costo(juego.s, 'caudal'))} ({es.nivel} {nivel(juego.s, 'caudal')})
  </button>
  <label><input type="checkbox" bind:checked={juego.reducirDestellos} /> {es.reducirDestellos}</label>
</main>

{#if import.meta.env.DEV}<Debug />{/if}

<style>
  /* A un costado para no tapar la pila; la interfaz real llega en el hito 3. */
  main { position: relative; width: fit-content; max-width: 16rem; padding: 1rem; }
  h1 { margin-top: 0; }
  dl { display: grid; grid-template-columns: 1fr auto; gap: 0.5rem 1rem; font-variant-numeric: tabular-nums; }
  dd { margin: 0; text-align: right; }
  button { width: 100%; min-height: 44px; font: inherit; }
  label { display: flex; align-items: center; gap: 0.5rem; min-height: 44px; }
</style>
