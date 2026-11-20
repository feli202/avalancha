<script lang="ts">
  // Tarjeta "Instalá Avalancha como app" (src/instalar.svelte.ts). Se ofrece sola una vez por dispositivo, después de la
  // pantalla de título (al jugador nuevo, cuando ya tocó la pila y no hay guía en pantalla: no tapa la intro), y se abre desde Ajustes → Partida.
  import { onDestroy } from 'svelte'
  import { exportar } from '../guardado/guardado'
  import { codificarPase, urlConPase } from '../guardado/pase'
  import { URL_APP, enApp, instalar, marcarOfrecida, pedirInstalacion, plataforma, recienTraida, yaOfrecida } from '../instalar.svelte'
  import { txt } from '../strings'
  import { guardarYa, hayCartel, invitaTocar, juego, partidaActual } from './juego.svelte'

  const t = txt.instalar
  const traida = recienTraida()
  // Ofrecerla sola: con la partida de itch.io recién cargada, o la primera vez en este dispositivo.
  const ofrecer = !enApp() && (traida || (!yaOfrecida() && !juego.vistos.instalar))
  const lista = $derived(ofrecer && !juego.titulo && !juego.cinematica && juego.calculo === null && !hayCartel() && !juego.guias.length && (juego.hayPartida || !invitaTocar()))
  let ofrecida = false
  $effect(() => {
    if (!lista || ofrecida) return
    const reloj = setTimeout(() => {
      ofrecida = true
      instalar.abierta = true
      marcarOfrecida()
      juego.vistos = { ...juego.vistos, instalar: true }
    }, 1500)
    return () => clearTimeout(reloj)
  })

  const cual = $derived(plataforma())

  // ---------- itch.io: la partida va en el hash de la página de GitHub ----------
  let url = $state<string | null | undefined>(undefined) // undefined: preparando; null: demasiado larga
  let manual = $state(false)
  let codigo = $state('')
  let copiado = $state(false)
  let reloj: ReturnType<typeof setInterval> | undefined
  const preparar = async () => { try { url = urlConPase(URL_APP, await codificarPase(partidaActual())) } catch { url = null } }
  $effect(() => {
    if (!instalar.abierta || cual !== 'itch') return
    preparar()
    reloj = setInterval(preparar, 1000) // que lo que se lleva sea de hace un segundo como mucho
    return () => clearInterval(reloj)
  })
  onDestroy(() => clearInterval(reloj))
  $effect(() => { if (url === null) aManual() })

  function aManual() {
    manual = true
    codigo = exportar(partidaActual())
  }
  function llevar() {
    if (!url) return
    guardarYa()
    const w = window.open(url, '_blank') // sin noopener: si vuelve null es que el navegador o itch.io no lo dejó abrir
    if (!w) return aManual()
    w.opener = null
    cerrar()
  }
  let partidaCopiada = $state(false)
  // Sin await antes de escribir: Safari solo deja usar el portapapeles dentro del toque.
  function copiarPartida() {
    const texto = exportar(partidaActual())
    navigator.clipboard.writeText(texto).then(() => (partidaCopiada = true), () => (codigo = texto)) // sin permiso: el texto, para copiar a mano
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(codigo); copiado = true } catch {}
  }
  function cerrar() {
    instalar.abierta = false
    manual = false
    copiado = false
  }
  const enfocar = (el: HTMLElement) => el.focus()
</script>

{#if instalar.abierta}
  <div class="fondo" role="presentation" onclick={(e) => e.target === e.currentTarget && cerrar()}>
    <div class="tarjeta placa grietas" role="dialog" aria-modal="true" aria-labelledby="instalar-titulo"
      tabindex="-1" onkeydown={(e) => e.key === 'Escape' && cerrar()}>
      <img class="pila" src="{import.meta.env.BASE_URL}iconos/icono-192.png" alt="" width="64" height="64" />
      <h2 id="instalar-titulo">{t.titulo}</h2>

      {#if manual}
        <p>{url === null ? t.manualTitulo : t.bloqueado}</p>
        <ol class="pasos">
          <li><span>{t.manual[0]}</span> <button class="gema chico" onclick={copiar}>{copiado ? t.copiado : t.copiar}</button></li>
          <li><span>{t.manual[1]}</span> <a class="gema chico" href={URL_APP} target="_blank" rel="noopener">{t.abrir}</a></li>
          <li><span>{t.manual[2]}</span></li>
        </ol>
        <textarea class="codigo" readonly rows="2" aria-label={t.copiar} onfocus={(e) => e.currentTarget.select()}>{codigo}</textarea>
      {:else if cual === 'itch'}
        <p>{t.itch}</p>
        <div class="acciones">
          <button class="gema" use:enfocar disabled={!url} onclick={llevar}>{url ? t.itchBoton : t.itchPreparando}</button>
        </div>
      {:else if cual === 'prompt'}
        <p>{t.texto}</p>
        <div class="acciones"><button class="gema" use:enfocar onclick={pedirInstalacion}>{t.instalar}</button></div>
      {:else if cual === 'ios'}
        <p>{t.texto}</p>
        <ol class="pasos ios">
          {#if juego.s.tiempoTotal > 0}
            <!-- iOS: la app de la pantalla de inicio tiene su propio almacenamiento; la partida pasa por el portapapeles (TraerPartida). -->
            <li>
              <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="11" y="11" width="15" height="16" rx="3" /><path d="M7 21V8a3 3 0 0 1 3-3h10" /></svg>
              <span>{t.iosCopiar[0]} <b>{t.iosCopiar[1]}</b>{t.iosCopiar[2]}</span>
              <button class="gema chico" onclick={copiarPartida}>{partidaCopiada ? t.copiada : t.copiarPartida}</button>
            </li>
          {/if}
          <li>
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 13H8v15h16V13h-2" /><path d="M16 4v16M11 9l5-5 5 5" /></svg>
            <span>{t.iosPaso1[0]} <b>{t.iosPaso1[1]}</b> {t.iosPaso1[2]}</span>
          </li>
          <li>
            <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="5" width="22" height="22" rx="5" /><path d="M16 10v12M10 16h12" /></svg>
            <span>{t.iosPaso2[0]} <b>{t.iosPaso2[1]}</b> {t.iosPaso2[2]}</span>
          </li>
        </ol>
        {#if codigo}<textarea class="codigo" readonly rows="2" aria-label={t.copiarPartida} onfocus={(e) => e.currentTarget.select()}>{codigo}</textarea>{/if}
      {:else}
        <p>{t.otro}</p>
      {/if}

      <button class="secundario" onclick={cerrar}>{cual === 'ios' || cual === 'otro' || manual ? t.cerrar : t.ahoraNo}</button>
    </div>
  </div>
{/if}

<style>
  .fondo { position: fixed; inset: 0; z-index: 45; display: grid; place-items: center; padding: 1rem; background: rgb(4 6 13 / 0.6); animation: fundido 0.4s ease-out; }
  .tarjeta {
    box-sizing: border-box; width: min(26rem, 100%); max-height: calc(100dvh - 2rem); overflow-y: auto; padding: 1.4rem 1.4rem 1rem;
    display: grid; justify-items: center; gap: 0.8rem; text-align: center; color: var(--escarcha);
  }
  .pila { width: 4rem; height: 4rem; border-radius: 0.9rem; box-shadow: 0 0 1.5rem rgb(159 227 245 / 0.18); }
  h2 { margin: 0; font-size: 1.3rem; font-weight: 600; letter-spacing: -0.02em; }
  p { margin: 0; font-size: 0.9rem; line-height: 1.45; color: var(--tenue); }
  .acciones { display: flex; justify-content: center; }
  .gema { min-height: 2.75rem; padding: 0.5rem 1.6rem; font: inherit; font-weight: 600; color: var(--escarcha); cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; }
  .gema.chico { min-height: 2.5rem; padding: 0.3rem 1rem; font-size: 0.85rem; white-space: nowrap; }
  .gema:disabled { opacity: 0.6; cursor: wait; }
  .secundario { min-height: 2.75rem; padding: 0.4rem 1rem; background: none; border: 0; color: var(--tenue); font: inherit; font-size: 0.9rem; cursor: pointer; }
  .pasos { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.6rem; width: 100%; text-align: left; counter-reset: paso; }
  .pasos li { counter-increment: paso; display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; line-height: 1.35; }
  .pasos li::before { content: counter(paso); flex: none; display: grid; place-items: center; width: 1.6rem; height: 1.6rem; border-radius: 50%; border: 1px solid var(--hielo-linea); color: var(--hielo); font-size: 0.8rem; }
  .pasos li span { flex: 1; }
  .pasos.ios svg { flex: none; width: 2.4rem; height: 2.4rem; padding: 0.35rem; border-radius: 0.6rem; background: rgb(159 227 245 / 0.1);
    fill: none; stroke: var(--hielo); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .codigo { width: 100%; box-sizing: border-box; resize: none; font: 0.75rem ui-monospace, monospace; color: var(--tenue); background: rgb(0 0 0 / 0.3); border: 1px solid var(--hielo-linea); border-radius: 0.4rem; padding: 0.4rem; }
  @keyframes fundido { from { opacity: 0; } }
</style>
