<script lang="ts">
  // "Cómo funciona": una pila de arena de 15×15 que se juega con clics. Un derrumbe por paso, en cámara lenta.
  // Es solo para mirar: no toca la economía. El borde es el sumidero (los granos que salen se pierden).
  import { onDestroy } from 'svelte'
  import { COLOR_CSS } from '../render/pilaVisual'
  import { txt } from '../strings'

  const N = 15
  const PASO_MS = 120
  const UMBRAL = 4
  const ACELERA = 40 // después de cada tanto derrumbes, uno más por paso: una avalancha enorme no dura minutos
  // Arranque con alturas mezcladas (sin azar: siempre la misma pila), así el primer grano ya puede desatar algo.
  const mezcla = (i: number) => {
    let x = Math.imul(i + 1, 0x9e3779b1)
    x = Math.imul(x ^ (x >>> 15), 0x85ebca6b)
    return ((x ^ (x >>> 13)) >>> 0) % UMBRAL
  }
  const inicial = () => Array.from({ length: N * N }, (_, i) => mezcla(i))

  let h = $state(inicial())
  let activas = $state(new Set<number>())
  let derrumbes = $state(0)
  let caidos = $state(0)
  const cola: number[] = []
  let reloj = 0

  const encolar = (i: number) => { if (h[i] >= UMBRAL && !cola.includes(i)) cola.push(i) }

  function paso() {
    const nuevas = new Set<number>()
    for (let k = 1 + Math.floor(derrumbes / ACELERA); k > 0 && cola.length; k--) nuevas.add(derrumbar(cola.shift()!))
    activas = nuevas
    if (!cola.length) { clearInterval(reloj); reloj = 0 }
  }

  function derrumbar(i: number) {
    h[i] -= UMBRAL
    derrumbes++
    const x = i % N, y = Math.floor(i / N)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) { caidos++; continue }
      h[ny * N + nx]++
      encolar(ny * N + nx)
    }
    encolar(i)
    return i
  }

  function soltar(i: number) {
    if (!reloj) derrumbes = 0 // avalancha nueva; durante una, los granos se suman a la misma
    h[i]++
    encolar(i)
    if (cola.length && !reloj) reloj = window.setInterval(paso, PASO_MS)
  }

  function clic(e: PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = Math.floor(((e.clientX - r.left) / r.width) * N), y = Math.floor(((e.clientY - r.top) / r.height) * N)
    if (x >= 0 && y >= 0 && x < N && y < N) soltar(y * N + x)
  }
  const tecla = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    soltar((N * N) >> 1)
  }

  function reiniciar() {
    clearInterval(reloj); reloj = 0; cola.length = 0
    h = inicial(); activas = new Set(); derrumbes = 0; caidos = 0
  }
  onDestroy(() => clearInterval(reloj))
</script>

<div class="mini">
  <div class="grilla" role="button" tabindex="0" aria-label={txt.guia.mini.pila} onpointerdown={clic} onkeydown={tecla}>
    {#each h as n, i (i)}
      <span class:inestable={n >= UMBRAL} class:activa={activas.has(i)} style:--c={n >= UMBRAL ? '#fff' : COLOR_CSS[n]}>{n}</span>
    {/each}
  </div>
  <div class="cuenta num" aria-live="polite">
    <p><b>{txt.guia.mini.derrumbes(derrumbes)}</b></p>
    <p>{txt.guia.mini.caidos(caidos)}</p>
    <button class="reiniciar" onclick={reiniciar}>{txt.guia.mini.reiniciar}</button>
  </div>
</div>

<style>
  .mini { display: flex; flex-wrap: wrap; align-items: end; gap: 1.25rem 2rem; }
  .grilla {
    display: grid; grid-template-columns: repeat(15, 1fr); gap: 2px; width: min(100%, 24rem); aspect-ratio: 1;
    padding: 2px; border-radius: 4px; background: rgb(255 255 255 / 0.03); cursor: pointer; touch-action: manipulation;
    user-select: none;
  }
  .grilla:focus-visible { outline: 1px solid var(--tinta); outline-offset: 4px; }
  .grilla span {
    display: grid; place-items: center; border-radius: 2px; background: color-mix(in srgb, var(--c) 62%, var(--fondo));
    font-size: clamp(0.5rem, 1.6vw, 0.6875rem); font-variant-numeric: tabular-nums; color: rgb(7 8 15 / 0.55);
    transition: background 0.25s;
  }
  .grilla .inestable { box-shadow: 0 0 0.5rem rgb(255 255 255 / 0.7); color: var(--fondo); font-weight: 600; }
  .grilla .activa { animation: derrumbe 0.36s ease-out; position: relative; z-index: 1; }
  @keyframes derrumbe {
    0% { transform: scale(1.35); box-shadow: 0 0 1rem 0.25rem #fff; background: #fff; }
  }
  :global(.quieto) .grilla .activa { animation: none; outline: 2px solid #fff; }
  .cuenta { display: grid; gap: 0.25rem; font-size: 0.875rem; color: var(--tenue); }
  .cuenta p { margin: 0; }
  .cuenta b { font-weight: 600; color: var(--tinta); }
  .reiniciar {
    justify-self: start; min-height: 2.75rem; margin-top: 0.5rem; padding: 0; border: 0; border-bottom: 1px solid var(--borde);
    background: none; color: var(--tenue); font: inherit; font-size: 0.875rem; cursor: pointer; transition: color 0.15s, border-color 0.15s;
  }
  .reiniciar:hover { color: var(--tinta); border-color: var(--tinta); }
</style>
