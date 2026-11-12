<script lang="ts">
  // La pila ocupa toda la ventana, detrás de la interfaz. Clic, toque o barra espaciadora = Puñado.
  import { onMount } from 'svelte'
  import { CFG, anillos, caudal, multAnillos, multColor, punado } from '../core'
  import { ALTURA_DE_COLOR, COLOR_CSS, PilaVisual, brillo } from '../render/pilaVisual'
  import { es } from '../strings/es'
  import { juego, progresoCompresion, sismo } from './juego.svelte'

  const ANILLO_SEP = 8 // px CSS entre la pila y el anillo de Compresión

  let canvas: HTMLCanvasElement
  const comp = $derived(progresoCompresion(juego.s))
  const ra = $derived(juego.radioPila + ANILLO_SEP)
  // Textos flotantes y anillos (SPEC 6.2). Animaciones de CSS (transform y opacidad): no pasan por el hilo principal.
  type Efecto = { id: number; texto?: string; anillo?: { r: number; color: string }; ola?: { r: number; color: string } }
  let efectos = $state<Efecto[]>([])
  let siguiente = 0
  const efecto = (e: Omit<Efecto, 'id'>) => (efectos = [...efectos.slice(-3), { ...e, id: siguiente++ }])
  const quitar = (id: number) => (efectos = efectos.filter((e) => e.id !== id))

  const soltar = () => (juego.s = punado(juego.s))

  function tecla(e: KeyboardEvent) {
    // En un botón o un campo, la barra hace lo suyo.
    if (e.code !== 'Space' || e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return
    e.preventDefault()
    soltar()
  }

  onMount(() => {
    const pila = new PilaVisual(canvas)
    pila.alMedir = (m) => (juego.medidas = m)
    pila.alAvalancha = (n) => efecto({ texto: es.avalancha(n) })
    pila.alTamano = (n) => {
      sismo.push(n)
      if (sismo.length > 1000) sismo.shift() // nadie lo vacía hasta que aparece el sismógrafo
    }
    $effect(() => void (pila.destellos = juego.reducirDestellos))
    let anillosAntes = anillos(juego.s.granos)
    const coloresVistos = () => CFG.colores.filter((_, i) => juego.vistos[`color${i}`]).length
    let coloresAntes = coloresVistos()
    const brillos = [0, 0, 0, 0]
    let raf = requestAnimationFrame(function cuadro(ahora) {
      const s = juego.s
      // juego.nivelColores: nivel simulado desde el panel de debug (0 = el real)
      s.colores.forEach((nivel, i) => (brillos[ALTURA_DE_COLOR[i]] = brillo(multColor(i, juego.nivelColores || nivel).log10())))
      pila.cuadro(ahora, s.granos, caudal(s), brillos)
      juego.escalaK = pila.escalaK
      const r = Math.round(pila.radioCss)
      if (r !== juego.radioPila) juego.radioPila = r
      // SPEC 5: el color nuevo recorre la pila, del centro al borde.
      const c = coloresVistos()
      if (c > coloresAntes) efecto({ ola: { r: Math.max(pila.radioCss, 48), color: COLOR_CSS[ALTURA_DE_COLOR[c - 1]] } })
      coloresAntes = c
      // Si se ganan varios en un cuadro (saltos de debug) se muestra uno solo, el último.
      const n = anillos(s.granos)
      if (n > anillosAntes) {
        const mult = multAnillos(s).pow(1 / n).toNumber()
        efecto({ texto: es.anillo(n, mult), anillo: { r: pila.radioCss, color: pila.colorDominante() } })
      }
      anillosAntes = n
      raf = requestAnimationFrame(cuadro)
    })
    return () => {
      cancelAnimationFrame(raf)
      pila.destruir()
    }
  })
</script>

<svelte:window onkeydown={tecla} />

<div class="pila">
  <canvas bind:this={canvas} onpointerdown={soltar} aria-label={es.pila}></canvas>
  <div class="efectos" class:quieto={juego.reducirDestellos} aria-hidden="true">
    {#if juego.vistos.compresion && comp.meta !== undefined}
      <!-- Compresión: el anillo se cierra con el progreso (escala logarítmica); al 100 % brilla. -->
      <svg class="compresion aparece" width={2 * ra + 8} height={2 * ra + 8} viewBox="{-ra - 4} {-ra - 4} {2 * ra + 8} {2 * ra + 8}">
        <circle class="via" r={ra} />
        <circle class="arco" r={ra} pathLength="1" stroke-dashoffset={1 - comp.p} />
      </svg>
    {/if}
    {#each efectos as e (e.id)}
      {#if e.ola}
        <div class="ola" style:--r="{e.ola.r}px" style:--c={e.ola.color} onanimationend={() => quitar(e.id)}></div>
      {:else}
        {#if e.anillo}<div class="anillo" style:--r="{e.anillo.r}px" style:--c={e.anillo.color}></div>{/if}
        <p class={e.anillo ? 'flota abajo' : 'flota'} onanimationend={() => quitar(e.id)}>{e.texto}</p>
      {/if}
    {/each}
  </div>
</div>

<style>
  /* La región de la pila la fija App.svelte con --pila-arriba, --pila-derecha y --pila-abajo; la pila se centra sola en ella. */
  .pila { position: fixed; inset: var(--pila-arriba, 0) var(--pila-derecha, 0) var(--pila-abajo, 0) 0;
    transition: top 0.6s ease, right 0.6s ease, bottom 0.6s ease; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: manipulation; }
  p { margin: 0; font-variant-numeric: tabular-nums; pointer-events: none; white-space: nowrap; }
  .efectos { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; }
  .compresion { position: absolute; translate: -50% -50%; overflow: visible; transition: width 0.6s, height 0.6s; }
  circle { fill: none; stroke-width: 1.5; }
  .via { stroke: rgb(232 233 243 / 0.06); }
  .arco {
    stroke: rgb(232 233 243 / 0.7); stroke-dasharray: 1; rotate: -90deg; stroke-linecap: round;
    transition: stroke-dashoffset 0.3s linear, stroke 0.6s;
  }
  /* Se puede comprimir (.lista en App.svelte): brilla y late a la vez que el botón. */
  :global(.lista) .arco { stroke: var(--tinta); filter: drop-shadow(0 0 5px rgb(232 233 243 / 0.8)); animation: brillar 2.4s ease-in-out infinite; }
  .quieto .arco { animation: none; }
  .aparece { animation: desvanecer 0.8s ease-out reverse; }
  @keyframes brillar { 50% { opacity: 0.55; } }
  .flota {
    position: absolute; translate: -50% -50%; font-size: 1.5rem; font-weight: 600; text-shadow: 0 0 0.6rem #07080f;
    animation: subir 1.6s ease-out forwards; will-change: transform, opacity;
  }
  .flota.abajo { top: 3rem; font-size: 1.1rem; }
  .anillo {
    position: absolute; width: calc(2 * var(--r)); height: calc(2 * var(--r)); translate: -50% -50%;
    border: 1.5px solid var(--c); border-radius: 50%; box-shadow: 0 0 0.5rem var(--c);
    animation: expandir 1.6s ease-out forwards; will-change: transform, opacity;
  }
  /* Una banda del color nuevo que sale del centro hasta el borde de la pila. */
  .ola {
    position: absolute; width: calc(2 * var(--r)); height: calc(2 * var(--r)); translate: -50% -50%; border-radius: 50%;
    background: radial-gradient(circle, transparent 52%, var(--c) 64%, transparent 71%);
    mix-blend-mode: screen; animation: ola 1.4s cubic-bezier(0.2, 0.6, 0.3, 1) forwards; will-change: transform, opacity;
  }
  .quieto .ola { background: var(--c); animation-name: tenir; }
  /* Reducir destellos: nada se mueve ni crece, solo aparece y se desvanece. */
  .quieto .flota, .quieto .anillo { animation-name: desvanecer; }
  @keyframes subir { from { transform: none; opacity: 1; } to { transform: translateY(-4rem); opacity: 0; } }
  @keyframes expandir { from { transform: scale(1); opacity: 0.9; } to { transform: scale(1.5); opacity: 0; } }
  @keyframes desvanecer { from { opacity: 1; } to { opacity: 0; } }
  @keyframes ola { from { transform: scale(0.05); opacity: 0.9; } 70% { opacity: 0.7; } to { transform: scale(1.08); opacity: 0; } }
  @keyframes tenir { from { opacity: 0.25; } to { opacity: 0; } }
</style>
