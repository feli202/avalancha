<script lang="ts">
  // Ayuda integrada: el tooltip de use:ayuda y el indicador que señala cada sistema nuevo (juego.guias).
  // Mismo lenguaje que la interfaz: texto sobre velo oscuro, una raya del color del sistema, sin globos ni flechas.
  import { txt } from '../strings'
  import { ajustes } from './ajustes.svelte'
  import { tip } from './ayudas.svelte'
  import { hayPanel, juego } from './juego.svelte'

  const MARGEN = 12 // px entre el texto y lo que señala, y contra el borde de la ventana
  const DURA = 9000 // ms que dura el indicador si nadie lo toca
  const BUSCAR = 60 // cuadros que espera a que aparezca lo que tiene que señalar

  /** Ubica `nodo` al lado de `r`: a la izquierda si `r` está en la mitad derecha; en pantallas angostas, arriba o abajo. */
  function ubicar(nodo: HTMLElement, r: DOMRect) {
    const W = innerWidth, H = innerHeight, w = nodo.offsetWidth, h = nodo.offsetHeight
    let x: number, y: number
    if (W < 768) {
      x = r.left + r.width / 2 - w / 2
      y = r.top - h - MARGEN
      if (y < MARGEN) y = r.bottom + MARGEN
    } else {
      x = r.left + r.width / 2 > W / 2 ? r.left - w - MARGEN * 2 : r.right + MARGEN * 2
      y = r.top + r.height / 2 - h / 2
    }
    nodo.style.translate = `${Math.round(Math.min(Math.max(x, MARGEN), W - w - MARGEN))}px ${Math.round(Math.min(Math.max(y, MARGEN), H - h - MARGEN))}px`
  }

  // ---------- tooltip ----------
  const a = $derived(tip.actual)
  const t = $derived(a?.fn())
  let caja = $state<HTMLElement>()
  $effect(() => {
    if (!a || !caja) return
    const n = caja
    let raf = requestAnimationFrame(function seguir() {
      if (!a.el.isConnected) return void (tip.actual = null)
      ubicar(n, a.el.getBoundingClientRect())
      raf = requestAnimationFrame(seguir)
    })
    // Táctil: se cierra con el próximo toque fuera de lo que lo abrió.
    const fuera = (e: PointerEvent) => !a.el.contains(e.target as Node) && (tip.actual = null)
    addEventListener('pointerdown', fuera, true)
    const alScroll = () => (tip.actual = null)
    addEventListener('scroll', alScroll, { capture: true, once: true })
    return () => { cancelAnimationFrame(raf); removeEventListener('pointerdown', fuera, true); removeEventListener('scroll', alScroll, true) }
  })

  // ---------- indicador de sistema nuevo ----------
  const clave = $derived(hayPanel() || juego.s.infinitos > 0 ? null : (juego.guias[0] ?? null)) // después del Infinito no hay nada que señalar
  let anillo = $state<{ x: number; y: number; w: number; h: number; c: string } | null>(null)
  let rotulo = $state<HTMLElement>()
  let objetivo: Element | null = null
  const cerrar = () => { anillo = null; juego.guias = juego.guias.slice(1) }

  $effect(() => {
    const k = clave
    if (!k) return
    let intentos = 0
    let raf = requestAnimationFrame(function seguir() {
      raf = requestAnimationFrame(seguir)
      const el = document.querySelector(`[data-guia="${k}"]`)
      const r = el?.getBoundingClientRect()
      if (!el || !r || !r.width) {
        anillo = null
        if (++intentos > BUSCAR) cerrar() // no está en pantalla (otra pestaña de la tienda): no vuelve
        return
      }
      if (el !== objetivo) { objetivo = el; el.scrollIntoView({ block: 'nearest' }) }
      const c = getComputedStyle(el).getPropertyValue('--c').trim() || 'var(--tinta)'
      anillo = { x: r.left, y: r.top, w: r.width, h: r.height, c }
      if (rotulo) ubicar(rotulo, r)
    })
    const plazo = setTimeout(cerrar, DURA)
    // Un clic en el texto o en lo señalado lo cierra; un clic en la pila (puñados) no.
    const clic = (e: PointerEvent) => {
      const n = e.target as Node
      if (rotulo?.contains(n) || objetivo?.contains(n)) cerrar()
    }
    addEventListener('pointerdown', clic, true)
    return () => { cancelAnimationFrame(raf); clearTimeout(plazo); removeEventListener('pointerdown', clic, true); objetivo = null }
  })
  const texto = $derived(clave ? (txt.guia.indicador[clave] ?? txt.guia.auto) : '')
</script>

{#if anillo && clave}
  {#key clave}
    <div class="anillo" class:quieto={ajustes.reducirDestellos} aria-hidden="true" style:--c={anillo.c}
      style:translate="{anillo.x - 6}px {anillo.y - 4}px" style:width="{anillo.w + 12}px" style:height="{anillo.h + 8}px"></div>
    <button class="rotulo" bind:this={rotulo} style:--c={anillo.c} aria-label="{texto} · {txt.guia.cerrar}" onclick={cerrar}>
      {texto}
    </button>
  {/key}
{/if}

{#if a && t}
  <div class="tip" id="ayuda-tip" role="tooltip" bind:this={caja}>
    <p class="titulo">{t.titulo}</p>
    <p>{t.que}</p>
    {#if t.ahora}<p class="ahora num">{t.ahora}</p>{/if}
    {#if t.prox}<p class="prox num">{t.prox}</p>{/if}
  </div>
{/if}

<style>
  .tip, .anillo, .rotulo { position: fixed; left: 0; top: 0; z-index: 30; }

  .tip {
    width: max-content; max-width: min(19rem, calc(100vw - 1.5rem)); padding: 0.625rem 0.875rem 0.625rem 0.75rem;
    border-left: 2px solid color-mix(in srgb, var(--ambar) 70%, transparent);
    background: rgb(7 8 15 / 0.9); backdrop-filter: blur(6px); pointer-events: none;
    font-size: 0.8125rem; line-height: 1.45; color: var(--tenue); animation: fundido 0.15s ease-out;
  }
  .tip p { margin: 0; text-wrap: pretty; }
  .tip .titulo { margin-bottom: 0.25rem; font-size: 0.9375rem; font-weight: 600; color: var(--tinta); }
  .tip .ahora { margin-top: 0.375rem; color: var(--tinta); }
  .tip .prox { color: var(--ambar); }

  /* El indicador: un contorno fino que respira alrededor de lo nuevo, y una línea de texto al lado. */
  .anillo {
    border: 1px solid var(--c); border-radius: 4px; pointer-events: none;
    box-shadow: 0 0 0.75rem color-mix(in srgb, var(--c) 45%, transparent), inset 0 0 0.75rem color-mix(in srgb, var(--c) 15%, transparent);
    animation: respirar 1.8s ease-in-out infinite, fundido 0.4s ease-out;
  }
  .anillo.quieto { animation: fundido 0.4s ease-out; }
  .rotulo {
    max-width: min(17rem, calc(100vw - 1.5rem)); padding: 0.375rem 0.75rem; border: 0; border-left: 2px solid var(--c);
    background: rgb(7 8 15 / 0.82); color: var(--tinta); font: inherit; font-size: 0.875rem; line-height: 1.4;
    text-align: left; text-wrap: pretty; cursor: pointer; animation: fundido 0.4s ease-out;
  }
  @keyframes respirar { 50% { opacity: 0.35; } }
  @keyframes fundido { from { opacity: 0; } }
</style>
