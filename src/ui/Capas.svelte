<script lang="ts">
  // SPEC_CAPA1 §11: la barra lateral de capas (Arena / Cristalización) y la pantalla de Cristalización con su segunda barra.
  // Aparecen con el primer Infinito. Las pantallas de cada sistema llegan con su hito (C2–C10): por ahora, solo el nombre.
  import { txt } from '../strings'
  import { ajustes } from './ajustes.svelte'
  import { formato } from './formato'
  import { hayCartel, juego } from './juego.svelte'
  import Escarcha from './Escarcha.svelte'
  import Estratos from './Estratos.svelte'
  import './hielo.css'
  import Red from './Red.svelte'
  import Relicario from './Relicario.svelte'

  const PANTALLAS = ['red', 'estratos', 'defectos', 'escarcha', 'relicario']
  // Un ícono por sistema, dibujado con la geometría del juego: la Red un rombo de celdas, los Estratos losas apiladas,
  // los Defectos una red con una dislocación, la Escarcha un copo de seis brazos, el Relicario una gema tallada.
  const ICONOS: Record<string, string> = {
    red: 'M0-7 7 0 0 7-7 0ZM-3.5-3.5 3.5 3.5M3.5-3.5-3.5 3.5',
    estratos: 'M-7-6.5h14l-1.5 3h-11ZM-6-1h12l-1.5 3h-9ZM-5 4.5h10l-1.5 3h-7Z',
    defectos: 'M-7-3.5h14M-7 3.5h14M-3.5-7V7M3.5-7V0M1.5 0V7', // una dislocación: la línea de la red que se corre
    escarcha: 'M0-7V7M-6-3.5 6 3.5M-6 3.5 6-3.5M0-7-1.5-5.5M0-7 1.5-5.5M0 7-1.5 5.5M0 7 1.5 5.5',
    relicario: 'M-6-2.5-3.5-6h7L6-2.5 0 7ZM-6-2.5H6M-3.5-6-1.5-2.5 0 7M3.5-6 1.5-2.5 0 7',
  }
  const s = $derived(juego.s)
  // La presentación de tres líneas, hasta que se toca Seguir (queda en el guardado).
  const visto = () => {
    juego.vistos = { ...juego.vistos, cristales: true }
    if (hayOferta) juego.pantalla = 'relicario' // la primera oferta, al llegar
  }
  const hayOferta = $derived(s.relicario.pendiente > 0)
</script>

<!-- Un cristal de hielo: prisma hexagonal con caras de distinta luz y un destello frío. -->
{#snippet cristal(clase: string)}
  <svg class="gema-icono {clase}" viewBox="-12 -12 24 24" aria-hidden="true">
    <path d="M0-11 5.5-6V6L0 11-5.5 6V-6Z" fill="#0f3a4d" />
    <path d="M0-11-5.5-6V6L0 11Z" fill="var(--hielo)" opacity="0.35" />
    <path d="M0-11 5.5-6V6L0 11Z" fill="var(--hielo)" opacity="0.7" />
    <path d="M0-11 5.5-6 0-3.5-5.5-6Z" fill="var(--escarcha)" opacity="0.85" />
    <path d="M0-3.5V11M0-11-5.5-6V6L0 11 5.5 6V-6Z" fill="none" stroke="var(--escarcha)" stroke-width="0.6" stroke-linejoin="round" opacity="0.8" />
    <path class="destello" d="M7.5-9.5v4M5.5-7.5h4" stroke="#fff" stroke-width="0.8" stroke-linecap="round" />
  </svg>
{/snippet}

{#if s.infinitos > 0 && !juego.titulo}
  <div class="capa1" class:quieto={ajustes.reducirDestellos} class:calma={ajustes.calma} inert={hayCartel()}>
    {#if juego.capa === 'cristalizacion'}
      <main class="cristalizacion" class:llega={!juego.vistos.cristales}>
        <Escarcha />
        <dl class="contadores num">
          <div class="principal">{@render cristal('emblema')}<div><dt>{txt.cristal.cristales}</dt><dd class="cristales">{formato(s.cristales)}</dd></div></div>
          <div><dt>{txt.cristal.totales}</dt><dd>{formato(s.cristalesTotales)}</dd></div>
          <div><dt>{txt.energia} · {txt.capas.arena}</dt><dd>{formato(s.energia)}</dd></div>
        </dl>
        {#if juego.vistos.cristales}
          <nav class="sistemas pestanas-hielo" aria-label={txt.cristal.sistemas}>
            {#each PANTALLAS as p}
              <button aria-current={juego.pantalla === p ? 'page' : undefined} onclick={() => (juego.pantalla = p)}><svg viewBox="-8 -8 16 16" aria-hidden="true"><path d={ICONOS[p]} /></svg>{txt.cristal.pantallas[p]}{#if p === 'relicario' && hayOferta}<i class="punto" title={txt.cristal.relicario.hay}></i>{/if}</button>
            {/each}
          </nav>
          {#key juego.pantalla}
            {#if juego.pantalla === 'red'}<Red />{:else if juego.pantalla === 'relicario'}<Relicario />{:else if juego.pantalla === 'estratos'}<Estratos />{:else}
            <section class="pantalla" aria-labelledby="c1-titulo">
              <svg viewBox="-100 -100 200 200" aria-hidden="true"><path d="M0-90 78-45V45L0 90-78 45V-45ZM0-90V90M-78-45 78 45M-78 45 78-45" /></svg>
              <h1 id="c1-titulo">{txt.cristal.pantallas[juego.pantalla]}</h1>
              <p>{txt.cristal.vacia}</p>
            </section>
            {/if}
          {/key}
        {:else}
          <section class="pantalla intro">
            {#each txt.cristal.intro as linea, i}<p style:--i={i}>{linea}</p>{/each}
            <button class="gema" style:--i={txt.cristal.intro.length} onclick={visto}>{txt.cristal.seguir}</button>
          </section>
        {/if}
      </main>
    {/if}

    <nav class="capas" aria-label={txt.capas.barra}>
      <button class="arena" aria-current={juego.capa === 'arena' ? 'page' : undefined} onclick={() => (juego.capa = 'arena')}>
        <svg viewBox="-12 -12 24 24" aria-hidden="true">
          <!-- Una mini pila de arena en píxeles, como el logo: más clara arriba, dos granos cayendo. -->
          {#each [[-1.3, -2.8, 1], [1.7, -2.8, 0.7], [-2.8, 0.2, 0.9], [0.2, 0.2, 1], [3.2, 0.2, 0.75], [-5.8, 3.2, 0.7], [-2.8, 3.2, 0.85], [0.2, 3.2, 0.65], [3.2, 3.2, 0.9], [6.2, 3.2, 0.6], [-8.8, 6.2, 0.55], [-5.8, 6.2, 0.75], [-2.8, 6.2, 0.6], [0.2, 6.2, 0.8], [3.2, 6.2, 0.55], [6.2, 6.2, 0.7], [9.2, 6.2, 0.5]] as [x, y, o]}
            <rect {x} {y} width="2.6" height="2.6" fill="var(--ambar)" opacity={o} />
          {/each}
          <rect class="grano" x="-0.1" y="-8.6" width="1.8" height="1.8" fill="var(--ambar)" />
          <rect class="grano" x="0.9" y="-11.6" width="1.4" height="1.4" fill="var(--ambar)" opacity="0.6" />
        </svg>
        <span>{txt.capas.arena}</span>
      </button>
      <button class="cristal" aria-current={juego.capa === 'cristalizacion' ? 'page' : undefined} onclick={() => (juego.capa = 'cristalizacion')}>
        {@render cristal('')}
        <span>{txt.capas.cristalizacion}</span>
        {#if hayOferta}<i class="punto" title={txt.cristal.relicario.hay}></i>{/if}
      </button>
    </nav>
  </div>
{/if}

<style>
  /* Estética helada (SPEC_CAPA1 §11): azul noche casi negro, blancos fríos, cian tenue; facetas de 60° con aristas finas.
     El hielo es textura (líneas de grieta), no desenfoque. */
  /* Barra de capas: es de todo el juego (va a tener todas las capas), así que es neutra, con la sobriedad de la Arena:
     fondo de la página y líneas de 1 px. La personalidad está en cada ícono: el de cada capa con su estética y su color;
     la activa se enciende con ese color y una marca a la izquierda. */
  .capas {
    position: fixed; left: 0; top: 50%; translate: 0 -50%; z-index: 5; display: grid; gap: 0.25rem; padding: 0.5rem 0;
    border: 1px solid var(--borde); border-left: 0; background: rgb(7 8 15 / 0.92);
  }
  .capas button {
    --c: var(--ambar);
    position: relative; display: grid; justify-items: center; align-content: center; gap: 0.3rem; width: 5rem; min-height: 4.5rem; padding: 0.5rem 0.25rem;
    border: 0; background: none; color: var(--apagado); font: inherit; font-size: 0.6875rem; line-height: 1.1; text-align: center; cursor: pointer;
    transition: color 0.3s;
  }
  .capas .cristal { --c: var(--hielo); }
  .capas svg { width: 2.25rem; height: 2.25rem; overflow: visible; filter: saturate(0.55) brightness(0.8); opacity: 0.75; transition: filter 0.3s, opacity 0.3s, scale 0.3s; }
  .capas button:hover svg, .capas button:focus-visible svg { filter: saturate(0.7); opacity: 1; }
  .capas button:hover, .capas button:focus-visible { color: var(--tenue); }
  .capas [aria-current] {
    color: var(--c); font-weight: 600;
    background:
      linear-gradient(var(--c), var(--c)) left / 2px 100% no-repeat,
      radial-gradient(80% 70% at 30% 45%, color-mix(in srgb, var(--c) 22%, transparent), transparent 75%);
  }
  .capas [aria-current] svg { filter: drop-shadow(0 0 0.45rem color-mix(in srgb, var(--c) 70%, transparent)); opacity: 1; scale: 1.08; }
  .capas .grano { animation: grano 3.2s ease-in infinite; }
  .capas .grano + .grano { animation-delay: 1.4s; }
  .capas .destello { opacity: 0; }
  .capas [aria-current] .destello { animation: destello 5s ease-in-out infinite; }
  @keyframes grano { from { translate: 0 -2px; opacity: 0; } 30% { opacity: 1; } 80%, to { translate: 0 6px; opacity: 0; } }
  @keyframes destello { 0%, 70%, 100% { opacity: 0; } 82% { opacity: 0.9; } }
  /* Reducir movimiento: nada se mueve. Reducir destellos: el destello del cristal queda fijo (no titila). */
  .quieto .capas .grano { animation: none; }
  :is(.quieto, .calma) .capas [aria-current] .destello { animation: none; opacity: 0.6; }
  .pantalla svg { fill: none; stroke: currentColor; stroke-width: 1.25; stroke-linejoin: round; }
  /* Hay una reliquia para elegir. */
  .punto { display: inline-block; width: 0.4rem; height: 0.4rem; margin-left: 0.35rem; vertical-align: super; background: var(--ambar); rotate: 45deg; }
  .capas .punto { position: absolute; right: 0.9rem; top: 0.55rem; margin: 0; }

  .cristalizacion {
    position: fixed; inset: 0; z-index: 4; display: grid; grid-template-rows: auto auto 1fr; overflow-y: auto;
    padding: 2rem 2rem 2rem 7rem; color: var(--escarcha);
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

  .cristalizacion > :global(:not(.escarcha)) { position: relative; }
  .contadores { display: flex; flex-wrap: wrap; align-items: end; gap: 0.5rem 3rem; margin: 0; }
  .principal { display: flex; align-items: center; gap: 0.75rem; }
  .emblema { width: 3.25rem; height: 3.25rem; flex: none; overflow: visible; filter: drop-shadow(0 0 0.8rem rgb(159 227 245 / 0.45)); }
  .emblema .destello { animation: destello 6s ease-in-out infinite; }
  :is(.quieto, .calma) .emblema .destello { animation: none; opacity: 0.6; }
  dt { font-size: 0.875rem; color: var(--tenue); }
  dd { margin: 0.125rem 0 0; font-size: 1.5rem; font-weight: 600; line-height: 1; letter-spacing: -0.02em; }
  .cristales { font-size: clamp(2.5rem, 4vw, 3.75rem); letter-spacing: -0.03em; color: var(--hielo); text-shadow: 0 0 1.5rem rgb(159 227 245 / 0.35); }

  .sistemas { margin-top: 1.75rem; }

  .pantalla { position: relative; display: grid; place-content: center; justify-items: center; gap: 0.5rem; min-height: 16rem; text-align: center; animation: entrar 0.3s ease-out; }
  .pantalla svg { position: absolute; left: 50%; top: 50%; translate: -50% -50%; width: min(24rem, 70vmin); color: rgb(159 227 245 / 0.1); stroke-width: 0.5; }
  h1 { margin: 0; font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 300; letter-spacing: -0.02em; }
  p { margin: 0; color: var(--tenue); }
  .intro { grid-row: 2 / -1; gap: 0.75rem; }
  .intro p { font-size: 1.125rem; color: var(--escarcha); text-wrap: balance; }
  .intro p, .intro button { animation: entrar 0.8s calc(0.9s + var(--i) * 0.7s) ease-out backwards; }
  .quieto .intro :is(p, button) { animation-delay: 0s; }
  .intro button { margin-top: 1.25rem; min-width: 10rem; min-height: 2.75rem; font-size: 1.0625rem; font-weight: 600; }

  /* Vertical (móvil, tablet): la barra de capas va a la esquina de arriba de la región de la pila, que la pila redonda deja libre. */
  @media (orientation: portrait) and (max-width: 1100px) {
    .capas { top: 7rem; translate: none; }
    .capas button { width: 4rem; min-height: 4rem; font-size: 0.625rem; hyphens: manual; }
    .sistemas { gap: 0 1.25rem; }
    .capas svg { width: 1.875rem; height: 1.875rem; }
    .cristalizacion { padding: 1rem 1rem 1rem 5rem; }
    .emblema { width: 2.5rem; height: 2.5rem; }
    .contadores { gap: 0.5rem 1.5rem; }
  }
</style>
