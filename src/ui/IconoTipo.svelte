<script lang="ts">
  // Los íconos de los tres tipos de reliquia (versión C, "sello"): un anillo con un emblema adentro.
  // Cauce: dos corrientes que se juntan en una. Cascada: un derrumbe abeliano que se abre en anillos de granos.
  // Mutaciones: una doble hélice con un cristal en el centro. Se dibujan con currentColor; con `halo` (un color), van en
  // blanco de escarcha con un halo de ese color debajo (el centro de las reliquias).
  // `centro`: las cuatro Mutaciones de la Capa 0 cambian el cristal del centro de la hélice por lo que mutan:
  // Caudal un grano hueco, Colores los cuatro colores, Expansión dos anillos, Cascada un derrumbe en cruz.
  let { tipo, halo = '', centro = '' }: { tipo: string; halo?: string; centro?: string } = $props()
  const ANILLO_8 = [0, 45, 90, 135, 180, 225, 270, 315].map((a) => [8 * Math.sin((a * Math.PI) / 180), -8 * Math.cos((a * Math.PI) / 180)])
</script>

{#snippet formas()}
  <circle r="11" />
  {#each [0, 90, 180, 270] as a (a)}<path d="M0-11V-12.6" transform="rotate({a})" />{/each}
  {#if tipo === 'cauce'}
    <path d="M-6-7C-6-2-1-2 0 2M6-7C6-2 1-2 0 2M0 2V8" />
    <circle class="lleno" cx="-6" cy="-7" r="2.1" /><circle class="lleno" cx="6" cy="-7" r="2.1" /><circle class="lleno" cx="0" cy="8" r="2.1" />
  {:else if tipo === 'cascada'}
    <circle class="lleno" r="2.1" />
    {#each [[0, -4.5], [4.5, 0], [0, 4.5], [-4.5, 0]] as [x, y]}<circle class="lleno" cx={x} cy={y} r="1.5" />{/each}
    {#each ANILLO_8 as [x, y]}<circle class="lleno tenue" cx={x} cy={y} r="1" />{/each}
  {:else}
    <path d="M-4-8C4-4-4 4 4 8M4-8C-4-4 4 4-4 8" />
    <path class="fino" d="M-2.6-6H2.6M-2.6 6H2.6" />
    <g transform="scale({centro ? 1.35 : 1})">
    {#if centro === 'caudal'}
      <circle r="2.3" />
    {:else if centro === 'colores'}
      {#each ['--ambar', '--coral', '--jade', '--violeta'] as c, i (c)}<rect class="color" x={i % 2 ? 0.25 : -2.45} y={i < 2 ? -2.45 : 0.25} width="2.2" height="2.2" style:fill="var({c})" />{/each}
    {:else if centro === 'expansion'}
      <circle r="1" class="lleno" /><circle r="2.8" class="fino2" />
    {:else if centro === 'cascada'}
      {#each [[0, 0], [0, -2.2], [2.2, 0], [0, 2.2], [-2.2, 0]] as [x, y]}<circle class="lleno" cx={x} cy={y} r="0.95" />{/each}
    {:else}
      <path class="lleno" d="M0-2.2 2.2 0 0 2.2-2.2 0Z" />
    {/if}
    </g>
  {/if}
{/snippet}

<svg class="icono" class:con-halo={!!halo} viewBox="-13.5 -13.5 27 27" style:--halo={halo || null} aria-hidden="true">
  {#if halo}<g class="halo">{@render formas()}</g>{/if}
  <g class="trazo">{@render formas()}</g>
</svg>

<style>
  .icono { display: block; width: 100%; height: 100%; overflow: visible; fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .trazo { stroke: currentColor; stroke-width: 1.5; }
  .trazo .lleno { fill: currentColor; stroke: none; }
  .tenue { opacity: 0.75; }
  .fino { stroke-width: 1; opacity: 0.5; }
  .fino2 { stroke-width: 1.1; }
  .trazo .color { stroke: none; }
  /* Escarcha: el emblema en blanco frío, con un halo del color del nivel que lo despega de la pila. */
  .con-halo .trazo { stroke: #eaf6ff; stroke-width: 1.7; }
  .con-halo .trazo .lleno { fill: #eaf6ff; }
  .halo { stroke: var(--halo); stroke-width: 4; opacity: 0.6; }
  .halo .lleno { fill: var(--halo); stroke: var(--halo); stroke-width: 1.8; }
  .halo .fino { opacity: 0.35; }
</style>
