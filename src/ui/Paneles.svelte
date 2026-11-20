<script lang="ts">
  // Lo que flota sobre la pila: "Mientras no estabas" y el guardado dañado. Y Escape y el foco de todas las pantallas.
  // Un solo lenguaje: velo oscuro translúcido, sin cajas, jerarquía por tamaño, números con cifras tabulares.
  import { untrack } from 'svelte'
  import { CFG, CFG1, TIPOS, efectoNivel, elegir, fusionables, fusionarTodo, infinitoRoto, inventarioLleno } from '../core'
  import { caraReliquia } from '../render/miniPilas'
  import IconoTipo from './IconoTipo.svelte'
  import * as sonido from './sonido'
  import { almacenLocal } from '../guardado/almacen'
  import { RESPALDO } from '../guardado/guardado'
  import { txt } from '../strings'
  import { ajustes } from './ajustes.svelte'
  import { formato } from './formato'
  import { hayEleccion, juego, tomarCandado } from './juego.svelte'


  // Al cerrar cualquier panel, el foco vuelve a donde estaba (el ícono, casi siempre).
  const abierto = $derived(juego.panel !== null || juego.ausencia !== null || juego.calculo !== null || juego.guardadoRoto || juego.otraPestana || hayEleccion())
  let previo: HTMLElement | null = null
  // Se anota antes de que el panel tome el foco, y se devuelve después de que el juego deja de estar inert.
  $effect.pre(() => void (abierto && untrack(() => (previo ??= document.activeElement as HTMLElement | null))))
  $effect(() => {
    if (abierto) return
    untrack(() => { previo?.focus(); previo = null })
  })
  const enfocar = (el: HTMLElement, si = true) => void (si && el.focus())

  // I2: el texto del guardado dañado, para copiarlo antes de empezar de nuevo (el respaldo queda igual en el navegador).
  let danado = $state<{ texto: string; copiado: boolean } | null>(null)
  async function copiarDanado() {
    const texto = almacenLocal.leer(RESPALDO) ?? ''
    danado = { texto, copiado: false }
    try { await navigator.clipboard.writeText(texto); danado = { texto, copiado: true } } catch { /* queda el texto para copiar a mano */ }
  }

  // SPEC_CAPA1 §5: el Infinito a mano deja una reliquia esperando su tipo. El pop-up queda hasta que elijas (la corrida
  // nueva ya corre detrás); no se cierra con Escape ni tocando afuera.
  const r = txt.cristal.relicario
  const ambar = (t: string) => juego.s.relicario.piezas.filter((p) => p.tipo === t && p.nivel === 0).length % 3
  // Engarces nv4: dos reliquias por Infinito; con "las dos del mismo tipo", un toque elige las dos.
  let lasDos = $state(false)
  function tomar(t: string) {
    juego.s = elegir(juego.s, t)
    if (lasDos) juego.s = elegir(juego.s, t)
    lasDos = false
    sonido.compra('other')
  }

  function cerrar() {
    juego.panel = null
    juego.ausencia = null
  }
  const teclaVentana = (e: KeyboardEvent) => e.key === 'Escape' && !juego.guardadoRoto && !juego.otraPestana && abierto && cerrar()
  const afuera = (e: MouseEvent) => e.target === e.currentTarget && cerrar()

</script>

<svelte:window onkeydown={teclaVentana} />

{#if juego.otraPestana}
  <div class="velo" class:quieto={ajustes.reducirDestellos}>
    <div class="centro" role="alertdialog" aria-modal="true" aria-labelledby="otra-t" aria-describedby="otra-d">
      <h2 id="otra-t" class="titulo">{txt.otraPestana.titulo}</h2>
      <p id="otra-d" class="texto">{txt.otraPestana.texto}</p>
      <button class="accion" use:enfocar onclick={() => tomarCandado(true)}>{txt.otraPestana.jugarAca}</button>
    </div>
  </div>
{:else if juego.guardadoRoto}
  <!-- No se cierra con Escape ni tocando afuera: hasta aceptar, no se guarda nada. -->
  <div class="velo" class:quieto={ajustes.reducirDestellos}>
    <div class="centro" role="alertdialog" aria-modal="true" aria-labelledby="roto-t" aria-describedby="roto-d">
      <h2 id="roto-t" class="titulo">{txt.guardadoRoto.titulo}</h2>
      <p id="roto-d" class="texto">{txt.guardadoRoto.texto}</p>
      <div class="acciones">
        <button class="accion" use:enfocar onclick={() => (juego.guardadoRoto = false)}>{txt.guardadoRoto.empezar}</button>
        <button class="accion" onclick={copiarDanado}>{txt.guardadoRoto.copiar}</button>
      </div>
      {#if danado}
        <p class="texto chico" role="status">{danado.copiado ? txt.guardadoRoto.copiado : txt.guardadoRoto.copiaAMano}</p>
        <textarea class="codigo seleccionable" readonly rows="3" aria-label={txt.guardadoRoto.copiar} onfocus={(e) => e.currentTarget.select()}>{danado.texto}</textarea>
      {/if}
    </div>
  </div>
{:else if juego.calculo !== null}
  <!-- C8: el cálculo de la ausencia va de a tramos; mientras, una barra (de hielo en la Capa 1). -->
  <div class="velo" class:quieto={ajustes.reducirDestellos}>
    <div class="centro calculando" class:hielo={juego.s.infinitos > 0} class:placa={juego.s.infinitos > 0} role="status" aria-live="polite">
      <p class="rotulo">{txt.ausencia.calculando}</p>
      <div class="pista" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(juego.calculo * 100)} aria-label={txt.ausencia.calculando}>
        <span class="lleno" style:width="{juego.calculo * 100}%"></span>
      </div>
      <p class="detalle num">{Math.round(juego.calculo * 100)} / 100</p>
    </div>
  </div>
{:else if juego.ausencia && juego.ausencia.s.infinitos > 0}
  <!-- SPEC_CAPA1 §12: en la Capa 1, una placa de hielo con lo que ganaste afuera. -->
  {@const a = juego.ausencia}
  {@const ab = a.s.estratos.abiertos}
  <div class="velo" class:quieto={ajustes.reducirDestellos} role="presentation" onclick={afuera}>
    <div class="centro recompensa hielo placa grietas" role="dialog" aria-modal="true" aria-labelledby="ausencia-t" aria-describedby="ausencia-d">
      <p id="ausencia-t" class="rotulo">{txt.ausencia.titulo}</p>
      <p id="ausencia-d" class="grande">
        {#if a.infinitos > 0}
          <span class="cifra num">+{formato(a.cristales)}</span>
          <span class="unidad">{txt.ausencia.cristales}</span>
        {:else}
          <span class="cifra num">+{formato(a.energia)}</span>
          <span class="unidad">{txt.ausencia.energia}</span>
        {/if}
      </p>
      <ul class="ganado num">
        <li>{a.infinitos > 0
          ? `${txt.ausencia.infinitos(a.infinitos)} · ${txt.ausencia.reliquias(a.infinitos, txt.cristal.relicario.regla.modos[a.s.relicario.regla.modo])}`
          : infinitoRoto(a.s) ? txt.ausencia.sinInfinitoRoto : txt.ausencia.sinInfinito}</li>
        {#if ab > 0}
          <li class="estratos">
            <span>{txt.ausencia.estratos}</span>
            {#each a.s.estratos.s.slice(0, ab) as sk, k (k)}
              {@const d = sk - (a.estratosAntes[k] ?? sk)}
              <span class="chip">{txt.ausencia.estrato(k + 1)} {txt.ausencia.crecio(d.toLocaleString(txt.locale, { maximumFractionDigits: 1 }))}</span>
            {/each}
          </li>
        {/if}
        {#if a.s.escarcha.logX > a.escarchaAntes}
          <li>{txt.ausencia.escarcha((a.s.escarcha.logX - a.escarchaAntes).toLocaleString(txt.locale, { maximumFractionDigits: 1 }))}</li>
        {/if}
      </ul>
      <p class="detalle num">
        {a.segundos >= CFG.fuera_de_linea.tope_horas * 3600
          ? txt.ausencia.tope(CFG.fuera_de_linea.tope_horas)
          : txt.ausencia.tiempo(txt.duracion(a.segundos))}
        <span class="sep">·</span>{txt.ausencia.eficiencia(CFG1.fuera_de_linea_eficiencia.toLocaleString(txt.locale))}
      </p>
      <button class="accion" use:enfocar onclick={cerrar}>{txt.ausencia.seguir}</button>
    </div>
  </div>
{:else if hayEleccion() && juego.panel === null}
  {@const rel = juego.s.relicario}
  {@const lleno = inventarioLleno(juego.s)}
  <div class="velo" class:quieto={ajustes.reducirDestellos}>
    <div class="centro hielo placa eleccion" role="dialog" aria-modal="true" aria-labelledby="reliquia-t" aria-describedby="reliquia-d">
      <canvas class="cara" use:caraReliquia={{ foto: rel.foto, nivel: 0 }} aria-hidden="true"></canvas>
      <h2 id="reliquia-t" class="titulo">{r.elegir}</h2>
      {#if rel.faltan > 1}
        <label class="dos"><input type="checkbox" bind:checked={lasDos} /> {r.lasDos}</label>
      {/if}
      {#if rel.faltan > 1}<p class="rotulo dosde">{r.deDos(1)}</p>
      {:else if rel.piezas.some((p) => p.inf === rel.pendiente)}<p class="rotulo dosde">{r.deDos(2)}</p>{/if}
      <p id="reliquia-d" class="texto">{lleno ? r.llenoPop : r.elegirQue}</p>
      {#if lleno && fusionables(juego.s).length}<button class="gema fusionar" onclick={() => (juego.s = fusionarTodo(juego.s))}>{r.fusionarTodo}</button>{/if}
      <div class="tipos">
        {#each TIPOS as t, i (t)}
          <button class="gema" style:--c="var(--ambar)" use:enfocar={i === 0} onclick={() => tomar(t)}>
            <span class="sello"><IconoTipo tipo={t} /></span>
            <b>{r.tipos[t][0]}</b>
            <span class="efecto">{r.tipos[t][1](efectoNivel(t, 0))}</span>
            <small class="num">{r.faltan(3 - ambar(t))}</small>
          </button>
        {/each}
      </div>
    </div>
  </div>
{:else if juego.ausencia}
  {@const a = juego.ausencia}
  <div class="velo" class:quieto={ajustes.reducirDestellos} role="presentation" onclick={afuera}>
    <div class="centro recompensa" role="dialog" aria-modal="true" aria-labelledby="ausencia-t" aria-describedby="ausencia-d">
      <p id="ausencia-t" class="rotulo">{txt.ausencia.titulo}</p>
      <p id="ausencia-d" class="grande">
        <span class="cifra num">+{formato(a.energia)}</span>
        <span class="unidad">{txt.ausencia.energia}</span>
      </p>
      <p class="detalle num">
        {a.segundos >= CFG.fuera_de_linea.tope_horas * 3600
          ? txt.ausencia.tope(CFG.fuera_de_linea.tope_horas)
          : txt.ausencia.tiempo(txt.duracion(a.segundos))}
        {#if a.compresiones > 0}<span class="sep">·</span>{txt.ausencia.compresiones(a.compresiones)}{/if}
      </p>
      <button class="accion" use:enfocar onclick={cerrar}>{txt.ausencia.seguir}</button>
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

  .acciones { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem; }
  .chico { margin: 1.5rem 0 0.5rem; font-size: 0.875rem; }
  .codigo {
    width: 100%; padding: 0.5rem 0; border: 0; border-bottom: 1px solid var(--borde); background: none; color: var(--tenue);
    font: 0.75rem/1.4 ui-monospace, monospace; resize: none; word-break: break-all;
  }

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

  @keyframes fundido { from { opacity: 0; } }

  /* Capa 1: la misma jerarquía, sobre una placa de hielo (hielo.css) y con el premio en cian. */
  /* La placa de hielo: el ancho incluye el relleno y nada se sale de ella (cifras de miles de dígitos, ocho estratos). */
  .hielo { box-sizing: border-box; width: min(34rem, 100% - 2rem); padding: 1.75rem 1.5rem 1.5rem; }
  .hielo > * { max-width: 100%; min-width: 0; }
  .hielo .detalle { text-wrap: balance; }
  .hielo .cifra { color: var(--hielo); text-shadow: 0 0 2.5rem color-mix(in srgb, var(--hielo) 40%, transparent), 0 0 0.75rem color-mix(in srgb, var(--hielo) 25%, transparent); }
  .hielo .cifra { font-size: clamp(2.25rem, 8vw, 4rem); overflow-wrap: anywhere; }
  .hielo .unidad { color: var(--hielo); }
  .hielo .detalle { margin-bottom: 1.5rem; font-size: 0.875rem; }
  .ganado { display: grid; gap: 0.5rem; margin: 0 0 1rem; padding: 0; list-style: none; font-size: 1rem; color: var(--tinta); }
  .ganado .estratos { display: flex; flex-wrap: wrap; justify-content: center; align-items: baseline; gap: 0.375rem 0.5rem; color: var(--tenue); }
  .chip { padding: 0.125rem 0.5rem; border: 1px solid var(--hielo-linea); color: var(--tinta); font-size: 0.875rem; }
  .recompensa .ganado { animation: subir 0.5s 0.35s ease-out backwards; }
  .calculando { gap: 1rem; }
  .calculando.hielo { padding: 1.75rem 1.5rem; }
  .calculando .detalle { margin: 0; }
  .pista { width: 100%; height: 0.375rem; background: rgb(232 233 243 / 0.08); overflow: hidden; }
  .lleno { display: block; height: 100%; background: var(--ambar); transition: width 0.15s linear; }
  .hielo .lleno { background: linear-gradient(90deg, color-mix(in srgb, var(--hielo) 55%, transparent), var(--hielo)); box-shadow: 0 0 0.75rem color-mix(in srgb, var(--hielo) 50%, transparent); }

  /* La elección de reliquia: la pila de este Infinito arriba y las tres gemas, una por tipo. */
  .eleccion { gap: 0; }
  .eleccion .cara { width: 4.5rem; height: 4.5rem; margin-bottom: 0.75rem; clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); background: var(--hielo-hondo); }
  .eleccion .texto { margin-bottom: 1.25rem; font-size: 0.9375rem; }
  .eleccion .dos { display: flex; align-items: center; gap: 0.5rem; min-height: 2.75rem; margin: -0.5rem 0 0.25rem; font-size: 0.9375rem; cursor: pointer; }
  .eleccion .dos input { width: 1.1rem; height: 1.1rem; accent-color: var(--ambar); }
  .eleccion .dosde { margin: 0 0 0.5rem; font-size: 0.875rem; }
  .eleccion .fusionar { margin: -0.5rem 0 1rem; padding: 0.5rem 1.5rem; }
  .tipos { display: grid; gap: 0.5rem; width: 100%; }
  .tipos .gema { display: grid; grid-template-columns: 2rem 1fr; gap: 0.1rem 0.85rem; align-items: center; min-height: 3.5rem; padding: 0.55rem 1.5rem; text-align: left; font: inherit; }
  .tipos .sello { grid-row: span 3; width: 2rem; height: 2rem; color: var(--ambar); }
  .tipos b { font-size: 1.0625rem; }
  .tipos .efecto { font-size: 0.8125rem; color: var(--tenue); }
  .tipos small { font-size: 0.75rem; color: var(--hielo); }
  .eleccion .tipos { animation: subir 0.5s 0.15s ease-out backwards; }
  .quieto .eleccion .tipos { animation-name: fundido; }

  @media (max-width: 767px) {
    .velo { background: rgb(7 8 15 / 0.88); } /* la tienda en hoja queda detrás del texto: más oscuro */
  }
</style>
