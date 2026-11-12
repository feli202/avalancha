<script lang="ts">
  // Interfaz principal (SPEC 6.4). Cada parte aparece recién cuando juego.vistos lo dice (SPEC 5).
  import { CFG, densidad, multAnillos, anillos, produccion } from '../core'
  import { es } from '../strings/es'
  import Debug from './Debug.svelte'
  import Pila from './Pila.svelte'
  import Tienda from './Tienda.svelte'
  import { formato, formatoMult } from './formato'
  import { juego } from './juego.svelte'

  const v = $derived(juego.vistos)
  const s = $derived(juego.s)

  // Barra de Compresión: escala logarítmica, del umbral anterior al siguiente (SPEC 6.4).
  const umbrales = CFG.compresion.umbrales_log10
  const meta = $derived(umbrales[s.compresiones])
  const progreso = $derived.by(() => {
    const desde = umbrales[s.compresiones - 1] ?? 0
    const e = s.energia.gt(1) ? s.energia.log10() : 0
    return Math.min(1, Math.max(0, (e - desde) / (meta - desde)))
  })

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

<div class="juego" class:quieto={juego.reducirDestellos} class:sin-tienda={!v.tienda}>
  <Pila />

  <header class="arriba">
    <div class="energia">
      <span class="etiqueta">{es.energia}</span>
      <span class="valor num">{formato(s.energia)}</span>
      {#if v.tienda}<span class="porseg num aparece">+{formato(produccion(s))} <span class="tenue">{es.energiaPorSegundo}</span></span>{/if}
    </div>
    {#if s.compresiones > 0}
      <div class="densidad aparece">
        <span class="etiqueta">{es.densidad}</span>
        <span class="valor chico num">^{formatoMult(densidad(s))}</span>
      </div>
    {/if}
  </header>

  {#if juego.aviso}
    {#key juego.aviso.id}<p class="aviso" role="status">{juego.aviso.texto}</p>{/key}
  {/if}

  {#if !v.tienda}<p class="pista">{es.pista}</p>{/if}

  <footer class="abajo">
    <p class="stats num">
      {#if v.derrumbes}
        <span class="aparece"><b>{formatoMult(CFG.K_derrumbes_por_grano * s.granos)}</b> {es.derrumbesPorGrano}</span>
      {/if}
      {#if v.anillos}
        <span class="aparece">{es.anillos(anillos(s.granos))} <b>{es.mult(formatoMult(multAnillos(s)))}</b></span>
      {/if}
      {#if juego.escalaK > 0}{#key juego.escalaK}<span class="aparece">{es.escala(juego.escalaK)}</span>{/key}{/if}
    </p>

    {#if v.compresion && meta !== undefined}
      <div class="compresion vidrio aparece">
        <span class="titulo">{es.compresion(s.compresiones + 1)} <span class="tenue">▸</span> <span class="num">{es.meta(meta)}</span></span>
        <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.floor(progreso * 100)} aria-label={es.compresion(s.compresiones + 1)}>
          <div class="relleno" style:transform="scaleX({progreso})"></div>
        </div>
        <span class="pct num">{es.progreso(progreso)}</span>
        <!-- La Compresión funciona desde el hito 4. -->
        <button class="comprimir" disabled>{es.comprimir}</button>
      </div>
    {/if}
  </footer>

  {#if v.tienda}
    <section
      class="tienda vidrio aparece"
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
      <div class="contenido"><Tienda /></div>
    </section>
  {/if}
</div>

{#if import.meta.env.DEV}<Debug />{/if}

<style>
  /* Medidas del layout: escritorio = pila a la izquierda, tienda a la derecha. */
  .juego {
    --tienda-ancho: clamp(20rem, 26vw, 24rem);
    --margen: 1.25rem;
    --pila-derecha: calc(var(--tienda-ancho) + 2 * var(--margen));
    --pila-abajo: 0px;
  }
  /* SPEC 5: antes de la tienda, la pila ocupa toda la pantalla. */
  .juego.sin-tienda { --pila-arriba: 0px; --pila-derecha: 0px; --pila-abajo: 0px; }

  .vidrio {
    border: 1px solid var(--borde); border-radius: 16px;
    background: var(--vidrio); backdrop-filter: blur(14px) saturate(1.2); -webkit-backdrop-filter: blur(14px) saturate(1.2);
  }
  .tenue { color: var(--tenue); }
  .etiqueta { display: block; font-size: 0.75rem; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: var(--tenue); }

  .arriba {
    position: fixed; top: var(--margen); left: var(--margen); right: var(--pila-derecha);
    display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; pointer-events: none;
  }
  /* Legibles sobre la pila llena, sin caja. */
  .arriba, .stats, .pista { text-shadow: 0 0 0.75rem var(--fondo), 0 0 0.25rem var(--fondo); }
  .valor { display: block; font-size: clamp(2rem, 3.4vw, 3rem); font-weight: 600; line-height: 1.05; letter-spacing: -0.02em; }
  .valor.chico { font-size: clamp(1.25rem, 2vw, 1.75rem); }
  .densidad { text-align: right; }
  .porseg { display: block; margin-top: 0.25rem; font-size: 0.95rem; color: var(--ambar); }

  .aviso {
    position: fixed; top: 6.5rem; left: 0; right: var(--pila-derecha); margin: 0 auto; width: max-content; max-width: calc(100% - 2rem);
    padding: 0.5rem 1rem; border: 1px solid var(--borde); border-radius: 999px; background: var(--vidrio);
    font-size: 0.9rem; text-align: center; pointer-events: none; animation: aviso 6s ease-out forwards;
  }
  .pista {
    position: fixed; left: 0; right: var(--pila-derecha); top: calc(50% + 4.5rem); margin: 0; text-align: center;
    font-size: 1.1rem; color: var(--tenue); pointer-events: none; animation: latir 2.4s ease-in-out infinite;
  }

  .abajo {
    position: fixed; left: var(--margen); right: var(--pila-derecha); bottom: var(--margen);
    display: grid; gap: 0.75rem; justify-items: center; pointer-events: none;
  }
  .stats { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.25rem 1.5rem; margin: 0; font-size: 0.875rem; color: var(--tenue); }
  .stats b { font-weight: 600; color: var(--tinta); }

  .compresion {
    display: grid; grid-template-columns: auto minmax(2rem, 1fr) auto auto; align-items: center; gap: 1rem;
    width: 100%; padding: 0.625rem 0.625rem 0.625rem 1rem; pointer-events: auto;
  }
  .titulo { font-weight: 600; white-space: nowrap; }
  .barra { height: 6px; border-radius: 3px; background: rgb(255 255 255 / 0.08); overflow: hidden; }
  .relleno {
    height: 100%; transform-origin: left; transition: transform 0.3s linear;
    background: linear-gradient(90deg, var(--ambar), var(--coral), var(--jade), var(--violeta));
  }
  .pct { min-width: 3.5rem; text-align: right; color: var(--tenue); }
  .comprimir {
    min-height: 2.75rem; padding: 0 1.25rem; border: 1px solid var(--borde); border-radius: 10px; background: none;
    color: var(--apagado); font: inherit; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  }

  .tienda {
    position: fixed; top: var(--margen); right: var(--margen); bottom: var(--margen); width: var(--tienda-ancho);
    display: flex; flex-direction: column; padding: 1rem;
  }
  .contenido { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
  .manija { display: none; }

  .aparece { animation: aparecer 0.6s ease-out; }
  .tienda.aparece { animation-name: fundido; } /* sin transform: en móvil la hoja usa el suyo */
  @keyframes fundido { from { opacity: 0; } }
  :global(.quieto) .pista { animation: none; }
  @keyframes aparecer { from { opacity: 0; transform: translateY(4px); } }
  @keyframes aviso { 0% { opacity: 0; } 8%, 80% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes latir { 50% { opacity: 0.45; } }

  /* Móvil (vertical): pila arriba en el 55 %, Energía fija arriba, tienda como hoja inferior deslizable. */
  @media (max-width: 767px) {
    .juego { --margen: 1rem; --pila-arriba: 5.5rem; --pila-derecha: 0px; --pila-abajo: calc(45dvh + 4.5rem); --hoja: 88dvh; }
    .arriba { right: var(--margen); }
    .aviso { top: 5.25rem; font-size: 0.8rem; white-space: normal; }
    .pista { top: calc(50% + 3.5rem); }
    .abajo { bottom: calc(45dvh + 0.5rem); gap: 0.5rem; right: var(--margen); }
    .stats { font-size: 0.75rem; gap: 0.1rem 1rem; }
    .compresion { grid-template-columns: auto 1fr auto; gap: 0.625rem; padding: 0.5rem 0.75rem; font-size: 0.8rem; }
    .comprimir { display: none; }
    .tienda {
      top: auto; left: 0; right: 0; bottom: 0; width: auto; height: var(--hoja); padding: 0 1rem 1rem;
      border-radius: 20px 20px 0 0; border-bottom: 0;
      transform: translateY(calc(var(--hoja) - 45dvh + var(--arrastre)));
      transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .tienda.alta { transform: translateY(max(0px, var(--arrastre))); }
    .tienda.arrastrando { transition: none; }
    .manija { display: block; flex: none; width: 100%; height: 1.75rem; border: 0; background: none; cursor: grab; touch-action: none; }
    .manija::before { content: ''; display: block; width: 2.5rem; height: 4px; margin: 0 auto; border-radius: 2px; background: var(--tenue); }
    .contenido { flex: 1; }
    .tienda:not(.alta) .contenido { flex: none; max-height: calc(45dvh - 2.75rem); }
  }
  @media (max-width: 767px) and (prefers-reduced-motion: reduce) { .tienda { transition: none; } }
</style>
