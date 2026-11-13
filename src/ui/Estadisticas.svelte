<script lang="ts">
  // Pantalla de Estadísticas (Pantalla.svelte): Producción (el desglose de la Energía/s), Corridas, Avalanchas y General.
  // Todos los gráficos son SVG o divs dibujados acá, con la paleta del juego.
  import Decimal from 'break_infinity.js'
  import { produccion } from '../core'
  import { POR_DECADA } from '../guardado/historial'
  import { es } from '../strings/es'
  import { desglose } from './desglose'
  import { formato, formatoMult } from './formato'
  import { historial, juego } from './juego.svelte'
  import Pantalla from './Pantalla.svelte'

  const PESTANAS = ['produccion', 'corridas', 'avalanchas', 'general'] as const
  let activa = $state(0)
  const s = $derived(juego.s)

  // ---------- Producción ----------
  /** Color de cada factor: los cuatro colores del juego y, para el resto, tonos que no se confunden con ellos. */
  const COLOR: Record<string, string> = {
    caudal: '#6ea8ff', derrumbes: '#a3a8c8', ambar: 'var(--ambar)', coral: 'var(--coral)', jade: 'var(--jade)',
    violeta: 'var(--violeta)', anillos: '#e8e9f3', cascada: '#3cc8e8', mutaciones: '#ff7ad9', densidad: '#ffe36e',
  }
  const factores = $derived(desglose(s))
  const positivo = $derived(factores.reduce((a, f) => a + Math.max(0, f.log), 0) || 1)
  let resaltado = $state<string | null>(null)
  let abiertos = $state<Record<string, boolean>>({})
  const mult = (log: number) => `×${formatoMult(Decimal.pow10(log))}`
  const n = (x: number) => x.toLocaleString('es-AR', { maximumFractionDigits: 2 })

  // ---------- historial (se relee una vez por segundo) ----------
  const h = $derived.by(() => {
    void juego.verHistorial
    return { ...historial, corridas: historial.corridas.slice(), avalanchas: historial.avalanchas.slice(), serie: historial.serie.slice() }
  })

  // Corridas: de la más nueva a la más vieja.
  const corridas = $derived(h.corridas.map((c, i) => ({ ...c, numero: s.compresiones - h.corridas.length + i + 1 })).reverse())
  const masLarga = $derived(Math.max(1, ...corridas.map((c) => c.duracion)))
  const masRapida = $derived(corridas.length ? corridas.reduce((a, c) => (c.duracion < a.duracion ? c : a)) : null)

  // Avalanchas: histograma log-log y la recta de mínimos cuadrados (la ley de potencias).
  const AV = { w: 640, h: 280, izq: 44, abajo: 34, arriba: 12, der: 12 }
  const casillas = $derived(h.avalanchas.map((c, k) => ({ k, c })).filter((x) => x.c > 0))
  const xMax = $derived(Math.max(4, Math.ceil(h.avalanchas.length / POR_DECADA))) // décadas
  const yMax = $derived(Math.max(1, Math.ceil(Math.log10(Math.max(1, ...h.avalanchas)) + 0.2)))
  const ax = (dec: number) => AV.izq + (dec / xMax) * (AV.w - AV.izq - AV.der)
  const ay = (dec: number) => AV.h - AV.abajo - (dec / yMax) * (AV.h - AV.abajo - AV.arriba)
  const recta = $derived.by(() => {
    if (casillas.length < 3) return null
    const xs = casillas.map((p) => (p.k + 0.5) / POR_DECADA), ys = casillas.map((p) => Math.log10(p.c))
    const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length
    const m = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0)
    const x0 = xs[0], x1 = xs[xs.length - 1]
    return { m, x0, x1, y0: my + m * (x0 - mx), y1: my + m * (x1 - mx) }
  })
  const contadas = $derived(h.avalanchas.reduce((a, b) => a + b, 0))

  // General: la Energía de la partida (log10) en el tiempo.
  const EN = { w: 640, h: 240, izq: 52, abajo: 30, arriba: 12, der: 12 }
  // Desde la primera muestra (las partidas de antes del historial no tienen el principio).
  const t0 = $derived(h.serie[0]?.[0] ?? 0)
  const tMax = $derived(Math.max(t0 + 1, h.serie.at(-1)?.[0] ?? 1))
  const eMax = $derived.by(() => {
    const m = Math.max(1, ...h.serie.map((p) => p[1]))
    const paso = m > 100 ? 50 : m > 20 ? 10 : 5
    return { tope: Math.ceil(m / paso) * paso, paso }
  })
  const ex = (t: number) => EN.izq + ((t - t0) / (tMax - t0)) * (EN.w - EN.izq - EN.der)
  const ey = (e: number) => EN.h - EN.abajo - (e / eMax.tope) * (EN.h - EN.abajo - EN.arriba)
  const linea = $derived(h.serie.map(([t, e], i) => `${i ? 'L' : 'M'}${ex(t).toFixed(1)},${ey(e).toFixed(1)}`).join(''))
  const area = $derived(linea && `${linea}L${ex(h.serie.at(-1)![0]).toFixed(1)},${ey(0)}L${ex(h.serie[0][0]).toFixed(1)},${ey(0)}Z`)
  /** Reloj real para "desde que empezó la partida", releído una vez por segundo. */
  const ahoraMs = $derived.by(() => (void juego.verHistorial, Date.now()))
</script>

{#if juego.panel === 'estadisticas'}
  <Pantalla titulo={es.estadisticas.titulo} bind:activa pestanas={PESTANAS.map((id) => ({ id, texto: es.estadisticas.pestanas[id] }))}>
    <div class="contenido">
      {#if PESTANAS[activa] === 'produccion'}
        <section class="produccion">
          <div class="total">
            <p class="rotulo">{es.estadisticas.energiaPorSegundo}</p>
            <p class="cifra num">{formato(produccion(s))}</p>
            <p class="ayuda">{es.estadisticas.ayudaBarra}</p>
          </div>
          <div class="desglose">
            <div class="barra" aria-hidden="true">
              {#each factores as f (f.id)}
                {#if f.log > 0}
                  <span
                    role="presentation" class="segmento" class:apagado={resaltado && resaltado !== f.id}
                    style:flex-grow={f.log} style:background={COLOR[f.id]}
                    onpointerenter={() => (resaltado = f.id)} onpointerleave={() => (resaltado = null)}
                  ></span>
                {/if}
              {/each}
            </div>
            <ul class="factores">
              {#each factores as f (f.id)}
                <li class:resaltado={resaltado === f.id} onpointerenter={() => (resaltado = f.id)} onpointerleave={() => (resaltado = null)}>
                  <button class="fila" aria-expanded={!!abiertos[f.id]} aria-label={es.estadisticas.expandir(es.estadisticas.factores[f.id])}
                    onclick={() => (abiertos[f.id] = !abiertos[f.id])}>
                    <span class="punto" style:background={COLOR[f.id]}></span>
                    <span class="nombre">{es.estadisticas.factores[f.id]}</span>
                    <span class="parte num">{Math.round((Math.max(0, f.log) / positivo) * 100)} %</span>
                    <span class="valor num">{mult(f.log)}</span>
                    <svg class="flecha" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 2l3 3-3 3" /></svg>
                  </button>
                  {#if abiertos[f.id] && f.partes}
                    <ul class="partes">
                      {#each f.partes as p (p.id)}
                        <li><span>{es.estadisticas.partes[p.id](n(p.n ?? 0))}</span><span class="valor num">{mult(p.log)}</span></li>
                      {/each}
                    </ul>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        </section>

      {:else if PESTANAS[activa] === 'corridas'}
        <section class="seccion">
          {#if corridas.length}
            <p class="rotulo">{es.estadisticas.ultimas(corridas.length)}</p>
            <table class="tabla num">
              <thead>
                <tr><th>{es.estadisticas.numero}</th><th class="ancha">{es.estadisticas.duracion}</th><th>{es.estadisticas.energia}</th>
                  <th>{es.estadisticas.densidad}</th><th>{es.estadisticas.porMinuto}</th></tr>
              </thead>
              <tbody>
                {#each corridas as c, i (c.numero)}
                  {@const rapida = c === masRapida}
                  <tr class:rapida style:--i={i}>
                    <td>{c.numero}</td>
                    <td class="ancha">
                      <span class="dur">
                        <span class="raya" style:width="{(c.duracion / masLarga) * 100}%"></span>
                        <span>{es.duracion(c.duracion)}{#if rapida}<small> · {es.estadisticas.masRapida}</small>{/if}</span>
                      </span>
                    </td>
                    <td>{formato(Decimal.pow10(c.energia))}</td>
                    <td>^{formatoMult(c.densidad)}</td>
                    <td>{formato(Decimal.pow10(c.energia - Math.log10(Math.max(c.duracion, 1) / 60)))}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <p class="vacio">{es.estadisticas.sinCorridas}</p>
          {/if}
        </section>

      {:else if PESTANAS[activa] === 'avalanchas'}
        <section class="seccion">
          <p class="lema">{es.estadisticas.leyPotencias}</p>
          {#if casillas.length}
            <svg class="grafico" viewBox="0 0 {AV.w} {AV.h}" role="img" aria-label={es.estadisticas.leyPotencias}>
              {#each { length: yMax + 1 } as _, d}
                <line class="guia" x1={AV.izq} x2={AV.w - AV.der} y1={ay(d)} y2={ay(d)} />
                <text class="eje" x={AV.izq - 8} y={ay(d) + 4} text-anchor="end">{formato(10 ** d)}</text>
              {/each}
              {#each { length: xMax + 1 } as _, d}
                <text class="eje" class:par={d % 2 === 1} x={ax(d)} y={AV.h - AV.abajo + 18} text-anchor="middle">{formato(10 ** d)}</text>
              {/each}
              {#each casillas as p, i (p.k)}
                {@const x = ax(p.k / POR_DECADA)}
                {@const w = ax(1 / POR_DECADA) - ax(0)}
                <rect class="columna" style:--i={i} x={x + 1} y={ay(Math.log10(p.c) + 0.12)} width={w - 2}
                  height={ay(0) - ay(Math.log10(p.c) + 0.12)} />
              {/each}
              {#if recta}
                <line class="recta" x1={ax(recta.x0)} y1={ay(recta.y0)} x2={ax(recta.x1)} y2={ay(recta.y1)} />
                <text class="eje recta-t" x={ax(recta.x1)} y={ay(recta.y1) - 8} text-anchor="end">
                  {es.estadisticas.pendiente(n(recta.m))}
                </text>
              {/if}
              <text class="eje titulo-eje" x={AV.w - AV.der} y={AV.h - 2} text-anchor="end">{es.estadisticas.ejeTamano} →</text>
            </svg>
          {:else}
            <p class="vacio">{es.estadisticas.sinAvalanchas}</p>
          {/if}
          <dl class="cifras">
            <div><dt>{es.estadisticas.record}</dt><dd class="num">{formato(juego.record)}</dd></div>
            <div><dt>{es.estadisticas.mayorCorrida}</dt><dd class="num">{formato(h.mayorCorrida)}</dd></div>
            <div><dt>{es.estadisticas.contadas}</dt><dd class="num">{formato(contadas)}</dd></div>
            <div><dt>{es.estadisticas.derrumbesPila}</dt><dd class="num">{formato(h.derrumbesPila)}</dd></div>
          </dl>
        </section>

      {:else}
        <section class="seccion">
          <dl class="cifras">
            <div class="destacada"><dt>{es.estadisticas.tiempoTotal}</dt><dd class="num">{es.duracion(s.tiempoTotal)}</dd></div>
            <div><dt>{es.estadisticas.tiempoCorrida}</dt><dd class="num">{es.duracion(s.tiempoCorrida)}</dd></div>
            <div><dt>{es.estadisticas.partida}</dt><dd class="num">{es.duracion(Math.max(0, (ahoraMs - h.inicio) / 1000))}</dd></div>
            <div><dt>{es.estadisticas.mejorCorrida}</dt>
              <dd class="num">{s.mejorCorrida > 0 ? es.duracion(s.mejorCorrida) : es.estadisticas.ninguna}</dd></div>
            <div><dt>{es.estadisticas.compresiones}</dt><dd class="num">{s.compresiones}</dd></div>
            <div><dt>{es.estadisticas.granosTotales}</dt><dd class="num">{formato(s.granosTotales)}</dd></div>
            <div><dt>{es.estadisticas.derrumbesTotales}</dt><dd class="num">{formato(h.derrumbes)}</dd></div>
          </dl>
          <p class="rotulo">{es.estadisticas.graficoEnergia}</p>
          {#if h.serie.length > 1}
            <svg class="grafico" viewBox="0 0 {EN.w} {EN.h}" role="img" aria-label={es.estadisticas.graficoEnergia}>
              <defs>
                <linearGradient id="relleno" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stop-color="var(--ambar)" stop-opacity="0.28" />
                  <stop offset="1" stop-color="var(--ambar)" stop-opacity="0" />
                </linearGradient>
              </defs>
              {#each { length: eMax.tope / eMax.paso + 1 } as _, i}
                {@const e = i * eMax.paso}
                <line class="guia" x1={EN.izq} x2={EN.w - EN.der} y1={ey(e)} y2={ey(e)} />
                <text class="eje" x={EN.izq - 8} y={ey(e) + 4} text-anchor="end">{e ? `1e${e}` : '1'}</text>
              {/each}
              {#each [0, 0.5, 1] as f}
                {@const t = t0 + f * (tMax - t0)}
                <text class="eje" x={ex(t)} y={EN.h - 8} text-anchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}>
                  {es.duracion(t)}
                </text>
              {/each}
              <path class="area" d={area} fill="url(#relleno)" />
              <path class="linea" d={linea} pathLength="1" />
            </svg>
          {/if}
        </section>
      {/if}
    </div>
  </Pantalla>
{/if}

<style>
  .contenido { width: 100%; max-width: 64rem; margin: 0 auto; padding: 0.5rem 2rem 3rem; }
  .rotulo { margin: 0 0 0.5rem; font-size: 0.875rem; color: var(--tenue); }
  .vacio { margin: 2rem 0; color: var(--tenue); }

  /* Producción */
  .produccion { display: grid; gap: 1.5rem; }
  .total .cifra {
    margin: 0; font-size: clamp(2.5rem, 7vw, 4rem); font-weight: 600; line-height: 1; letter-spacing: -0.03em;
    text-shadow: 0 0 2rem color-mix(in srgb, var(--ambar) 30%, transparent);
  }
  .ayuda { margin: 0.5rem 0 0; font-size: 0.8125rem; color: var(--apagado); }
  .desglose { display: grid; grid-template-columns: 3rem 1fr; gap: 2rem; align-items: stretch; }
  .barra { display: flex; flex-direction: column; gap: 2px; min-height: 26rem; position: sticky; top: 6rem; max-height: calc(100dvh - 8rem); }
  .segmento { flex-basis: 0; min-height: 2px; border-radius: 2px; transition: flex-grow 0.6s ease-out, opacity 0.2s; cursor: default; }
  .segmento.apagado { opacity: 0.25; }
  .factores, .partes { list-style: none; margin: 0; padding: 0; }
  .factores > li { border-top: 1px solid var(--borde); transition: background 0.2s; }
  .factores > li.resaltado { background: rgb(255 255 255 / 0.035); }
  .fila {
    display: grid; grid-template-columns: 0.625rem 1fr auto 9rem 0.75rem; align-items: center; gap: 0.875rem; width: 100%;
    min-height: 3rem; padding: 0 0.5rem; border: 0; background: none; color: var(--tinta); font: inherit; font-size: 1rem;
    text-align: left; cursor: pointer;
  }
  .punto { width: 0.625rem; height: 0.625rem; border-radius: 50%; }
  .nombre { font-weight: 600; }
  .parte { font-size: 0.8125rem; color: var(--apagado); }
  .valor { text-align: right; }
  .flecha { fill: none; stroke: var(--apagado); stroke-width: 1.5; stroke-linecap: round; transition: transform 0.2s; }
  .fila[aria-expanded='true'] .flecha { transform: rotate(90deg); }
  .partes { padding: 0 0.5rem 0.75rem 2rem; animation: fundido 0.25s ease-out; }
  .partes li { display: flex; justify-content: space-between; gap: 1rem; padding: 0.25rem 1.625rem 0.25rem 0; font-size: 0.875rem; color: var(--tenue); }

  /* Corridas */
  .tabla { width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
  .tabla th { padding: 0 0.75rem 0.625rem; font-size: 0.8125rem; font-weight: 400; color: var(--tenue); text-align: right; }
  .tabla td { padding: 0.75rem; border-top: 1px solid var(--borde); text-align: right; white-space: nowrap; }
  .tabla th:first-child, .tabla td:first-child { text-align: left; padding-left: 0; color: var(--tenue); }
  .tabla .ancha { width: 40%; text-align: left; }
  .tabla tbody tr { animation: subir 0.4s calc(var(--i) * 0.04s) ease-out backwards; }
  .dur { position: relative; display: flex; align-items: center; min-height: 1.5rem; }
  .raya { position: absolute; left: 0; height: 100%; border-radius: 2px; background: rgb(232 233 243 / 0.07); transition: width 0.6s ease-out; }
  .dur > span:last-child { position: relative; padding-left: 0.5rem; }
  .rapida td { color: var(--ambar); }
  .rapida .raya { background: color-mix(in srgb, var(--ambar) 22%, transparent); box-shadow: 0 0 0.75rem color-mix(in srgb, var(--ambar) 25%, transparent); }
  .rapida small { font-size: 0.75rem; }

  /* Gráficos */
  .lema { margin: 0 0 1rem; font-size: 1.0625rem; text-wrap: balance; }
  .grafico { display: block; width: 100%; height: auto; margin: 0 0 2rem; overflow: visible; }
  .guia { stroke: var(--borde); stroke-width: 1; }
  .eje { fill: var(--apagado); font-size: 12px; font-variant-numeric: tabular-nums; }
  .columna { fill: var(--ambar); opacity: 0.85; transform-box: fill-box; transform-origin: bottom; animation: crecer 0.6s calc(var(--i) * 0.03s) cubic-bezier(0.2, 0.8, 0.2, 1) backwards; transition: y 0.6s, height 0.6s; }
  .recta { stroke: var(--tinta); stroke-width: 1.5; stroke-dasharray: 5 5; opacity: 0.7; }
  .recta-t { fill: var(--tenue); }
  .linea { fill: none; stroke: var(--ambar); stroke-width: 2; stroke-linejoin: round; stroke-dasharray: 1; animation: trazar 1.2s ease-out backwards; }
  .area { animation: fundido 1.2s 0.3s ease-out backwards; }
  @keyframes crecer { from { transform: scaleY(0); } }
  @keyframes trazar { from { stroke-dashoffset: 1; } }

  /* Cifras: sin cajas, jerarquía por tamaño (como el resto de la interfaz). */
  .cifras { display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); gap: 1.75rem 2rem; margin: 0 0 2.5rem; }
  .cifras div { display: grid; gap: 0.25rem; }
  .cifras .destacada { grid-column: 1 / -1; }
  .cifras dt { font-size: 0.875rem; color: var(--tenue); }
  .cifras dd { margin: 0; font-size: 1.75rem; font-weight: 600; letter-spacing: -0.02em; line-height: 1.1; }
  .cifras .destacada dd { font-size: clamp(2.5rem, 7vw, 3.5rem); letter-spacing: -0.03em; }

  @keyframes fundido { from { opacity: 0; } }
  @keyframes subir { from { opacity: 0; transform: translateY(6px); } }
  :global(.quieto) .columna, :global(.quieto) .linea, :global(.quieto) .tabla tbody tr { animation: none; }

  @media (max-width: 767px) {
    .contenido { padding: 0.25rem 1rem 2rem; }
    .desglose { grid-template-columns: 1.5rem 1fr; gap: 1rem; }
    .fila { grid-template-columns: 0.5rem 1fr auto 0.75rem; gap: 0.625rem; font-size: 0.9375rem; }
    .fila .parte { display: none; }
    .tabla { font-size: 0.8125rem; }
    .tabla td, .tabla th { padding-left: 0.375rem; padding-right: 0.375rem; }
    .tabla .ancha { width: auto; }
    .cifras { grid-template-columns: 1fr 1fr; gap: 1.25rem 1.5rem; }
    .cifras dd { font-size: 1.375rem; }
    .eje { font-size: 22px; } /* el SVG se achica a la mitad: que el texto siga legible */
    .par, .titulo-eje { display: none; } /* una década sí y una no, sin pisarse */
  }
</style>
