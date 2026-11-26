<script lang="ts">
  // Capa 2, fase 4 (beta): el Motor de Brasas (docs/capa2/temperatura_motor.md). Un círculo de piedra que se abre por etapas
  // como un iris; adentro, el fuego sube con la Temperatura; alrededor, el canal del reparto del calor y las Brasas en órbita.
  // Render a demanda: la piedra y el iris son un SVG quieto que cambia solo con el estado; lo que se mueve (llamas, halo,
  // órbita) son capas HTML animadas con transform y opacidad, que se componen sin repintar. Se crea al entrar a la pantalla
  // y se destruye al salir (Capas.svelte).
  import { Tween } from 'svelte/motion'
  import { cubicOut } from 'svelte/easing'
  import {
    CFG2, SECTORES, abiertos, calor, elegirReparto, etapaMotor, moverBorde, partes, ponerParte, ponerReparto, temperatura, type Sector,
  } from '../core'
  import { txt } from '../strings'
  import { ajustes, quieto } from './ajustes.svelte'
  import { formato, formatoMult } from './formato'
  import { ICONOS } from './iconos'
  import { juego } from './juego.svelte'

  const m = txt.fuego.motor
  const TP = CFG2.temperatura
  // Color de cada sector: el de su sistema, calentado (Pila conserva el ámbar de la arena).
  const COLOR: Record<Sector, string> = { pila: '#ffb547', red: '#ff6a3d', estratos: '#d9572b', escarcha: '#ffe1b0', relicario: '#ff9e8a' }
  // Qué fuego abre cada sector que no viene con la primera Fundición (para "el iris se abre más con…").
  const ABRE: Partial<Record<Sector, string>> = { estratos: 'estratos', escarcha: 'frio', relicario: 'engarces' }

  const s = $derived(juego.ver)
  const T = $derived(temperatura(s))
  const t = $derived(Math.min(1, (T - TP.inicial) / (TP.ignicion - TP.inicial)))
  const etapa = $derived(etapaMotor(s))
  const ab = $derived(abiertos(s))
  const rep = $derived(partes(s.fuego.repartos[s.fuego.reparto], ab))
  // Orden de los sectores abiertos alrededor del canal, desde arriba en el sentido del reloj.
  const orden = $derived(SECTORES.map((_, i) => i).filter((i) => ab[i]))
  const cum = $derived(orden.reduce<number[]>((a, i) => [...a, (a.at(-1) ?? 0) + rep[i]], []))
  const proximo = $derived(SECTORES.find((k, i) => !ab[i] && ABRE[k]))

  // --- geometría (viewBox −104…104) ---
  const RO = 76, RI = 52, RC = 87 // piedra afuera, piedra adentro (el iris), canal del reparto
  const APERTURA = [0.12, 0.44, 0.62, 0.8, 0.97] // fracción de RI por etapa (0 = cerrado)
  const iris = new Tween(APERTURA[0], { duration: 1600, easing: cubicOut })
  $effect(() => { iris.set(APERTURA[etapa] ?? 1, { duration: quieto() ? 0 : 1600 }) })
  const a = $derived(iris.current * RI)

  const pol = (r: number, g: number) => [r * Math.cos(g), r * Math.sin(g)]
  const p = (x: number[]) => `${x[0].toFixed(2)} ${x[1].toFixed(2)}`
  // Hojas del iris: cada una cubre lo que queda más allá de una curva que nace tangente al círculo de apertura (recortadas
  // al círculo RI). El filo curvo es el de un diafragma de cámara; giran un poco al abrirse.
  const HOJAS = 9
  const hojas = $derived(Array.from({ length: HOJAS }, (_, k) => {
    const g = (k / HOJAS) * 2 * Math.PI - Math.PI / 2 + iris.current * 1.4
    const u = [Math.cos(g), Math.sin(g)], v = [-Math.sin(g), Math.cos(g)], L = 2.4 * RI
    const q = (s1: number, s2: number) => p([a * u[0] + s1 * v[0] + s2 * u[0], a * u[1] + s1 * v[1] + s2 * u[1]])
    const filo = `M${q(-0.4 * a, 0)}Q${q(0.45 * L, 0.2 * RI)} ${q(L, 0.55 * RI)}`
    return { d: `${filo}L${q(L, L)}L${q(-0.4 * a, L)}Z`, filo }
  }))

  // La piedra: dovelas de anchos distintos, con un poco de variación de color (fija: la misma piedra cada vez).
  const azar = (k: number) => ((k * 7919 + 13) % 97) / 97
  const anchos = Array.from({ length: 15 }, (_, k) => 0.7 + 0.6 * azar(k + 3))
  const total = anchos.reduce((x, y) => x + y, 0)
  const dovelas = anchos.map((w, k) => {
    const f0 = anchos.slice(0, k).reduce((x, y) => x + y, 0) / total, f1 = f0 + w / total
    const g0 = f0 * 2 * Math.PI + 0.01 - 1.3, g1 = f1 * 2 * Math.PI - 0.01 - 1.3, r0 = RI + 0.8, r1 = RO - 0.8
    const d = `M${p(pol(r0, g0))}L${p(pol(r1, g0))}A${r1} ${r1} 0 0 1 ${p(pol(r1, g1))}L${p(pol(r0, g1))}A${r0} ${r0} 0 0 0 ${p(pol(r0, g0))}Z`
    const r = azar(k)
    return { d, c: `hsl(${16 + r * 12} ${8 + r * 7}% ${12 + r * 6}%)` }
  })
  // Cinceladas: rayas cortas en la piedra.
  const marcas = Array.from({ length: 46 }, (_, k) => {
    const g = k * 2.399, r = RI + 3 + ((k * 37) % 20)
    return `M${p(pol(r, g))}L${p(pol(r + 1.2 + (k % 3), g + 0.025))}`
  }).join('')

  // Un enchufe por sector en la piedra: encendido con el color del sector si está abierto, tallado y oscuro si no.
  const RE = (RI + RO) / 2
  const enchufes = SECTORES.map((k, i) => {
    const g = (i / SECTORES.length) * 2 * Math.PI - Math.PI / 2
    return { k, i, x: RE * Math.cos(g), y: RE * Math.sin(g) }
  })

  // El canal: un arco por sector abierto, del largo de su parte.
  const ang = (f: number) => f * 2 * Math.PI - Math.PI / 2
  const arco = (f0: number, f1: number, r: number) => {
    if (f1 - f0 >= 0.9999) return `M${p(pol(r, ang(0)))}A${r} ${r} 0 1 1 ${p(pol(r, ang(0.5)))}A${r} ${r} 0 1 1 ${p(pol(r, ang(1)))}`
    return `M${p(pol(r, ang(f0)))}A${r} ${r} 0 ${f1 - f0 > 0.5 ? 1 : 0} 1 ${p(pol(r, ang(f1)))}`
  }
  const arcos = $derived(orden.map((i, n) => ({ i, d: arco(n ? cum[n - 1] : 0, cum[n], RC), vacio: rep[i] < 0.002 })))
  const bordes = $derived(orden.slice(0, -1).map((i, n) => ({ n, i, j: orden[n + 1], f: cum[n], xy: pol(RC, ang(cum[n])) })))

  // Colores del fuego según la Temperatura: rojo oscuro a 300 K, naranja, amarillo y casi blanco en la Ignición.
  const PARADAS: [number, number[]][] = [[0, [110, 18, 6]], [0.18, [230, 64, 18]], [0.42, [255, 132, 40]], [0.7, [255, 196, 106]], [1, [255, 242, 214]]]
  function rgbT(x: number) {
    x = Math.min(1, Math.max(0, x))
    const k = PARADAS.findIndex(([q]) => q >= x)
    if (k <= 0) return PARADAS[0][1]
    const [q0, c0] = PARADAS[k - 1], [q1, c1] = PARADAS[k], f = (x - q0) / (q1 - q0)
    return c0.map((c, j) => Math.round(c + (c1[j] - c) * f))
  }
  const colorT = (x: number) => `rgb(${rgbT(x).join(' ')})`
  const fuego = $derived({ borde: colorT(0.04 + t * 0.4), medio: colorT(0.2 + t * 0.65), nucleo: colorT(0.5 + t * 0.5) })

  // El fuego, en píxeles como la arena (~3 px de pantalla cada uno): calor que sube desde el fondo y se enfría al azar.
  // La fuente calienta según la Temperatura: a 300 K, llamas cortas y rojas; en la Ignición llenan el círculo, casi blancas.
  // Va a ~10 cuadros por segundo (6 con Reducir destellos) y solo mientras esta pantalla existe; con Reducir movimiento o el
  // modo ahorro queda un cuadro quieto. Es solo dibujo: el azar no toca la economía.
  let lienzo = $state<HTMLCanvasElement>()
  let fuente = 0
  $effect(() => { fuente = 0.42 + 0.58 * t })
  const PALETA = Array.from({ length: 64 }, (_, k) => [...rgbT(k / 63), k < 6 ? 0 : Math.min(255, (k - 6) * 40)])
  $effect(() => {
    const c = lienzo
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const fijo = quieto(), cada = ajustes.calma ? 1000 / 6 : 100
    let n = 0, calorPx = new Float32Array(0), img = ctx.createImageData(1, 1)
    const medir = () => {
      const k = Math.max(16, Math.min(112, Math.round(c.clientWidth / 3)))
      if (k === n) return
      n = k; c.width = c.height = k; calorPx = new Float32Array(k * k); img = ctx.createImageData(k, k)
      for (let i = 0; i < 3 * k; i++) paso()
      pintar()
    }
    let fase = 0
    function paso() {
      // Se enfría a saltos (no de a poco): así salen lenguas y no una franja pareja. Las bases calientes van y vienen.
      const salto = 3 / n, p = 0.3
      fase += 0.07
      for (let x = 0; x < n; x++) {
        const base = 0.78 + 0.22 * Math.sin(x * 0.45 + fase) * Math.sin(x * 0.17 - fase * 0.6)
        calorPx[(n - 1) * n + x] = fuente * Math.min(1, base + 0.12 * Math.random())
      }
      for (let y = 0; y < n - 1; y++) for (let x = 0; x < n; x++) {
        const de = calorPx[(y + 1) * n + x]
        const a = Math.min(n - 1, Math.max(0, x + ((Math.random() * 3) | 0) - 1))
        calorPx[y * n + a] = Math.max(0, de - (Math.random() < p ? salto * Math.random() * 2 : 0))
      }
    }
    function pintar() {
      const d = img.data
      for (let i = 0; i < n * n; i++) {
        const q = PALETA[Math.min(63, (calorPx[i] * 63) | 0)]
        d[4 * i] = q[0]; d[4 * i + 1] = q[1]; d[4 * i + 2] = q[2]; d[4 * i + 3] = q[3]
      }
      ctx!.putImageData(img, 0, 0)
    }
    const ro = new ResizeObserver(medir)
    ro.observe(c)
    medir()
    if (fijo) return () => ro.disconnect()
    // Un temporizador a ~10 Hz y no requestAnimationFrame: no despierta 60 veces por segundo para dibujar 10.
    const id = setInterval(() => { if (!document.hidden) { paso(); pintar() } }, cada)
    return () => { clearInterval(id); ro.disconnect() }
  })

  // --- interacción ---
  function guardar(r: number[]) { juego.s = ponerReparto(juego.s, r) }
  const actual = () => partes(juego.s.fuego.repartos[juego.s.fuego.reparto], abiertos(juego.s))
  const ponerPct = (i: number, pct: number) => Number.isFinite(pct) && guardar(ponerParte(actual(), i, pct / 100, abiertos(juego.s)))
  const pasoPct = (i: number, d: number) => ponerPct(i, Math.round(actual()[i] * 100 / 5) * 5 + d)

  let svg = $state<SVGSVGElement>()
  let arrastrando = $state<number | null>(null)
  function fraccion(e: PointerEvent) {
    const q = svg!.createSVGPoint()
    q.x = e.clientX; q.y = e.clientY
    const { x, y } = q.matrixTransform(svg!.getScreenCTM()!.inverse())
    return ((Math.atan2(y, x) + Math.PI / 2) / (2 * Math.PI) + 1) % 1
  }
  function agarrar(e: PointerEvent, n: number) {
    arrastrando = n
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId) } catch { /* puntero ya suelto */ }
  }
  function arrastrar(e: PointerEvent) {
    if (arrastrando === null) return
    const b = bordes[arrastrando]
    let f = fraccion(e)
    if (f - b.f > 0.5) f -= 1 // del otro lado de arriba: que no salte de punta a punta
    if (b.f - f > 0.5) f += 1
    guardar(moverBorde(actual(), b.i, b.j, f - b.f, abiertos(juego.s)))
  }
  function teclaBorde(e: KeyboardEvent, n: number) {
    const d = { ArrowRight: 0.01, ArrowUp: 0.01, ArrowLeft: -0.01, ArrowDown: -0.01, PageUp: 0.1, PageDown: -0.1 }[e.key]
    if (d === undefined) return
    e.preventDefault()
    const b = bordes[n]
    guardar(moverBorde(actual(), b.i, b.j, d, abiertos(juego.s)))
  }

  // Lo que da cada sector ahora (en notación matemática, nunca porcentajes).
  function efecto(k: Sector) {
    const h = calor(s, k), e = CFG2.motor.efecto[k]
    if (k === 'pila') return m.efecto.pila(formatoMult(1 + e * h))
    if (k === 'red') return m.efecto.red(`×${formatoMult(10 ** (e * h))}`)
    return m.efecto[k](`×${formatoMult(1 + e * h)}`)
  }
  const pct = (x: number) => Math.round(x * 100)
  // Mini anillo de cada reparto guardado (los tres se cambian con un toque).
  const conico = (r: number[]) => {
    const q = partes(r, ab)
    let acc = 0
    return `conic-gradient(${SECTORES.map((k, i) => { const a0 = acc; acc += q[i]; return `${COLOR[k]} ${a0 * 360}deg ${acc * 360}deg` }).join(', ')})`
  }
  const brasasOrbita = $derived(Math.min(18, Math.max(3, Math.round(Math.sqrt(s.fuego.brasas) * 3))))
  // Etapa 2: gotas de vidrio en la órbita, más con más Vidrio (por órdenes de magnitud).
  const vidrioOrbita = $derived(etapa < 2 ? 0 : Math.min(12, 2 + Math.floor(Math.max(0, s.fuego.vidrio.log10()) / 2)))
</script>

<main class="motor" class:quieto={quieto()} class:calma={ajustes.calma} style:--t={t}>
  <header class="medidor">
    <div class="temp">
      <span class="rot">{m.temperatura}</span>
      <span class="k num">{txt.fuego.kelvin(T)}</span>
      <span class="dens num">{m.densidad(formatoMult((T - TP.inicial) * TP.densidad_por_K))}</span>
    </div>
    <div class="termo" role="meter" aria-valuemin={TP.inicial} aria-valuemax={TP.ignicion} aria-valuenow={Math.floor(T)} aria-label={m.ignicion(txt.fuego.kelvin(TP.ignicion))}>
      <i style:--p={t}></i><span class="num">{m.ignicion(txt.fuego.kelvin(TP.ignicion))}</span>
    </div>
    <div class="monedas">
      {#if etapa >= 2}<div class="brasas vidrio"><span class="rot">{m.vidrio}</span><span class="num">{formato(s.fuego.vidrio)}</span></div>{/if}
      <div class="brasas"><span class="rot">{txt.fuego.brasas}</span><span class="num">{formato(s.fuego.brasas)}</span></div>
    </div>
  </header>

  <div class="escena">
    <div class="circulo" style:--a={a / 104} style:--borde={fuego.borde} style:--medio={fuego.medio} style:--nucleo={fuego.nucleo}>
      <div class="halo" aria-hidden="true"></div>
      <div class="fuego" aria-hidden="true"><canvas bind:this={lienzo}></canvas></div>
      <svg bind:this={svg} viewBox="-104 -104 208 208" role="group" aria-label={m.escena} onpointermove={arrastrar}
        onpointerup={() => (arrastrando = null)} onpointercancel={() => (arrastrando = null)}>
        <defs>
          <radialGradient id="mot-luz" r="0.5">
            <stop offset={RI / RO - 0.01} stop-color={fuego.medio} stop-opacity="0" />
            <stop offset={RI / RO} stop-color={fuego.medio} stop-opacity={0.22 + 0.3 * t} />
            <stop offset={Math.min(0.99, (RI + 10) / RO)} stop-color={fuego.borde} stop-opacity="0.05" />
            <stop offset="1" stop-color="#000" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="mot-hoja" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#2e2622" /><stop offset="0.5" stop-color="#211b18" /><stop offset="1" stop-color="#171210" />
          </linearGradient>
          <radialGradient id="mot-luz-iris" r="0.5">
            <stop offset={a / RI - 0.01} stop-color={fuego.medio} stop-opacity="0" />
            <stop offset={a / RI} stop-color={fuego.medio} stop-opacity="0.3" />
            <stop offset={Math.min(0.99, a / RI + 0.22)} stop-color={fuego.borde} stop-opacity="0.06" />
            <stop offset="1" stop-color="#000" stop-opacity="0" />
          </radialGradient>
          <clipPath id="mot-dentro"><circle r={RI} /></clipPath>
          <filter id="mot-brillo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" /></filter>
        </defs>

        <!-- El canal del reparto: surco de piedra y un arco de brasa por sector. -->
        <circle class="surco" r={RC} />
        <g class="arcos">
          {#each arcos as c (c.i)}
            <path class="brillo" d={c.d} stroke={COLOR[SECTORES[c.i]]} filter="url(#mot-brillo)" opacity={c.vacio ? 0 : 0.25 + 0.3 * t} />
            <path d={c.d} stroke={COLOR[SECTORES[c.i]]} opacity={c.vacio ? 0 : 1} />
          {/each}
        </g>
        <path class="origen" d="M0 {-RC - 6}V{-RC + 6}" />

        <!-- La piedra. -->
        <path class="piedra-borde" fill-rule="evenodd" d="M{RO + 1.5} 0A{RO + 1.5} {RO + 1.5} 0 1 1 {-RO - 1.5} 0A{RO + 1.5} {RO + 1.5} 0 1 1 {RO + 1.5} 0ZM{RI} 0A{RI} {RI} 0 1 0 {-RI} 0A{RI} {RI} 0 1 0 {RI} 0Z" />
        {#each dovelas as d}<path d={d.d} fill={d.c} class="dovela" />{/each}
        <path class="cincel" d={marcas} />
        <circle r={RO} fill="url(#mot-luz)" class="luz" />
        <circle r={RO - 0.8} class="arista" />
        {#each enchufes as e (e.k)}
          <g class="enchufe" class:abierto={ab[e.i]} transform="translate({e.x} {e.y})" style:--c={COLOR[e.k]}>
            <circle r="6.5" />
            <path d={ICONOS[e.k]} transform="scale(0.5)" />
          </g>
        {/each}

        <!-- El iris: las hojas de piedra, abiertas según la etapa. -->
        <g clip-path="url(#mot-dentro)">
          {#each hojas as h}<path class="hoja" d={h.d} /><path class="filo" d={h.filo} pathLength="1" />{/each}
          <circle r={RI} fill="url(#mot-luz-iris)" class="luz" />
          <circle r={a * 1.06} class="resplandor" stroke={fuego.nucleo} filter="url(#mot-brillo)" />
        </g>
        <circle r={RI} class="aro-iris" />

        <!-- Manijas: los bordes entre sectores, para arrastrar (o con las flechas). -->
        {#each bordes as b (b.n)}
          {@const na = m.sectores[SECTORES[b.i]]}
          {@const nb = m.sectores[SECTORES[b.j]]}
          <g class="manija" class:activa={arrastrando === b.n} transform="translate({p(b.xy)})" role="slider" tabindex="0"
            aria-label={m.borde(na, nb)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct(rep[b.i])} aria-valuetext="{na} {pct(rep[b.i])} %, {nb} {pct(rep[b.j])} %"
            onpointerdown={(e) => agarrar(e, b.n)} onkeydown={(e) => teclaBorde(e, b.n)}>
            <circle class="toque" r="14" />
            <circle class="perilla" r="4.6" />
            <circle class="punto" r="1.4" />
          </g>
        {/each}
      </svg>
      <div class="orbita" aria-hidden="true">
        {#each { length: brasasOrbita } as _, k}<i style:--g="{(k / brasasOrbita) * 360 + ((k * 47) % 13)}deg" style:--r={0.9 + ((k * 31) % 7) / 100} style:--z={0.6 + ((k * 13) % 5) / 10}></i>{/each}
        {#each { length: vidrioOrbita } as _, k}<i class="gota" style:--g="{(k / vidrioOrbita) * 360 + 11 + ((k * 29) % 17)}deg" style:--r={0.86 + ((k * 23) % 5) / 100} style:--z={0.5 + ((k * 7) % 4) / 10}></i>{/each}
      </div>
    </div>
  </div>

  <section class="reparto" aria-labelledby="mot-reparto">
    <header>
      <h2 id="mot-reparto">{m.reparto}</h2>
      <div class="guardados" role="radiogroup" aria-label={m.reparto}>
        {#each s.fuego.repartos as r, k}
          <button role="radio" aria-checked={s.fuego.reparto === k} aria-label={m.guardado(k)} title={m.guardado(k)} onclick={() => (juego.s = elegirReparto(juego.s, k))}>
            <i style:background={conico(r)}></i><span>{['I', 'II', 'III'][k]}</span>
          </button>
        {/each}
      </div>
    </header>
    <ul>
      {#each SECTORES as k, i}{#if ab[i]}
        <li style:--c={COLOR[k]}>
          <svg viewBox="-8 -8 16 16" aria-hidden="true"><path d={ICONOS[k]} /></svg>
          <span class="nombre">{m.sectores[k]}</span>
          <span class="ctl">
            <button class="paso" aria-label={m.menos(m.sectores[k])} disabled={rep[i] <= 0} onclick={() => pasoPct(i, -5)}>−</button>
            <label><input class="num" type="number" min="0" max="100" step="1" value={pct(rep[i])} aria-label={m.parte(m.sectores[k])}
              onchange={(e) => ponerPct(i, +e.currentTarget.value)} /><span>%</span></label>
            <button class="paso" aria-label={m.mas(m.sectores[k])} disabled={rep[i] >= 1} onclick={() => pasoPct(i, 5)}>+</button>
          </span>
          <span class="efecto num">{efecto(k)}</span>
        </li>
      {/if}{/each}
    </ul>
    <p class="iris">{proximo ? m.abreCon(txt.fuego.nombres[ABRE[proximo]!]) : m.abierto}</p>
    <p class="que">{m.que}</p>
  </section>
</main>

<style>
  /* Basalto y brasa: casi negro con un calor rojizo que sube desde el centro. Nada de hielo ni de tarjetas: piedra tallada,
     líneas de 1 px y el fuego como única fuente de luz. */
  .motor {
    --brasa: #ff8a3d; --piedra: #2b2420; --ceniza: #b9a597;
    position: fixed; inset: 0; z-index: 4; overflow: hidden; color: #f3e6dc;
    display: grid; grid-template-columns: minmax(0, 1fr) 21rem; grid-template-rows: auto minmax(0, 1fr); gap: 0.5rem 2.5rem;
    padding: 2rem 2.5rem 2rem 7rem;
    background:
      radial-gradient(55% 60% at 42% 55%, rgb(120 36 10 / calc(0.18 + var(--t) * 0.25)), transparent 70%),
      radial-gradient(120% 90% at 50% 120%, #1a0c07, transparent 60%),
      radial-gradient(130% 100% at 40% 0%, #120c0b, #050405 70%);
    animation: entrar 0.4s ease-out;
  }
  @keyframes entrar { from { opacity: 0; } }

  .medidor { grid-column: 1 / -1; display: flex; align-items: end; gap: 1.5rem 3rem; flex-wrap: wrap; }
  .temp { display: grid; }
  .rot { font-size: 0.8125rem; color: var(--ceniza); letter-spacing: 0.02em; }
  .k {
    font-size: clamp(2.25rem, 4vw, 3.5rem); font-weight: 600; line-height: 1; letter-spacing: -0.03em;
    background: linear-gradient(#fff3d6, #ffb067 55%, #ff6a2a); background-clip: text; color: transparent;
  }
  .dens { margin-top: 0.3rem; font-size: 0.875rem; color: #ffb27a; }
  /* El termómetro: de 300 K a la Ignición, una veta de brasa en la piedra. */
  .termo { display: grid; gap: 0.35rem; flex: 1; max-width: 22rem; min-width: 10rem; padding-bottom: 0.3rem; }
  .termo i { position: relative; display: block; height: 3px; background: rgb(255 255 255 / 0.08); }
  .termo i::after {
    content: ''; position: absolute; inset: 0 auto 0 0; width: calc(var(--p) * 100%); min-width: 3px;
    background: linear-gradient(to right, #6e1206, #ff5a1f 60%, #ffd08a); box-shadow: 0 0 6px #ff5a1f;
  }
  .termo span { font-size: 0.75rem; color: var(--ceniza); text-align: right; }
  .monedas { display: flex; gap: 1.5rem; margin-left: auto; }
  .brasas { display: grid; justify-items: end; }
  .vidrio .num { color: #ffd59a; }
  .brasas .num { font-size: 1.5rem; font-weight: 600; color: var(--brasa); line-height: 1; }

  .escena { position: relative; display: grid; place-items: center; min-height: 0; min-width: 0; container-type: size; }
  .circulo { position: relative; width: min(100cqw, 100cqh); aspect-ratio: 1; }
  .circulo > * { position: absolute; inset: 0; }
  svg { width: 100%; height: 100%; overflow: visible; touch-action: none; }

  /* Fuego: capas HTML debajo de la piedra, recortadas al círculo de apertura. Solo transform y opacidad se animan. */
  .fuego {
    --d: calc(var(--a) * 100%);
    inset: auto; left: calc(50% - var(--d) / 2 - 1%); top: calc(50% - var(--d) / 2 - 1%); width: calc(var(--d) + 2%); aspect-ratio: 1;
    border-radius: 50%; overflow: hidden; background: radial-gradient(circle at 50% 75%, #3a0a04, #120302 70%);
  }
  .fuego canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
  /* El calor que se escapa de la piedra: un halo que respira despacio (cambia en segundos, nunca titila). */
  .halo {
    inset: -12%; border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--medio) 45%, transparent) calc(var(--a) * 40%), transparent 62%);
    opacity: calc(0.35 + var(--t) * 0.5); animation: respira 7s ease-in-out infinite alternate; will-change: opacity;
  }
  @keyframes respira { to { opacity: calc(0.55 + var(--t) * 0.45); } }

  /* Reducir destellos: el halo quieto (el fuego va más lento). Reducir movimiento o ahorro: nada se mueve. */
  .calma .halo { animation: none; }
  .quieto :is(.halo, .orbita) { animation: none; }

  /* El canal: un surco tallado con brasas en trozos (como granos), no una barra lisa. */
  .surco { fill: none; stroke: #0a0706; stroke-width: 6.5; }
  .arcos path { fill: none; stroke-width: 3.4; stroke-linecap: butt; stroke-dasharray: 2.6 0.9; transition: opacity 0.3s; }
  .arcos .brillo { stroke-width: 5; stroke-dasharray: none; }
  .origen { stroke: var(--ceniza); stroke-width: 0.8; opacity: 0.6; }
  .piedra-borde { fill: #0b0807; }
  .dovela { stroke: rgb(255 200 160 / 0.07); stroke-width: 0.5; }
  .cincel { stroke: #000; stroke-width: 0.5; opacity: 0.35; }
  .luz { mix-blend-mode: screen; pointer-events: none; }
  .arista { fill: none; stroke: rgb(255 210 170 / 0.12); stroke-width: 0.6; }
  .enchufe circle { fill: #120e0c; stroke: #3b302a; stroke-width: 0.8; }
  .enchufe path { fill: none; stroke: #4a3e36; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .enchufe.abierto circle { stroke: var(--c); stroke-opacity: 0.6; }
  .enchufe.abierto path { stroke: var(--c); }
  .hoja { fill: url(#mot-hoja); stroke: #0b0807; stroke-width: 1.2; }
  /* El filo de cada hoja recibe la luz del fuego: una línea nítida, la espiral del diafragma. */
  .filo { fill: none; stroke: #ff9d5c; stroke-width: 0.7; stroke-opacity: calc(0.45 + var(--t) * 0.4); stroke-dasharray: 0.32 1; } /* solo cerca del fuego */
  .resplandor { fill: none; stroke-width: 2.4; opacity: 0.75; pointer-events: none; }
  .aro-iris { fill: none; stroke: #0b0807; stroke-width: 1.6; }

  .manija { cursor: grab; outline: none; }
  .manija.activa { cursor: grabbing; }
  .toque { fill: transparent; }
  .perilla { fill: #1a1411; stroke: #ffd9b0; stroke-width: 1.1; }
  .punto { fill: #ffd9b0; }
  .manija:hover .perilla, .manija:focus-visible .perilla, .manija.activa .perilla { stroke: #fff; fill: #3a2a20; }
  .manija:focus-visible .toque { stroke: #ffd9b0; stroke-width: 0.8; stroke-dasharray: 2 2; }

  /* Las Brasas giran alrededor del canal, lentísimo: una sola capa que rota. */
  .orbita { pointer-events: none; animation: gira 140s linear infinite; will-change: transform; }
  .orbita i { position: absolute; inset: calc(3.8% + (var(--r) - 0.93) * 30%); transform: rotate(var(--g)); } /* radio ~96 de 104 */
  .orbita i::after {
    content: ''; position: absolute; left: 50%; top: 0; width: calc(var(--z) * 1.9%); aspect-ratio: 1; translate: -50% -50%; border-radius: 50%;
    background: radial-gradient(circle, #fff0c8, #ff7a2e 42%, transparent 70%);
  }
  .orbita i.gota::after { border-radius: 50% 50% 50% 0; rotate: -45deg; background: radial-gradient(circle at 40% 40%, #fffbe8, #ffc46b 45%, rgb(255 160 60 / 0.3) 70%, transparent 72%); }
  .orbita { inset: 0; }
  @keyframes gira { to { transform: rotate(360deg); } }

  /* El reparto: sin tarjeta. Una columna de piedra a la derecha, filas separadas por una línea fina. */
  .reparto { display: grid; align-content: center; gap: 0.75rem; min-height: 0; }
  .reparto header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  h2 { margin: 0; font-size: 1.0625rem; font-weight: 600; }
  .guardados { display: flex; gap: 0.25rem; }
  .guardados button {
    display: grid; justify-items: center; gap: 0.2rem; min-width: 2.75rem; min-height: 2.75rem; padding: 0.3rem; border: 1px solid transparent;
    background: none; color: var(--ceniza); font: inherit; font-size: 0.6875rem; cursor: pointer;
  }
  .guardados i { display: block; width: 1.25rem; height: 1.25rem; border-radius: 50%; -webkit-mask: radial-gradient(circle, transparent 42%, #000 45%); mask: radial-gradient(circle, transparent 42%, #000 45%); opacity: 0.55; }
  .guardados [aria-checked='true'] { border-color: rgb(255 138 61 / 0.45); color: #ffd9b0; background: rgb(255 120 40 / 0.07); }
  .guardados [aria-checked='true'] i { opacity: 1; }
  .guardados button:focus-visible { outline: 2px solid #ffd9b0; outline-offset: 1px; }
  ul { display: grid; margin: 0; padding: 0; list-style: none; }
  li {
    display: grid; grid-template-columns: 1.25rem minmax(0, 1fr) auto; grid-template-areas: 'i n c' 'i e e'; align-items: center; gap: 0.15rem 0.75rem;
    padding: 0.65rem 0; border-top: 1px solid rgb(255 220 190 / 0.09);
  }
  li:last-child { border-bottom: 1px solid rgb(255 220 190 / 0.09); }
  li svg { grid-area: i; width: 1.25rem; height: 1.25rem; fill: none; stroke: var(--c); stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
  .nombre { grid-area: n; font-weight: 600; }
  .efecto { grid-area: e; font-size: 0.8125rem; color: var(--c); }
  .ctl { grid-area: c; display: flex; align-items: center; }
  .paso {
    width: 2.75rem; height: 2.75rem; border: 0; background: none; color: var(--ceniza); font: inherit; font-size: 1.25rem; cursor: pointer;
  }
  .paso:hover:not(:disabled) { color: #fff; }
  .paso:disabled { opacity: 0.3; cursor: default; }
  .paso:focus-visible { outline: 2px solid #ffd9b0; outline-offset: -4px; }
  label { display: flex; align-items: baseline; gap: 0.1rem; border-bottom: 1px solid rgb(255 220 190 / 0.25); }
  label span { color: var(--ceniza); font-size: 0.8125rem; }
  input {
    width: 2.6rem; padding: 0.2rem 0; border: 0; background: none; color: #fff; font: inherit; font-size: 1.0625rem; font-weight: 600; text-align: right;
    -moz-appearance: textfield; appearance: textfield;
  }
  input::-webkit-inner-spin-button, input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input:focus-visible { outline: none; }
  label:focus-within { border-color: var(--c); }
  .iris { font-size: 0.8125rem; color: #ffb27a; }
  .que { font-size: 0.8125rem; line-height: 1.45; color: var(--ceniza); }

  @media (max-width: 1100px) { .motor { grid-template-columns: minmax(0, 1fr) 18rem; gap: 0.5rem 1.5rem; } }

  /* Vertical (celular): medidor arriba, el círculo en el medio, el reparto abajo, compacto. */
  @media (orientation: portrait) and (max-width: 1100px) {
    .motor { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr) auto; gap: 0.25rem; padding: 3.5rem 1rem calc(var(--nav) + 0.5rem); }
    .medidor { gap: 0.25rem 1rem; flex-wrap: nowrap; align-items: center; }
    .k { font-size: 2rem; }
    .dens { margin-top: 0.15rem; font-size: 0.75rem; }
    .termo { display: none; }
    .brasas .num { font-size: 1.25rem; }
    .monedas { gap: 0.9rem; }
    .reparto { gap: 0.25rem; }
    h2 { font-size: 0.9375rem; }
    li { padding: 0.15rem 0; gap: 0 0.6rem; grid-template-columns: 1.1rem minmax(0, 1fr) auto; }
    .efecto { font-size: 0.75rem; margin-top: -0.4rem; padding-bottom: 0.25rem; }
    .que { display: none; }
    .iris { font-size: 0.75rem; }
  }
  @media (orientation: portrait) and (max-width: 1100px) and (max-height: 720px) {
    .motor { padding-top: 3.1rem; }
    .k { font-size: 1.625rem; }
    .rot { font-size: 0.6875rem; }
    .guardados button { min-height: 2.5rem; padding: 0.15rem 0.3rem; }
    .iris { display: none; }
  }
</style>
