<script lang="ts">
  // La pila ocupa toda la ventana, detrás de la interfaz. Clic, toque o barra espaciadora = Puñado.
  import { onMount } from 'svelte'
  import { anillos, caudal, multAnillos, multColor, punado } from '../core'
  import { ALTURA_DE_COLOR, PilaVisual, brillo } from '../render/pilaVisual'
  import { es } from '../strings/es'
  import { juego } from './juego.svelte'

  let canvas: HTMLCanvasElement
  let escalaK = $state(0)
  // Textos flotantes y anillos (SPEC 6.2). Animaciones de CSS (transform y opacidad): no pasan por el hilo principal.
  type Efecto = { id: number; texto: string; anillo?: { r: number; color: string } }
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
    $effect(() => void (pila.destellos = juego.reducirDestellos))
    let anillosAntes = anillos(juego.s.granos)
    const brillos = [0, 0, 0, 0]
    let raf = requestAnimationFrame(function cuadro(ahora) {
      const s = juego.s
      // juego.nivelColores: nivel simulado desde el panel de debug (0 = el real)
      s.colores.forEach((nivel, i) => (brillos[ALTURA_DE_COLOR[i]] = brillo(multColor(i, juego.nivelColores || nivel).log10())))
      pila.cuadro(ahora, s.granos, caudal(s), brillos)
      escalaK = pila.escalaK
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

<canvas bind:this={canvas} onpointerdown={soltar} aria-label={es.pila}></canvas>
<div class="efectos" class:quieto={juego.reducirDestellos} aria-hidden="true">
  {#each efectos as e (e.id)}
    {#if e.anillo}<div class="anillo" style:--r="{e.anillo.r}px" style:--c={e.anillo.color}></div>{/if}
    <p class={e.anillo ? 'flota abajo' : 'flota'} onanimationend={() => quitar(e.id)}>{e.texto}</p>
  {/each}
</div>
{#if escalaK > 0}{#key escalaK}<p class="escala">{es.escala(escalaK)}</p>{/key}{/if}

<style>
  canvas { position: fixed; inset: 0; width: 100%; height: 100%; touch-action: manipulation; }
  p { margin: 0; font-variant-numeric: tabular-nums; pointer-events: none; white-space: nowrap; }
  .escala { position: fixed; left: 50%; bottom: 1rem; transform: translateX(-50%); animation: aparecer 0.6s ease-out; }
  .efectos { position: fixed; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; }
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
  /* Reducir destellos: nada se mueve ni crece, solo aparece y se desvanece. */
  .quieto .flota, .quieto .anillo { animation-name: desvanecer; }
  @keyframes subir { from { transform: none; opacity: 1; } to { transform: translateY(-4rem); opacity: 0; } }
  @keyframes expandir { from { transform: scale(1); opacity: 0.9; } to { transform: scale(1.5); opacity: 0; } }
  @keyframes desvanecer { from { opacity: 1; } to { opacity: 0; } }
  @keyframes aparecer { from { opacity: 0; } }
</style>
