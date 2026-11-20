<script lang="ts">
  // Pantalla de Ajustes (Pantalla.svelte): Aspecto (paletas, efectos y marcos con su vista previa), Juego, Partida y Teclado.
  import { flushSync } from 'svelte'
  import { exportar, importar, type Partida } from '../guardado/guardado'
  import { marco } from '../render/marcos'
  import { ALTO, ANCHO, RADIO_ENTERA, imagen, miniPila } from '../render/miniPilas'
  import { COLORES_DALTONISMO, EFECTOS, FONDOS, MARCOS, PALETAS, css } from '../render/paletas'
  import { txt } from '../strings'
  import { AVISOS, ajustes, avisoActivo } from './ajustes.svelte'
  import { borrarPartida, guardarYa, juego, partidaActual, reemplazarPartida, tocarLogo } from './juego.svelte'
  import { SECRETOS, desbloqueados, elegido, logroDe, nombreLogro, type Cosmetico } from './logros'
  import Pantalla from './Pantalla.svelte'
  import { VERSION } from '../version.svelte'
  import { guardarImagen } from './foto.svelte'
  import { almacenLocal } from '../guardado/almacen'
  import { leerRespaldoPase, reemplazarConRespaldo, restaurarRespaldo } from '../guardado/pase'
  import { enApp, esMovil, instalar } from '../instalar.svelte'
  import { errores } from './errores'
  import { DISCORD } from '../comunidad'

  const PESTANAS = ['aspecto', 'juego', 'partida', 'teclado', 'creditos'] as const
  let activa = $state(0)
  /** Recarga para que todo (también lo armado al cargar) salga en el idioma nuevo; la partida se guarda en el pagehide. */
  function cambiarIdioma(i: string) {
    if (i === ajustes.idioma) return
    ajustes.idioma = i
    flushSync() // que el efecto de ajustes.svelte.ts guarde el idioma antes de recargar
    location.reload()
  }
  const enfocar = (el: HTMLElement) => el.focus()

  // ---------- Aspecto ----------
  const TODOS: Record<Cosmetico, string[]> = { paleta: Object.keys(PALETAS), efecto: EFECTOS, marco: MARCOS, fondo: FONDOS }
  const TIPOS = Object.keys(TODOS) as Cosmetico[]
  const libres = $derived(Object.fromEntries(TIPOS.map((t) => [t, desbloqueados(t, TODOS[t], juego.logros)])) as Record<Cosmetico, string[]>)
  const actual = $derived(Object.fromEntries(TIPOS.map((t) => [t, elegido(t, TODOS[t], ajustes[t], juego.logros)])) as Record<Cosmetico, string>)
  /** El logro que da un cosmético, como se lee en la tarjeta bloqueada: un secreto sin conseguir no dice su nombre. */
  const nombreBloqueo = (k: string) => (SECRETOS.includes(k) && !juego.logros[k] ? txt.logros.secretoOculto : nombreLogro(k))
  const elegir = (tipo: Cosmetico, id: string) => libres[tipo].includes(id) && (ajustes[tipo] = id)
  const coloresActuales = $derived(ajustes.daltonismo ? COLORES_DALTONISMO : PALETAS[actual.paleta])

  /** Vista previa de un marco: la pila llena con la paleta en uso y el marco alrededor. */
  function vistaMarco(canvas: HTMLCanvasElement, p: { id: string; paleta: string; colores: number[] }) {
    const L = 360
    canvas.width = canvas.height = L
    const g = canvas.getContext('2d')!
    const pintar = () => imagen(`paleta:${p.paleta}`).then((b) => {
      const r = L * 0.34, s = r / RADIO_ENTERA
      g.fillStyle = '#07080f'
      g.fillRect(0, 0, L, L)
      g.drawImage(b, L / 2 - (ANCHO / 2) * s, L / 2 - (ALTO / 2) * s, ANCHO * s, ALTO * s)
      marco(g, p.id, L / 2, r, css(p.colores[1]))
    }).catch(() => {}) // sin las fotos (sin red): sin vista previa
    pintar()
    return { update(n: typeof p) { p = n; pintar() } }
  }

  // ---------- Partida: guardar, exportar, importar y borrar, cada uno con su mensaje o su paso de confirmación ----------
  let guardadoOk = $state(false)
  let exportado = $state<{ texto: string; copiado: boolean } | null>(null)
  let importando = $state(false)
  let pegado = $state('')
  let importarMal = $state(false)
  let aImportar = $state.raw<Partida | null>(null)
  let borrar = $state(0) // 0, 1 o 2: doble confirmación
  let noSeEscribio = $state(false)
  /** I10: teclas de cosas que todavía no aparecieron (SPEC 5). */
  const TECLA_VISTO: Record<string, string> = { M: 'tienda', C: 'compresion', L: 'tienda', E: 'tienda', P: 'tienda', H: 'tienda' }
  // M6: la importada arranca ahora (si no, un texto de ayer simularía 24 h fuera de línea, una y otra vez).
  // La que había queda en el respaldo (se vuelve desde acá mismo).
  const reemplazar = (p: Partida) => (noSeEscribio = !reemplazarPartida((a) => reemplazarConRespaldo(a, p)))
  const respaldo = leerRespaldoPase(almacenLocal)
  let volver = $state(false)
  function volverAlRespaldo() {
    guardarYa() // que la copia de la actual sea de ahora
    noSeEscribio = !reemplazarPartida(restaurarRespaldo)
  }

  let reloj: ReturnType<typeof setTimeout>
  function guardarAhora() {
    guardadoOk = guardarYa()
    clearTimeout(reloj)
    reloj = setTimeout(() => (guardadoOk = false), 2500)
  }
  async function alExportar() {
    const texto = exportar(partidaActual())
    exportado = { texto, copiado: false }
    try {
      await navigator.clipboard.writeText(texto)
      exportado = { texto, copiado: true }
    } catch { /* sin permiso de portapapeles: queda el texto para copiar a mano */ }
  }
  // v1.0: "Reportar un problema": partida, versión y últimos errores, para pegar en el Discord.
  let reporte = $state<{ texto: string; copiado: boolean } | null>(null)
  async function alReportar() {
    const texto = [txt.opciones.reporteEncabezado(VERSION), navigator.userAgent, txt.opciones.reporteErrores + '\n' + (errores.join('\n') || '—'),
      txt.opciones.reportePartida + '\n' + exportar(partidaActual())].join('\n\n')
    reporte = { texto, copiado: false }
    try {
      await navigator.clipboard.writeText(texto)
      reporte = { texto, copiado: true }
    } catch { /* sin permiso: queda el texto */ }
  }
  function alImportar() {
    try {
      aImportar = importar(pegado)
      importarMal = false
    } catch {
      importarMal = true
    }
  }
</script>

{#snippet cosmeticos(tipo: Cosmetico, titulo: string, desc: string)}
  <section class="grupo">
    <header class="cabeza-grupo">
      <h3>{titulo}</h3>
      <span class="num cuenta">{txt.opciones.cuantos(libres[tipo].length, TODOS[tipo].length)}</span>
    </header>
    <p class="desc">{desc}</p>
    <div class="tarjetas" role="radiogroup" aria-label={titulo}>
      {#each TODOS[tipo] as id, i (id)}
        {@const libre = libres[tipo].includes(id)}
        {@const logro = logroDe(tipo, id)}
        <button
          class="tarjeta" class:libre data-tarjeta role="radio" aria-checked={actual[tipo] === id} aria-disabled={!libre}
          style:--i={i} onclick={() => elegir(tipo, id)}
        >
          {#if tipo === 'marco'}
            <canvas class="vista cuadrada" use:vistaMarco={{ id, paleta: actual.paleta, colores: coloresActuales }} aria-hidden="true"></canvas>
          {:else}
            <canvas class="vista" use:miniPila={{ clave: `${tipo}:${id}`, quieta: ajustes.reducirDestellos || tipo === 'paleta' || tipo === 'fondo' }} aria-hidden="true"></canvas>
          {/if}
          <span class="pie">
            <span class="nombre">
              {#if tipo === 'paleta'}<span class="muestras" aria-hidden="true">{#each PALETAS[id] as c}<i style:background={css(c)}></i>{/each}</span>{/if}
              {txt.cosmeticos[tipo][id]}
            </span>
            {#if actual[tipo] === id}<span class="en-uso">{txt.opciones.enUso}</span>
            {:else if !libre && logro}
              <span class="bloqueo">
                <svg width="10" height="12" viewBox="0 0 12 14" aria-hidden="true"><rect x="1.5" y="6" width="9" height="7" rx="1" /><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" /></svg>
                {txt.opciones.bloqueadoPor(nombreBloqueo(logro))}
              </span>
            {/if}
          </span>
        </button>
      {/each}
    </div>
  </section>
{/snippet}

{#if juego.panel === 'ajustes'}
  <Pantalla titulo={txt.menu.abrir} bind:activa pestanas={PESTANAS.map((id) => ({ id, texto: txt.opciones.pestanas[id] }))}>
    <div class="contenido">
      {#if PESTANAS[activa] === 'aspecto'}
        {#if ajustes.daltonismo}<p class="aviso">{txt.opciones.daltonismoManda}</p>{/if}
        {@render cosmeticos('paleta', txt.opciones.paleta, txt.opciones.paletaDesc)}
        {@render cosmeticos('efecto', txt.opciones.efecto, txt.opciones.efectoDesc)}
        {@render cosmeticos('marco', txt.opciones.marco, txt.opciones.marcoDesc)}
        {@render cosmeticos('fondo', txt.opciones.fondo, txt.opciones.fondoDesc)}
        <div class="foto">
          <button class="accion" onclick={guardarImagen}>{txt.opciones.foto}</button>
          <p class="desc">{txt.opciones.fotoDesc}</p>
        </div>

      {:else if PESTANAS[activa] === 'juego'}
        <section class="lista">
          <div class="fila">
            <span class="texto"><span id="idioma-t">{txt.opciones.idioma}</span><small>{txt.opciones.idiomaDesc}</small></span>
            <div class="segmentos" role="radiogroup" aria-labelledby="idioma-t">
              {#each Object.entries(txt.opciones.idiomas) as [i, nombre]}
                <button role="radio" lang={i} aria-checked={ajustes.idioma === i} onclick={() => cambiarIdioma(i)}>{nombre}</button>
              {/each}
            </div>
          </div>
          <div class="fila">
            <span class="texto"><span id="notacion-t">{txt.opciones.notacion}</span><small>{txt.opciones.notacionDesc}</small></span>
            <div class="segmentos" role="radiogroup" aria-labelledby="notacion-t">
              {#each ['cientifica', 'ingenieria'] as const as n}
                <button role="radio" aria-checked={ajustes.notacion === n} onclick={() => (ajustes.notacion = n)}>
                  {txt.opciones[n]}<small class="num">{txt.opciones.ejemplo[n]}</small>
                </button>
              {/each}
            </div>
          </div>
          <label class="fila">
            <span class="texto">{txt.opciones.volumen}<small>{txt.opciones.volumenDesc}</small></span>
            <input type="range" min="0" max="1" step="0.05" bind:value={ajustes.volumen} />
          </label>
          {#each Object.entries(txt.opciones.volumenes) as [k, [nombre, desc]]}
            <label class="fila sub">
              <span class="texto">{nombre}<small>{desc}</small></span>
              <input type="range" min="0" max="1" step="0.05" bind:value={ajustes[k as keyof typeof txt.opciones.volumenes]} />
            </label>
          {/each}
          <label class="fila">
            <span class="texto">{txt.reducirDestellos}<small>{txt.opciones.calmaDesc}</small></span>
            <input type="checkbox" bind:checked={ajustes.calma} />
          </label>
          <label class="fila">
            <span class="texto">{txt.opciones.movimiento}<small>{txt.opciones.reducirDesc}</small></span>
            <input type="checkbox" bind:checked={ajustes.reducirDestellos} />
          </label>
          <div class="fila">
            <span class="texto"><span id="fps-t">{txt.opciones.fps}</span><small>{txt.opciones.fpsDesc}</small></span>
            <div class="segmentos" role="radiogroup" aria-labelledby="fps-t">
              {#each [15, 30, 60, 0] as f}
                <button role="radio" aria-checked={ajustes.fps === f} onclick={() => (ajustes.fps = f)}>{f || txt.opciones.sinLimite}</button>
              {/each}
            </div>
          </div>
          <label class="fila">
            <span class="texto">{txt.opciones.ahorro}<small>{txt.opciones.ahorroDesc}</small></span>
            <input type="checkbox" bind:checked={ajustes.ahorro} />
          </label>
          <label class="fila">
            <span class="texto">{txt.opciones.daltonismo}<small>{txt.opciones.daltonismoDesc}</small></span>
            <input type="checkbox" bind:checked={ajustes.daltonismo} />
          </label>
          <details class="avisos">
            <summary class="fila">
              <span class="texto">{txt.opciones.avisos}<small>{txt.opciones.avisosDesc}</small></span>
              <span class="num cuenta">{AVISOS.filter(avisoActivo).length}/{AVISOS.length}</span>
            </summary>
            {#each AVISOS as k (k)}
              <label class="fila sub">
                <span class="texto">{txt.opciones.tiposAviso[k][0]}<small>{txt.opciones.tiposAviso[k][1]}</small></span>
                <input type="checkbox" bind:checked={ajustes[`aviso_${k}`]} />
              </label>
            {/each}
          </details>
        </section>

      {:else if PESTANAS[activa] === 'partida'}
        <section class="lista">
          <div class="resumen">
            <p class="rotulo">{txt.opciones.tuPartida}</p>
            <p class="grande num">{txt.opciones.descPartida(juego.s.compresiones, txt.duracion(juego.s.tiempoTotal))}</p>
          </div>

          {#if esMovil() && !enApp()}
            <div class="fila">
              <span class="texto">{txt.instalar.ajustes}<small>{txt.instalar.ajustesDesc}</small></span>
              <button class="accion chica" onclick={() => (instalar.abierta = true)}>{txt.instalar.ajustes}</button>
            </div>
          {/if}

          <div class="fila">
            <span class="texto">{txt.opciones.guardarAhora}<small>{guardadoOk ? txt.opciones.guardado : txt.opciones.guardadoAuto}</small></span>
            <button class="accion chica" onclick={guardarAhora}>{txt.opciones.guardarAhora}</button>
          </div>

          <div class="bloque">
            <div class="fila sin-borde">
              <span class="texto">{txt.opciones.exportar}<small>{txt.opciones.exportarDesc}</small></span>
              <button class="accion chica" onclick={alExportar}>{txt.opciones.exportar}</button>
            </div>
            {#if exportado}
              <p class="nota" role="status">{exportado.copiado ? txt.opciones.exportado : txt.opciones.exportadoSinCopiar}</p>
              <textarea class="codigo" readonly rows="3" aria-label={txt.opciones.exportar} onfocus={(e) => e.currentTarget.select()}
                >{exportado.texto}</textarea>
            {/if}
          </div>

          <div class="bloque">
            <div class="fila sin-borde">
              <span class="texto">{txt.opciones.importar}<small>{txt.opciones.importarDesc}</small></span>
              <button class="accion chica" aria-expanded={importando} onclick={() => ((importando = !importando), (aImportar = null))}>
                {txt.opciones.importar}
              </button>
            </div>
            {#if importando}
              {#if aImportar}
                <p class="aviso-fuerte" role="alert">
                  {txt.opciones.importarConfirma(txt.opciones.descPartida(aImportar.estado.compresiones, txt.duracion(aImportar.estado.tiempoTotal)))}
                </p>
                <div class="acciones">
                  <button class="accion chica peligro" use:enfocar onclick={() => aImportar && reemplazar({ ...aImportar, guardadoEn: Date.now() })}>
                    {txt.opciones.reemplazar}
                  </button>
                  <button class="secundario" onclick={() => (aImportar = null)}>{txt.opciones.cancelar}</button>
                </div>
              {:else}
                <textarea class="codigo" rows="3" aria-label={txt.opciones.pegar} placeholder={txt.opciones.pegar} use:enfocar
                  bind:value={pegado} oninput={() => (importarMal = false)}></textarea>
                {#if importarMal}<p class="nota mal" role="alert">{txt.opciones.importarMal}</p>{/if}
                <div class="acciones">
                  <button class="accion chica" disabled={!pegado.trim()} onclick={alImportar}>{txt.opciones.importar}</button>
                </div>
              {/if}
            {/if}
          </div>

          <div class="bloque">
            <div class="fila sin-borde">
              <span class="texto">{txt.opciones.reportar}<small>{txt.opciones.reportarDesc}</small></span>
              <button class="accion chica" onclick={alReportar}>{txt.opciones.reportar}</button>
            </div>
            {#if reporte}
              <p class="nota" role="status">{reporte.copiado ? txt.opciones.reportado : txt.opciones.reportadoSinCopiar} <a href={DISCORD} target="_blank" rel="noopener">Discord</a></p>
              <textarea class="codigo" readonly rows="3" aria-label={txt.opciones.reportar} onfocus={(e) => e.currentTarget.select()}
                >{reporte.texto}</textarea>
            {/if}
          </div>

          {#if respaldo}
            <div class="bloque">
              <div class="fila sin-borde">
                <span class="texto">{txt.pase.respaldoTitulo}<small>{txt.pase.respaldoDesc(txt.opciones.descPartida(respaldo.estado.compresiones, txt.duracion(respaldo.estado.tiempoTotal)))}</small></span>
                {#if !volver}<button class="accion chica" onclick={() => (volver = true)}>{txt.pase.volver}</button>{/if}
              </div>
              {#if volver}
                <p class="aviso-fuerte" role="alert">{txt.pase.volverConfirma}</p>
                <div class="acciones">
                  <button class="accion chica peligro" use:enfocar onclick={volverAlRespaldo}>{txt.pase.volver}</button>
                  <button class="secundario" onclick={() => (volver = false)}>{txt.opciones.cancelar}</button>
                </div>
              {/if}
            </div>
          {/if}

          <div class="bloque peligro-zona">
            <div class="fila sin-borde">
              <span class="texto">{txt.opciones.zonaPeligro}<small>{txt.opciones.borrarDesc}</small></span>
              {#if borrar === 0}<button class="accion chica peligro" onclick={() => (borrar = 1)}>{txt.opciones.borrar}</button>{/if}
            </div>
            {#if borrar > 0}
              <p class="aviso-fuerte" role="alert">{borrar === 1 ? txt.opciones.borrarConfirma : txt.opciones.borrarConfirma2}</p>
              <div class="acciones">
                {#key borrar}
                  <button class="accion chica peligro" use:enfocar onclick={() => (borrar === 1 ? (borrar = 2) : (noSeEscribio = !borrarPartida()))}>
                    {borrar === 1 ? txt.opciones.borrarSi : txt.opciones.borrarDefinitivo}
                  </button>
                {/key}
                <button class="secundario" onclick={() => (borrar = 0)}>{txt.opciones.cancelar}</button>
              </div>
            {/if}
          </div>
          {#if noSeEscribio}<p class="nota mal" role="alert">{txt.opciones.noSeEscribio}</p>{/if}
        </section>

      {:else if PESTANAS[activa] === 'creditos'}
        <section class="lista">
          {#each txt.opciones.creditos as [rotulo, texto]}
            <div class="resumen"><p class="rotulo">{rotulo}</p><p class="grande">{texto}</p></div>
          {/each}
          <div class="resumen"><p class="rotulo">{txt.version.rotulo}</p><p class="grande num">{VERSION}</p></div>
          <div class="resumen">
            <p class="rotulo">{txt.opciones.estudio}</p>
            <!-- shortcut: marca de texto en lugar del logo del estudio; cambiarla cuando haya archivo. Logro secreto «e». -->
            <button class="logo-estudio" onclick={tocarLogo}><span aria-hidden="true">e<sup>x</sup></span>{txt.opciones.logoEstudio}</button>
          </div>
        </section>

      {:else}
        <dl class="teclas">
          {#each txt.opciones.teclas.filter(([k]) => !TECLA_VISTO[k] || juego.vistos[TECLA_VISTO[k]]) as [k, que]}<dt><kbd>{k}</kbd></dt><dd>{que}</dd>{/each}
        </dl>
      {/if}
    </div>
  </Pantalla>
{/if}

<style>
  .contenido { width: 100%; max-width: 72rem; margin: 0 auto; padding: 0.5rem 2rem 3rem; }
  .desc { margin: 0 0 1rem; font-size: 0.875rem; color: var(--tenue); text-wrap: pretty; }
  .aviso { margin: 0 0 1.5rem; font-size: 0.9375rem; color: var(--ambar); }
  .rotulo { margin: 0 0 0.25rem; font-size: 0.875rem; color: var(--tenue); }
  .logo-estudio {
    display: inline-flex; align-items: baseline; gap: 0.5rem; min-height: 44px; padding: 0; border: 0; background: none;
    color: var(--tinta); font: inherit; font-size: 1.25rem; font-weight: 600; letter-spacing: -0.01em; cursor: pointer;
  }
  .logo-estudio span { font-size: 1.5rem; color: var(--ambar); font-style: italic; }


  /* Aspecto: una grilla de tarjetas por tipo, con la vista previa hecha con el motor de la pila. */
  .grupo { margin-bottom: 2.5rem; }
  .cabeza-grupo { display: flex; align-items: baseline; gap: 0.75rem; }
  h3 { margin: 0 0 0.25rem; font-size: 1.25rem; font-weight: 600; letter-spacing: -0.01em; }
  .cuenta { font-size: 0.875rem; color: var(--apagado); }
  /* Sin tarjetas: la vista previa sola, el nombre y el estado debajo; el elegido, por el color y el peso del texto. */
  .tarjetas { display: grid; grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr)); gap: 1.5rem 1.25rem; }
  .tarjeta {
    display: flex; flex-direction: column; padding: 0; border: 0; background: none; color: var(--tinta); font: inherit;
    text-align: left; cursor: not-allowed; animation: subir 0.45s calc(var(--i) * 0.03s) ease-out backwards;
  }
  .tarjeta.libre { cursor: pointer; }
  .tarjeta .nombre { color: var(--tenue); font-weight: 500; transition: color 0.15s; }
  .tarjeta.libre:hover .nombre { color: var(--tinta); }
  .tarjeta[aria-checked='true'] .nombre { color: var(--ambar); font-weight: 600; }
  .tarjeta:not(.libre) .vista { filter: grayscale(1) brightness(0.45); }
  .vista { display: block; width: 100%; aspect-ratio: 3 / 2; height: auto; mask: radial-gradient(closest-side, #000 75%, transparent); } /* sin recuadro */
  .vista.cuadrada { aspect-ratio: 1; }
  .pie { display: grid; gap: 0.25rem; padding: 0.5rem 0 0; }
  .nombre { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9375rem; font-weight: 600; }
  .tarjeta:not(.libre) .nombre { color: var(--apagado); }
  .muestras { display: flex; flex: none; }
  .muestras i { width: 0.625rem; height: 0.625rem; border-radius: 50%; margin-right: -0.1875rem; box-shadow: 0 0 0 1.5px rgb(14 16 30); }
  .en-uso { font-size: 0.75rem; color: var(--ambar); }
  .bloqueo { display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; color: var(--apagado); }
  .bloqueo svg { flex: none; fill: none; stroke: currentColor; stroke-width: 1.4; }
  .foto { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1.25rem; margin-top: -1rem; }
  .foto .desc { margin: 0; }

  /* Juego y Partida: filas con el nombre, una línea de explicación y el control a la derecha. */
  .lista { max-width: 44rem; }
  .fila {
    display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; min-height: 4.5rem; padding: 0.75rem 0;
    border-top: 1px solid var(--borde); font-size: 1.0625rem; cursor: pointer;
  }
  .fila.sin-borde { border-top: 0; }
  .texto { display: grid; gap: 0.25rem; }
  .texto small { font-size: 0.8125rem; color: var(--tenue); }
  .fila input[type='checkbox'] { flex: none; width: 1.25rem; height: 1.25rem; margin: 0; accent-color: var(--ambar); cursor: pointer; }
  .fila input[type='range'] { flex: none; width: 12rem; height: 2.75rem; margin: 0; accent-color: var(--ambar); cursor: pointer; }
  .fila.sub { padding-left: 1.25rem; }
  .avisos summary { list-style: none; }
  .avisos summary::-webkit-details-marker { display: none; }
  .avisos summary .cuenta::after { content: ' ▾'; color: var(--tenue); }
  .avisos[open] summary .cuenta::after { content: ' ▴'; }
  /* Opciones como los modos de la tienda: texto; la elegida, con una línea de 1 px debajo. */
  .segmentos { display: flex; gap: 1.25rem; flex: none; }
  .segmentos button {
    display: grid; gap: 0.125rem; justify-items: start; min-height: 3rem; padding: 0.375rem 0; border: 0; border-bottom: 1px solid transparent;
    background: none; color: var(--apagado); font: inherit; font-size: 0.9375rem; cursor: pointer; transition: color 0.15s;
  }
  .segmentos button:hover { color: var(--tenue); }
  .segmentos small { font-size: 0.75rem; color: var(--apagado); }
  .segmentos button[aria-checked='true'] { color: var(--tinta); font-weight: 600; border-bottom-color: var(--tinta); }
  .resumen { padding-bottom: 1.5rem; }
  .grande { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.01em; }
  .bloque { border-top: 1px solid var(--borde); padding-bottom: 0.5rem; }
  .peligro-zona .texto { color: var(--coral); }

  .accion {
    flex: none; min-height: 2.75rem; padding: 0 1.25rem; border: 1px solid var(--borde); background: none;
    color: var(--tinta); font: inherit; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: border-color 0.15s, background 0.15s;
  }
  .accion:hover, .accion:focus-visible { border-color: var(--tinta); background: rgb(232 233 243 / 0.04); }
  .accion:disabled { color: var(--apagado); border-color: var(--borde); background: none; cursor: default; }
  .accion.peligro { color: var(--coral); }
  .accion.peligro:hover, .accion.peligro:focus-visible { border-color: var(--coral); }
  .secundario { min-height: 2.5rem; padding: 0; border: 0; background: none; color: var(--tenue); font: inherit; font-size: 0.9375rem; cursor: pointer; }
  .secundario:hover { color: var(--tinta); }
  .acciones { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1.25rem; margin: 0.5rem 0; }
  .nota { margin: 0.25rem 0; font-size: 0.875rem; color: var(--tenue); }
  .nota.mal { color: var(--coral); }
  .aviso-fuerte { margin: 0.5rem 0 0.25rem; font-size: 0.9375rem; text-wrap: pretty; }
  .codigo {
    width: 100%; margin: 0.25rem 0; padding: 0.5rem 0; border: 0; border-bottom: 1px solid var(--borde); background: none;
    color: var(--tenue); font: 0.75rem/1.4 ui-monospace, monospace; word-break: break-all; resize: vertical;
  }
  .codigo:focus { border-color: var(--tenue); outline: none; }

  .teclas { display: grid; grid-template-columns: auto 1fr; gap: 1rem 1.5rem; max-width: 30rem; margin: 0; font-size: 1.0625rem; }
  .teclas dt { text-align: right; }
  .teclas dd { margin: 0; align-self: center; color: var(--tenue); }
  kbd { font: inherit; font-weight: 600; } /* la tecla es texto, no el dibujo de una tecla */

  @keyframes subir { from { opacity: 0; transform: translateY(6px); } }
  :global(.quieto) .tarjeta { animation: none; }

  @media (max-width: 767px) {
    .contenido { padding: 0.25rem 1rem 2rem; }
    .tarjetas { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.625rem; }
    .fila { flex-wrap: wrap; gap: 0.75rem; }
    .fila:has(> input[type='checkbox']) { flex-wrap: nowrap; } /* la casilla siempre a la derecha, no abajo según el largo */
    .fila input[type='range'] { width: 100%; }
  }
</style>
