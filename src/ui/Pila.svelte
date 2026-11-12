<script lang="ts">
  // La pila ocupa toda la ventana, detrás de la interfaz. Clic, toque o barra espaciadora = Puñado.
  import { onMount } from 'svelte'
  import { caudal, multColor, punado } from '../core'
  import { ALTURA_DE_COLOR, PilaVisual, brillo } from '../render/pilaVisual'
  import { es } from '../strings/es'
  import { juego } from './juego.svelte'

  let canvas: HTMLCanvasElement
  let escalaK = $state(0)

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
    const brillos = [0, 0, 0, 0]
    let raf = requestAnimationFrame(function cuadro(ahora) {
      const s = juego.s
      s.colores.forEach((nivel, i) => (brillos[ALTURA_DE_COLOR[i]] = brillo(multColor(i, nivel).log10())))
      pila.cuadro(ahora, s.granos, caudal(s), brillos)
      escalaK = pila.escalaK
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
{#if escalaK > 0}<p>{es.escala(escalaK)}</p>{/if}

<style>
  canvas { position: fixed; inset: 0; width: 100%; height: 100%; touch-action: manipulation; }
  p {
    position: fixed; left: 50%; bottom: 1rem; margin: 0; transform: translateX(-50%);
    font-variant-numeric: tabular-nums; pointer-events: none;
  }
</style>
