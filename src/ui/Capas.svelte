<script lang="ts">
  // SPEC_CAPA1 §11: la barra lateral de capas (Arena / Cristalización) y la pantalla de Cristalización con su segunda barra.
  // Aparecen con el primer Infinito. Las pantallas de cada sistema llegan con su hito (C2–C10): por ahora, solo el nombre.
  import { txt } from '../strings'
  import { ajustes } from './ajustes.svelte'
  import { formato } from './formato'
  import { hayCartel, juego } from './juego.svelte'

  const PANTALLAS = ['red', 'estratos', 'defectos', 'escarcha', 'relicario']
  let pantalla = $state(PANTALLAS[0])
  const s = $derived(juego.s)
  // La presentación de tres líneas, hasta que se toca Seguir (queda en el guardado).
  const visto = () => (juego.vistos = { ...juego.vistos, cristales: true })
</script>

{#if s.infinitos > 0 && !juego.titulo}
  <div class="capa1" class:quieto={ajustes.reducirDestellos} inert={hayCartel()}>
    {#if juego.capa === 'cristalizacion'}
      <main class="cristalizacion" class:llega={!juego.vistos.cristales}>
        <dl class="contadores num">
          <div><dt>{txt.cristal.cristales}</dt><dd class="cristales">{formato(s.cristales)}</dd></div>
          <div><dt>{txt.cristal.totales}</dt><dd>{formato(s.cristalesTotales)}</dd></div>
          <div><dt>{txt.energia} · {txt.capas.arena}</dt><dd>{formato(s.energia)}</dd></div>
        </dl>
        {#if juego.vistos.cristales}
          <nav class="sistemas" aria-label={txt.cristal.sistemas}>
            {#each PANTALLAS as p}
              <button aria-current={pantalla === p ? 'page' : undefined} onclick={() => (pantalla = p)}>{txt.cristal.pantallas[p]}</button>
            {/each}
          </nav>
          {#key pantalla}
            <section class="pantalla" aria-labelledby="c1-titulo">
              <svg viewBox="-100 -100 200 200" aria-hidden="true"><path d="M0-90 78-45V45L0 90-78 45V-45ZM0-90V90M-78-45 78 45M-78 45 78-45" /></svg>
              <h1 id="c1-titulo">{txt.cristal.pantallas[pantalla]}</h1>
              <p>{txt.cristal.vacia}</p>
            </section>
          {/key}
        {:else}
          <section class="pantalla intro">
            {#each txt.cristal.intro as linea, i}<p style:--i={i}>{linea}</p>{/each}
            <button style:--i={txt.cristal.intro.length} onclick={visto}>{txt.cristal.seguir}</button>
          </section>
        {/if}
      </main>
    {/if}

    <nav class="capas" aria-label={txt.capas.barra}>
      <button aria-current={juego.capa === 'arena' ? 'page' : undefined} aria-label={txt.capas.arena} title={txt.capas.arena} onclick={() => (juego.capa = 'arena')}>
        <svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden="true"><circle r="7.5" /><circle r="3" /></svg>
      </button>
      <button aria-current={juego.capa === 'cristalizacion' ? 'page' : undefined} aria-label={txt.capas.cristalizacion} title={txt.capas.cristalizacion} onclick={() => (juego.capa = 'cristalizacion')}>
        <svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden="true"><path d="M0-8.5 7.4-4.25V4.25L0 8.5-7.4 4.25V-4.25ZM0-8.5V0M7.4 4.25 0 0-7.4 4.25" /></svg>
      </button>
    </nav>
  </div>
{/if}

<style>
  /* Estética helada (SPEC_CAPA1 §11): azul noche casi negro, blancos fríos, cian tenue; facetas de 60° con aristas finas.
     El hielo es textura (líneas de grieta), no desenfoque. */
  .capas {
    position: fixed; left: 0; top: 50%; translate: 0 -50%; z-index: 5; display: grid; gap: 0.25rem;
    padding: 0.25rem 0; border: 1px solid var(--borde); border-left: 0; background: var(--noche);
    clip-path: polygon(0 0, calc(100% - 0.5rem) 0, 100% 0.866rem, 100% calc(100% - 0.866rem), calc(100% - 0.5rem) 100%, 0 100%); /* esquinas a 60° */
  }
  .capas button {
    display: grid; place-items: center; width: 2.75rem; height: 2.75rem; padding: 0; border: 0; border-left: 2px solid transparent;
    background: none; color: var(--apagado); cursor: pointer; transition: color 0.15s;
  }
  .capas button:hover, .capas button:focus-visible { color: var(--tinta); }
  .capas [aria-current] { color: var(--hielo); border-left-color: var(--hielo); }
  svg { fill: none; stroke: currentColor; stroke-width: 1.25; stroke-linejoin: round; }

  .cristalizacion {
    position: fixed; inset: 0; z-index: 4; display: grid; grid-template-rows: auto auto 1fr; overflow-y: auto;
    padding: 2rem 2rem 2rem 5rem; color: var(--escarcha);
    background:
      linear-gradient(60deg, transparent calc(50% - 0.5px), rgb(159 227 245 / 0.05) 50%, transparent calc(50% + 0.5px)) 0 0 / 34rem 58.9rem,
      linear-gradient(-60deg, transparent calc(50% - 0.5px), rgb(159 227 245 / 0.035) 50%, transparent calc(50% + 0.5px)) 9rem 0 / 46rem 79.7rem,
      radial-gradient(120% 80% at 50% 0%, #0a1322, var(--noche) 70%);
    animation: entrar 0.3s ease-out;
  }
  /* Primera vez: la cámara cae desde la Arena. */
  .cristalizacion.llega { animation: caer 1.1s cubic-bezier(0.2, 0.8, 0.2, 1); }
  @keyframes entrar { from { opacity: 0; } }
  @keyframes caer { from { opacity: 0; transform: translateY(35vh); } }
  .quieto .cristalizacion.llega { animation: entrar 0.6s ease-out; }

  .contadores { display: flex; flex-wrap: wrap; gap: 0.5rem 3rem; margin: 0; }
  dt { font-size: 0.875rem; color: var(--tenue); }
  dd { margin: 0.125rem 0 0; font-size: 1.5rem; font-weight: 600; line-height: 1; letter-spacing: -0.02em; }
  .cristales { font-size: clamp(2.5rem, 4vw, 3.75rem); letter-spacing: -0.03em; color: var(--hielo); text-shadow: 0 0 1.5rem rgb(159 227 245 / 0.35); }

  .sistemas { display: flex; flex-wrap: wrap; gap: 0 1.75rem; margin-top: 1.75rem; border-bottom: 1px solid rgb(159 227 245 / 0.14); }
  .sistemas button {
    min-height: 2.75rem; padding: 0; border: 0; border-bottom: 1px solid transparent; margin-bottom: -1px; background: none;
    color: var(--apagado); font: inherit; font-size: 1rem; cursor: pointer; transition: color 0.15s;
  }
  .sistemas button:hover, .sistemas button:focus-visible { color: var(--escarcha); }
  .sistemas [aria-current] { color: var(--escarcha); font-weight: 600; border-bottom-color: var(--hielo); }

  .pantalla { position: relative; display: grid; place-content: center; justify-items: center; gap: 0.5rem; min-height: 16rem; text-align: center; animation: entrar 0.3s ease-out; }
  .pantalla svg { position: absolute; left: 50%; top: 50%; translate: -50% -50%; width: min(24rem, 70vmin); color: rgb(159 227 245 / 0.1); stroke-width: 0.5; }
  h1 { margin: 0; font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 300; letter-spacing: -0.02em; }
  p { margin: 0; color: var(--tenue); }
  .intro { grid-row: 2 / -1; gap: 0.75rem; }
  .intro p { font-size: 1.125rem; color: var(--escarcha); text-wrap: balance; }
  .intro p, .intro button { animation: entrar 0.8s calc(0.9s + var(--i) * 0.7s) ease-out backwards; }
  .quieto .intro :is(p, button) { animation-delay: 0s; }
  .intro button {
    margin-top: 1.25rem; min-height: 2.75rem; padding: 0 0.25rem; border: 0; border-bottom: 1px solid var(--hielo); background: none;
    color: var(--hielo); font: inherit; font-size: 1.0625rem; font-weight: 600; cursor: pointer;
  }

  /* Vertical (móvil, tablet): la barra de capas va a la esquina de arriba de la región de la pila, que la pila redonda deja libre. */
  @media (orientation: portrait) and (max-width: 1100px) {
    .capas { top: 7rem; translate: none; }
    .cristalizacion { padding: 1rem 1rem 1rem 3.75rem; }
    .contadores { gap: 0.5rem 1.5rem; }
    .sistemas { gap: 0 1.25rem; }
  }
</style>
