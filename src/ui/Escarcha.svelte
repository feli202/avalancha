<script lang="ts">
  // SPEC_CAPA1 §9: la pantalla de la Escarcha. A la izquierda la placa de hielo (nace de un hexágono y crece hacia afuera con
  // el espesor; al romperla se raja y salta en pedazos); a la derecha la ficha: espesor, lo que suma y lo que frena, Romper y las tres mejoras.
  import Decimal from 'break_infinity.js'
  import {
    CFG1, ESPERA_RUPTURA_S, MEJORAS_ESCARCHA, aguanteEscarcha, aporteEscarcha, autoActivo, brilloEscarcha, costoMejoraEscarcha,
    crecimientoEscarcha, densidad, escarchaActiva, esquirlasAlRomper, factoresCrecimiento, mejorarEscarcha, puedeMejorarEscarcha,
    puedeRomperEscarcha, romperEscarcha, type MejoraEscarcha, type State,
  } from '../core'
  import { txt } from '../strings'
  import { quieto } from './ajustes.svelte'
  import { ayuda, type Tip } from './ayudas.svelte'
  import { formato, formatoMult } from './formato'
  import { juego } from './juego.svelte'
  import * as sonido from './sonido'

  const t = txt.cristal.escarcha
  const M = CFG1.escarcha.mejoras
  const s = $derived(juego.s)
  const n2 = (x: number, d = 2) => x.toLocaleString(txt.locale, { maximumFractionDigits: d })
  const esq = (n: number) => txt.cristal.cuantasEsquirlas(formato(n))

  // ---------- números ----------
  const logX = $derived(s.escarcha.logX)
  const D = $derived(densidad(s))
  const vale = $derived(formato(Decimal.pow10(aporteEscarcha(s) * D)))
  const frena = $derived(formatoMult(1 + logX / aguanteEscarcha(s)))
  const factores = $derived(Object.entries(factoresCrecimiento(s)).filter(([k, x]) => k !== 'base' && Math.abs(x - 1) > 1e-9))
  const tipAporte = (): Tip => ({ titulo: t.aporte, que: t.aporteQue, hielo: true, desglose: t.aporteCuenta(n2(brilloEscarcha(juego.s)), n2(juego.s.escarcha.logX), n2(densidad(juego.s)), vale) })
  const tipFreno = (): Tip => ({ titulo: t.freno, que: t.frenoQue, hielo: true, desglose: t.frenoCuenta(n2(juego.s.escarcha.logX), n2(aguanteEscarcha(juego.s)), frena) })
  const tipCrece = (): Tip => ({
    titulo: t.crecimiento, que: t.crecimientoQue, hielo: true, ahora: t.porMinuto(n2(crecimientoEscarcha(juego.s) * 60, 3)),
    desglose: [`${t.factores.base} ${n2(CFG1.escarcha.g_log10_por_s * 60, 3)}/min`, ...factores.map(([k, x]) => `${t.factores[k]} ×${formatoMult(x)}`)].join(' · '),
  })
  /** Valor de la mejora en el nivel L (lo que se muestra antes → después). */
  const efectoEn = (k: MejoraEscarcha, L: number) =>
    k === 'crecimiento' ? formatoMult(M.crecimiento.x ** L) : k === 'brillo' ? n2(brilloEscarcha({ ...s, escarcha: { ...s.escarcha, mejoras: { ...s.escarcha.mejoras, brillo: L } } }))
      : n2(aguanteEscarcha({ ...s, escarcha: { ...s.escarcha, mejoras: { ...s.escarcha.mejoras, aguante: L } } }))
  const FORMULA: Record<MejoraEscarcha, string> = { crecimiento: formatoMult(M.crecimiento.x), brillo: n2(M.brillo.suma_m), aguante: formatoMult(M.aguante.x_H) }

  function hacer(n: State) {
    if (n === juego.s) return
    juego.s = n
    sonido.compra('other')
  }

  // ---------- la placa: hexágonos de lado R en anillos (coordenadas axiales, hexágonos con punta a los costados) ----------
  // Empieza como un solo hexágono (la semilla) y crece hacia afuera con el espesor, con el borde irregular de la escarcha.
  const ANILLOS = 6, R = 8.6
  const hash = (a: number, b: number) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x) }
  const hex = (cx: number, cy: number) =>
    'M' + Array.from({ length: 6 }, (_, i) => `${(cx + R * Math.cos((i * Math.PI) / 3)).toFixed(2)} ${(cy + R * Math.sin((i * Math.PI) / 3)).toFixed(2)}`).join('L') + 'Z'
  const CELDAS = (() => {
    const c: { d: string; anillo: number; umbral: number; dx: number; dy: number; giro: number }[] = []
    for (let q = -ANILLOS; q <= ANILLOS; q++)
      for (let r = Math.max(-ANILLOS, -q - ANILLOS); r <= Math.min(ANILLOS, -q + ANILLOS); r++) {
        const x = 1.5 * R * q, y = Math.sqrt(3) * R * (r + q / 2), anillo = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))
        const largo = Math.hypot(x, y) || 1, lejos = 22 + 30 * hash(q, r)
        // umbral: con qué alcance aparece; el ruido adelanta unos hexágonos a otros del mismo anillo
        c.push({ d: hex(x, y), anillo, umbral: anillo ? anillo - 0.45 + hash(r, q) * 0.9 : 0, dx: (x / largo) * lejos, dy: (y / largo) * lejos + 10, giro: (hash(q + 9, r) - 0.5) * 90 })
      }
    return c
  })()
  // Hasta qué anillo llegó: satura con el espesor en la escala del aguante base H (visual, no balance).
  const alcance = $derived(0.6 + (ANILLOS + 0.5) * (logX / (logX + CFG1.escarcha.H)))
  /** 0 = todavía no está, 1 = hexágono entero; en el medio está creciendo (el borde). */
  const crece = (c: (typeof CELDAS)[number], a: number) => Math.max(0, Math.min(1, (a - c.umbral) / 0.9))
  /** Cuanto más adentro del borde, más gruesa (más opaca). */
  const opacidad = (c: (typeof CELDAS)[number], a: number) => Math.min(0.68, 0.16 + 0.17 * Math.max(0, a - c.umbral))

  // Al romper: la placa se sacude, se raja desde el centro y una copia salta en pedazos; la de abajo ya quedó con la mitad.
  const GRIETAS = Array.from({ length: 7 }, (_, k) => {
    let x = 0, y = 0, d = 'M0 0'
    const ang = (k / 7) * 2 * Math.PI + hash(k, 3) * 0.6
    for (let j = 1; j <= 5; j++) {
      const a = ang + (hash(k, j) - 0.5) * 0.9, paso = 9 + 7 * hash(j, k)
      x += Math.cos(a) * paso; y += Math.sin(a) * paso; d += `L${x.toFixed(1)} ${y.toFixed(1)}`
    }
    return d
  })
  let rotura = $state<{ id: number; celdas: { i: number; g: number; op: number }[]; largo: number } | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  function romper() {
    const a = alcance
    const celdas = CELDAS.map((c, i) => ({ i, g: crece(c, a), op: opacidad(c, a) })).filter((x) => x.g > 0)
    const n = romperEscarcha(juego.s)
    if (n === juego.s) return
    hacer(n)
    rotura = { id: (rotura?.id ?? 0) + 1, celdas, largo: Math.min(1, a / ANILLOS) }
    clearTimeout(timer)
    timer = setTimeout(() => (rotura = null), 1600)
  }
  $effect(() => () => clearTimeout(timer))

  const falta = $derived(Math.max(0, ESPERA_RUPTURA_S - s.escarcha.reloj))
  const sola = $derived(autoActivo(s, 'escarcha'))
</script>

<section class="escarcha" aria-label={txt.cristal.pantallas.escarcha}>
  {#if !s.escarcha.abierta}
    <p>{t.cerrada}</p>
  {:else}
    <p class="total num">{escarchaActiva(s) ? t.total(n2(logX), vale, frena) : t.vidrio}</p>
    <div class="vista">
      <div class="escena" role="img" aria-label={t.escena}>
        <svg viewBox="-100 -100 200 200" class:quieta={quieto()} class:sacude={!!rotura && !quieto()}>
          <defs>
            <linearGradient id="esc-hielo" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#f4fcff" /><stop offset="0.45" stop-color="#bfeaff" /><stop offset="1" stop-color="#5fb8d8" />
            </linearGradient>
          </defs>
          <g class="placa-hex">
            {#each CELDAS as c, i (i)}
              {@const g = crece(c, alcance)}
              <path d={c.d} class:borde={g > 0 && g < 1} style:--g={g} style:fill-opacity={opacidad(c, alcance)} style:visibility={g > 0 ? null : 'hidden'} />
            {/each}
          </g>
          {#if rotura}
            {#key rotura.id}
              <g class="grietas-rotura" style:--largo={rotura.largo}>
                {#each GRIETAS as d, k (k)}<path {d} pathLength="1" />{/each}
              </g>
              <g class="salta">
                {#each rotura.celdas as x (x.i)}
                  {@const c = CELDAS[x.i]}
                  <path d={c.d} style:--g={x.g} style:fill-opacity={x.op} style:--dx="{c.dx}px" style:--dy="{c.dy}px" style:--giro="{c.giro}deg" style:--demora="{180 + c.anillo * 45}ms" />
                {/each}
              </g>
            {/key}
          {/if}
        </svg>
      </div>
      <aside class="ficha placa grietas" aria-live="polite">
        <header>
          <h2>{txt.cristal.pantallas.escarcha}</h2>
          <span class="esq num">{esq(s.escarcha.esquirlas)}</span>
        </header>
        <dl class="num">
          <div use:ayuda={tipCrece}><dt>{t.espesor}</dt><dd>{n2(logX)}</dd><small>{t.porMinuto(n2(crecimientoEscarcha(s) * 60, 3))}</small></div>
          <div use:ayuda={tipAporte}><dt>{t.aporte}</dt><dd class="hielo">×{vale}</dd><small>+{n2(aporteEscarcha(s))}</small></div>
          <div use:ayuda={tipFreno}><dt>{t.freno}</dt><dd class="frena">÷{frena}</dd><small>H {n2(aguanteEscarcha(s))}</small></div>
        </dl>
        <div class="desglose num" use:ayuda={tipCrece}>
          <span>{t.crecimiento}</span>
          <ul>{#each factores as [k, x] (k)}<li>{t.factores[k]} <b>×{formatoMult(x)}</b></li>{/each}</ul>
        </div>
        <button class="romper gema" aria-disabled={!puedeRomperEscarcha(s)} onclick={romper}>
          <b>{t.romper}</b>
          <small class="num">{sola ? t.sola : puedeRomperEscarcha(s) ? t.romperDa(esq(esquirlasAlRomper(s))) : t.falta(txt.duracion(falta))}</small>
        </button>
        {#each MEJORAS_ESCARCHA as k (k)}
          {@const L = s.escarcha.mejoras[k]}
          <button class="mejora gema" aria-disabled={!puedeMejorarEscarcha(s, k)} onclick={() => hacer(mejorarEscarcha(juego.s, k))}>
            <b>{t.mejoras[k][0]}<span class="nv">{t.nv(L)}</span></b>
            <span class="costo num">{formato(costoMejoraEscarcha(s, k), true)}</span>
            <small class="num">{t.mejoras[k][1](efectoEn(k, L), efectoEn(k, L + 1))}</small>
            <small class="num formula">{t.mejoras[k][2](FORMULA[k])}</small>
          </button>
        {/each}
      </aside>
    </div>
    <p class="que">{t.que}</p>
  {/if}
</section>

<style>
  .escarcha { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; height: 100%; min-height: 0; justify-items: center; gap: 0.75rem; padding: 1.25rem 0 0; animation: entrar 0.3s ease-out; }
  @keyframes entrar { from { opacity: 0; } }
  p { max-width: 40rem; margin: 0; color: var(--tenue); text-align: center; text-wrap: balance; }
  .total { color: var(--hielo); font-size: 1.125rem; font-weight: 600; }
  .vista { display: grid; grid-template-columns: minmax(0, 1fr) 21rem; gap: 2rem; width: min(100%, 72rem); min-height: 0; }
  .escena { position: relative; min-height: 0; overflow: hidden; }
  /* la placa entra entera en su caja, del tamaño que sea (meet) */
  svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .placa-hex path, .salta path { fill: url(#esc-hielo); stroke: rgb(214 243 255 / 0.55); stroke-width: 0.6; transform-box: fill-box; transform-origin: center; }
  /* cada hexágono nace chico y se agranda a medida que el borde lo alcanza */
  .placa-hex path { transform: scale(var(--g)); transition: transform 1.2s ease-out, fill-opacity 0.8s; }
  /* el borde que está creciendo titila apenas, como hielo que se forma */
  .placa-hex path.borde { stroke: rgb(236 250 255 / 0.9); animation: formarse 2.4s ease-in-out infinite alternate; }
  @keyframes formarse { to { opacity: 0.35; } }
  /* Romper: sacudón, grietas blancas desde el centro y cada hexágono sale despedido, gira y se apaga (del centro hacia afuera). */
  .sacude { animation: sacudir 0.32s ease-out; }
  @keyframes sacudir { 20% { transform: translate(-1.6%, 0.8%); } 45% { transform: translate(1.4%, -1%); } 70% { transform: translate(-0.8%, 0.5%); } }
  .grietas-rotura path { fill: none; stroke: #fff; stroke-width: 1.1; stroke-linecap: round; stroke-dasharray: var(--largo) 1; stroke-dashoffset: var(--largo); filter: drop-shadow(0 0 2px #bfeaff); animation: rajar 0.18s ease-out forwards, apagar 0.5s 0.45s forwards; }
  @keyframes rajar { to { stroke-dashoffset: 0; } }
  .salta path { transform: scale(var(--g)); animation: saltar 1s var(--demora) cubic-bezier(0.2, 0.6, 0.35, 1) forwards; stroke: #fff; stroke-width: 0.9; }
  @keyframes saltar { to { transform: translate(var(--dx), var(--dy)) rotate(var(--giro)) scale(calc(var(--g) * 0.5)); opacity: 0; } }
  /* Reducir destellos: nada se mueve; los pedazos y las grietas solo se apagan. */
  .quieta .salta path, .quieta .grietas-rotura path { animation: apagar 0.6s forwards; }
  .quieta .placa-hex path.borde { animation: none; }
  @keyframes apagar { to { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .salta path, .grietas-rotura path { animation: apagar 0.6s forwards; }
    .sacude, .placa-hex path.borde { animation: none; }
  }

  /* Alto según lo que tiene; si no entra, scrollea solo la ficha. Los botones nunca se aplastan: las gemas tienen overflow
     oculto y, en una grilla con alto fijo, se achicaban por debajo de su contenido (los nombres quedaban amontonados). */
  .ficha { --f: 1rem; display: grid; align-content: start; gap: 0.7rem; align-self: center; max-height: 100%; overflow-y: auto; padding: 0.85rem 1.1rem 1.15rem; }
  .ficha > * { min-height: max-content; }
  header { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; background: linear-gradient(90deg, transparent, rgb(159 227 245 / 0.3), transparent) bottom / 100% 1px no-repeat; padding-bottom: 0.3rem; }
  h2 { margin: 0; font-size: 1.5rem; font-weight: 300; }
  .esq { color: var(--escarcha); font-weight: 600; }
  /* La Suma lleva la cifra más larga (×2,32e135): su columna es la más ancha. */
  dl { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 0.75fr); gap: 0.6rem; margin: 0; }
  dt { font-size: 0.75rem; color: var(--tenue); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  dd { margin: 0.125rem 0 0; font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  dd.hielo { color: var(--hielo); }
  dd.frena { color: var(--coral); }
  small { display: block; color: var(--apagado); font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .desglose { font-size: 0.75rem; color: var(--tenue); }
  .desglose ul { display: flex; flex-wrap: wrap; gap: 0.3rem; height: calc(2 * 1.45rem + 0.3rem); overflow: hidden; margin: 0.3rem 0 0; padding: 0; list-style: none; }
  .desglose li { height: 1.45rem; padding: 0.2rem 0.45rem; white-space: nowrap; background: rgb(159 227 245 / 0.06); clip-path: polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%); }
  .desglose b { font-weight: 600; color: var(--escarcha); }

  .romper { --b: 1.1rem; display: grid; gap: 0.2rem; min-height: 3.5rem; padding-block: 0.65rem; font-size: 1rem; }
  .romper small { color: var(--hielo); }
  .romper[aria-disabled='true'] small { color: var(--apagado); }
  /* nombre y nivel | costo; debajo, el efecto y la fórmula */
  .mejora { --b: 1rem; display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 0.7rem; row-gap: 0.2rem; padding: 0.6rem 1.4rem; font-size: 0.9375rem; line-height: 1.25; text-align: left; }
  .mejora b { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mejora .nv { margin-left: 0.3rem; font-size: 0.8125rem; font-weight: 400; color: var(--tenue); }
  .mejora .costo { font-weight: 600; color: var(--hielo); white-space: nowrap; }
  .mejora small { grid-column: 1 / span 2; }
  .mejora[aria-disabled='true'] .costo { color: var(--apagado); }

  @media (max-height: 800px) and (min-width: 761px) {
    .escarcha { gap: 0.5rem; padding-top: 0.75rem; }
    .total { font-size: 1rem; }
    .que { display: none; } /* está en "Cómo funciona" */
    .ficha { gap: 0.55rem; padding-block: 0.75rem 0.95rem; }
    .mejora { padding-block: 0.5rem; }
    .romper { min-height: 3.25rem; padding-block: 0.55rem; }
    .formula { display: none; } /* la fórmula está en "Cómo funciona" */
  }
  /* Móvil: la placa arriba, chica; la ficha debajo, sin las fórmulas (están en el tooltip y en "Cómo funciona"). */
  @media (max-width: 760px) {
    .escarcha { gap: 0.4rem; padding-top: 0.6rem; }
    .total { font-size: 0.8125rem; }
    .que { display: none; }
    .vista { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(5rem, 1fr) auto; gap: 0.4rem; }
    .ficha { gap: 0.45rem; padding: 0.5rem 0.8rem 0.75rem; }
    h2 { font-size: 1.125rem; }
    dd { font-size: 1rem; }
    dl small { font-size: 0.6875rem; }
    .formula { display: none; }
    .romper { min-height: 2.75rem; padding-block: 0.35rem; }
    .mejora { padding-block: 0.4rem; row-gap: 0.1rem; }
    .desglose { display: none; } /* los factores están en el tooltip del Espesor */
  }
</style>
