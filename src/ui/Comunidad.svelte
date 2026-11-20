<script lang="ts">
  // v1.0, bloque 7: los links a Discord e itch.io con sus íconos (Créditos, final de la Capa 1, pop-up de comunidad).
  import { DISCORD, ITCH } from '../comunidad'
  import { txt } from '../strings'
  let { onclick }: { onclick?: () => void } = $props()
</script>

<div class="comunidad">
  <a class="link discord" href={DISCORD} target="_blank" rel="noopener" {onclick}>
    <!-- Un globo de chat con dos ojos: Discord, dibujado con trazos simples. -->
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5C7 5 9 4.6 9.5 4.6l.6 1.2h3.8l.6-1.2c.5 0 2.5.4 4.5 1.9 1.6 3 2.3 6.2 2 9.6-1.7 1.3-3.4 2-5 2.3l-1-1.6c.9-.3 1.7-.7 2.4-1.2-3.5 1.6-7.3 1.6-10.8 0 .7.5 1.5.9 2.4 1.2l-1 1.6c-1.6-.3-3.3-1-5-2.3-.3-3.4.4-6.6 2-9.6Z" /><circle cx="9" cy="12" r="1.6" class="ojo" /><circle cx="15" cy="12" r="1.6" class="ojo" /></svg>
    <span>{txt.comunidad.discord}</span>
  </a>
  <a class="link itch" href={ITCH} target="_blank" rel="noopener" {onclick}>
    <!-- Un puesto con toldo: itch.io. -->
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9 5 4.5h14L20.5 9c0 1.3-1 2.2-2.2 2.2S16 10.3 16 9c0 1.3-1 2.2-2 2.2S12 10.3 12 9c0 1.3-1 2.2-2 2.2S8 10.3 8 9c0 1.3-1 2.2-2.3 2.2S3.5 10.3 3.5 9ZM5 12.5V19.5h14v-7" /><path d="M10 19.5v-4h4v4" class="puerta" /></svg>
    <span>{txt.comunidad.itch}</span>
  </a>
</div>

<style>
  .comunidad { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center; }
  .link {
    display: inline-flex; align-items: center; gap: 0.5rem; min-height: 2.75rem; padding: 0 1rem; border: 1px solid var(--borde);
    background: var(--vidrio); color: var(--tinta); font-weight: 600; text-decoration: none; transition: border-color 0.15s;
  }
  .link:hover { border-color: currentColor; }
  .link svg { width: 1.375rem; height: 1.375rem; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linejoin: round; }
  .discord { color: #a5b0ff; }
  .itch { color: #ff7a7a; }
  .ojo { fill: currentColor; stroke: none; }
</style>
