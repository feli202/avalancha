<script lang="ts">
  // Todo lo que flota sobre la pila: "Mientras no estabas", guardado dañado y el panel de Ajustes
  // Un solo lenguaje: velo oscuro translúcido, sin cajas, jerarquía por tamaño, números con cifras tabulares.
  import { untrack } from 'svelte'
  import { CFG } from '../core'
  import { exportar, importar, type Partida } from '../guardado/guardado'
  import { es } from '../strings/es'
  import { ajustes } from './ajustes.svelte'
  import { formato } from './formato'
  import { COLORES_DALTONISMO, EFECTOS, MARCOS, PALETAS, css } from '../render/paletas'
  import { sacarFoto } from '../render/marcos'
  import { borrarPartida, camara, guardarYa, juego, partidaActual, reemplazarPartida } from './juego.svelte'
  import { desbloqueados, elegido } from './logros'


  // Al cerrar cualquier panel, el foco vuelve a donde estaba (el ícono, casi siempre).
  const abierto = $derived(juego.panel !== null || juego.ausencia !== null || juego.guardadoRoto)
  let previo: HTMLElement | null = null
  // Se anota antes de que el panel tome el foco, y se devuelve después de que el juego deja de estar inert.
  $effect.pre(() => void (abierto && untrack(() => (previo ??= document.activeElement as HTMLElement | null))))
  $effect(() => {
    if (abierto) return
    untrack(() => { previo?.focus(); previo = null })
  })
  const enfocar = (el: HTMLElement, si = true) => void (si && el.focus())

  function cerrar() {
    juego.panel = null
    juego.ausencia = null
    reiniciarPasos()
  }
  const teclaVentana = (e: KeyboardEvent) => e.key === 'Escape' && !juego.guardadoRoto && abierto && cerrar()
  const afuera = (e: MouseEvent) => e.target === e.currentTarget && cerrar()

  // Aspecto: lo desbloqueado con logros.
  const paletas = $derived(desbloqueados('paleta', Object.keys(PALETAS), juego.logros))
  const efectos = $derived(desbloqueados('efecto', EFECTOS, juego.logros))
  const marcos = $derived(desbloqueados('marco', MARCOS, juego.logros))
  const paletaActual = $derived(elegido('paleta', Object.keys(PALETAS), ajustes.paleta, juego.logros))
  function foto() {
    const f = camara.foto?.()
    const colores = ajustes.daltonismo ? COLORES_DALTONISMO : PALETAS[paletaActual]
    if (f) sacarFoto(f, elegido('marco', MARCOS, ajustes.marco, juego.logros), colores, es.opciones.archivoFoto)
  }

  // Ajustes: guardar, exportar, importar y borrar, cada uno con su mensaje o su paso de confirmación.
  let guardadoOk = $state(false)
  let exportado = $state<{ texto: string; copiado: boolean } | null>(null)
  let importando = $state(false)
  let pegado = $state('')
  let importarMal = $state(false)
  let aImportar = $state.raw<Partida | null>(null)
  let borrar = $state(0) // 0, 1 o 2: doble confirmación

  function reiniciarPasos() {
    exportado = null
    importando = false
    pegado = ''
    importarMal = false
    aImportar = null
    borrar = 0
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

  function alImportar() {
    try {
      aImportar = importar(pegado)
      importarMal = false
    } catch {
      importarMal = true
    }
  }
</script>

<svelte:window onkeydown={teclaVentana} />

{#if juego.guardadoRoto}
  <!-- No se cierra con Escape ni tocando afuera: hasta aceptar, no se guarda nada. -->
  <div class="velo" class:quieto={ajustes.reducirDestellos}>
    <div class="centro" role="alertdialog" aria-modal="true" aria-labelledby="roto-t" aria-describedby="roto-d">
      <h2 id="roto-t" class="titulo">{es.guardadoRoto.titulo}</h2>
      <p id="roto-d" class="texto">{es.guardadoRoto.texto}</p>
      <button class="accion" use:enfocar onclick={() => (juego.guardadoRoto = false)}>{es.guardadoRoto.empezar}</button>
    </div>
  </div>
{:else if juego.ausencia}
  {@const a = juego.ausencia}
  <div class="velo" class:quieto={ajustes.reducirDestellos} role="presentation" onclick={afuera}>
    <div class="centro recompensa" role="dialog" aria-modal="true" aria-labelledby="ausencia-t" aria-describedby="ausencia-d">
      <p id="ausencia-t" class="rotulo">{es.ausencia.titulo}</p>
      <p id="ausencia-d" class="grande">
        <span class="cifra num">+{formato(a.energia)}</span>
        <span class="unidad">{es.ausencia.energia}</span>
      </p>
      <p class="detalle num">
        {a.segundos >= CFG.fuera_de_linea.tope_horas * 3600
          ? es.ausencia.tope(CFG.fuera_de_linea.tope_horas)
          : es.ausencia.tiempo(es.duracion(a.segundos))}
        {#if a.compresiones > 0}<span class="sep">·</span>{es.ausencia.compresiones(a.compresiones)}{/if}
      </p>
      <button class="accion" use:enfocar onclick={cerrar}>{es.ausencia.seguir}</button>
    </div>
  </div>
{:else if juego.panel === 'ajustes'}
  <div class="velo" class:quieto={ajustes.reducirDestellos} role="presentation" onclick={afuera}>
    <div class="hoja" role="dialog" aria-modal="true" aria-labelledby="hoja-t">
      <div class="cabeza">
        <h2 id="hoja-t" class="titulo-hoja">{es.menu.abrir}</h2>
        <button class="cerrar" aria-label={es.menu.cerrar} onclick={cerrar} use:enfocar>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" /></svg>
        </button>
      </div>

      <div class="cuerpo">
          <section class="opciones">
            <h3>{es.opciones.aspecto}</h3>
            <div class="fila">
              <span id="paleta-t">{es.opciones.paleta}</span>
              <div class="paletas" role="radiogroup" aria-labelledby="paleta-t">
                {#each paletas as id (id)}
                  <button role="radio" aria-checked={paletaActual === id} title={es.cosmeticos.paleta[id]}
                    aria-label={es.cosmeticos.paleta[id]} onclick={() => (ajustes.paleta = id)}>
                    {#each PALETAS[id] as c}<i style:background={css(c)}></i>{/each}
                  </button>
                {/each}
              </div>
            </div>
            {#if ajustes.daltonismo}<p class="nota">{es.opciones.daltonismoManda}</p>{/if}
            <label class="fila">
              <span>{es.opciones.efecto}</span>
              <select value={elegido('efecto', EFECTOS, ajustes.efecto, juego.logros)} onchange={(e) => (ajustes.efecto = e.currentTarget.value)}>
                {#each efectos as id (id)}<option value={id}>{es.cosmeticos.efecto[id]}</option>{/each}
              </select>
            </label>
            <div class="fila">
              <label for="marco-s">{es.opciones.marco}</label>
              <div class="acciones">
                <select id="marco-s" value={elegido('marco', MARCOS, ajustes.marco, juego.logros)} onchange={(e) => (ajustes.marco = e.currentTarget.value)}>
                  {#each marcos as id (id)}<option value={id}>{es.cosmeticos.marco[id]}</option>{/each}
                </select>
                <button class="accion chica" onclick={foto}>{es.opciones.foto}</button>
              </div>
            </div>
            {#if paletas.length + efectos.length + marcos.length < Object.keys(PALETAS).length + EFECTOS.length + MARCOS.length}
              <p class="nota">{es.opciones.masConLogros}</p>
            {/if}
          </section>

          <section class="opciones">
            <div class="fila">
              <span id="notacion-t">{es.opciones.notacion}</span>
              <div class="segmentos" role="radiogroup" aria-labelledby="notacion-t">
                {#each ['cientifica', 'ingenieria'] as const as n}
                  <button role="radio" aria-checked={ajustes.notacion === n} onclick={() => (ajustes.notacion = n)}>
                    {es.opciones[n]}
                  </button>
                {/each}
              </div>
            </div>
            <label class="fila">
              <span>{es.opciones.volumen} <small>{es.opciones.sinSonido}</small></span>
              <input type="range" min="0" max="1" step="0.05" bind:value={ajustes.volumen} />
            </label>
            <label class="fila"><span>{es.reducirDestellos}</span><input type="checkbox" bind:checked={ajustes.reducirDestellos} /></label>
            <label class="fila"><span>{es.opciones.daltonismo}</span><input type="checkbox" bind:checked={ajustes.daltonismo} /></label>
          </section>

          <section class="opciones">
            <h3>{es.opciones.partida}</h3>
            <div class="acciones">
              <button class="accion chica" onclick={guardarAhora}>{es.opciones.guardarAhora}</button>
              <button class="accion chica" onclick={alExportar}>{es.opciones.exportar}</button>
              <button class="accion chica" aria-expanded={importando} onclick={() => ((importando = !importando), (aImportar = null))}>
                {es.opciones.importar}
              </button>
            </div>
            {#if guardadoOk}<p class="nota" role="status">{es.opciones.guardado}</p>{/if}
            {#if exportado}
              <p class="nota" role="status">{exportado.copiado ? es.opciones.exportado : es.opciones.exportadoSinCopiar}</p>
              <textarea class="codigo" readonly rows="3" aria-label={es.opciones.exportar} onfocus={(e) => e.currentTarget.select()}
                >{exportado.texto}</textarea>
            {/if}
            {#if importando}
              {#if aImportar}
                <p class="aviso-fuerte" role="alert">
                  {es.opciones.importarConfirma(es.opciones.descPartida(aImportar.estado.compresiones, es.duracion(aImportar.estado.tiempoTotal)))}
                </p>
                <div class="acciones">
                  <button class="accion chica peligro" use:enfocar onclick={() => aImportar && reemplazarPartida(aImportar)}>
                    {es.opciones.reemplazar}
                  </button>
                  <button class="secundario" onclick={() => (aImportar = null)}>{es.opciones.cancelar}</button>
                </div>
              {:else}
                <textarea class="codigo" rows="3" aria-label={es.opciones.pegar} placeholder={es.opciones.pegar} use:enfocar
                  bind:value={pegado} oninput={() => (importarMal = false)}></textarea>
                {#if importarMal}<p class="nota mal" role="alert">{es.opciones.importarMal}</p>{/if}
                <div class="acciones">
                  <button class="accion chica" disabled={!pegado.trim()} onclick={alImportar}>{es.opciones.importar}</button>
                </div>
              {/if}
            {/if}

            {#if borrar === 0}
              <button class="secundario borrar" onclick={() => (borrar = 1)}>{es.opciones.borrar}</button>
            {:else}
              <p class="aviso-fuerte" role="alert">{borrar === 1 ? es.opciones.borrarConfirma : es.opciones.borrarConfirma2}</p>
              <div class="acciones">
                {#key borrar}
                  <button class="accion chica peligro" use:enfocar onclick={() => (borrar === 1 ? (borrar = 2) : borrarPartida())}>
                    {borrar === 1 ? es.opciones.borrarSi : es.opciones.borrarDefinitivo}
                  </button>
                {/key}
                <button class="secundario" onclick={() => (borrar = 0)}>{es.opciones.cancelar}</button>
              </div>
            {/if}
          </section>

          <section class="opciones">
            <h3>{es.opciones.teclado}</h3>
            <dl class="teclas">
              {#each es.opciones.teclas as [k, que]}<dt><kbd>{k}</kbd></dt><dd>{que}</dd>{/each}
            </dl>
          </section>
      </div>
    </div>
  </div>
{/if}

<style>
  /* El velo: oscuro y translúcido, la pila se intuye detrás. Nada de bordes ni cajas encima. */
  .velo {
    position: fixed; inset: 0; z-index: 6; display: grid; place-items: center; padding: 1.5rem 1rem;
    background: radial-gradient(ellipse at center, rgb(7 8 15 / 0.7), rgb(7 8 15 / 0.9) 70%);
    overflow-y: auto; animation: fundido 0.35s ease-out;
  }
  .centro { display: grid; justify-items: center; gap: 0; width: min(30rem, 100%); text-align: center; }

  .rotulo { margin: 0; font-size: 1rem; color: var(--tenue); }
  .titulo { margin: 0 0 0.75rem; font-size: clamp(1.5rem, 4vw, 2rem); font-weight: 600; letter-spacing: -0.02em; text-wrap: balance; }
  .texto { margin: 0 0 2rem; font-size: 1rem; line-height: 1.5; color: var(--tenue); text-wrap: pretty; }

  /* "Mientras no estabas": la Energía es el premio. */
  .grande { display: grid; justify-items: center; margin: 0.5rem 0 1rem; }
  .cifra {
    font-size: clamp(3.25rem, 11vw, 6.5rem); font-weight: 600; line-height: 1; letter-spacing: -0.04em;
    text-shadow: 0 0 2.5rem color-mix(in srgb, var(--ambar) 45%, transparent), 0 0 0.75rem color-mix(in srgb, var(--ambar) 25%, transparent);
  }
  .unidad { margin-top: 0.375rem; font-size: 1.125rem; color: var(--ambar); }
  .detalle { margin: 0 0 2.5rem; font-size: 1rem; color: var(--tenue); }
  .sep { margin: 0 0.5rem; color: var(--apagado); }
  .recompensa .rotulo { animation: subir 0.5s 0.05s ease-out backwards; }
  .recompensa .grande { animation: premio 0.9s 0.15s cubic-bezier(0.2, 0.9, 0.25, 1.15) backwards; }
  .recompensa .detalle { animation: subir 0.5s 0.45s ease-out backwards; }
  .recompensa .accion { animation: subir 0.5s 0.6s ease-out backwards; }
  @keyframes premio { from { opacity: 0; transform: scale(0.92); filter: blur(6px); } }
  @keyframes subir { from { opacity: 0; transform: translateY(6px); } }
  .quieto .recompensa * { animation-name: fundido !important; }

  /* Botones: texto con una línea de 1 px, como el resto de la interfaz. */
  .accion {
    min-height: 2.75rem; min-width: 11rem; padding: 0 1.5rem; border: 1px solid var(--borde); background: none;
    color: var(--tinta); font: inherit; font-size: 1.0625rem; font-weight: 600; cursor: pointer; transition: border-color 0.15s, background 0.15s;
  }
  .accion:hover, .accion:focus-visible { border-color: var(--tinta); background: rgb(232 233 243 / 0.04); }
  .accion:disabled { color: var(--apagado); border-color: var(--borde); background: none; cursor: default; }
  .accion.chica { min-width: 0; min-height: 2.5rem; padding: 0 1rem; font-size: 0.9375rem; }
  .accion.peligro { color: var(--coral); }
  .accion.peligro:hover, .accion.peligro:focus-visible { border-color: var(--coral); }
  .secundario {
    min-height: 2.5rem; padding: 0; border: 0; background: none; color: var(--tenue); font: inherit; font-size: 0.9375rem; cursor: pointer;
  }
  .secundario:hover { color: var(--tinta); }

  /* Ajustes */
  .hoja { width: min(34rem, 100%); max-height: calc(100dvh - 3rem); display: flex; flex-direction: column; }
  .cabeza { display: flex; align-items: center; justify-content: space-between; flex: none; padding-bottom: 1.25rem; }
  .titulo-hoja { margin: 0; font-size: 1.125rem; font-weight: 600; }
  .cerrar {
    display: grid; place-items: center; width: 2.75rem; height: 2.75rem; margin-right: -0.75rem; padding: 0; border: 0;
    background: none; color: var(--apagado); cursor: pointer;
  }
  .cerrar:hover { color: var(--tinta); }
  .cerrar svg { stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }
  .cuerpo { padding-bottom: 0.25rem; overflow-y: auto; /* el padding absorbe los subpíxeles que dejaban una barra sin contenido */ overscroll-behavior: contain; scrollbar-width: thin; animation: fundido 0.25s ease-out; }



  .opciones { display: grid; gap: 0.25rem; margin-bottom: 2rem; }
  .opciones h3 { margin: 0 0 0.5rem; font-size: 0.875rem; font-weight: 400; color: var(--tenue); }
  .fila {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 3rem;
    border-top: 1px solid var(--borde); font-size: 1rem; cursor: pointer;
  }
  .fila small { display: block; font-size: 0.75rem; color: var(--apagado); }
  .fila input[type='checkbox'] { width: 1.125rem; height: 1.125rem; margin: 0; accent-color: var(--tinta); cursor: pointer; }
  .fila input[type='range'] { width: 10rem; accent-color: var(--tinta); cursor: pointer; }
  .segmentos { display: flex; gap: 1rem; }
  .segmentos button {
    min-height: 2.75rem; padding: 0; border: 0; background: none; color: var(--apagado); font: inherit; font-size: 0.9375rem; cursor: pointer;
  }
  .segmentos button:hover { color: var(--tenue); }
  .segmentos button[aria-checked='true'] { color: var(--tinta); font-weight: 600; }
  .paletas { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.25rem; }
  .paletas button {
    display: flex; align-items: center; min-height: 2.75rem; padding: 0 0.5rem; border: 1px solid transparent; border-radius: 999px;
    background: none; cursor: pointer;
  }
  .paletas button[aria-checked='true'] { border-color: var(--tinta); }
  .paletas i { width: 0.75rem; height: 0.75rem; border-radius: 50%; margin-right: -0.1875rem; box-shadow: 0 0 0 1.5px var(--fondo); }
  select {
    min-height: 2.5rem; padding: 0 0.5rem; border: 1px solid var(--borde); background: var(--fondo); color: var(--tinta);
    font: inherit; font-size: 0.9375rem; cursor: pointer;
  }
  .fila .acciones { margin: 0; }
  .acciones { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1.25rem; margin: 0.5rem 0; }
  .nota { margin: 0.25rem 0; font-size: 0.875rem; color: var(--tenue); }
  .nota.mal { color: var(--coral); }
  .aviso-fuerte { margin: 1rem 0 0.25rem; font-size: 0.9375rem; text-wrap: pretty; }
  .codigo {
    width: 100%; margin: 0.25rem 0; padding: 0.5rem 0.625rem; border: 1px solid var(--borde); background: rgb(7 8 15 / 0.6);
    color: var(--tenue); font: 0.75rem/1.4 ui-monospace, monospace; word-break: break-all; resize: vertical;
  }
  .codigo:focus { border-color: var(--tenue); outline: none; }
  .borrar { justify-self: start; margin-top: 1rem; color: var(--apagado); }
  .borrar:hover { color: var(--coral); }
  .teclas { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1.25rem; margin: 0; font-size: 0.9375rem; }
  .teclas dt { text-align: right; }
  .teclas dd { margin: 0; color: var(--tenue); }
  kbd { font: inherit; font-size: 0.8125rem; font-weight: 600; }

  @keyframes fundido { from { opacity: 0; } }

  @media (max-width: 767px) {
    .velo { background: rgb(7 8 15 / 0.88); } /* la tienda en hoja queda detrás del texto: más oscuro */
    .hoja { max-height: calc(100dvh - 2rem); }
  }
</style>
