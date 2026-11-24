<script lang="ts">
  // Pantalla de Logros (Pantalla.svelte): una pestaña por capa
  // y una grilla de tarjetas con la mini pila de cada logro. Y la notificación al conseguir uno.
  import { miniPila, paletaBase } from '../render/miniPilas'
  import { PALETAS, css } from '../render/paletas'
  import { txt } from '../strings'
  import { ajustes, quieto } from './ajustes.svelte'
  import { juego } from './juego.svelte'
  import { CAPAS, RECOMPENSA, SECRETOS, descLogro, nombreLogro, premioSecreto, secreto } from './logros'
  import Pantalla from './Pantalla.svelte'

  $effect.pre(() => paletaBase(ajustes.daltonismo))

  const nombre = nombreLogro
  const desc = descLogro

  let capa = $state(0)
  /** La última pestaña, después de las capas: los logros secretos. */
  const enSecretos = $derived(capa === CAPAS.length)
  const lista = $derived(enSecretos ? SECRETOS : CAPAS[capa].logros)
  const hechos = $derived(lista.filter((k) => juego.logros[k]).length)
  const abierta = (i: number) => CAPAS[i].abierta(juego.s)
  const pestanas = $derived([
    ...CAPAS.map((c, i) => ({ id: c.id, texto: txt.logros.capas[c.id], bloqueada: abierta(i) ? undefined : txt.logros.bloqueada })),
    { id: 'secretos', texto: txt.logros.secretos, bloqueada: undefined },
  ])
  const premio = (k: string) => (SECRETOS.includes(k) ? premioSecreto(k) : RECOMPENSA[k])


  // Notificación: las tarjetas en miniatura de lo último conseguido (hasta 3), se van solas.
  const avisar = $derived(ajustes.aviso_logros && juego.logro && juego.panel !== 'logros' && !juego.guardadoRoto ? juego.logro : null)
</script>

{#snippet recompensa(k: string)}
  {@const [tipo, id] = premio(k)}
  <span class="premio">
    {#if tipo === 'paleta'}
      <span class="muestras" aria-hidden="true">{#each PALETAS[id] as c}<i style:background={css(c)}></i>{/each}</span>
    {:else}
      <svg class="icono-premio" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true">
        {#if tipo === 'efecto' || tipo === 'especial'}<path d="M7 1v3M7 10v3M1 7h3M10 7h3M2.8 2.8l2 2M9.2 9.2l2 2M2.8 11.2l2-2M9.2 4.8l2-2" />
        {:else if tipo === 'fondo'}<rect x="1.5" y="2.5" width="11" height="9" rx="1" />
        {:else}<circle cx="7" cy="7" r="5.5" /><circle cx="7" cy="7" r="3" />{/if}
      </svg>
    {/if}

    <span><span class="tipo">{txt.logros.recompensa[tipo]}</span> {txt.cosmeticos[tipo][id]}</span>
  </span>
{/snippet}

{#if juego.panel === 'logros'}
  <Pantalla titulo={txt.logros.titulo} bind:activa={capa} {pestanas}>
    {#snippet extra()}
      <div class="cuenta">
        <span class="num"><b>{hechos}</b> / {lista.length}</span>
        <span class="barrita" aria-hidden="true"><i style:width="{(hechos / Math.max(lista.length, 1)) * 100}%"></i></span>
      </div>
    {/snippet}
    <ol class="grilla">
      {#each lista as k, i (k)}
        {@const si = !!juego.logros[k]}
        {@const oculto = enSecretos ? !si : secreto(k, juego.logros, juego.vistos)}
        <li class="tarjeta" class:si class:oculto data-tarjeta style:--i={i}>
          <canvas class="imagen" use:miniPila={{ clave: k, quieta: quieto() || oculto }} aria-hidden="true"></canvas>
          <div class="texto">
            <h3>{oculto ? txt.secreto : nombre(k)}</h3>
            {#if !oculto}<p>{desc(k)}</p>
            {:else if enSecretos}<p class="pista">{txt.logros.secretosLista[k][2]}</p>{/if}
          </div>
          {#if !oculto}{@render recompensa(k)}{/if}
          <span class="sr">{si ? txt.logros.conseguido : txt.logros.pendiente}</span>
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
            <p class="rotulo">{txt.logros.nuevo}</p>
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
    display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 2rem 1.5rem; /* sin tarjetas: separadas por espacio */
  }
  .tarjeta {
    position: relative; display: flex; flex-direction: column;
    animation: subir 0.5s calc(0.2s + var(--i) * 0.025s) ease-out backwards;
  }
  .imagen { display: block; width: 100%; aspect-ratio: 3 / 2; height: auto; mask: radial-gradient(closest-side, #000 75%, transparent); } /* sin recuadro: la pila suelta */
  .texto { flex: 1; padding: 0.5rem 0 0.25rem; }
  .tarjeta.si h3 { color: var(--ambar); }
  h3 { margin: 0 0 0.25rem; font-size: 0.9375rem; font-weight: 600; line-height: 1.25; }
  .texto p { margin: 0; font-size: 0.8125rem; line-height: 1.4; color: var(--tenue); text-wrap: pretty; }
  .premio { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--tenue); }
  .tipo { color: var(--ambar); }
  .muestras { display: flex; flex: none; }
  .muestras i { width: 0.625rem; height: 0.625rem; border-radius: 50%; margin-right: -0.1875rem; box-shadow: 0 0 0 1.5px rgb(14 16 30); }
  .icono-premio { flex: none; color: var(--ambar); }

  /* Sin conseguir: escala de grises y oscurecida; la descripción se sigue leyendo. */
  .tarjeta:not(.si) .imagen, .tarjeta:not(.si) .premio { filter: grayscale(1) brightness(0.5); }
  .tarjeta:not(.si) h3 { color: var(--tenue); }
  .tarjeta:not(.si) .texto p { color: var(--apagado); }
  .tarjeta.oculto .imagen { opacity: 0.4; filter: grayscale(1) brightness(0.5) blur(6px); } /* silueta borrosa hasta conseguirlo */
  .texto p.pista { font-style: italic; color: var(--tenue); }

  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

  /* Notificación: la tarjeta en miniatura entra por la esquina y se va sola. */
  .avisos { position: fixed; right: 1.5rem; bottom: 1.5rem; z-index: 7; display: grid; gap: 0.5rem; pointer-events: none; }
  /* Una línea de texto con la mini pila al lado, como los avisos. */
  .aviso {
    display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; text-align: right;
    text-shadow: 0 0 0.75rem var(--fondo), 0 0 0.25rem var(--fondo);
    animation: notificar 5s calc(var(--i) * 0.15s) cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }
  .mini { flex: none; order: 2; width: 4.5rem; height: 3rem; }
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
    .premio { font-size: 0.6875rem; }
    .avisos { right: 1rem; top: 9rem; bottom: auto; }
  }
</style>
