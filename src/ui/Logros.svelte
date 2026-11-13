<script lang="ts">
  // Pantalla de Logros (Pantalla.svelte): una pestaña por capa
  // y una grilla de tarjetas con la mini pila de cada logro. Y la notificación al conseguir uno.
  import { miniPila, paletaBase } from '../render/miniPilas'
  import { PALETAS, css } from '../render/paletas'
  import { es } from '../strings/es'
  import { ajustes } from './ajustes.svelte'
  import { juego } from './juego.svelte'
  import { CAPAS, RECOMPENSA, descLogro, nombreLogro } from './logros'
  import Pantalla from './Pantalla.svelte'

  $effect.pre(() => paletaBase(ajustes.daltonismo))

  const nombre = nombreLogro
  const desc = descLogro

  let capa = $state(0)
  const lista = $derived(CAPAS[capa].logros)
  const hechos = $derived(lista.filter((k) => juego.logros[k]).length)
  const abierta = (i: number) => CAPAS[i].abierta(juego.s)


  // Notificación: las tarjetas en miniatura de lo último conseguido (hasta 3), se van solas.
  const avisar = $derived(juego.logro && juego.panel !== 'logros' && !juego.guardadoRoto ? juego.logro : null)
</script>

{#snippet recompensa(k: string)}
  {@const [tipo, id] = RECOMPENSA[k]}
  <span class="premio">
    {#if tipo === 'paleta'}
      <span class="muestras" aria-hidden="true">{#each PALETAS[id] as c}<i style:background={css(c)}></i>{/each}</span>
    {:else}
      <svg class="icono-premio" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        {#if tipo === 'efecto'}<path d="M7 1v3M7 10v3M1 7h3M10 7h3M2.8 2.8l2 2M9.2 9.2l2 2M2.8 11.2l2-2M9.2 4.8l2-2" />
        {:else}<circle cx="7" cy="7" r="5.5" /><circle cx="7" cy="7" r="3" />{/if}
      </svg>
    {/if}
    <span><span class="tipo">{es.logros.recompensa[tipo]}</span> {es.cosmeticos[tipo][id]}</span>
  </span>
{/snippet}

{#if juego.panel === 'logros'}
  <Pantalla titulo={es.logros.titulo} bind:activa={capa}
    pestanas={CAPAS.map((c, i) => ({ id: c.id, texto: es.logros.capas[c.id], bloqueada: abierta(i) ? undefined : es.logros.bloqueada }))}>
    {#snippet extra()}
      <div class="cuenta">
        <span class="num"><b>{hechos}</b> / {lista.length}</span>
        <span class="barrita" aria-hidden="true"><i style:width="{(hechos / Math.max(lista.length, 1)) * 100}%"></i></span>
      </div>
    {/snippet}
    <ol class="grilla">
      {#each lista as k, i (k)}
        {@const si = !!juego.logros[k]}
        <li class="tarjeta" class:si data-tarjeta style:--i={i}>
          <canvas class="imagen" use:miniPila={{ clave: k, quieta: ajustes.reducirDestellos }} aria-hidden="true"></canvas>
          <div class="texto">
            <h3>{nombre(k)}</h3>
            <p>{desc(k)}</p>
          </div>
          {@render recompensa(k)}
          <span class="sr">{si ? es.logros.conseguido : es.logros.pendiente}</span>
        </li>
      {/each}
    </ol>
  </Pantalla>
{/if}

{#if avisar}
  <div class="avisos" role="status">
    {#key avisar.id}
      {#each avisar.claves.slice(-3) as k, i (k)}
        <div class="aviso" style:--i={i}>
          <canvas class="mini" use:miniPila={{ clave: k, quieta: true }} aria-hidden="true"></canvas>
          <div>
            <p class="rotulo">{es.logros.nuevo}</p>
            <p class="nombre">{nombre(k)}</p>
          </div>
        </div>
      {/each}
    {/key}
  </div>
{/if}

<style>
  .cuenta { display: grid; gap: 0.375rem; justify-items: end; flex: none; font-size: 0.9375rem; color: var(--tenue); }
  .cuenta b { font-size: 1.5rem; font-weight: 600; color: var(--tinta); letter-spacing: -0.02em; }
  .barrita { display: block; width: 9rem; height: 2px; background: var(--borde); }
  .barrita i { display: block; height: 100%; background: var(--ambar); box-shadow: 0 0 0.5rem var(--ambar); transition: width 0.6s ease-out; }

  .grilla {
    list-style: none; margin: 0 auto; padding: 0.5rem 2rem 3rem; width: 100%; max-width: 96rem;
    display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 1rem;
  }
  .tarjeta {
    position: relative; display: flex; flex-direction: column; overflow: hidden;
    border: 1px solid var(--borde); border-radius: 0.5rem; background: rgb(14 16 30 / 0.7);
    animation: subir 0.5s calc(0.2s + var(--i) * 0.025s) ease-out backwards;
    transition: transform 0.2s, border-color 0.2s;
  }
  .tarjeta:hover { transform: translateY(-2px); }
  .tarjeta.si {
    border-color: color-mix(in srgb, var(--ambar) 45%, transparent);
    box-shadow: 0 0 1.25rem -0.25rem color-mix(in srgb, var(--ambar) 30%, transparent), inset 0 0 0 1px rgb(255 181 71 / 0.06);
  }
  .tarjeta.si:hover { border-color: color-mix(in srgb, var(--ambar) 75%, transparent); }
  .imagen { display: block; width: 100%; aspect-ratio: 3 / 2; height: auto; background: var(--fondo); }
  .texto { flex: 1; padding: 0.75rem 0.875rem 0.875rem; }
  h3 { margin: 0 0 0.25rem; font-size: 0.9375rem; font-weight: 600; line-height: 1.25; }
  .texto p { margin: 0; font-size: 0.8125rem; line-height: 1.4; color: var(--tenue); text-wrap: pretty; }
  .premio {
    display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.875rem; font-size: 0.75rem; color: var(--tinta);
    border-top: 1px solid var(--borde); background: rgb(255 181 71 / 0.07);
  }
  .tipo { color: var(--ambar); }
  .muestras { display: flex; flex: none; }
  .muestras i { width: 0.625rem; height: 0.625rem; border-radius: 50%; margin-right: -0.1875rem; box-shadow: 0 0 0 1.5px rgb(14 16 30); }
  .icono-premio { flex: none; color: var(--ambar); }

  /* Sin conseguir: escala de grises y oscurecida; la descripción se sigue leyendo. */
  .tarjeta:not(.si) .imagen, .tarjeta:not(.si) .premio { filter: grayscale(1) brightness(0.5); }
  .tarjeta:not(.si) h3 { color: var(--tenue); }
  .tarjeta:not(.si) .texto p { color: var(--apagado); }
  .tarjeta:not(.si) .premio { background: none; }

  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

  /* Notificación: la tarjeta en miniatura entra por la esquina y se va sola. */
  .avisos { position: fixed; right: 1.5rem; bottom: 1.5rem; z-index: 7; display: grid; gap: 0.5rem; pointer-events: none; }
  .aviso {
    display: flex; align-items: center; gap: 0.75rem; width: 17rem; padding: 0.5rem 0.875rem 0.5rem 0.5rem;
    border: 1px solid color-mix(in srgb, var(--ambar) 45%, transparent); border-radius: 0.5rem; background: rgb(14 16 30 / 0.94);
    box-shadow: 0 0.5rem 2rem rgb(0 0 0 / 0.5), 0 0 1.25rem -0.25rem color-mix(in srgb, var(--ambar) 35%, transparent);
    animation: notificar 5s calc(var(--i) * 0.15s) cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }
  .mini { flex: none; width: 4.5rem; height: 3rem; border-radius: 0.25rem; }
  .aviso p { margin: 0; }
  .aviso .rotulo { font-size: 0.75rem; color: var(--ambar); }
  .aviso .nombre { font-size: 0.9375rem; font-weight: 600; }
  @keyframes notificar {
    0% { opacity: 0; transform: translateX(120%); }
    8%, 85% { opacity: 1; transform: none; }
    100% { opacity: 0; transform: translateX(120%); }
  }
  :global(.quieto) .aviso { animation-name: fundir-aviso; }
  @keyframes fundir-aviso { 0%, 100% { opacity: 0; } 8%, 85% { opacity: 1; } }
  @keyframes subir { from { opacity: 0; transform: translateY(8px); } }
  @keyframes fundido { from { opacity: 0; } }
  :global(.quieto) .tarjeta { animation-name: fundido; }

  @media (max-width: 1279px) { .grilla { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  @media (max-width: 899px) { .grilla { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 767px) {
    .cuenta { justify-items: start; flex: 1; }
    .grilla { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.625rem; padding: 0.25rem 1rem 2rem; }
    .texto { padding: 0.5rem 0.625rem 0.625rem; }
    .premio { padding: 0.375rem 0.625rem; font-size: 0.6875rem; }
    .avisos { right: 1rem; top: 9rem; bottom: auto; }
    .aviso { width: 15rem; }
  }
</style>
