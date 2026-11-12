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
    <li class="fila" style:--c={i >= 0 ? COLOR_CSS[ALTURA_DE_COLOR[i]] : 'var(--tinta)'}>
      <span class="muestra" class:caudal={i < 0} aria-hidden="true"></span>
      <div class="texto">
        <div class="nombre">
          <span>{i >= 0 ? es.colores[i] : es.caudal}</span>
          <span class="nv num">{es.nivel(nivel(juego.s, id))}</span>
        </div>
        <div class="efecto num">
          {#if i >= 0}
            {es.mult(formatoMult(multColor(i, nivel(juego.s, id))))} <span class="tenue">· {es.alturaColor[i]}</span>
          {:else}
            {es.efectoCaudal(formato(caudal(juego.s)))}
          {/if}
        </div>
      </div>
      <button class="comprar" disabled={!o.puede} onclick={() => compra(id)} aria-label="{es.comprar} {i >= 0 ? es.colores[i] : es.caudal}">
        {#if o.n > 1}<span class="cuantos num">{es.comprarCuantos(o.n)}</span>{/if}
        <span class="num">{formato(o.c)}</span>
      </button>
    </li>
  {/each}
</ul>

<button class="todo" onclick={todo} aria-keyshortcuts="M">
  {es.comprarTodo} <kbd>{es.teclaComprarTodo}</kbd>
</button>

<label class="ajuste"><input type="checkbox" bind:checked={juego.reducirDestellos} /> {es.reducirDestellos}</label>

<style>
  .cabeza { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.75rem; }
  h2 { margin: 0; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--tenue); }
  .modos { display: flex; border: 1px solid var(--borde); border-radius: 999px; padding: 2px; }
  .modos button {
    min-width: 2.75rem; min-height: 2rem; padding: 0 0.6rem; border: 0; border-radius: 999px;
    background: none; color: var(--tenue); font: inherit; font-size: 0.8rem; cursor: pointer;
  }
  .modos button[aria-checked='true'] { background: var(--tinta); color: var(--fondo); font-weight: 600; }

  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.375rem; }
  .fila {
    display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.75rem;
    padding: 0.625rem 0.625rem 0.625rem 0.75rem; border: 1px solid var(--borde); border-radius: 12px;
    background: rgb(255 255 255 / 0.025); animation: entrar 0.5s ease-out;
  }
  .muestra {
    width: 0.875rem; height: 0.875rem; border-radius: 4px; background: var(--c);
    box-shadow: 0 0 0.75rem color-mix(in srgb, var(--c) 55%, transparent);
  }
  .muestra.caudal { background: none; border: 1.5px solid var(--tinta); border-radius: 50%; box-shadow: none; }
  .texto { min-width: 0; }
  .nombre { display: flex; align-items: baseline; gap: 0.5rem; font-weight: 600; }
  .nv { font-size: 0.75rem; font-weight: 400; color: var(--tenue); }
  .efecto { font-size: 0.8rem; color: color-mix(in srgb, var(--c) 70%, var(--tinta)); }
  .tenue { color: var(--tenue); }

  .comprar {
    display: grid; justify-items: end; align-content: center; min-width: 6.5rem; min-height: 2.75rem; padding: 0.25rem 0.75rem;
    border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); border-radius: 10px;
    background: color-mix(in srgb, var(--c) 12%, transparent); color: var(--tinta); font: inherit; font-weight: 600; cursor: pointer;
    transition: background-color 0.15s, transform 0.1s;
  }
  .comprar:hover:not(:disabled) { background: color-mix(in srgb, var(--c) 22%, transparent); }
  .comprar:active:not(:disabled) { transform: scale(0.97); }
  .comprar:disabled { border-color: var(--borde); background: none; color: var(--apagado); cursor: default; }
  .cuantos { font-size: 0.7rem; font-weight: 400; color: var(--tenue); }

  .todo {
    width: 100%; min-height: 2.75rem; margin-top: 0.75rem; border: 1px solid var(--borde); border-radius: 12px;
    background: none; color: var(--tinta); font: inherit; font-weight: 600; cursor: pointer; transition: background-color 0.15s;
  }
  .todo:hover { background: rgb(255 255 255 / 0.05); }
  kbd {
    margin-left: 0.4rem; padding: 0.05rem 0.4rem; border: 1px solid var(--borde); border-radius: 4px;
    font: inherit; font-size: 0.75rem; color: var(--tenue);
  }
  .ajuste { display: flex; align-items: center; gap: 0.5rem; min-height: 44px; margin-top: 0.5rem; font-size: 0.8rem; color: var(--tenue); }

  @keyframes entrar { from { opacity: 0; transform: translateY(6px); } }
  :global(.quieto) .fila { animation-name: fundido; }
  @keyframes fundido { from { opacity: 0; } }
</style>
