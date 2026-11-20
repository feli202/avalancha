<script lang="ts">
  // SPEC_CAPA1 §6 y bloque 9 (boceto escarcha-v3) de CORRECCIONES_CAPA1: la Red plana, en SVG. Cada nodo es una mini pila
  // de arena teñida con el color de su nivel; los completos se unen a sus vecinos con escarcha. La red llena su caja
  // (el viewBox se ajusta a los nodos) y la ficha del elegido va al costado (debajo en el celular).
  import {
    ABRE_RED, ANILLO3, NIVEL_MAX_RED, NODOS, abierto, anillo, comprarRed, costoRed, escarchaAbierta, nivelRed, puedeComprarRed, requisitoRed, vecinos,
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
  // Tocar un cuadro de nivel muestra qué da ese nivel; vale solo para el nodo en que se tocó (cambiar de nodo lo olvida).
  let ver = $state<{ id: string; n: number } | null>(null)
  const verN = $derived(ver?.id === elegido ? ver.n : 0)
  const n = $derived(nivelRed(s, elegido))
  // Sorpresa: lo que da un nodo se ve recién cuando se abre. Los del hielo, además, no dicen ni su nombre.
  const oculto = (id: string) => bajoHielo(id) || (!abierto(s, id) && nivelRed(s, id) === 0)
  const titulo = (id: string) => (bajoHielo(id) ? r.bajoHielo : nombre(id, false))
  const estado = $derived(
    n >= NIVEL_MAX_RED ? r.completo : bajoHielo(elegido) ? r.hielo : !requisitoRed(s, elegido) ? r.requiere : !abierto(s, elegido) ? r.cerrado : null,
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
    return { id, x: px * M.dx, y: -py * M.dy, r: modo === 'hielo' ? 26 : anillo(id) <= 1 ? 38 : 32, modo, n: k }
  }))
  const por = $derived(new Map(vistas.map((v) => [v.id, v])))
  const radio = $derived(Math.max(...ids.map(anillo)))

  // Más allá de los nodos: una trama de puntos que se apaga con la distancia (dos anillos más), para que se lea que la
  // Red sigue. Es solo dibujo: los nodos reales salen de config.
  const trama = $derived.by(() => {
    const out: { x: number; y: number; o: number }[] = []
    for (let x = -radio - 2; x <= radio + 2; x++) for (let y = -radio - 2; y <= radio + 2; y++) {
      const a = Math.abs(x) + Math.abs(y)
      if (a > radio && a <= radio + 2) out.push({ x: x * M.dx, y: -y * M.dy, o: a === radio + 1 ? 0.22 : 0.1 })
    }
    return out
  })

  // El encuadre: los nodos que ya no están bajo el hielo (sin los del hielo, que achicarían la red).
  const caja = $derived.by(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const v of vistas) {
      if (v.modo === 'hielo') continue
      const w = Math.max(v.r + 4, M.medio)
      x0 = Math.min(x0, v.x - w); x1 = Math.max(x1, v.x + w)
      y0 = Math.min(y0, v.y - v.r - 20); y1 = Math.max(y1, v.y + v.r + M.fila + 18)
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  })

  // Zoom y paneo, solo dentro de la Red (como el de la pila: barra, rueda, pellizco; doble clic en la barra = encuadre).
  // z = 1 es el encuadre; el mínimo deja ver la trama entera y el máximo, un nodo de cerca.
  const Z_MAX = 3
  const zMin = $derived(Math.min(1, caja.w / ((2 * radio + 3) * M.dx), caja.h / ((2 * radio + 3) * M.dy)))
  let z = $state(1)
  let centro = $state<[number, number] | null>(null) // null = el centro del encuadre
  const vb = $derived.by(() => {
    const w = caja.w / z, h = caja.h / z
    const [cx, cy] = centro ?? [caja.x + caja.w / 2, caja.y + caja.h / 2]
    return `${cx - w / 2} ${cy - h / 2} ${w} ${h}`
  })
  const zoomT = $derived(Math.log(z / zMin) / Math.log(Z_MAX / zMin))
  const lim = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))

  let svg = $state<SVGSVGElement>()
  /** Punto de pantalla → unidades del dibujo. */
  function aDibujo(px: number, py: number) {
    const p = svg!.createSVGPoint()
    p.x = px; p.y = py
    const q = p.matrixTransform(svg!.getScreenCTM()!.inverse())
    return [q.x, q.y] as [number, number]
  }
  /** Lleva el zoom a `nz` dejando quieto el punto `p` del dibujo (el del puntero). */
  function zoomA(nz: number, p?: [number, number]) {
    nz = lim(nz, zMin, Z_MAX)
    const [cx, cy] = centro ?? [caja.x + caja.w / 2, caja.y + caja.h / 2]
    const [px, py] = p ?? [cx, cy], f = z / nz
    z = nz
    mover(px + (cx - px) * f, py + (cy - py) * f)
  }
  /** Pone el centro sin dejar que la Red se vaya de la vista. */
  function mover(cx: number, cy: number) {
    const rx = (radio + 1) * M.dx, ry = (radio + 1) * M.dy
    centro = [lim(cx, -rx, rx), lim(cy, -ry, ry)]
  }
  function encuadre() { z = 1; centro = null }

  function rueda(e: WheelEvent) {
    e.preventDefault()
    zoomA(z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), aDibujo(e.clientX, e.clientY))
  }

  // Arrastre (un dedo o el mouse) y pellizco (dos dedos). Un toque sin moverse sigue eligiendo el nodo.
  const dedos = new Map<number, [number, number]>()
  let arrastro = $state(false)
  let pellizco = 0
  function bajar(e: PointerEvent) {
    dedos.set(e.pointerId, [e.clientX, e.clientY])
    if (dedos.size === 1) arrastro = false
    if (dedos.size === 2) pellizco = distancia()
  }
  const distancia = () => { const [a, b] = [...dedos.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]) }
  function mover1(e: PointerEvent) {
    const antes = dedos.get(e.pointerId)
    if (!antes) return
    const ahora: [number, number] = [e.clientX, e.clientY]
    if (dedos.size === 2) {
      dedos.set(e.pointerId, ahora)
      const d = distancia(), [a, b] = [...dedos.values()]
      if (pellizco) zoomA(z * (d / pellizco), aDibujo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))
      pellizco = d
      arrastro = true
      return
    }
    if (!arrastro && Math.hypot(ahora[0] - antes[0], ahora[1] - antes[1]) < 5) return
    if (!arrastro) try { svg!.setPointerCapture(e.pointerId) } catch { /* puntero ya suelto */ } // recién al moverse: un toque quieto tiene que llegar al nodo
    arrastro = true
    const [x0, y0] = aDibujo(...antes), [x1, y1] = aDibujo(...ahora)
    const [cx, cy] = centro ?? [caja.x + caja.w / 2, caja.y + caja.h / 2]
    mover(cx - (x1 - x0), cy - (y1 - y0))
    dedos.set(e.pointerId, ahora)
  }
  function subir(e: PointerEvent) {
    dedos.delete(e.pointerId)
    pellizco = 0
  }
  // Después de arrastrar, el clic que sigue no elige nada.
  function clicCaptura(e: MouseEvent) {
    if (arrastro) { e.stopPropagation(); arrastro = false }
  }

  // Escarcha: de cada nodo que ya abre (ABRE_RED) a sus vecinos (una sola vez entre dos que abren).
  const ramas = $derived.by(() => {
    const out: [string, number][] = []
    for (const a of vistas) if (a.n >= ABRE_RED) for (const id of vecinos(a.id)) {
      const b = por.get(id)!
      if (b.n >= ABRE_RED && anillo(b.id) < anillo(a.id)) continue
      const L = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / L, uy = (b.y - a.y) / L
      rama(a.x + ux * (a.r + 3), a.y + uy * (a.r + 3), b.x - ux * (b.r + 3), b.y - uy * (b.r + 3), semilla(a.id + b.id), 1.1, 1, out)
    }
    return out
  })

  // C11: al abrirse la Escarcha, el hielo grueso del anillo 3 se derrite (una sola vez en la partida, la primera vez que se
  // mira la Red con la Escarcha abierta; se anota en `vistos`, que va al guardado). Con Reducir destellos solo se anota.
  let derrite = $state(false)
  $effect(() => {
    if (!escarchaAbierta(s) || juego.vistos.red_anillo3) return
    juego.vistos = { ...juego.vistos, red_anillo3: true }
    if (ajustes.reducirDestellos) return
    derrite = true
    sonido.hito('ring')
    setTimeout(() => (derrite = false), 3800)
  })
  const orden3 = [...ANILLO3]

  const colorDe = (v: Vista) => (v.modo === 'cristal' ? hex[v.n - 1] : null)

  // El derrumbe al llegar al nivel que abre a los vecinos: un fragmento de cristal sale hacia cada uno.
  let derrumbe = $state<{ id: string; k: number } | null>(null)
  let k = 0

  function comprar() {
    const id = elegido, antes = juego.s
    const nuevo = comprarRed(antes, id)
    if (nuevo === antes) return
    sonido.compra('other')
    if (nivelRed(nuevo, id) === ABRE_RED && !ajustes.reducirDestellos) {
      const esta = { id, k: ++k }
      derrumbe = esta
      setTimeout(() => { if (derrumbe === esta) derrumbe = null }, 1400)
    }
    if (nivelRed(nuevo, id) >= NIVEL_MAX_RED) {
      sonido.derrumbe(3000)
      sonido.hito('ring')
    }
    juego.s = nuevo
    ver = null // la ficha vuelve a "Ahora · Siguiente" con el nivel nuevo
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
      <svg bind:this={svg} viewBox={vb} preserveAspectRatio="xMidYMid meet" role="group" aria-label={r.escena} class:movida={arrastro}
        onwheel={rueda} onpointerdown={bajar} onpointermove={mover1} onpointerup={subir} onpointercancel={subir} onclickcapture={clicCaptura}>
        <defs>
          <filter id="red-halo" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id="red-halo-cara" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
          <clipPath id="red-c38"><circle r="38" /></clipPath>
          <clipPath id="red-c32"><circle r="32" /></clipPath>
        </defs>
        {#each trama as p}<circle class="punto" cx={p.x} cy={p.y} r="4" opacity={p.o} />{/each}
        <!-- Caminos bajo el hielo: de cada nodo del hielo a sus vecinos ya a la vista. -->
        <g class="camino">
          {#each vistas as a (a.id)}{#if a.modo === 'hielo'}{#each vecinos(a.id) as id}{@const b = por.get(id)!}{#if b.modo !== 'hielo'}
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          {/if}{/each}{/if}{/each}
        </g>
        <g class="halo" filter="url(#red-halo)">{#each ramas as [d, w]}{#if w >= 1}<path {d} />{/if}{/each}</g>
        <g class="ramas">{#each ramas as [d, w]}<path {d} stroke-width={w} opacity={w >= 1 ? 0.9 : 0.55} />{/each}</g>

        {#each vistas as v (v.id)}
          <g
              class="nodo {v.modo}" class:elegido={v.id === elegido} class:visto={v.id === hover}
              class:cae={derrumbe?.id === v.id} transform="translate({v.x} {v.y})" data-guia={v.id === orden3[0] ? 'c1_anillo3' : undefined}
              role="button" tabindex="0" aria-pressed={v.id === elegido} aria-label="{titulo(v.id)}, {r.nivel(v.n)}"
              onclick={() => (elegido = v.id)} onkeydown={(e) => tecla(e, v.id)}
              onpointerenter={() => (hover = v.id)} onpointerleave={() => (hover = null)}
            >
              <circle class="toque" r={v.r + 12} />
              {#if v.modo === 'hielo'}
                <!-- Lo que viene: un nodo que todavía está bajo el hielo, sin nombre. -->
                <circle class="bloque" r={v.r} />
                <path class="copo" d="M0-7V7M-6-3.5 6 3.5M-6 3.5 6-3.5" transform="scale({v.r / 22})" />
                {#if v.id === elegido}<circle class="sel" r={v.r + 7} />{/if}
              {:else if v.modo === 'escarcha'}
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
              {#if derrite && ANILLO3.has(v.id)}
                <!-- El bloque de hielo grueso: se agrieta, gotea y se derrite (uno detrás de otro alrededor del rombo). -->
                <g class="derrite" style:--d="{orden3.indexOf(v.id) * 110}ms">
                  <circle class="grueso" r={v.r + 8} />
                  <path class="grieta" d="M{-v.r * 0.6} {-v.r * 0.2}L{-v.r * 0.1} {v.r * 0.1}L{v.r * 0.2} {-v.r * 0.4}M{-v.r * 0.1} {v.r * 0.1}L{v.r * 0.05} {v.r * 0.6}" />
                  {#each [-0.45, 0.1, 0.5] as dx, j}
                    <rect class="gota" x={dx * v.r - 1.5} y={v.r * 0.6} width="3" height="5" style:--g="{j * 160}ms" />
                  {/each}
                </g>
              {/if}
            </g>
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
      <input
        class="zoom" type="range" min="0" max="1" step="0.01" value={zoomT} aria-label={r.zoom} title={r.zoomPista}
        oninput={(e) => zoomA(zMin * (Z_MAX / zMin) ** +e.currentTarget.value)} ondblclick={encuadre}
      />
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
          {#if EMBLEMA[elegido] && !oculto(elegido)}<path class="emblema" d={EMBLEMA[elegido]} transform="scale(1.25)" stroke-width="1.1" />{/if}
        </svg>
        <div>
          <h2>{titulo(elegido)}</h2>
          <p class="nv num">
            <span class="cuadros">{#each COLORES as c, i}<button style:--c="var({c})" class:lleno={i < n} aria-pressed={verN === i + 1} disabled={oculto(elegido)}
              aria-label={r.verNivel(i + 1, txt.colores[i])} title={r.verNivel(i + 1, txt.colores[i])}
              onclick={() => (ver = verN === i + 1 ? null : { id: elegido, n: i + 1 })}><i></i></button>{/each}</span>
            {r.nv(n, txt.colores[n - 1])}
          </p>
        </div>
      </header>
      {#if verN}<p class="sig">{r.enNivel(verN, txt.colores[verN - 1])}</p><p class="hace">{efecto(elegido, verN)}</p>
      {:else}
        {#if oculto(elegido)}<p class="sig">{r.sorpresa}</p>
        {:else}
          {#key n}
            <p class="hace" class:fresco={n > 0}>{#if n > 0}<b>{r.ahoraRotulo}</b> {efecto(elegido, n)}{:else}<b>{r.nivel1}</b> {efecto(elegido, 1)}{/if}</p>
            {#if n > 0 && n < NIVEL_MAX_RED}<p class="sig"><b>{r.siguienteRotulo}</b> {efecto(elegido, n + 1)}</p>{/if}
          {/key}
        {/if}
      {/if}
      {#if estado}<p class="estado">{estado}</p>{/if}
      {#if n < NIVEL_MAX_RED && !oculto(elegido)}
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
  /* El zoom queda adentro de esta caja; los bordes se desvanecen: la Red sigue más allá. */
  .escena > svg {
    position: absolute; inset: 0; width: 100%; height: 100%; font-family: inherit; touch-action: none; cursor: grab;
    --borde-fundido: 1.5rem;
    mask-image: linear-gradient(to right, transparent, #000 var(--borde-fundido), #000 calc(100% - var(--borde-fundido)), transparent),
      linear-gradient(to bottom, transparent, #000 var(--borde-fundido), #000 calc(100% - var(--borde-fundido)), transparent);
    mask-composite: intersect;
  }
  .escena > svg.movida { cursor: grabbing; }
  /* La barra de zoom, como la de la pila: abajo a la derecha, tenue hasta que se usa. */
  .zoom {
    position: absolute; right: 0; bottom: 0; z-index: 1; width: 7rem; height: 2.75rem; margin: 0;
    accent-color: var(--tinta); cursor: pointer; opacity: 0.45; transition: opacity 0.15s;
  }
  .zoom:hover, .zoom:focus-visible { opacity: 1; }
  .camino line { stroke: var(--hielo); stroke-width: 1; stroke-dasharray: 2 6; opacity: 0.22; }
  .bloque { fill: rgb(159 227 245 / 0.05); stroke: var(--hielo); stroke-width: 1; stroke-dasharray: 3 4; opacity: 0.45; }
  .copo { fill: none; stroke: var(--hielo); stroke-width: 1.2; stroke-linecap: round; opacity: 0.35; }
  .nodo.hielo.visto .bloque, .nodo.hielo.elegido .bloque { opacity: 0.9; }

  .halo path { stroke: var(--hielo); stroke-width: 3; fill: none; opacity: 0.45; stroke-linecap: round; }
  .ramas path { stroke: var(--escarcha); fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .punto { fill: var(--hielo); }

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

  /* C11, deshielo del anillo 3: el bloque grueso se agrieta, gotea y se va; el nodo de abajo aparece. */
  .derrite { pointer-events: none; animation: derretir 2.2s ease-in var(--d) both; transform-box: fill-box; transform-origin: center; }
  .grueso { fill: rgb(159 227 245 / 0.4); stroke: var(--hielo); stroke-width: 2; }
  .grieta { fill: none; stroke: #fff; stroke-width: 1.2; stroke-linecap: round; opacity: 0; animation: grieta 0.5s ease-out calc(var(--d) + 0.3s) forwards; }
  .gota { fill: var(--hielo); animation: gotea 1.1s ease-in calc(var(--d) + 0.7s + var(--g)) both; }
  @keyframes derretir { 0%, 35% { opacity: 1; scale: 1; } 100% { opacity: 0; scale: 1 0.6; translate: 0 10px; } }
  @keyframes grieta { to { opacity: 0.9; } }
  @keyframes gotea { 0% { opacity: 0; translate: 0 0; } 20% { opacity: 1; } 100% { opacity: 0; translate: 0 34px; } }

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
  .cuadros { display: inline-flex; }
  /* Cada cuadro es un botón con área de toque más grande que el cuadro dibujado. */
  .cuadros button { display: grid; place-items: center; width: 1.5rem; height: 1.5rem; /* 24 px: objetivo táctil mínimo (WCAG 2.5.8); el cuadro visible sigue de 8 px */ margin: -0.5rem 0; padding: 0; border: 0; background: none; cursor: pointer; }
  .cuadros button:disabled { cursor: default; }
  .cuadros i { width: 0.5rem; height: 0.5rem; background: rgb(159 227 245 / 0.14); transition: transform 0.15s; }
  .cuadros .lleno i { background: var(--c); }
  .cuadros button[aria-pressed='true'] i { outline: 1px solid var(--c); outline-offset: 2px; background: color-mix(in srgb, var(--c) 55%, transparent); }
  .cuadros .lleno[aria-pressed='true'] i { background: var(--c); }
  .cuadros button:not(:disabled):hover i { transform: scale(1.3); }
  .cuadros button:focus-visible { outline: 2px solid var(--hielo); outline-offset: -2px; }
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
    /* Con el dedo: cuadros de 44 px (el visible sigue de 8 px); los márgenes negativos no agrandan la ficha. */
    .cuadros button { width: 2.75rem; height: 2.75rem; margin: -1rem -0.3rem; }
  }
  .hace b, .sig b { font-weight: 600; color: var(--escarcha); }
  .fresco { animation: fresco 0.6s ease-out; }
  @keyframes fresco { from { color: var(--escarcha); text-shadow: 0 0 0.6rem var(--hielo); } }
  /* Celulares bajos: el siguiente nivel se ve al comprar; la red no puede quedar diminuta. */
  @media (max-width: 760px) and (max-height: 740px) { .sig { display: none; } }
</style>
