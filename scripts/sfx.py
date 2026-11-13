# Genera los sonidos de marcador de posición (SPEC 6.7): tonos simples para poder probar.
# El audio final los reemplaza con los mismos nombres. Uso: python scripts/sfx.py (necesita ffmpeg en el PATH).
# Escribe public/sfx/<nombre>.ogg (Vorbis) y .m4a (AAC, para Safari, que no decodifica Vorbis).
import math, os, random, struct, subprocess, tempfile, wave

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sfx')
random.seed(7)


def env(t, dur, ataque=0.005):
    return min(1, t / ataque) * max(0, 1 - t / dur) ** 3


def granulado(dur, granos):
    """Derrumbe: ráfaga de clics de ruido filtrado."""
    n = int(SR * dur)
    s = [0.0] * n
    for _ in range(granos):
        t0 = int(random.random() * (n - SR * 0.02) * random.random())
        largo = int(SR * random.uniform(0.004, 0.012))
        a = random.uniform(0.3, 1)
        y = 0.0
        for i in range(largo):
            y = 0.6 * y + 0.4 * random.uniform(-1, 1)  # pasabajos simple
            s[t0 + i] += a * y * (1 - i / largo)
    return [x * (1 - i / n) for i, x in enumerate(s)]


def campana(f, dur):
    """Compra: clic cristalino (seno con armónicos inarmónicos, caída rápida)."""
    return [env(i / SR, dur) * (math.sin(2 * math.pi * f * i / SR) + 0.4 * math.sin(2 * math.pi * f * 2.76 * i / SR)
                               + 0.2 * math.sin(2 * math.pi * f * 5.4 * i / SR)) for i in range(int(SR * dur))]


def acorde(fs, dur, escalonado=0.04):
    n = int(SR * dur)
    s = [0.0] * n
    for k, f in enumerate(fs):
        d = int(SR * escalonado * k)
        for i in range(n - d):
            t = i / SR
            s[d + i] += env(t, dur - d / SR, 0.01) * (math.sin(2 * math.pi * f * t) + 0.3 * math.sin(4 * math.pi * f * t))
    return s


def pad(fs, dur=8.0):
    """Fondo en bucle: frecuencias múltiplo de 1/dur, así el bucle cierra sin clic."""
    fs = [round(f * dur) / dur for f in fs]
    return [sum(math.sin(2 * math.pi * f * i / SR) * (0.6 + 0.4 * math.sin(2 * math.pi * i / SR / dur * (k + 1)))
                for k, f in enumerate(fs)) for i in range(int(SR * dur))]


def escribir(nombre, s, pico=0.8):
    m = max(abs(x) for x in s) or 1
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, nombre + '.wav')
        with wave.open(wav, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes(b''.join(struct.pack('<h', int(x / m * pico * 32767)) for x in s))
        for ext, codec in (('ogg', ['-c:a', 'libvorbis', '-q:a', '3']), ('m4a', ['-c:a', 'aac', '-b:a', '96k'])):
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, *codec, os.path.join(OUT, f'{nombre}.{ext}')], check=True)
    print(nombre)


os.makedirs(OUT, exist_ok=True)
escribir('topple_small', granulado(0.15, 6), 0.5)
escribir('topple_medium', granulado(0.35, 25), 0.7)
escribir('topple_large', granulado(0.8, 90))
# Una nota por color (pentatónica), el Caudal más grave; lo demás de la tienda usa buy_other.
for nombre, f in (('caudal', 440), ('ambar', 660), ('coral', 784), ('jade', 880), ('violeta', 1047), ('other', 587)):
    escribir(f'buy_{nombre}', campana(f, 0.25), 0.6)
escribir('chord_milestone', acorde([523, 659, 784], 0.9))
escribir('chord_ring', acorde([392, 494, 587, 784], 1.2, 0.06))
escribir('chord_color', acorde([440, 554, 659, 880], 1.4, 0.08))
for nombre, fs in (('ambar', [110, 165]), ('coral', [220, 277]), ('jade', [330, 440]), ('violeta', [554, 659])):
    escribir(f'pad_{nombre}', pad(fs), 0.35)
