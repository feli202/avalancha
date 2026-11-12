// Todos los textos de la interfaz. Nunca escribir textos en los componentes.
const num = (x: number, d = 2) => x.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })

export const es = {
  titulo: 'Avalancha',
  energia: 'Energía',
  energiaPorSegundo: 'por segundo',
  densidad: 'Densidad',
  pila: 'La pila de arena. Tocala o apretá la barra espaciadora para soltar un puñado de granos.',
  pista: 'Tocá la pila',
  escala: (k: number) => `1 grano = 10${[...String(k)].map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('')} granos`,
  avalancha: (n: number) => `Avalancha ×${n.toLocaleString('es-AR')}`,
  anillo: (n: number, mult: number) => `Anillo ${n} · ×${num(mult)}`,
  reducirDestellos: 'Reducir destellos',
  ajustes: 'Ajustes',

  // Abajo a la izquierda
  sismografo: 'Sismógrafo: el tamaño de cada avalancha de la pila en los últimos 20 segundos',
  anillos: (n: number) => (n === 1 ? '1 anillo' : `${n.toLocaleString('es-AR')} anillos`),

  // Tienda
  tienda: 'Tienda', // solo para lectores de pantalla: el panel ya no lleva título
  abrirTienda: 'Abrir la tienda',
  cerrarTienda: 'Cerrar la tienda',
  modo: 'Modo de compra',
  modos: { x1: 'x1', x10: 'x10', max: 'Máx' },
  comprarTodo: 'Comprar todo',
  teclaComprarTodo: 'M',
  nivel: (n: number) => `Nv ${n.toLocaleString('es-AR')}`,
  comprar: 'Comprar',
  comprarCuantos: (n: number) => `+${n.toLocaleString('es-AR')}`,
  caudal: 'Caudal',
  efectoCaudal: (f: string) => (f === '1' ? '1 grano/s' : `${f} granos/s`),
  colores: ['Ámbar', 'Coral', 'Jade', 'Violeta'],
  /** Qué altura de celda mejora cada color (orden de CFG.colores). */
  alturaColor: ['celdas con 3 granos', 'celdas con 2 granos', 'celdas vacías', 'celdas con 1 grano'],
  mult: (m: string) => `×${m}`,

  // Compresión
  compresion: (n: number) => `Compresión ${n.toLocaleString('es-AR')}`,
  meta: (e: number) => `1e${Math.floor(e)}`,
  comprimir: 'Comprimir',
  progreso: (p: number) => `${Math.floor(p * 100)} %`,
  eta: (d: string) => `≈ ${d}`,
  /** Duración: "12 s", "4 min", "1 h 5 min". */
  duracion: (seg: number) =>
    seg < 60 ? `${Math.ceil(seg)} s` : seg < 3600 ? `${Math.ceil(seg / 60)} min` : `${Math.floor(seg / 3600)} h ${Math.floor((seg % 3600) / 60)} min`,
  densidadNueva: (d: string) => `Densidad ^${d}`,
  haciaInfinito: 'Infinito',

  // Autocompradores (SPEC 4.8)
  auto: 'auto',
  autoDe: (nombre: string) => `Autocomprador de ${nombre}`,
  compresionAuto: 'Comprimir sola al llegar a la meta',

  // Pestañas (SPEC 6.4)
  pestanas: { tienda: 'Tienda', cascada: 'Cascada', mutaciones: 'Mutaciones' } as Record<string, string>,
  explicacion: {
    cascada: 'Las avalanchas grandes rinden más que proporcionalmente: cuantos más granos tiene la pila, más multiplica.',
    mutaciones: 'Mejoras permanentes: no se pierden al comprimir.',
  } as Record<string, string>,
  cascada: 'Cascada',
  mutaciones: { caudal: 'Caudal', colores: 'Colores', expansion: 'Expansión', cascada: 'Cascada' } as Record<string, string>,
  efectoMutacion: {
    caudal: (x: string) => `Caudal ×${x}`,
    colores: (x: string) => `todo vale ×${x}`,
    expansion: (x: string) => `cada anillo ×${x}`,
    cascada: (x: string) => `+${x} a la Cascada`,
  } as Record<string, (x: string) => string>,
  nivelMaximo: 'Máximo',

  // Infinito (SPEC 6.6)
  infinito: '∞',
  fin: {
    titulo: 'Llegaste al Infinito',
    tiempo: 'Tiempo total',
    compresiones: 'Compresiones',
    record: 'Avalancha récord',
    derrumbes: (n: string) => `${n} derrumbes`,
    adelanto: 'Capa 1: Cristalización — próximamente',
  },

  // SPEC 5: una línea por cada aparición
  revelado: {
    derrumbes: 'Cuando una celda junta 4 granos se derrumba. Cada derrumbe da Energía.',
    tienda: 'Caudal: más granos por segundo, más derrumbes.',
    color0: 'Ámbar: las celdas con 3 granos ahora valen más.',
    color1: 'Coral: las celdas con 2 granos ahora valen más.',
    color2: 'Jade: las celdas vacías ahora valen más.',
    color3: 'Violeta: las celdas con 1 grano, las más raras, ahora valen más.',
    anillos: 'Anillo: cada vez que la pila duplica sus granos, todo vale un poco más.',
    compresion: 'Compresión: al llegar a la meta vas a poder comprimir la pila.',
    cascada: 'Cascada: las avalanchas grandes ahora rinden más que proporcionalmente.',
    mutaciones: 'Mutaciones: mejoras que sobreviven a la Compresión.',
    auto_compresion_auto: 'Compresión automática: la pila comprime sola al llegar a la meta.',
  } as Record<string, string>,
  /** Autocompradores que aparecen juntos, en una sola frase. */
  autocompradores: (nombres: string[]) =>
    `${nombres.length === 1 ? 'Autocomprador' : 'Autocompradores'} de ${nombres.join(' y ')}: compra${nombres.length === 1 ? '' : 'n'} solo${nombres.length === 1 ? '' : 's'} una vez por segundo.`,

  debug: {
    titulo: 'Debug',
    velocidad: 'Velocidad',
    darEnergia: 'Dar Energía',
    saltar: 'Saltar a la Compresión',
    ir: 'Ir',
    exportar: 'Exportar estado (JSON)',
    caudalMas: 'Caudal +1 nivel',
    pilaA: (n: number) => `Pila a ${n.toLocaleString('es-AR')}`,
    pilaLlena: 'Pila llena (redonda)',
    nivelColores: 'Nivel de los colores (0 = real)',
    fps: 'fps',
    peorCuadro: 'peor cuadro (ms)',
    granosSeg: 'granos/s en la pila',
    derrumbesSeg: 'derrumbes/s',
    workerMs: 'worker (ms por segundo)',
    cuadroMs: 'hilo principal (ms por cuadro)',
  },
}
