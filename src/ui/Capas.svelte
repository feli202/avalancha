<script lang="ts">
  // SPEC_CAPA1 §11: la barra lateral de capas (Arena / Cristalización) y la pantalla de Cristalización con su segunda barra.
  // Aparecen con el primer Infinito. Las pantallas de cada sistema llegan con su hito (C2–C10): por ahora, solo el nombre.
  import { txt } from '../strings'
  import { ajustes, quieto } from './ajustes.svelte'
  import { formato } from './formato'
  import { hayCartel, juego } from './juego.svelte'
  import Nevada from './Nevada.svelte'
  import Escarcha from './Escarcha.svelte'
  import Defectos from './Defectos.svelte'
  import Estratos from './Estratos.svelte'
  import './hielo.css'
  import Red from './Red.svelte'
  import Relicario from './Relicario.svelte'
  import Automatizacion from './Automatizacion.svelte'
  import { GRIETAS } from './grietas'
  import { filasResumen, imagenResumen } from './resumen'
  import { entregar } from './foto.svelte'
  import Comunidad from './Comunidad.svelte'

  const PANTALLAS = ['relicario', 'red', 'estratos', 'defectos', 'escarcha']
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
  // v1.0, bloque 6: la imagen del resumen, armada al entrar a la pantalla de la Capa 2.
  let resumen = $state<{ blob: Blob; url: string } | null>(null)
  $effect(() => {
    if (juego.capa !== 'capa2' || resumen) return
    imagenResumen().then((b) => b && (resumen = { blob: b, url: URL.createObjectURL(b) })).catch((e) => console.warn(e))
  })
  const descargar = () => resumen && entregar(new File([resumen.blob], txt.resumen.archivo, { type: 'image/png' }))
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
  <div class="capa1" class:quieto={quieto()} class:calma={ajustes.calma} inert={hayCartel()}>
    {#if juego.capa === 'cristalizacion'}
      <main class="cristalizacion" class:llega={!juego.vistos.cristales} class:fija={juego.vistos.cristales}>
        <Nevada />
        <dl class="contadores num">
          <div class="principal" data-guia="c1_cristales">{@render cristal('emblema')}<div><dt>{txt.cristal.cristales}</dt><dd class="cristales">{formato(s.cristales)}</dd></div></div>
          <div><dt>{txt.cristal.totales}</dt><dd>{formato(s.cristalesTotales)}</dd></div>
          <div><dt>{txt.energia} · {txt.capas.arena}</dt><dd>{formato(s.energia)}</dd></div>
          {#if s.escarcha.abierta}<div class="esquirlas"><dt>{txt.cristal.esquirlas}</dt><dd>{formato(s.escarcha.esquirlas)}</dd></div>{/if}
        </dl>
        {#if juego.vistos.cristales}
          <nav class="sistemas pestanas-hielo" aria-label={txt.cristal.sistemas}>
            {#each PANTALLAS as p}
              <button data-guia="c1_{p}" aria-current={juego.pantalla === p ? 'page' : undefined} onclick={() => (juego.pantalla = p)}><svg viewBox="-8 -8 16 16" aria-hidden="true"><path d={ICONOS[p]} /></svg><span class="nombre">{txt.cristal.pantallas[p]}</span>{#if p === 'relicario' && hayOferta}<i class="punto" title={txt.cristal.relicario.hay}></i>{/if}</button>
            {/each}
          </nav>
          {#key juego.pantalla}
            {#if juego.pantalla === 'red'}<Red />{:else if juego.pantalla === 'relicario'}<Relicario />{:else if juego.pantalla === 'estratos'}<Estratos />{:else if juego.pantalla === 'defectos'}<Defectos />{:else if juego.pantalla === 'escarcha'}<Escarcha />{:else}
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
    {:else if juego.capa === 'capa2'}
      <!-- C13: la Capa 2 todavía no existe. Solo se sabe que es de fuego: calor que sube por las grietas del hielo. -->
      <main class="proxima">
        <svg class="grietas" viewBox="-100 -100 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {#each GRIETAS as d}<path {d} />{/each}
        </svg>
        <div class="chispas" aria-hidden="true">
          {#each { length: 16 } as _, i}<i style:left="{8 + ((i * 53) % 84)}%" style:--d="{-((i * 1.37) % 11)}s" style:--v="{9 + ((i * 0.83) % 5)}s" style:--x="{((i * 29) % 40) - 20}px"></i>{/each}
        </div>
        <!-- C14: el cierre de la Capa 1 en una placa de su mismo hielo, con la brasa asomando desde abajo. -->
        <div class="placa cierre">
          <h1>{txt.capas.capa2}</h1>
          <p class="lema">{txt.capas.finCapa1}</p>
          <p>{txt.capas.proximamente}</p>
          <!-- v1.0, bloque 6: el resumen de la partida, descargable como imagen para compartir. -->
          <div class="resumen">
            {#if resumen}<img src={resumen.url} alt={txt.resumen.alt} />{/if}
            <dl class="num">{#each filasResumen(s, juego.record) as [rot, val]}<div><dt>{rot}</dt><dd>{val}</dd></div>{/each}</dl>
          </div>
          <button class="gema" disabled={!resumen} onclick={descargar}>{txt.resumen.descargar}</button>
          <Comunidad />
        </div>
      </main>
    {:else if juego.capa === 'automatizacion'}
      <main class="automat">
        <Automatizacion />
      </main>
    {/if}

    <nav class="capas" aria-label={txt.capas.barra}>
      <button class="arena" aria-current={juego.capa === 'arena' ? 'page' : undefined} onclick={() => (juego.capa = 'arena')}>
        <span class="icono"><svg viewBox="-12 -12 24 24" aria-hidden="true">
          <!-- Una mini pila de arena en píxeles, como el logo: más clara arriba, dos granos cayendo. -->
          {#each [[-1.3, -2.8, 1], [1.7, -2.8, 0.7], [-2.8, 0.2, 0.9], [0.2, 0.2, 1], [3.2, 0.2, 0.75], [-5.8, 3.2, 0.7], [-2.8, 3.2, 0.85], [0.2, 3.2, 0.65], [3.2, 3.2, 0.9], [6.2, 3.2, 0.6], [-8.8, 6.2, 0.55], [-5.8, 6.2, 0.75], [-2.8, 6.2, 0.6], [0.2, 6.2, 0.8], [3.2, 6.2, 0.55], [6.2, 6.2, 0.7], [9.2, 6.2, 0.5]] as [x, y, o]}
            <rect {x} {y} width="2.6" height="2.6" fill="var(--ambar)" opacity={o} />
          {/each}
        </svg><!-- Los dos granos que caen, afuera del SVG (que tiene filter): animados con transform y opacidad se componen solos;
          adentro, cada cuadro repintaba y refiltraba el ícono. Posición y tamaño en unidades del viewBox (--u). -->
          <span class="granos" aria-hidden="true"><i class="grano" style:--x="11.9" style:--y="3.4" style:--l="1.8"></i><i class="grano tenue" style:--x="12.9" style:--y="0.4" style:--l="1.4"></i></span></span>
        <span>{txt.capas.arena}</span>
      </button>
      <button class="cristal" aria-current={juego.capa === 'cristalizacion' ? 'page' : undefined} onclick={() => (juego.capa = 'cristalizacion')}>
        {@render cristal('')}
        <span>{txt.capas.cristalizacion}</span>
        {#if hayOferta}<i class="punto" title={txt.cristal.relicario.hay}></i>{/if}
      </button>
      {#if juego.vistos.capa2}
        <!-- C13: la Capa 2 como silueta oscura, con un brillo de brasa en sus grietas que late lento. -->
        <button class="capa2" aria-current={juego.capa === 'capa2' ? 'page' : undefined} onclick={() => (juego.capa = 'capa2')}>
          <svg viewBox="-12 -12 24 24" aria-hidden="true">
            <path d="M-2-11 5-9.5 10-3 9.5 5 3 10.5-5 10-10 4-9.5-4.5Z" fill="#141016" stroke="#2a2329" stroke-width="0.8" stroke-linejoin="round" />
            <path class="brasa" d="M-1.5-3.5 1 0-2 3.5M1 0 5.5 1.5M-2 3.5 0.5 8M-1.5-3.5-5.5-5" fill="none" stroke="#ff7a2e" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>{txt.capas.capa2}</span>
        </button>
      {/if}
      <!-- Bloque 10: no es una capa sino de todas; va abajo, separada por una línea. Ícono: dos engranajes de cristal. -->
      <button class="auto" data-guia="c1_automat" aria-current={juego.capa === 'automatizacion' ? 'page' : undefined} onclick={() => (juego.capa = 'automatizacion')}>
        <svg viewBox="-12 -12 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round">
          <path d="M-3.5-10.5h3l.6 2.4 2 1.2 2.4-.7 1.5 2.6-1.8 1.7v2.3l1.8 1.7-1.5 2.6-2.4-.7-2 1.2-.6 2.4h-3l-.6-2.4-2-1.2-2.4.7-1.5-2.6 1.8-1.7v-2.3l-1.8-1.7 1.5-2.6 2.4.7 2-1.2Z" />
          <circle cx="-2" cy="-3" r="2.6" />
          <path d="M6 4.5l1.6 1.6 2.2-.2.3 2.2 1.6 1.6-1.6 1.6-.3 2.2-2.2-.2L6 15l-1.6-1.6-2.2.2-.3-2.2-1.6-1.6 1.6-1.6.3-2.2 2.2.2Z" transform="scale(.75) translate(4 -2)" />
        </svg>
        <span>{txt.capas.automatizacion}</span>
      </button>
    </nav>
  </div>
{/if}

<style>
  /* Estética helada (SPEC_CAPA1 §11): azul noche casi negro, blancos fríos, cian tenue; facetas de 60° con aristas finas.
     El hielo es textura (líneas de grieta), no desenfoque. */
  /* Barra de capas: es de todo el juego (va a tener todas las capas), así que es neutra y no es una caja: queda sobre el
     mismo fondo de la pantalla, con apenas una sombra que sale del borde y se desvanece arriba, abajo y a la derecha.
     La personalidad está en cada ícono: el de cada capa con su estética y su color; la activa se enciende con ese color,
     un resplandor y una marca corta a la izquierda. */
  .capas {
    position: fixed; left: 0; top: 50%; translate: 0 -50%; z-index: 5; display: grid; gap: 0.25rem; padding: 1.5rem 0;
    background: linear-gradient(to right, rgb(4 5 10 / 0.6), transparent);
    mask: linear-gradient(transparent, #000 1.5rem, #000 calc(100% - 1.5rem), transparent);
  }
  .capas button {
    --c: var(--ambar);
    position: relative; display: grid; justify-items: center; align-content: center; gap: 0.3rem; width: 5rem; min-height: 4.5rem; padding: 0.5rem 0.25rem;
    border: 0; background: none; color: var(--apagado); font: inherit; font-size: 0.6875rem; line-height: 1.1; text-align: center; cursor: pointer;
    transition: color 0.3s;
  }
  .capas .cristal { --c: var(--hielo); }
  .capas .auto { --c: var(--tinta); }
  .capas .capa2 { --c: #ff8a3d; }
  /* La silueta no se desatura como las otras: ya es oscura; lo que se ve es la brasa. */
  .capas .capa2 svg { filter: none; opacity: 1; }
  .capas .brasa { filter: drop-shadow(0 0 1.5px #ff5a1f); animation: brasa 4.5s ease-in-out infinite alternate; }
  @keyframes brasa { from { opacity: 0.35; } to { opacity: 0.95; } }
  .quieto .capas .brasa { animation: none; opacity: 0.7; }
  .capas .auto { margin-top: 0.5rem; }
  .capas .auto::before { content: ''; position: absolute; top: -0.375rem; left: 50%; width: 1.5rem; height: 1px; translate: -50%; background: var(--borde); }
  /* Automatización: de todo el juego, neutra como esta barra (fondo de la página, líneas de 1 px); sin escarcha. */
  .automat { position: fixed; inset: 0; z-index: 4; display: grid; padding: 2rem 2rem 2rem 7rem; overflow: hidden; color: var(--tinta); background: var(--fondo); animation: entrar 0.3s ease-out; }
  .capas svg { width: 2.25rem; height: 2.25rem; overflow: visible; filter: saturate(0.55) brightness(0.8); opacity: 0.75; transition: filter 0.3s, opacity 0.3s, scale 0.3s; }
  .capas button:hover svg, .capas button:focus-visible svg { filter: saturate(0.7); opacity: 1; }
  .capas button:hover, .capas button:focus-visible { color: var(--tenue); }
  .capas [aria-current] {
    color: var(--c); font-weight: 600;
    background: radial-gradient(60% 55% at 50% 38%, color-mix(in srgb, var(--c) 18%, transparent), transparent 75%);
  }
  .capas [aria-current]::after {
    content: ''; position: absolute; left: 0; top: 50%; width: 2px; height: 1.75rem; translate: 0 -50%; border-radius: 0 2px 2px 0;
    background: var(--c); box-shadow: 0 0 0.5rem var(--c);
  }
  .capas [aria-current] svg { filter: drop-shadow(0 0 0.45rem color-mix(in srgb, var(--c) 70%, transparent)); opacity: 1; scale: 1.08; }
  /* 1em = una unidad del viewBox del ícono (24 por lado): los fotogramas quedan sin var() y se componen solos. */
  .capas .icono { position: relative; display: block; width: 2.25rem; height: 2.25rem; font-size: calc(2.25rem / 24); }
  .capas .granos { position: absolute; inset: 0; opacity: 0.6; transition: opacity 0.3s; }
  .capas [aria-current] .granos, .capas button:hover .granos { opacity: 1; }
  .capas .grano {
    position: absolute; left: calc(var(--x) * 1em); top: calc(var(--y) * 1em); width: calc(var(--l) * 1em); height: calc(var(--l) * 1em);
    background: var(--ambar); animation: grano 3.2s ease-in infinite;
  }
  .capas .grano.tenue { background: color-mix(in srgb, var(--ambar) 60%, transparent); }
  .capas .grano + .grano { animation-delay: 1.4s; }
  .capas .destello { opacity: 0; }
  .capas [aria-current] .destello { animation: destello 5s ease-in-out infinite; }
  @keyframes grano { from { transform: translateY(-2em); opacity: 0; } 30% { opacity: 1; } 80%, to { transform: translateY(6em); opacity: 0; } }
  @keyframes destello { 0%, 70%, 100% { opacity: 0; } 82% { opacity: 0.9; } }
  /* Reducir movimiento: nada se mueve. Reducir destellos: el destello del cristal queda fijo (no titila). */
  .quieto .capas .grano { animation: none; }
  :is(.quieto, .calma) .capas [aria-current] .destello { animation: none; opacity: 0.6; }
  /* C13, Capa 2 próximamente: el azul helado de Cristalización con un resplandor tenue de brasas desde abajo, grietas
     apenas encendidas y chispas que suben despacio (solo transform y opacidad). */
  .proxima {
    position: fixed; inset: 0; z-index: 4; display: grid; place-content: center; justify-items: center; gap: 0.75rem;
    padding: 2rem 2rem 2rem 7rem; overflow: hidden; color: var(--escarcha); text-align: center; animation: entrar 1.2s ease-out;
    background:
      radial-gradient(70% 45% at 50% 105%, rgb(255 96 32 / 0.22), transparent 70%),
      radial-gradient(40% 30% at 30% 100%, rgb(255 60 30 / 0.12), transparent 70%),
      radial-gradient(45% 35% at 72% 100%, rgb(255 150 60 / 0.1), transparent 70%),
      var(--tex-escarcha),
      radial-gradient(120% 80% at 50% 0%, #0f1d33, var(--noche) 70%);
  }
  .cierre {
    --f: 1.25rem; --grieta: var(--tex-grietas); --luz: radial-gradient(90% 60% at 50% 115%, rgb(255 110 40 / 0.2), transparent 70%);
    display: grid; justify-items: center; gap: 0.5rem; width: min(100%, 30rem); padding: 2.25rem 2rem 2rem;
  }
  .proxima h1 { margin: 0; font-size: clamp(2.5rem, 7vw, 4.5rem); line-height: 1; color: var(--escarcha); text-shadow: 0 0.2em 1.2em rgb(255 110 40 / 0.25); }
  .proxima p { margin: 0; font-size: 1.125rem; color: #e8b48f; }
  .proxima .lema { font-size: 1rem; color: var(--tenue); text-wrap: balance; }
  .cierre { max-height: 100%; overflow-y: auto; }
  .resumen { display: flex; gap: 1rem; align-items: center; width: 100%; margin-top: 0.5rem; text-align: left; }
  .resumen img { width: min(9rem, 28vw); aspect-ratio: 1080 / 1350; object-fit: cover; flex: none; border: 1px solid var(--borde); }
  .resumen dl { display: grid; gap: 0.25rem; margin: 0; flex: 1; font-size: 0.875rem; }
  .resumen dl div { display: flex; justify-content: space-between; gap: 0.75rem; }
  .resumen dt { color: var(--tenue); }
  .resumen dt, .resumen dd { font-size: 0.875rem; line-height: 1.3; }
  .resumen dd { margin: 0; color: var(--escarcha); font-weight: 600; text-align: right; }
  .grietas { position: absolute; inset: 0; width: 100%; height: 100%; fill: none; stroke: #ff7a2e; stroke-width: 0.25; opacity: 0.12; filter: drop-shadow(0 0 2px #ff5a1f); }
  .chispas { position: absolute; inset: 0; pointer-events: none; }
  .chispas i {
    position: absolute; bottom: -1rem; width: 3px; height: 3px; border-radius: 50%; background: #ffb067; box-shadow: 0 0 4px #ff6a2a;
    opacity: 0; animation: chispa var(--v) var(--d) linear infinite; will-change: transform, opacity;
  }
  @keyframes chispa {
    0% { transform: translate(0, 0); opacity: 0; }
    15% { opacity: 0.7; }
    70% { opacity: 0.35; }
    100% { transform: translate(var(--x), -70vh); opacity: 0; }
  }
  /* Reducir destellos: menos chispas y más lentas (el brillo cambia en segundos, no en fracciones). Reducir movimiento: ninguna. */
  .calma .chispas i:nth-child(2n) { display: none; }
  .calma .chispas i { animation-duration: calc(var(--v) * 1.5); }
  .quieto .chispas { display: none; }
  .quieto .proxima { animation: none; }

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
  /* Pantalla fija (CLAUDE.md): ninguna pantalla de sistema scrollea; cada una se acomoda al alto que queda. */
  .cristalizacion.fija { overflow: hidden; grid-template-rows: auto auto minmax(0, 1fr); }
  /* Primera vez: la cámara cae desde la Arena. */
  .cristalizacion.llega { animation: caer 1.1s cubic-bezier(0.2, 0.8, 0.2, 1); }
  @keyframes entrar { from { opacity: 0; } }
  @keyframes caer { from { opacity: 0; transform: translateY(35vh); } }
  .quieto .cristalizacion.llega { animation: entrar 0.6s ease-out; }

  .cristalizacion > :global(:not(.escarcha)) { position: relative; }
  .contadores { display: flex; flex-wrap: wrap; align-items: end; gap: 0.5rem 3rem; margin: 0; }
  .principal { display: flex; align-items: center; gap: 0.75rem; }
  .emblema { width: 3.25rem; height: 3.25rem; flex: none; overflow: visible; filter: drop-shadow(0 0 0.3rem rgb(159 227 245 / 0.3)); }
  .emblema .destello { animation: destello 6s ease-in-out infinite; }
  :is(.quieto, .calma) .emblema .destello { animation: none; opacity: 0.6; }
  dt { font-size: 0.875rem; color: var(--tenue); }
  dd { margin: 0.125rem 0 0; font-size: 1.5rem; font-weight: 600; line-height: 1; letter-spacing: -0.02em; }
  .cristales { font-size: clamp(2.5rem, 4vw, 3.75rem); letter-spacing: -0.03em; color: var(--hielo); }

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
  /* Vertical (celular, tablet): la barra de capas pasa abajo, de lado a lado, como la navegación de un juego de celular.
     --nav (index.html) es su alto: la hoja de la tienda y las pantallas de la Capa 1 terminan arriba de ella. */
  @media (orientation: portrait) and (max-width: 1100px) {
    .capas {
      top: auto; bottom: 0; left: 0; right: 0; translate: none; display: flex; gap: 0; padding: 0 0.5rem env(safe-area-inset-bottom);
      height: var(--nav); box-sizing: border-box; border-top: 1px solid var(--borde); mask: none;
      background: linear-gradient(rgb(6 8 16 / 0.97), rgb(3 4 9 / 0.99));
    }
    .capas button { flex: 1; width: auto; min-height: 0; gap: 0.2rem; padding: 0.4rem 0.25rem; font-size: 0.6875rem; }
    .capas svg { width: 1.625rem; height: 1.625rem; }
    .capas .icono { width: 1.625rem; height: 1.625rem; font-size: calc(1.625rem / 24); }
    /* La activa: la marca pasa al borde de arriba. */
    .capas [aria-current]::after { left: 50%; top: -1px; width: 1.75rem; height: 2px; translate: -50% 0; border-radius: 0 0 2px 2px; }
    .capas [aria-current] { background: radial-gradient(55% 70% at 50% 0%, color-mix(in srgb, var(--c) 16%, transparent), transparent 80%); }
    .capas .auto { margin: 0; }
    .capas .auto::before { top: 50%; left: 0; width: 1px; height: 1.5rem; translate: 0 -50%; }
    .capas .punto { right: calc(50% - 1.4rem); top: 0.45rem; }
    /* Los contadores en dos columnas: los Cristales grandes a la izquierda, el resto en renglones chicos a la derecha. */
    .contadores { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 0 1rem; }
    .contadores > div:not(.principal) { grid-column: 2; display: flex; justify-content: end; align-items: baseline; gap: 0.4rem; white-space: nowrap; }
    .principal { grid-row: 1 / span 3; gap: 0.5rem; }
    .contadores > div:not(.principal) dt { font-size: 0.75rem; }
    .contadores > div:not(.principal) dd { font-size: 0.9375rem; }
    .emblema { width: 2.25rem; height: 2.25rem; }
    .cristales { font-size: 2.125rem; }
    .sistemas { margin-top: 0.75rem; }
    /* Arriba, la fila de íconos de App.svelte; abajo, la barra. */
    .cristalizacion, .automat, .proxima { padding: 3.5rem 1rem calc(var(--nav) + 0.75rem); }
  }
  /* Celulares bajos (360×640): la cabecera más chica, para que cada pantalla tenga lugar. */
  @media (orientation: portrait) and (max-width: 1100px) and (max-height: 720px) {
    .cristalizacion, .automat, .proxima { padding-top: 3.1rem; }
    .cristales { font-size: 1.625rem; }
    .emblema { width: 1.75rem; height: 1.75rem; }
    .contadores > div:not(.principal) dt { font-size: 0.6875rem; }
    .contadores > div:not(.principal) dd { font-size: 0.8125rem; }
    .contadores dt { font-size: 0.75rem; }
    .sistemas { margin-top: 0.4rem; }
  }
</style>
