// C13: las grietas del hielo al final de la Capa 1 (la cinemática de Pila.svelte y el fondo de la pantalla de la Capa 2).
// Caminos SVG en un círculo de radio 100 centrado en 0; siempre los mismos (semilla fija).
let x = 20261118
const azar = () => (x = (x * 16807) % 2147483647) / 2147483647

const tramo = (a: number, r0: number, r1: number, paso: number, torcer: number) => {
  let d = ''
  for (let r = r0; r <= r1; r += paso * (0.7 + azar() * 0.6)) {
    a += (azar() - 0.5) * torcer
    d += `L${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`
  }
  return { d, a }
}

/** Nueve grietas desde el centro hasta el borde, y algunas ramas que salen de ellas a mitad de camino. */
export const GRIETAS: string[] = []
for (let i = 0; i < 9; i++) {
  const a0 = (i / 9) * 2 * Math.PI + azar() * 0.5
  const ad = tramo(a0, 6, 52, 9, 0.45), afuera = tramo(ad.a, 52, 106, 10, 0.4)
  GRIETAS.push(`M0 0${ad.d}${afuera.d}`)
  if (azar() < 0.6) {
    const r = 40 + azar() * 14, a = ad.a
    const rama = tramo(a + (azar() < 0.5 ? 0.6 : -0.6), r + 8, r + 34, 8, 0.5)
    GRIETAS.push(`M${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}${rama.d}`)
  }
}
