<script lang="ts">
  // App instalada en iPhone: la pantalla de inicio tiene su propio almacenamiento, separado del de Safari, así que arranca sin
  // la partida. La primera vez que se abre sin partida, ofrece pegar la que se copió en Safari (Instalar.svelte o Exportar).
  // La pregunta y el reemplazo con respaldo son los de PaseItch.svelte.
  import { leerCodigo } from '../guardado/pase'
  import { enApp, esMovil } from '../instalar.svelte'
  import { txt } from '../strings'
  import { hayCartel, juego } from './juego.svelte'
  import { pegada } from './PaseItch.svelte'

  const VISTO = 'avalancha.traer'
  const t = txt.pase
  const visto = (() => { try { return localStorage.getItem(VISTO) !== null } catch { return true } })()
  // Se decide al cargar: con partida, o ya ofrecido, nunca.
  const ofrecer = esMovil() && enApp() && !juego.hayPartida && !visto
  let abierta = $state(false)
  let hecho = $state(false) // ya se mostró en esta sesión
  let texto = $state('')
  let mal = $state(false)
  $effect(() => { if (ofrecer && !juego.titulo && !hayCartel() && !hecho) abierta = hecho = true })

  function cerrar() {
    abierta = false
    try { localStorage.setItem(VISTO, '1') } catch {}
  }
  async function cargar() {
    try {
      pegada.p = await leerCodigo(texto)
      cerrar()
    } catch { mal = true }
  }
  const enfocar = (el: HTMLElement) => el.focus()
</script>

{#if abierta}
  <div class="fondo">
    <div class="tarjeta placa grietas" role="dialog" aria-modal="true" aria-labelledby="traer-titulo">
      <h2 id="traer-titulo">{t.traerTitulo}</h2>
      <p>{t.traerTexto}</p>
      <textarea class="codigo" rows="3" placeholder={t.traerPegar} aria-label={t.traerPegar} use:enfocar
        bind:value={texto} oninput={() => (mal = false)}></textarea>
      {#if mal}<p class="mal" role="alert">{t.traerMal}</p>{/if}
      <div class="acciones">
        <button class="gema" disabled={!texto.trim()} onclick={cargar}>{t.traerCargar}</button>
        <button class="secundario" onclick={cerrar}>{t.traerNueva}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .fondo { position: fixed; inset: 0; z-index: 48; display: grid; place-items: center; padding: 1rem; background: rgb(4 6 13 / 0.75); }
  .tarjeta { box-sizing: border-box; width: min(28rem, 100%); max-height: calc(100dvh - 2rem); overflow-y: auto; padding: 1.4rem;
    display: grid; gap: 0.85rem; text-align: center; color: var(--escarcha); }
  h2 { margin: 0; font-size: 1.3rem; font-weight: 600; letter-spacing: -0.02em; }
  p { margin: 0; font-size: 0.9rem; line-height: 1.45; color: var(--tenue); }
  p.mal { color: var(--coral); }
  .codigo { width: 100%; box-sizing: border-box; resize: none; font: 16px ui-monospace, monospace; color: var(--tenue); background: rgb(0 0 0 / 0.3);
    border: 1px solid var(--hielo-linea); border-radius: 0.4rem; padding: 0.5rem; } /* 16 px: Safari no hace zoom al enfocar */
  .acciones { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; }
  .gema { min-height: 2.75rem; padding: 0.5rem 1.6rem; font: inherit; font-weight: 600; color: var(--escarcha); cursor: pointer; }
  .gema:disabled { opacity: 0.6; cursor: default; }
  .secundario { min-height: 2.75rem; padding: 0.4rem 1rem; background: none; border: 0; color: var(--tenue); font: inherit; font-size: 0.9rem; cursor: pointer; }
</style>
