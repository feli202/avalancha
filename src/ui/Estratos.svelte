<script lang="ts">
  // SPEC_CAPA1 §7.4: la pantalla de los Estratos. La escena three.js desciende por las ocho losas (render/estratosVisual.ts,
  // que se carga, se crea y se destruye con esta pantalla) y al costado va la interfaz HTML del estrato que mira la cámara.
  import Decimal from 'break_infinity.js'
  import {
    CFG1, ESTRATOS, abrirEstrato, costoAbrir, costoMejora, cristalesDe, densidad, hayEstratos, lleno, mejorarEstrato, presion,
    presionEstrato, puedeAbrir, puedeMejorar, type MejoraEstrato,
  } from '../core'
  import type { EstratosVisual } from '../render/estratosVisual'
  import { COLORES_DALTONISMO, COLORES_PILA } from '../render/paletas'
  import { txt } from '../strings'
  import { ajustes } from './ajustes.svelte'
  import { ayuda, type Tip } from './ayudas.svelte'
  import { velocidadEstrato } from './desglose'
  import { formato, formatoMult } from './formato'
  import { juego } from './juego.svelte'
  import * as sonido from './sonido'

  const E = CFG1.estratos
  const t = txt.cristal.estratos
  const s = $derived(juego.s)
  const cuesta = (c: Decimal) => txt.cristal.red.costo(formato(c, true))
  const MEJORAS: [MejoraEstrato, string, string][] = [
    ['perm', t.perm, t.permQue(formatoMult(E.permeabilidad.suma_gamma))],
    ['pres', t.pres, t.presQue(formatoMult(E.presion.suma_w))],
  ]
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
  function tipVelocidad(k: number): Tip {
    const v = velocidadEstrato(juego.s, k)
    return {
      titulo: t.velocidad, que: t.velocidadQue, hielo: true, ahora: t.ritmo(porMinuto(v.gamma)),
      desglose: v.factores.filter((f) => Math.abs(f.x - 1) > 1e-9).map((f) => `${txt.factor[f.id]} ×${formatoMult(f.x)}`).join(' · ') || undefined,
    }
  }
  const tipAporte = (k: number): Tip => ({
    titulo: t.aporte, que: t.aporteQue, hielo: true,
    desglose: t.aporteCuenta(formatoMult(presionEstrato(juego.s, k)), formatoMult(densidad(juego.s)), formato(Decimal.pow10(presionEstrato(juego.s, k) * densidad(juego.s)))),
  })

  let canvas = $state<HTMLCanvasElement>()
  let visual = $state.raw<EstratosVisual>()
  let foco = $state(0) // el estrato que mira la cámara: su interfaz es la que se ve al costado
  const rotulos: HTMLElement[] = $state([])
  const abierto = $derived(foco < s.estratos.abiertos)

  // three.js entra en un trozo aparte: no se baja hasta abrir esta pantalla.
  $effect(() => {
    if (!canvas) return
    const c = canvas
    let v: EstratosVisual | undefined, vivo = true
    import('../render/estratosVisual').then((m) => {
      if (!vivo) return
      try {
        v = new m.EstratosVisual(c, ajustes.daltonismo ? COLORES_DALTONISMO : COLORES_PILA)
      } catch {
        return // sin WebGL: queda la interfaz del costado, con sus flechas
      }
      v.alFoco = (k) => (foco = k)
      v.alCuadro = (xy) => rotulos.forEach((r, k) => r && (r.style.translate = `${xy[k * 2]}px ${xy[k * 2 + 1]}px`))
      if (import.meta.env.DEV) Object.assign(window, { estratosVisual: v }) // para medir desde la consola
      visual = v
    })
    return () => {
      vivo = false
      v?.destruir()
      if (import.meta.env.DEV) Object.assign(window, { estratosVisual: undefined })
      visual = undefined
    }
  })
  $effect(() => visual?.poner({
    abiertos: s.estratos.abiertos, s: s.estratos.s,
    gamma: s.estratos.s.map((_, k) => gamma(k) / E.gamma_log10_por_s), quieta: ajustes.reducirDestellos,
  }))

  function ir(k: number) {
    foco = Math.max(0, Math.min(ESTRATOS - 1, k))
    visual?.ir(foco)
  }
  function tecla(e: KeyboardEvent) {
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    ir(foco + d)
  }
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
        {#each { length: ESTRATOS } as _, k}
          <span class="rotulo num" class:cerrado={k >= s.estratos.abiertos} bind:this={rotulos[k]} aria-hidden="true">
            <b>{k + 1}</b>{#if k >= s.estratos.abiertos}<small>{cuesta(cristalesDe(E.abrir_log10[k]))}</small>{/if}
          </span>
        {/each}
      </div>
      <aside class="ficha placa grietas" aria-live="polite">
        <header>
          <button class="paso" aria-label={t.arriba} title={t.arriba} disabled={foco === 0} onclick={() => ir(foco - 1)}>↑</button>
          <h2>{t.estrato(foco + 1)}</h2>
          <button class="paso" aria-label={t.abajo} title={t.abajo} disabled={foco === ESTRATOS - 1} onclick={() => ir(foco + 1)}>↓</button>
        </header>
        {#if abierto}
          <dl class="num">
            <div>
              <dt>{t.granos}</dt>
              <dd>{formato(Decimal.pow10(s.estratos.s[foco]))}</dd>
              <small use:ayuda={() => tipVelocidad(foco)}>{frenado(foco) ? t.tope : t.ritmo(porMinuto(gamma(foco)))}</small>
            </div>
            <div use:ayuda={() => tipAporte(foco)}><dt>{t.aporte}</dt><dd>×{vale(presionEstrato(s, foco))}</dd></div>
          </dl>
          {#each MEJORAS as [que, nombre, ayuda]}
            <button class="compra gema" aria-disabled={!puedeMejorar(s, que, foco)} onclick={() => hacer(mejorarEstrato(juego.s, que, foco))}>
              <span><b>{nombre}</b> {t.nivel(s.estratos[que][foco])}</span>
              <small>{ayuda}</small>
              <small class="num">{cuesta(costoMejora(s, que, foco))}</small>
            </button>
          {/each}
        {:else if foco === s.estratos.abiertos}
          <button class="compra gema abrir" aria-disabled={!puedeAbrir(s)} onclick={() => hacer(abrirEstrato(juego.s))}>
            <span><b>{t.abrir}</b></span><small class="num">{cuesta(costoAbrir(s))}</small>
          </button>
        {:else}
          <p>{t.sinAbrir} · {cuesta(cristalesDe(E.abrir_log10[foco]))}</p>
        {/if}
      </aside>
    </div>
    <p class="que">{t.que}</p>
  {/if}
</section>

<style>
  .estratos { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; height: 100%; min-height: 0; justify-items: center; gap: 1rem; padding: 1.5rem 0 0; animation: entrar 0.3s ease-out; }
  @keyframes entrar { from { opacity: 0; } }
  p { max-width: 38rem; margin: 0; color: var(--tenue); text-align: center; text-wrap: balance; }
  .total { color: var(--hielo); font-size: 1.25rem; font-weight: 600; }
  .vista { display: grid; grid-template-columns: minmax(0, 1fr) 19rem; gap: 2rem; width: min(100%, 64rem); min-height: 0; }
  .escena { position: relative; min-height: 0; overflow: hidden; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: grab; outline-offset: -2px; }
  canvas:active { cursor: grabbing; }
  /* Los rótulos siguen al frente de cada losa (los mueve la escena con `translate`, sin pasar por Svelte). */
  .rotulo { position: absolute; left: 0; top: 0; display: grid; justify-items: center; width: 14rem; margin: 0.35rem 0 0 -7rem; pointer-events: none; color: var(--escarcha); text-shadow: 0 0 0.5rem var(--noche); }
  .rotulo b { font-size: 1.125rem; }
  .rotulo.cerrado { color: var(--apagado); }
  small { display: block; color: var(--apagado); font-size: 0.8125rem; }

  .ficha { --f: 1rem; display: grid; align-content: center; gap: 0.75rem; align-self: center; padding: 0.75rem 1rem 1.25rem; }
  header {
    display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
    background: linear-gradient(90deg, transparent, rgb(159 227 245 / 0.3), transparent) bottom / 100% 1px no-repeat;
  }
  h2 { margin: 0; font-size: 1.5rem; font-weight: 300; }
  .paso { width: 2.75rem; height: 2.75rem; border: 0; background: none; color: var(--hielo); font: inherit; font-size: 1.25rem; cursor: pointer; }
  .paso:disabled { color: var(--apagado); opacity: 0.4; cursor: default; }
  dl { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0; }
  dt { font-size: 0.8125rem; color: var(--tenue); }
  dd { margin: 0.125rem 0 0; font-size: 1.25rem; font-weight: 600; }
  .compra { --b: 1.1rem; display: grid; gap: 0.15rem; min-height: 2.75rem; padding-block: 0.7rem; font-size: 0.9375rem; }
  .compra:not([aria-disabled='true']) small { color: var(--tenue); }
  .compra .num:last-child { color: var(--hielo); }
  .compra[aria-disabled='true'] .num:last-child { color: var(--apagado); }
  .abrir { min-height: 3.5rem; font-size: 1.0625rem; }
  .ficha p { text-align: left; }

  /* Móvil y ventanas angostas: la escena arriba y la interfaz del estrato debajo. */
  @media (max-width: 760px) {
    /* Pantalla fija: la escena toma lo que deja la ficha del estrato. */
    .estratos { gap: 0.6rem; padding-top: 0.75rem; }
    .total { font-size: 1rem; }
    .vista { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(6rem, 1fr) auto; gap: 0.5rem; }
    .ficha { padding: 0.5rem 0.9rem 0.9rem; gap: 0.5rem; }
    .ficha h2 { font-size: 1.25rem; }
    .compra { padding-block: 0.45rem; font-size: 0.875rem; }
    .total { font-size: 0.875rem; }
    .que { display: none; } /* en el celular no entra: está en "Cómo funciona" */
  }
</style>
