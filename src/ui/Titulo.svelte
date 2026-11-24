<script lang="ts">
  // Pantalla de título (siempre al cargar): el nombre sobre la pila del juego, quieta y lejos (Pila.svelte).
  // Mientras está, la economía no corre y el fuera de línea espera (juego.svelte.ts). Al entrar, la cámara se acerca.
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { txt } from '../strings'
  import { quieto } from './ajustes.svelte'
  import { juego } from './juego.svelte'

  let boton: HTMLButtonElement
  onMount(() => boton.focus())
</script>

<div class="titulo" class:quieto={quieto()} out:fade={{ duration: 700 }}>
  <div class="centro">
    <img src="{import.meta.env.BASE_URL}logo.svg" alt="" width="64" height="64" />
    <h1>{txt.titulo}</h1>
    <button bind:this={boton} onclick={() => (juego.titulo = false)}>{juego.hayPartida ? txt.continuar : txt.jugar}</button>
  </div>
</div>

<style>
  /* Viñeteado: el nombre se lee sobre la pila, que se intuye detrás. */
  .titulo { position: fixed; inset: 0; z-index: 10;
    background: radial-gradient(ellipse at center, rgb(7 8 15 / 0.55) 0, rgb(7 8 15 / 0.35) 45%, rgb(7 8 15 / 0.9) 100%); }
  .centro { display: grid; place-content: center; justify-items: center; height: 100%; padding: 1rem; }
  img { width: clamp(3rem, 9vw, 4.5rem); height: auto; margin-bottom: 1.25rem; animation: llegar 1.2s ease-out both; }
  h1 {
    margin: 0 0 2.5rem; font-size: clamp(3rem, 13vw, 7.5rem); font-weight: 600; line-height: 0.95; letter-spacing: -0.05em;
    text-shadow: 0 0 2.5rem rgb(255 181 71 / 0.25), 0 0 1rem var(--fondo); animation: llegar 1.2s 0.15s ease-out both;
  }
  /* Botón: texto con una línea de 1 px, como el resto de la interfaz. */
  button {
    min-width: 10rem; min-height: 3rem; padding: 0 2rem; border: 0; border-bottom: 1px solid var(--apagado); background: none;
    color: var(--tinta); font: inherit; font-size: 1.25rem; font-weight: 600; letter-spacing: 0.02em; cursor: pointer;
    transition: border-color 0.2s; animation: llegar 1.2s 0.4s ease-out both;
  }
  button:hover, button:focus-visible { border-color: var(--tinta); }
  @keyframes llegar { from { opacity: 0; transform: translateY(0.5rem); } }
  .quieto img, .quieto h1, .quieto button { animation-name: aparecer; }
  @keyframes aparecer { from { opacity: 0; } }
</style>
