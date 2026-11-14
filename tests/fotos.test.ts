import { afterEach, expect, test, vi } from 'vitest'
import { leerFotos } from '../src/render/fotos'

const datos = new Uint8Array([4, 2, 2, 1, 0, 3, 4, 4])
const sirve = (cuerpo: BodyInit, status = 200) => vi.stubGlobal('fetch', async () => new Response(cuerpo, { status }))
afterEach(() => vi.unstubAllGlobals())

test('pilas.bin en gzip (dev, GitHub Pages): se descomprime', async () => {
  sirve(await new Response(new Blob([datos]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer())
  expect(await leerFotos('x')).toEqual(datos)
})

test('pilas.bin ya abierto por el navegador (itch.io, Content-Encoding: gzip): se usa tal cual', async () => {
  sirve(datos)
  expect(await leerFotos('x')).toEqual(datos)
})

test('un 404 falla', async () => {
  sirve(datos, 404)
  await expect(leerFotos('x')).rejects.toThrow('404')
})
