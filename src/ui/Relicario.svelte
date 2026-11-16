<script lang="ts">
  // Bloque 8: el Relicario como inventario. Cada Infinito el jugador elige el tipo de su reliquia (Ámbar, con la pila de
  // ese Infinito como cara). Grilla de casilleros; 3 iguales se fusionan (arrastrando una sobre otra o con el botón);
  // solo lo que está en los Engarces da efecto. Las caras salen del generador de miniaturas compartido (miniPilas.ts).
  import { tick as despues } from 'svelte'
  import { flip } from 'svelte/animate'
  import {
    CFG1, MODOS, TIPOS, desequipar, efectoNivel, elegir, equipadas, equipar, escalon, espacios, fusionAutomatica, fusionables,
    fusionar, fusionarTodo, type Pieza, type Regla,
  } from '../core'
  import { caraReliquia } from '../render/miniPilas'
  import { txt } from '../strings'
  import { juego } from './juego.svelte'
  import * as sonido from './sonido'

  const COLORES = ['var(--ambar)', 'var(--coral)', 'var(--jade)', 'var(--violeta)']
  // El sello del tipo, chico en la esquina: Cauce un rombo largo, Cascada un hexágono, Mutaciones una macla (dos rombos).
  const SELLOS: Record<string, string> = {
    cauce: 'M0-9 5.2 0 0 9-5.2 0ZM0-9V9',
    cascada: 'M0-9 7.8-4.5V4.5L0 9-7.8 4.5V-4.5ZM-7.8-4.5 0 0 7.8-4.5M0 0V9',
    mutaciones: 'M-3-8 2 0-3 8-8 0ZM3-8 8 0 3 8-2 0Z',
  }
  const r = txt.cristal.relicario
  const s = $derived(juego.s)
  const rel = $derived(s.relicario)
  const nombre = (t: string) => r.tipos[t]?.[0] ?? t
  const grado = (nivel: number) => r.grado(txt.colores[escalon(nivel).color], escalon(nivel).vuelta)
  const color = (nivel: number) => COLORES[escalon(nivel).color]
  const efecto = (t: string, nivel: number) => r.tipos[t]?.[1](efectoNivel(t, nivel)) ?? ''
  const cuenta = $derived(Math.max(0, Math.ceil(CFG1.relicario.espera_eleccion_s - juego.ofertaS)))
  const ambar = (t: string) => rel.piezas.filter((p) => p.tipo === t && p.nivel === 0).length % 3

  // La grilla: las mejores arriba, las iguales juntas (así se ve qué falta para fusionar).
  const piezas = $derived([...rel.piezas].sort((a, b) => b.nivel - a.nivel || TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo) || a.inf - b.inf || a.id - b.id))
  const casilleros = $derived(Math.ceil(Math.max(CFG1.relicario.casilleros, piezas.length + 1) / 8) * 8)
  const puestas = $derived(new Set(rel.equipadas.slice(0, espacios(s))))
  const grupos = $derived(fusionables(s))
  const totales = $derived(TIPOS.map((t) => [t, equipadas(s).reduce((a, p) => a + (p.tipo === t ? efectoNivel(t, p.nivel) : 0), 0)] as const).filter(([, x]) => x > 0))

  let elegida = $state<number | null>(null)
  const sel = $derived(rel.piezas.find((p) => p.id === elegida) ?? null)
  const grupoDe = (p: Pieza | null) => (p ? grupos.find((g) => g.includes(p.id)) ?? null : null)

  function tomar(t: string) {
    juego.s = elegir(juego.s, t)
    sonido.compra('other')
  }
  const enEngarce = (id: number, i: number) => { juego.s = equipar(juego.s, id, i); elegida = null }
  function engarzarSel() {
    if (!sel) return
    if (puestas.has(sel.id)) juego.s = desequipar(juego.s, sel.id)
    else juego.s = equipar(juego.s, sel.id, Math.min(rel.equipadas.length, espacios(s) - 1))
  }
  function tocarEngarce(i: number) {
    const id = rel.equipadas[i]
    if (sel && sel.id !== id) enEngarce(sel.id, i)
    else if (id !== undefined) elegida = id === elegida ? null : id
  }

  // ---------- fusión con animación: las tres vuelan al lugar de la nueva y se cristalizan ----------
  let celdas: Record<number, HTMLElement> = {}
  let vuelos = $state<{ k: number; x: number; y: number; w: number; c: string }[]>([])
  let destino = $state<{ x: number; y: number; w: number } | null>(null)
  let nacida = $state<number | null>(null)
  let k = 0
  async function conAnimacion(cambio: () => void) {
    const antes = new Map(rel.piezas.map((p) => [p.id, p]))
    const rect = new Map([...antes.keys()].map((id) => [id, celdas[id]?.getBoundingClientRect()]))
    cambio()
    await despues()
    const nuevas = juego.s.relicario.piezas.filter((p) => !antes.has(p.id))
    if (!nuevas.length) return
    sonido.hito('ring')
    const ultima = nuevas.reduce((a, b) => (b.nivel > a.nivel ? b : a))
    nacida = ultima.id
    elegida = null
    const d = celdas[ultima.id]?.getBoundingClientRect()
    const idas = [...antes.keys()].filter((id) => !juego.s.relicario.piezas.some((p) => p.id === id))
    if (d) destino = { x: d.left, y: d.top, w: d.width }
    vuelos = idas.map((id) => rect.get(id)).filter((b): b is DOMRect => !!b).map((b, i) => ({ k: k++, x: b.left, y: b.top, w: b.width, c: color(antes.get(idas[i])!.nivel) }))
    setTimeout(() => { vuelos = []; destino = null }, 700)
    setTimeout(() => (nacida = null), 1500)
  }
  const fusionarGrupo = (g: number[]) => conAnimacion(() => (juego.s = fusionar(juego.s, g)))
  const fusionarTodas = () => conAnimacion(() => (juego.s = fusionarTodo(juego.s)))

  // Arrastre (HTML5, en escritorio): a un engarce lo engarza; sobre otra igual, fusiona esas dos con la más vieja que quede.
  let arrastrada: number | null = null
  function soltarSobre(p: Pieza) {
    const a = rel.piezas.find((x) => x.id === arrastrada)
    if (!a || a.id === p.id || a.tipo !== p.tipo || a.nivel !== p.nivel) return
    const tercera = piezas.filter((x) => x.tipo === p.tipo && x.nivel === p.nivel && x.id !== a.id && x.id !== p.id).sort((x, y) => x.inf - y.inf)[0]
    if (tercera) fusionarGrupo([a.id, p.id, tercera.id])
  }

  // La fusión automática (Engarces II) llega sin pasar por acá: la pieza nueva igual se cristaliza.
  let conocidas = new Set(juego.s.relicario.piezas.map((p) => p.id))
  $effect(() => {
    const nueva = rel.piezas.filter((p) => !conocidas.has(p.id) && p.nivel > 0)
    if (nueva.length && nacida === null) {
      nacida = nueva[0].id
      setTimeout(() => (nacida = null), 1500)
    }
    conocidas = new Set(rel.piezas.map((p) => p.id))
  })

  // ---------- regla automática (provisoria hasta el panel de Automatización, sesión 8) ----------
  const regla = (cambio: Partial<Regla>) => (juego.s = { ...juego.s, relicario: { ...juego.s.relicario, regla: { ...juego.s.relicario.regla, ...cambio } } })
  const subir = (i: number) => { const o = [...rel.regla.orden]; [o[i - 1], o[i]] = [o[i], o[i - 1]]; regla({ orden: o }) }
</script>

{#snippet sello(t: string)}
  <svg class="sello" viewBox="-10 -10 20 20" aria-hidden="true"><path d={SELLOS[t] ?? SELLOS.cascada} /></svg>
{/snippet}
{#snippet cara(p: { foto: string; nivel: number }, clase = '')}
  <canvas class="cara {clase}" use:caraReliquia={{ foto: p.foto, nivel: p.nivel }} aria-hidden="true"></canvas>
{/snippet}

<section class="relicario" aria-label={txt.cristal.pantallas.relicario}>
  {#if rel.pendiente}
    <div class="eleccion">
      <div class="nueva" style:--c={color(0)}>{@render cara({ foto: rel.foto, nivel: 0 })}</div>
      <div class="texto">
        <h2>{r.elegir}</h2>
        <p>{r.elegirQue}</p>
        <p class="num">{r.cuenta(cuenta)}</p>
      </div>
      <div class="tipos">
        {#each TIPOS as t (t)}
          <button class="gema" style:--c={color(0)} onclick={() => tomar(t)}>
            {@render sello(t)}
            <b>{nombre(t)}</b>
            <span>{efecto(t, 0)}</span>
            <small>{r.ambar(ambar(t))}</small>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="mesa">
    <div class="izq">
      <div class="engarces" role="group" aria-label={r.engarces}>
        <h2>{r.engarces}</h2>
        <div class="huecos">
          {#each { length: espacios(s) } as _, i}
            {@const p = rel.piezas.find((x) => x.id === rel.equipadas[i])}
            <button
              class="hueco" class:lleno={!!p} class:elegido={!!p && p.id === elegida} style:--c={p ? color(p.nivel) : undefined}
              aria-label={p ? r.pieza(nombre(p.tipo), grado(p.nivel)) : r.vacio}
              ondragover={(e) => e.preventDefault()} ondrop={(e) => { e.preventDefault(); if (arrastrada !== null) enEngarce(arrastrada, i) }}
              onclick={() => tocarEngarce(i)}
            >
              {#if p}{@render cara(p)}{@render sello(p.tipo)}{/if}
            </button>
          {/each}
        </div>
        {#if totales.length}
          <ul class="totales">
            {#each totales as [t, x] (t)}<li>{@render sello(t)}{r.tipos[t][1](x)}</li>{/each}
          </ul>
        {:else}
          <small>{r.nada}</small>
        {/if}
      </div>

      <div class="detalle placa" class:vacio={!sel} style:--c={sel ? color(sel.nivel) : undefined} aria-live="polite">
        {#if sel}
          {@const g = grupoDe(sel)}
          <div class="ficha">{@render cara(sel)}{@render sello(sel.tipo)}</div>
          <b>{nombre(sel.tipo)} <span style:color={color(sel.nivel)}>{grado(sel.nivel)}</span></b>
          <span>{efecto(sel.tipo, sel.nivel)}</span>
          <small>{r.deInfinito(sel.inf)} · {puestas.has(sel.id) ? r.puesta : r.suelta}</small>
          <div class="acciones">
            <button class="gema" onclick={engarzarSel}>{puestas.has(sel.id) ? r.quitar('') : r.engarzar('')}</button>
            {#if g}<button class="gema" style:--c={color(sel.nivel + 1)} onclick={() => fusionarGrupo(g)}>{r.fusionar} · {r.fusion(grado(sel.nivel + 1))}</button>{/if}
          </div>
        {:else}
          <small>{r.comoEngarzar}</small>
        {/if}
      </div>
    </div>

    <div class="inventario">
      <div class="cabeza">
        <h2>{r.inventario}</h2>
        {#if grupos.length}<button class="gema" onclick={fusionarTodas}>{r.fusionarTodo}</button>{/if}
      </div>
      <div class="grilla" role="listbox" aria-label={r.inventario}>
        {#each piezas as p (p.id)}
          <button
            bind:this={celdas[p.id]} animate:flip={{ duration: 300 }}
            class="pieza" class:puesta={puestas.has(p.id)} class:elegido={p.id === elegida} class:mas={escalon(p.nivel).vuelta > 0}
            class:lista={!!grupoDe(p)} class:nace={p.id === nacida} style:--c={color(p.nivel)}
            role="option" aria-selected={p.id === elegida} aria-label="{r.pieza(nombre(p.tipo), grado(p.nivel))}{puestas.has(p.id) ? `, ${r.puesta}` : ''}"
            draggable="true" ondragstart={(e) => { arrastrada = p.id; e.dataTransfer?.setData('text/plain', String(p.id)) }} ondragend={() => (arrastrada = null)}
            ondragover={(e) => e.preventDefault()} ondrop={(e) => { e.preventDefault(); soltarSobre(p) }}
            onclick={() => (elegida = elegida === p.id ? null : p.id)}
          >
            {@render cara(p)}{@render sello(p.tipo)}
            {#if escalon(p.nivel).vuelta}<i class="vuelta">+{escalon(p.nivel).vuelta}</i>{/if}
          </button>
        {/each}
        {#each { length: casilleros - piezas.length } as _}<span class="libre"></span>{/each}
      </div>
      {#if !piezas.length}<small>{r.inventarioVacio}</small>{/if}
    </div>
  </div>

  <details class="regla placa">
    <summary>{r.regla.titulo}: <b>{r.regla.modos[rel.regla.modo]}</b></summary>
    <small>{r.regla.nota}</small>
    <div class="modos" role="radiogroup" aria-label={r.regla.titulo}>
      {#each MODOS as m (m)}
        <label><input type="radio" name="modo" checked={rel.regla.modo === m} onchange={() => regla({ modo: m })} />{r.regla.modos[m]}</label>
      {/each}
    </div>
    {#if rel.regla.modo === 'fijo' || rel.regla.modo === 'prioridad'}
      <ol class="orden" aria-label={r.regla.orden}>
        {#each rel.regla.orden as t, i (t)}
          <li animate:flip={{ duration: 200 }}>{@render sello(t)}{nombre(t)}{#if i}<button onclick={() => subir(i)} aria-label={r.regla.subir(nombre(t))}>↑</button>{/if}</li>
        {/each}
      </ol>
    {/if}
    <label><input type="checkbox" checked={rel.regla.fusionar} disabled={!fusionAutomatica(s)} onchange={(e) => regla({ fusionar: e.currentTarget.checked })} />{r.regla.fusionar}</label>
    <label><input type="checkbox" checked={rel.regla.equipar} onchange={(e) => regla({ equipar: e.currentTarget.checked })} />{r.regla.equipar}</label>
  </details>

  {#if destino}
    {#each vuelos as v (v.k)}
      <i class="vuelo" style:--c={v.c} style:left="{v.x}px" style:top="{v.y}px" style:width="{v.w}px" style:--dx="{destino.x - v.x}px" style:--dy="{destino.y - v.y}px" style:--e={destino.w / v.w} aria-hidden="true"></i>
    {/each}
  {/if}
</section>

<style>
  .relicario { display: grid; justify-items: center; align-content: start; gap: 1.5rem; padding: 1.5rem 0; width: min(100%, 60rem); margin-inline: auto; animation: entrar 0.3s ease-out; }
  @keyframes entrar { from { opacity: 0; } }
  h2 { margin: 0; font-size: 1.0625rem; font-weight: 600; }
  p { margin: 0; color: var(--tenue); text-wrap: balance; }
  small { color: var(--apagado); font-size: 0.8125rem; text-wrap: balance; }
  button { font: inherit; color: var(--escarcha); cursor: pointer; }

  .sello { width: 1rem; height: 1rem; fill: rgb(4 6 13 / 0.55); stroke: var(--escarcha); stroke-width: 1.4; stroke-linejoin: round; overflow: visible; }
  /* La cara: la pila del Infinito, con un vidrio encima (arista clara arriba, sombra abajo). */
  .cara { display: block; width: 100%; height: 100%; border-radius: 0; }

  /* ---------- elegir el tipo ---------- */
  .eleccion { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1.25rem; align-items: center; width: 100%; }
  .nueva { width: 6.5rem; aspect-ratio: 1; clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); background: var(--hielo-hondo); filter: drop-shadow(0 0 0.6rem color-mix(in srgb, var(--c) 35%, transparent)); animation: latir 2.4s ease-in-out infinite; }
  @keyframes latir { 50% { filter: drop-shadow(0 0 1rem color-mix(in srgb, var(--c) 55%, transparent)); } }
  .texto { display: grid; gap: 0.25rem; }
  .tipos { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
  .tipos button { display: grid; justify-items: center; align-content: start; gap: 0.3rem; padding: 1rem 0.75rem 1.1rem; text-align: center; }
  .tipos .sello { width: 1.75rem; height: 1.75rem; stroke: var(--c); fill: color-mix(in srgb, var(--c) 25%, transparent); }
  .tipos span { color: var(--tenue); font-size: 0.875rem; }

  /* ---------- mesa: engarces + detalle a la izquierda, inventario a la derecha ---------- */
  .mesa { display: grid; grid-template-columns: 17rem 1fr; gap: 1.5rem; width: 100%; align-items: start; }
  .izq { display: grid; gap: 1rem; }
  .engarces { display: grid; justify-items: center; gap: 0.6rem; }
  .huecos { display: flex; gap: 0.5rem; justify-content: center; }
  /* El engarce: un hueco hexagonal. Vacío, hielo hundido; con su reliquia, la cara con la luz de su color. */
  .hueco {
    position: relative; width: 4.75rem; aspect-ratio: 0.88; padding: 0; border: 0;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
    background: radial-gradient(closest-side, transparent 55%, rgb(0 0 0 / 0.5)), var(--tex-escarcha), var(--hielo-hondo);
  }
  .hueco::after { content: ''; position: absolute; inset: 0; background: linear-gradient(160deg, rgb(255 255 255 / 0.22), transparent 35%, transparent 70%, color-mix(in srgb, var(--c, var(--hielo)) 30%, transparent)); pointer-events: none; }
  .hueco.lleno { background: var(--hielo-hondo); }
  .hueco .sello, .pieza .sello, .ficha .sello { position: absolute; right: 8%; bottom: 8%; }
  .hueco .sello { right: 50%; bottom: 4%; translate: 50% 0; }
  .hueco.elegido { outline: none; filter: brightness(1.25); }
  .totales { display: grid; gap: 0.2rem; margin: 0; padding: 0; list-style: none; color: var(--tenue); font-size: 0.875rem; }
  .totales li { display: flex; gap: 0.4rem; align-items: center; }

  .detalle { display: grid; justify-items: center; gap: 0.35rem; padding: 1rem; text-align: center; min-height: 9rem; align-content: center; }
  .detalle.vacio { --hielo-arista: linear-gradient(transparent, transparent); background: none; }
  .ficha { position: relative; width: 5.5rem; aspect-ratio: 1; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 70%, transparent); }
  .detalle > span { color: var(--tenue); font-size: 0.875rem; }
  .acciones { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 0.4rem; }
  .acciones button { padding: 0.5rem 1rem; font-size: 0.875rem; }

  /* ---------- inventario ---------- */
  .inventario { display: grid; gap: 0.6rem; }
  .cabeza { display: flex; align-items: center; justify-content: space-between; min-height: 2.25rem; }
  .cabeza button { padding: 0.4rem 1rem; font-size: 0.875rem; }
  .grilla { display: grid; grid-template-columns: repeat(8, 1fr); gap: 0.375rem; }
  .libre, .pieza { aspect-ratio: 1; }
  .libre { background: rgb(159 227 245 / 0.035); box-shadow: inset 0 0 0 1px rgb(159 227 245 / 0.07); clip-path: polygon(14% 0, 100% 0, 100% 86%, 86% 100%, 0 100%, 0 14%); }
  /* Cada reliquia: la cara con esquinas talladas, arista de su color y un reflejo de vidrio arriba. */
  .pieza {
    position: relative; padding: 0; border: 0; background: var(--hielo-hondo);
    clip-path: polygon(14% 0, 100% 0, 100% 86%, 86% 100%, 0 100%, 0 14%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 55%, transparent);
    transition: filter 0.2s, translate 0.2s;
  }
  .pieza::after, .ficha::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(155deg, rgb(255 255 255 / 0.28), transparent 30%), linear-gradient(transparent 70%, color-mix(in srgb, var(--c) 28%, transparent));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 65%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.45);
  }
  .pieza:hover, .pieza:focus-visible { filter: brightness(1.2); translate: 0 -2px; }
  .pieza.elegido { outline: 2px solid var(--escarcha); outline-offset: -2px; }
  /* Engarzada: un cristal de hielo en la esquina de arriba. */
  .pieza.puesta::before { content: ''; position: absolute; z-index: 1; left: 6%; top: 6%; width: 18%; aspect-ratio: 0.7; background: var(--hielo); clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); }
  /* Lista para fusionar: un brillo lento en la arista. */
  .pieza.lista::after { animation: lista 2.6s ease-in-out infinite; }
  @keyframes lista { 50% { box-shadow: inset 0 0 0 2px var(--c), inset 0 1px 0 rgb(255 255 255 / 0.6); } }
  /* Segunda vuelta de la escalera (Ámbar +1…): más brillo. */
  .pieza.mas { filter: saturate(1.3) brightness(1.15); box-shadow: inset 0 0 0 2px var(--c), 0 0 0.6rem var(--c); }
  .vuelta { position: absolute; left: 8%; bottom: 6%; font-style: normal; font-size: 0.6875rem; font-weight: 700; color: var(--escarcha); text-shadow: 0 0 0.3rem var(--c); }

  /* Fusión: tres cristales vuelan al lugar de la nueva y la nueva nace con un destello de su color. */
  .vuelo {
    position: fixed; z-index: 30; aspect-ratio: 1; pointer-events: none; background: var(--c);
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); opacity: 0.85; animation: volar 0.6s cubic-bezier(0.55, 0, 0.75, 0.3) forwards;
  }
  @keyframes volar { to { translate: var(--dx) var(--dy); scale: calc(var(--e) * 0.6); opacity: 0.2; } }
  .pieza.nace { animation: nacer 0.9s 0.5s cubic-bezier(0.2, 1.6, 0.4, 1) backwards; }
  @keyframes nacer { from { scale: 0.3; filter: brightness(4) saturate(0); } }

  /* ---------- regla automática (provisoria) ---------- */
  .regla { width: 100%; display: grid; gap: 0.6rem; padding: 0.9rem 1.1rem; }
  .regla summary { cursor: pointer; color: var(--tenue); }
  .regla summary b { color: var(--escarcha); font-weight: 600; }
  .regla label { display: flex; gap: 0.45rem; align-items: center; font-size: 0.875rem; color: var(--tenue); }
  .regla input { accent-color: var(--hielo); }
  .modos { display: flex; flex-wrap: wrap; gap: 0.4rem 1.2rem; }
  .orden { display: flex; gap: 1rem; margin: 0; padding-left: 1.2rem; font-size: 0.875rem; }
  .orden li { display: flex; gap: 0.35rem; align-items: center; }
  .orden button { padding: 0 0.4rem; background: none; border: 1px solid var(--hielo-linea); }

  :global(.quieto) .vuelo { display: none; }
  :global(.quieto) .pieza.nace, :global(.quieto) .pieza.lista::after, :global(.quieto) .nueva { animation: none; }
  /* Reducir destellos: lo que late queda fijo (la fusión sí se anima: pasa una vez y la pidió el jugador). */
  :global(.calma) .pieza.lista::after { animation: none; box-shadow: inset 0 0 0 2px var(--c), inset 0 1px 0 rgb(255 255 255 / 0.5); }
  :global(.calma) .nueva { animation: none; }

  @media (max-width: 760px) {
    .mesa { grid-template-columns: 1fr; }
    .grilla { grid-template-columns: repeat(6, 1fr); }
    .eleccion { grid-template-columns: 1fr; justify-items: center; text-align: center; }
    /* Una gema por fila: el sello a la izquierda, el texto a la derecha. */
    .tipos { grid-template-columns: 1fr; gap: 0.5rem; width: 100%; }
    .tipos button { grid-template-columns: auto 1fr; justify-items: start; gap: 0.1rem 0.9rem; padding: 0.7rem 1.6rem; text-align: left; }
    .tipos .sello { grid-row: span 3; align-self: center; }
  }
</style>
