"""Capa 2, fase 1B: genera códigos de beta.

Agrega N códigos nuevos a privado/codigos_beta.txt (fuera de git: es la lista para repartir) y reescribe
src/guardado/codigosBeta.ts con el SHA-256 de todos (lo único que va en el juego). Uso: python scripts/codigos_beta.py [N]
"""
import hashlib, secrets, sys
from pathlib import Path

ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'  # sin 0 O 1 I L; el mismo que CODIGO_BETA en src/guardado/guardado.ts
SAL = 'avalancha-beta:'  # el mismo que hashCodigo en src/guardado/beta.ts
RAIZ = Path(__file__).resolve().parent.parent
LISTA = RAIZ / 'privado' / 'codigos_beta.txt'
TS = RAIZ / 'src' / 'guardado' / 'codigosBeta.ts'

n = int(sys.argv[1]) if len(sys.argv) > 1 else 100
LISTA.parent.mkdir(exist_ok=True)
viejos = [l.split()[0] for l in LISTA.read_text(encoding='utf-8').splitlines() if l.strip()] if LISTA.exists() else []
nuevos = []
while len(nuevos) < n:
    c = ''.join(secrets.choice(ALFABETO) for _ in range(8))
    if c not in viejos and c not in nuevos:
        nuevos.append(c)
with LISTA.open('a', encoding='utf-8') as f:
    f.writelines(c + '\n' for c in nuevos)
todos = viejos + nuevos
hashes = sorted(hashlib.sha256((SAL + c).encode()).hexdigest() for c in todos)
TS.write_text(
    '// Generado por scripts/codigos_beta.py: SHA-256 de los códigos de beta (la lista está en privado/, fuera de git).\n'
    'export const HASHES_BETA: readonly string[] = [\n' + ''.join(f"  '{h}',\n" for h in hashes) + ']\n',
    encoding='utf-8', newline='\n')
print(f'{len(nuevos)} códigos nuevos ({len(todos)} en total) en {LISTA}')
