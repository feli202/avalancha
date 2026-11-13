<script lang="ts">
  // Pantalla completa con fondo propio (Logros, Estadísticas): barra con pestañas, un extra a la derecha y la cruz.
  // La pila se aleja detrás (App.svelte); Esc cierra (Paneles.svelte).
  import type { Snippet } from 'svelte'
  import { txt } from '../strings'
  import { ajustes } from './ajustes.svelte'
  import { juego } from './juego.svelte'

  interface Pestana { id: string; texto: string; bloqueada?: string }
  let { titulo, pestanas, activa = $bindable(0), extra, children }: {
    titulo: string; pestanas: Pestana[]; activa?: number; extra?: Snippet; children: Snippet
  } = $props()

  const enfocar = (el: HTMLElement, si: boolean) => void (si && el.focus())
  // Flechas entre pestañas (patrón de ARIA), salteando las bloqueadas.
  function flechas(e: KeyboardEvent) {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    let i = activa
    do i = (i + d + pestanas.length) % pestanas.length
    while (pestanas[i].bloqueada && i !== activa)
    activa = i
    ;(e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-i="${i}"]`)?.focus()
  }
</script>

<div class="pantalla" class:quieto={ajustes.reducirDestellos} role="dialog" aria-modal="true" aria-label={titulo}>
  <header class="barra">
    <div class="pestanas" role="tablist" aria-label={titulo} tabindex="-1" onkeydown={flechas}>
      {#each pestanas as p, i (p.id)}
        <button
          role="tab" data-i={i} aria-selected={activa === i} aria-disabled={!!p.bloqueada} tabindex={activa === i ? 0 : -1}
          onclick={() => !p.bloqueada && (activa = i)} use:enfocar={activa === i}
        >
          {#if p.bloqueada}
            <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><rect x="1.5" y="6" width="9" height="7" rx="1" /><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" /></svg>
          {/if}
          <span>{p.texto}</span>
          {#if p.bloqueada}<small>{p.bloqueada}</small>{/if}
        </button>
      {/each}
    </div>
    {@render extra?.()}
    <button class="cerrar" aria-label={txt.logros.volver} onclick={() => (juego.panel = null)}>
      <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" /></svg>
    </button>
  </header>
  {#key activa}<div class="cuerpo">{@render children()}</div>{/key}
</div>

<style>
  /* Fondo propio: el azul noche de la pila, con el centro índigo arriba. Opaco: la pila ya no se ve. */
  .pantalla {
    position: fixed; inset: 0; z-index: 6; display: flex; flex-direction: column; overflow-y: auto; overscroll-behavior: contain;
    background:
      radial-gradient(ellipse 80% 55% at 50% -5%, rgb(42 40 96 / 0.55), transparent 70%),
      radial-gradient(ellipse 60% 40% at 50% 110%, rgb(255 181 71 / 0.06), transparent 70%),
      var(--fondo);
    animation: entrar 0.55s 0.12s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
    scrollbar-width: thin;
  }
  @keyframes entrar { from { opacity: 0; transform: scale(1.03); } }
  .quieto { animation-name: fundido; }
  .cuerpo { animation: fundido 0.3s ease-out; }
  .quieto .cuerpo { animation: none; }
  @keyframes fundido { from { opacity: 0; } }

  .barra {
    position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 1.5rem;
    padding: 1.25rem 2rem; background: linear-gradient(var(--fondo) 70%, transparent);
  }
  /* Pestañas como las de la tienda: texto, la elegida con una línea de 1 px debajo. */
  .pestanas { display: flex; gap: 1.5rem; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; }
  .pestanas button {
    display: flex; align-items: center; gap: 0.5rem; flex: none; min-height: 2.75rem; padding: 0;
    border: 0; border-bottom: 1px solid transparent; background: none; color: var(--apagado);
    font: inherit; font-size: 1rem; font-weight: 600; cursor: pointer; transition: color 0.15s;
  }
  .pestanas button:hover { color: var(--tenue); }
  .pestanas button[aria-selected='true'] { color: var(--tinta); border-bottom-color: var(--tinta); }
  .pestanas button[aria-disabled='true'] { color: var(--apagado); opacity: 0.6; cursor: not-allowed; }
  .pestanas small { font-size: 0.75rem; font-weight: 400; }
  .pestanas svg, .cerrar svg { fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; }

  .cerrar {
    display: grid; place-items: center; flex: none; width: 2.75rem; height: 2.75rem; margin-left: auto; padding: 0; border: 0;
    background: none; color: var(--tenue); cursor: pointer;
  }
  .cerrar:hover { color: var(--tinta); }

  @media (max-width: 767px) {
    .barra { flex-wrap: wrap; gap: 0.75rem 1rem; padding: 0.75rem 1rem; }
    .pestanas { order: 3; flex-basis: 100%; flex-wrap: wrap; }
  }
</style>
