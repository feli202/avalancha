<script lang="ts">
  // SPEC_CAPA1 §6: la Red, un rombo de nodos alrededor de Memoria leído de config. Cada nivel se pinta con un color de la Capa 0.
  // Al completar un nodo, la arena se derrumba hacia sus vecinos (como el toppling de la pila): eso es lo que los abre.
  import {
    ANILLO3, NIVEL_MAX_RED, NODOS, abierto, comprarRed, costoRed, escarchaAbierta, nivelRed, puedeComprarRed, vecinos,
  } from '../core'
  import { txt } from '../strings'
  import { ayuda, type Tip } from './ayudas.svelte'
  import { formato } from './formato'
  import { juego } from './juego.svelte'
  import * as sonido from './sonido'

  const COLORES = ['var(--ambar)', 'var(--coral)', 'var(--jade)', 'var(--violeta)']
  const ids = Object.keys(NODOS)
  const R = Math.max(...ids.map((id) => Math.abs(NODOS[id].pos[0]) + Math.abs(NODOS[id].pos[1]))) // radio del rombo
  const r = txt.cristal.red
  const s = $derived(juego.s)

  const nombres = (id: string) => r.nodos[id] ?? [id, id, () => '']
  // Los valores de cada efecto en el nivel n (todos los arreglos del nodo en config, salvo la posición).
  const valores = (id: string, n: number) =>
    Object.fromEntries(Object.entries(NODOS[id]).flatMap(([c, v]) => (c !== 'pos' && Array.isArray(v) ? [[c, v[n - 1]]] : [])))
  const efecto = (id: string, n: number) => nombres(id)[2](valores(id, n), n)
  const bajoHielo = (id: string) => ANILLO3.has(id) && !escarchaAbierta(juego.s)

  function tip(id: string): Tip {
    const st = juego.s, n = nivelRed(st, id)
    const cerrado = bajoHielo(id) ? r.hielo : !abierto(st, id) && n < NIVEL_MAX_RED ? r.cerrado : null
    return {
      titulo: nombres(id)[0],
      que: cerrado ?? r.nivel(n),
      ahora: n ? efecto(id, n) : r.sinComprar,
      prox: n >= NIVEL_MAX_RED ? r.completo : `${r.siguiente(efecto(id, n + 1))} · ${r.costo(formato(costoRed(id, n), true))}`,
    }
  }

  let derrumbe = $state<{ id: string; k: number } | null>(null)
  let k = 0, fin = 0
  function comprar(id: string) {
    const antes = juego.s
    juego.s = comprarRed(antes, id)
    if (juego.s === antes) return
    sonido.compra('other')
    if (nivelRed(juego.s, id) < NIVEL_MAX_RED) return
    sonido.derrumbe(3000)
    sonido.hito('ring')
    derrumbe = { id, k: k++ }
    clearTimeout(fin)
    fin = window.setTimeout(() => (derrumbe = null), 1200)
  }

  // Columna y fila de la grilla, con Memoria en el centro (y hacia arriba).
  const col = (id: string) => NODOS[id].pos[0] + R + 1
  const fila = (id: string) => R - NODOS[id].pos[1] + 1
</script>

<section class="red" aria-label={txt.cristal.pantallas.red} style:--lado={2 * R + 1}>
  <div class="rombo">
    {#each ids as id (id)}
      {@const n = nivelRed(s, id)}
      {@const hielo = bajoHielo(id)}
      {@const ab = abierto(s, id) || n > 0}
      <button
        class="nodo" class:ab class:hielo class:con={n > 0} class:lleno={n >= NIVEL_MAX_RED} class:puede={puedeComprarRed(s, id)}
        style:grid-column={col(id)} style:grid-row={fila(id)} style:--c={n ? COLORES[n - 1] : 'transparent'}
        aria-disabled={!puedeComprarRed(s, id)} aria-label="{nombres(id)[0]}, {r.nivel(n)}"
        use:ayuda={() => tip(id)} onclick={() => comprar(id)}
      >
        <span class="nombre">{nombres(id)[0]}</span><span class="corto" aria-hidden="true">{nombres(id)[1]}</span>
        <span class="niveles" aria-hidden="true">{#each COLORES as c, i}<i style:background={i < n ? c : null}></i>{/each}</span>
        {#if hielo}
          <svg class="candado" viewBox="-6 -7 12 14" aria-hidden="true"><path d="M-3.5-1V-3.5a3.5 3.5 0 0 1 7 0V-1M-5-1h10v7h-10ZM0 1.5v2" /></svg>
        {/if}
      </button>
    {/each}
    {#if derrumbe}
      {#key derrumbe.k}
        {@const d = derrumbe.id}
        <i class="golpe" style:grid-column={col(d)} style:grid-row={fila(d)} aria-hidden="true"></i>
        {#each vecinos(d) as v}
          <i class="grano" style:grid-column={col(d)} style:grid-row={fila(d)} style:--dx={col(v) - col(d)} style:--dy={fila(v) - fila(d)} aria-hidden="true"></i>
          <i class="recibe" style:grid-column={col(v)} style:grid-row={fila(v)} aria-hidden="true"></i>
        {/each}
      {/key}
    {/if}
  </div>
  <p>{r.que}</p>
</section>

<style>
  .red { display: grid; justify-items: center; align-content: center; gap: 1.25rem; padding: 1.5rem 0; }
  .rombo {
    --gap: 0.375rem;
    --celda: min(6.25rem, calc((100vw - 8rem - (var(--lado) - 1) * var(--gap)) / var(--lado)), calc((100vh - 16rem) / var(--lado)));
    --paso: calc(var(--celda) + var(--gap));
    display: grid; grid-template-columns: repeat(var(--lado), var(--celda)); grid-auto-rows: var(--celda); gap: var(--gap);
  }
  p { max-width: 34rem; margin: 0; color: var(--tenue); text-align: center; text-wrap: balance; }

  /* Cada nodo es una celda de la pila: vacía, se ve el borde; con niveles, se llena del color del último. */
  .nodo {
    position: relative; container-type: inline-size; display: grid; place-content: center; justify-items: center; gap: 0.3rem;
    padding: 0.25rem; border: 1px solid rgb(159 227 245 / 0.12); background: rgb(4 6 13 / 0.6); color: var(--apagado);
    font: inherit; cursor: default; opacity: 0.55; transition: opacity 0.2s, border-color 0.2s, background-color 0.3s;
  }
  .nodo.ab { opacity: 1; color: var(--escarcha); border-color: rgb(159 227 245 / 0.28); }
  .nodo:not(.lleno).ab { background: color-mix(in srgb, var(--c) 18%, rgb(4 6 13 / 0.85)); }
  .nodo.ab.con:not(.lleno) { border-color: var(--c); }
  .nodo.lleno { background: color-mix(in srgb, var(--violeta) 34%, var(--noche)); border-color: var(--violeta); box-shadow: 0 0 1rem rgb(155 123 255 / 0.25); }
  .nodo.puede { cursor: pointer; border-color: var(--hielo); box-shadow: inset 0 0 0 1px rgb(159 227 245 / 0.35), 0 0 0.9rem rgb(159 227 245 / 0.18); }
  .nodo.puede:hover { background: color-mix(in srgb, var(--hielo) 12%, rgb(4 6 13 / 0.85)); }
  .nodo.hielo {
    opacity: 0.55; border-style: dashed; border-color: rgb(159 227 245 / 0.22); color: var(--apagado);
    background: repeating-linear-gradient(60deg, transparent 0 0.6rem, rgb(159 227 245 / 0.05) 0.6rem calc(0.6rem + 1px)), rgb(4 6 13 / 0.6);
  }
  .nombre { max-width: 100%; font-size: clamp(0.625rem, 11cqi, 0.8125rem); font-weight: 600; line-height: 1.1; text-align: center; hyphens: manual; }
  .corto { display: none; font-size: 0.6875rem; font-weight: 600; }
  @container (max-width: 3.25rem) { .nombre { display: none; } .corto { display: block; } }
  .niveles { display: flex; gap: 2px; }
  .niveles i { width: 0.5rem; height: 0.25rem; background: rgb(159 227 245 / 0.15); }
  .hielo .niveles, .hielo .corto, .hielo .nombre { visibility: hidden; }
  .candado { position: absolute; inset: 0; margin: auto; width: 38%; fill: none; stroke: var(--hielo); stroke-width: 1; stroke-linejoin: round; opacity: 0.7; }

  /* Derrumbe: la celda se vacía de golpe y cuatro granos violeta salen a los vecinos, que se encienden al recibirlos. */
  .golpe, .grano, .recibe { pointer-events: none; }
  .golpe { background: var(--escarcha); animation: golpe 0.5s ease-out forwards; }
  .grano {
    place-self: center; width: 22%; aspect-ratio: 1; background: var(--violeta); box-shadow: 0 0 0.6rem var(--violeta);
    animation: grano 0.55s cubic-bezier(0.3, 0.7, 0.4, 1) forwards;
  }
  .recibe { border: 2px solid var(--violeta); animation: recibe 0.7s 0.4s ease-out both; }
  @keyframes golpe { from { opacity: 0.85; scale: 1.08; } to { opacity: 0; scale: 1; } }
  @keyframes grano { from { translate: 0 0; } 80% { opacity: 1; } to { translate: calc(var(--dx) * var(--paso)) calc(var(--dy) * var(--paso)); opacity: 0; } }
  @keyframes recibe { from { opacity: 0; } 25% { opacity: 1; box-shadow: 0 0 1.2rem var(--violeta); } to { opacity: 0; } }
  /* Reducir destellos (ajuste, o prefers-reduced-motion en Capas.svelte). */
  :global(.quieto) :is(.golpe, .grano, .recibe) { display: none; }

  @media (orientation: portrait) and (max-width: 1100px) {
    .rombo { --gap: 2px; --celda: min(6.25rem, calc((100vw - 5rem - (var(--lado) - 1) * var(--gap)) / var(--lado))); }
  }
</style>
