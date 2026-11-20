# v1.0, bloque 12: lleva las capturas crudas de capturas-itch.mjs a los tamaños de itch.io y arma el GIF.
# uso: python scripts/itch_final.py marketing/itch
import pathlib, sys
from PIL import Image

out = pathlib.Path(sys.argv[1]); crudas = out / 'crudas'
def guardar(src, dst, w, h):
    im = Image.open(src).convert('RGB')
    if im.size != (w, h): im = im.resize((w, h), Image.LANCZOS)
    im.save(out / dst, optimize=True)
    print(dst, im.size)

if (crudas / 'portada.png').exists():
    guardar(crudas / 'portada.png', 'portada-1260x1000.png', 1260, 1000)
    guardar(crudas / 'portada.png', 'portada-630x500.png', 630, 500)
for f in sorted(crudas.glob('*-[0-9]-*.png')):
    if f.name.startswith('celular'): guardar(f, f.name.replace('.png', '-1080x1920.png'), 1080, 1920)
    else: guardar(f, f.name.replace('.png', '-1920x1080.png'), 1920, 1080)

# El GIF con ffmpeg (paleta propia; la pila es casi ruido y Pillow lo deja en 15 MB): 8 cuadros/s, 48 colores, ~8,6 MB.
import subprocess
if any((crudas / 'gif').glob('*.jpg')):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '9.5', '-i', str(crudas / 'gif' / '%03d.jpg'), '-vf',
        'fps=8,split[a][b];[a]palettegen=max_colors=48:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
        '-loop', '0', str(out / 'avalancha-600.gif')], check=True)
    print('avalancha-600.gif', (out / 'avalancha-600.gif').stat().st_size, 'bytes')
