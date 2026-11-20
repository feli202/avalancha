<script lang="ts">
  // v1.0, bloque 7: la tarjeta de comunidad. Una sola vez por dispositivo, a los 10 minutos de juego activo (pestaña
  // visible y fuera del título), para todos. Nunca encima de un pop-up de reliquias, de una cinemática o de otro cartel.
  import { onDestroy } from 'svelte'
  import { instalar } from '../instalar.svelte'
  import { txt } from '../strings'
  import Comunidad from './Comunidad.svelte'
  import { hayCartel, juego } from './juego.svelte'

  const VISTO = 'avalancha.comunidad'
  const ACTIVO = 'avalancha.comunidad.activo'
  const ESPERA_S = 600
  const leer = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
  const escribir = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sin almacenamiento */ } }

  let abierta = $state(false)
  let activo = Number(leer(ACTIVO)) || 0
  const reloj = leer(VISTO) ? undefined : setInterval(() => {
    if (document.hidden || juego.titulo) return
    activo++
    if (activo % 10 === 0) escribir(ACTIVO, String(activo))
    if (activo >= ESPERA_S && !abierta && !hayCartel() && !juego.cinematica && !instalar.abierta && juego.calculo === null) {
      abierta = true
      escribir(VISTO, '1')
      clearInterval(reloj)
    }
  }, 1000)
  onDestroy(() => clearInterval(reloj))
  const cerrar = () => (abierta = false)
  const enfocar = (el: HTMLElement) => el.focus()
</script>

{#if abierta}
  <div class="fondo" role="presentation" onclick={(e) => e.target === e.currentTarget && cerrar()}>
    <div class="tarjeta placa grietas" role="dialog" aria-modal="true" aria-labelledby="comunidad-titulo" tabindex="-1" use:enfocar
      onkeydown={(e) => e.key === 'Escape' && cerrar()}>
      <img class="pila" src="{import.meta.env.BASE_URL}iconos/icono-192.png" alt="" width="64" height="64" />
      <h2 id="comunidad-titulo">{txt.comunidad.titulo}</h2>
      <p>{txt.comunidad.texto}</p>
      <Comunidad onclick={cerrar} />
      <button class="secundario" onclick={cerrar}>{txt.comunidad.ahoraNo}</button>
    </div>
  </div>
{/if}

<style>
  .fondo { position: fixed; inset: 0; z-index: 45; display: grid; place-items: center; padding: 1rem; background: rgb(4 6 13 / 0.6); animation: fundido 0.4s ease-out; }
  .tarjeta {
    box-sizing: border-box; width: min(26rem, 100%); max-height: calc(100dvh - 2rem); overflow-y: auto; padding: 1.4rem 1.4rem 1rem;
    display: grid; justify-items: center; gap: 0.9rem; text-align: center; color: var(--escarcha); outline: none;
  }
  .pila { width: 4rem; height: 4rem; border-radius: 0.9rem; box-shadow: 0 0 1.5rem rgb(159 227 245 / 0.18); }
  h2 { margin: 0; font-size: 1.3rem; font-weight: 600; letter-spacing: -0.02em; }
  p { margin: 0; font-size: 0.95rem; line-height: 1.45; color: var(--tenue); text-wrap: pretty; }
  .secundario { min-height: 2.75rem; padding: 0.4rem 1rem; background: none; border: 0; color: var(--tenue); font: inherit; font-size: 0.9rem; cursor: pointer; }
  @keyframes fundido { from { opacity: 0; } }
</style>
