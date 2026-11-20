<script lang="ts">
  // Llega una partida de itch.io en el hash (#import=..., src/guardado/pase.ts). Se valida, se muestran las dos lado a lado y
  // solo se reemplaza con "Cargar la de itch.io"; antes, la de acá queda en el respaldo (Ajustes → Partida).
  // El hash se borra al decidir (o al fallar): una recarga con el diálogo abierto lo vuelve a preguntar.
  import { FalloPase, decodificarPase, paseDeHash, reemplazarConRespaldo } from '../guardado/pase'
  import type { Partida } from '../guardado/guardado'
  import type { State } from '../core'
  import { TRAIDA } from '../instalar.svelte'
  import { txt } from '../strings'
  import { formato } from './formato'
  import { juego, reemplazarPartida } from './juego.svelte'

  const t = txt.pase
  const codigo = paseDeHash(location.hash)
  let llegada = $state.raw<Partida | null>(null)
  let fallo = $state('')

  const borrarHash = () => history.replaceState(history.state, '', location.pathname + location.search)
  if (codigo)
    decodificarPase(codigo).then(
      (p) => (llegada = p),
      (e) => { fallo = e instanceof FalloPase ? e.motivo : 'invalida'; borrarHash() },
    )

  function cargar() {
    if (!llegada) return
    borrarHash()
    try { sessionStorage.setItem(TRAIDA, '1') } catch {}
    // M6: arranca ahora (si no, el tiempo desde el guardado de itch.io contaría como fuera de línea).
    const p = { ...llegada, guardadoEn: Date.now() }
    if (!reemplazarPartida((a) => reemplazarConRespaldo(a, p))) { llegada = null; fallo = 'escribir' }
  }
  function quedarme() {
    borrarHash()
    llegada = null
  }
  const enfocar = (el: HTMLElement) => el.focus()
  const filas = (s: State | null) => (s ? [txt.duracion(s.tiempoTotal), formato(s.energia), formato(s.cristalesTotales)] : [t.sinPartida, '—', '—'])
</script>

<!-- Con otra pestaña jugando espera a "Jugar acá" (recarga con el hash puesto): si no, esa pestaña pisaría la partida al guardar. -->
{#if (llegada || fallo) && !juego.otraPestana}
  <div class="fondo">
    <div class="tarjeta placa grietas" role="alertdialog" aria-modal="true" aria-labelledby="pase-titulo">
      {#if llegada}
        <h2 id="pase-titulo">{t.pregunta}</h2>
        <p>{t.texto}</p>
        <table class="num">
          <thead><tr><th></th><th>{t.esta}</th><th class="itch">{t.itch}</th></tr></thead>
          <tbody>
            {#each [t.tiempo, t.energia, t.cristales] as rotulo, i}
              <tr><th scope="row">{rotulo}</th><td>{filas(juego.hayPartida ? juego.s : null)[i]}</td><td class="itch">{filas(llegada.estado)[i]}</td></tr>
            {/each}
          </tbody>
        </table>
        {#if juego.hayPartida}<p class="chico">{t.respaldo}</p>{/if}
        <div class="acciones">
          <button class="gema" onclick={cargar}>{t.cargar}</button>
          <button class="secundario" use:enfocar onclick={quedarme}>{t.quedarme}</button>
        </div>
      {:else}
        <h2 id="pase-titulo">{t.fallo}</h2>
        <p>{t.motivos[fallo]}</p>
        <p>{t.nadaPerdido}</p>
        <div class="acciones"><button class="gema" use:enfocar onclick={() => (fallo = '')}>{t.entendido}</button></div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .fondo { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 1rem; background: rgb(4 6 13 / 0.75); }
  .tarjeta { box-sizing: border-box; width: min(30rem, 100%); max-height: calc(100dvh - 2rem); overflow-y: auto; padding: 1.4rem;
    display: grid; gap: 0.85rem; text-align: center; color: var(--escarcha); }
  h2 { margin: 0; font-size: 1.3rem; font-weight: 600; letter-spacing: -0.02em; }
  p { margin: 0; font-size: 0.9rem; line-height: 1.45; color: var(--tenue); }
  p.chico { font-size: 0.8rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { padding: 0.45rem 0.4rem; border-bottom: 1px solid var(--hielo-linea); }
  thead th { font-weight: 600; font-size: 0.8rem; color: var(--tenue); }
  tbody th { text-align: left; font-weight: 400; color: var(--tenue); }
  td { text-align: center; }
  .itch { color: var(--hielo); }
  .acciones { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; }
  .gema { min-height: 2.75rem; padding: 0.5rem 1.4rem; font: inherit; font-weight: 600; color: var(--escarcha); cursor: pointer; }
  .secundario { min-height: 2.75rem; padding: 0.4rem 1rem; background: none; border: 0; color: var(--tenue); font: inherit; font-size: 0.9rem; cursor: pointer; }
</style>
