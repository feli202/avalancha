# Montaje del tráiler con ffmpeg: tomas reales (tomas/), voz (voz/), sonido del juego, música y subtítulos palabra por palabra.
# uso: python marketing/trailer/montar.py v|h en|es   → marketing/trailer/trailer_<vertical|horizontal>_<idioma>.mp4
import json, subprocess, sys
from pathlib import Path

AQUI = Path(__file__).parent
VOZ = {'en': 'en-US-ChristopherNeural', 'es': 'es-AR-TomasNeural'}  # la de los subtítulos ya grabados
VOZ_NUEVA = 'elevenlabs-brian'  # montar.py v en --audio: solo cambia la voz (voz_elevenlabs.py)
FIN = {'en': ('Play free', 'exponent-games.itch.io/avalanche'), 'es': ('Jugalo gratis', 'exponent-games.itch.io/avalanche')}
# Vertical: las tomas con interfaz se achican y bajan sobre el fondo del juego, así el contador de energía no queda
# debajo de la barra de arriba de TikTok (~250 px de 1920).
ACHICAR = {'numeros', 'infinito', 'red', 'reliquias', 'estratos', 'romper'}
AMBAR = '&H47B5FF&'  # #FFB547, el ámbar del juego (ASS va en BGR)
# Volumen del sonido del juego por toma (el derrumbe del primer grano es muy suave).
GANANCIA = {'inicio': 6.0}

# Tomas por formato: (toma, desde s, dura s). Las frases (n.º del guion) van a su tiempo; si una pisa a la anterior, se corre.
CRECE = lambda d, desde=0.4: [(t, desde + k * d, d) for k, t in enumerate(['crece', 'crece_brasa', 'crece_glaciar', 'crece_aurora'])]
MONTAJE = {
    'v': dict(
        cortes=[('inicio', 0.0, 4.0), ('avalancha', 2.4, 3.0), *CRECE(1.2), ('numeros', 0.0, 5.3), ('comprimir', 0.3, 4.6),
                ('infinito', 1.3, 6.6), ('red', 0.3, 1.2), ('reliquias', 0.3, 1.1), ('estratos', 0.8, 1.3), ('romper', 1.8, 3.8),
                ('titulo', 0.0, 7.5)],
        frases=[0.25, 1.75, 4.2, 7.1, 11.9, 17.2, 21.8, 24.9, 32.0, 35.9, 40.9], fin=40.7),
    'h': dict(
        cortes=[('inicio', 0.0, 4.4), ('avalancha', 1.5, 4.5), *CRECE(1.5), ('numeros', 0.0, 5.5), ('comprimir', 0.0, 5.0),
                ('infinito', 0.0, 8.5), ('red', 0.0, 4.5), ('reliquias', 0.3, 4.2), ('estratos', 0.5, 5.5), ('defectos', 0.3, 3.5),
                ('romper', 0.5, 5.8), ('titulo', 0.0, 9.5)],
        frases=[0.3, 1.7, 4.7, 9.2, 15.0, 20.6, 25.7, 29.4, 52.0, 57.8, 63.1], fin=62.6),
}


def sh(*a):
    subprocess.run(a, check=True)


def dur(f):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)], capture_output=True, text=True).stdout)


def ass_t(s):
    return f'{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}'


def subtitulos(f, idioma, lineas, fin, total, W, H):
    """Palabra por palabra: grupos de hasta 3 palabras; cada una aparece cuando se dice y la que suena va en ámbar."""
    v = f == 'v'
    tam, abajo = (92, 600) if v else (68, 80)
    # Zona segura de TikTok: ni los botones de la derecha (~200 px) ni el texto de abajo (~480 px).
    izq, der = (110, 210) if v else (200, 200)
    ev = []
    for t0, palabras in lineas:
        grupos, g = [], []
        for i, w in enumerate(palabras):
            g.append(w)
            sig = palabras[i + 1] if i + 1 < len(palabras) else None
            # Corta cada 3 palabras o en una pausa de la voz (edge-tts no manda la puntuación).
            largo = sig and len(' '.join(x['p'] for x in g + [sig])) > (16 if v else 26)  # que entre en una línea
            if len(g) == 3 or largo or (sig and sig['t'] - (w['t'] + w['d']) > 0.3):
                grupos.append(g); g = []
        if g: grupos.append(g)
        for gi, g in enumerate(grupos):
            hasta = (grupos[gi + 1][0]['t'] if gi + 1 < len(grupos) else g[-1]['t'] + g[-1]['d'] + 0.35) + t0
            for i, w in enumerate(g):
                desde = t0 + w['t']
                fin_w = t0 + g[i + 1]['t'] if i + 1 < len(g) else hasta
                txt = ' '.join((f'{{\\c{AMBAR}}}' if j == i else '{\\c&HFFFFFF&}') + x['p'] if j <= i else '{\\alpha&HFF&}' + x['p'] for j, x in enumerate(g))
                ev.append(f'Dialogue: 0,{ass_t(desde)},{ass_t(fin_w)},Sub,,0,0,0,,{{\\alpha&H00&}}{txt}')
    # Cierre: el llamado y la dirección, debajo del título del juego.
    juega, url = FIN[idioma]
    y1, y2 = (int(H * 0.578), int(H * 0.62)) if v else (int(H * 0.70), int(H * 0.77))
    ev.append(f'Dialogue: 1,{ass_t(fin)},{ass_t(total)},Fin,,0,0,0,,{{\\an5\\pos({W // 2},{y1})\\fad(400,0)}}{juega}')
    ev.append(f'Dialogue: 1,{ass_t(fin + 0.25)},{ass_t(total)},Url,,0,0,0,,{{\\an5\\pos({W // 2},{y2})\\fad(400,0)}}{url}')
    f_ass = AQUI / f'sub_{f}_{idioma}.ass'
    f_ass.write_text(f'''[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Space Grotesk,{tam},&H00FFFFFF,&H00FFFFFF,&H000F0807,&H8C07080F,-1,0,0,0,100,100,0,0,4,{5 if v else 4},{14 if v else 10},2,{izq},{der},{abajo},1
Style: Fin,Space Grotesk,{86 if v else 72},&H00FFFFFF,&H00FFFFFF,&H000F0807,&H96000000,-1,0,0,0,100,100,0,0,1,4,2,5,0,0,0,1
Style: Url,Space Grotesk,{50 if v else 44},&H0047B5FF,&H00FFFFFF,&H000F0807,&H96000000,0,0,0,0,100,100,0,0,1,3,2,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
''' + '\n'.join(ev) + '\n', encoding='utf8')
    return f_ass


def recolocar(frases, idioma, total):
    """La voz nueva (una sola generación, voz_elevenlabs.py) en el lugar de la vieja, cuyos subtítulos ya están grabados en el
    video: cada tramo (hasta un punto, coma o puntos suspensivos) empieza y termina donde empiezan y terminan sus palabras.
    Cada tramo se estira o comprime como mucho entre ×0,9 y ×1,12; si no alcanza, avisa."""
    d = AQUI / 'voz' / VOZ_NUEVA / idioma
    texto = json.loads(json.dumps(__import__('voz_elevenlabs').guion()[idioma]))
    tramos = []
    for n, (mp3, a, b, t) in enumerate(frases):
        vieja = json.loads((AQUI / 'voz' / VOZ[idioma] / f'{n:02d}.json').read_text(encoding='utf8'))
        nueva = json.loads((d / f'{n:02d}.json').read_text(encoding='utf8'))
        cortes = [w.endswith(('.', ',', '…')) for w in texto[n].split(' ') if w.strip('.,…')]
        if not (len(vieja) == len(nueva) == len(cortes)):
            print(f'  frase {n}: no coinciden las palabras ({len(vieja)}/{len(nueva)}/{len(cortes)}), va entera'); cortes = [False] * (len(nueva) - 1) + [True]
            vieja, nueva = [vieja[0], vieja[-1]], [nueva[0], nueva[-1]]
        ini = 0
        for k, fin in enumerate(cortes):
            if not fin and k < len(cortes) - 1: continue
            v0, v1, n0, n1 = vieja[ini], vieja[k], nueva[ini], nueva[k]
            larga_v = v1['t'] + v1['d'] - v0['t']
            larga_n = n1['t'] + n1['d'] - n0['t']
            tempo = min(1.12, max(0.9, larga_n / larga_v))
            if abs(larga_n / tempo - larga_v) > 0.15:
                print(f'  frase {n}, tramo "{n0["p"]}…{n1["p"]}": dura {larga_n / tempo:.2f} s y su subtítulo {larga_v:.2f} s')
            # Márgenes que no se metan en la palabra vecina de la voz nueva (si no, se oiría repetida).
            antes = min(0.04, (n0['t'] - (nueva[ini - 1]['t'] + nueva[ini - 1]['d'])) / 2) if ini else 0.04
            colita = 0.3 if k == len(cortes) - 1 else min(0.08, (nueva[k + 1]['t'] - (n1['t'] + n1['d'])) / 2)
            tramos.append((d / 'todo.mp3', max(0, n0['t'] - antes), n1['t'] + n1['d'] + colita, t - a + v0['t'] - antes / tempo, tempo))
            ini = k + 1
    return tramos


def main(f, idioma, solo_audio=False):
    W, H = (1080, 1920) if f == 'v' else (1920, 1080)  # medidas de los subtítulos (libass escala)
    OW, OH = 2 * W, 2 * H  # salida en 4K
    m = MONTAJE[f]
    total = sum(c[2] for c in m['cortes'])
    tomas = AQUI / 'tomas'
    # Voz: cada frase recortada a sus palabras; si pisa a la anterior, se corre.
    vdir = AQUI / 'voz' / VOZ[idioma]
    lineas, frases, libre = [], [], 0
    for n, t in enumerate(m['frases']):
        pal = json.loads((vdir / f'{n:02d}.json').read_text(encoding='utf8'))
        a = max(0, pal[0]['t'] - 0.06)
        b = pal[-1]['t'] + pal[-1]['d'] + 0.3
        t = max(t, libre)
        libre = t + (b - a) + 0.25
        frases.append((vdir / f'{n:02d}.mp3', a, b, t))
        lineas.append((t - a, pal))
    total = max(total, libre + 0.6)
    ass = subtitulos(f, idioma, lineas, m['fin'], total, W, H) if not solo_audio else None
    frases = recolocar(frases, idioma, total) if solo_audio else [(*x, 1.0) for x in frases]
    nombre = AQUI / f"trailer_{'vertical' if f == 'v' else 'horizontal'}_{idioma}.mp4"
    # Solo audio: el video del tráiler ya montado se copia tal cual (entrada 0) y se arma el audio de nuevo, sin la voz vieja.
    ent, fc, vs, sons = (['-i', str(nombre)] if solo_audio else []), [], [], []
    t = 0
    for i, (toma, desde, d) in enumerate(m['cortes']):
        if i == len(m['cortes']) - 1: d = total - t  # la última toma llega hasta el final
        video = tomas / f'{toma}_{idioma}_{f}.mp4'  # las tomas con texto del juego, en cada idioma
        if not solo_audio: ent += ['-i', str(video if video.exists() else tomas / f'{toma}_{f}.mp4')]
        if not solo_audio: fc.append(f'[{i}:v]trim={desde}:{desde + d},setpts=PTS-STARTPTS,fps=60,' + (f'scale={int(OW * 0.86) // 2 * 2}:{int(OH * 0.86) // 2 * 2}:flags=lanczos,pad={OW}:{OH}:(ow-iw)/2:{int(OH * 0.105)}:color=0x07080f' if f == 'v' and toma in ACHICAR else f'scale={OW}:{OH}:flags=lanczos') + f',setsar=1[v{i}]')
        vs.append(f'[v{i}]')
        wav = tomas / f'{toma}.wav'
        sons.append((wav if wav.exists() else None, desde, d, t, GANANCIA.get(toma, 0.55)))
        t += d
    nv = len(m['cortes'])
    fuente = (AQUI / 'fuente').as_posix().replace(':', '\\:')
    sub = ass.as_posix().replace(':', '\\:') if ass else ''
    if not solo_audio: fc.append(f"{''.join(vs)}concat=n={nv}:v=1:a=0,fade=t=out:st={total - 0.6}:d=0.6,subtitles='{sub}':fontsdir='{fuente}'[vid]")

    k = 1 if solo_audio else nv
    mezcla = []
    # Sonido del juego debajo (cada toma con su pasada de audio)
    for wav, desde, d, t0, gan in sons:
        if not wav: continue
        ent += ['-i', str(wav)]
        fc.append(f'[{k}:a]atrim={desde}:{desde + d},asetpts=PTS-STARTPTS,afade=t=in:d=0.05,afade=t=out:st={max(0, d - 0.08)}:d=0.08,adelay={int(t0 * 1000)}:all=1,volume={gan}[s{k}]')
        mezcla.append(f'[s{k}]'); k += 1
    voces = []
    for mp3, a, b, t0, tempo in frases:
        ent += ['-i', str(mp3)]
        fc.append(f'[{k}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,atempo={tempo:.4f},aresample=48000,aformat=channel_layouts=stereo,adelay={int(t0 * 1000)}:all=1[z{k}]')
        voces.append(f'[z{k}]'); k += 1
    fc.append(f"{''.join(voces)}amix=inputs={len(voces)}:normalize=0,volume=1.6,asplit=2[voz][llave]")
    musica = AQUI / 'musica.mp3'
    if not musica.exists(): musica = tomas / 'musica.wav'  # la música generativa del juego (grabar.mjs musica)
    if musica.exists():
        ent += ['-stream_loop', '-1', '-i', str(musica)]
        # La música baja cuando habla la voz (sidechain) y se funde al final.
        fc.append(f'[{k}:a]atrim=0:{total},aresample=48000,aformat=channel_layouts=stereo,volume=0.5,afade=t=in:d=0.4,afade=t=out:st={total - 2}:d=2[mus0]')
        fc.append('[mus0][llave]sidechaincompress=threshold=0.03:ratio=8:attack=40:release=450[mus]')
        mezcla.append('[mus]')
    else:
        print('  sin musica.mp3: el tráiler sale sin música')
        fc.append('[llave]anullsink')
    fc.append(f"[voz]{''.join(mezcla)}amix=inputs={1 + len(mezcla)}:normalize=0,volume=1.41,alimiter=limit=0.85:level=disabled,atrim=0:{total}[aud]")
    if solo_audio:
        (AQUI / 'final').mkdir(exist_ok=True)
        salida = AQUI / 'final' / nombre.name
        sh('ffmpeg', '-y', '-loglevel', 'error', *ent, '-filter_complex', ';'.join(fc), '-map', '0:v', '-map', '[aud]', '-c:v', 'copy',
           '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-t', f'{dur(nombre):.3f}', str(salida))
        return print(f'final/{salida.name}: {dur(salida):.1f} s')
    sh('ffmpeg', '-y', '-loglevel', 'error', *ent, '-filter_complex', ';'.join(fc), '-map', '[vid]', '-map', '[aud]',
       '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '60',
       '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-t', f'{total:.2f}', str(nombre))
    print(f'{nombre.name}: {dur(nombre):.1f} s')
    # Miniatura: un cuadro de la pantalla de título del juego (logo y "Avalancha" sobre la pila), sin subtítulos.
    mini = AQUI / f"miniatura_{'vertical' if f == 'v' else 'horizontal'}.png"
    sh('ffmpeg', '-y', '-loglevel', 'error', '-ss', '3.5', '-i', str(tomas / f'titulo_{f}.mp4'), '-frames:v', '1', str(mini))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], '--audio' in sys.argv)
