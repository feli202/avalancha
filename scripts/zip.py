# Arma avalancha-demo.zip con el contenido de dist/ (index.html en la raíz).
# No usar Compress-Archive de PowerShell 5.1: guarda las rutas con "\" y en itch.io/galaxy.click el juego queda en negro.
# uso: npm run zip   (hace la build y después corre esto; v1.0: marketing/itch/avalancha-web.zip)
import pathlib, sys, zipfile

dist = pathlib.Path('dist')
salida = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'marketing/itch/avalancha-web.zip')
with zipfile.ZipFile(salida, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(dist.rglob('*')):
        if f.is_file():
            z.write(f, f.relative_to(dist).as_posix())

# Revisa los nombres crudos (zipfile en Windows los muestra con "/" aunque tengan "\").
with zipfile.ZipFile(salida) as z:
    crudos = [i.orig_filename for i in z.infolist()]
assert 'index.html' in crudos and not any('\\' in n for n in crudos), crudos
print(f'{salida}: {salida.stat().st_size:,} bytes, {len(crudos)} archivos')
