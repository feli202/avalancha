<script lang="ts">
  // SPEC_CAPA1 §5: el Relicario. La oferta del Infinito, los Engarces (solo lo engarzado da efecto) y las tres pilas de reliquias.
  // Cada tres iguales se funden en una del color siguiente: Ámbar → Coral → Jade → Violeta → Ámbar +1.
  import {
    CFG1, TIPOS, desequipar, efectoNivel, elegir, equipar, escalon, espacios, faltan, nivelFusion, nivelReliquia, oferta,
  } from '../core'
  import { txt } from '../strings'
  import { juego } from './juego.svelte'
  import * as sonido from './sonido'

  const COLORES = ['var(--ambar)', 'var(--coral)', 'var(--jade)', 'var(--violeta)']
  // Una forma por tipo: Cauce un rombo largo, Cascada un hexágono facetado, Mutaciones una macla (dos rombos).
  const FORMAS: Record<string, string> = {
    cauce: 'M0-9 5.2 0 0 9-5.2 0ZM0-9V9',
    cascada: 'M0-9 7.8-4.5V4.5L0 9-7.8 4.5V-4.5ZM-7.8-4.5 0 0 7.8-4.5M0 0V9',
    mutaciones: 'M-3-8 2 0-3 8-8 0ZM3-8 8 0 3 8-2 0Z',
  }
  const r = txt.cristal.relicario
  const s = $derived(juego.s)
  const ofrecidas = $derived(oferta(s))
  const nombre = (t: string) => r.tipos[t]?.[0] ?? t
  const grado = (nivel: number) => r.grado(txt.colores[escalon(nivel).color], escalon(nivel).vuelta)
  const efecto = (t: string, nivel: number) => r.tipos[t]?.[1](efectoNivel(t, nivel)) ?? ''
  const cuenta = $derived(Math.max(0, Math.ceil(CFG1.relicario.espera_eleccion_s - juego.ofertaS)))

  function tomar(i: number) {
    juego.s = elegir(juego.s, i)
    sonido.compra('other')
  }
  /** Tocar una pila: la engarza en el primer espacio libre (o en el último si están todos ocupados), o la saca. */
  function alternar(t: string) {
    const st = juego.s, e = st.relicario.equipadas
    juego.s = e.includes(t) ? desequipar(st, t) : equipar(st, t, Math.min(e.length, espacios(st) - 1))
  }
  let arrastrada = ''
  const soltar = (i: number) => (juego.s = equipar(juego.s, arrastrada, i))

  // Fusión: cuando una pila sube de color (elegida a mano o sola), tres cristales del color anterior se juntan en el nuevo.
  let fusion = $state<{ t: string; k: number; de: string } | null>(null)
  let antes: Record<string, number> = { ...juego.s.relicario.reliquias }
  let k = 0, fin = 0
  $effect(() => {
    const ahora = s.relicario.reliquias
    for (const t of TIPOS) {
      const n0 = nivelFusion(antes[t] ?? 0), n1 = nivelFusion(ahora[t] ?? 0)
      if (n1 > n0 && n1 >= 1) {
        fusion = { t, k: k++, de: COLORES[escalon(n1 - 1).color] }
        sonido.hito('ring')
        clearTimeout(fin)
        fin = window.setTimeout(() => (fusion = null), 1400)
      }
    }
    antes = { ...ahora }
  })
</script>

{#snippet cristal(t: string, nivel: number)}
  <svg class="cristal" class:mas={escalon(nivel).vuelta > 0} viewBox="-10 -10 20 20" style:--c={COLORES[escalon(Math.max(0, nivel)).color]} aria-hidden="true"><path d={FORMAS[t] ?? FORMAS.cascada} /></svg>
{/snippet}

<section class="relicario" aria-label={txt.cristal.pantallas.relicario}>
  {#if ofrecidas.length}
    <div class="oferta">
      <h2>{r.oferta}</h2>
      <p class="num">{r.cuenta(cuenta)}</p>
      <div class="cartas">
        {#each ofrecidas as t, i}
          {@const n = nivelReliquia(s, t)}
          <button onclick={() => tomar(i)}>
            {@render cristal(t, n)}
            <b>{nombre(t)}</b>
            <span>{efecto(t, Math.max(0, n))}</span>
            <small>{r.faltan(faltan(s, t), grado(n + 1))}</small>
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <p class="espera">{r.espera}</p>
  {/if}

  <div class="engarces" role="group" aria-label={r.engarces}>
    <h2>{r.engarces}</h2>
    {#each { length: espacios(s) } as _, i}
      {@const t = s.relicario.equipadas[i]}
      <button
        class="espacio" class:lleno={!!t} aria-label={t ? r.quitar(nombre(t)) : r.vacio} aria-disabled={!t}
        ondragover={(e) => e.preventDefault()} ondrop={(e) => { e.preventDefault(); soltar(i) }}
        onclick={() => t && (juego.s = desequipar(juego.s, t))}
      >
        {#if t}{@render cristal(t, nivelReliquia(s, t))}<b>{nombre(t)}</b>{/if}
      </button>
    {/each}
    <small>{r.comoEngarzar}</small>
  </div>

  <div class="pilas">
    {#each TIPOS as t (t)}
      {@const cant = s.relicario.reliquias[t] ?? 0}
      {@const n = nivelReliquia(s, t)}
      {@const puesta = s.relicario.equipadas.includes(t)}
      <button
        class="pila" class:puesta class:nada={!cant} draggable={cant > 0} aria-disabled={!cant}
        aria-label="{puesta ? r.quitar(nombre(t)) : r.engarzar(nombre(t))}, {cant ? grado(n) : r.ninguna}"
        ondragstart={(e) => { arrastrada = t; e.dataTransfer?.setData('text/plain', t) }}
        onclick={() => alternar(t)}
      >
        <span class="joya">
          {#key fusion?.t === t ? fusion.k : -1}
            <span class:nace={fusion?.t === t}>{@render cristal(t, n)}</span>
            {#if fusion?.t === t}
              <span class="fusion" style:--c={fusion.de} aria-hidden="true"><i></i><i></i><i></i></span>
            {/if}
          {/key}
        </span>
        <b>{nombre(t)}</b>
        {#if cant}
          <span class="grado" style:color={COLORES[escalon(n).color]}>{grado(n)}</span>
          <span class="num">{r.cantidad(cant)} · {r.faltan(faltan(s, t), grado(n + 1))}</span>
          <progress max={3 ** (n + 1) - 3 ** n} value={cant - 3 ** n}></progress>
          <span>{efecto(t, n)}</span>
          {#if !puesta}<small>{r.suelta}</small>{/if}
        {:else}
          <span>{r.ninguna}</span>
          <span>{efecto(t, 0)}</span>
        {/if}
      </button>
    {/each}
  </div>
  <p>{r.que}</p>
</section>

<style>
  .relicario { display: grid; justify-items: center; align-content: start; gap: 1.75rem; padding: 1.5rem 0; animation: entrar 0.3s ease-out; }
  @keyframes entrar { from { opacity: 0; } }
  h2 { margin: 0; font-size: 1.125rem; font-weight: 600; }
  p { max-width: 34rem; margin: 0; color: var(--tenue); text-align: center; text-wrap: balance; }
  small { color: var(--apagado); font-size: 0.8125rem; }
  button { font: inherit; color: var(--escarcha); background: rgb(4 6 13 / 0.6); border: 1px solid rgb(159 227 245 / 0.28); cursor: pointer; }

  .cristal { width: 3rem; height: 3rem; overflow: visible; fill: color-mix(in srgb, var(--c) 30%, transparent); stroke: var(--c); stroke-width: 0.9; stroke-linejoin: round; filter: drop-shadow(0 0 0.35rem color-mix(in srgb, var(--c) 55%, transparent)); }
  /* Segunda vuelta de la escalera (Ámbar +1…): el mismo color con un brillo más fuerte. */
  .cristal.mas { fill: color-mix(in srgb, var(--c) 60%, transparent); filter: drop-shadow(0 0 0.5rem var(--c)) drop-shadow(0 0 1.1rem var(--c)); }

  .oferta { display: grid; justify-items: center; gap: 0.5rem; width: 100%; }
  .cartas { width: 100%; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem; margin-top: 0.5rem; }
  .cartas button {
    display: grid; justify-items: center; align-content: start; gap: 0.35rem; width: min(11.5rem, calc(50% - 0.375rem)); padding: 1rem 0.75rem; text-align: center;
    border-color: var(--hielo); box-shadow: inset 0 0 0 1px rgb(159 227 245 / 0.25), 0 0 0.9rem rgb(159 227 245 / 0.15); transition: background-color 0.15s, translate 0.15s;
  }
  .cartas button:hover, .cartas button:focus-visible { background: color-mix(in srgb, var(--hielo) 12%, rgb(4 6 13 / 0.85)); translate: 0 -2px; }
  .cartas span, .pila span { color: var(--tenue); font-size: 0.875rem; text-wrap: balance; }

  .engarces { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.75rem; }
  .engarces h2, .engarces small { flex-basis: 100%; text-align: center; }
  .espacio { display: grid; place-content: center; justify-items: center; gap: 0.25rem; width: 7rem; height: 7rem; border-style: dashed; cursor: default; font-size: 0.875rem; }
  .espacio.lleno { border-style: solid; border-color: var(--hielo); cursor: pointer; background: color-mix(in srgb, var(--hielo) 8%, rgb(4 6 13 / 0.85)); }

  .pilas { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 0.75rem; width: min(100%, 48rem); }
  .pila { display: grid; justify-items: center; align-content: start; gap: 0.3rem; padding: 1.25rem 0.75rem; text-align: center; transition: border-color 0.2s, background-color 0.2s; }
  .pila.puesta { border-color: var(--hielo); background: color-mix(in srgb, var(--hielo) 8%, rgb(4 6 13 / 0.85)); }
  .pila.nada { opacity: 0.55; cursor: default; }
  .pila .cristal { width: 4.5rem; height: 4.5rem; }
  .pila .grado { font-weight: 600; }
  .joya { position: relative; display: grid; place-items: center; }
  progress { width: 70%; height: 0.25rem; border: 0; background: rgb(159 227 245 / 0.15); accent-color: var(--hielo); appearance: none; }
  progress::-webkit-progress-bar { background: rgb(159 227 245 / 0.15); }
  progress::-webkit-progress-value { background: var(--hielo); }
  progress::-moz-progress-bar { background: var(--hielo); }

  /* Fusión: tres cristales del color anterior caen al centro y nace el del color siguiente. */
  .fusion { position: absolute; inset: 0; pointer-events: none; }
  .fusion i {
    position: absolute; left: 50%; top: 50%; width: 1.5rem; height: 2.2rem; margin: -1.1rem 0 0 -0.75rem; background: var(--c);
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); animation: juntar 0.6s cubic-bezier(0.5, 0, 0.8, 0.4) forwards;
  }
  .fusion i:nth-child(1) { --x: -4.5rem; --y: -1.5rem; }
  .fusion i:nth-child(2) { --x: 4.5rem; --y: -1.5rem; }
  .fusion i:nth-child(3) { --x: 0rem; --y: 4rem; }
  .nace { animation: nacer 0.8s 0.55s cubic-bezier(0.2, 1.6, 0.4, 1) backwards; }
  @keyframes juntar { from { translate: var(--x) var(--y); opacity: 0; } 25% { opacity: 1; } to { translate: 0 0; scale: 0.5; opacity: 0.9; } }
  @keyframes nacer { from { scale: 0.2; opacity: 0; filter: brightness(4); } }
  :global(.quieto) .fusion { display: none; }
  :global(.quieto) .nace { animation: none; }
</style>
