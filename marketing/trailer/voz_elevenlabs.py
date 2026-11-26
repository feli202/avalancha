# Narración del tráiler con ElevenLabs: UNA generación por idioma (el guion entero), con el tiempo de cada carácter.
# Corta el resultado en frases y palabras (para montar.py --audio). La clave sale de .env.local (onboard de la CLI) o de
# ELEVENLABS_API_KEY; nunca se escribe ni se imprime. No regenera si el idioma ya existe (cada generación gasta créditos).
# uso: python marketing/trailer/voz_elevenlabs.py en es   → voz/elevenlabs-brian/<idioma>/todo.mp3 y 00.json…10.json
import base64, json, os, sys, urllib.request
from pathlib import Path

AQUI = Path(__file__).parent
VOZ_ID, NOMBRE = 'nPczCjzI2devNBz1zQrb', 'elevenlabs-brian'  # Brian: grave, resonante, reconfortante
MODELO = 'eleven_multilingual_v2'  # la misma voz suena natural en inglés y en español
AJUSTES = {'stability': 0.6, 'similarity_boost': 0.8, 'style': 0.0, 'use_speaker_boost': True, 'speed': 0.95}  # calma, sin tono de publicidad


def clave():
    if os.environ.get('ELEVENLABS_API_KEY'): return os.environ['ELEVENLABS_API_KEY']
    for l in open(AQUI.parent.parent / '.env.local', encoding='utf8'):
        if l.startswith('ELEVENLABS_API_KEY='): return l.split('=', 1)[1].strip().strip('"\'')
    raise SystemExit('Falta ELEVENLABS_API_KEY')


def api(ruta, cuerpo=None):
    r = urllib.request.Request(f'https://api.elevenlabs.io{ruta}', headers={'xi-api-key': clave(), 'Content-Type': 'application/json'},
                               data=json.dumps(cuerpo).encode() if cuerpo else None)
    return json.load(urllib.request.urlopen(r, timeout=300))


def guion():
    g = {}
    exec((AQUI / 'voz.py').read_text(encoding='utf8').split('# Calma')[0].replace('import edge_tts', ''), g)  # el mismo GUION de voz.py
    return g['GUION']


def creditos():
    return api('/v1/user/subscription')['character_count']


def generar(idioma):
    d = AQUI / 'voz' / NOMBRE / idioma
    if (d / 'todo.mp3').exists():
        return print(f'{idioma}: ya generado, no se vuelve a pedir')
    lineas = guion()[idioma]
    texto = ' '.join(lineas)
    r = api(f'/v1/text-to-speech/{VOZ_ID}/with-timestamps?output_format=mp3_44100_128', {'text': texto, 'model_id': MODELO, 'voice_settings': AJUSTES})
    d.mkdir(parents=True, exist_ok=True)
    (d / 'todo.mp3').write_bytes(base64.b64decode(r['audio_base64']))
    al = r['alignment']
    (d / 'alineacion.json').write_text(json.dumps(al), encoding='utf8')
    assert ''.join(al['characters']) == texto, 'la alineación no coincide con el texto'
    ini, fin = al['character_start_times_seconds'], al['character_end_times_seconds']
    # Palabras de cada frase, con tiempos absolutos dentro de todo.mp3 (el formato de voz.py: p, t, d).
    pos = 0
    for n, linea in enumerate(lineas):
        palabras, i = [], pos
        for w in linea.split(' '):
            a, b = i, i + len(w) - 1
            limpia = w.strip('.,…')
            if limpia: palabras.append({'p': limpia, 't': ini[a], 'd': fin[b] - ini[a]})
            i += len(w) + 1
        (d / f'{n:02d}.json').write_text(json.dumps(palabras, ensure_ascii=False), encoding='utf8')
        pos += len(linea) + 1
    print(f'{idioma}: {len(texto)} caracteres, {fin[-1]:.1f} s de voz')


if __name__ == '__main__':
    antes = creditos()
    for idioma in sys.argv[1:]: generar(idioma)
    print(f'créditos usados en esta corrida: {creditos() - antes} (total de la cuenta: {creditos()})')
