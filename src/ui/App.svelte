<script lang="ts">
  // Interfaz principal (SPEC 6.4). Cada parte aparece recién cuando juego.vistos lo dice (SPEC 5).
  import { CFG, anillos, comprimir, densidad, multAnillos, produccion, puedeComprimir } from '../core'
  import { es } from '../strings/es'
  import Debug from './Debug.svelte'
  import Pila from './Pila.svelte'
  import Sismografo from './Sismografo.svelte'
  import Tienda from './Tienda.svelte'
  import { formato, formatoMult } from './formato'
  import { juego, progresoCompresion } from './juego.svelte'

  const v = $derived(juego.vistos)
  const s = $derived(juego.s)

  // Compresión: el anillo alrededor de la pila (Pila.svelte) muestra el progreso; acá, el botón con meta y porcentaje.
  const comp = $derived(progresoCompresion(s))
  const lista = $derived(puedeComprimir(s))
  const fin = $derived(s.infinitos > 0)
  const alternarAutoComp = () =>
    (juego.s = { ...juego.s, auto: { ...juego.s.auto, compresion_auto: !juego.s.auto.compresion_auto } })

  // Ajustes: un ícono arriba a la derecha abre el panel; se cierra con Escape o tocando afuera.
  let ajustes = $state(false)
  let panel: HTMLElement | undefined = $state()
  const afuera = (e: PointerEvent) => ajustes && panel && !panel.contains(e.target as Node) && (ajustes = false)
  const escape = (e: KeyboardEvent) => e.key === 'Escape' && ((ajustes = false), (juego.ausencia = null))
  const enfocar = (el: HTMLElement) => el.focus()

  // Móvil: la tienda es una hoja inferior; se arrastra o se toca la manija.
  let alta = $state(false)
  let arrastre = $state<number | null>(null)
  let y0 = 0
  function bajar(e: PointerEvent) {
    y0 = e.clientY
    arrastre = 0
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const mover = (e: PointerEvent) => arrastre !== null && (arrastre = e.clientY - y0)
  function soltar() {
    if (arrastre === null) return
    if (Math.abs(arrastre) < 6) alta = !alta // un toque
    else if (arrastre < -40) alta = true
    else if (arrastre > 40) alta = false
    arrastre = null
  }
</script>

<svelte:window onpointerdown={afuera} onkeydown={escape} />

<!-- .lista: se puede comprimir; el botón y el anillo de la pila laten juntos (arrancan en el mismo cuadro). -->
<div class="juego" class:quieto={juego.reducirDestellos} class:lista class:fin>
  <Pila />

  <header class="izq">
    <span class="etiqueta">{es.energia}</span>
    {#if fin}<span class="energia infinito">{es.infinito}</span>{:else}<span class="energia num">{formato(s.energia)}</span>{/if}
    {#if v.tienda}<span class="linea num aparece"><b class="ambar">+{formato(produccion(s))}</b> {es.energiaPorSegundo}</span>{/if}
    {#if s.compresiones > 0}
      <span class="linea num aparece">{es.densidad} <b>^{formatoMult(densidad(s))}</b></span>
    {/if}
  </header>

  <div class="ajustes" bind:this={panel}>
    <button class="icono" aria-label={es.ajustes} aria-expanded={ajustes} onclick={() => (ajustes = !ajustes)}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M2 5h8M14 5h2M2 13h2M8 13h8" /><circle cx="12" cy="5" r="2" /><circle cx="6" cy="13" r="2" />
      </svg>
    </button>
    {#if ajustes}
      <div class="panel" role="dialog" aria-label={es.ajustes}>
        <label><input type="checkbox" bind:checked={juego.reducirDestellos} /> {es.reducirDestellos}</label>
      </div>
    {/if}
  </div>

  {#if juego.aviso}
    {#key juego.aviso.id}<p class="aviso" role="status">{juego.aviso.texto}</p>{/key}
  {/if}

  {#if !v.tienda}<p class="pista">{es.pista}</p>{/if}

  {#if v.derrumbes}
    <footer class="sismo aparece">
      <Sismografo />
      <p class="chico num">
        {#if v.anillos}<span class="aparece">{es.anillos(anillos(s.granos))} <b>{es.mult(formatoMult(multAnillos(s)))}</b></span>{/if}
        {#if juego.escalaK > 0}{#key juego.escalaK}<span class="aparece">{es.escala(juego.escalaK)}</span>{/key}{/if}
      </p>
    </footer>
  {/if}

  {#if v.tienda}
    <section
      class="der aparece"
      class:alta
      class:arrastrando={arrastre !== null}
      style:--arrastre="{arrastre ?? 0}px"
      aria-label={es.tienda}
    >
      <button
        class="manija"
        aria-label={alta ? es.cerrarTienda : es.abrirTienda}
        aria-expanded={alta}
        onpointerdown={bajar}
        onpointermove={mover}
        onpointerup={soltar}
        onpointercancel={soltar}
      ></button>
      <div class="contenido">
        <Tienda />
        {#if v.compresion}
          <!-- Después de la última Compresión la meta es el Infinito: llega solo. -->
          <button class="comprimir aparece" disabled={!lista} onclick={() => (juego.s = comprimir(juego.s))}>
            <span class="nombre">{comp.final ? es.haciaInfinito : es.comprimir}</span>
            <span class="meta num">
              {#if !comp.final}{es.compresion(s.compresiones + 1)}{' · '}{/if}{es.meta(comp.meta)} · <b>{es.progreso(comp.p)}</b>
              {#if !lista && juego.eta !== null} · {es.eta(es.duracion(juego.eta))}{/if}
            </span>
          </button>
          {#if v.auto_compresion_auto && !comp.final}
            <label class="autocomp aparece">
              <input type="checkbox" checked={s.auto.compresion_auto} onchange={alternarAutoComp} /> {es.compresionAuto}
            </label>
          {/if}
        {/if}
      </div>
    </section>
  {/if}
</div>

{#if fin}
  <!-- SPEC 6.6: después del blanco, el colapso y un segundo de silencio, el final de la capa. -->
  <section class="final" aria-label={es.fin.titulo}>
    <p class="simbolo" aria-hidden="true">{es.infinito}</p>
    <h1>{es.fin.titulo}</h1>
    <dl class="num">
      <dt>{es.fin.tiempo}</dt><dd>{es.duracion(s.tiempoTotal)}</dd>
      <dt>{es.fin.compresiones}</dt><dd>{s.compresiones}</dd>
      <dt>{es.fin.record}</dt><dd>{es.fin.derrumbes(formato(juego.record))}</dd>
    </dl>
    <p class="adelanto">{es.fin.adelanto}</p>
  </section>
{/if}

{#if juego.guardadoRoto}
  <!-- No se cierra con Escape ni tocando afuera: hasta aceptar, no se guarda nada. -->
  <div class="velo">
    <div class="cartel" role="alertdialog" aria-modal="true" aria-labelledby="roto-t" aria-describedby="roto-d">
      <h2 id="roto-t">{es.guardadoRoto.titulo}</h2>
      <p id="roto-d">{es.guardadoRoto.texto}</p>
      <button use:enfocar onclick={() => (juego.guardadoRoto = false)}>{es.guardadoRoto.empezar}</button>
    </div>
  </div>
{:else if juego.ausencia}
  {@const a = juego.ausencia}
  <div class="velo" role="presentation" onclick={(e) => e.target === e.currentTarget && (juego.ausencia = null)}>
    <div class="cartel" role="dialog" aria-modal="true" aria-labelledby="ausencia-t">
      <h2 id="ausencia-t">{es.ausencia.titulo}</h2>
      <p>
        {a.segundos >= CFG.fuera_de_linea.tope_horas * 3600
          ? es.ausencia.tope(CFG.fuera_de_linea.tope_horas)
          : es.ausencia.tiempo(es.duracion(a.segundos))}
      </p>
      <dl class="num">
        <dt>{es.ausencia.energia}</dt><dd>+{formato(a.energia)}</dd>
        {#if a.compresiones > 0}<dt>{es.ausencia.compresiones}</dt><dd>+{a.compresiones}</dd>{/if}
      </dl>
      <button use:enfocar onclick={() => (juego.ausencia = null)}>{es.ausencia.seguir}</button>
    </div>
  </div>
{/if}

{#if import.meta.env.DEV}<Debug />{/if}

<style>
  /* Escritorio: el canvas ocupa la ventana y la pila queda en el centro exacto. La interfaz flota encima, sin cajas,
     en dos columnas del mismo ancho (simetría alrededor de la pila). */
  .juego { --col: clamp(16rem, 21vw, 21rem); --margen: 2rem; }

  .izq, .sismo, .der, .aviso, .pista { text-shadow: 0 0 0.75rem var(--fondo), 0 0 0.25rem var(--fondo); }
  b { font-weight: 600; color: var(--tinta); }
  .ambar { color: var(--ambar); }

  .izq {
    position: fixed; top: var(--margen); left: var(--margen); width: var(--col);
    display: grid; justify-items: start; pointer-events: none;
  }
  .etiqueta { font-size: 0.875rem; color: var(--tenue); }
  .energia { font-size: clamp(2.5rem, 4vw, 3.75rem); font-weight: 600; line-height: 1; letter-spacing: -0.03em; margin: 0.125rem 0 0.5rem; }
  .linea { font-size: 1rem; color: var(--tenue); line-height: 1.6; }

  .aviso {
    position: fixed; top: var(--margen); left: 50%; translate: -50% 0; width: max-content;
    max-width: min(28rem, calc(100% - 2 * var(--col) - 4 * var(--margen)));
    margin: 0; font-size: 0.9375rem; text-align: center; text-wrap: balance; pointer-events: none; animation: aviso 6s ease-out forwards;
  }
  .pista {
    position: fixed; left: 0; right: 0; top: calc(50% + 4.5rem); margin: 0; text-align: center;
    font-size: 1.1rem; color: var(--tenue); pointer-events: none; animation: latir 2.4s ease-in-out infinite;
  }

  .sismo { position: fixed; left: var(--margen); bottom: var(--margen); width: var(--col); pointer-events: none; }
  .chico { display: flex; flex-wrap: wrap; gap: 0 1rem; margin: 0.5rem 0 0; font-size: 0.8125rem; color: var(--tenue); }

  .der {
    position: fixed; top: var(--margen); right: var(--margen); bottom: var(--margen); width: var(--col);
    display: flex; flex-direction: column;
  }
  .contenido { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; }
  .manija { display: none; }

  .comprimir {
    display: grid; gap: 0.125rem; width: 100%; margin-top: 1.5rem; padding: 0.75rem 0; border: 0; border-top: 1px solid var(--borde);
    background: none; color: var(--tinta); font: inherit; text-align: left; cursor: pointer;
  }
  .comprimir .nombre { font-size: 1.25rem; font-weight: 600; }
  .comprimir .meta { font-size: 0.875rem; color: var(--tenue); }
  .comprimir:disabled { cursor: default; }
  .comprimir .nombre { color: var(--apagado); transition: color 0.6s; }
  /* Se puede comprimir: el texto se enciende y late, a la vez que el anillo (Pila.svelte). */
  .lista .comprimir .nombre { color: var(--tinta); animation: latido 2.4s ease-in-out infinite; }
  .quieto .comprimir .nombre { animation: none; text-shadow: 0 0 0.75rem rgb(232 233 243 / 0.6); }
  @keyframes latido {
    0%, 100% { text-shadow: 0 0 0.75rem rgb(232 233 243 / 0.7), 0 0 0.25rem var(--fondo); }
    50% { text-shadow: 0 0 0.25rem rgb(232 233 243 / 0.2), 0 0 0.25rem var(--fondo); opacity: 0.75; }
  }

  .autocomp { display: flex; align-items: center; gap: 0.5rem; min-height: 2.25rem; font-size: 0.8125rem; color: var(--tenue); cursor: pointer; }
  .autocomp input { margin: 0; accent-color: var(--tinta); }

  /* SPEC 6.6, Infinito. Pila.svelte hace el blanco (0–2 s) y el colapso (2–2,8 s); el número ya es ∞; el resto se apaga,
     un segundo de silencio y aparece el final (3,8 s). */
  .infinito { animation: fundido 1.2s ease-out; text-shadow: 0 0 1.5rem rgb(255 255 255 / 0.7); }
  .juego.fin .der, .fin .sismo, .fin .aviso, .fin .ajustes { pointer-events: none; animation: irse 0.8s 1.2s ease-in forwards; }
  .fin .izq { animation: irse 0.8s 2.2s ease-in forwards; }
  @keyframes irse { to { opacity: 0; visibility: hidden; } }
  .final {
    position: fixed; inset: 0; z-index: 5; display: grid; place-content: center; justify-items: center; gap: 0.5rem;
    padding: 2rem; text-align: center; background: radial-gradient(circle, rgb(20 22 40 / 0.6), transparent 70%);
    opacity: 0; animation: llegar 1.2s 3.8s ease-out forwards;
  }
  .simbolo { margin: 0; font-size: clamp(4rem, 12vw, 7rem); font-weight: 300; line-height: 1; text-shadow: 0 0 2rem rgb(255 255 255 / 0.5); }
  .final h1 { margin: 0 0 1.5rem; font-size: 1.5rem; font-weight: 600; }
  .final dl { display: grid; grid-template-columns: auto auto; gap: 0.5rem 2rem; margin: 0 0 2rem; text-align: left; }
  .final dt { color: var(--tenue); }
  .final dd { margin: 0; font-weight: 600; text-align: right; }
  .adelanto { margin: 0; font-size: 0.9375rem; color: var(--violeta); letter-spacing: 0.01em; }
  @keyframes llegar { to { opacity: 1; } }

  /* "Mientras no estabas" y el aviso de guardado dañado. */
  .velo { position: fixed; inset: 0; z-index: 6; display: grid; place-items: center; padding: 1rem; background: rgb(7 8 15 / 0.6); animation: fundido 0.3s ease-out; }
  .cartel { width: min(22rem, 100%); padding: 1.5rem; border: 1px solid var(--borde); background: rgb(7 8 15 / 0.94); }
  .cartel h2 { margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 600; }
  .cartel p { margin: 0 0 1rem; font-size: 0.9375rem; color: var(--tenue); text-wrap: pretty; }
  .cartel dl { display: grid; grid-template-columns: 1fr auto; gap: 0.375rem 1.5rem; margin: 0 0 1.25rem; }
  .cartel dt { color: var(--tenue); }
  .cartel dd { margin: 0; font-weight: 600; text-align: right; }
  .cartel button {
    width: 100%; min-height: 2.75rem; border: 1px solid var(--borde); background: none; color: var(--tinta);
    font: inherit; font-weight: 600; cursor: pointer;
  }
  .cartel button:hover, .cartel button:focus-visible { border-color: var(--tinta); }

  .ajustes { position: fixed; top: var(--margen); right: calc(var(--margen) - 0.6875rem); z-index: 2; } /* el trazo del ícono, al ras de la lista */
  .icono {
    display: grid; place-items: center; width: 2.25rem; height: 2.25rem; padding: 0; border: 0; background: none;
    color: var(--apagado); cursor: pointer; transition: color 0.15s;
  }
  .icono:hover, .icono[aria-expanded='true'] { color: var(--tinta); }
  .icono svg { fill: var(--fondo); stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }
  .panel {
    position: absolute; top: 100%; right: 0.5rem; width: max-content; padding: 0.25rem 1rem;
    border: 1px solid var(--borde); background: rgb(7 8 15 / 0.94);
  }
  .panel label { display: flex; align-items: center; gap: 0.625rem; min-height: 2.75rem; font-size: 0.875rem; cursor: pointer; }
  .panel input { margin: 0; accent-color: var(--tinta); }

  .aparece { animation: aparecer 0.6s ease-out; }
  .der.aparece { animation-name: fundido; } /* sin transform: en móvil la hoja usa el suyo */
  @keyframes fundido { from { opacity: 0; } }
  :global(.quieto) .pista { animation: none; }
  @keyframes aparecer { from { opacity: 0; transform: translateY(4px); } }
  @keyframes aviso { 0% { opacity: 0; } 8%, 80% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes latir { 50% { opacity: 0.45; } }

  /* Móvil (vertical): pila arriba centrada, Energía arriba, tienda como hoja inferior deslizable. */
  @media (max-width: 767px) {
    .juego { --margen: 1rem; --col: auto; --pila-arriba: 7rem; --pila-abajo: calc(45dvh + 3.5rem); --hoja: 88dvh; }
    .izq { right: var(--margen); }
    .energia { font-size: 2.25rem; margin-bottom: 0.25rem; }
    .linea { font-size: 0.875rem; line-height: 1.4; }
    .aviso { top: auto; bottom: calc(45dvh + 4rem); max-width: calc(100% - 2rem); font-size: 0.8125rem; }
    .pista { top: calc(50% - 2rem); }
    .sismo {
      right: var(--margen); bottom: calc(45dvh + 0.5rem);
      display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 1rem;
    }
    .sismo :global(canvas) { height: 2rem; }
    .chico { flex-direction: column; align-items: end; margin: 0; font-size: 0.75rem; }
    .der {
      top: auto; left: 0; right: 0; bottom: 0; width: auto; height: var(--hoja); padding: 0 1rem 1rem;
      border-top: 1px solid var(--borde); background: rgb(7 8 15 / 0.94); text-shadow: none;
      transform: translateY(calc(var(--hoja) - 45dvh + var(--arrastre)));
      transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .der.alta { transform: translateY(max(0px, var(--arrastre))); }
    .der.arrastrando { transition: none; }
    .manija { display: block; flex: none; width: 100%; height: 1.75rem; border: 0; background: none; cursor: grab; touch-action: none; }
    .manija::before { content: ''; display: block; width: 2.5rem; height: 3px; margin: 0 auto; border-radius: 2px; background: var(--apagado); }
    .contenido { flex: 1; }
    .der:not(.alta) .contenido { flex: none; max-height: calc(45dvh - 2.75rem); }
  }
  @media (max-width: 767px) and (prefers-reduced-motion: reduce) { .der { transition: none; } }
</style>
