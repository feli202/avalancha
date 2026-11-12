<script lang="ts">
  // Sismógrafo: una línea continua que corre de derecha a izquierda (últimos 20 s). Cada avalancha de la pila visual
  // la levanta a log10(derrumbes) y después decae suave, como la aguja de un sismógrafo.
  import { onMount } from 'svelte'
  import { es } from '../strings/es'
  import { sismo } from './juego.svelte'

  const VENTANA_MS = 20_000
  const DECAE_S = 0.35 // constante de tiempo de la caída de cada pico
  const RANGO_MIN = 0.5 // décadas: alto mínimo de la escala, para no agrandar ruido cuando todo es parejo
  let canvas: HTMLCanvasElement

  onMount(() => {
    const ctx = canvas.getContext('2d')!
    const muestras: [number, number][] = [] // [instante, valor] por cuadro
    let v = 0, piso = 0, tope = 2, antes = performance.now()
    let raf = requestAnimationFrame(function dibujar(ahora) {
      const dt = Math.min(0.1, (ahora - antes) / 1000)
      antes = ahora
      v *= Math.exp(-dt / DECAE_S)
      for (const n of sismo.splice(0)) v = Math.max(v, Math.log10(1 + n))
      muestras.push([ahora, v])
      while (muestras[0][0] < ahora - VENTANA_MS) muestras.shift()
      // Escala sola entre lo bajo (percentil 5, ignora ceros sueltos) y el pico de la ventana: con avalanchas todo el
      // tiempo la línea no se satura arriba y siempre se ven picos y valles. Con transición para que no salte.
      const orden = muestras.map(([, m]) => m).sort((a, b) => a - b)
      const bajo = orden[Math.floor(orden.length * 0.05)]
      const alto = Math.max(orden[orden.length - 1], bajo + RANGO_MIN)
      const k = 1 - Math.exp(-dt * 2)
      piso += (bajo - piso) * k
      tope += (alto - tope) * k
      const y01 = (m: number) => Math.min(Math.max((m - piso) / (tope - piso), 0), 1)

      const dpr = devicePixelRatio
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
      ctx.clearRect(0, 0, w, h)
      ctx.lineWidth = 1.75 * dpr
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgb(232 233 243 / 0.95)'
      ctx.shadowColor = 'rgb(232 233 243 / 0.55)'
      ctx.shadowBlur = 5 * dpr
      // Línea base plana desde el borde izquierdo: ocupa todo el ancho aunque todavía no haya 20 s de muestras.
      const base = h - 2 * dpr
      ctx.beginPath()
      ctx.moveTo(0, base)
      for (const [t, m] of muestras) ctx.lineTo(w - ((ahora - t) / VENTANA_MS) * w, base - y01(m) * (h - 6 * dpr))
      ctx.stroke()
      raf = requestAnimationFrame(dibujar)
    })
    return () => cancelAnimationFrame(raf)
  })
</script>

<canvas bind:this={canvas} role="img" aria-label={es.sismografo}></canvas>

<style>
  canvas { display: block; width: 100%; height: 3rem; }
</style>
