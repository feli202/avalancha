<script lang="ts">
  // SPEC_CAPA1 §8: la pantalla de los Defectos. A la izquierda los cuatro, en orden, cada uno con su red cristalina rota
  // (un átomo que falta, media red corrida, la red reflejada, un átomo ajeno) unidos por escarcha; a la derecha, la ficha del
  // elegido con regla, meta, requisito y recompensa, y el botón para entrar o abandonar.
  import Decimal from 'break_infinity.js'
  import { CFG1, DEFECTOS, completo, enDefecto, falta, metaLog10, puedeEntrar, volverCon, type DefectoId } from '../core'
  import { txt } from '../strings'
  import { cambios, nombre, recompensa, regla, requisito } from './defectos'
  import { formato } from './formato'
  import { abandonarDefectoYa, entrarDefectoYa, juego, progresoCompresion } from './juego.svelte'
  import * as sonido from './sonido'

  const t = txt.cristal.defectos
  const s = $derived(juego.s)
  /** El color de nivel de cada uno (el mismo que pinta su red cuando está superado). */
  const COLOR: Record<DefectoId, string> = { vacancia: 'var(--violeta)', dislocacion: 'var(--coral)', macla: 'var(--jade)', impureza: 'var(--ambar)' }
  const primero = () => (juego.s.defectos.actual as DefectoId) || DEFECTOS.find((d) => !completo(juego.s, d)) || DEFECTOS[0]
  let foco = $state<DefectoId>(primero())

  /** Red cristalina de 5×5 con el defecto de cada uno. x, y en una grilla de paso 10; `o`: el átomo distinto. */
  function red(id: DefectoId) {
    const p: { x: number; y: number; o?: boolean }[] = []
    for (let j = -2; j <= 2; j++)
      for (let i = -2; i <= 2; i++) {
        let x = i * 10, y = j * 10
        if (id === 'vacancia' && i === 0 && j === 0) continue
        if (id === 'dislocacion' && j < 0) x += 5 // la mitad de arriba se corrió media celda
        if (id === 'macla') x += Math.abs(j) * 3.5 - 3.5 // la red se refleja en el plano del medio
        p.push({ x, y, o: id === 'impureza' && i === 1 && j === -1 })
      }
    return p
  }
  const estado = (id: DefectoId) =>
    enDefecto(s, id) ? t.enCurso : completo(s, id) ? t.superado : puedeEntrar(s, id) ? '' : t.cerrado

  function textoFalta(id: DefectoId) {
    const f = falta(s, id)
    if (f === 'anterior') return t.falta.anterior(nombre(DEFECTOS[DEFECTOS.indexOf(id) - 1]))
    if (f === 'red') return t.falta.red(Number(cfgRq(id).red[1]))
    if (f === 'estratos') return t.falta.estratos(cfgRq(id).estratos_abiertos ?? 0, s.estratos.abiertos)
    if (f === 'hecho') return t.falta.hecho
    if (f === 'otro') return t.falta.otro
    if (f === 'cristales') return t.falta.cristales
    return t.entrarQue
  }
  const cfgRq = (id: DefectoId) => CFG1.defectos.requisitos[id]

  function entrar() {
    if (!puedeEntrar(juego.s, foco)) return
    sonido.compra('other')
    entrarDefectoYa(foco)
  }
  const prog = $derived(progresoCompresion(s))
</script>

{#snippet cristal(id: DefectoId, r: number)}
  <svg class="red" viewBox="-30 -30 60 60" aria-hidden="true" style:--c={COLOR[id]}>
    {#if id === 'dislocacion'}<path class="plano" d="M-28-5H28" />{/if}
    {#if id === 'macla'}<path class="plano" d="M-28 0H28" />{/if}
    {#if id === 'vacancia'}<circle class="hueco" r={r} />{/if}
    {#each red(id) as a}<circle class="atomo" class:otro={a.o} cx={a.x} cy={a.y} r={a.o ? r * 1.45 : r} />{/each}
  </svg>
{/snippet}

<section class="defectos" aria-label={txt.cristal.pantallas.defectos}>
  <div class="vista">
    <ol class="cadena" aria-label={t.lista}>
      {#each DEFECTOS as id (id)}
        <li>
          <button class="emblema" class:hecho={completo(s, id)} class:actual={enDefecto(s, id)} class:abierto={puedeEntrar(s, id)}
            aria-pressed={foco === id} aria-label={t.emblema(nombre(id), estado(id) || t.entrar)} onclick={() => (foco = id)}>
            {@render cristal(id, 3)}
            <span class="nombre">{nombre(id)}</span>
            <small>{estado(id) || t.meta(metaLog10(id))}</small>
          </button>
        </li>
      {/each}
    </ol>

    <aside class="ficha placa grietas" aria-live="polite">
      <header style:--c={COLOR[foco]}>
        {@render cristal(foco, 3.4)}
        <div>
          <h2>{nombre(foco)}</h2>
          <p class="sub">{t.cristal[foco]}</p>
        </div>
        {#if estado(foco)}<span class="sello" class:hecho={completo(s, foco)}>{estado(foco)}</span>{/if}
      </header>
      <dl>
        <div><dt>{t.rotulos.regla}</dt><dd>{regla(foco)}</dd></div>
        <div><dt>{t.rotulos.meta}</dt><dd class="num">{t.meta(metaLog10(foco))}</dd></div>
        <div><dt>{t.rotulos.requisito}</dt><dd>{requisito(foco)}</dd></div>
        <div><dt>{t.rotulos.recompensa}</dt><dd class="premio num">{recompensa(foco)}</dd></div>
      </dl>

      <div class="pie">
        {#if enDefecto(s, foco)}
          <div class="cambia num">
            <span>{t.rotulos.cambia}</span>
            <ul>{#each cambios(s) as c}<li>{t.mult[c.id]} <b>{c.dentro}</b>{#if c.fuera}<s>{c.fuera}</s>{/if}</li>{/each}</ul>
          </div>
          <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.floor(prog.p * 100)}
            aria-label="{t.meta(metaLog10(foco))} · {txt.progreso(prog.final ? prog.p : 0)}">
            <i style:width="{(prog.final ? prog.p : 0) * 100}%"></i>
          </div>
          <button class="gema abandonar" onclick={abandonarDefectoYa}><b>{t.abandonar}</b><small>{t.abandonarQue}</small></button>
        {:else if completo(s, foco)}
          <p class="nota">{t.falta.hecho}</p>
        {:else}
          {@const v = volverCon(s, foco)}
          {#if v !== null}<p class="nota volver num">{t.volver(formato(Decimal.pow10(v)), formato(s.cristalesTotales))}</p>{/if}
          <button class="gema entrar" aria-disabled={!puedeEntrar(s, foco)} onclick={entrar}>
            <b>{t.entrar}</b><small>{textoFalta(foco)}</small>
          </button>
        {/if}
      </div>
    </aside>
  </div>
  <p class="que">{t.que}</p>
</section>

<style>
  .defectos { display: grid; grid-template-rows: minmax(0, 1fr) auto; height: 100%; min-height: 0; justify-items: center; gap: 0.75rem; padding: 1.25rem 0 0; animation: entrar 0.3s ease-out; }
  @keyframes entrar { from { opacity: 0; } }
  .que { max-width: 44rem; margin: 0; color: var(--tenue); text-align: center; text-wrap: balance; font-size: 0.875rem; }
  .vista { display: grid; grid-template-columns: 15rem minmax(0, 27rem); gap: 2.5rem; align-items: center; justify-content: center; width: min(100%, 72rem); min-height: 0; }

  /* La cadena: cuatro cristales unidos por una línea de escarcha; el superado se enciende con su color. */
  .cadena { position: relative; display: grid; gap: 0.6rem; margin: 0; padding: 0; list-style: none; }
  .cadena::before { content: ''; position: absolute; left: 2.25rem; top: 2rem; bottom: 2rem; width: 1px; background: linear-gradient(var(--hielo-linea), rgb(159 227 245 / 0.35), var(--hielo-linea)); }
  .emblema {
    position: relative; display: grid; grid-template-columns: 4.5rem 1fr; grid-template-rows: auto auto; align-items: center; column-gap: 0.75rem;
    width: 100%; min-height: 4.5rem; padding: 0; border: 0; background: none; color: var(--apagado); font: inherit; text-align: left; cursor: pointer;
  }
  .emblema .red { grid-row: 1 / span 2; width: 4.5rem; height: 4.5rem; background: var(--fondo); }
  .emblema .nombre { align-self: end; font-size: 1.0625rem; font-weight: 600; transition: color 0.3s; }
  .emblema small { align-self: start; font-size: 0.8125rem; color: var(--apagado); }
  .emblema.abierto, .emblema.hecho, .emblema.actual { color: var(--tenue); }
  .emblema[aria-pressed='true'] .nombre { color: var(--escarcha); }
  .emblema[aria-pressed='true']::after {
    content: ''; position: absolute; left: -0.9rem; top: 50%; width: 7px; height: 7px; margin-top: -3.5px; rotate: 45deg;
    border: 1.5px solid var(--hielo); background: var(--fondo);
  }
  .emblema:focus-visible { outline: 2px solid var(--hielo); outline-offset: 2px; }

  /* La red: átomos de hielo; superada, de su color de nivel; en curso, late despacio (no con Reducir movimiento). */
  .red { overflow: visible; }
  .atomo { fill: rgb(159 227 245 / 0.18); stroke: rgb(159 227 245 / 0.45); stroke-width: 0.8; }
  .otro { fill: color-mix(in srgb, var(--c) 45%, transparent); stroke: var(--c); }
  .hueco { fill: none; stroke: var(--c); stroke-width: 0.8; stroke-dasharray: 1.6 1.6; opacity: 0.8; }
  .plano { stroke: var(--c); stroke-width: 0.7; stroke-dasharray: 3 2; opacity: 0.7; }
  .hecho .atomo, header .atomo { fill: color-mix(in srgb, var(--c) 40%, transparent); stroke: var(--c); }
  .emblema:not(.abierto, .hecho, .actual) .red { opacity: 0.45; }
  .actual .red { animation: late 2.4s ease-in-out infinite; }
  @keyframes late { 50% { filter: drop-shadow(0 0 0.35rem var(--c)); } }
  :global(.quieto) .actual .red { animation: none; filter: drop-shadow(0 0 0.3rem var(--c)); }
  @media (prefers-reduced-motion: reduce) { .actual .red { animation: none; } }

  /* La ficha: placa de hielo de tamaño fijo (no late al cambiar de Defecto). */
  .ficha { --f: 1rem; display: grid; grid-template-rows: auto auto minmax(0, 1fr); gap: 0.85rem; height: min(30rem, 100%); overflow: hidden; padding: 0.9rem 1.2rem 1.2rem; }
  header {
    display: grid; grid-template-columns: 3.5rem minmax(0, 1fr) auto; align-items: center; gap: 0.8rem; padding-bottom: 0.6rem;
    background: linear-gradient(90deg, transparent, rgb(159 227 245 / 0.3), transparent) bottom / 100% 1px no-repeat;
  }
  header .red { width: 3.5rem; height: 3.5rem; }
  h2 { margin: 0; font-size: 1.5rem; font-weight: 300; }
  .sub { margin: 0.1rem 0 0; font-size: 0.8125rem; color: var(--tenue); }
  .sello { padding: 0.2rem 0.6rem; font-size: 0.75rem; color: var(--hielo); background: rgb(159 227 245 / 0.08); clip-path: polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%); white-space: nowrap; }
  .sello.hecho { color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
  dl { display: grid; gap: 0.6rem; margin: 0; }
  dt { font-size: 0.75rem; color: var(--tenue); letter-spacing: 0.04em; text-transform: uppercase; }
  dd { margin: 0.1rem 0 0; font-size: 0.9375rem; color: var(--tinta); text-wrap: pretty; }
  .premio { color: var(--hielo); }
  .pie { display: grid; align-content: end; gap: 0.6rem; min-height: 0; }
  .nota { margin: 0; font-size: 0.8125rem; color: var(--tenue); }
  .volver { color: var(--escarcha); }
  .gema { --b: 1.1rem; display: grid; gap: 0.15rem; min-height: 3.25rem; font-size: 1.0625rem; }
  .gema small { font-size: 0.75rem; color: var(--apagado); }
  .abandonar { --c: var(--coral); }
  .cambia { font-size: 0.75rem; color: var(--tenue); }
  .cambia ul { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0.3rem 0 0; padding: 0; list-style: none; }
  .cambia li { padding: 0.2rem 0.45rem; white-space: nowrap; background: rgb(159 227 245 / 0.06); clip-path: polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%); }
  .cambia b { font-weight: 600; color: var(--escarcha); }
  .cambia s { margin-left: 0.3rem; color: var(--apagado); }
  .barra { height: 3px; background: rgb(159 227 245 / 0.12); }
  .barra i { display: block; height: 100%; background: var(--hielo); transition: width 0.3s; }

  @media (max-height: 800px) and (min-width: 761px) {
    .defectos { gap: 0.5rem; padding-top: 0.75rem; }
    .ficha { gap: 0.6rem; height: min(28.5rem, 100%); }
    .emblema { min-height: 4rem; }
    .emblema .red { width: 4rem; height: 4rem; }
  }
  /* Celular: los cuatro en fila arriba (solo la red y el nombre) y la ficha debajo. */
  @media (max-width: 760px) {
    .defectos { gap: 0.4rem; padding-top: 0.6rem; }
    .vista { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); gap: 0.6rem; align-items: stretch; }
    .cadena { grid-template-columns: repeat(4, 1fr); gap: 0.25rem; }
    .cadena::before { left: 12%; right: 12%; top: 1.75rem; bottom: auto; width: auto; height: 1px; }
    .emblema { grid-template-columns: 1fr; justify-items: center; min-height: 0; text-align: center; }
    .emblema .red { grid-row: auto; width: 3.5rem; height: 3.5rem; }
    .emblema .nombre { font-size: 0.8125rem; }
    .emblema small { display: none; }
    .emblema[aria-pressed='true']::after { left: 50%; top: auto; bottom: -0.45rem; margin: 0 0 0 -3.5px; }
    .ficha { height: 100%; padding: 0.6rem 0.9rem 0.9rem; gap: 0.5rem; }
    h2 { font-size: 1.25rem; }
    header { grid-template-columns: 2.75rem minmax(0, 1fr) auto; }
    header .red { width: 2.75rem; height: 2.75rem; }
    dl { gap: 0.4rem; }
    dd { font-size: 0.875rem; }
    .que { display: none; } /* está en "Cómo funciona" */
  }
</style>
