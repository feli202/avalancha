# Voz del tráiler con edge-tts (voces neuronales de Microsoft, gratis, sin clave).
# Una frase por archivo, con el tiempo de cada palabra (para los subtítulos palabra por palabra).
# uso: python marketing/trailer/voz.py [voz ...]   → marketing/trailer/voz/<voz>/<n>.mp3 y <n>.json
import asyncio, json, sys
from pathlib import Path
import edge_tts

GUION = {
    'en': ["One grain.", "Four grains... and it falls.", "That's the only rule.",
           "But one rule is enough to build... this.",
           "Every avalanche makes energy. Every upgrade makes bigger avalanches.",
           "Compress the pile. Start again. Faster.", "Until you reach infinity.",
           "And then... everything freezes.", "And infinity breaks.",
           "Avalancha. A free incremental game built on a real math problem.", "Play it free in your browser."],
    'es': ["Un grano.", "Cuatro granos... y se derrumba.", "Esa es la única regla.",
           "Pero una regla alcanza para construir... esto.",
           "Cada avalancha genera energía. Cada mejora, avalanchas más grandes.",
           "Comprimí la pila. Empezá de nuevo. Más rápido.", "Hasta llegar al infinito.",
           "Y entonces... todo se congela.", "Y el infinito se rompe.",
           "Avalancha. Un juego incremental gratis, basado en un problema matemático real.", "Jugalo gratis en tu navegador."],
}
# Calma e íntima: un poco más lenta y más grave que la voz normal.
AJUSTE = dict(rate='-5%', pitch='-6Hz')


async def frase(voz, texto, dest):
    com = edge_tts.Communicate(texto, voz, boundary='WordBoundary', **AJUSTE)
    palabras = []
    with open(dest.with_suffix('.mp3'), 'wb') as f:
        async for m in com.stream():
            if m['type'] == 'audio':
                f.write(m['data'])
            elif m['type'] == 'WordBoundary':  # offset y duración en unidades de 100 ns
                palabras.append({'p': m['text'], 't': m['offset'] / 1e7, 'd': m['duration'] / 1e7})
    dest.with_suffix('.json').write_text(json.dumps(palabras, ensure_ascii=False), encoding='utf8')


async def main(voces):
    for voz in voces:
        idioma = 'es' if voz.startswith('es-') else 'en'
        d = Path(__file__).parent / 'voz' / voz
        d.mkdir(parents=True, exist_ok=True)
        for i, t in enumerate(GUION[idioma]):
            await frase(voz, t, d / f'{i:02d}')
        print(voz, 'ok')

asyncio.run(main(sys.argv[1:] or ['en-US-ChristopherNeural', 'en-US-AndrewNeural', 'en-US-SteffanNeural', 'es-AR-TomasNeural']))
