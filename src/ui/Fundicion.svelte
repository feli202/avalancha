<script lang="ts">
  // Capa 2 (beta), fase 3: la Fundición, en la pantalla de la Capa 2. La primera vez pregunta con la tabla de qué pasa.
  import { brasasAlFundir, puedeFundir } from '../core'
  import { txt } from '../strings'
  import { formato } from './formato'
  import { fundirYa, juego } from './juego.svelte'

  const f = txt.fuego
  const s = $derived(juego.ver)
  let preguntar = $state(false)
  const fundir = () => (juego.s.fuego.fundiciones > 0 ? fundirYa() : (preguntar = true))
  const confirmar = () => { preguntar = false; fundirYa() }
  const enfocar = (el: HTMLElement) => el.focus()
  // Al body: la placa de la pantalla tiene clip-path, que recorta también a los hijos fijos (como Beta.svelte).
  const alCuerpo = (el: HTMLElement) => { document.body.append(el); return { destroy: () => el.remove() } }
</script>

<svelte:window onkeydown={(e) => preguntar && e.key === 'Escape' && (preguntar = false)} />

<div class="fundicion">
  <p>{f.que}</p>
  <button class="gema" disabled={!puedeFundir(s) || !!juego.cinematica} onclick={fundir}>
    {f.fundir}<span class="num">{f.daria(formato(brasasAlFundir(s)))}</span>
  </button>
  <p class="chico num">{puedeFundir(s) ? f.hechas(s.fuego.fundiciones) : f.requisito}</p>
</div>

{#if preguntar}
  <div class="fondo" use:alCuerpo role="presentation" onclick={(e) => e.target === e.currentTarget && (preguntar = false)}>
    <div class="placa tarjeta" role="dialog" aria-modal="true" aria-labelledby="fundir-titulo">
      <h2 id="fundir-titulo">{f.confirmaTitulo}</h2>
      <dl>{#each f.tabla as [rot, que]}<div><dt>{rot}</dt><dd>{que}</dd></div>{/each}</dl>
      <div class="acciones">
        <button class="gema" use:enfocar onclick={confirmar}>{f.confirmar}</button>
        <button class="secundario" onclick={() => (preguntar = false)}>{f.cancelar}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .fundicion { display: grid; gap: 0.5rem; justify-items: center; }
  p { margin: 0; color: var(--tenue); font-size: 0.9375rem; text-wrap: balance; }
  .chico { font-size: 0.8125rem; }
  .gema { display: inline-flex; gap: 0.6rem; align-items: baseline; min-height: 2.75rem; padding: 0 1.25rem; font-weight: 600; --c: #ff8a3d; }
  .gema span { font-weight: 400; font-size: 0.875rem; opacity: 0.85; }
  .fondo { position: fixed; inset: 0; z-index: 8; display: grid; place-items: center; padding: 1rem; background: rgb(3 5 10 / 0.72); animation: entrar 0.25s ease-out; }
  .tarjeta {
    --f: 1.25rem; --luz: radial-gradient(90% 60% at 50% 115%, rgb(255 110 40 / 0.16), transparent 70%);
    display: grid; gap: 0.9rem; width: min(100%, 28rem); max-height: 100%; overflow-y: auto; padding: 1.5rem; color: var(--escarcha); text-align: left;
  }
  h2 { margin: 0; font-size: 1.375rem; font-weight: 600; }
  dl { display: grid; gap: 0.6rem; margin: 0; }
  dt { font-weight: 600; color: #ffb27a; }
  dd { margin: 0.1rem 0 0; color: var(--tenue); font-size: 0.9375rem; }
  .acciones { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .secundario { min-height: 2.75rem; padding: 0 1rem; border: 1px solid var(--borde); background: none; color: var(--tenue); font: inherit; cursor: pointer; }
  @keyframes entrar { from { opacity: 0; } }
</style>
