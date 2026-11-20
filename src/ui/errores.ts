// v1.0, bloque 1: los últimos errores de la consola, para "Reportar un problema" (Ajustes).
const MAX = 20
export const errores: string[] = []

const anotar = (nivel: string, args: unknown[]) => {
  const texto = args.map((a) => (a instanceof Error ? `${a.message}\n${a.stack ?? ''}` : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
  errores.push(`[${new Date().toISOString()}] ${nivel}: ${texto.slice(0, 2000)}`)
  if (errores.length > MAX) errores.shift()
}

/** Envuelve console.error/warn y escucha los errores sin atrapar. Llamar una vez al arrancar. */
export function escucharErrores() {
  for (const nivel of ['error', 'warn'] as const) {
    const orig = console[nivel].bind(console)
    console[nivel] = (...args: unknown[]) => { try { anotar(nivel, args) } catch { /* un objeto circular: igual se muestra */ } orig(...args) }
  }
  addEventListener('error', (e) => anotar('error', [e.error ?? e.message]))
  addEventListener('unhandledrejection', (e) => anotar('promesa', [e.reason]))
}
