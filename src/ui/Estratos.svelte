<script lang="ts">
  // SPEC_CAPA1 §7.4 y correcciones, bloque 11: la pantalla de los Estratos. El embudo en 2D (render/estratosLienzo.ts, con su
  // física en un worker que solo vive mientras esta pantalla está abierta) y al costado la ficha del estrato elegido.
  import Decimal from 'break_infinity.js'
  import {
    CFG1, CFG2, ESTRATOS, MEJORAS_HORNO, abrirEstrato, costoAbrir, costoHorno, costoMejora, cristalesDe, densidad, hayEstratos,
    hornoEncendido, lleno, mejorarEstrato, mejorarHorno, presion, presionEstrato, puedeAbrir, puedeMejorar, puedeMejorarHorno, tieneFuego,
    vidrioPorSegundo, type MejoraEstrato, type MejoraHorno,
  } from '../core'
  import { esBeta } from '../guardado/guardado'
  import { EstratosLienzo } from '../render/estratosLienzo'
  import { COLORES_DALTONISMO, PALETAS } from '../render/paletas'
  import { txt } from '../strings'
  import { ajustes, quieto } from './ajustes.svelte'
  import { ayuda, type Tip } from './ayudas.svelte'
  import { velocidadEstrato } from './desglose'
  import { formato, formatoMult } from './formato'
  import { juego } from './juego.svelte'
  import { elegido } from './logros'
  import * as sonido from './sonido'

  const E = CFG1.estratos
  const t = txt.cristal.estratos
  const h = txt.fuego.horno
  const HM = CFG2.horno.mejoras
  /** Capa 2: el estrato 9 (el Horno) se elige como uno más, debajo del 8. */
  const FONDO = ESTRATOS
  const conHorno = $derived(esBeta(juego) && tieneFuego(juego.s, 'estratos'))
  /** Lo que da cada mejora del Horno en el nivel L (para "×a → ×b"). */
  const valorHorno = (k: MejoraHorno, L: number) =>
    k === 'temperatura' ? HM.temperatura.x ** L : k === 'tiro' ? 1 + HM.tiro.suma * L : k === 'crisol' ? CFG2.fundicion.M_B + HM.crisol.suma * L
      : k === 'calor_latente' ? HM.calor_latente.K * L : 1 + HM.templado.suma * L
  const efectoHorno = (k: MejoraHorno, L: number) => {
    const f = k === 'calor_latente' ? formato : formatoMult // los K, enteros
    return h.efectos[k](f(valorHorno(k, L)), f(valorHorno(k, L + 1)))
  }
  const s = $derived(juego.s)
  const cuesta = (c: Decimal) => txt.cristal.red.costo(formato(c, true))
  const SUMA: Record<MejoraEstrato, number> = { perm: E.permeabilidad.suma_gamma, pres: E.presion.suma_w }
  function hacer(n: typeof juego.s) {
    if (n === juego.s) return
    juego.s = n
    sonido.compra('other')
  }
  /** El estrato no puede pasar al de arriba menos la separación: está al tope. */
  const frenado = (k: number) => k > 0 && lleno(s, k) // con la separación de Capilaridad
  const gamma = (k: number) => velocidadEstrato(s, k).gamma
  const porMinuto = (g: number) => formatoMult(10 ** (g * 60))
  // Bloque 7: lo que vale la Presión, ya elevada a la Densidad (así actúa en cada derrumbe).
  const d = $derived(formatoMult(densidad(s)))
  const vale = (p: number) => formato(Decimal.pow10(p * densidad(s)))
  const factores = (k: number) => velocidadEstrato(s, k).factores.filter((f) => Math.abs(f.x - 1) > 1e-9)
  const tipAporte = (k: number): Tip => ({
    titulo: t.aporte, que: t.aporteQue, hielo: true,
    desglose: t.aporteCuenta(formatoMult(presionEstrato(juego.s, k)), formatoMult(densidad(juego.s)), formato(Decimal.pow10(presionEstrato(juego.s, k) * densidad(juego.s)))),
  })
  const tipVelocidad = (): Tip => ({
    titulo: t.velocidad, que: t.velocidadQue, hielo: true, ahora: t.ritmo(porMinuto(gamma(foco))),
    desglose: factores(foco).map((f) => `${txt.factor[f.id]} ×${formatoMult(f.x)}`).join(' · ') || undefined,
  })

  let canvas = $state<HTMLCanvasElement>()
  let lienzo = $state.raw<EstratosLienzo>()
  let foco = $state(0)
  const abierto = $derived(foco < s.estratos.abiertos)
  const colores = $derived(ajustes.daltonismo ? COLORES_DALTONISMO : PALETAS[elegido('paleta', Object.keys(PALETAS), ajustes.paleta, juego.logros)])

  $effect(() => {
    if (!canvas) return
    const l = new EstratosLienzo(canvas, colores)
    l.alFoco = (k) => (foco = k)
    if (import.meta.env.DEV) Object.assign(window, { estratosLienzo: l }) // para medir desde la consola
    lienzo = l
    return () => {
      l.destruir()
      if (import.meta.env.DEV) Object.assign(window, { estratosLienzo: undefined })
      lienzo = undefined
    }
  })
  $effect(() => lienzo?.paleta(colores))
  $effect(() => {
    const n = s.estratos.abiertos, ocho = Array.from({ length: ESTRATOS }, (_, k) => k)
    // Lo lleno que se ve cada bandeja: crece con los granos (s_k en log10) y está llena al tope. Es visual, no balance.
    const objetivo = ocho.map((k) => (k >= n ? 0 : frenado(k) ? 1 : Math.min(0.9, s.estratos.s[k] / (s.estratos.s[k] + 6))))
    lienzo?.poner({
      abiertos: n, objetivo, foco, quieta: quieto(), sePuedeAbrir: puedeAbrir(s),
      // el chorro de la pila: más grueso con más velocidad, con tope
      chorro: n ? Math.min(5, 0.6 + Math.log2(1 + gamma(0) / E.gamma_log10_por_s) * 0.8) : 0,
      tope: ocho.map(frenado),
      numeros: ocho.map((k) => String(k + 1)),
      derecha: ocho.map((k) => (k < n ? `×${vale(presionEstrato(s, k))}` : t.roca(k + 1, formato(cristalesDe(E.abrir_log10[k]), true)))),
      horno: hornoEncendido(s), hornoTexto: conHorno ? h.ritmo(formatoMult(vidrioPorSegundo(s))) : '',
    })
  })

  const ultimo = $derived(conHorno ? FONDO : ESTRATOS - 1)
  function ir(k: number) { foco = Math.max(0, Math.min(ultimo, k)) }
  function tecla(e: KeyboardEvent) {
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    ir(foco + d)
  }
  const efecto = (que: MejoraEstrato, n: number) =>
    (que === 'perm' ? t.permEfecto : t.presEfecto)(formatoMult(1 + SUMA[que] * n), formatoMult(1 + SUMA[que] * (n + 1)))
</script>

<section class="estratos" aria-label={txt.cristal.pantallas.estratos}>
  {#if !hayEstratos(s)}
    <p>{t.cerrado}</p>
  {:else}
    <p class="total num">{t.total(formatoMult(presion(s)), d, vale(presion(s)))}</p>
    <div class="vista">
      <div class="escena">
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <canvas bind:this={canvas} tabindex="0" aria-label={t.escena} onkeydown={tecla}></canvas>
      </div>
      <aside class="ficha placa grietas" aria-live="polite">
        <header>
          <button class="paso" aria-label={t.arriba} title={t.arriba} disabled={foco === 0} onclick={() => ir(foco - 1)}>↑</button>
          <h2 class:brasa={foco === FONDO}>{foco === FONDO ? h.titulo : t.estrato(foco + 1)}</h2>
          <button class="paso" aria-label={t.abajo} title={t.abajo} disabled={foco >= ultimo} onclick={() => ir(foco + 1)}>↓</button>
        </header>
        {#if foco === FONDO && conHorno}
          <dl class="num">
            <div><dt>{h.vidrio}</dt><dd class="brasa">{formato(s.fuego.vidrio)}</dd></div>
            <div><dt>{h.porSegundo}</dt>
              {#if hornoEncendido(s)}<dd>{formatoMult(vidrioPorSegundo(s))}</dd>{:else}<small>{h.apagado}</small>{/if}</div>
          </dl>
          <ul class="horno">
            {#each MEJORAS_HORNO as k (k)}
              {@const L = s.fuego.horno[k]}
              <li><button class="compra gema hm" style:--c="#ff8a3d" aria-disabled={!puedeMejorarHorno(s, k)} onclick={() => hacer(mejorarHorno(juego.s, k))}
                aria-label={h.mejorar(h.nombres[k], formato(costoHorno(s, k), true))}>
                <b>{h.nombres[k]}<span class="nv">{t.nv(L)}</span></b><span class="costo num">{formato(costoHorno(s, k), true)}</span>
                <small class="num">{efectoHorno(k, L)}</small>
              </button></li>
            {/each}
          </ul>
        {:else if abierto}
          <dl class="num">
            <div>
              <dt>{t.granos}</dt>
              <dd>{formato(Decimal.pow10(s.estratos.s[foco]))}</dd>
              <small class:tope={frenado(foco)}>{frenado(foco) ? t.tope : t.ritmo(porMinuto(gamma(foco)))}</small>
            </div>
            <div use:ayuda={() => tipAporte(foco)}>
              <dt>{t.aporte}</dt><dd class="hielo">×{vale(presionEstrato(s, foco))}</dd>
              <small>+{formatoMult(presionEstrato(s, foco))}</small>
            </div>
          </dl>
          <!-- siempre presente y con alto reservado: la ficha no cambia de tamaño cuando cambian los factores -->
          <div class="desglose num" use:ayuda={tipVelocidad}>
            <span>{t.velocidad}</span>
            <ul>{#each factores(foco) as f}<li>{txt.factor[f.id]} <b>×{formatoMult(f.x)}</b></li>{/each}</ul>
          </div>
          <!-- Las dos mejoras no se ven iguales: Permeabilidad es una gema de hielo con gotas; Presión, una placa de prensa. -->
          <button class="mejora gema perm" aria-disabled={!puedeMejorar(s, 'perm', foco)} onclick={() => hacer(mejorarEstrato(juego.s, 'perm', foco))}>
            <svg class="ic" viewBox="-12 -12 24 24" aria-hidden="true">
              <path d="M-4-10c-2.6 3.6-4 5.8-4 7.6a4 4 0 0 0 8 0c0-1.8-1.4-4-4-7.6Z" class="g1"/>
              <path d="M5-3c-1.8 2.5-2.8 4-2.8 5.3a2.8 2.8 0 0 0 5.6 0C7.8 1 6.8-.5 5-3Z" class="g2"/>
              <path d="M-3 5.5c-1.2 1.6-1.8 2.6-1.8 3.4a1.8 1.8 0 0 0 3.6 0c0-.8-.6-1.8-1.8-3.4Z" class="g3"/>
              <path d="M-5.6-3.4a2 2 0 0 0 1 1.9" class="brillo"/>
            </svg>
            <span class="txt"><b>{t.perm}<span class="nv">{t.nv(s.estratos.perm[foco])}</span></b>
              <small class="num">{efecto('perm', s.estratos.perm[foco])}</small><small class="num">{t.permQue(formatoMult(SUMA.perm))}</small></span>
            <span class="costo num">{formato(costoMejora(s, 'perm', foco), true)}</span>
          </button>
          <button class="mejora prensa" aria-disabled={!puedeMejorar(s, 'pres', foco)} onclick={() => hacer(mejorarEstrato(juego.s, 'pres', foco))}>
            <svg class="ic" viewBox="-12 -12 24 24" aria-hidden="true">
              <path d="M-9-10H9M0-10v6M-3-8h6"/><rect x="-7" y="-4" width="14" height="3" class="placa-ic"/>
              <path d="M-9 2h18M-9 5.5h18M-9 9h18" class="capas-ic"/><path d="M-10-10v20M10-10v20" class="columnas"/>
            </svg>
            <span class="txt"><b>{t.pres}<span class="nv">{t.nv(s.estratos.pres[foco])}</span></b>
              <small class="num">{efecto('pres', s.estratos.pres[foco])}</small><small class="num">{t.presQue(formatoMult(SUMA.pres))}</small></span>
            <span class="costo num">{formato(costoMejora(s, 'pres', foco), true)}</span>
          </button>
        {:else if foco === s.estratos.abiertos}
          <button class="compra gema abrir" aria-disabled={!puedeAbrir(s)} onclick={() => hacer(abrirEstrato(juego.s))}>
            <span><b>{t.abrir}</b></span><small class="num">{cuesta(costoAbrir(s))}</small>
          </button>
        {:else}
          <p>{t.sinAbrir} · {cuesta(cristalesDe(E.abrir_log10[foco]))}</p>
        {/if}
      </aside>
    </div>
    <p class="que">{foco === FONDO ? h.que : t.que}</p>
  {/if}
</section>

<style>
  .estratos { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; height: 100%; min-height: 0; justify-items: center; gap: 0.75rem; padding: 1.25rem 0 0; animation: entrar 0.3s ease-out; }
  @keyframes entrar { from { opacity: 0; } }
  p { max-width: 38rem; margin: 0; color: var(--tenue); text-align: center; text-wrap: balance; }
  .total { color: var(--hielo); font-size: 1.25rem; font-weight: 600; }
  .vista { display: grid; grid-template-columns: minmax(0, 1fr) 20rem; gap: 2rem; width: min(100%, 72rem); min-height: 0; }
  .escena { position: relative; min-height: 0; overflow: hidden; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; cursor: pointer; outline-offset: -2px; }
  small { display: block; color: var(--apagado); font-size: 0.8125rem; }

  /* Tamaño fijo: lo de adentro cambia con cada Infinito (factores, renglones, cifras) y el panel no tiene que latir. */
  .ficha { --f: 1rem; display: grid; align-content: start; gap: 0.75rem; align-self: center; height: min(27rem, 100%); overflow: hidden; padding: 0.75rem 1.1rem 1.15rem; }
  dd, small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .costo { white-space: nowrap; } /* el costo entero siempre; si falta lugar se corta el nombre */
  .mejora small { min-height: 1lh; }
  .mejora small + small { white-space: normal; min-height: 2lh; } /* la fórmula: hasta dos renglones, siempre reservados */
  header {
    display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
    background: linear-gradient(90deg, transparent, rgb(159 227 245 / 0.3), transparent) bottom / 100% 1px no-repeat;
  }
  h2 { margin: 0; font-size: 1.5rem; font-weight: 300; }
  .paso { width: 2.75rem; height: 2.75rem; border: 0; background: none; color: var(--hielo); font: inherit; font-size: 1.25rem; cursor: pointer; }
  .paso:disabled { color: var(--apagado); opacity: 0.4; cursor: default; }
  dl { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0; }
  dt { font-size: 0.8125rem; color: var(--tenue); }
  dd { margin: 0.125rem 0 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; }
  dd.hielo { color: var(--hielo); }
  small.tope { color: var(--violeta); }
  .desglose { font-size: 0.75rem; color: var(--tenue); }
  /* dos renglones de factores, siempre reservados (si hay más, están todos en el tooltip) */
  .desglose ul { height: calc(2 * 1.45rem + 0.3rem); overflow: hidden; }
  .desglose ul { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0.3rem 0 0; padding: 0; list-style: none; }
  .desglose li { height: 1.45rem; padding: 0.2rem 0.45rem; white-space: nowrap; background: rgb(159 227 245 / 0.06); clip-path: polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%); }
  .desglose b { font-weight: 600; color: var(--escarcha); }

  /* ícono | nombre y nivel | costo; debajo, el efecto y la fórmula a todo el ancho del texto */
  .mejora { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; column-gap: 0.7rem; width: 100%; font: inherit; font-size: 0.9375rem; text-align: left; }
  .mejora .txt { display: contents; }
  .mejora .ic { grid-row: 1 / span 3; }
  .mejora .txt > b { grid-column: 2; grid-row: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mejora .nv { margin-left: 0.3rem; }
  .mejora .costo { grid-column: 3; grid-row: 1; }
  .mejora small { grid-column: 2 / span 2; }
  .mejora .txt b { font-weight: 600; }
  .mejora .nv { font-size: 0.8125rem; font-weight: 400; color: var(--tenue); }
  .mejora small { font-size: 0.75rem; }
  .ic { width: 1.9rem; height: 1.9rem; overflow: visible; fill: none; stroke-linejoin: round; stroke-linecap: round; }
  .costo { font-weight: 600; }
  .mejora[aria-disabled='true'] .costo { color: var(--apagado); }
  .mejora[aria-disabled='true'] .ic { opacity: 0.55; }

  /* Permeabilidad: gema de hielo (hielo.css) con gotas. */
  .perm { --c: var(--hielo); --b: 1rem; padding: 0.55rem 1.5rem; }
  .perm .ic { stroke: var(--hielo); stroke-width: 1.2; }
  .perm .g1 { fill: rgb(159 227 245 / 0.22); } .perm .g2 { fill: rgb(159 227 245 / 0.14); } .perm .g3 { fill: rgb(159 227 245 / 0.1); }
  .perm .brillo { stroke: var(--escarcha); opacity: 0.8; }
  .perm .costo { color: var(--hielo); }

  /* Presión: placa de prensa de metal, pesada, con remaches y borde de abajo grueso. */
  .prensa {
    position: relative; padding: 0.7rem 1rem 0.9rem; border: 0; color: var(--tinta); cursor: pointer;
    clip-path: polygon(0 7px, 7px 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 0 100%);
    background:
      radial-gradient(circle at 9px 13px, #d8b98a 0 1.6px, #4a3a28 2.2px, transparent 2.8px),
      radial-gradient(circle at calc(100% - 9px) 13px, #d8b98a 0 1.6px, #4a3a28 2.2px, transparent 2.8px),
      repeating-linear-gradient(90deg, rgb(255 255 255 / 0.018) 0 2px, transparent 2px 5px),
      linear-gradient(180deg, #33281c, #1b1610 55%, #110d0a);
    box-shadow: inset 0 3px 0 rgb(255 181 71 / 0.55), inset 0 4px 10px -4px rgb(255 181 71 / 0.35), inset 0 -6px 0 #070504, inset 0 0 0 1px rgb(255 181 71 / 0.14);
    transition: box-shadow 0.4s;
  }
  .prensa .ic { stroke: var(--ambar); stroke-width: 1.3; }
  .prensa .placa-ic { fill: rgb(255 181 71 / 0.35); }
  .prensa .capas-ic { stroke: #c99a5b; opacity: 0.8; }
  .prensa .columnas { opacity: 0.5; }
  .prensa .costo { color: var(--ambar); }
  .prensa:not([aria-disabled='true']):is(:hover, :focus-visible) { box-shadow: inset 0 3px 0 rgb(255 181 71 / 0.85), inset 0 4px 14px -4px rgb(255 181 71 / 0.5), inset 0 -6px 0 #070504, inset 0 0 0 1px rgb(255 181 71 / 0.22); }
  .prensa:not([aria-disabled='true']):active { translate: 0 2px; }
  .prensa[aria-disabled='true'] { cursor: default; filter: saturate(0.4) brightness(0.8); }

  .compra { --b: 1.1rem; display: grid; gap: 0.15rem; min-height: 2.75rem; padding-block: 0.7rem; font-size: 0.9375rem; }
  .compra .num:last-child { color: var(--hielo); }
  .compra[aria-disabled='true'] .num:last-child { color: var(--apagado); }
  .abrir { min-height: 3.5rem; font-size: 1.0625rem; }
  .ficha p { text-align: left; }

  /* Capa 2: la ficha del Horno, en brasa. Las 5 mejoras en una lista que scrollea sola si no entra. */
  h2.brasa, dd.brasa { color: #ffb070; }
  ul.horno { display: grid; gap: 0.4rem; margin: 0; padding: 0; list-style: none; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
  .hm { --b: 0.9rem; display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 0.6rem; width: 100%; min-height: 2.75rem; padding-block: 0.4rem; font: inherit; font-size: 0.875rem; text-align: left; }
  .hm b { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hm .nv { margin-left: 0.3rem; font-size: 0.75rem; font-weight: 400; color: var(--tenue); }
  .hm .costo { color: #ffb070; }
  .hm[aria-disabled='true'] .costo { color: var(--apagado); }
  .hm small { grid-column: 1 / span 2; font-size: 0.75rem; }

  /* Ventanas bajas: la ficha se aprieta. */
  @media (max-height: 800px) and (min-width: 761px) {
    .estratos { gap: 0.5rem; padding-top: 0.75rem; }
    .total { font-size: 1.0625rem; }
    .ficha { gap: 0.55rem; height: min(26.5rem, 100%); }
    .que { display: none; } /* está en "Cómo funciona" */
    dd { font-size: 1.25rem; }
  }
  /* Móvil y ventanas angostas: la escena arriba y la ficha del estrato debajo. */
  @media (max-width: 760px) {
    .estratos { gap: 0.4rem; padding-top: 0.6rem; }
    .total { font-size: 0.875rem; }
    /* La ficha toma lo que necesita hasta 14,5 rem; en celulares bajos se achica y scrollea sola (la escena no baja de 6 rem). */
    .vista { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(6rem, 1fr) minmax(0, auto); gap: 0.4rem; }
    .ficha { height: auto; max-height: 15.5rem; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; padding: 0.4rem 0.8rem 0.75rem; gap: 0.4rem; }
    .ficha h2 { font-size: 1.125rem; }
    .paso { height: 2.75rem; margin-block: -0.25rem; }
    dl { gap: 0.5rem; }
    dd { font-size: 1.125rem; }
    .desglose { display: none; } /* en el celular, el desglose queda en "Cómo funciona" */
    .mejora small + small { display: none; }
    .perm { padding: 0.4rem 1.1rem; }
    .mejora { column-gap: 0.5rem; }
    .ic { width: 1.5rem; height: 1.5rem; }
    .prensa { padding: 0.5rem 0.9rem 0.7rem; }
    .que { display: none; }
  }
  /* Celulares bajos: la Presión total se ve en la Arena y en "Cómo funciona"; acá el lugar es para la escena. */
  @media (max-width: 760px) and (max-height: 720px) { .total { display: none; } .estratos { grid-template-rows: minmax(0, 1fr); } }
  /* v1.0: en celulares bajos (360×640) la ficha se achica y scrollea adentro: el embudo se lleva el lugar. */
  @media (max-width: 760px) and (max-height: 720px) { .vista { grid-template-rows: minmax(12rem, 1fr) minmax(0, auto); } .ficha { max-height: 10.5rem; } }
</style>
