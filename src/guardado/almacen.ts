// SPEC 8: lo único que toca el almacenamiento del navegador. Para Steam, otra implementación sobre archivos.
export interface Almacen {
  leer(clave: string): string | null
  escribir(clave: string, texto: string): void
}

export const almacenLocal: Almacen = {
  leer: (clave) => localStorage.getItem(clave),
  escribir: (clave, texto) => localStorage.setItem(clave, texto),
}
