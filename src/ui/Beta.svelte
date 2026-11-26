<script lang="ts">
  // Capa 2, fase 1B: la puerta de la beta, debajo del mensaje de fin de la Capa 1. Un botón y una tarjeta: entrar con un código
  // (se verifica en el juego, sin servidor: guardado/beta.ts) o pedir uno por mail o Discord.
  import { DISCORD, MAIL } from '../comunidad'
  import { codigoValido, normalizarCodigo } from '../guardado/beta'
  import { HASHES_BETA } from '../guardado/codigosBeta'
  import { esBeta } from '../guardado/guardado'
  import { txt } from '../strings'
  import { entrarALaBeta, juego } from './juego.svelte'

  let abierta = $state(false)
  let codigo = $state('')
  let mal = $state(false)
  let valido = $state('') // código verificado: falta aceptar el aviso
  let noSeEscribio = $state(false)
  const pedido = `mailto:${MAIL}?subject=${encodeURIComponent(txt.beta.asunto)}&body=${encodeURIComponent(txt.beta.cuerpo)}`

  async function verificar(e: SubmitEvent) {
    e.preventDefault()
    const c = normalizarCodigo(codigo)
    if (await codigoValido(c)) valido = c
    else mal = true
  }
  const cerrar = () => { abierta = false; valido = ''; mal = false }
  const enfocar = (el: HTMLElement) => el.focus()
  // Al body: la placa de la pantalla tiene clip-path, que recorta también a los hijos fijos.
  const alCuerpo = (el: HTMLElement) => { document.body.append(el); return { destroy: () => el.remove() } }
</script>

<svelte:window onkeydown={(e) => abierta && e.key === 'Escape' && cerrar()} />

{#if esBeta(juego)}
  <p class="activa">{txt.beta.activa}</p>
{:else if !HASHES_BETA.length}
  <button class="gema" disabled>{txt.beta.cerrada}</button>
{:else}
  <button class="gema" onclick={() => (abierta = true)}>{txt.beta.jugar}</button>
{/if}

{#if abierta}
  <div class="fondo" use:alCuerpo role="presentation" onclick={(e) => e.target === e.currentTarget && cerrar()}>
    <div class="placa tarjeta" role="dialog" aria-modal="true" aria-labelledby="beta-titulo">
      <button class="cruz" aria-label={txt.beta.cerrar} onclick={cerrar}><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" /></svg></button>
      {#if valido}
        <h2 id="beta-titulo">{txt.beta.avisoTitulo}</h2>
        <p>{txt.beta.aviso}</p>
        {#if noSeEscribio}<p class="mal" role="alert">{txt.beta.noSeEscribio}</p>{/if}
        <div class="acciones">
          <button class="gema" use:enfocar onclick={() => (noSeEscribio = !entrarALaBeta(valido))}>{txt.beta.confirmar}</button>
          <button class="secundario" onclick={cerrar}>{txt.beta.cancelar}</button>
        </div>
      {:else}
        <h2 id="beta-titulo">{txt.beta.titulo}</h2>
        <form onsubmit={verificar}>
          <label for="beta-codigo">{txt.beta.codigo}</label>
          <div class="fila">
            <input id="beta-codigo" class="num" bind:value={codigo} use:enfocar autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12"
              oninput={() => (mal = false)} />
            <button class="gema" disabled={!codigo.trim()}>{txt.beta.entrar}</button>
          </div>
          {#if mal}<p class="mal" role="alert">{txt.beta.codigoMal}</p>{/if}
        </form>

        <div class="pedir">
          <h3>{txt.beta.sinCodigo}</h3>
          <p>{txt.beta.comoPedir}</p>
          <div class="acciones">
            <a class="link" href={pedido}>{txt.beta.porMail}</a>
            <a class="link discord" href={DISCORD} target="_blank" rel="noopener">{txt.comunidad.discord}</a>
          </div>
          <p class="chico">{txt.beta.mailA(MAIL)} · <a href="{import.meta.env.BASE_URL}privacidad.html" target="_blank" rel="noopener">{txt.beta.privacidad}</a></p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .activa { margin: 0; font-size: 0.9375rem; color: #e8b48f; text-wrap: balance; }
  .fondo { position: fixed; inset: 0; z-index: 8; display: grid; place-items: center; padding: 1rem; background: rgb(3 5 10 / 0.72); animation: entrar 0.25s ease-out; }
  .tarjeta {
    --f: 1.25rem; --luz: radial-gradient(90% 60% at 50% 115%, rgb(255 110 40 / 0.16), transparent 70%);
    position: relative; display: grid; gap: 0.75rem; width: min(100%, 26rem); max-height: 100%; overflow-y: auto; padding: 1.75rem 1.5rem 1.5rem;
    color: var(--escarcha); text-align: left;
  }
  h2 { margin: 0; font-size: 1.375rem; font-weight: 600; }
  h3 { margin: 0.25rem 0 0; font-size: 1rem; font-weight: 600; color: var(--escarcha); }
  p { margin: 0; color: var(--tenue); font-size: 0.9375rem; }
  .chico { font-size: 0.8125rem; }
  .chico a { color: var(--hielo); }
  form, .pedir { display: grid; gap: 0.5rem; }
  .pedir { padding-top: 0.75rem; border-top: 1px solid var(--borde); }
  label { font-size: 0.8125rem; color: var(--tenue); }
  .fila { display: flex; gap: 0.5rem; }
  .fila input {
    flex: 1; min-width: 0; min-height: 2.75rem; padding: 0 0.75rem; border: 1px solid var(--borde); background: rgb(0 0 0 / 0.3); color: var(--escarcha);
    font: inherit; letter-spacing: 0.15em; text-transform: uppercase; box-sizing: border-box;
  }
  input:focus-visible { outline: 2px solid var(--hielo); outline-offset: 1px; }
  .gema { min-height: 2.75rem; padding: 0 1.25rem; font-weight: 600; }
  .link {
    display: inline-flex; align-items: center; min-height: 2.75rem; padding: 0 1rem; border: 1px solid var(--borde);
    background: var(--vidrio); color: var(--escarcha); font-weight: 600; text-decoration: none;
  }
  .link:hover { border-color: currentColor; }
  .discord { color: #a5b0ff; }
  .mal { color: #ff9a8a; }
  .acciones { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
  .secundario { min-height: 2.75rem; padding: 0 1rem; border: 1px solid var(--borde); background: none; color: var(--tenue); font: inherit; cursor: pointer; }
  .cruz { position: absolute; top: 0.5rem; right: 0.5rem; width: 2.75rem; height: 2.75rem; display: grid; place-items: center; border: 0; background: none; color: var(--tenue); cursor: pointer; }
  .cruz svg { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 1.5; }
  @keyframes entrar { from { opacity: 0; } }
</style>
