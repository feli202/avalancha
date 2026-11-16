<script lang="ts">
  // SPEC_CAPA1 §6 y bloque 9 (boceto escarcha-v3) de CORRECCIONES_CAPA1: la Red plana, en SVG. Cada nodo es una mini pila
  // de arena teñida con el color de su nivel; los completos se unen a sus vecinos con escarcha. La red llena su caja
  // (el viewBox se ajusta a los nodos) y la ficha del elegido va al costado (debajo en el celular).
  import {
    ANILLO3, NIVEL_MAX_RED, NODOS, abierto, anillo, comprarRed, costoRed, escarchaAbierta, nivelRed, puedeComprarRed, vecinos,
  } from '../core'
  import { EMBLEMA, cara, rama, semilla } from '../render/redCaras'
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
  const nombre = (id: string, corto: boolean) => nombres(id)[corto ? 1 : 0].replaceAll('­', '')
  // Los valores de cada efecto en el nivel n (todos los arreglos del nodo en config, salvo la posición).
  const valores = (id: string, n: number) =>
    Object.fromEntries(Object.entries(NODOS[id]).flatMap(([c, v]) => (c !== 'pos' && Array.isArray(v) ? [[c, v[n - 1]]] : [])))
  const efecto = (id: string, n: number) => nombres(id)[2](valores(id, n), n)
  const bajoHielo = (id: string) => ANILLO3.has(id) && !escarchaAbierta(juego.s)

  let elegido = $state('memoria')
  let hover = $state<string | null>(null)
  const n = $derived(nivelRed(s, elegido))
  const estado = $derived(
    n >= NIVEL_MAX_RED ? r.completo : bajoHielo(elegido) ? r.hielo : !abierto(s, elegido) ? r.cerrado : null,
  )

  // Los colores de la interfaz (respetan daltonismo), para pintar las caras.
  let hex = $state(['#ffb547', '#ff6b6b', '#2dd4a7', '#9b7bff'])
  $effect(() => {
    void ajustes.daltonismo
    // Al cuadro siguiente: App cambia la clase `daltonismo` en su propio efecto.
    const f = requestAnimationFrame(() => {
      const css = getComputedStyle(document.documentElement)
      hex = COLORES.map((k, i) => css.getPropertyValue(k).trim() || hex[i])
    })
    return () => cancelAnimationFrame(f)
  })

  // Celular o ventana angosta: nombres cortos, letra y cuadros más grandes en unidades del dibujo, rombo más apretado.
  let ancho = $state(800)
  const compacto = $derived(ancho < 560)
  const M = $derived(compacto
    ? { dx: 92, dy: 124, letra: 21, cerrada: 18, cuadro: 12, paso: 16, nom: 25, fila: 43, medio: 38 }
    : { dx: 134, dy: 116, letra: 13, cerrada: 11.5, cuadro: 8, paso: 11, nom: 19, fila: 33, medio: 54 })

  type Modo = 'hielo' | 'escarcha' | 'vacio' | 'cristal'
  type Vista = { id: string; x: number; y: number; r: number; modo: Modo; n: number }
  const vistas = $derived(ids.map((id): Vista => {
    const k = nivelRed(s, id), [px, py] = NODOS[id].pos
    const modo: Modo = bajoHielo(id) ? 'hielo' : k > 0 ? 'cristal' : abierto(s, id) ? 'vacio' : 'escarcha'
    return { id, x: px * M.dx, y: -py * M.dy, r: modo === 'hielo' ? 6 : anillo(id) <= 1 ? 38 : 32, modo, n: k }
  }))
  const por = $derived(new Map(vistas.map((v) => [v.id, v])))

  // La caja de lo dibujado, sin los puntos de hielo (llegan hasta el borde y achicarían la red).
  const caja = $derived.by(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const v of vistas) {
      if (v.modo === 'hielo') continue
      const w = Math.max(v.r + 4, M.medio)
      x0 = Math.min(x0, v.x - w); x1 = Math.max(x1, v.x + w)
      y0 = Math.min(y0, v.y - v.r - 10); y1 = Math.max(y1, v.y + v.r + M.fila + 8)
    }
    return `${x0} ${y0} ${x1 - x0} ${y1 - y0}`
  })

  // Escarcha: de cada nodo completo a sus vecinos (una sola vez entre dos completos).
  const ramas = $derived.by(() => {
    const out: [string, number][] = []
    for (const a of vistas) if (a.n >= NIVEL_MAX_RED) for (const id of vecinos(a.id)) {
      const b = por.get(id)!
      if (b.n >= NIVEL_MAX_RED && anillo(b.id) < anillo(a.id)) continue
      const L = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / L, uy = (b.y - a.y) / L
      rama(a.x + ux * (a.r + 3), a.y + uy * (a.r + 3), b.x - ux * (b.r + 3), b.y - uy * (b.r + 3), semilla(a.id + b.id), 1.1, 1, out)
    }
    return out
  })

  const colorDe = (v: Vista) => (v.modo === 'cristal' ? hex[v.n - 1] : null)

  // El derrumbe al completar un nodo: un fragmento de cristal sale hacia cada vecino.
  let derrumbe = $state<{ id: string; k: number } | null>(null)
  let k = 0

  function comprar() {
    const id = elegido, antes = juego.s
    const nuevo = comprarRed(antes, id)
    if (nuevo === antes) return
    sonido.compra('other')
    if (nivelRed(nuevo, id) >= NIVEL_MAX_RED) {
      if (!ajustes.reducirDestellos) {
        const esta = { id, k: ++k }
        derrumbe = esta
        setTimeout(() => { if (derrumbe === esta) derrumbe = null }, 1400)
      }
      sonido.derrumbe(3000)
      sonido.hito('ring')
    }
    juego.s = nuevo
  }

  function tecla(e: KeyboardEvent, id: string) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    elegido = id
  }
</script>

<section class="red" aria-label={txt.cristal.pantallas.red}>
  <div class="vista">
    <div class="escena" bind:clientWidth={ancho}>
      <svg viewBox={caja} preserveAspectRatio="xMidYMid meet" role="group" aria-label={r.escena}>
        <defs>
          <filter id="red-halo" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id="red-halo-cara" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
          <clipPath id="red-c38"><circle r="38" /></clipPath>
          <clipPath id="red-c32"><circle r="32" /></clipPath>
        </defs>
        <g class="halo" filter="url(#red-halo)">{#each ramas as [d, w]}{#if w >= 1}<path {d} />{/if}{/each}</g>
        <g class="ramas">{#each ramas as [d, w]}<path {d} stroke-width={w} opacity={w >= 1 ? 0.9 : 0.55} />{/each}</g>

        {#each vistas as v (v.id)}
          {#if v.modo === 'hielo'}
            <circle class="punto" cx={v.x} cy={v.y} r="5" />
          {:else}
            <g
              class="nodo {v.modo}" class:elegido={v.id === elegido} class:visto={v.id === hover}
              class:cae={derrumbe?.id === v.id} transform="translate({v.x} {v.y})"
              role="button" tabindex="0" aria-pressed={v.id === elegido} aria-label="{nombre(v.id, false)}, {r.nivel(v.n)}"
              onclick={() => (elegido = v.id)} onkeydown={(e) => tecla(e, v.id)}
              onpointerenter={() => (hover = v.id)} onpointerleave={() => (hover = null)}
            >
              <circle class="toque" r={v.r + 12} />
              {#if v.modo === 'escarcha'}
                <!-- Arena que todavía no cristalizó: la misma pila, gris y muy apagada, sin emblema. -->
                <image href={cara(v.id, null)} x={-v.r * 0.7} y={-v.r * 0.7} width={v.r * 1.4} height={v.r * 1.4} opacity="0.28" />
                <circle class="aro" r={v.r * 0.7 + 3} opacity="0.12" stroke-width="0.75" />
                <text class="cerrado" y={v.r * 0.7 + 3 + M.cerrada + 2} font-size={M.cerrada}>{nombre(v.id, compacto)}</text>
              {:else}
                {#if v.id === elegido}<circle class="sel" r={v.r + 9} />{/if}
                {#if v.n >= NIVEL_MAX_RED}<circle r={v.r + 2} fill={hex[3]} opacity="0.35" filter="url(#red-halo-cara)" />{/if}
                <g clip-path="url(#red-c{v.r})">
                  <image href={cara(v.id, colorDe(v))} x={-v.r} y={-v.r} width={2 * v.r} height={2 * v.r} opacity={v.modo === 'vacio' ? 0.55 : 1} />
                </g>
                <!-- Aro de 1 px, como el borde de la pila de la Arena. -->
                <circle class="aro borde" r={v.r + 2.5} opacity={v.n >= NIVEL_MAX_RED ? 0.85 : 0.35} />
                <circle r={v.r * 0.5} fill="var(--noche)" opacity="0.72" />
                <circle class="aro" r={v.r * 0.5} opacity="0.55" stroke-width="0.8" />
                {#if EMBLEMA[v.id]}
                  <path class="emblema" d={EMBLEMA[v.id]} transform="scale({v.r / 30})" stroke-width={(1.4 * 30) / v.r} />
                {/if}
                <text class="nom" y={v.r + M.nom} font-size={M.letra}>{nombre(v.id, compacto)}</text>
                <g transform="translate(0 {v.r + M.fila})">
                  {#each COLORES as c, i}
                    <rect x={-2 * M.paso + (M.paso - M.cuadro) / 2 + i * M.paso} y={-M.cuadro / 2} width={M.cuadro} height={M.cuadro}
                      fill={i < v.n ? `var(${c})` : 'rgb(159 227 245 / 0.14)'} />
                  {/each}
                </g>
              {/if}
            </g>
          {/if}
        {/each}

        {#if derrumbe}
          {@const a = por.get(derrumbe.id)!}
          {#key derrumbe.k}
            {#each vecinos(derrumbe.id) as id, i (id)}
              {@const b = por.get(id)!}
              {#each [0, 1, 2] as j}
                <rect class="fragmento" x={a.x - 4} y={a.y - 4} width="8" height="8" fill={hex[3]}
                  style:--dx="{b.x - a.x + (j - 1) * 6}px" style:--dy="{b.y - a.y + (j - 1) * 6}px" style:animation-delay="{i * 60 + j * 90}ms" />
              {/each}
            {/each}
          {/key}
        {/if}
      </svg>
    </div>

    <aside class="ficha placa grietas" aria-live="polite">
      <header>
        <svg class="cara" viewBox="-40 -40 80 80" aria-hidden="true">
          <g clip-path="url(#red-c38)">
            <image href={cara(elegido, n > 0 ? hex[n - 1] : null)} x="-38" y="-38" width="76" height="76" opacity={n > 0 ? 1 : 0.55} />
          </g>
          <circle class="aro" r="40" opacity="0.35" />
          <circle r="19" fill="var(--noche)" opacity="0.72" />
          <circle class="aro" r="19" opacity="0.55" />
          {#if EMBLEMA[elegido]}<path class="emblema" d={EMBLEMA[elegido]} transform="scale(1.25)" stroke-width="1.1" />{/if}
        </svg>
        <div>
          <h2>{nombre(elegido, false)}</h2>
          <p class="nv num">
            <span class="cuadros" aria-hidden="true">{#each COLORES as c, i}<i style:background={i < n ? `var(${c})` : null}></i>{/each}</span>
            {r.nv(n, txt.colores[n - 1])}
          </p>
        </div>
      </header>
      <p class="hace">{efecto(elegido, Math.max(1, n))}</p>
      {#if n > 0 && n < NIVEL_MAX_RED}<p class="sig">{r.siguiente(efecto(elegido, n + 1))}</p>{/if}
      {#if estado}<p class="estado">{estado}</p>{/if}
      {#if n < NIVEL_MAX_RED}
        <button class="compra gema" style:--c="var({COLORES[n]})" aria-disabled={!puedeComprarRed(s, elegido)} onclick={comprar}
          aria-label="{r.comprar(n + 1)}. {r.costo(formato(costoRed(elegido, n), true))}">
          <span>{r.comprar(n + 1)}</span><span class="num costo">{formato(costoRed(elegido, n), true)}</span>
        </button>
      {/if}
      <p class="que">{r.que}</p>
    </aside>
  </div>
</section>

<style>
  /* Pantalla fija: la red toma lo que queda; la ficha al costado (abajo en el celular). */
  .red { display: grid; height: 100%; min-height: 0; justify-items: center; padding: 0.5rem 0; animation: entrar 0.3s ease-out; }
  @keyframes entrar { from { opacity: 0; } }
  .vista { display: grid; grid-template-columns: minmax(0, 1fr) 20rem; gap: 2rem; width: min(100%, 76rem); min-height: 0; }
  .escena { position: relative; min-height: 0; min-width: 0; }
  .escena > svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; font-family: inherit; }

  .halo path { stroke: var(--hielo); stroke-width: 3; fill: none; opacity: 0.45; stroke-linecap: round; }
  .ramas path { stroke: var(--escarcha); fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .punto { fill: none; stroke: var(--hielo); stroke-width: 0.75; opacity: 0.18; }

  .nodo { cursor: pointer; outline: none; }
  .nodo image { image-rendering: pixelated; }
  .toque { fill: transparent; }
  .aro { fill: none; stroke: var(--escarcha); stroke-width: 1; transition: opacity 0.15s; }
  .nodo.visto .borde, .nodo:focus-visible .borde { opacity: 1; }
  .nodo:focus-visible .toque { stroke: var(--hielo); stroke-width: 1.5; stroke-dasharray: 3 3; }
  .sel { fill: none; stroke: var(--hielo); stroke-width: 1; stroke-dasharray: 1 4; stroke-linecap: round; }
  .emblema { fill: none; stroke: #fff; stroke-linecap: round; stroke-linejoin: round; }
  text { text-anchor: middle; }
  .nom { fill: var(--escarcha); font-weight: 600; paint-order: stroke; stroke: var(--noche); stroke-width: 3px; stroke-opacity: 0.6; }
  .cerrado { fill: var(--apagado); }
  .nodo.visto .nom, .nodo.visto .cerrado { fill: #fff; }
  .nodo.elegido .nom { fill: var(--hielo); }

  /* El derrumbe: el nodo late y los fragmentos vuelan a los vecinos. */
  .nodo.cae { animation: latido 0.6s ease-out; }
  @keyframes latido { 40% { filter: brightness(1.8); } }
  .fragmento { animation: vuela 0.9s cubic-bezier(0.3, 0, 0.6, 1) backwards; opacity: 0; }
  @keyframes vuela { 0% { translate: 0 0; opacity: 1; rotate: 0deg; } 85% { opacity: 1; } 100% { translate: var(--dx) var(--dy); opacity: 0; } }

  .ficha { --f: 1rem; display: grid; align-content: center; gap: 0.85rem; align-self: center; padding: 1.15rem 1.25rem 1.3rem; }
  .ficha header { display: flex; align-items: center; gap: 0.9rem; }
  .cara { width: 3.75rem; height: 3.75rem; flex: none; overflow: visible; }
  .cara image { image-rendering: pixelated; }
  h2 { margin: 0; font-size: 1.125rem; font-weight: 600; line-height: 1.2; hyphens: manual; }
  p { margin: 0; }
  .nv { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.3rem; color: var(--tenue); font-size: 0.8125rem; }
  .cuadros { display: inline-flex; gap: 3px; }
  .cuadros i { width: 0.5rem; height: 0.5rem; background: rgb(159 227 245 / 0.14); }
  .hace { font-size: 0.9375rem; color: var(--escarcha); }
  .sig { font-size: 0.8125rem; color: var(--tenue); }
  .estado { color: var(--hielo); font-size: 0.8125rem; }
  .compra { --b: 1.1rem; display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: center; min-height: 3rem; padding: 0.6rem 1.4rem; font-size: 0.9375rem; font-weight: 600; text-align: left; }
  .costo { color: var(--c); }
  .compra[aria-disabled='true'] .costo { color: var(--apagado); }
  .que { padding-top: 0.75rem; border-top: 1px solid var(--borde); color: var(--tenue); font-size: 0.8125rem; line-height: 1.45; }

  /* Ventanas medianas: la ficha más angosta. */
  @media (max-width: 1100px) { .vista { grid-template-columns: minmax(0, 1fr) 17rem; gap: 1.25rem; } }

  /* Celular y ventanas angostas: la red arriba, la ficha debajo y compacta. */
  @media (max-width: 760px) {
    .red { padding: 0.25rem 0 0; }
    .vista { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(12rem, 1fr) auto; gap: 0.5rem; }
    .ficha { align-self: end; gap: 0.5rem; padding: 0.7rem 0.9rem 0.85rem; }
    .ficha header { gap: 0.7rem; }
    .cara { width: 2.75rem; height: 2.75rem; }
    h2 { font-size: 1rem; }
    .nv { margin-top: 0.15rem; font-size: 0.75rem; }
    .hace { font-size: 0.875rem; line-height: 1.35; }
    .sig { font-size: 0.75rem; line-height: 1.35; }
    .compra { min-height: 2.75rem; padding: 0.45rem 1.2rem; font-size: 0.875rem; }
    .que { display: none; } /* en el celular no entra: está en "Cómo funciona" */
  }
  /* Celulares bajos: el siguiente nivel se ve al comprar; la red no puede quedar diminuta. */
  @media (max-width: 760px) and (max-height: 740px) { .sig { display: none; } }
</style>
