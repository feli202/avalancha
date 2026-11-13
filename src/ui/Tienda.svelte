<script lang="ts">
  // Tienda (SPEC 6.4): Caudal y los colores ya aparecidos. Modo x1 / x10 / Máx; "Comprar todo" con M.
  // Pestañas Cascada y Mutaciones cuando aparecen (SPEC 5): ahí se compra de a un nivel, son las decisiones.
  import Decimal from 'break_infinity.js'
  import {
    CFG, MUTACIONES, aplicar, caudal, comprar, comprarMax, comprarN, comprarTodo, costo, multCascada, multColor, nivel,
    type ItemId, type MutId, type State,
  } from '../core'
  import { ALTURA_DE_COLOR, COLOR_CSS } from '../render/pilaVisual'
  import { es } from '../strings/es'
  import { formato, formatoMult, hablado } from './formato'
  import { hayPanel, juego, nombreAuto } from './juego.svelte'
  import * as sonido from './sonido'

  type Modo = keyof typeof es.modos
  let modo = $state<Modo>('x1')
  const DIEZ = 10

  const items = $derived<ItemId[]>([
    'caudal',
    ...CFG.colores.map((_, i): ItemId => `color${i}`).filter((id) => juego.vistos[id]),
  ])
  const pestanas = $derived(['tienda', 'cascada', 'mutaciones'].filter((p) => p === 'tienda' || juego.vistos[p]))
  let pestana = $state('tienda')
  const filas = $derived<ItemId[]>(
    pestana === 'cascada' ? ['cascada'] : pestana === 'mutaciones' ? MUTACIONES.map((m): ItemId => `mut_${m}`) : items,
  )
  const enTienda = $derived(pestana === 'tienda')

  const mutDe = (id: ItemId) => (id.startsWith('mut_') ? (id.slice(4) as MutId) : null)
  const maximo = (id: ItemId) =>
    id === 'cascada' ? CFG.cascada.nivel_max : mutDe(id) ? CFG.mutaciones.nivel_max : Infinity
  /** Clave del autocomprador de cada fila (CFG.autocompradores), si tiene. */
  const claveAuto = (id: ItemId) => (id === 'caudal' ? 'caudal' : color(id) >= 0 ? CFG.colores[color(id)].id : null)

  /** Cuántos niveles compraría el modo actual, cuánto cuestan y si alcanza. */
  function oferta(s: State, id: ItemId) {
    if (modo === 'x1' || !enTienda) return { n: 1, c: costo(s, id), puede: s.energia.gte(costo(s, id)) }
    if (modo === 'x10') {
      let c = new Decimal(0)
      for (let i = 0, t = s; i < DIEZ; i++, t = aplicar(t, id)) c = c.add(costo(t, id))
      return { n: DIEZ, c, puede: s.energia.gte(c) }
    }
    const t = comprarMax(s, id)
    const n = nivel(t, id) - nivel(s, id)
    return n > 0 ? { n, c: s.energia.sub(t.energia), puede: true } : { n: 1, c: costo(s, id), puede: false }
  }

  function compra(id: ItemId) {
    const s = juego.s
    juego.s = modo === 'x1' || !enTienda ? comprar(s, id) : modo === 'x10' ? comprarN(s, id, DIEZ) : comprarMax(s, id)
    if (juego.s !== s) sonido.compra(claveAuto(id) ?? 'other')
  }

  const alternarAuto = (k: string) => (juego.s = { ...juego.s, auto: { ...juego.s.auto, [k]: !juego.s.auto[k] } })

  function nombre(id: ItemId) {
    const m = mutDe(id)
    return m ? es.mutaciones[m] : id === 'cascada' ? es.cascada : color(id) >= 0 ? es.colores[color(id)] : es.caudal
  }

  function efecto(s: State, id: ItemId) {
    const m = mutDe(id)
    const n = nivel(s, id)
    if (m === 'expansion') return es.efectoMutacion[m](formatoMult(CFG.anillos.mult_por_anillo + CFG.mutaciones[m].por_nivel * n))
    if (m === 'cascada') return es.efectoMutacion[m](formatoMult(CFG.mutaciones[m].por_nivel * n))
    if (m) return es.efectoMutacion[m](formato(CFG.mutaciones[m].por_nivel ** n))
    if (id === 'cascada') return es.mult(formatoMult(multCascada(s)))
    if (color(id) >= 0) return `${es.mult(formatoMult(multColor(color(id), n)))} · ${es.alturaColor[color(id)]}`
    return es.efectoCaudal(formato(caudal(s)))
  }

  const todo = () => (juego.s = comprarTodo(juego.s, items))

  function tecla(e: KeyboardEvent) {
    if (e.code !== 'KeyM' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || hayPanel() || e.target instanceof HTMLInputElement) return
    todo()
  }

  const color = (id: ItemId) => (id.startsWith('color') ? Number(id.slice(5)) : -1)
</script>

<svelte:window onkeydown={tecla} />

{#if pestanas.length > 1}
  <div class="pestanas" role="tablist">
    {#each pestanas as p (p)}
      <button role="tab" class="aparece" aria-selected={pestana === p} onclick={() => (pestana = p)}>{es.pestanas[p]}</button>
    {/each}
  </div>
{/if}

<div class="cabeza">
  {#if enTienda}
    <div class="modos" role="radiogroup" aria-label={es.modo}>
      {#each Object.keys(es.modos) as Modo[] as m}
        <button role="radio" aria-checked={modo === m} onclick={() => (modo = m)}>{es.modos[m]}</button>
      {/each}
    </div>
  {:else}
    <p class="explica">{es.explicacion[pestana]}</p>
  {/if}
</div>

<ul>
  {#each filas as id (id)}
    {@const i = color(id)}
    {@const tope = nivel(juego.s, id) >= maximo(id)}
    {@const o = oferta(juego.s, id)}
    {@const k = claveAuto(id)}
    <li style:--c={i >= 0 ? COLOR_CSS[ALTURA_DE_COLOR[i]] : 'var(--tinta)'}>
      <button class="fila" class:puede={o.puede && !tope} disabled={!o.puede || tope} onclick={() => compra(id)}
        aria-label="{es.comprar} {nombre(id)} · {tope ? es.nivelMaximo : hablado(formato(o.c))}">
        <span class="muestra" class:caudal={i < 0} aria-hidden="true"></span>
        <span class="nombre">{nombre(id)} <span class="nv num">{es.nivel(nivel(juego.s, id))}</span></span>
        <span class="costo num">
          {#if tope}{es.nivelMaximo}{:else}{#if o.n > 1}<span class="cuantos">{es.comprarCuantos(o.n)}</span> {/if}{formato(o.c)}{/if}
        </span>
        <span class="efecto num">{efecto(juego.s, id)}</span>
      </button>
      {#if k && juego.vistos[`auto_${k}`]}
        <!-- SPEC 4.8: interruptor del autocomprador, fuera del botón de la fila. -->
        <button class="auto aparece" role="switch" aria-checked={juego.s.auto[k]} aria-label={es.autoDe(nombreAuto(k))}
          onclick={() => alternarAuto(k)}>{es.auto}</button>
      {/if}
    </li>
  {/each}
</ul>

{#if enTienda}
  <button class="todo" onclick={todo} aria-keyshortcuts="M">
    {es.comprarTodo} <kbd>{es.teclaComprarTodo}</kbd>
  </button>
{/if}

<style>
  /* Sin cajas: filas de texto separadas por líneas de 1 px; se compra con un clic en la fila. */
  /* Sin título: los modos arrancan en el borde izquierdo de la lista; a la derecha, el ícono de Ajustes
     (fijo, App.svelte), alineado con el borde derecho. */
  .cabeza { display: flex; align-items: center; padding: 0 2.5rem 0.25rem 0; }
  .modos { display: flex; }
  .modos button {
    min-width: 2.75rem; min-height: 2.75rem; padding: 0; text-align: left; border: 0; background: none;
    color: var(--apagado); font: inherit; font-size: 0.875rem; cursor: pointer; transition: color 0.15s;
  }
  .modos button:hover { color: var(--tenue); }
  .modos button[aria-checked='true'] { color: var(--tinta); font-weight: 600; }

  .pestanas { display: flex; gap: 1rem; padding: 0 2.5rem 0.25rem 0; }
  .pestanas button {
    min-height: 2.75rem; padding: 0; border: 0; border-bottom: 1px solid transparent; background: none;
    color: var(--apagado); font: inherit; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: color 0.15s;
  }
  .pestanas button:hover { color: var(--tenue); }
  .pestanas button[aria-selected='true'] { color: var(--tinta); border-bottom-color: var(--tinta); }
  .explica { min-height: 2.25rem; margin: 0; padding: 0.5rem 0; font-size: 0.8125rem; color: var(--tenue); text-wrap: pretty; }
  .aparece { animation: fundido 0.6s ease-out; }

  ul { list-style: none; margin: 0; padding: 0; }
  li { position: relative; border-top: 1px solid var(--borde); animation: entrar 0.5s ease-out; }
  li:last-child { border-bottom: 1px solid var(--borde); }
  .fila {
    display: grid; grid-template-columns: 0.5rem 1fr auto; grid-template-areas: 'm n c' '. e e';
    align-items: baseline; column-gap: 0.75rem; row-gap: 0.125rem; width: 100%; min-height: 3.5rem; padding: 0.625rem 0;
    border: 0; background: none; color: var(--tinta); font: inherit; text-align: left; text-shadow: inherit; cursor: default;
  }
  .fila.puede { cursor: pointer; }
  .muestra { grid-area: m; align-self: center; width: 0.5rem; height: 0.5rem; border-radius: 1px; background: var(--c); }
  .muestra.caudal { background: none; border: 1px solid var(--tinta); border-radius: 50%; }
  .nombre { grid-area: n; font-size: 1rem; font-weight: 600; }
  .nv { margin-left: 0.25rem; font-size: 0.8125rem; font-weight: 400; color: var(--tenue); }
  .efecto { grid-area: e; font-size: 0.8125rem; color: var(--tenue); }
  .costo { grid-area: c; font-weight: 600; color: var(--apagado); transition: color 0.2s, text-shadow 0.2s; }
  .cuantos { font-size: 0.75rem; font-weight: 400; }
  .puede .costo { color: var(--c); }
  .puede:hover .costo { text-shadow: 0 0 0.75rem var(--c); }
  .puede:active .nombre { opacity: 0.7; }

  /* Interruptor del autocomprador: abajo a la derecha de la fila, en la línea del efecto. */
  .auto {
    /* 44 px de alto (objetivo táctil); la fila crece para que no tape el costo. */
    position: absolute; right: 0; bottom: 0; min-height: 2.75rem; padding: 0 0 0.625rem 0.75rem; border: 0; background: none;
    display: flex; align-items: flex-end;
    color: var(--apagado); font: inherit; font-size: 0.75rem; cursor: pointer; text-shadow: inherit;
  }
  .auto::before { content: ''; display: inline-block; width: 0.375rem; height: 0.375rem; margin-right: 0.375rem;
    border: 1px solid currentColor; border-radius: 50%; vertical-align: 0.0625rem; }
  .auto[aria-checked='true'] { color: var(--c); }
  li:has(.auto) .efecto { padding-right: 3.5rem; }
  li:has(.auto) .fila { min-height: 4.75rem; }
  .auto[aria-checked='true']::before { background: currentColor; }

  .todo {
    display: flex; align-items: baseline; justify-content: space-between; width: 100%; min-height: 2.75rem; padding: 0;
    border: 0; background: none; color: var(--tenue); font: inherit; font-size: 0.875rem; text-shadow: inherit; cursor: pointer;
    transition: color 0.15s;
  }
  .todo:hover { color: var(--tinta); }
  kbd { font: inherit; font-size: 0.8125rem; color: var(--apagado); }

  @media (max-width: 767px), (orientation: portrait) and (max-width: 1100px) { .cabeza { padding-right: 0; } } /* en móvil Ajustes queda arriba de la pantalla */
  @keyframes entrar { from { opacity: 0; transform: translateY(6px); } }
  :global(.quieto) li { animation-name: fundido; }
  @keyframes fundido { from { opacity: 0; } }
</style>
