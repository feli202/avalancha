<script lang="ts">
  // Bloque 8: el Relicario como inventario. Cada Infinito el jugador elige el tipo de su reliquia (Ámbar, con la pila de
  // ese Infinito como cara). Grilla de casilleros; 3 iguales se fusionan (arrastrando una sobre otra o con el botón);
  // solo lo que está en los Engarces da efecto. Las caras salen del generador de miniaturas compartido (miniPilas.ts).
  // Pantalla fija (CLAUDE.md): todo entra en la ventana y solo la grilla del inventario scrollea.
  import { tick as despues } from 'svelte'
  import { flip } from 'svelte/animate'
  import {
    CFG1, TIPOS, desequipar, efectoNivel, elegir, equipadas, equipar, escalon, espacios, fusionables,
    fusionar, fusionarTodo, inventarioLleno, costoPulido, puedePulir, pulir, type Pieza,
  } from '../core'
  import { caraReliquia } from '../render/miniPilas'
  import { txt } from '../strings'
  import IconoTipo from './IconoTipo.svelte'
  import { formato } from './formato'
  import { juego } from './juego.svelte'
  import * as sonido from './sonido'

  const COLORES = ['var(--ambar)', 'var(--coral)', 'var(--jade)', 'var(--violeta)']
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
  // Fijos: sin lugar el Infinito no deja reliquia. Un guardado de antes con más piezas las muestra todas.
  const casilleros = $derived(Math.max(CFG1.relicario.casilleros, piezas.length))
  const sinLugar = $derived(inventarioLleno(s))
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
  const celda = (id: number) => document.querySelector<HTMLElement>(`.grilla [data-pieza="${id}"]`)
  let vuelos = $state<{ k: number; x: number; y: number; w: number; c: string }[]>([])
  let destino = $state<{ x: number; y: number; w: number } | null>(null)
  let nacida = $state<number | null>(null)
  let k = 0
  async function conAnimacion(cambio: () => void) {
    const antes = new Map(rel.piezas.map((p) => [p.id, p]))
    const rect = new Map([...antes.keys()].map((id) => [id, celda(id)?.getBoundingClientRect()]))
    cambio()
    await despues()
    const nuevas = juego.s.relicario.piezas.filter((p) => !antes.has(p.id))
    if (!nuevas.length) return
    sonido.hito('ring')
    const ultima = nuevas.reduce((a, b) => (b.nivel > a.nivel ? b : a))
    nacida = ultima.id
    elegida = null
    const el = celda(ultima.id)
    el?.scrollIntoView({ block: 'nearest' })
    const d = el?.getBoundingClientRect()
    const idas = [...antes.keys()].filter((id) => !juego.s.relicario.piezas.some((p) => p.id === id))
    if (d) destino = { x: d.left, y: d.top, w: d.width }
    vuelos = idas.map((id) => rect.get(id)).filter((b): b is DOMRect => !!b).map((b, i) => ({ k: k++, x: b.left, y: b.top, w: b.width, c: color(antes.get(idas[i])!.nivel) }))
    setTimeout(() => { vuelos = []; destino = null }, 700)
    setTimeout(() => (nacida = null), 1500)
  }
  const fusionarGrupo = (g: number[]) => conAnimacion(() => (juego.s = fusionar(juego.s, g)))
  const fusionarTodas = () => conAnimacion(() => (juego.s = fusionarTodo(juego.s)))
  // Pulido (1.2): la pieza sube un color en su lugar; si con Engarces II completa tres iguales, se fusiona con animación.
  function pulirSel() {
    if (!sel || !puedePulir(juego.s, sel.id)) return
    const id = sel.id
    conAnimacion(() => (juego.s = pulir(juego.s, id)))
    nacida = id
    setTimeout(() => (nacida = null), 1500)
    sonido.compra('other')
  }

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

</script>

{#snippet sello(t: string)}
  <span class="sello"><IconoTipo tipo={t} /></span>
{/snippet}
{#snippet cara(p: { foto: string; nivel: number })}
  <canvas class="cara" use:caraReliquia={{ foto: p.foto, nivel: p.nivel }} aria-hidden="true"></canvas>
{/snippet}

<section class="relicario" aria-label={txt.cristal.pantallas.relicario}>
  <div class="izq">
    <div class="engarces" role="group" aria-label={r.engarces} data-guia="c1_pulido">
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
            {#if p}{@render cara(p)}<span class="emblema"><IconoTipo tipo={p.tipo} halo={color(p.nivel)} /></span>{/if}
          </button>
        {/each}
      </div>
      {#if totales.length}
        <ul class="totales">
          {#each totales as [t, x] (t)}<li>{@render sello(t)}{r.tipos[t][1](x)}</li>{/each}
        </ul>
      {:else}
        <small class="totales">{r.nada}</small>
      {/if}
    </div>

    {#if sel}
      {@const g = grupoDe(sel)}
      <div class="detalle placa" style:--c={color(sel.nivel)} aria-live="polite">
        <div class="ficha">{@render cara(sel)}<span class="emblema"><IconoTipo tipo={sel.tipo} halo={color(sel.nivel)} /></span></div>
        <div class="datos">
          <b>{nombre(sel.tipo)} <span style:color={color(sel.nivel)}>{grado(sel.nivel)}</span></b>
          <span>{efecto(sel.tipo, sel.nivel)}</span>
          <small>{r.deInfinito(sel.inf)} · {puestas.has(sel.id) ? r.puesta : r.suelta}</small>
        </div>
        <div class="acciones">
          <button class="gema" onclick={engarzarSel}>{puestas.has(sel.id) ? r.quitar('') : r.engarzar('')}</button>
          {#if g}<button class="gema" style:--c={color(sel.nivel + 1)} onclick={() => fusionarGrupo(g)}>{r.fusionar} → {grado(sel.nivel + 1)}</button>{/if}
          {#if s.escarcha.abierta}
            <button class="gema" style:--c={color(sel.nivel + 1)} aria-disabled={!puedePulir(s, sel.id)} onclick={pulirSel} title={r.pulidoQue}
              aria-label="{r.pulir(grado(sel.nivel + 1))}. {txt.cristal.cuantasEsquirlas(formato(costoPulido(s, sel.nivel)))}">
              {r.pulir(grado(sel.nivel + 1))} · <span class="num">{formato(costoPulido(s, sel.nivel))}</span>
            </button>
          {/if}
        </div>
      </div>
    {:else if rel.pendiente}
      <div class="eleccion placa" style:--c={color(0)}>
        <div class="nueva">{@render cara({ foto: rel.foto, nivel: 0 })}</div>
        <div class="texto">
          <h2>{r.elegir}</h2>
          {#if sinLugar}<small class="num aviso">{r.llenoElegir(cuenta)}</small>{:else}<small class="num">{r.cuenta(cuenta)}</small>{/if}
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
    {:else if sinLugar}
      <small class="ayuda aviso" role="status">{r.lleno}</small>
    {:else}
      <small class="ayuda">{r.comoEngarzar}</small>
    {/if}
  </div>

  <div class="inventario">
    <div class="cabeza">
      <h2>{r.inventario} <small class="num" class:aviso={sinLugar}>{r.ocupados(piezas.length, CFG1.relicario.casilleros)}</small></h2>
      {#if grupos.length}<button class="gema" onclick={fusionarTodas}>{r.fusionarTodo}</button>{/if}
      <!-- La regla automática se configura en Automatización (bloque 10); acá solo se ve cuál es y se va hasta ella. -->
      <button class="regla" onclick={() => (juego.capa = 'automatizacion')}>{r.regla.titulo}<span>: <b>{r.regla.modos[rel.regla.modo]}</b></span></button>
    </div>
    <div class="grilla" role="listbox" aria-label={r.inventario}>
      {#each piezas as p (p.id)}
        <button
          data-pieza={p.id} animate:flip={{ duration: 300 }}
          class="pieza" class:puesta={puestas.has(p.id)} class:elegido={p.id === elegida} class:mas={escalon(p.nivel).vuelta > 0}
          class:lista={!!grupoDe(p)} class:nace={p.id === nacida} style:--c={color(p.nivel)}
          role="option" aria-selected={p.id === elegida} aria-label="{r.pieza(nombre(p.tipo), grado(p.nivel))}{puestas.has(p.id) ? `, ${r.puesta}` : ''}"
          draggable="true" ondragstart={(e) => { arrastrada = p.id; e.dataTransfer?.setData('text/plain', String(p.id)) }} ondragend={() => (arrastrada = null)}
          ondragover={(e) => e.preventDefault()} ondrop={(e) => { e.preventDefault(); soltarSobre(p) }}
          onclick={() => (elegida = elegida === p.id ? null : p.id)}
        >
          {@render cara(p)}<span class="emblema"><IconoTipo tipo={p.tipo} halo={color(p.nivel)} /></span>
          {#if escalon(p.nivel).vuelta}<i class="vuelta">+{escalon(p.nivel).vuelta}</i>{/if}
        </button>
      {/each}
      {#each { length: casilleros - piezas.length } as _}<span class="libre"></span>{/each}
      {#if !piezas.length}<small class="vacio">{r.inventarioVacio}</small>{/if}
    </div>
  </div>

  {#if destino}
    {#each vuelos as v (v.k)}
      <i class="vuelo" style:--c={v.c} style:left="{v.x}px" style:top="{v.y}px" style:width="{v.w}px" style:--dx="{destino.x - v.x}px" style:--dy="{destino.y - v.y}px" style:--e={destino.w / v.w} aria-hidden="true"></i>
    {/each}
  {/if}
</section>

<style>
  .relicario {
    display: grid; grid-template-columns: 18.5rem minmax(0, 1fr); gap: 1.75rem; width: min(100%, 64rem); height: 100%; min-height: 0;
    margin-inline: auto; padding-top: 1.25rem; animation: entrar 0.3s ease-out;
  }
  @keyframes entrar { from { opacity: 0; } }
  h2 { margin: 0; font-size: 1.0625rem; font-weight: 600; }
  small { color: var(--apagado); font-size: 0.8125rem; text-wrap: balance; }
  button { font: inherit; color: var(--escarcha); cursor: pointer; }

  .sello { display: block; width: 1.1rem; height: 1.1rem; flex: none; color: var(--escarcha); }
  .cara { display: block; width: 100%; height: 100%; }
  /* El emblema del tipo en el centro de cada reliquia, sobre una placa hexagonal de escarcha que deja ver la pila. */
  .emblema { position: absolute; z-index: 1; inset: 0; margin: auto; width: 44%; aspect-ratio: 1; display: grid; place-items: center; }
  .emblema::before {
    content: ''; position: absolute; inset: -16%; z-index: -1;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
    background: linear-gradient(160deg, rgb(255 255 255 / 0.3), transparent 45%), var(--tex-escarcha), rgb(6 13 26 / 0.62);
    box-shadow: inset 0 0 0 1px rgb(220 245 255 / 0.4);
  }
  .izq { display: flex; flex-direction: column; gap: 1rem; min-height: 0; }
  .engarces { display: grid; justify-items: center; gap: 0.6rem; }
  .huecos { display: flex; gap: 0.5rem; justify-content: center; }
  .hueco {
    position: relative; width: 4.75rem; aspect-ratio: 0.88; padding: 0; border: 0;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
    background: radial-gradient(closest-side, transparent 55%, rgb(0 0 0 / 0.5)), var(--tex-escarcha), var(--hielo-hondo);
  }
  .hueco::after { content: ''; position: absolute; inset: 0; background: linear-gradient(160deg, rgb(255 255 255 / 0.22), transparent 35%, transparent 70%, color-mix(in srgb, var(--c, var(--hielo)) 30%, transparent)); pointer-events: none; }
  .hueco.lleno { background: var(--hielo-hondo); }
  .hueco .emblema { width: 40%; }
  .hueco.elegido { filter: brightness(1.25); }
  .totales { display: grid; gap: 0.2rem; margin: 0; padding: 0; list-style: none; color: var(--tenue); font-size: 0.875rem; }
  .totales li { display: flex; gap: 0.45rem; align-items: center; }
  .ayuda { text-align: center; }
  .aviso { color: var(--coral); }

  /* Ficha de la reliquia elegida. */
  .detalle { display: grid; grid-template-columns: 5rem 1fr; gap: 0.7rem 0.9rem; align-items: center; padding: 1rem; }
  .ficha { position: relative; width: 5rem; aspect-ratio: 1; }
  .datos { display: grid; gap: 0.2rem; }
  .datos > span { color: var(--tenue); font-size: 0.875rem; }
  .acciones { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .acciones button { padding: 0.45rem 1rem; font-size: 0.875rem; }

  /* Elegir el tipo de la reliquia nueva. */
  .eleccion { display: grid; grid-template-columns: 4rem 1fr; gap: 0.6rem 0.9rem; align-items: center; padding: 0.9rem; }
  .nueva { width: 4rem; aspect-ratio: 1; clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); background: var(--hielo-hondo); animation: latir 2.4s ease-in-out infinite; }
  @keyframes latir { 50% { filter: brightness(1.25); } }
  .texto { display: grid; gap: 0.2rem; }
  .tipos { grid-column: 1 / -1; display: grid; gap: 0.35rem; }
  .tipos button { display: grid; grid-template-columns: 1.75rem 1fr; gap: 0 0.75rem; align-items: center; padding: 0.45rem 1.4rem; text-align: left; }
  .tipos .sello { grid-row: span 3; width: 1.75rem; height: 1.75rem; color: var(--c); }
  .tipos span { color: var(--tenue); font-size: 0.8125rem; }
  .tipos small { font-size: 0.75rem; }

  /* Inventario: cabecera fija y la grilla con su propio scroll (lo único que scrollea). */
  .inventario { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 0.6rem; min-height: 0; }
  .cabeza { position: relative; display: flex; align-items: center; gap: 1rem; min-height: 2.25rem; }
  .cabeza h2 { margin-right: auto; }
  .cabeza > button { padding: 0.4rem 1rem; font-size: 0.875rem; }
  .grilla {
    display: grid; grid-template-columns: repeat(8, 1fr); align-content: start; gap: 0.375rem; min-height: 0; overflow-y: auto;
    padding: 0.125rem 0.375rem 1rem 0.125rem; scrollbar-width: thin; scrollbar-color: var(--hielo-linea) transparent; overscroll-behavior: contain;
  }
  .vacio { grid-column: 1 / -1; }
  .libre, .pieza { aspect-ratio: 1; }
  .libre { background: rgb(159 227 245 / 0.035); box-shadow: inset 0 0 0 1px rgb(159 227 245 / 0.07); clip-path: polygon(14% 0, 100% 0, 100% 86%, 86% 100%, 0 100%, 0 14%); }
  .pieza {
    position: relative; padding: 0; border: 0; background: var(--hielo-hondo);
    clip-path: polygon(14% 0, 100% 0, 100% 86%, 86% 100%, 0 100%, 0 14%);
    transition: filter 0.2s;
  }
  .pieza::after, .ficha::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(155deg, rgb(255 255 255 / 0.24), transparent 30%), linear-gradient(transparent 70%, color-mix(in srgb, var(--c) 28%, transparent));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 65%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.45);
  }
  .pieza:hover, .pieza:focus-visible { filter: brightness(1.2); }
  .pieza.elegido { outline: 2px solid var(--escarcha); outline-offset: -2px; }
  /* Engarzada: un cristal de hielo en la esquina de abajo a la derecha. */
  .pieza.puesta::before { content: ''; position: absolute; z-index: 1; right: 7%; bottom: 7%; width: 16%; aspect-ratio: 0.7; background: var(--hielo); clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); }
  .pieza.lista::after { animation: lista 2.6s ease-in-out infinite; }
  @keyframes lista { 50% { box-shadow: inset 0 0 0 2px var(--c), inset 0 1px 0 rgb(255 255 255 / 0.6); } }
  .pieza.mas { filter: saturate(1.3) brightness(1.15); }
  .vuelta { position: absolute; z-index: 1; left: 8%; bottom: 6%; font-style: normal; font-size: 0.6875rem; font-weight: 700; color: var(--escarcha); text-shadow: 0 0 0.3rem var(--c); }

  .vuelo {
    position: fixed; z-index: 30; aspect-ratio: 1; pointer-events: none; background: var(--c);
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); opacity: 0.85; animation: volar 0.6s cubic-bezier(0.55, 0, 0.75, 0.3) forwards;
  }
  @keyframes volar { to { translate: var(--dx) var(--dy); scale: calc(var(--e) * 0.6); opacity: 0.2; } }
  .pieza.nace { animation: nacer 0.9s 0.5s cubic-bezier(0.2, 1.6, 0.4, 1) backwards; }
  @keyframes nacer { from { scale: 0.3; filter: brightness(4) saturate(0); } }

  /* La regla automática: un enlace a Automatización. */
  .regla { min-height: 2.75rem; padding: 0; border: 0; background: none; cursor: pointer; color: var(--tenue); font: inherit; font-size: 0.875rem; }
  .regla:hover, .regla:focus-visible { color: var(--escarcha); }
  .regla b { color: var(--escarcha); font-weight: 600; }

  :global(.quieto) .vuelo { display: none; }
  :global(.quieto) .pieza.nace, :global(.quieto) .pieza.lista::after, :global(.quieto) .nueva { animation: none; }
  /* Reducir destellos: lo que late queda fijo (la fusión sí se anima: pasa una vez y la pidió el jugador). */
  :global(.calma) .pieza.lista::after { animation: none; box-shadow: inset 0 0 0 2px var(--c), inset 0 1px 0 rgb(255 255 255 / 0.5); }
  :global(.calma) .nueva { animation: none; }

  @media (max-width: 760px) {
    .relicario { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); gap: 0.9rem; padding-top: 0.75rem; }
    .izq { gap: 0.6rem; }
    .engarces { display: flex; justify-content: start; }
    .engarces h2, .totales { display: none; }
    .hueco { width: 3.25rem; }
    .detalle { grid-template-columns: 3.5rem 1fr; padding: 0.7rem; }
    .ficha { width: 3.5rem; }
    .eleccion { grid-template-columns: 3rem 1fr; padding: 0.7rem; }
    .nueva { width: 3rem; }
    /* Una fila por tipo, en una línea: símbolo, nombre y efecto. */
    .tipos { gap: 0.3rem; }
    .tipos button { grid-template-columns: 1.25rem auto 1fr; gap: 0 0.6rem; padding: 0.45rem 1.1rem; }
    .tipos .sello { grid-row: auto; width: 1.25rem; height: 1.25rem; }
    .tipos span { font-size: 0.6875rem; line-height: 1.2; }
    .tipos small { display: none; }
    .grilla { grid-template-columns: repeat(6, 1fr); }
    .cabeza { gap: 0.75rem; justify-content: space-between; }
    .cabeza h2, .regla span { display: none; }
    .cabeza > button { min-height: 2.75rem; white-space: nowrap; font-size: 0.8125rem; }
  }
</style>
