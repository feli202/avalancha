<script lang="ts">
  // Correcciones Capa 1, bloque 10: el panel de Automatización. Organizado como los autocompradores de Antimatter Dimensions
  // (una fila por autocomprador con su interruptor y sus ajustes; los reinicios aparte). Estética neutra, como la barra de
  // capas (es de todo el juego); cada fila lleva el detalle de lo que automatiza: los de la Arena su color y su ícono, el
  // Infinito y sus reliquias el hielo de la Cristalización.
  // Aparecen los que el jugador tiene, más el siguiente como silueta. Pantalla fija: solo scrollea cada lista.
  import { flip } from 'svelte/animate'
  import {
    AUTOS, CFG, CFG1, COMPRAS_AUTO, MODOS, autoDisponible, esquirlasAlRomper, cristalesAlInfinito, encenderTodo, fusionAutomatica, infinitoRoto,
    type Automat, type Cantidad, type Regla,
  } from '../core'
  import { txt } from '../strings'
  import IconoTipo from './IconoTipo.svelte'
  import { formato } from './formato'
  import { juego, nombreAuto } from './juego.svelte'

  const a = txt.automat
  const rr = txt.cristal.relicario
  const s = $derived(juego.s)
  const CANTIDADES: Cantidad[] = [1, 10, 0]
  const MAX_S = 3600 // tope de los campos de segundos: cosmético, la economía acepta cualquiera
  const COLOR: Record<string, string> = {
    caudal: 'var(--tinta)', ambar: 'var(--ambar)', coral: 'var(--coral)', jade: 'var(--jade)', violeta: 'var(--violeta)',
    cascada: 'var(--ambar)', mutaciones: 'var(--ambar)', compresion_auto: 'var(--tinta)', infinito: 'var(--hielo)', escarcha: 'var(--hielo)',
  }

  /** Lo que se ve: lo que tiene y el primero que todavía no (silueta). */
  const tiene = $derived(new Set(AUTOS.filter((k) => autoDisponible(s, k))))
  const sig = $derived(AUTOS.find((k) => !tiene.has(k)))
  const compras = $derived(COMPRAS_AUTO.filter((k) => tiene.has(k) || k === sig))
  // Romper la Escarcha (SPEC_CAPA1 §9): se ve desde que se abre la Escarcha; se activa con Deshielo.
  const reinicios = $derived(['compresion_auto', 'infinito', 'escarcha'].filter((k) => tiene.has(k) || (k === 'escarcha' ? s.escarcha.abierta : k === sig)))
  const POR_MEMORIA: Record<string, number> = { cascada: 2, mutaciones: 3, infinito: 4 }
  const desbloqueo = (k: string) => (k === 'escarcha' ? a.deshielo : k in POR_MEMORIA ? a.memoria(POR_MEMORIA[k]) : a.bloqueado(CFG.autocompradores[k]))

  const alternar = (k: string) => (juego.s = { ...juego.s, auto: { ...juego.s.auto, [k]: !juego.s.auto[k] } })
  const automat = (cambio: Partial<Automat>) => (juego.s = { ...juego.s, automat: { ...juego.s.automat, ...cambio } })
  const regla = (cambio: Partial<Regla>) => (juego.s = { ...juego.s, relicario: { ...juego.s.relicario, regla: { ...juego.s.relicario.regla, ...cambio } } })
  const subir = (i: number) => { const o = [...s.relicario.regla.orden]; [o[i - 1], o[i]] = [o[i], o[i - 1]]; regla({ orden: o }) }
  /** Un número de un campo: entero entre min y MAX_S; vacío o inválido, el mínimo. */
  const num = (e: Event, min: number) => Math.min(MAX_S, Math.max(min, Math.floor(Number((e.currentTarget as HTMLInputElement).value)) || min))
  const nombreTipo = (t: string) => rr.tipos[t]?.[0] ?? t
  // Celular: una lista a la vez, con pestañas (en escritorio van las dos columnas y esto no se usa).
  let vista = $state<'compras' | 'reinicios'>('compras')
</script>

{#snippet interruptor(k: string)}
  <button class="interruptor" role="switch" aria-checked={s.auto[k]} aria-label={a.interruptor(nombreAuto(k))} onclick={() => alternar(k)}>
    <span>{s.auto[k] ? txt.auto : txt.manual}</span>
  </button>
{/snippet}

{#snippet marca(k: string)}
  {#if k === 'cascada' || k === 'mutaciones'}<span class="ic"><IconoTipo tipo={k} /></span>
  {:else if k === 'escarcha'}<svg class="cristal" viewBox="-8 -8 16 16" aria-hidden="true"><path d="M0-7V7M-6-3.5 6 3.5M-6 3.5 6-3.5M0-7-1.5-5.5M0-7 1.5-5.5M0 7-1.5 5.5M0 7 1.5 5.5" /></svg>
  {:else if k === 'infinito'}<svg class="cristal" viewBox="-12 -12 24 24" aria-hidden="true"><path d="M0-11 5.5-6V6L0 11-5.5 6V-6ZM0-3.5V11M0-11-5.5-6 0-3.5 5.5-6" /></svg>
  {:else}<i class="muestra" aria-hidden="true"></i>{/if}
{/snippet}

<section class="automat" aria-labelledby="automat-titulo">
  <header class="cabeza">
    <h1 id="automat-titulo">{a.titulo}</h1>
    <div class="todos">
      <button onclick={() => (juego.s = encenderTodo(juego.s, true))}>{a.encender}</button>
      <button onclick={() => (juego.s = encenderTodo(juego.s, false))}>{a.apagar}</button>
    </div>
  </header>

  <div class="vistas" role="tablist" aria-label={a.titulo}>
    {#each ['compras', 'reinicios'] as const as v (v)}
      <button role="tab" aria-selected={vista === v} onclick={() => (vista = v)}>{a[v]}</button>
    {/each}
  </div>

  <div class="columnas">
    <section class="lista" class:oculta={vista !== 'compras'} aria-label={a.compras}>
      <h2>{a.compras}</h2>
      <ul>
        {#each compras as k (k)}
          {@const si = tiene.has(k)}
          <li class="fila" class:silueta={!si} class:apagado={si && !s.auto[k]} style:--c={COLOR[k]}>
            <div class="nombre">
              {@render marca(k)}
              <div><b>{nombreAuto(k)}</b>{#if !si}<small>{desbloqueo(k)}</small>{:else if a.que[k]}<small>{a.que[k]}</small>{/if}</div>
            </div>
            {#if si}
              <label class="campo">{a.cada}
                <input type="number" inputmode="numeric" min={CFG.automatizacion.intervalo_s} max={MAX_S} value={s.automat.intervalo[k]}
                  onchange={(e) => automat({ intervalo: { ...juego.s.automat.intervalo, [k]: num(e, CFG.automatizacion.intervalo_s) } })} />{a.seg}
              </label>
              <div class="cantidad" role="radiogroup" aria-label="{a.cantidad} · {nombreAuto(k)}">
                {#each CANTIDADES as c (c)}
                  <button role="radio" aria-checked={s.automat.cantidad[k] === c} onclick={() => automat({ cantidad: { ...juego.s.automat.cantidad, [k]: c } })}>{a.cantidades[c]}</button>
                {/each}
              </div>
              {@render interruptor(k)}
            {/if}
          </li>
        {/each}
      </ul>
    </section>

    <section class="lista" class:oculta={vista !== 'reinicios'} aria-label={a.reinicios}>
      <h2>{a.reinicios}</h2>
      <ul>
        {#each reinicios as k (k)}
          {@const si = tiene.has(k)}
          <li class="reinicio" class:hielo={k === 'infinito' || k === 'escarcha'} class:silueta={!si} class:apagado={si && !s.auto[k]} style:--c={COLOR[k]}>
            <div class="arriba">
              <b>{@render marca(k)}{nombreAuto(k)}</b>
              {#if si}{@render interruptor(k)}{:else}<small>{desbloqueo(k)}</small>{/if}
            </div>
            {#if si && k === 'compresion_auto'}
              <div class="modos" role="radiogroup" aria-label="{a.condicion} · {nombreAuto(k)}">
                {#each Object.keys(a.compresion) as m (m)}
                  <label><input type="radio" name="comp" checked={s.automat.compresion.modo === m} onchange={() => automat({ compresion: { ...juego.s.automat.compresion, modo: m as Automat['compresion']['modo'] } })} />{a.compresion[m]}</label>
                {/each}
              </div>
              {#if s.automat.compresion.modo === 'esperar'}
                <label class="campo">{a.esperar}
                  <input type="number" inputmode="numeric" min="0" max={MAX_S} value={s.automat.compresion.segundos}
                    onchange={(e) => automat({ compresion: { ...juego.s.automat.compresion, segundos: num(e, 0) } })} />{a.seg}
                </label>
              {/if}
            {:else if si && k === 'escarcha'}
              <small class="nota">{a.escarchaNota(CFG1.escarcha.ruptura_bot_min, txt.cristal.cuantasEsquirlas(String(esquirlasAlRomper(s))))}</small>
            {:else if si && k === 'infinito'}
              {@const inf = s.automat.infinito}
              <!-- Siempre apenas llega; Romper el Infinito lo mejora: en el óptimo (C6) o al dar X Cristales. -->
              {#if infinitoRoto(s)}
              <div class="modos" role="radiogroup" aria-label="{a.condicion} · {nombreAuto(k)}">
                {#each Object.keys(a.infinito) as m (m)}
                  <label><input type="radio" name="inf" checked={inf.modo === m} onchange={() => automat({ infinito: { ...juego.s.automat.infinito, modo: m as Automat['infinito']['modo'] } })} />{a.infinito[m]}</label>
                {/each}
              </div>
              {/if}
              {#if infinitoRoto(s) && inf.modo === 'cristales'}
                <label class="campo">{a.cristales}
                  <!-- Se guarda en log10 (CLAUDE.md): se escribe "1000" o "1e6". -->
                  <input type="text" inputmode="decimal" value={formato(10 ** inf.log10)}
                    onchange={(e) => { const x = Number(e.currentTarget.value.replace(',', '.')); automat({ infinito: { ...juego.s.automat.infinito, log10: x > 1 ? Math.log10(x) : 0 } }) }} />
                </label>
              {/if}
              <small class="nota">{#if !infinitoRoto(s)}{a.apenas} {/if}{a.daria(txt.cristal.ganados(formato(cristalesAlInfinito(s))).replace('+', ''))}.{#if !infinitoRoto(s)} {a.mejora}{:else if inf.modo === 'optimo'}{' '}{a.optimo}{/if}</small>

              <h3>{a.reliquia}</h3>
              <div class="modos" role="radiogroup" aria-label={rr.regla.titulo}>
                {#each MODOS as m (m)}
                  <label><input type="radio" name="regla" checked={s.relicario.regla.modo === m} onchange={() => regla({ modo: m })} />{rr.regla.modos[m]}</label>
                {/each}
              </div>
              {#if s.relicario.regla.modo === 'fijo' || s.relicario.regla.modo === 'prioridad'}
                <ol class="orden" aria-label={rr.regla.orden}>
                  {#each s.relicario.regla.orden as t, i (t)}
                    <li animate:flip={{ duration: 200 }}><span class="ic"><IconoTipo tipo={t} /></span>{nombreTipo(t)}{#if i}<button onclick={() => subir(i)} aria-label={rr.regla.subir(nombreTipo(t))}>↑</button>{/if}</li>
                  {/each}
                </ol>
              {/if}
              <label><input type="checkbox" checked={s.relicario.regla.fusionar} disabled={!fusionAutomatica(s)} onchange={(e) => regla({ fusionar: e.currentTarget.checked })} />{rr.regla.fusionar}</label>
              <label><input type="checkbox" checked={s.relicario.regla.equipar} onchange={(e) => regla({ equipar: e.currentTarget.checked })} />{rr.regla.equipar}</label>
              <small class="nota">{rr.regla.nota}</small>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  </div>
</section>

<style>
  /* Neutra, como la barra de capas y la Arena: fondo de la página, líneas de 1 px, sin cajas con relieve.
     El color de cada fila (--c) es el de lo que automatiza: la raya de la izquierda, el interruptor y lo elegido. */
  .automat { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 1.25rem; min-height: 0; height: 100%; }
  /* padding-right: el lugar de la fila de íconos de App.svelte (está en todas las capas). */
  .cabeza { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem 1.5rem; padding-right: 13rem; }
  h1 { margin: 0; font-size: clamp(1.75rem, 3.5vw, 2.5rem); font-weight: 300; letter-spacing: -0.02em; }
  .todos { display: flex; gap: 0.6rem; }
  .todos button {
    min-height: 2.75rem; padding: 0 1.25rem; border: 1px solid var(--borde); background: none; color: var(--tenue);
    font: inherit; font-size: 0.875rem; cursor: pointer; transition: color 0.15s, border-color 0.15s;
  }
  .todos button:hover, .todos button:focus-visible { color: var(--tinta); border-color: var(--tenue); }

  /* Escritorio: compras a la izquierda, reinicios a la derecha; cada columna scrollea sola si no entra. */
  .columnas { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 1.5rem; min-height: 0; }
  .lista { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 0.6rem; min-height: 0; }
  h2 { margin: 0; font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tenue); }
  ul { display: grid; align-content: start; gap: 0.5rem; margin: 0; padding: 0 0.4rem 0 0; list-style: none; overflow-y: auto; overscroll-behavior: contain; }

  .fila, .reinicio { border: 1px solid var(--borde); border-left: 2px solid var(--c); }
  .fila { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 0.5rem 1rem; padding: 0.5rem 0.9rem; }
  .nombre { display: flex; align-items: center; gap: 0.7rem; min-width: 0; }
  .nombre b, .arriba b { display: flex; align-items: center; gap: 0.6rem; font-weight: 600; color: var(--tinta); }
  .nombre small, .arriba small { display: block; font-size: 0.75rem; color: var(--tenue); line-height: 1.25; }
  .muestra { width: 0.6rem; height: 0.6rem; flex: none; background: var(--c); rotate: 45deg; }
  .ic { display: inline-grid; width: 1.25rem; height: 1.25rem; flex: none; color: var(--c); }
  .silueta { opacity: 0.45; filter: saturate(0); border-left-color: var(--borde); }
  .silueta b { color: var(--tenue); }
  .apagado { border-left-color: var(--borde); }

  .campo { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8125rem; color: var(--tenue); white-space: nowrap; }
  input[type='number'], input[type='text'] {
    width: 4.25rem; min-height: 2rem; padding: 0 0.5rem; border: 1px solid var(--borde); background: var(--fondo);
    color: var(--tinta); font: inherit; font-size: 0.875rem; font-variant-numeric: tabular-nums;
  }
  input[type='text'] { width: 7rem; }
  input:focus-visible { outline: 1px solid var(--c); }
  input[type='radio'], input[type='checkbox'] { accent-color: var(--c); }

  .cantidad { display: flex; border: 1px solid var(--borde); }
  .cantidad button { min-width: 2.6rem; min-height: 2rem; padding: 0 0.5rem; border: 0; background: none; color: var(--tenue); font: inherit; font-size: 0.8125rem; cursor: pointer; }
  .cantidad button + button { border-left: 1px solid var(--borde); }
  .cantidad [aria-checked='true'] { background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--tinta); font-weight: 600; }

  /* El interruptor: un riel con su punto y "auto" / "manual"; encendido, del color de lo que automatiza. */
  .interruptor {
    display: flex; align-items: center; gap: 0.45rem; min-width: 5.5rem; min-height: 2.75rem; padding: 0 0.25rem; border: 0; background: none;
    color: var(--apagado); font: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; cursor: pointer;
  }
  .interruptor::before {
    content: ''; width: 1.9rem; height: 1rem; flex: none; border: 1px solid currentColor; border-radius: 1rem;
    background: radial-gradient(circle at 0.5rem 50%, currentColor 0.3rem, transparent 0.32rem) no-repeat; transition: background-position 0.2s;
  }
  .interruptor[aria-checked='true'] { color: var(--c); }
  .interruptor[aria-checked='true']::before { background-position: 0.9rem 0; }

  .reinicio { display: grid; gap: 0.6rem; padding: 0.7rem 1rem 0.9rem; }
  .arriba { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .modos { display: flex; flex-wrap: wrap; gap: 0.35rem 1.1rem; }
  .reinicio label { display: flex; align-items: center; gap: 0.45rem; font-size: 0.875rem; color: var(--tenue); }
  h3 { margin: 0.4rem 0 0; padding-top: 0.7rem; border-top: 1px solid var(--borde); font-size: 0.875rem; font-weight: 600; color: var(--tinta); }
  .nota { font-size: 0.75rem; color: var(--apagado); }
  .orden { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; margin: 0; padding-left: 1.2rem; font-size: 0.875rem; }
  .orden li { display: flex; gap: 0.35rem; align-items: center; }
  .orden button { min-width: 2rem; min-height: 2rem; padding: 0 0.4rem; background: none; border: 1px solid var(--borde); color: var(--tinta); cursor: pointer; }

  /* El Infinito y sus reliquias, el detalle de la Cristalización: cristal de hielo, una luz fría arriba y líneas frías. */
  .cristal { width: 1.15rem; height: 1.15rem; flex: none; fill: rgb(159 227 245 / 0.18); stroke: var(--hielo); stroke-width: 1.3; stroke-linejoin: round; }
  .hielo { background: linear-gradient(170deg, rgb(159 227 245 / 0.07), transparent 40%); }
  .hielo h3 { border-color: rgb(159 227 245 / 0.2); color: var(--hielo); }

  .vistas { display: none; }
  /* Celular: una lista a la vez (pestañas Compras / Reinicios), que llena el alto y scrollea sola. Controles de 44 px. */
  @media (max-width: 760px) {
    .automat { grid-template-rows: auto auto minmax(0, 1fr); gap: 0.6rem; }
    .cabeza { padding-right: 0; gap: 0.5rem; }
    h1 { font-size: 1.5rem; }
    .todos { gap: 0.4rem; }
    .todos button { padding: 0 0.7rem; font-size: 0.8125rem; white-space: nowrap; }
    .vistas { display: flex; border-bottom: 1px solid var(--borde); }
    .vistas button {
      flex: 1; min-height: 2.75rem; border: 0; border-bottom: 2px solid transparent; margin-bottom: -1px; background: none;
      color: var(--apagado); font: inherit; font-size: 0.9375rem; font-weight: 600; cursor: pointer;
    }
    .vistas [aria-selected='true'] { color: var(--tinta); border-bottom-color: var(--tinta); }
    .columnas { grid-template-columns: 1fr; }
    .oculta { display: none; }
    .lista h2 { display: none; }
    .lista { grid-template-rows: minmax(0, 1fr); }
    input[type='number'], input[type='text'], .cantidad button, .orden button { min-height: 2.75rem; }
    .cantidad button { min-width: 2.75rem; }
    .orden button { min-width: 2.75rem; }
    .reinicio label { min-height: 2.75rem; }
    .fila { grid-template-columns: minmax(0, 1fr) auto; padding: 0.4rem 0.7rem; gap: 0.3rem 0.6rem; }
    .fila .interruptor { grid-column: 2; grid-row: 1; min-width: 0; }
    .fila .cantidad { justify-self: end; }
    .nombre small { display: none; }
  }
</style>
