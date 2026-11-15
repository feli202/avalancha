<script lang="ts">
  // SPEC_CAPA1 §7: interfaz 2D PROVISORIA de los Estratos (la escena three.js descendente es de C5).
  // Ocho filas: s_k, aporte a la Presión y los dos botones (Permeabilidad y Presión).
  import Decimal from 'break_infinity.js'
  import {
    CFG1, ESTRATOS, abrirEstrato, caudal, costoAbrir, costoMejora, gammaEstrato, hayEstratos, mejorarEstrato, presion,
    presionEstrato, puedeAbrir, puedeMejorar, type MejoraEstrato,
  } from '../core'
  import { txt } from '../strings'
  import { formato, formatoMult } from './formato'
  import { juego } from './juego.svelte'
  import * as sonido from './sonido'

  const E = CFG1.estratos
  const t = txt.cristal.estratos
  const s = $derived(juego.s)
  const cuesta = (c: Decimal) => txt.cristal.red.costo(formato(c, true))
  const MEJORAS: [MejoraEstrato, string, string][] = [
    ['perm', t.perm, t.permQue(formatoMult(E.permeabilidad.suma_gamma * 100))],
    ['pres', t.pres, t.presQue(formatoMult(E.presion.suma_w * 100))],
  ]
  function hacer(n: typeof juego.s) {
    if (n === juego.s) return
    juego.s = n
    sonido.compra('other')
  }
  /** El estrato no puede pasar al de arriba menos la separación: está al tope. */
  const frenado = (k: number) => k > 0 && s.estratos.s[k] >= s.estratos.s[k - 1] - E.separacion_log10 - 1e-9
</script>

<section class="estratos" aria-label={txt.cristal.pantallas.estratos}>
  {#if !hayEstratos(s)}
    <p>{t.cerrado}</p>
  {:else}
    <p class="total num">{t.total(formatoMult(presion(s)), formato(Decimal.pow10(presion(s))))}</p>
    <table>
      <thead><tr><th></th><th>{t.granos}</th><th>{t.aporte}</th><th>{t.mejoras}</th></tr></thead>
      <tbody>
        {#each { length: ESTRATOS } as _, k}
          {@const abierto = k < s.estratos.abiertos}
          <tr class:cerrado={!abierto}>
            <th scope="row">{t.estrato(k + 1)}</th>
            {#if abierto}
              <td class="num">
                {formato(Decimal.pow10(s.estratos.s[k]))}
                <small>{frenado(k) ? t.tope : t.ritmo(formatoMult(10 ** (gammaEstrato(s, k, Math.log10(caudal(s))) * 60)))}</small>
              </td>
              <td class="num">+{formatoMult(presionEstrato(s, k))}</td>
              <td class="botones">
                {#each MEJORAS as [que, nombre, ayuda]}
                  <button title={ayuda} aria-disabled={!puedeMejorar(s, que, k)} class:puede={puedeMejorar(s, que, k)} onclick={() => hacer(mejorarEstrato(juego.s, que, k))}>
                    <b>{nombre}</b> {t.nivel(s.estratos[que][k])}
                    <small class="num">{cuesta(costoMejora(s, que, k))}</small>
                  </button>
                {/each}
              </td>
            {:else if k === s.estratos.abiertos}
              <td colspan="3" class="botones">
                <button aria-disabled={!puedeAbrir(s)} class:puede={puedeAbrir(s)} onclick={() => hacer(abrirEstrato(juego.s))}>
                  <b>{t.abrir}</b> <small class="num">{cuesta(costoAbrir(s))}</small>
                </button>
              </td>
            {:else}
              <td colspan="3">{t.sinAbrir}</td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
    <p>{t.que}</p>
  {/if}
</section>

<style>
  .estratos { display: grid; justify-items: center; align-content: start; gap: 1.25rem; padding: 1.5rem 0; animation: entrar 0.3s ease-out; }
  @keyframes entrar { from { opacity: 0; } }
  p { max-width: 38rem; margin: 0; color: var(--tenue); text-align: center; text-wrap: balance; }
  .total { color: var(--hielo); font-size: 1.25rem; font-weight: 600; }
  table { width: min(100%, 50rem); border-collapse: collapse; }
  th, td { padding: 0.5rem 0.75rem; text-align: left; vertical-align: middle; border-bottom: 1px solid rgb(159 227 245 / 0.14); }
  thead th { color: var(--tenue); font-size: 0.8125rem; font-weight: 400; }
  th[scope] { font-weight: 600; white-space: nowrap; }
  .cerrado { color: var(--apagado); }
  small { display: block; color: var(--apagado); font-size: 0.8125rem; }
  .botones { display: flex; flex-wrap: wrap; gap: 0.5rem; border-bottom: 0; }
  tr:has(.botones) { border-bottom: 1px solid rgb(159 227 245 / 0.14); }
  button {
    min-height: 2.75rem; padding: 0.35rem 0.75rem; text-align: left; font: inherit; font-size: 0.875rem; color: var(--apagado);
    background: rgb(4 6 13 / 0.6); border: 1px solid rgb(159 227 245 / 0.2); cursor: default;
  }
  button.puede { color: var(--escarcha); border-color: var(--hielo); cursor: pointer; }
  button.puede:hover { background: color-mix(in srgb, var(--hielo) 12%, rgb(4 6 13 / 0.85)); }

  /* Móvil: cada estrato es un bloque (las cuatro columnas no entran). */
  @media (max-width: 640px) {
    thead { display: none; }
    tr { display: grid; grid-template-columns: 1fr 1fr; padding: 0.5rem 0; border-bottom: 1px solid rgb(159 227 245 / 0.14); }
    th, td { padding: 0.2rem 0; border: 0; }
    th[scope], .botones, td[colspan] { grid-column: 1 / -1; }
    tr:has(.botones) { border-bottom: 1px solid rgb(159 227 245 / 0.14); }
  }
</style>
