<script lang="ts">
  // La pila ocupa toda la ventana, detrás de la interfaz. Clic, toque o barra espaciadora = Puñado.
  import { onMount } from 'svelte'
  import { CFG, anillos, caudal, densidad, multAnillos, multColor, punado } from '../core'
  import { ALTURA_DE_COLOR, COLOR_CSS, PilaVisual, brillo } from '../render/pilaVisual'
  import { txt } from '../strings'
  import { formatoMult } from './formato'
  import { ajustes } from './ajustes.svelte'
  import { COLORES_DALTONISMO, EFECTOS, PALETAS } from '../render/paletas'
  import { contarAvalancha, muestraAvalancha } from '../guardado/historial'
  import { camara, hayPanel, historial, invitaTocar, juego, progresoCompresion, sismo } from './juego.svelte'
  import { elegido } from './logros'
  import * as sonido from './sonido'
  import { grabacion } from './grabacion'

  const ANILLO_SEP = 8 // px CSS entre la pila y el anillo de Compresión
  const LEJOS = 0.5 // cámara de la pantalla de título
  const ACERCAR_MS = 1400 // al entrar, la cámara se acerca; el primer grano del Caudal cae a 1 s
  const IMPLOSION_MS = 900 // lo que dura la animación implotar del CSS

  let canvas: HTMLCanvasElement
  /** Radio máximo de la pila en px CSS: el ancho de .tope (App.svelte fija --pila-radio-max). */
  let radioMax = $state(0)
  let sinWebGL = $state(false)
  const comp = $derived(progresoCompresion(juego.s))
  const ra = $derived(juego.radioPila + ANILLO_SEP)
  // Textos flotantes y anillos (SPEC 6.2). Animaciones de CSS (transform y opacidad): no pasan por el hilo principal.
  type Efecto = {
    id: number; texto?: string; anillo?: { r: number; color: string }; ola?: { r: number; color: string }
    /** SPEC 6.5: la pila implota con una estela de los cuatro colores, destello blanco y la Densidad nueva. */
    compresion?: { r: number; densidad: string }
    /** La primera avalancha después del primer toque: un destello que sale de la pila. */
    chispa?: { r: number }
  }
  /** Durante la implosión la pila de pantalla se queda con los granos de antes de comprimir; al terminar, se vacía. */
  let implotando = $state(false)
  // Con un reloj y no con animationend: la estela puede no animar (Reducir destellos) o salir de `efectos` antes de terminar.
  let implotaHasta = 0
  const ESTELA = `conic-gradient(${[...COLOR_CSS, COLOR_CSS[0]].join(', ')})`
  let efectos = $state<Efecto[]>([])
  let siguiente = 0
  const efecto = (e: Omit<Efecto, 'id'>) => (efectos = [...efectos.slice(-3), { ...e, id: siguiente++ }])
  const quitar = (id: number) => (efectos = efectos.filter((e) => e.id !== id))

  function soltar() {
    juego.s = punado(juego.s)
    if (!juego.vistos.punado) juego.vistos = { ...juego.vistos, punado: true }
  }

  function tecla(e: KeyboardEvent) {
    // En un botón o un campo, la barra hace lo suyo.
    if (e.code !== 'Space' || hayPanel() || e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return
    e.preventDefault()
    soltar()
  }

  onMount(() => {
    const pila = new PilaVisual(canvas)
    sinWebGL = pila.sinWebGL
    // Los granos iniciales derrumban al montar, antes del primer toque: esos no cuentan.
    let primera = invitaTocar()
    pila.alMedir = (m) => (juego.medidas = m)
    // Después del Infinito la pila colapsó: nada de textos, sonidos ni récords nuevos sobre la pantalla final.
    const fin = () => juego.s.infinitos > 0
    pila.alAvalancha = (n) => {
      if (fin()) return
      efecto({ texto: txt.avalancha(n) })
      sonido.avalancha(n)
    }
    // I9: el récord (y sus logros) es la avalancha de un grano solo; las tandas suman muchas y no cuentan.
    pila.alMuestra = (n) => {
      if (fin()) return
      muestraAvalancha(historial, n)
      if (n > juego.record) juego.record = n
    }
    pila.alTamano = (n) => {
      if (fin()) return
      if (primera && juego.vistos.punado) {
        primera = false
        juego.primera = true
        sonido.hito('milestone')
        efecto({ chispa: { r: Math.max(pila.radioCss, 48) } })
      }
      sismo.push(n)
      sonido.derrumbe(n)
      contarAvalancha(historial, n)
      if (sismo.length > 1000) sismo.shift() // nadie lo vacía hasta que aparece el sismógrafo
    }
    $effect(() => void (pila.destellos = ajustes.reducirDestellos))
    $effect(() => void (pila.ahorro = ajustes.ahorro))
    $effect(() => void (pila.paleta = ajustes.daltonismo
      ? COLORES_DALTONISMO
      : PALETAS[elegido('paleta', Object.keys(PALETAS), ajustes.paleta, juego.logros)]))
    $effect(() => void (pila.efecto = EFECTOS.indexOf(elegido('efecto', EFECTOS, ajustes.efecto, juego.logros))))
    $effect(() => void (pila.radioMax = radioMax || Infinity))
    camara.foto = () => pila.foto()
    let entro = juego.titulo ? -1 : 0 // ms en que se tocó Jugar (0: no hubo título)
    let anillosAntes = anillos(juego.s.granos)
    const coloresVistos = () => CFG.colores.filter((_, i) => juego.vistos[`color${i}`]).length
    let coloresAntes = coloresVistos()
    sonido.fondo(coloresAntes)
    const brillos = [0, 0, 0, 0]
    let compAntes = juego.s.compresiones
    let infAntes = juego.s.infinitos
    let granosAntes = juego.s.granos
    let saltosAntes = juego.saltos
    // SPEC 6.7: acorde en cada hito ×4 de un color (cada CFG.hito_colores.cada niveles).
    const hitos = (s: typeof juego.s) => s.colores.reduce((t, n) => t + Math.floor(n / CFG.hito_colores.cada), 0)
    let hitosAntes = hitos(juego.s)
    grabacion.pila = pila
    let raf = requestAnimationFrame(function cuadro(ahora) {
      // Modo grabación (debug): el guion maneja la pila; acá no pasa nada más.
      if (grabacion.cuadro) return void ((raf = requestAnimationFrame(cuadro)), grabacion.cuadro(ahora))
      const s = juego.s
      // Título: la pila quieta y lejos. Al entrar, la cámara se acerca.
      if (!juego.titulo && entro < 0) entro = ahora
      const t = entro < 0 ? 0 : ajustes.reducirDestellos || !entro ? 1 : Math.min(1, (ahora - entro) / ACERCAR_MS)
      pila.zoom = LEJOS + (1 - LEJOS) * (1 - (1 - t) ** 3)
      // Vuelta de una ausencia: lo que pasó afuera (compresiones, anillos, colores) no se anima; la pila salta a su foto.
      if (juego.saltos !== saltosAntes) {
        saltosAntes = juego.saltos
        compAntes = s.compresiones
        infAntes = s.infinitos
        anillosAntes = anillos(s.granos)
        coloresAntes = coloresVistos()
        hitosAntes = hitos(s)
      }
      const h = hitos(s)
      if (h > hitosAntes) sonido.hito('milestone')
      hitosAntes = h
      // Comprimir (a mano o la automática): implosión. La pila de pantalla se congela con lo que tenía.
      if (s.compresiones > compAntes) {
        implotando = true
        implotaHasta = ahora + IMPLOSION_MS
        sonido.compresion(IMPLOSION_MS)
        efecto({ compresion: { r: Math.max(pila.radioCss, 48), densidad: formatoMult(densidad(s)) } })
      }
      compAntes = s.compresiones
      // SPEC 6.6: blanco y colapso (2,8 s, CSS de abajo), un segundo de silencio y el final.
      if (s.infinitos > infAntes) sonido.infinito(2.8, 1)
      infAntes = s.infinitos
      if (implotando && ahora >= implotaHasta) implotando = false
      if (implotando) pila.cuadro(ahora, granosAntes, 0, brillos)
      else {
        // juego.nivelColores: nivel simulado desde el panel de debug (0 = el real)
        s.colores.forEach((nivel, i) => (brillos[ALTURA_DE_COLOR[i]] = brillo(multColor(i, juego.nivelColores || nivel).log10())))
        pila.cuadro(ahora, s.granos, juego.titulo || s.infinitos > 0 ? 0 : caudal(s), brillos)
        granosAntes = s.granos
      }
      juego.escalaK = pila.escalaK
      const r = Math.round(pila.radioCss)
      if (r !== juego.radioPila) juego.radioPila = r
      // SPEC 5: el color nuevo recorre la pila, del centro al borde.
      const c = coloresVistos()
      if (c > coloresAntes) sonido.hito('color')
      if (c !== coloresAntes) sonido.fondo(c)
      if (c > coloresAntes) efecto({ ola: { r: Math.max(pila.radioCss, 48), color: COLOR_CSS[ALTURA_DE_COLOR[c - 1]] } })
      coloresAntes = c
      // Si se ganan varios en un cuadro (saltos de debug) se muestra uno solo, el último.
      const n = anillos(s.granos)
      if (n > anillosAntes) {
        sonido.hito('ring')
        const mult = multAnillos(s).pow(1 / n).toNumber()
        efecto({ texto: txt.anillo(n, mult), anillo: { r: pila.radioCss, color: pila.colorDominante() } })
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

<div class="pila" style:--rp="{juego.radioPila}px" class:implota={implotando} class:colapsa={juego.s.infinitos > 0} class:quieto={ajustes.reducirDestellos}>
  <canvas bind:this={canvas} onpointerdown={soltar} aria-label={txt.pila}></canvas>
  <div class="tope" bind:clientWidth={radioMax}></div>
  {#if sinWebGL}<p class="sin-webgl" role="alert">{txt.sinWebGL}</p>{/if}
  <div class="efectos" class:quieto={ajustes.reducirDestellos} aria-hidden="true">
    {#if juego.vistos.compresion && comp.meta !== undefined}
      <!-- Compresión: el anillo se cierra con el progreso (escala logarítmica); al 100 % brilla. -->
      <svg class="compresion aparece" width={2 * ra + 8} height={2 * ra + 8} viewBox="{-ra - 4} {-ra - 4} {2 * ra + 8} {2 * ra + 8}">
        <circle class="via" r={ra} />
        <circle class="arco" r={ra} pathLength="1" stroke-dashoffset={1 - comp.p} />
      </svg>
    {/if}
    {#if juego.s.infinitos > 0}
      <!-- SPEC 6.6: la pila se vuelve blanca desde el centro hacia afuera; después colapsa en un punto (.colapsa). -->
      <div class="blanco" style:--r="{Math.max(juego.radioPila, 48) + ANILLO_SEP}px"></div>
    {/if}
    {#if invitaTocar() && !juego.titulo}
      <!-- La pista "Tocá la pila": dos ondas que salen del centro, hasta el primer toque. -->
      <div class="toque"></div><div class="toque segunda"></div>
    {/if}
    {#each efectos as e (e.id)}
      {#if e.compresion}
        <div class="estela" style:--r="{e.compresion.r}px" style:background={ESTELA}></div>
        <div class="destello"></div>
        <p class="flota densidad" onanimationend={() => quitar(e.id)}>{txt.densidadNueva(e.compresion.densidad)}</p>
      {:else if e.chispa}
        <div class="chispa" style:--r="{e.chispa.r}px" onanimationend={() => quitar(e.id)}></div>
      {:else if e.ola}
        <div class="ola" style:--r="{e.ola.r}px" style:--c={e.ola.color} onanimationend={() => quitar(e.id)}></div>
      {:else}
        {#if e.anillo}<div class="anillo" style:--r="{e.anillo.r}px" style:--c={e.anillo.color}></div>{/if}
        <p class={e.anillo ? 'flota abajo' : 'flota'} onanimationend={() => quitar(e.id)}>{e.texto}</p>
      {/if}
    {/each}
  </div>
</div>

<style>
  /* La región de la pila la fija App.svelte con --pila-arriba y --pila-abajo (móvil); la pila se centra sola en ella.
     En escritorio es la ventana entera: la pila en el centro exacto, achicada (--pila-radio-max) si las columnas la tapan. */
  .pila { position: fixed; inset: var(--pila-arriba, 0) 0 var(--pila-abajo, 0) 0; transition: top 0.6s ease, bottom 0.6s ease; }
  .sin-webgl { position: absolute; left: 50%; top: 50%; translate: -50% -50%; max-width: 20rem; white-space: normal; text-align: center; color: var(--tenue); }
  .tope { position: absolute; width: var(--pila-radio-max, 100vw); height: 0; pointer-events: none; }
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
  .toque {
    position: absolute; width: 6rem; height: 6rem; translate: -50% -50%; border-radius: 50%; opacity: 0;
    border: 1.5px solid rgb(232 233 243 / 0.55); animation: toque 2.4s ease-out infinite;
  }
  .toque.segunda { animation-delay: 1.2s; }
  .chispa {
    position: absolute; width: calc(6 * var(--r)); height: calc(6 * var(--r)); translate: -50% -50%; border-radius: 50%;
    background: radial-gradient(circle, rgb(255 240 210 / 0.95) 0, rgb(255 181 71 / 0.45) 18%, transparent 55%);
    mix-blend-mode: screen; animation: chispa 0.8s ease-out forwards; will-change: transform, opacity;
  }
  .quieto .toque { animation-name: latir; }
  .quieto .chispa { animation-name: tenir; }
  @keyframes toque { from { transform: scale(0.35); opacity: 0; } 25% { opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
  @keyframes latir { 50% { opacity: 0.6; } }
  @keyframes chispa { from { transform: scale(0.25); opacity: 1; } to { transform: scale(1); opacity: 0; } }
  /* Reducir destellos: nada se mueve ni crece, solo aparece y se desvanece. */
  .quieto .flota, .quieto .anillo { animation-name: desvanecer; }
  @keyframes subir { from { transform: none; opacity: 1; } to { transform: translateY(-4rem); opacity: 0; } }
  @keyframes expandir { from { transform: scale(1); opacity: 0.9; } to { transform: scale(1.5); opacity: 0; } }
  @keyframes desvanecer { from { opacity: 1; } to { opacity: 0; } }
  @keyframes ola { from { transform: scale(0.05); opacity: 0.9; } 70% { opacity: 0.7; } to { transform: scale(1.08); opacity: 0; } }
  @keyframes tenir { from { opacity: 0.25; } to { opacity: 0; } }

  /* SPEC 6.5, Compresión (1,5 s): la pila implota hacia el centro (0,9 s) dentro de un remolino de los cuatro colores,
     destello blanco que tapa el vaciado, y la Densidad nueva sube. */
  /* Solo el disco de la pila gira y se achica: sin la máscara se vería el rectángulo del canvas con su fondo. */
  .implota canvas, .colapsa canvas { mask: radial-gradient(circle calc(var(--rp) + 16px) at 50% 50%, #000 80%, transparent); }
  .implota canvas { animation: implotar 0.9s cubic-bezier(0.6, 0, 0.9, 0.4) forwards; }
  .estela {
    position: absolute; width: calc(2.4 * var(--r)); height: calc(2.4 * var(--r)); translate: -50% -50%; border-radius: 50%;
    mask: radial-gradient(circle, transparent 30%, #000 55%, transparent 71%); filter: blur(6px); mix-blend-mode: screen;
    animation: remolino 0.9s cubic-bezier(0.6, 0, 0.9, 0.4) forwards;
  }
  .destello {
    position: fixed; width: 300vmax; height: 300vmax; translate: -50% -50%; opacity: 0;
    background: radial-gradient(circle, #fff 0, rgb(255 255 255 / 0.9) 4%, rgb(255 255 255 / 0.25) 18%, transparent 45%);
    animation: destellar 0.7s 0.82s ease-out forwards;
  }
  .flota.densidad {
    font-size: 2.25rem; letter-spacing: -0.02em; opacity: 0; text-shadow: 0 0 1.25rem rgb(255 255 255 / 0.8), 0 0 0.25rem #07080f;
    animation: densidad 2.6s 0.85s ease-out forwards;
  }
  @keyframes implotar {
    to { transform: scale(0.02) rotate(120deg); filter: brightness(3) saturate(1.6); opacity: 0.6; }
  }
  @keyframes remolino {
    from { transform: scale(1) rotate(0); opacity: 0; }
    20% { opacity: 1; }
    to { transform: scale(0.03) rotate(540deg); opacity: 1; }
  }
  @keyframes destellar { 0% { opacity: 0; transform: scale(0.2); } 20% { opacity: 1; } 100% { opacity: 0; transform: scale(1); } }
  @keyframes densidad {
    0% { opacity: 0; transform: scale(0.6); }
    15% { opacity: 1; transform: scale(1.08); }
    25%, 70% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: translateY(-2rem); }
  }
  /* Reducir destellos: sin giro ni zoom; la pila se apaga, un destello suave y la Densidad aparece y se va. */
  .implota.quieto canvas { animation: apagar 0.9s ease-in forwards; }
  .quieto .estela { display: none; }
  .quieto .destello { animation-name: destellarSuave; }
  .quieto .flota.densidad { animation-name: densidadQuieta; }
  @keyframes apagar { to { opacity: 0; } }
  @keyframes destellarSuave { 20% { opacity: 0.35; } 100% { opacity: 0; } }
  @keyframes densidadQuieta { 15%, 70% { opacity: 1; } 100% { opacity: 0; } }

  /* SPEC 6.6, Infinito: blanco desde el centro (2 s), colapso en un punto (0,8 s). App.svelte sigue con el silencio y el final. */
  .blanco {
    position: absolute; width: calc(2 * var(--r)); height: calc(2 * var(--r)); translate: -50% -50%; border-radius: 50%;
    background: radial-gradient(circle, #fff 55%, rgb(255 255 255 / 0.6) 66%, transparent 71%);
    box-shadow: 0 0 4rem rgb(255 255 255 / 0.4); animation: blanquear 2s cubic-bezier(0.4, 0, 0.6, 1) forwards;
  }
  .colapsa .compresion { animation: apagar 0.6s forwards; }
  .colapsa canvas { animation: colapsar 0.8s 2s cubic-bezier(0.7, 0, 0.9, 0.3) forwards; }
  .colapsa .blanco { animation: blanquear 2s cubic-bezier(0.4, 0, 0.6, 1) forwards, colapsar 0.8s 2s cubic-bezier(0.7, 0, 0.9, 0.3) forwards; }
  .colapsa.quieto canvas { animation-name: apagar; }
  /* M14: el final ya visto (App.svelte .ya): la pila ya colapsó. */
  :global(.ya) .colapsa canvas, :global(.ya) .colapsa .blanco, :global(.ya) .colapsa .compresion { animation-duration: 0s; animation-delay: 0s; }
  .colapsa.quieto .blanco { animation: aparecerBlanco 2s forwards, apagar 0.8s 2s forwards; }
  @keyframes blanquear { from { transform: scale(0); } to { transform: scale(1); } }
  @keyframes aparecerBlanco { from { opacity: 0; } }
  @keyframes colapsar { 90% { transform: scale(0.004); opacity: 1; } to { transform: scale(0); opacity: 0; } }
</style>
