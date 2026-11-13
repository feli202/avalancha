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

  // Fuera de línea y guardado (SPEC 8)
  ausencia: {
    titulo: 'Mientras no estabas',
    tiempo: (d: string) => `${d} afuera`,
    tope: (horas: number) => `Más de ${horas} h afuera: la pila trabajó ${horas} h sin vos`,
    energia: 'de Energía',
    compresiones: (n: number) => (n === 1 ? '1 compresión' : `${n.toLocaleString('es-AR')} compresiones`),
    seguir: 'Seguir',
  },
  guardadoRoto: {
    titulo: 'No pudimos leer tu partida',
    texto: 'El guardado está dañado. Queda una copia de respaldo en este navegador y no la vamos a borrar.',
    empezar: 'Empezar de nuevo',
  },

  // Estadísticas, logros y ajustes (SPEC 6.4: pestañas; acá flotan sobre la pila)
  menu: {
    abrir: 'Ajustes',
    estadisticas: 'Estadísticas',
    cerrar: 'Cerrar',
    pestanas: { estadisticas: 'Estadísticas', logros: 'Logros', ajustes: 'Ajustes' } as Record<string, string>,
    logros: 'Logros',
  },
  estadisticas: {
    titulo: 'Estadísticas',
    pestanas: { produccion: 'Producción', corridas: 'Corridas', avalanchas: 'Avalanchas', general: 'General' } as Record<string, string>,
    // Producción: el desglose de la Energía/s
    energiaPorSegundo: 'Energía por segundo',
    ayudaBarra: 'Cada factor ocupa en la barra lo que aporta en órdenes de magnitud (log10).',
    factores: {
      caudal: 'Caudal', derrumbes: 'Derrumbes por grano', ambar: 'Ámbar', coral: 'Coral', jade: 'Jade', violeta: 'Violeta',
      anillos: 'Anillos', cascada: 'Cascada', mutaciones: 'Mutaciones', densidad: 'Densidad',
    } as Record<string, string>,
    /** Partes internas de cada factor; n ya viene con formato. */
    partes: {
      base: () => 'Granos por segundo de base',
      niveles: (n: string) => `${n} ${n === '1' ? 'nivel' : 'niveles'}`,
      hitos: (n: string) => `${n} ${n === '1' ? 'hito' : 'hitos'} ×4`,
      k: () => 'Derrumbes por grano de la pila (K)',
      granos: () => 'Granos en la pila (G)',
      cantidad: (n: string) => `${n} ${n === '1' ? 'anillo' : 'anillos'}`,
      expansion: (n: string) => `Mutación Expansión, nivel ${n}`,
      c: (n: string) => `Fuerza de la Cascada: c = ${n}`,
      mutCaudal: (n: string) => `Caudal ×3, nivel ${n}`,
      mutColores: (n: string) => `Colores ×10, nivel ${n}`,
      exponente: (n: string) => `El exponente ^${n} sobre el valor de cada derrumbe`,
    } as Record<string, (n: string) => string>,
    expandir: (f: string) => `Ver las partes de ${f}`,
    // Corridas
    numero: 'Corrida',
    duracion: 'Duración',
    energia: 'Energía',
    densidad: 'Densidad',
    porMinuto: 'Energía/min',
    masRapida: 'la más rápida',
    sinCorridas: 'Todavía no comprimiste. Acá van a aparecer tus últimas 10 corridas.',
    ultimas: (n: number) => (n === 1 ? 'La última compresión' : `Últimas ${n} compresiones`),
    // Avalanchas
    leyPotencias: 'Casi todas son chicas; unas pocas son enormes: la ley de potencias de la pila de arena.',
    ejeTamano: 'derrumbes por avalancha',
    ejeCantidad: 'avalanchas',
    pendiente: (p: string) => `pendiente ${p}`,
    sinAvalanchas: 'Todavía no hubo avalanchas.',
    record: 'Avalancha récord',
    mayorCorrida: 'La más grande de esta corrida',
    contadas: 'Avalanchas contadas',
    derrumbesPila: 'Derrumbes en la pila',
    // General
    tiempoTotal: 'Tiempo de juego',
    tiempoCorrida: 'Esta corrida',
    partida: 'Desde que empezó la partida',
    mejorCorrida: 'Corrida más rápida',
    granosTotales: 'Granos soltados',
    derrumbesTotales: 'Derrumbes',
    compresiones: 'Compresiones',
    graficoEnergia: 'Energía en el tiempo',
    ninguna: '—',
    derrumbes: 'derrumbes',
  },
  logros: {
    /** Va después del número de conseguidos, en grande: "7 de 16". */
    deTotal: (total: number) => `de ${total}`,
    titulo: 'Logros',
    /** Pestañas de la pantalla de logros, una por capa (CAPAS en logros.ts). */
    capas: { pila: 'Capa 0 · Pila', cristalizacion: 'Capa 1 · Cristalización' } as Record<string, string>,
    bloqueada: 'Llegá al Infinito',
    cuenta: (n: number, total: number) => `${n} / ${total}`,
    volver: 'Volver a la pila',
    conseguido: 'Conseguido',
    pendiente: 'Sin conseguir',
    /** La notificación al conseguir uno. */
    nuevo: 'Logro conseguido',
    recompensa: { paleta: 'Paleta', efecto: 'Efecto', marco: 'Marco' } as Record<string, string>,
    /** Nombre y descripción; n es el número del logro (logros.ts, UMBRAL), ya con formato. */
    lista: {
      derrumbe: ['Primer derrumbe', () => 'Una celda junta 4 granos y se derrumba.'],
      granos: [(n) => `${n} granos`, (n) => `Tener ${n} granos en la pila.`],
      avalancha: [(n) => `Avalancha de ${n}`, (n) => `Una avalancha de ${n} derrumbes.`],
      colores: ['Los cuatro colores', () => 'Ámbar, Coral, Jade y Violeta, todos con al menos un nivel.'],
      hito: ['Primer ×4', (n) => `Llevar un color al nivel ${n}.`],
      anillo: [(n) => `Anillo ${n}`, (n) => `Llegar a ${n} anillos en una corrida.`],
      compresion: ['Primera Compresión', () => 'Comprimir la pila por primera vez.'],
      sinAmbar: ['Sin Ámbar', () => 'Comprimir sin haber comprado Ámbar en esa corrida.'],
      cascada: ['Cascada al máximo', () => 'Llevar la Cascada a su nivel máximo.'],
      mutacion: ['Primera Mutación', () => 'Comprar una Mutación.'],
      mutaciones: ['Mutación total', () => 'Todas las Mutaciones al máximo.'],
      densidad: [(n) => `Densidad ^${n}`, (n) => `Llegar a Densidad ^${n}.`],
      anilloGrande: [(n) => `Anillo ${n}`, (n) => `Llegar a ${n} anillos en una corrida.`],
      record: [(n) => `Avalancha de ${n}`, (n) => `Una avalancha de ${n} derrumbes en la pila.`],
      infinito: ['Infinito', () => 'Llegar al Infinito.'],
      infinitoRapido: ['Infinito veloz', (n) => `Llegar al Infinito en menos de ${n} horas de juego.`],
      llena: ['Hasta el borde', () => 'Llenar la pila hasta que toque el borde.'],
      alud: ['Alud', (n) => `Una avalancha de ${n} derrumbes.`],
      anilloMedio: [(n) => `Anillo ${n}`, (n) => `Llegar a ${n} anillos en una corrida.`],
      mandala: ['Mandala pleno', (n) => `Los cuatro colores en nivel ${n} a la vez.`],
      diez: [(n) => `${n} Compresiones`, (n) => `Comprimir la pila ${n} veces.`],
      relampago: ['Corrida relámpago', (n) => `Comprimir en menos de ${n} minutos de corrida.`],
      piloto: ['Piloto automático', () => 'Todos los autocompradores desbloqueados y encendidos a la vez.'],
      densidadAlta: [(n) => `Densidad ^${n}`, (n) => `Llegar a Densidad ^${n}.`],
    } as Record<string, [string | ((n: string) => string), (n: string) => string]>,
  },
  /** Nombres de las recompensas de los logros (paletas.ts). */
  cosmeticos: {
    paleta: {
      arena: 'Arena', brasa: 'Brasa', aurora: 'Aurora', glaciar: 'Glaciar', ceniza: 'Ceniza', musgo: 'Musgo',
      tinta: 'Tinta', negativo: 'Negativo', oroViejo: 'Oro viejo',
    },
    efecto: {
      normal: 'Del color de la celda', blanco: 'Destello blanco', estela: 'Estela larga', chispas: 'Chispas',
      cascada: 'Onda doble', relampago: 'Relámpago', mutante: 'Mutante', arcoiris: 'Arcoíris', oro: 'Oro',
    },
    marco: {
      ninguno: 'Sin marco', fino: 'Fino', doble: 'Doble', anillos: 'Anillos', orbitas: 'Órbitas', muescas: 'Muescas',
      denso: 'Denso', rosa: 'Rosa de los vientos', infinito: 'Infinito',
    },
  } as Record<string, Record<string, string>>,
  opciones: {
    aspecto: 'Aspecto de la pila',
    paleta: 'Paleta',
    efecto: 'Efecto de avalancha',
    marco: 'Marco de la foto',
    foto: 'Sacar foto del mandala',
    archivoFoto: 'avalancha-mandala.png',
    masConLogros: 'Los logros desbloquean más paletas, efectos y marcos.',
    daltonismoManda: 'Con la paleta para daltonismo activada, la pila usa esa.',
    notacion: 'Notación',
    cientifica: 'Científica',
    ingenieria: 'Ingeniería',
    volumen: 'Volumen',
    sinSonido: 'Todavía no hay sonidos.',
    daltonismo: 'Paleta para daltonismo',
    partida: 'Partida',
    guardarAhora: 'Guardar ahora',
    guardado: 'Guardado.',
    exportar: 'Exportar',
    exportado: 'Copiado al portapapeles. Guardalo donde quieras.',
    exportadoSinCopiar: 'Copiá este texto y guardalo donde quieras.',
    importar: 'Importar',
    pegar: 'Pegá acá el texto de una partida exportada',
    importarMal: 'Ese texto no es una partida válida.',
    importarConfirma: (desc: string) => `Esto reemplaza tu partida actual por la importada (${desc}).`,
    descPartida: (compresiones: number, tiempo: string) =>
      `${compresiones === 1 ? '1 compresión' : `${compresiones.toLocaleString('es-AR')} compresiones`}, ${tiempo} de juego`,
    reemplazar: 'Reemplazar mi partida',
    cancelar: 'Cancelar',
    borrar: 'Borrar partida',
    borrarConfirma: '¿Borrar tu partida? Se pierde todo el progreso. Los ajustes quedan.',
    borrarSi: 'Sí, borrar',
    borrarConfirma2: 'Última confirmación: no se puede deshacer.',
    borrarDefinitivo: 'Borrar para siempre',
    teclado: 'Teclado',
    teclas: [
      ['Espacio', 'soltar un puñado'],
      ['M', 'comprar todo'],
      ['C', 'comprimir'],
      ['Tab', 'moverse por la interfaz'],
      ['L', 'ver los logros'],
      ['E', 'ver las estadísticas'],
      ['Esc', 'cerrar este panel, los logros o las estadísticas'],
    ],
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
    borrar: 'Borrar partida',
    nivelColores: 'Nivel de los colores (0 = real)',
    fps: 'fps',
    peorCuadro: 'peor cuadro (ms)',
    granosSeg: 'granos/s en la pila',
    derrumbesSeg: 'derrumbes/s',
    workerMs: 'worker (ms por segundo)',
    cuadroMs: 'hilo principal (ms por cuadro)',
  },
}
