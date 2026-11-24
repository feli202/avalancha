<script lang="ts">
  // Sismógrafo: una línea continua que corre de derecha a izquierda (últimos 20 s). Cada avalancha de la pila visual
  // la levanta a log10(derrumbes) y después decae suave, como la aguja de un sismógrafo.
  import { onMount } from 'svelte'
  import { txt } from '../strings'
  import { juego, sismo } from './juego.svelte'
  import { ajustes, fpsTope } from './ajustes.svelte'

  const VENTANA_MS = 20_000
  const DECAE_S = 0.35 // constante de tiempo de la caída de cada pico
  const MEDIR_MS = 250
  const RANGO_MIN = 0.5 // décadas: alto mínimo de la escala, para no agrandar ruido cuando todo es parejo
  const FPS_MAX = 20 // la línea corre ~11 px CSS por segundo: a 20 cuadros ya se ve continua (y el blur de la sombra es caro)
  let canvas: HTMLCanvasElement

  onMount(() => {
    const ctx = canvas.getContext('2d')!
    const muestras: [number, number][] = [] // [instante, valor] por cuadro
    let v = 0, piso = 0, tope = 2, antes = performance.now(), medido = -Infinity, bajo = 0, alto = 2
    // Tamaño medido al cambiar (leer clientWidth en cada cuadro fuerza un layout); a lo sumo densidad 2.
    let w = 0, h = 0, dpr = 1
    const obs = new ResizeObserver(([e]) => {
      dpr = Math.min(devicePixelRatio || 1, 2)
      w = canvas.width = Math.round(e.contentRect.width * dpr)
      h = canvas.height = Math.round(e.contentRect.height * dpr)
    })
    obs.observe(canvas)
    let espera: ReturnType<typeof setTimeout> | undefined
    let raf = requestAnimationFrame(function dibujar(ahora) {
      // Con el tope de la pila (60, 20 con ahorro); tapado por Cristalización o Automatización, nada.
      // Tapado: se fija de nuevo en un rato, sin pedir cuadros.
      if (juego.capa !== 'arena') return void (espera = setTimeout(() => (raf = requestAnimationFrame(dibujar)), 250))
      if (!w || ahora - antes < 1000 / Math.min(fpsTope(), FPS_MAX) - 1) return void (raf = requestAnimationFrame(dibujar))
      const dt = Math.min(0.1, (ahora - antes) / 1000)
      antes = ahora
      v *= Math.exp(-dt / DECAE_S)
      for (const n of sismo.splice(0)) v = Math.max(v, Math.log10(1 + n))
      muestras.push([ahora, v])
      while (muestras[0][0] < ahora - VENTANA_MS) muestras.shift()
      // Escala sola entre lo bajo (percentil 5, ignora ceros sueltos) y el pico de la ventana: con avalanchas todo el
      // tiempo la línea no se satura arriba y siempre se ven picos y valles. Con transición para que no salte.
      // Se recalcula 4 veces por segundo y no en cada cuadro (M10): ordenar ~1.200 muestras por cuadro, para siempre.
      if (ahora - medido >= MEDIR_MS) {
        medido = ahora
        const orden = muestras.map(([, m]) => m).sort((a, b) => a - b)
        bajo = orden[Math.floor(orden.length * 0.05)]
        alto = Math.max(orden[orden.length - 1], bajo + RANGO_MIN)
      }
      const k = 1 - Math.exp(-dt * 2)
      piso += (bajo - piso) * k
      tope += (alto - tope) * k
      const y01 = (m: number) => Math.min(Math.max((m - piso) / (tope - piso), 0), 1)

      ctx.clearRect(0, 0, w, h)
      ctx.lineWidth = 1.75 * dpr
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgb(232 233 243 / 0.95)'
      ctx.shadowColor = 'rgb(232 233 243 / 0.55)'
      ctx.shadowBlur = ajustes.bateria ? 0 : 5 * dpr // ahorro: sin brillo
      // Línea base plana desde el borde izquierdo: ocupa todo el ancho aunque todavía no haya 20 s de muestras.
      const base = h - 2 * dpr
      ctx.beginPath()
      ctx.moveTo(0, base)
      for (const [t, m] of muestras) ctx.lineTo(w - ((ahora - t) / VENTANA_MS) * w, base - y01(m) * (h - 6 * dpr))
      ctx.stroke()
      raf = requestAnimationFrame(dibujar)
    })
    return () => { cancelAnimationFrame(raf); clearTimeout(espera); obs.disconnect() }
  })
</script>

<!-- Un canvas que solo dibuja es una imagen; el aviso de Svelte lo trata como interactivo. -->
<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
<canvas bind:this={canvas} role="img" aria-label={txt.sismografo}></canvas>

<style>
  canvas { display: block; width: 100%; height: 3rem; }
</style>
