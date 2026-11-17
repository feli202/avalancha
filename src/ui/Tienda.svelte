<script lang="ts">
  // Tienda (SPEC 6.4): Caudal y los colores ya aparecidos. Modo x1 / x10 / Máx; "Comprar todo" con M.
  // Pestañas Cascada y Mutaciones cuando aparecen (SPEC 5): ahí se compra de a un nivel, son las decisiones.
  import Decimal from 'break_infinity.js'
  import {
    CFG, MUTACIONES, aplicar, colorSinEfecto, autoActivo, autoDisponible, comprar, comprarMax, comprarN, comprarTodo, costo, masAlla, nivel, type ItemId, type State,
  } from '../core'
  import { ALTURA_DE_COLOR, COLOR_CSS } from '../render/pilaVisual'
  import { txt } from '../strings'
  import { ajustes } from './ajustes.svelte'
  import IconoTipo from './IconoTipo.svelte'
  import { ayuda, ayudaItem, ayudaSimple, colorDe as color, efecto, maximo, nombre } from './ayudas.svelte'
  import { formato, hablado } from './formato'
  import { hayPanel, juego, nombreAuto, vigia } from './juego.svelte'
  import * as sonido from './sonido'

  type Modo = keyof typeof txt.modos
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
  /** El ícono de reliquia de cada pestaña o fila (los mismos que el Relicario): Caudal lleva el de Cauce, Cascada el suyo y
   * cada Mutación el de Mutaciones con su propio centro y su color. */
  const MUT_COLOR: Record<string, string> = { caudal: 'var(--tinta)', colores: 'var(--jade)', expansion: 'var(--violeta)', cascada: 'var(--coral)' }
  function iconoDe(id: string): { tipo: string; centro?: string; color: string } | null {
    if (id === 'caudal') return { tipo: 'cauce', color: 'var(--tinta)' }
    if (id === 'cascada') return { tipo: 'cascada', color: 'var(--ambar)' }
    if (id === 'mutaciones') return { tipo: 'mutaciones', color: 'var(--ambar)' }
    if (id.startsWith('mut_')) return { tipo: 'mutaciones', centro: id.slice(4), color: MUT_COLOR[id.slice(4)] }
    return null
  }

  /** Clave del autocomprador de cada fila (AUTOS del núcleo), si tiene. */
  const claveAuto = (id: ItemId) =>
    id === 'caudal' || id === 'cascada' ? id : id.startsWith('mut_') ? 'mutaciones' : color(id) >= 0 ? CFG.colores[color(id)].id : null

  /** La fila se compra sola: su autocomprador prendido (la misma regla que tick.ts). */
  const automatica = (s: State, id: ItemId) => {
    const k = claveAuto(id)
    return !!k && autoActivo(s, k)
  }

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
    if (juego.s === s) return
    // SPEC 6.7: el acorde del hito ×4 de un color o, si no, la campana de la compra. Solo acá: las compras automáticas no suenan.
    const cada = CFG.hito_colores.cada
    if (color(id) >= 0 && Math.floor(nivel(juego.s, id) / cada) > Math.floor(nivel(s, id) / cada)) sonido.hito('milestone')
    else sonido.compra(claveAuto(id) ?? 'other')
    vigia.compraManual(juego.s)
  }

  const alternarAuto = (k: string) => (juego.s = { ...juego.s, auto: { ...juego.s.auto, [k]: !juego.s.auto[k] } })

  const todo = () => {
    const s = juego.s
    juego.s = comprarTodo(s, items)
    if (juego.s === s) return
    sonido.compra('other') // una sola vez, compre los niveles que compre
    vigia.compraManual(juego.s)
  }


  function tecla(e: KeyboardEvent) {
    if (e.code !== 'KeyM' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || hayPanel() || e.target instanceof HTMLInputElement) return
    todo()
  }
</script>

<svelte:window onkeydown={tecla} />

{#if pestanas.length > 1}
  <div class="pestanas" role="tablist">
    {#each pestanas as p (p)}
      <button role="tab" class="aparece" data-guia={p} aria-selected={pestana === p} onclick={() => (pestana = p)}>{#if iconoDe(p) && p !== 'tienda'}<span class="ico"><IconoTipo tipo={iconoDe(p)!.tipo} /></span>{/if}{txt.pestanas[p]}</button>
    {/each}
  </div>
{/if}

<div class="cabeza">
  {#if enTienda}
    <div class="modos" role="radiogroup" aria-label={txt.modo}>
      {#each Object.keys(txt.modos) as Modo[] as m}
        <button role="radio" aria-checked={modo === m} onclick={() => (modo = m)}>{txt.modos[m]}</button>
      {/each}
    </div>
  {:else}
    <p class="explica">{txt.explicacion[pestana]}</p>
  {/if}
</div>

<ul>
  {#each filas as id (id)}
    {@const i = color(id)}
    {@const tope = nivel(juego.ver, id) >= maximo(juego.ver, id)}
    {@const o = oferta(juego.ver, id)}
    {@const k = claveAuto(id)}
    {@const sola = ajustes.calma && automatica(juego.ver, id)}
    {@const ic = iconoDe(id)}
    <li style:--c={i >= 0 ? COLOR_CSS[ALTURA_DE_COLOR[i]] : 'var(--tinta)'} data-guia={id === 'caudal' ? 'tienda' : id} class:agrietado={i >= 0 && colorSinEfecto(juego.ver, i)}
      use:ayuda={() => ayudaItem(juego.s, id)}>
      <button class="fila" class:puede={o.puede && !tope} class:sola disabled={!o.puede || tope} onclick={() => compra(id)}
        aria-label="{txt.comprar} {nombre(id)} · {tope ? txt.nivelMaximo : hablado(formato(o.c, true))}">
        {#if ic}<span class="muestra icono" style:color={ic.color}><IconoTipo tipo={ic.tipo} centro={ic.centro} /></span>{:else}<span class="muestra" class:caudal={i < 0} aria-hidden="true"></span>{/if}
        <span class="nombre">{nombre(id)} <span class="nv num">{txt.nivel(nivel(juego.ver, id))}</span>{#if !tope && masAlla(juego.ver, id)}<span class="allende" title={txt.masAlla} aria-label={txt.masAlla}>∞</span>{/if}</span>
        <span class="costo num">
          {#if tope}{txt.nivelMaximo}{:else}{#if o.n > 1}<span class="cuantos">{txt.comprarCuantos(o.n)}</span> {/if}{formato(o.c, true)}{/if}
        </span>
        <span class="efecto num">{efecto(juego.ver, id)}</span>
      </button>
      {#if k && autoDisponible(juego.ver, k)}
        <!-- SPEC 4.8: interruptor del autocomprador, fuera del botón de la fila. La misma regla que la economía (no juego.vistos). -->
        <button class="auto aparece" data-guia="auto_{k}" use:ayuda={() => ayudaSimple(txt.autoDe(nombreAuto(k)), txt.guia.que.auto)} role="switch" aria-checked={juego.ver.auto[k]} aria-label={txt.autoDe(nombreAuto(k))}
          onclick={() => alternarAuto(k)}>{juego.ver.auto[k] ? txt.auto : txt.manual}</button>
      {/if}
    </li>
  {/each}
</ul>

{#if enTienda}
  <button class="todo" onclick={todo} aria-keyshortcuts="M">
    {txt.comprarTodo} <kbd>{txt.teclaComprarTodo}</kbd>
  </button>
{/if}

<style>
  /* Sin cajas: filas de texto separadas por líneas de 1 px; se compra con un clic en la fila. */
  /* Sin título: los modos arrancan en el borde izquierdo de la lista (los íconos de App.svelte van en la fila de arriba). */
  .cabeza { display: flex; align-items: center; padding: 0 0 0.25rem; }
  .modos { display: flex; }
  .modos button {
    min-width: 2.75rem; min-height: 2.75rem; padding: 0; text-align: left; border: 0; background: none;
    color: var(--apagado); font: inherit; font-size: 0.875rem; cursor: pointer; transition: color 0.15s;
  }
  .modos button:hover { color: var(--tenue); }
  .modos button[aria-checked='true'] { color: var(--tinta); font-weight: 600; }

  .pestanas { display: flex; gap: 1rem; padding: 0 0 0.25rem; }
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
    display: grid; grid-template-columns: 1.375rem 1fr auto; grid-template-areas: 'm n c' '. e e';
    align-items: baseline; column-gap: 0.75rem; row-gap: 0.125rem; width: 100%; min-height: 3.5rem; padding: 0.625rem 0;
    border: 0; background: none; color: var(--tinta); font: inherit; text-align: left; text-shadow: inherit; cursor: default;
  }
  .fila.puede { cursor: pointer; }
  .fila:disabled { pointer-events: none; } /* el tooltip (en el li) tiene que verse también sin poder comprar */
  .muestra { grid-area: m; align-self: center; justify-self: center; width: 0.5rem; height: 0.5rem; border-radius: 1px; background: var(--c); }
  .muestra.caudal { background: none; border: 1px solid var(--tinta); border-radius: 50%; }
  .muestra.icono { width: 1.375rem; height: 1.375rem; margin-block: -0.4rem; background: none; }
  .ico { display: inline-block; width: 0.95rem; height: 0.95rem; margin-right: 0.35rem; vertical-align: -0.15rem; }
  .nombre { grid-area: n; font-size: 1rem; font-weight: 600; }
  .nv { margin-left: 0.25rem; font-size: 0.8125rem; font-weight: 400; color: var(--tenue); }
  .efecto { grid-area: e; font-size: 0.8125rem; color: var(--tenue); }
  /* §8, Vacancia: Violeta se compra pero no suma. La muestra agrietada y su número tachado. */
  .agrietado .muestra { width: 0.75rem; height: 0.75rem; background: linear-gradient(115deg, var(--c) 0 42%, transparent 42% 52%, var(--c) 52%); clip-path: polygon(0 0, 55% 0, 40% 45%, 62% 55%, 45% 100%, 0 100%, 0 0, 100% 0, 100% 100%, 50% 100%, 68% 52%, 46% 44%, 62% 0); opacity: 0.75; }
  .agrietado .efecto, .agrietado .nombre .nv { text-decoration: line-through; text-decoration-color: var(--c); color: var(--apagado); }
  /* Softcap (SPEC §4.11): más allá del Infinito cada nivel cuesta ×10 más. Una gema de hielo chica, como la Capa 1. */
  .allende {
    display: inline-grid; place-items: center; width: 1.25rem; height: 1rem; margin-left: 0.4rem; vertical-align: 0.05rem;
    clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
    background: linear-gradient(160deg, rgb(214 243 255 / 0.55), rgb(159 227 245 / 0.18));
    color: #e9f9ff; font-size: 0.75rem; font-weight: 600; line-height: 1;
  }
  .costo { grid-area: c; font-weight: 600; color: var(--apagado); transition: color 0.2s, text-shadow 0.2s; }
  .cuantos { font-size: 0.75rem; font-weight: 400; }
  .puede .costo { color: var(--c); }
  .puede:hover .costo { text-shadow: 0 0 0.75rem var(--c); }
  .puede:active .nombre { opacity: 0.7; }
  /* CORRECCIONES 1: una fila que se compra sola no se enciende y se apaga con cada compra automática. */
  .fila.sola .costo { color: var(--apagado); text-shadow: none; transition: none; }

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

  @media (orientation: portrait) and (max-width: 1100px) { .cabeza { padding-right: 0; } } /* en móvil Ajustes queda arriba de la pantalla */
  @keyframes entrar { from { opacity: 0; transform: translateY(6px); } }
  :global(.quieto) li { animation-name: fundido; }
  @keyframes fundido { from { opacity: 0; } }
</style>
