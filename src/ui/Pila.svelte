<script lang="ts">
  // La pila ocupa toda la ventana, detrás de la interfaz. Clic, toque o barra espaciadora = Puñado.
  import { onMount } from 'svelte'
  import { CFG, DEFECTOS, anillos, caudal, densidad, hayEstratos, multAnillos, multColor, punado, type DefectoId } from '../core'
  import { ALTURA_DE_COLOR, COLOR_CSS, PilaVisual, brillo } from '../render/pilaVisual'
  import { txt } from '../strings'
  import { formato, formatoMult } from './formato'
  import { ajustes } from './ajustes.svelte'
  import { COLORES_DALTONISMO, EFECTOS, FONDOS, PALETAS, css } from '../render/paletas'
  import { contarAvalancha, muestraAvalancha } from '../guardado/historial'
  import { camara, enZoomMaximo, hayPanel, historial, invitaTocar, juego, ponerZoom, progresoCompresion, sismo, vigia, zoomActual } from './juego.svelte'
  import { elegido } from './logros'
  import * as sonido from './sonido'
  import { grabacion } from './grabacion'

  const ANILLO_SEP = 8 // px CSS entre la pila y el anillo de Compresión
  const LEJOS = 0.5 // cámara de la pantalla de título
  const ACERCAR_MS = 1400 // al entrar, la cámara se acerca; el primer grano del Caudal cae a 1 s
  const IMPLOSION_MS = 900 // lo que dura la animación implotar del CSS

  let canvas: HTMLCanvasElement
  /** Logro secreto Arena: granos de un solo color de la paleta en uso, elegido al azar en cada lluvia. */
  const ESQUIRLAS = 18 // cristales de la cinemática del Infinito
  const GRANOS_LLUVIA = 80
  const colorLluvia = $derived.by(() => {
    if (!juego.lluvia) return ''
    const p = ajustes.daltonismo ? COLORES_DALTONISMO : PALETAS[elegido('paleta', Object.keys(PALETAS), ajustes.paleta, juego.logros)]
    return css(p[Math.floor(Math.random() * p.length)])
  })
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
    vigia.clic(Date.now()) // Esto no es un clicker: cuentan todos, también los que el tope del Puñado no deja pasar
    juego.s = punado(juego.s)
    if (!juego.vistos.punado) juego.vistos = { ...juego.vistos, punado: true }
  }

  // Zoom: rueda (y el pellizco del trackpad, que llega como rueda con Ctrl) y pellizco con dos dedos.
  function rueda(e: WheelEvent) {
    e.preventDefault() // con Ctrl, el navegador haría zoom de la página
    ponerZoom(zoomActual() * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)))
  }
  const dedos = new Map<number, PointerEvent>()
  let pellizco = { d: 0, z: 0 }
  const distancia = () => {
    const [a, b] = [...dedos.values()]
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }
  function bajar(e: PointerEvent) {
    dedos.set(e.pointerId, e)
    canvas.setPointerCapture(e.pointerId)
    if (dedos.size === 2) pellizco = { d: distancia(), z: zoomActual() }
    else if (dedos.size === 1) soltar() // el segundo dedo de un pellizco no es un Puñado
  }
  function mover(e: PointerEvent) {
    if (!dedos.has(e.pointerId)) return
    dedos.set(e.pointerId, e)
    if (dedos.size === 2 && pellizco.d > 0) ponerZoom((pellizco.z * distancia()) / pellizco.d)
  }
  const levantar = (e: PointerEvent) => dedos.delete(e.pointerId)

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
    // Durante la cinemática del Infinito: nada de textos, sonidos ni récords nuevos.
    const fin = () => juego.cinematica
    pila.alAvalancha = (n) => {
      if (fin()) return
      efecto({ texto: txt.avalancha(n) })
      sonido.avalancha(n)
    }
    // I9: el récord (y sus logros) es la avalancha de un grano solo; las tandas suman muchas y no cuentan.
    pila.alMuestra = (n) => {
      if (fin()) return
      muestraAvalancha(historial, n)
      vigia.avalancha(n)
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
    $effect(() => void (pila.fondo = elegido('fondo', FONDOS, ajustes.fondo, juego.logros)))
    $effect(() => void (pila.defecto = DEFECTOS.indexOf(juego.s.defectos.actual as DefectoId) + 1))
    $effect(() => void (pila.radioMax = radioMax || Infinity))
    $effect(() => void (pila.acercar = juego.zoom))
    canvas.addEventListener('wheel', rueda, { passive: false })
    let cuadroAntes = 0
    let compZoom = juego.s.compresiones
    camara.foto = () => pila.foto()
    let entro = juego.titulo ? -1 : 0 // ms en que se tocó Jugar (0: no hubo título)
    let anillosAntes = anillos(juego.s.granos)
    const coloresVistos = () => CFG.colores.filter((_, i) => juego.vistos[`color${i}`]).length
    let coloresAntes = coloresVistos()
    sonido.fondo(coloresAntes)
    const brillos = [0, 0, 0, 0]
    let compAntes = juego.s.compresiones
    let infAntes = juego.s.infinitos
    let cineAntes = false
    let cristalesAntes = juego.s.cristales
    let granosAntes = juego.s.granos
    let saltosAntes = juego.saltos
    let manoAntes = juego.aMano
    grabacion.pila = pila
    const TAPAR_MS = 1500 // más que la animación más larga de entrada de Capas.svelte (1,1 s)
    let tapadaDesde = 0
    let raf = requestAnimationFrame(function cuadro(ahora) {
      // Modo grabación (debug): el guion maneja la pila; acá no pasa nada más.
      if (grabacion.cuadro) return void ((raf = requestAnimationFrame(cuadro)), grabacion.cuadro(ahora))
      const s = juego.s
      // Microscopio: tiempo real con el zoom al máximo en esta Compresión (sin contar el título ni la pestaña oculta).
      if (s.compresiones !== compZoom) (compZoom = s.compresiones), (juego.zoomMaxS = 0)
      if (enZoomMaximo() && !juego.titulo) juego.zoomMaxS += Math.min(0.1, (ahora - cuadroAntes) / 1000)
      cuadroAntes = ahora
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
      }
      // CORRECCIONES 2: lo automático (Compresión, Infinito) se ve pero no suena.
      const aMano = juego.aMano !== manoAntes
      manoAntes = juego.aMano
      // Comprimir (a mano o la automática): implosión. La pila de pantalla se congela con lo que tenía.
      if (s.compresiones > compAntes) {
        implotando = true
        implotaHasta = ahora + IMPLOSION_MS
        if (aMano) sonido.compresion(IMPLOSION_MS)
        efecto({ compresion: { r: Math.max(pila.radioCss, 48), densidad: formatoMult(densidad(s)) } })
      }
      compAntes = s.compresiones
      // SPEC_CAPA1 §11: el primer Infinito es la cinemática (CSS de abajo); los siguientes, los Cristales sobre la pila.
      if (juego.cinematica && !cineAntes) sonido.infinito(1.8, 0.6)
      cineAntes = juego.cinematica
      // Solo el Infinito a mano: el automático llega cada pocos segundos y su aviso va juntado (avisoAutomatico).
      if (s.infinitos > infAntes && infAntes > 0 && aMano && ajustes.aviso_infinito) {
        sonido.hito('milestone')
        efecto({ texto: txt.cristal.ganados(formato(s.cristales.sub(cristalesAntes))) })
      }
      cristalesAntes = s.cristales
      infAntes = s.infinitos
      // Cristalización es una pantalla opaca: pasada su entrada (TAPAR_MS), la pila deja de dibujarse hasta volver a la Arena.
      if (juego.capa === 'arena') tapadaDesde = 0
      else tapadaDesde ||= ahora
      pila.tapada = tapadaDesde > 0 && ahora - tapadaDesde > TAPAR_MS
      if (implotando && ahora >= implotaHasta) implotando = false
      if (implotando) pila.cuadro(ahora, granosAntes, 0, brillos)
      else {
        // juego.nivelColores: nivel simulado desde el panel de debug (0 = el real)
        s.colores.forEach((nivel, i) => (brillos[ALTURA_DE_COLOR[i]] = brillo(multColor(i, juego.nivelColores || nivel).log10())))
        pila.cuadro(ahora, s.granos, juego.titulo || juego.cinematica ? 0 : caudal(s), brillos)
        granosAntes = s.granos
      }
      juego.escalaK = pila.escalaK
      const zm = Math.round(pila.pxAuto * 100) / 100
      if (zm !== juego.zoomMin) juego.zoomMin = zm
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

<div class="pila" style:--rp="{juego.radioPila}px" class:implota={implotando} class:cristaliza={juego.cinematica} class:quieto={ajustes.reducirDestellos}>
  <canvas bind:this={canvas} onpointerdown={bajar} onpointermove={mover} onpointerup={levantar} onpointercancel={levantar} aria-label={txt.pila}></canvas>
  <div class="tope" bind:clientWidth={radioMax}></div>
  {#if sinWebGL}<p class="sin-webgl" role="alert">{txt.sinWebGL}</p>{/if}
  {#if juego.lluvia && !ajustes.reducirDestellos}
    {#key juego.lluvia.id}
      <div class="lluvia" style:--c={colorLluvia} aria-hidden="true">
        {#each { length: GRANOS_LLUVIA } as _, i}<i style:left="{(i * 37.3) % 100}%" style:--d="{(i * 0.173) % 1.7}s" style:--v="{1.1 + ((i * 0.29) % 0.9)}s"></i>{/each}
      </div>
    {/key}
  {/if}
  {#if hayEstratos(juego.s) && !juego.titulo && !juego.cinematica}
    <!-- SPEC_CAPA1 §7.4: la flecha discreta a los Estratos, debajo de la pila. -->
    <button class="bajar" onclick={() => { juego.pantalla = 'estratos'; juego.capa = 'cristalizacion' }}>{txt.cristal.estratos.bajar}</button>
  {/if}
  <div class="efectos" class:quieto={ajustes.reducirDestellos} aria-hidden="true">
    {#if juego.vistos.compresion && comp.meta !== undefined}
      <!-- Compresión: el anillo se cierra con el progreso (escala logarítmica); al 100 % brilla. -->
      <svg class="compresion aparece" width={2 * ra + 8} height={2 * ra + 8} viewBox="{-ra - 4} {-ra - 4} {2 * ra + 8} {2 * ra + 8}">
        <circle class="via" r={ra} />
        <circle class="arco" r={ra} pathLength="1" stroke-dashoffset={1 - comp.p} />
      </svg>
    {/if}
    {#if juego.cinematica}
      <!-- SPEC_CAPA1 §11: el hielo sube desde abajo sobre la pila (que no se mueve), se rompe en cristales y sigue Cristalización. -->
      <div class="cine" style:--r="{Math.max(juego.radioPila, 48) + ANILLO_SEP}px">
        <div class="helada"></div>
        {#each { length: ESQUIRLAS } as _, i}
          <i style:--a="{(i * 360) / ESQUIRLAS + ((i * 47) % 23)}deg" style:--l={0.35 + ((i * 0.37) % 0.6)} style:--t="{0.9 + ((i * 0.61) % 1.1)}rem"></i>
        {/each}
      </div>
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
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; } /* none: el pellizco es el zoom de la pila, no el de la página */
  p { margin: 0; font-variant-numeric: tabular-nums; pointer-events: none; white-space: nowrap; }
  .bajar {
    position: absolute; left: 50%; top: min(calc(50% + var(--rp) + 1.25rem), calc(100% - 3.25rem)); translate: -50%; min-height: 2.75rem; padding: 0 0.75rem;
    border: 0; background: none; color: var(--apagado); font: inherit; font-size: 0.875rem; cursor: pointer; text-shadow: 0 0 0.5rem var(--fondo); transition: color 0.15s;
  }
  .bajar:hover, .bajar:focus-visible { color: var(--hielo); }
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

  /* Logro secreto Arena: granos de un color que caen sobre toda la pila (10 s, juego.svelte.ts). */
  .lluvia { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .lluvia i {
    position: absolute; top: -8px; width: 3px; height: 3px; background: var(--c); box-shadow: 0 0 6px var(--c);
    animation: caer var(--v) var(--d) linear infinite backwards;
  }
  @keyframes caer { from { transform: translateY(0); } to { transform: translateY(calc(100vh + 16px)); } }


  /* SPEC 6.5, Compresión (1,5 s): la pila implota hacia el centro (0,9 s) dentro de un remolino de los cuatro colores,
     destello blanco que tapa el vaciado, y la Densidad nueva sube. */
  /* Solo el disco de la pila gira y se achica: sin la máscara se vería el rectángulo del canvas con su fondo. */
  .implota canvas { mask: radial-gradient(circle calc(var(--rp) + 16px) at 50% 50%, #000 80%, transparent); }
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

  /* SPEC_CAPA1 §11, primer Infinito (3,2 s: CINEMATICA_MS en juego.svelte.ts). La pila no se mueve: el hielo la cubre
     de abajo hacia arriba (0–1,8 s); después se apaga y los cristales salen del centro (1,8–2,9 s). */
  .cine { position: absolute; width: calc(2 * var(--r)); height: calc(2 * var(--r)); translate: -50% -50%; }
  /* Seis facetas de 60°, con un brillo fino en cada arista. */
  .helada {
    position: absolute; inset: 0; clip-path: circle(50%); mask: linear-gradient(#000, #000) bottom / 100% 100% no-repeat; backdrop-filter: saturate(0.2) brightness(1.3); /* la pila se ve debajo, sin color: helada */
    background:
      repeating-conic-gradient(from 30deg, rgb(234 246 255 / 0.9) 0 0.6deg, transparent 0.6deg 60deg),
      conic-gradient(from 30deg, rgb(207 238 251 / 0.5), rgb(127 207 232 / 0.3) 60deg, rgb(234 246 255 / 0.55) 60deg, rgb(159 227 245 / 0.3) 120deg, rgb(191 233 247 / 0.5) 120deg, rgb(109 191 220 / 0.3) 180deg,
        rgb(234 246 255 / 0.55) 180deg, rgb(143 214 236 / 0.3) 240deg, rgb(216 242 252 / 0.5) 240deg, rgb(127 207 232 / 0.3) 300deg, rgb(196 236 249 / 0.5) 300deg, rgb(159 227 245 / 0.3));
    animation: helar 1.8s cubic-bezier(0.3, 0, 0.5, 1) both, quebrar 0.35s 1.8s ease-in forwards;
  }
  .cristaliza .compresion { animation: apagar 0.6s forwards; }
  .cristaliza canvas { animation: quebrar 0.35s 1.8s ease-in forwards; }
  .cine i {
    position: absolute; left: 50%; top: 50%; width: var(--t); height: calc(var(--t) * 1.732); margin: calc(var(--t) * -0.866) 0 0 calc(var(--t) * -0.5);
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); /* rombo de 60° */
    background: linear-gradient(120deg, var(--escarcha), var(--hielo) 55%, #5bb4d6); opacity: 0;
    animation: esquirla 1.1s 1.8s cubic-bezier(0.25, 0.6, 0.45, 1) forwards; will-change: transform, opacity;
  }
  @keyframes helar { from { mask-size: 100% 0; } }
  @keyframes quebrar { 40% { filter: brightness(1.8); } to { opacity: 0; } }
  @keyframes esquirla {
    from { transform: rotate(var(--a)) translateY(0) scale(0.4); opacity: 1; }
    70% { opacity: 1; }
    to { transform: rotate(var(--a)) translateY(calc(var(--l) * -75vmin)) rotate(200deg) scale(1.5); opacity: 0; }
  }
  /* Reducir destellos: el hielo aparece y se va, sin subir ni esquirlas. */
  .quieto .helada { animation: aparecerHielo 1.8s both, apagar 0.35s 1.8s forwards; }
  .quieto .cine i { display: none; }
  .cristaliza.quieto canvas { animation: apagar 0.35s 1.8s forwards; }
  @keyframes aparecerHielo { from { opacity: 0; } }
</style>
