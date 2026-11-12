<script lang="ts">
  // Tienda (SPEC 6.4): Caudal y los colores ya aparecidos. Modo x1 / x10 / Máx; "Comprar todo" con M.
  import Decimal from 'break_infinity.js'
  import {
    CFG, aplicar, caudal, comprar, comprarMax, comprarN, comprarTodo, costo, multColor, nivel, type ItemId, type State,
  } from '../core'
  import { ALTURA_DE_COLOR, COLOR_CSS } from '../render/pilaVisual'
  import { es } from '../strings/es'
  import { formato, formatoMult } from './formato'
  import { juego } from './juego.svelte'

  type Modo = keyof typeof es.modos
  let modo = $state<Modo>('x1')
  const DIEZ = 10

  const items = $derived<ItemId[]>([
    'caudal',
    ...CFG.colores.map((_, i): ItemId => `color${i}`).filter((id) => juego.vistos[id]),
  ])

  /** Cuántos niveles compraría el modo actual, cuánto cuestan y si alcanza. */
  function oferta(s: State, id: ItemId) {
    if (modo === 'x1') return { n: 1, c: costo(s, id), puede: s.energia.gte(costo(s, id)) }
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
    juego.s = modo === 'x1' ? comprar(s, id) : modo === 'x10' ? comprarN(s, id, DIEZ) : comprarMax(s, id)
  }

  const todo = () => (juego.s = comprarTodo(juego.s, items))

  function tecla(e: KeyboardEvent) {
    if (e.code !== 'KeyM' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target instanceof HTMLInputElement) return
    todo()
  }

  const color = (id: ItemId) => (id.startsWith('color') ? Number(id.slice(5)) : -1)
</script>

<svelte:window onkeydown={tecla} />

<div class="cabeza">
  <h2>{es.tienda}</h2>
  <div class="modos" role="radiogroup" aria-label={es.modo}>
    {#each Object.keys(es.modos) as Modo[] as m}
      <button role="radio" aria-checked={modo === m} onclick={() => (modo = m)}>{es.modos[m]}</button>
    {/each}
  </div>
</div>

<ul>
  {#each items as id (id)}
    {@const i = color(id)}
    {@const o = oferta(juego.s, id)}
    <li style:--c={i >= 0 ? COLOR_CSS[ALTURA_DE_COLOR[i]] : 'var(--tinta)'}>
      <button class="fila" class:puede={o.puede} disabled={!o.puede} onclick={() => compra(id)}
        aria-label="{es.comprar} {i >= 0 ? es.colores[i] : es.caudal} · {formato(o.c)}">
        <span class="muestra" class:caudal={i < 0} aria-hidden="true"></span>
        <span class="nombre">{i >= 0 ? es.colores[i] : es.caudal} <span class="nv num">{es.nivel(nivel(juego.s, id))}</span></span>
        <span class="costo num">{#if o.n > 1}<span class="cuantos">{es.comprarCuantos(o.n)}</span> {/if}{formato(o.c)}</span>
        <span class="efecto num">
          {#if i >= 0}
            {es.mult(formatoMult(multColor(i, nivel(juego.s, id))))} · {es.alturaColor[i]}
          {:else}
            {es.efectoCaudal(formato(caudal(juego.s)))}
          {/if}
        </span>
      </button>
    </li>
  {/each}
</ul>

<button class="todo" onclick={todo} aria-keyshortcuts="M">
  {es.comprarTodo} <kbd>{es.teclaComprarTodo}</kbd>
</button>

<style>
  /* Sin cajas: filas de texto separadas por líneas de 1 px; se compra con un clic en la fila. */
  /* padding-right: lugar para el ícono de Ajustes, fijo arriba a la derecha (App.svelte). */
  .cabeza { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; padding: 0 2.5rem 0.5rem 0; }
  h2 { margin: 0; font-size: 1.25rem; font-weight: 600; }
  .modos { display: flex; gap: 0.25rem; }
  .modos button {
    min-width: 2.25rem; min-height: 2.25rem; padding: 0 0.25rem; border: 0; background: none;
    color: var(--apagado); font: inherit; font-size: 0.875rem; cursor: pointer; transition: color 0.15s;
  }
  .modos button:hover { color: var(--tenue); }
  .modos button[aria-checked='true'] { color: var(--tinta); font-weight: 600; }

  ul { list-style: none; margin: 0; padding: 0; }
  li { border-top: 1px solid var(--borde); animation: entrar 0.5s ease-out; }
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

  .todo {
    display: flex; align-items: baseline; justify-content: space-between; width: 100%; min-height: 2.75rem; padding: 0;
    border: 0; background: none; color: var(--tenue); font: inherit; font-size: 0.875rem; text-shadow: inherit; cursor: pointer;
    transition: color 0.15s;
  }
  .todo:hover { color: var(--tinta); }
  kbd { font: inherit; font-size: 0.8125rem; color: var(--apagado); }

  @keyframes entrar { from { opacity: 0; transform: translateY(6px); } }
  :global(.quieto) li { animation-name: fundido; }
  @keyframes fundido { from { opacity: 0; } }
</style>
