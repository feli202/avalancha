/**
 * Los bytes de pilas.bin (gzip) ya descomprimidos. Se mira la firma en vez de descomprimir siempre: itch.io sirve
 * los archivos gzip con `Content-Encoding: gzip`, el navegador los entrega abiertos y descomprimir de nuevo falla.
 */
export async function leerFotos(url: string): Promise<Uint8Array> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`pilas.bin: ${r.status}`)
  const b = new Uint8Array(await r.arrayBuffer())
  if (b[0] !== 0x1f || b[1] !== 0x8b) return b // las fotos empiezan con una altura (0–4), nunca con 1f 8b
  return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())
}
