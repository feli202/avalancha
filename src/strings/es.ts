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
  meta: (e: number) => `1e${e}`,
  comprimir: 'Comprimir',
  progreso: (p: number) => `${Math.floor(p * 100)} %`,

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
  } as Record<string, string>,

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
