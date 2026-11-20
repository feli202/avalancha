<script lang="ts">
  // Hay otro build publicado (src/version.svelte.ts): un aviso discreto abajo, con la estética de las notas de cristal.
  import { txt } from '../strings'
  import { actualizar, version } from '../version.svelte'
</script>

{#if version.nueva}
  <div class="version hielo placa" role="status">
    <span>{txt.version.hay}</span>
    <button class="gema" onclick={actualizar}>{txt.version.actualizar}</button>
  </div>
{/if}

<style>
  .version {
    position: fixed; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 0.75rem); translate: -50% 0; z-index: 40; box-sizing: border-box;
    display: flex; align-items: center; gap: 1rem; width: max-content; max-width: calc(100% - 2rem); padding: 0.5rem 0.6rem 0.5rem 1.1rem;
    font-size: 0.875rem; color: var(--escarcha); animation: fundido 0.5s ease-out;
  }
  .version button { min-height: 2.75rem; padding: 0.4rem 1.1rem; font: inherit; font-weight: 600; color: var(--escarcha); cursor: pointer; white-space: nowrap; }
  @keyframes fundido { from { opacity: 0; } }
  /* Celular y tablet en vertical: abajo, sobre la barra de capas (arriba tapaba la Energía). */
  @media (orientation: portrait) and (max-width: 1100px) {
    .version { top: auto; bottom: calc(var(--nav, 0px) + 0.75rem); }
  }
</style>
