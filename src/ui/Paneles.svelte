<script lang="ts">
  // Lo que flota sobre la pila: "Mientras no estabas" y el guardado dañado. Y Escape y el foco de todas las pantallas.
  // Un solo lenguaje: velo oscuro translúcido, sin cajas, jerarquía por tamaño, números con cifras tabulares.
  import { untrack } from 'svelte'
  import { CFG } from '../core'
  import { es } from '../strings/es'
  import { ajustes } from './ajustes.svelte'
  import { formato } from './formato'
  import { juego } from './juego.svelte'


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
  }
  const teclaVentana = (e: KeyboardEvent) => e.key === 'Escape' && !juego.guardadoRoto && abierto && cerrar()
  const afuera = (e: MouseEvent) => e.target === e.currentTarget && cerrar()

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

  @keyframes fundido { from { opacity: 0; } }

  @media (max-width: 767px) {
    .velo { background: rgb(7 8 15 / 0.88); } /* la tienda en hoja queda detrás del texto: más oscuro */
  }
</style>
