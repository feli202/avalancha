<script lang="ts">
  // SPEC_CAPA1 §6 y bloque 9 de CORRECCIONES_CAPA1: la Red como pila 3D de cristal (render/redVisual.ts, que se carga, se
  // crea y se destruye con esta pantalla). Los nombres flotan en HTML sobre cada columna; al elegir un nodo, su ficha va al
  // costado (nunca encima de la pila). Al completar un nodo, la columna se derrumba hacia sus vecinos y los despierta.
  import {
    ANILLO3, NIVEL_MAX_RED, NODOS, abierto, comprarRed, costoRed, escarchaAbierta, nivelRed, puedeComprarRed, vecinos,
  } from '../core'
  import type { RedVisual } from '../render/redVisual'
  import { txt } from '../strings'
  import { ajustes } from './ajustes.svelte'
  import { formato } from './formato'
  import { juego } from './juego.svelte'
  import * as sonido from './sonido'

  const COLORES = ['--ambar', '--coral', '--jade', '--violeta']
  const ids = Object.keys(NODOS)
  const r = txt.cristal.red
  const s = $derived(juego.s)

  const nombres = (id: string) => r.nodos[id] ?? [id, id, () => '']
  // Los valores de cada efecto en el nivel n (todos los arreglos del nodo en config, salvo la posición).
  const valores = (id: string, n: number) =>
    Object.fromEntries(Object.entries(NODOS[id]).flatMap(([c, v]) => (c !== 'pos' && Array.isArray(v) ? [[c, v[n - 1]]] : [])))
  const efecto = (id: string, n: number) => nombres(id)[2](valores(id, n), n)
  const bajoHielo = (id: string) => ANILLO3.has(id) && !escarchaAbierta(juego.s)
  const ab = (id: string) => abierto(s, id) || nivelRed(s, id) > 0

  let elegido = $state('memoria')
  let hover = $state<string | null>(null)
  const n = $derived(nivelRed(s, elegido))
  const estado = $derived(
    n >= NIVEL_MAX_RED ? r.completo : bajoHielo(elegido) ? r.hielo : !abierto(s, elegido) ? r.cerrado : null,
  )

  let canvas = $state<HTMLCanvasElement>()
  let visual = $state.raw<RedVisual>()
  const nombresEl: HTMLElement[] = $state([])

  /**
   * Pone cada nombre sobre su columna y esconde los que se pisan: primero el elegido y el del puntero, después los de
   * adelante (más abajo en pantalla). Los cerrados no compiten: solo se ven con el puntero encima (CSS).
   */
  function acomodar(xy: Float32Array) {
    const puestos: number[][] = []
    const orden = ids.map((_, i) => i).sort((a, b) => prioridad(b, xy) - prioridad(a, xy))
    for (const i of orden) {
      const e = nombresEl[i]
      if (!e) continue
      const x = xy[i * 2], y = xy[i * 2 + 1], w = e.offsetWidth / 2, h = e.offsetHeight
      e.style.translate = `${x}px ${y}px`
      const caja = [x - w - 4, y - h - 1, x + w + 4, y + 1] // con un poco de aire entre nombres
      const pisa = puestos.some((p) => caja[0] < p[2] && caja[2] > p[0] && caja[1] < p[3] && caja[3] > p[1])
      const cuenta = ids[i] === elegido || ids[i] === hover || ab(ids[i])
      e.toggleAttribute('data-tapado', pisa && ids[i] !== elegido) // atributo y no clase: Svelte reescribe `class` en cada cambio
      if (cuenta && !pisa) puestos.push(caja)
    }
  }
  const prioridad = (i: number, xy: Float32Array) => (ids[i] === elegido ? 1e6 : ids[i] === hover ? 1e5 : 0) + xy[i * 2 + 1]

  // three.js entra en un trozo aparte: no se baja hasta abrir esta pantalla.
  $effect(() => {
    if (!canvas) return
    const c = canvas
    let v: RedVisual | undefined, vivo = true
    import('../render/redVisual').then((m) => {
      if (!vivo) return
      const css = getComputedStyle(document.documentElement) // los de la interfaz: respetan daltonismo
      try {
        v = new m.RedVisual(c, COLORES.map((k) => parseInt(css.getPropertyValue(k).trim().slice(1), 16)))
      } catch {
        return // sin WebGL: quedan los nombres (sin posición) y la ficha
      }
      v.alElegir = (id) => (elegido = id)
      v.alResaltar = (id) => (hover = id)
      v.alCuadro = acomodar
      if (import.meta.env.DEV) Object.assign(window, { redVisual: v }) // para medir desde la consola
      visual = v
    })
    return () => {
      vivo = false
      v?.destruir()
      if (import.meta.env.DEV) Object.assign(window, { redVisual: undefined })
      visual = undefined
    }
  })
  $effect(() => {
    const st = juego.s
    visual?.poner({
      pos: Object.fromEntries(ids.map((id) => [id, NODOS[id].pos])),
      vecinos: Object.fromEntries(ids.map((id) => [id, vecinos(id)])),
      vista: Object.fromEntries(ids.map((id) => {
        const k = nivelRed(st, id)
        return [id, { modo: bajoHielo(id) ? 'hielo' : k > 0 ? 'cristal' : abierto(st, id) ? 'vacio' : 'escarcha', n: k }]
      })),
      quieta: ajustes.reducirDestellos,
    })
  })
  $effect(() => visual?.elegir(elegido))
  $effect(() => visual?.resaltar(hover))

  function comprar() {
    const id = elegido, antes = juego.s
    const nuevo = comprarRed(antes, id)
    if (nuevo === antes) return
    sonido.compra('other')
    if (nivelRed(nuevo, id) >= NIVEL_MAX_RED) {
      visual?.derrumbar(id) // antes del cambio de estado: los vecinos se ven dormidos hasta que les llega su fragmento
      sonido.derrumbe(3000)
      sonido.hito('ring')
    }
    juego.s = nuevo
  }
</script>

<section class="red" aria-label={txt.cristal.pantallas.red}>
  <div class="vista">
    <div class="escena">
      <canvas bind:this={canvas} aria-label={r.escena}></canvas>
      {#each ids as id, i (id)}
        <button
          class="nombre" class:ab={ab(id)} class:hielo={bajoHielo(id)} class:elegido={id === elegido} class:visto={id === hover} bind:this={nombresEl[i]}
          aria-label="{nombres(id)[0]}, {r.nivel(nivelRed(s, id))}" aria-pressed={id === elegido}
          onclick={() => (elegido = id)} onpointerenter={() => (hover = id)} onpointerleave={() => (hover = null)}
        ><span class="largo">{nombres(id)[0]}</span><span class="corto">{nombres(id)[1]}</span></button>
      {/each}
    </div>
    <aside class="ficha placa grietas" aria-live="polite">
      <h2>{nombres(elegido)[0]}</h2>
      <p class="nivel num">
        <span class="cubos" aria-hidden="true">{#each COLORES as c, i}<i style:background={i < n ? `var(${c})` : null}></i>{/each}</span>
        {r.nivel(n)}
      </p>
      <p class="hace">{efecto(elegido, Math.max(1, n))}</p>
      {#if n > 0 && n < NIVEL_MAX_RED}<p class="sig">{r.siguiente(efecto(elegido, n + 1))}</p>{/if}
      {#if estado}<p class="estado">{estado}</p>{/if}
      {#if n < NIVEL_MAX_RED}
        <button class="compra gema" style:--c="var({COLORES[n]})" aria-disabled={!puedeComprarRed(s, elegido)} onclick={comprar}>
          <span><b>{r.comprar(n + 1)}</b></span>
          <small class="num">{r.costo(formato(costoRed(elegido, n), true))}</small>
        </button>
      {/if}
    </aside>
  </div>
  <p class="que">{r.que}</p>
</section>

<style>
  /* Pantalla fija: la escena toma lo que queda; la ficha al costado (abajo en el celular). */
  .red { display: grid; grid-template-rows: minmax(0, 1fr) auto; height: 100%; min-height: 0; justify-items: center; gap: 0.75rem; padding: 1rem 0 0.5rem; animation: entrar 0.3s ease-out; }
  @keyframes entrar { from { opacity: 0; } }
  .vista { display: grid; grid-template-columns: minmax(0, 1fr) 19rem; gap: 1.5rem; width: min(100%, 72rem); min-height: 0; }
  .escena { position: relative; min-height: 0; overflow: hidden; container-type: inline-size; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: grab; }
  canvas:active { cursor: grabbing; }
  p { max-width: 38rem; margin: 0; color: var(--tenue); text-align: center; text-wrap: balance; }

  /* Los nombres siguen la punta de cada columna (los mueve la escena con `translate`, sin pasar por Svelte). */
  .nombre {
    position: absolute; left: 0; top: 0; transform: translate(-50%, -100%); padding: 0.15rem 0.3rem; border: 0; background: none;
    color: var(--apagado); font: inherit; font-size: 0.75rem; font-weight: 600; line-height: 1.1; white-space: nowrap;
    text-shadow: 0 0 0.35rem var(--noche), 0 0 0.15rem var(--noche); cursor: pointer; hyphens: manual;
  }
  .nombre.ab { color: var(--escarcha); }
  /* Los cerrados no llevan nombre a la vista (la pila se lee mejor): aparece al pasar por encima o al elegirlos. */
  .nombre:not(.ab, .elegido, .visto), .nombre:global([data-tapado]):not(.visto) { opacity: 0; pointer-events: none; }
  .nombre.elegido { z-index: 1; }
  .nombre.hielo { color: var(--apagado); }
  .nombre.elegido { color: var(--hielo); }
  .nombre:hover { color: #fff; }
  .corto { display: none; }
  @container (max-width: 36rem) { .largo { display: none; } .corto { display: inline; } .nombre { font-size: 0.6875rem; } }

  .ficha { --f: 1rem; display: grid; align-content: center; gap: 0.6rem; align-self: center; padding: 1rem 1.1rem 1.25rem; }
  .ficha p { text-align: left; max-width: none; }
  h2 { margin: 0; font-size: 1.5rem; font-weight: 300; hyphens: manual; }
  .nivel { display: flex; align-items: center; gap: 0.6rem; color: var(--escarcha); }
  .cubos { display: flex; gap: 3px; }
  .cubos i { width: 0.7rem; height: 0.7rem; background: rgb(159 227 245 / 0.12); clip-path: polygon(25% 0, 100% 0, 75% 100%, 0 100%); }
  .hace { color: var(--escarcha); }
  .sig { font-size: 0.875rem; }
  .estado { color: var(--hielo); font-size: 0.875rem; }
  .compra { --b: 1.1rem; display: grid; gap: 0.15rem; min-height: 2.75rem; padding-block: 0.7rem; font-size: 0.9375rem; }
  .compra .num { color: var(--hielo); font-size: 0.8125rem; }
  .compra[aria-disabled='true'] .num { color: var(--apagado); }

  /* Móvil y ventanas angostas: la pila arriba y la ficha debajo. */
  @media (max-width: 760px) {
    .red { gap: 0.5rem; padding-top: 0.5rem; }
    .vista { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(10rem, 1fr) auto; gap: 0.5rem; }
    .ficha { padding: 0.6rem 0.9rem 0.8rem; gap: 0.4rem; }
    h2 { font-size: 1.25rem; }
    .compra { padding-block: 0.45rem; font-size: 0.875rem; }
    .que { display: none; } /* en el celular no entra: está en "Cómo funciona" */
  }
</style>
