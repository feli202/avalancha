<script lang="ts">
  // Pantalla de título (solo sin partida guardada): el logo, el nombre y la pila cayendo detrás en cámara lenta.
  // Mientras está, la economía no corre (juego.svelte.ts).
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { COLORES_DALTONISMO } from '../render/paletas'
  import { PilaVisual } from '../render/pilaVisual'
  import { txt } from '../strings'
  import { ajustes } from './ajustes.svelte'
  import { juego } from './juego.svelte'

  const DESDE = 1000 // granos de la pila de fondo al aparecer (la foto más chica de pilas.json)
  const RITMO = 30 // granos por segundo: cámara lenta
  const BRILLOS = [0.35, 0.35, 0.35, 0.35]

  let canvas: HTMLCanvasElement
  let boton: HTMLButtonElement

  onMount(() => {
    const pila = new PilaVisual(canvas)
    pila.destellos = ajustes.reducirDestellos
    if (ajustes.daltonismo) pila.paleta = COLORES_DALTONISMO
    const t0 = performance.now()
    let raf = requestAnimationFrame(function cuadro(ahora) {
      pila.cuadro(ahora, DESDE + (Math.max(0, ahora - t0) / 1000) * RITMO, RITMO, BRILLOS)
      raf = requestAnimationFrame(cuadro)
    })
    boton.focus()
    return () => {
      cancelAnimationFrame(raf)
      pila.destruir()
    }
  })
</script>

<div class="titulo" class:quieto={ajustes.reducirDestellos} out:fade={{ duration: 600 }}>
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
  <div class="centro">
    <img src="{import.meta.env.BASE_URL}logo.svg" alt="" width="64" height="64" />
    <h1>{txt.titulo}</h1>
    <button bind:this={boton} onclick={() => (juego.titulo = false)}>{txt.jugar}</button>
  </div>
</div>

<style>
  .titulo { position: fixed; inset: 0; z-index: 10; background: var(--fondo); }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.45; }
  /* Viñeteado: el nombre se lee sobre la pila. */
  .titulo::after { content: ''; position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(ellipse at center, rgb(7 8 15 / 0.75) 0, rgb(7 8 15 / 0.35) 45%, rgb(7 8 15 / 0.85) 100%); }
  .centro { position: relative; z-index: 1; display: grid; place-content: center; justify-items: center; height: 100%; padding: 1rem; }
  img { width: clamp(3rem, 9vw, 4.5rem); height: auto; margin-bottom: 1.25rem; animation: llegar 1.2s ease-out both; }
  h1 {
    margin: 0 0 2.5rem; font-size: clamp(3rem, 13vw, 7.5rem); font-weight: 600; line-height: 0.95; letter-spacing: -0.05em;
    text-shadow: 0 0 2.5rem rgb(255 181 71 / 0.25); animation: llegar 1.2s 0.15s ease-out both;
  }
  button {
    min-width: 10rem; min-height: 3rem; padding: 0 2rem; border: 1px solid var(--borde); border-radius: 999px;
    background: var(--vidrio); backdrop-filter: blur(8px); color: var(--tinta); font: inherit; font-size: 1.125rem; font-weight: 500;
    letter-spacing: 0.02em; cursor: pointer; transition: border-color 0.2s, background 0.2s; animation: llegar 1.2s 0.4s ease-out both;
  }
  button:hover { border-color: rgb(255 255 255 / 0.3); background: rgb(30 33 56 / 0.7); }
  @keyframes llegar { from { opacity: 0; transform: translateY(0.5rem); } }
  .quieto img, .quieto h1, .quieto button { animation-name: aparecer; }
  @keyframes aparecer { from { opacity: 0; } }
</style>
