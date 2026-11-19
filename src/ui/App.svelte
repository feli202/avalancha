<script lang="ts">
  // Interfaz principal (SPEC 6.4). Cada parte aparece recién cuando juego.vistos lo dice (SPEC 5).
  import { anillos, autoDisponible, congelada, cristalesAlInfinito, densidad, enElOptimo, enInfinito, infinitoRoto, metaLog10, multAnillos, produccion, puedeComprimir, type DefectoId } from '../core'
  import { cambios, nombre as nombreDef } from './defectos'
  import { txt } from '../strings'
  import { ajustes } from './ajustes.svelte'
  import Ayuda from './Ayuda.svelte'
  import { ayuda, ayudaAnillos, ayudaComprimir, ayudaDensidad, ayudaEnergia, ayudaProduccion, ayudaSimple } from './ayudas.svelte'
  import Capas from './Capas.svelte'
  import ComoFunciona from './ComoFunciona.svelte'
  import Debug from './Debug.svelte'
  import Opciones from './Opciones.svelte'
  import Estadisticas from './Estadisticas.svelte'
  import Logros from './Logros.svelte'
  import Paneles from './Paneles.svelte'
  import Pila from './Pila.svelte'
  import Sismografo from './Sismografo.svelte'
  import Tienda from './Tienda.svelte'
  import Titulo from './Titulo.svelte'
  import { formato, formatoMult, hablado } from './formato'
  import { fade } from 'svelte/transition'
  import { abandonarDefectoYa, caminoInfinito, comprimirYa, hayCartel, hayPanel, infinitoYa, invitaTocar, juego, ponerZoomT, progresoCompresion, zoomT } from './juego.svelte'
  import { PX_MAX } from '../render/pilaVisual'
  import { foto, guardarImagen } from './foto.svelte'

  const v = $derived(juego.vistos)
  // CORRECCIONES 1: los números se refrescan a 10 Hz como mucho (con "Reducir destellos"); la economía sigue en juego.s.
  const VER_MS = 100
  let visto = 0
  $effect(() => {
    const e = juego.s
    if (ajustes.calma && performance.now() - visto < VER_MS) return
    visto = performance.now()
    juego.ver = e
  })
  const s = $derived(juego.ver)

  // Compresión: el anillo alrededor de la pila (Pila.svelte) muestra el progreso; acá, el botón con meta y porcentaje.
  const comp = $derived(progresoCompresion(s))
  // SPEC_CAPA1 §4: con la Energía en 1e308 el botón pasa a Infinito. El primero llega solo, con su cinemática (juego.svelte.ts).
  const alInf = $derived(enInfinito(s))
  // §8: dentro de un Defecto no hay Infinito: termina en la meta o abandonando.
  const def = $derived(s.defectos.actual as DefectoId | '')
  const infinitoListo = $derived(alInf && s.infinitos > 0 && !def)
  const lista = $derived(puedeComprimir(s) || infinitoListo)
  const accion = () => (infinitoListo ? infinitoYa() : comprimirYa())
  const fin = $derived(juego.cinematica)
  const alternarAutoComp = () =>
    (juego.s = { ...juego.s, auto: { ...juego.s.auto, compresion_auto: !juego.s.auto.compresion_auto } })

  // C comprime, P guarda la imagen (Espacio y M viven en Pila y Tienda).
  function tecla(e: KeyboardEvent) {
    // Los paneles se abren desde cualquier capa (los íconos están en todas): basta con que no haya otro encima.
    const libre = !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !hayCartel() &&
      !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
    // SPEC 5: Ajustes desde el inicio (sonido, accesibilidad); el resto aparece con la tienda.
    const conTienda = libre && juego.vistos.tienda
    if (conTienda && e.code === 'KeyL') juego.panel = 'logros'
    if (conTienda && e.code === 'KeyE') juego.panel = 'estadisticas'
    if (libre && e.code === 'KeyA') juego.panel = 'ajustes'
    if (conTienda && e.code === 'KeyP') guardarImagen()
    if (conTienda && e.code === 'KeyH') juego.panel = 'ayuda'
    if (e.code !== 'KeyC' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || hayPanel()) return
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (juego.vistos.compresion && lista) accion()
  }

  // Al dejar el título, la clase .entrando escalona la aparición; después se saca (lo que aparezca más tarde usa .aparece).
  const ENTRADA_MS = 3000
  let entrando = $state(false)
  let enTitulo = juego.titulo
  $effect.pre(() => { // .pre: la clase llega en el mismo cuadro en que se va .en-titulo
    if (!enTitulo || juego.titulo) return
    enTitulo = false
    entrando = true
    setTimeout(() => (entrando = false), ENTRADA_MS)
  })

  // Móvil: la tienda es una hoja inferior; se arrastra o se toca la manija.
  let alta = $state(false)
  let arrastre = $state<number | null>(null)
  let y0 = 0
  function bajar(e: PointerEvent) {
    y0 = e.clientY
    arrastre = 0
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const mover = (e: PointerEvent) => arrastre !== null && (arrastre = e.clientY - y0)
  function soltar() {
    if (arrastre === null) return
    if (Math.abs(arrastre) < 6) alta = !alta // un toque
    else if (arrastre < -40) alta = true
    else if (arrastre > 40) alta = false
    arrastre = null
  }
</script>

<svelte:window onkeydown={tecla} />

<!-- .lista: se puede comprimir; el botón y el anillo de la pila laten juntos (arrancan en el mismo cuadro). -->
<!-- inert con un panel encima: el foco y los clics quedan en el panel. -->
<div class="juego" class:con-capas={s.infinitos > 0} class:en-titulo={juego.titulo} class:entrando class:quieto={ajustes.reducirDestellos} class:lista class:fin class:alejado={juego.panel !== null} inert={hayPanel()}>
  <Pila />
  {#if v.compresion && !infinitoRoto(s)}
    <!-- Camino al Infinito: log10(Energía) / log10(Infinito), con una marca en cada umbral de Compresión. Se va al romperlo. -->
    {@const c = caminoInfinito(s)}
    <div class="camino aparece" role="meter" aria-valuemin={0} aria-valuemax={1} aria-valuenow={c.p} aria-label={txt.caminoInfinito(`${formato(s.energia)} / 1e308`)} style:--p={c.p}>
      {#each c.marcas as m}<i class:pasada={c.p >= m} style:--m={m}></i>{/each}
      <span aria-hidden="true">∞</span>
    </div>
  {/if}

  <header class="izq">
    <span class="etiqueta">{txt.energia}</span>
    {#if congelada(s)}<span class="energia infinito">{txt.infinito}</span>{:else}{#key juego.primera}<span use:ayuda={ayudaEnergia} class="energia num" class:salta={juego.primera} aria-hidden="true">{formato(s.energia)}</span>{/key}<span class="sr">{hablado(formato(s.energia))}</span>{/if}
    {#if v.tienda}<span class="linea num aparece" use:ayuda={() => ayudaProduccion(juego.s)}><b class="ambar" aria-hidden="true">+{formato(produccion(s))}</b><span class="sr">{hablado(formato(produccion(s)))}</span> {txt.energiaPorSegundo}</span>{/if}
    {#if s.compresiones > 0}
      <span class="linea num aparece" use:ayuda={() => ayudaDensidad(juego.s)}>{txt.densidad} <b>^{formatoMult(densidad(s))}</b></span>
    {/if}
    {#if s.infinitos > 0}<span class="linea num aparece">{txt.cristal.cristales} <b class="hielo">{formato(s.cristales)}</b></span>{/if}
    {#if def}
      <!-- §8: el Defecto en curso, su meta, lo que cambia y abandonar. -->
      <div class="defecto aparece">
        <span class="linea"><b>{txt.cristal.defectos.enArena(nombreDef(def))}</b> <span class="num">{txt.cristal.defectos.meta(metaLog10(def))}</span></span>
        <ul class="num">{#each cambios(s) as c}<li>{txt.cristal.defectos.mult[c.id]} <b>{c.dentro}</b></li>{/each}</ul>
        <button class="abandonar" onclick={abandonarDefectoYa}>{txt.cristal.defectos.abandonar}</button>
      </div>
    {/if}
  </header>


  {#if juego.aviso}
    {#key juego.aviso.id}<p class="aviso" role="status">{juego.aviso.texto}</p>{/key}
  {/if}

  {#if juego.sinGuardar}<p class="sin-guardar" role="alert">{txt.sinGuardar}</p>{/if}

  {#if invitaTocar()}<p class="pista" out:fade={{ duration: 300 }}>{txt.pista}</p>{/if}

  {#if v.derrumbes}
    <footer class="sismo aparece">
      <div class="tocable" use:ayuda={() => ayudaSimple(txt.sismografo, txt.guia.que.sismografo)}><Sismografo /></div>
      <p class="chico num">
        {#if v.anillos}<span class="aparece tocable" data-guia="anillos" use:ayuda={() => ayudaAnillos(juego.s)}>{txt.anillos(anillos(s.granos))} <b>{txt.mult(formatoMult(multAnillos(s)))}</b></span>{/if}
        {#if juego.escalaK > 0}{#key juego.escalaK}<span class="aparece tocable" use:ayuda={() => ayudaSimple(txt.escala(juego.escalaK), txt.guia.que.escala)}>{txt.escala(juego.escalaK)}</span>{/key}{/if}
      </p>
    </footer>
  {/if}

  <!-- Con la hoja de la tienda subida (celular) el zoom se va: quedaba encima de la hoja y se tocaba sin querer. -->
  {#if v.tienda && !fin && !alta}
    <!-- Zoom de la pila: de la pila entera (izquierda, encuadre automático) al tamaño del primer grano. -->
    <input
      class="zoom aparece" type="range" min="0" max="1" step="0.01" value={zoomT()} disabled={juego.zoomMin >= PX_MAX}
      aria-label={txt.zoom.nombre} title={txt.zoom.pista}
      oninput={(e) => ponerZoomT(+e.currentTarget.value)} ondblclick={() => (juego.zoom = 0)}
    />
  {/if}

  {#if v.tienda}
    <section
      class="der aparece"
      class:alta
      class:arrastrando={arrastre !== null}
      style:--arrastre="{arrastre ?? 0}px"
      aria-label={txt.tienda}
    >
      <button
        class="manija"
        aria-label={alta ? txt.cerrarTienda : txt.abrirTienda}
        aria-expanded={alta}
        onpointerdown={bajar}
        onpointermove={mover}
        onpointerup={soltar}
        onpointercancel={soltar}
      ></button>
      <div class="contenido">
        <Tienda />
        {#if v.compresion}
          <!-- Después de la última Compresión la meta es el Infinito: el primero llega solo; los siguientes, con este botón. -->
          <button class="comprimir aparece" data-guia="compresion" use:ayuda={() => ayudaComprimir(juego.s)} disabled={!lista} onclick={accion} aria-keyshortcuts="C">
            <span class="nombre">{comp.final || alInf ? (def ? nombreDef(def) : txt.haciaInfinito) : txt.comprimir}</span>
            <span class="meta num">
              {#if !comp.final}{txt.compresion(s.compresiones + 1)}{' · '}{/if}{txt.meta(comp.meta)} · <b>{txt.progreso(comp.p)}</b>
              {#if !lista && juego.eta !== null} · {txt.eta(txt.duracion(juego.eta))}{/if}
              {#if s.infinitos > 0 && alInf && infinitoRoto(s) && !def}
                <!-- C6 (§4): con el Infinito roto, cuánto daría y a qué ritmo; brilla cuando el ritmo deja de subir. -->
                {@const c = cristalesAlInfinito(s)}
                <b class="hielo cristales-inf" class:optimo={enElOptimo(s)} data-guia="c1_romper">{txt.cristal.alInfinito(formato(c), formatoMult(c.mul(60 / Math.max(1, s.tiempoInfinito))))}</b>
              {:else if s.infinitos > 0 && (comp.final || alInf)} · <b class="hielo">{txt.cristal.ganados(formato(cristalesAlInfinito(s)))}</b>{/if}
            </span>
          </button>
          {#if autoDisponible(s, 'compresion_auto') && !comp.final}
            <label class="autocomp aparece" data-guia="auto_compresion_auto" use:ayuda={() => ayudaSimple(txt.compresionAuto, txt.guia.que.auto)}>
              <input type="checkbox" checked={s.auto.compresion_auto} onchange={alternarAutoComp} /> {txt.compresionAuto}
            </label>
          {/if}
        {/if}
      </div>
    </section>
  {/if}
</div>

<Capas />

<!-- Los íconos (foto, logros, estadísticas, ajustes, ayuda) están en todas las capas: fuera de .juego, que queda inert fuera de la
     Arena. Llevan .juego por las variables de margen y las mismas entradas y salidas. -->
<div class="juego iconos" class:en-titulo={juego.titulo} class:entrando class:fin class:alejado={juego.panel !== null} inert={hayCartel()}>
  <div class="ajustes">
    {#if v.tienda}
    <button class="icono" aria-label={txt.menu.guardarImagen} title={txt.menu.guardarImagen} aria-keyshortcuts="P" onclick={guardarImagen}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M1.5 6a1.5 1.5 0 0 1 1.5-1.5h2.2L6.7 2.5h4.6l1.5 2H15A1.5 1.5 0 0 1 16.5 6v8a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 14z" /><circle cx="9" cy="9.75" r="3" />
      </svg>
    </button>
    <button class="icono" aria-label={txt.menu.logros} aria-haspopup="dialog" aria-keyshortcuts="L" onclick={() => (juego.panel = 'logros')}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M5 2.5h8v4a4 4 0 0 1-8 0zM9 10.5v3M6 15.5h6M5 4H2.5a2.5 2.5 0 0 0 2.6 3M13 4h2.5a2.5 2.5 0 0 1-2.6 3" />
      </svg>
    </button>
    <button class="icono" aria-label={txt.menu.estadisticas} aria-haspopup="dialog" aria-keyshortcuts="E" onclick={() => (juego.panel = 'estadisticas')}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 15.5V9M7 15.5V3M11 15.5V7M15 15.5v-4M1.5 15.5h15" /></svg>
    </button>
    {/if}
    <button class="icono" aria-label={txt.menu.abrir} aria-haspopup="dialog" aria-keyshortcuts="A" onclick={() => (juego.panel = 'ajustes')}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M2 5h8M14 5h2M2 13h2M8 13h8" /><circle cx="12" cy="5" r="2" /><circle cx="6" cy="13" r="2" />
      </svg>
    </button>
    {#if v.tienda}
    <button class="icono" aria-label={txt.menu.ayuda} aria-haspopup="dialog" aria-keyshortcuts="H" onclick={() => (juego.panel = 'ayuda')}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="7.5" /><path d="M6.9 6.9a2.2 2.2 0 1 1 3 2.05c-.55.22-.9.7-.9 1.3v.5" /><circle class="lleno" cx="9" cy="13" r="0.4" />
      </svg>
    </button>
    {/if}
  </div>
</div>

<!-- La foto: un destello suave al tocar y el aviso al terminar. -->
{#key foto.destello}{#if foto.destello}<div class="destello" class:quieto={ajustes.reducirDestellos} aria-hidden="true"></div>{/if}{/key}
{#key foto.guardada}{#if foto.guardada}<p class="guardada" role="status">{txt.foto.guardada}</p>{/if}{/key}

{#if juego.titulo}<Titulo />{/if}

<Paneles />
<Logros />
<Estadisticas />
<Opciones />
<ComoFunciona />
<Ayuda />

{#if import.meta.env.DEV}<Debug />{/if}

<style>
  /* Escritorio: el canvas ocupa la ventana y la pila queda en el centro exacto. La interfaz flota encima, sin cajas,
     en dos columnas del mismo ancho (simetría alrededor de la pila). */
  .juego { --col: clamp(16rem, 21vw, 21rem); --margen: 2rem; }
  /* Ventanas poco anchas (4:3, 16:10, 16:9): la pila no se corre, se achica para no quedar debajo de las columnas. */
  .juego { --pila-radio-max: max(4rem, calc(50vw - var(--col) - 2 * var(--margen))); } /* con 0 la pila no tendría límite */
  /* Apaisada y chica (reproductor de itch.io, 640×360): columnas y márgenes más chicos para que la pila entre en el medio. */
  @media (orientation: landscape) and (max-width: 900px) { .juego { --col: 12.5rem; --margen: 1rem; font-size: 0.875rem; } }

  /* I5: en el título solo está la pila; al entrar, la interfaz aparece en orden mientras la cámara se acerca (Pila.svelte). */
  .en-titulo :is(.izq, .ajustes, .sismo, .der, .pista, .aviso, .zoom, .camino) { visibility: hidden; }
  .entrando .izq { animation: aparecer 0.8s 0.9s ease-out backwards; }
  .entrando .sismo { animation: aparecer 0.8s 1.3s ease-out backwards; }
  .entrando .pista { animation: aparecer 0.8s 1.5s ease-out backwards, latir 2.4s 2.3s ease-in-out infinite; }
  .entrando .der { animation: fundido 0.8s 1.7s ease-out backwards; }
  .entrando :is(.ajustes, .zoom) { animation: fundido 0.8s 2.1s ease-out backwards; }

  .izq, .sismo, .der, .aviso, .pista, .sin-guardar { text-shadow: 0 0 0.75rem var(--fondo), 0 0 0.25rem var(--fondo); }
  b { font-weight: 600; color: var(--tinta); }
  .ambar { color: var(--ambar); }
  /* La primera avalancha: el número salta y se enciende. */
  .salta { transform-origin: left center; animation: salta 0.7s cubic-bezier(0.3, 1.6, 0.5, 1); }
  .quieto .salta { animation-name: encender; }
  @keyframes salta { 30% { transform: scale(1.3); color: var(--ambar); text-shadow: 0 0 1.5rem var(--ambar); } }
  @keyframes encender { 30% { color: var(--ambar); } }

  /* Con la barra de capas (Capas.svelte) la columna izquierda le deja lugar; la pila no se mueve. */
  .juego.con-capas { --barra: 5.25rem; }
  .izq {
    position: fixed; top: var(--margen); left: calc(var(--margen) + var(--barra, 0px)); width: var(--col);
    display: grid; justify-items: start; pointer-events: none;
  }
  .etiqueta { font-size: 0.875rem; color: var(--tenue); }
  /* Camino al Infinito: una línea de 2 px en el margen izquierdo, como el anillo de Compresión (blanco tenue); se llena de
     abajo hacia arriba y las marcas de los umbrales ya pasados se encienden. */
  .camino {
    position: fixed; left: calc(var(--barra, 0px) + 0.75rem); top: 22vh; bottom: 22vh; width: 2px; pointer-events: none;
    background: linear-gradient(to top, rgb(232 233 243 / 0.6) calc(var(--p) * 100%), rgb(232 233 243 / 0.08) 0);
    transition: background 0.3s linear;
  }
  .camino::after { /* la punta: un grano que brilla donde va la Energía */
    content: ''; position: absolute; left: 50%; bottom: calc(var(--p) * 100%); width: 5px; height: 5px; translate: -50% 50%;
    border-radius: 50%; background: var(--tinta); box-shadow: 0 0 6px rgb(232 233 243 / 0.8);
  }
  .camino i { position: absolute; left: -3px; bottom: calc(var(--m) * 100%); width: 8px; height: 1px; background: rgb(232 233 243 / 0.2); }
  .camino i.pasada { background: rgb(232 233 243 / 0.65); }
  .camino span { position: absolute; left: 50%; top: -1.4rem; translate: -50%; font-size: 0.8125rem; line-height: 1; color: var(--apagado); }
  .fin .camino { animation: irse 0.8s 1.2s ease-in forwards; }
  .energia { font-size: clamp(2.5rem, 4vw, 3.75rem); font-weight: 600; line-height: 1; letter-spacing: -0.03em; margin: 0.125rem 0 0.5rem; }
  .linea { font-size: 1rem; color: var(--tenue); line-height: 1.6; }
  /* §8: el Defecto en curso, con la sobriedad de la Arena: texto coral, multiplicadores en línea y abandonar como enlace. */
  .defecto { display: grid; justify-items: start; gap: 0.15rem; margin-top: 0.4rem; padding-left: 0.6rem; border-left: 1px solid var(--coral); pointer-events: auto; }
  .defecto .linea b { color: var(--coral); font-weight: 600; }
  .defecto ul { display: flex; flex-wrap: wrap; gap: 0 0.8rem; margin: 0; padding: 0; list-style: none; font-size: 0.8125rem; color: var(--tenue); }
  .defecto ul b { color: var(--tinta); font-weight: 600; }
  .abandonar { min-height: 2.75rem; padding: 0; border: 0; background: none; color: var(--apagado); font: inherit; font-size: 0.875rem; text-decoration: underline; text-underline-offset: 0.2em; cursor: pointer; }
  .abandonar:hover, .abandonar:focus-visible { color: var(--coral); }

  .aviso {
    position: fixed; top: var(--margen); left: 50%; translate: -50% 0; width: max-content;
    max-width: min(28rem, calc(100% - 2 * var(--col) - 4 * var(--margen)));
    margin: 0; font-size: 0.9375rem; text-align: center; text-wrap: balance; pointer-events: none; animation: aviso 6s ease-out forwards;
  }
  .sin-guardar {
    position: fixed; left: 50%; bottom: var(--margen); translate: -50% 0; z-index: 3; width: max-content;
    max-width: min(28rem, calc(100% - 2 * var(--col) - 4 * var(--margen))); margin: 0; font-size: 0.9375rem; color: var(--coral); text-align: center;
  }
  .pista {
    position: fixed; left: 0; right: 0; top: calc(50% + 4.5rem); margin: 0; text-align: center;
    font-size: 1.1rem; color: var(--tenue); pointer-events: none; animation: latir 2.4s ease-in-out infinite;
  }

  .sismo { position: fixed; left: calc(var(--margen) + var(--barra, 0px)); bottom: var(--margen); width: var(--col); pointer-events: none; }
  /* Abajo a la derecha de la pila, pegada a la columna de la tienda. */
  .zoom {
    position: fixed; right: calc(var(--col) + 2 * var(--margen)); bottom: calc(var(--margen) - 0.875rem); z-index: 2;
    width: 7rem; height: 2.75rem; margin: 0; accent-color: var(--tinta); cursor: pointer; opacity: 0.45; transition: opacity 0.15s;
  }
  .zoom:hover, .zoom:focus-visible { opacity: 1; }
  .zoom:disabled { opacity: 0.2; cursor: default; }
  .chico { display: flex; flex-wrap: wrap; gap: 0 1rem; margin: 0.5rem 0 0; font-size: 0.8125rem; color: var(--tenue); }

  /* La tienda arranca debajo de la fila de íconos (.ajustes): con cuatro no entran al lado de los modos. */
  .der {
    position: fixed; top: calc(var(--margen) + 2.75rem); right: var(--margen); bottom: var(--margen); width: var(--col);
    display: flex; flex-direction: column;
  }
  .contenido { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; }
  .manija { display: none; }

  .comprimir {
    display: grid; gap: 0.125rem; width: 100%; margin-top: 1.5rem; padding: 0.75rem 0; border: 0; border-top: 1px solid var(--borde);
    background: none; color: var(--tinta); font: inherit; text-align: left; cursor: pointer;
  }
  .comprimir .nombre { font-size: 1.25rem; font-weight: 600; }
  .comprimir .meta { font-size: 0.875rem; color: var(--tenue); }
  .comprimir:disabled { cursor: default; }
  .comprimir .nombre { color: var(--apagado); transition: color 0.6s; }
  /* Se puede comprimir: el texto se enciende y late, a la vez que el anillo (Pila.svelte). */
  .lista .comprimir .nombre { color: var(--tinta); animation: latido 2.4s ease-in-out infinite; }
  .quieto .comprimir .nombre { animation: none; text-shadow: 0 0 0.75rem rgb(232 233 243 / 0.6); }
  @keyframes latido {
    0%, 100% { text-shadow: 0 0 0.75rem rgb(232 233 243 / 0.7), 0 0 0.25rem var(--fondo); }
    50% { text-shadow: 0 0 0.25rem rgb(232 233 243 / 0.2), 0 0 0.25rem var(--fondo); opacity: 0.75; }
  }

  .autocomp { display: flex; align-items: center; gap: 0.5rem; min-height: 2.75rem; font-size: 0.8125rem; color: var(--tenue); cursor: pointer; }
  .autocomp input { width: 1.25rem; height: 1.25rem; margin: 0; accent-color: var(--tinta); }

  /* SPEC_CAPA1 §11, cinemática del primer Infinito (Pila.svelte): el número ya es ∞ y el resto de la Arena se apaga. */
  .infinito { animation: fundido 1.2s ease-out; text-shadow: 0 0 1.5rem rgb(255 255 255 / 0.7); }
  .juego.fin .der, .fin .sismo, .fin .aviso, .fin .ajustes { pointer-events: none; animation: irse 0.8s 1.2s ease-in forwards; }
  .fin .izq { animation: irse 0.8s 2.2s ease-in forwards; }
  @keyframes irse { to { opacity: 0; visibility: hidden; } }
  .hielo { color: var(--hielo); }
  /* C6: el indicador de Cristales con el Infinito roto; en el óptimo (§4) brilla. */
  .cristales-inf { display: block; transition: text-shadow 0.4s; }
  .cristales-inf.optimo { animation: brillo-optimo 1.6s ease-in-out infinite; }
  .quieto .cristales-inf.optimo { animation: none; text-shadow: 0 0 0.6rem var(--hielo); }
  @keyframes brillo-optimo { 50% { text-shadow: 0 0 0.8rem var(--hielo), 0 0 0.2rem var(--hielo); } }

  .destello { position: fixed; inset: 0; z-index: 20; background: #fff; pointer-events: none; opacity: 0; animation: destello 0.6s ease-out; }
  .destello.quieto { animation-duration: 0.9s; animation-name: destelloSuave; }
  @keyframes destello { 8% { opacity: 0.45; } }
  @keyframes destelloSuave { 30% { opacity: 0.12; } }
  .guardada {
    position: fixed; left: 50%; bottom: 2rem; translate: -50% 0; z-index: 20; margin: 0;
    text-shadow: 0 0 0.75rem var(--fondo), 0 0 0.25rem var(--fondo); font-size: 0.9375rem; pointer-events: none;
    animation: aviso 2.8s ease-out forwards;
  }

  /* Logros: la pila se aleja y se apaga mientras entra la pantalla (Logros.svelte). */
  .juego { transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s, filter 0.6s; }
  .juego.alejado { transform: scale(0.82); opacity: 0; filter: blur(6px); }
  .juego.quieto.alejado { transform: none; filter: none; }
  /* z-index 6: por encima de Cristalización y Automatización (4) y de la barra de capas (5): los íconos están en toda capa. */
  .ajustes { position: fixed; top: var(--margen); right: calc(var(--margen) - 0.8125rem); z-index: 6; display: flex; } /* el trazo del ícono, al ras de la lista */
  .icono {
    display: grid; place-items: center; width: 2.75rem; height: 2.75rem; padding: 0; border: 0; background: none;
    color: var(--apagado); cursor: pointer; transition: color 0.15s;
  }
  .icono:hover { color: var(--tinta); }
  .icono svg { fill: var(--fondo); stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }
  .icono .lleno { fill: currentColor; }
  /* Lo que tiene tooltip dentro de las zonas que dejan pasar los clics a la pila. */
  .izq .num, .tocable { pointer-events: auto; }

  .aparece { animation: aparecer 0.6s ease-out; }
  .der.aparece { animation-name: fundido; } /* sin transform: en móvil la hoja usa el suyo */
  @keyframes fundido { from { opacity: 0; } }
  :global(.quieto) .pista { animation: none; }
  @keyframes aparecer { from { opacity: 0; transform: translateY(4px); } }
  @keyframes aviso { 0% { opacity: 0; } 8%, 80% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes latir { 50% { opacity: 0.45; } }

  /* Solo en vertical: una ventana apaisada y chica (el reproductor de itch.io, 640×360, o un celular acostado) usa el diseño de escritorio. */
  /* Móvil (vertical): pila arriba centrada, Energía arriba, tienda como hoja inferior deslizable. */
  /* También tablet en vertical: con las columnas a los costados la pila quedaría debajo de la tienda. */
  @media (orientation: portrait) and (max-width: 1100px) {
    .juego.juego { --barra: 0px; }
    .juego { --margen: 1rem; --col: auto; --pila-radio-max: 100vw; --pila-arriba: 7rem; --pila-abajo: calc(45dvh + 3.5rem); --fondo-abajo: 45dvh; --hoja: 88dvh; }
    .izq { right: var(--margen); }
    .camino { top: calc(var(--pila-arriba) + 1.5rem); bottom: calc(var(--pila-abajo) + 1.5rem); }
    .energia { font-size: 2.25rem; margin-bottom: 0.25rem; }
    .linea { font-size: 0.875rem; line-height: 1.4; }
    .aviso { top: auto; bottom: calc(45dvh + 4rem); max-width: calc(100% - 2rem); font-size: 0.8125rem; }
    .pista { top: calc(50% - 2rem); }
    .sin-guardar { bottom: auto; top: calc(var(--margen) + 5.5rem); max-width: calc(100% - 2rem); font-size: 0.8125rem; }
    .sismo {
      right: var(--margen); bottom: calc(45dvh + 0.5rem);
      display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 1rem;
    }
    /* En la fila de la manija de la hoja, a la derecha: fuera de la región de la pila, así ni la pila ni el marco la tocan con ningún zoom. */
    .zoom { right: var(--margen); bottom: calc(45dvh - 2.75rem); z-index: 3; }
    .sismo :global(canvas) { height: 2rem; }
    .chico { flex-direction: column; align-items: end; margin: 0; font-size: 0.75rem; }
    .der {
      top: auto; left: 0; right: 0; bottom: 0; width: auto; height: var(--hoja); padding: 0 1rem 1rem;
      border-top: 1px solid var(--borde); background: rgb(7 8 15 / 0.94); text-shadow: none;
      transform: translateY(calc(var(--hoja) - 45dvh + var(--arrastre)));
      transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    /* Con la barra de capas abajo, la hoja se apoya sobre ella: el borde de arriba queda donde estaba (la pila no se mueve). */
    .con-capas .der { bottom: var(--nav); height: calc(var(--hoja) - var(--nav)); }
    .con-capas .der:not(.alta) .contenido { max-height: calc(45dvh - 3.75rem - var(--nav)); }
    .der.alta { transform: translateY(max(0px, var(--arrastre))); }
    .der.arrastrando { transition: none; }
    .manija { display: block; flex: none; width: 100%; height: 2.75rem; border: 0; background: none; cursor: grab; touch-action: none; }
    .manija::before { content: ''; display: block; width: 2.5rem; height: 3px; margin: 0 auto; border-radius: 2px; background: var(--apagado); }
    .contenido { flex: 1; }
    .der:not(.alta) .contenido { flex: none; max-height: calc(45dvh - 3.75rem); }
  }
  @media (prefers-reduced-motion: reduce) { .der { transition: none; } }
</style>
