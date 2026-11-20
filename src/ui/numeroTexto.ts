// v1.0, bloque 10: lo que el jugador escribe en un campo de número: 1e12, 1E12, 1,5e30, 1.5e30, 1000000, 1.000.000.
// Devuelve el log10 (los números de la Capa 1 viven en log10 y pueden pasar de 1e308), o null si no es un número positivo.
export function leerLog10(texto: string): number | null {
  let t = texto.trim().replace(/\s/g, '').replace(/^\+/, '')
  if (/^\d{1,3}([.,]\d{3})+$/.test(t) && !/^\d+[.,]\d{3}$/.test(t)) t = t.replace(/[.,]/g, '') // 1.000.000 o 1,000,000
  else t = t.replace(',', '.')
  const m = /^(\d+(?:\.\d*)?|\.\d+)(?:e([+-]?\d+))?$/i.exec(t)
  if (!m) return null
  const mant = Number(m[1]), exp = Number(m[2] ?? 0)
  if (!(mant > 0) || !Number.isFinite(exp)) return null
  return Math.log10(mant) + exp
}
