<script lang="ts">
  // Pantalla "Cómo funciona" (Pantalla.svelte): una sección por sistema, abierta recién cuando el jugador llegó a él.
  // "Para curiosos" muestra la fórmula exacta de SPEC 4 con los valores actuales; todo sale de CFG y del núcleo.
  import Decimal from 'break_infinity.js'
  import {
    CFG, MUTACIONES, anillos, autoDisponible, caudal, cascadaC, costoCascada, costoCaudal, costoColor, costoMutacion, densidad,
    maxMutacion, multAnillos, multCascada, multColor, produccion, valor, type State,
    CFG1, ESTRATOS, NODOS, NIVEL_MAX_RED, cauceRel, cascadaRel, costoAbrir, cristalesAlInfinito, cristalesRedLog10, infinitoRoto, ordenesQ, espacios,
    gammaEstrato, memoria, mutacionesRel, nivelRed, presion, separacion,
    DEFECTOS, baseAnillo, colorSX, completo, hitoColor, metaLog10,
    puntoRuptura, aporteEscarcha, brilloEscarcha, crecimientoEscarcha, esquirlasAlRomper, efectoRed, umbralLog10,
  } from '../core'
  import { ALTURA_DE_COLOR, COLOR_CSS } from '../render/pilaVisual'
  import { txt } from '../strings'
  import { efecto } from './ayudas.svelte'
  import { nombre as nombreDef, recompensa, regla } from './defectos'
  import { formato, formatoMult } from './formato'
  import Histograma from './Histograma.svelte'
  import { historial, juego, nombreAuto } from './juego.svelte'
  import MiniPila from './MiniPila.svelte'
  import Pantalla from './Pantalla.svelte'

  interface Formula { r: string; g: string; v: string }
  interface Seccion { id: string; abierta: boolean; color: string; titulo: string; texto: string[]; f: Formula[] }

  const g = txt.guia
  const V = g.v
  const d = (x: number, dec = 3) => x.toLocaleString(txt.locale, { maximumFractionDigits: dec })
  /** Costo 10^(c0 + g·n + s·n²/2), escrito con los valores del nivel actual. */
  function curva(c: { c0: number; g: number; s?: number }, n: number, costo: Decimal): Formula {
    const s2 = (c.s ?? 0) / 2
    const cuad = (x: string) => (s2 ? ` + ${d(s2)}·${x}²` : '')
    const e = c.c0 + c.g * n + s2 * n * n
    return {
      r: g.rotulo.costo,
      g: `10^(${d(c.c0)} + ${d(c.g)}·${V.nivel}${cuad(V.nivel)})`,
      v: `= 10^(${d(c.c0)} + ${d(c.g)}·${n}${cuad(String(n))}) = 10^${d(e)} = ${formato(costo)}`,
    }
  }

  function secciones(s: State): Seccion[] {
    const v = juego.vistos
    const C = CFG.caudal, M = CFG.mutaciones, K = CFG.K_derrumbes_por_grano, H = CFG.hito_colores, A = CFG.anillos
    const G = formato(s.granos), D = densidad(s), a = anillos(s.granos), c = cascadaC(s)
    const meta = umbralLog10(s)
    const sec = (id: string, abierta: boolean, color: string, f: Formula[], texto = g.secciones[id][1]): Seccion =>
      ({ id, abierta, color, titulo: g.secciones[id][0], texto, f })

    return [
      sec('pila', true, 'var(--ambar)', [
        { r: g.rotulo.total, g: `T(N) ≈ ${d(K / 2, 4)} · N²`, v: `→ dT/dN ≈ ${d(K)} · G` },
        { r: g.rotulo.derrumbes, g: `${d(K)} × G`, v: `= ${d(K)} × ${G} ${g.derrumbesUnidad(formato(K * s.granos))}` },
      ]),
      sec('caudal', !!v.tienda, 'var(--tinta)', [
        { r: g.rotulo.caudal, g: `F = ${d(C.granos_base)} × ${d(C.mult_por_nivel)}^${V.nivel} × ${d(M.caudal.por_nivel)}^${V.mut}`,
          v: `= ${d(C.granos_base)} × ${d(C.mult_por_nivel)}^${s.caudal} × ${d(M.caudal.por_nivel)}^${s.mutaciones.caudal} = ${txt.efectoCaudal(formato(caudal(s)))}` },
        curva(C, s.caudal, costoCaudal(s.caudal)),
        { r: g.rotulo.produccion, g: `${txt.energia}/s = F × (${d(K)} × G) × V^D`,
          v: `= ${formato(caudal(s))} × (${d(K)} × ${G}) × ${formatoMult(valor(s))}^${d(D)} = ${formato(produccion(s))}` },
      ]),
      ...CFG.colores.map((col, i) => {
        const n = s.colores[i], hitos = Math.floor(n / H.cada), hm = hitoColor(s) // Vacancia sube el hito
        return sec(`color${i}`, !!v[`color${i}`], COLOR_CSS[ALTURA_DE_COLOR[i]], [
          { r: g.rotulo.mult, g: `${d(col.mult_por_nivel)}^${V.nivel} × ${hm}^⌊${V.nivel} / ${H.cada}⌋`,
            v: `= ${d(col.mult_por_nivel)}^${n} × ${hm}^${hitos} = ×${formatoMult(multColor(i, n, hm))}` },
          curva({ ...col, s: col.s * colorSX(s) }, n, costoColor(i, n, colorSX(s))),
        ], g.colorTexto(txt.colores[i], txt.alturaColor[i], d(col.mult_por_nivel), H.cada, hm))
      }),
      sec('anillos', !!v.anillos, '#e8e9f3', [
        { r: g.rotulo.anillos, g: `G ≥ ${A.granos_primer_anillo} ? ⌊log₂(G / ${A.granos_primer_anillo})⌋ + 1 : 0`, v: `G = ${G} → ${a}` },
        { r: g.rotulo.multAnillos, g: `(${d(baseAnillo(s))} + ${d(M.expansion.por_nivel)} × ${V.expansion})^${V.anillos}`,
          v: `= (${d(baseAnillo(s))} + ${d(M.expansion.por_nivel)} × ${s.mutaciones.expansion})^${a} = ×${formatoMult(multAnillos(s))}` },
        { r: g.rotulo.proximoAnillo, g: `G = ${A.granos_primer_anillo} × 2^${V.anillos}`,
          v: `= ${A.granos_primer_anillo} × 2^${a} = ${g.granosUnidad(formato(A.granos_primer_anillo * 2 ** a))}` },
      ]),
      sec('compresion', !!v.compresion, 'var(--tinta)', [
        { r: g.rotulo.densidad, g: `D = 1 + ${d(CFG.compresion.densidad_por_nivel)} × ${V.comp}`,
          v: `= 1 + ${d(CFG.compresion.densidad_por_nivel)} × ${s.compresiones} = ${d(D)}` },
        { r: g.rotulo.meta, g: CFG.compresion.umbrales_log10.map((u) => `1e${u}`).join(' · '),
          v: meta === Infinity ? g.sinMetas : `${txt.compresion(s.compresiones + 1)}: 1e${Math.round(meta)}` },
      ]),
      sec('cascada', !!v.cascada, '#3cc8e8', [
        { r: g.rotulo.c, g: `c = ${d(CFG.cascada.c_por_nivel)} × ${V.nivel} + (${V.nivel} ≥ 1 ? ${d(M.cascada.por_nivel)} × ${V.mut} : 0)`,
          v: `= ${d(c)}` },
        { r: g.rotulo.mult, g: `G^(${d(CFG.cascada.exp_G)}·c) / 10^(${d(CFG.cascada.exp_penal)}·c)`,
          v: `= ${G}^(${d(CFG.cascada.exp_G)}·${d(c)}) / 10^(${d(CFG.cascada.exp_penal)}·${d(c)}) = ×${formatoMult(multCascada(s))}` },
        curva(CFG.cascada, s.cascada, costoCascada(s.cascada)),
      ]),
      sec('mutaciones', !!v.mutaciones, '#ff7ad9', MUTACIONES.map((m) => ({
        r: txt.mutaciones[m],
        g: `10^(${d(M[m].c0)} + ${d(M[m].g)}·${V.nivel})`,
        v: `${txt.nivel(s.mutaciones[m])} · ${efecto(s, `mut_${m}`)} · ${s.mutaciones[m] >= maxMutacion(s) ? txt.nivelMaximo : formato(costoMutacion(m, s.mutaciones[m]))}`,
      }))),
      sec('auto', !!v.auto_caudal, 'var(--tenue)', Object.entries(CFG.autocompradores).map(([k, n]) => ({
        r: k === 'compresion_auto' ? g.compresionAuto : nombreAuto(k),
        g: g.autoEn(n),
        v: autoDisponible(s, k) ? '✓' : '—',
      }))),
      ...(s.infinitos > 0 ? capa1(s) : []),
    ]
  }

  /** Correcciones, bloque 12: una sección por sistema de la Capa 1, con su fórmula (CFG1 y el núcleo). Defectos y Escarcha,
   * cerradas hasta sus hitos. */
  function capa1(s: State): Seccion[] {
    const v = juego.vistos, c1 = g.c1, R = CFG1.red, E = CFG1.estratos, RL = CFG1.relicario, EC = CFG1.escarcha
    const sec = (id: string, f: Formula[]): Seccion => ({ id, abierta: !!v[id], color: 'var(--hielo)', titulo: g.secciones[id][0], texto: g.secciones[id][1], f })
    const mult = cristalesRedLog10(s), D = densidad(s), P = presion(s)
    const ids = Object.keys(NODOS), completos = ids.filter((id) => nivelRed(s, id) >= NIVEL_MAX_RED).length
    const costoAnillo = (a: number) => `10^(${d(R.costo_anillo_log10[a])} + ${d(R.paso_nivel_log10[a])}·L)`
    const nMem = memoria(s), mem = txt.cristal.red.nodos.memoria
    const memX = Object.fromEntries(Object.entries(NODOS.memoria).flatMap(([k, x]) => (k !== 'pos' && Array.isArray(x) ? [[k, x[nMem - 1]]] : [])))
    const g1 = gammaEstrato(s, 0, Math.log10(Math.max(1, caudal(s))))
    const tipos = txt.cristal.relicario.tipos
    return [
      sec('c1_cristales', [
        { r: g.rotulo.cristales, g: `⌊10^(mult + ${d(CFG1.cristales.base_log10)})⌋`,
          v: s.infinitos === 0 ? `= ${CFG1.cristales.primer_infinito}` : `= ⌊10^(${d(mult)} + ${d(CFG1.cristales.base_log10)})⌋ = ${formato(cristalesAlInfinito(s))}` },
        { r: g.rotulo.multRed, g: c1.multRed, v: `= ${d(mult)}` },
        { r: g.rotulo.totales, g: formato(s.cristalesTotales), v: '' },
      ]),
      sec('c1_romper', [
        { r: g.rotulo.roto, g: `lc = mult + ${d(CFG1.cristales.base_log10)} + (log₁₀E − ${d(CFG.infinito_log10)}) / Q · Q = ${CFG1.cristales.Q_ordenes_por_x10} − ${txt.cristal.red.nodos.ruptura2[0]}`,
          v: infinitoRoto(s) ? `Q = ${d(ordenesQ(s))} · lc = ${d(cristalesAlInfinito(s).log10())} → ${formato(cristalesAlInfinito(s))}` : '' },
        { r: g.rotulo.blando, g: `lc > ${CFG1.cristales.blando_desde_log10} → ${CFG1.cristales.blando_desde_log10} + (lc − ${CFG1.cristales.blando_desde_log10}) × ${d(CFG1.cristales.blando_factor)}`, v: '' },
        { r: g.rotulo.softcap, g: `10^(exp(n) + n − n₁ₑ₃₀₈)`, v: '' },
      ]),
      sec('c1_red', [
        { r: g.rotulo.anillo, g: '|x| + |y|', v: R.costo_anillo_log10.slice(0, 3).map((_, a) => c1.anillo(a, costoAnillo(a))).join(' · ') },
        { r: g.rotulo.costoRed, g: c1.costoRed, v: '' },
        { r: g.rotulo.abre, g: c1.abre, v: '' },
        { r: g.rotulo.completos, g: `nv = ${NIVEL_MAX_RED}`, v: c1.completos(completos, ids.length) },
      ]),
      sec('c1_relicario', [
        { r: `${g.rotulo.efectoRel} · ${tipos.cauce[0]}`, g: c1.cauce(d(RL.cauce_colores_pct_por_nivel, 4)), v: tipos.cauce[1](cauceRel(s)) },
        { r: `${g.rotulo.efectoRel} · ${tipos.cascada[0]}`, g: `c + ${d(RL.cascada_c_por_nivel, 4)} × (n + 1)`, v: tipos.cascada[1](cascadaRel(s)) },
        { r: `${g.rotulo.efectoRel} · ${tipos.mutaciones[0]}`, g: `^(1 + ${d(RL.mutaciones_efecto_por_nivel, 4)} × (n + 1))`, v: tipos.mutaciones[1](mutacionesRel(s)) },
        { r: g.rotulo.fusion, g: c1.fusion, v: '' },
        { r: g.rotulo.engarces, g: c1.engarces(espacios(s)), v: '' },
        ...(s.escarcha.abierta ? [{ r: g.rotulo.pulido, g: `10^round(${d(EC.pulido.c0)} + ${d(EC.pulido.paso)} × n × pulido_x)`, v: `pulido_x = ${d(efectoRed(s, 'engarces2', 'pulido_x', 1))}` }] : []),
      ]),
      sec('c1_estratos', [
        { r: g.rotulo.presion, g: c1.presion(d(E.w_base_por_profundidad), d(E.presion.suma_w)),
          v: `= ${d(P)} → ×10^(${d(P)} × ${d(D)}) = ×${formato(Decimal.pow10(P * D))}` },
        { r: g.rotulo.velocidad, g: c1.gamma(d(E.gamma_log10_por_s, 5), d(E.permeabilidad.suma_gamma), d(E.empuje_por_estrato_inferior)),
          v: s.estratos.abiertos ? `= ${d(g1, 6)} → ${c1.porMinuto(formatoMult(10 ** (g1 * 60)))}` : '' },
        { r: g.rotulo.abrir, g: `s₁ = ${d(E.s1_inicial)} · s_k = s_(k−1) − ${d(separacion(s))}`,
          v: s.estratos.abiertos < ESTRATOS ? c1.proximo(s.estratos.abiertos + 1, formato(costoAbrir(s))) : c1.todos },
      ]),
      sec('c1_automat', [
        { r: g.rotulo.intervalo, g: c1.intervalo(CFG.automatizacion.intervalo_s), v: '' },
        { r: g.rotulo.memoria, g: `nv ${nMem} / ${NIVEL_MAX_RED}`, v: nMem ? mem[2](memX, nMem) : '—' },
        { r: g.rotulo.infinitoAuto, g: c1.espera, v: nMem >= NIVEL_MAX_RED ? '✓' : '—' },
      ]),
      // §8: una fila por Defecto: regla → recompensa, y la meta.
      sec('c1_defectos', DEFECTOS.map((id) => ({
        r: nombreDef(id), g: `${regla(id)} → ${recompensa(id)}`, v: `${txt.cristal.defectos.meta(metaLog10(id))}${completo(s, id) ? ' ✓' : ''}`,
      }))),
      sec('c1_escarcha', [
        { r: g.rotulo.gEsc, g: c1.gEsc(d(EC.g_log10_por_s, 4), d(EC.g_por_presion, 4)), v: s.escarcha.abierta ? `= ${d(crecimientoEscarcha(s), 5)}` : '' },
        { r: g.rotulo.aporteEsc, g: c1.aporteEsc, v: s.escarcha.abierta ? `m = ${d(brilloEscarcha(s))} → +${d(aporteEscarcha(s))}` : '' },
        { r: g.rotulo.frenoEsc, g: c1.frenoEsc(d(EC.punto_ruptura)), v: s.escarcha.abierta ? `P = ${d(puntoRuptura(s))}` : '' },
        { r: g.rotulo.romperEsc, g: c1.romperEsc(EC.esquirlas_por_ruptura_div, d(EC.logX_tras_romper)), v: s.escarcha.abierta ? txt.cristal.cuantasEsquirlas(String(esquirlasAlRomper(s))) : '' },
      ]),
    ]
  }

  const lista = $derived(secciones(juego.s))
  const avalanchas = $derived.by(() => (void juego.verHistorial, historial.avalanchas.slice()))
  const ir = (id: string) => document.getElementById(`cf-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
</script>

{#snippet candado()}
  <svg class="candado" width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><rect x="1.5" y="6" width="9" height="7" rx="1" /><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" /></svg>
{/snippet}

{#snippet formulas(f: Formula[])}
  <details class="curiosos">
    <summary>{g.curiosos}</summary>
    <dl>
      {#each f as x (x.r)}
        <dt>{x.r}</dt>
        <dd><code>{x.g}</code>{#if x.v}<code class="valor num">{x.v}</code>{/if}</dd>
      {/each}
    </dl>
  </details>
{/snippet}

{#if juego.panel === 'ayuda'}
  <Pantalla titulo={g.titulo} pestanas={[{ id: 'como', texto: g.titulo }]}>
    <div class="contenido">
      <nav class="indice" aria-label={g.titulo}>
        {#each lista as x (x.id)}
          <button class:bloqueada={!x.abierta} style:--c={x.color} onclick={() => ir(x.id)}>
            <span class="punto"></span>{x.abierta ? x.titulo : txt.secreto}{#if !x.abierta}{@render candado()}{/if}
          </button>
        {/each}
      </nav>

      <div class="secciones">
        {#each lista as x (x.id)}
          <section id="cf-{x.id}" class="seccion" class:bloqueada={!x.abierta} style:--c={x.color} aria-labelledby="cf-t-{x.id}">
            <h2 id="cf-t-{x.id}"><span class="punto"></span>{x.abierta ? x.titulo : txt.secreto}{#if !x.abierta}{@render candado()}{/if}</h2>
            {#if !x.abierta}
              <p class="texto">{g.bloqueada}</p>
            {:else}
              {#each x.texto as p}<p class="texto">{p}</p>{/each}
              {#if x.f.length}{@render formulas(x.f)}{/if}
              {#if x.id === 'pila'}
                <h3>{g.derrumbesTitulo(d(CFG.K_derrumbes_por_grano))}</h3>
                <p class="texto">{g.derrumbesTexto}</p>
                <h3>{g.potenciasTitulo}</h3>
                <p class="texto">{g.potenciasTexto}</p>
                <p class="ley"><code>{g.potenciasFormula}</code></p>
                <Histograma {avalanchas} />
                <h3>{g.ordenTitulo}</h3>
                <p class="texto">{g.ordenTexto}</p>
                <h3>{g.mini.titulo}</h3>
                <p class="texto">{g.mini.ayuda}</p>
                <MiniPila />
              {/if}
            {/if}
          </section>
        {/each}
      </div>
    </div>
  </Pantalla>
{/if}

<style>
  .contenido {
    display: grid; grid-template-columns: 12rem minmax(0, 44rem); justify-content: center; gap: 3rem;
    width: 100%; padding: 0.5rem 2rem 4rem;
  }
  .indice { position: sticky; top: 1rem; align-self: start; display: grid; }
  .indice button {
    display: flex; align-items: center; gap: 0.625rem; min-height: 2.25rem; padding: 0; border: 0; background: none;
    color: var(--tenue); font: inherit; font-size: 0.9375rem; text-align: left; cursor: pointer; transition: color 0.15s;
  }
  .indice button:hover { color: var(--tinta); }
  .indice .bloqueada { color: var(--apagado); }
  .punto { flex: none; width: 0.5rem; height: 0.5rem; border-radius: 1px; background: var(--c); }
  .bloqueada .punto { background: none; border: 1px solid var(--apagado); }
  .candado { flex: none; margin-left: 0.25rem; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; }

  .seccion { padding: 2rem 0; border-top: 1px solid var(--borde); scroll-margin-top: 5rem; }
  .seccion:first-child { padding-top: 0.5rem; border-top: 0; }
  .seccion.bloqueada { opacity: 0.5; }
  h2 { display: flex; align-items: center; gap: 0.75rem; margin: 0 0 0.75rem; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; }
  h2 .punto { width: 0.625rem; height: 0.625rem; box-shadow: 0 0 0.75rem var(--c); }
  .bloqueada h2 .punto { box-shadow: none; }
  h3 { margin: 2.25rem 0 0.5rem; font-size: 1.0625rem; font-weight: 600; text-wrap: balance; }
  .texto { margin: 0 0 0.75rem; font-size: 1rem; line-height: 1.6; color: var(--tenue); text-wrap: pretty; }
  .bloqueada .texto { color: var(--apagado); }
  code { font-family: inherit; font-variant-numeric: tabular-nums; }
  .ley { margin: 0.25rem 0 1rem; color: var(--tinta); }

  /* "Para curiosos": la fórmula general y, debajo, la misma con tus números. */
  .curiosos { margin: 1rem 0 0; }
  .curiosos summary {
    display: inline-flex; align-items: center; gap: 0.5rem; min-height: 2.75rem; color: var(--c); font-size: 0.9375rem;
    font-weight: 600; cursor: pointer; list-style: none;
  }
  .curiosos summary::-webkit-details-marker { display: none; }
  .curiosos summary::before { content: ''; width: 0.375rem; height: 0.375rem; border: solid currentColor; border-width: 0 1.5px 1.5px 0; rotate: -45deg; transition: rotate 0.2s; }
  .curiosos[open] summary::before { rotate: 45deg; }
  .curiosos dl { display: grid; gap: 1rem; margin: 0.5rem 0 0; padding-left: 1rem; border-left: 1px solid color-mix(in srgb, var(--c) 40%, transparent); animation: fundido 0.25s ease-out; }
  .curiosos dt { font-size: 0.8125rem; color: var(--apagado); }
  .curiosos dd { display: grid; gap: 0.125rem; margin: 0.125rem 0 0; font-size: 0.9375rem; overflow-wrap: anywhere; }
  .curiosos .valor { color: var(--tenue); }
  @keyframes fundido { from { opacity: 0; } }

  @media (max-width: 767px) {
    .contenido { grid-template-columns: minmax(0, 1fr); gap: 0; padding: 0.25rem 1rem 3rem; }
    .indice { display: none; }
  }
</style>
