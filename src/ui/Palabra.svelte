<script lang="ts">
  // Capa 2 (beta), fase 6: la palabra de cada liberación (liberaciones.md), grande y una sola vez, al encender su nivel de
  // fuego (la compra es permanente: no vuelve a salir). Encima de todo y sin tocar nada (pointer-events: none).
  import { txt } from '../strings'
  import { quieto } from './ajustes.svelte'
  import { juego } from './juego.svelte'

  const palabra = $derived(txt.fuego.palabras[juego.palabra])
</script>

{#if palabra}
  {#key juego.palabra}
    <p class="palabra" class:quieto={quieto()} role="status"><span>{palabra}</span></p>
  {/key}
{/if}

<style>
  /* 2,8 s (PALABRA_MS). Sube desde una brasa: entra desenfocada y chica, se enciende (degradé de brasa a blanco caliente con
     halo naranja), titila apenas dos veces (menos de 3 por segundo) y se apaga subiendo como calor. */
  .palabra {
    position: fixed; inset: 0; z-index: 60; margin: 0; display: grid; place-items: center; pointer-events: none;
    background: radial-gradient(ellipse 60% 35% at 50% 50%, rgb(255 90 31 / 0.22), transparent 70%);
    animation: fondo 2.8s ease-out forwards;
  }
  span {
    font-size: clamp(1.8rem, 8.5vw, 7.5rem); font-weight: 700; letter-spacing: 0.06em; line-height: 1; padding: 0 0.3em;
    max-width: 100vw; overflow-wrap: anywhere; text-align: center;
    background: linear-gradient(180deg, #fff1d6 10%, #ffb347 45%, #ff5a1f 75%, #8a1f08); background-clip: text; -webkit-background-clip: text; color: transparent;
    filter: drop-shadow(0 0 0.35em rgb(255 90 31 / 0.6));
    animation: encender 2.8s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
  }
  @keyframes encender {
    0% { opacity: 0; scale: 0.82; translate: 0 0.4em; filter: blur(10px) drop-shadow(0 0 0 transparent); }
    22% { opacity: 1; scale: 1; translate: 0 0; filter: blur(0) drop-shadow(0 0 0.5em rgb(255 90 31 / 0.85)); }
    40% { filter: blur(0) drop-shadow(0 0 0.25em rgb(255 90 31 / 0.5)); }
    58% { filter: blur(0) drop-shadow(0 0 0.45em rgb(255 90 31 / 0.75)); }
    75% { opacity: 1; translate: 0 0; filter: blur(0) drop-shadow(0 0 0.35em rgb(255 90 31 / 0.6)); }
    100% { opacity: 0; translate: 0 -0.5em; filter: blur(6px) drop-shadow(0 0 0 transparent); }
  }
  @keyframes fondo { 0%, 70% { opacity: 1; } 100% { opacity: 0; } }
  /* Reducir destellos (o ahorro): no se mueve, no se desenfoca ni titila; solo aparece y se apaga. */
  .quieto span { animation: aparecer 2.8s ease-in-out forwards; }
  @keyframes aparecer { 0% { opacity: 0; } 20%, 75% { opacity: 1; } 100% { opacity: 0; } }
</style>
