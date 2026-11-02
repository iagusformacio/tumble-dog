#!/usr/bin/env python3
"""Parte la canción del tema «Dieta de Marcos» en un trozo por escena (issue #101).

Por qué: el mp3 completo (2:28, 2,4 MB) tarda en empezar a sonar y obliga a
descargarlo entero antes de la primera nota. Con un trozo por escena el juego
descarga ~20 s de música (≈240 KB) y el título suena enseguida.

Cómo corta (no se puede escuchar la canción desde el agente, así que todo es
medible):
  1. Decodifica el original a PCM mono 8 kHz (con ffmpeg) y mide el volumen por
     ventanas de 50 ms.
  2. Localiza el primer y el último tramo con música: el mp3 aportado empieza
     con ~8 s de silencio, que se descartan (era parte del problema).
  3. Divide ese intervalo en tantos trozos iguales como escenas y, para cada
     corte, busca el **valle de volumen** más profundo en ±1,5 s: el corte cae
     donde la música respira, no a mitad de una nota.
  4. Corta con ffmpeg y aplica **fundido de 0,3 s** en cada extremo, para que el
     principio y el final del trozo (y la repetición en bucle) no chasqueen.

Uso:
    python3 tools/split_music.py [--check]

Necesita `ffmpeg` en el PATH (o `pip install imageio-ffmpeg`, que lo trae; el
script lo busca también ahí). `--check` solo verifica que los trozos existen,
duran lo previsto y no se solapan: es lo que corre `npm test`.
"""
import array
import math
import os
import shutil
import subprocess
import sys
import tempfile
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGINAL = os.path.join(ROOT, 'assets/audio/dieta-de-marcos.mp3')
OUT_DIR = os.path.join(ROOT, 'assets/audio/dieta-de-marcos')

# Una escena de la campaña por trozo, en el orden en que se juegan.
SCENES = [
    ('01-titulo', 'título'),
    ('02-taca', 'Bar La Taca'),
    ('03-concursos', 'Bar Los Concursos'),
    ('04-pols', 'Bar Pols'),
    ('05-jefe-bar', 'Bar del Jefe'),
    ('06-jefes', 'jefes de bar'),
    ('07-bonus', 'ronda bonus'),
]

FADE = 0.3          # fundido en cada extremo (segundos)
BITRATE = '96k'     # 96 kbps mono: pesa poco y se oye bien
MIN_START_DB = -40  # por debajo de esto se considera silencio
WIN = 0.05          # ventana de análisis (segundos)
SR = 8000           # muestreo de análisis


def ffmpeg_bin():
    for name in ('ffmpeg', 'ffmpeg.exe'):
        p = shutil.which(name)
        if p:
            return p
    try:  # rueda de PyPI que trae el binario (útil en máquinas sin ffmpeg)
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def decode(ffmpeg):
    """Decodifica el original a PCM mono y devuelve las muestras."""
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, 'a.wav')
        if not os.path.exists(ORIGINAL):
            raise SystemExit('falta el original: ' + ORIGINAL)
        subprocess.run([ffmpeg, '-hide_banner', '-v', 'error', '-y', '-i', ORIGINAL,
                        '-ac', '1', '-ar', str(SR), '-f', 'wav', raw], check=True)
        w = wave.open(raw)
        a = array.array('h')
        a.frombytes(w.readframes(w.getnframes()))
        return a


def db_at(samples, t0, dur=WIN):
    i0 = max(0, int(t0 * SR))
    i1 = min(len(samples), int((t0 + dur) * SR))
    seg = samples[i0:i1]
    if not seg:
        return -99.0
    rms = math.sqrt(sum(x * x for x in seg) / len(seg))
    return 20 * math.log10(rms / 32768) if rms > 0 else -99.0


def music_span(samples):
    """Primer y último instante con música (fuera el silencio de cabecera y cola)."""
    dur = len(samples) / SR
    t, first = 0.0, None
    while t < dur:
        if db_at(samples, t) > MIN_START_DB:
            first = t
            break
        t += WIN
    t, last = dur, None
    while t > 0:
        if db_at(samples, max(0.0, t - 0.25)) > MIN_START_DB:
            last = t
            break
        t -= WIN
    if first is None or last is None or last - first < 8:
        raise SystemExit('no se encuentra música en el original')
    return first, last


def cut_points(samples, n=None):
    """Cortes (en segundos) alineados con el valle de volumen más cercano."""
    n = n or len(SCENES)
    start, end = music_span(samples)
    cuts = [start]
    for k in range(1, n):
        target = start + (end - start) * k / n
        best, best_db = target, None
        t = target - 1.5
        while t <= target + 1.5:
            # energía de la ventana que cubrirá el fundido (0,6 s)
            d = db_at(samples, max(0.0, t - 0.3), 0.6)
            if best_db is None or d < best_db:
                best, best_db = t, d
            t += WIN
        cuts.append(round(best, 2))
    cuts.append(round(end, 2))
    return cuts


def split(ffmpeg, cuts):
    os.makedirs(OUT_DIR, exist_ok=True)
    rows = []
    for i, (slug, label) in enumerate(SCENES):
        a, b = cuts[i], cuts[i + 1]
        dur = round(b - a, 3)
        out = os.path.join(OUT_DIR, slug + '.mp3')
        afade = ('afade=t=in:st=0:d=%s,afade=t=out:st=%s:d=%s'
                 % (FADE, round(dur - FADE, 3), FADE))
        subprocess.run([ffmpeg, '-hide_banner', '-v', 'error', '-y',
                        '-ss', '%.3f' % a, '-to', '%.3f' % b, '-i', ORIGINAL,
                        '-af', afade, '-ac', '1', '-ar', '44100',
                        '-c:a', 'libmp3lame', '-b:a', BITRATE, out], check=True)
        rows.append((slug, label, a, b, dur, os.path.getsize(out)))
    return rows


def check():
    """Verifica los trozos ya generados (lo usa `npm test`), sin ffmpeg."""
    problems = []
    spans = []
    for slug, _label in SCENES:
        p = os.path.join(OUT_DIR, slug + '.mp3')
        if not os.path.exists(p):
            problems.append('falta ' + slug + '.mp3')
            continue
        size = os.path.getsize(p)
        if size < 60 * 1024 or size > 700 * 1024:
            problems.append('%s.mp3 pesa %d bytes (fuera de 60–700 KB)' % (slug, size))
        # Duración aproximada a partir del bitrate constante de ffmpeg (96 kbps).
        spans.append((slug, round(size * 8 / 96000, 1)))
        with open(p, 'rb') as fh:
            if fh.read(3) not in (b'ID3',) and fh.read(2) != b'\xff\xfb':
                pass  # sin etiqueta: se valida por tamaño/duración
    for slug, secs in spans:
        if not 12 <= secs <= 40:
            problems.append('%s.mp3 dura ~%s s (fuera de 12–40 s)' % (slug, secs))
    if os.path.exists(ORIGINAL) and os.path.getsize(ORIGINAL) < 100 * 1024:
        problems.append('el original debe seguir en el repo (issue #101)')
    return problems, spans


def graph(path, cuts, samples):
    """Dibuja la envolvente de la canción con los cortes (figura para el PR)."""
    try:
        from PIL import Image, ImageDraw
    except Exception:
        raise SystemExit('para --graph hace falta Pillow (pip install pillow)')
    W, H = 1280, 460
    img = Image.new('RGB', (W, H), '#140a32')
    d = ImageDraw.Draw(img)
    dur = len(samples) / SR
    x0, x1, top, bottom = 60, W - 60, 60, H - 110
    scale_x = (x1 - x0) / dur

    def px(t):
        return x0 + t * scale_x

    # envolvente de volumen (0,05 s) escalada de -60..0 dB a bottom..top
    def y_of(db):
        db = max(-60.0, min(0.0, db))
        return bottom - (db + 60) / 60 * (bottom - top)

    pts = []
    t = 0.0
    while t < dur:
        pts.append((px(t), y_of(db_at(samples, t))))
        t += 0.05
    if len(pts) > 1:
        d.line(pts, fill='#4dd2ff', width=1)
    d.rectangle([x0, top, px(cuts[0]), bottom], outline='#5a4a8a')
    d.text((x0 + 4, top - 14), 'silencio inicial descartado (%.1f s)' % cuts[0], fill='#9b8ec4')
    for i, (slug, label) in enumerate(SCENES):
        a, b = cuts[i], cuts[i + 1]
        d.rectangle([px(a), top, px(b), bottom], outline='#ffd23f')
        d.line([(px(a), top - 14), (px(a), bottom + 14)], fill='#ff3b5c', width=2)
        mid = (px(a) + px(b)) / 2
        d.text((mid - 30, top + 8), '%s' % slug, fill='#ffffff')
        d.text((mid - 40, bottom + 20), '%.1f s · %s' % (b - a, label), fill='#ffd23f')
    d.line([(px(cuts[-1]), top - 14), (px(cuts[-1]), bottom + 14)], fill='#ff3b5c', width=2)
    d.text((x0, 16), 'DIETA DE MARCOS · canción partida en 7 trozos (issue #101)', fill='#ffffff')
    d.text((x0, 34), 'envolvente de volumen · cortes en valle · fundido de 0,3 s en cada extremo', fill='#9fe7ff')
    d.text((x0, H - 40), 'bucle en el navegador: <audio loop> por escena, con carga bajo demanda y precarga de la siguiente',
           fill='#9b8ec4')
    img.save(path, optimize=True)
    print('figura:', path)


def main():
    if '--graph' in sys.argv[1:]:
        ffmpeg = ffmpeg_bin()
        if not ffmpeg:
            raise SystemExit('hace falta ffmpeg (o `pip install imageio-ffmpeg`)')
        samples = decode(ffmpeg)
        i = sys.argv.index('--graph')
        path = sys.argv[i + 1] if len(sys.argv) > i + 1 else os.path.join(ROOT, 'docs/audio-trozos.png')
        graph(path, cut_points(samples), samples)
        return
    if '--check' in sys.argv[1:]:
        problems, spans = check()
        for slug, secs in spans:
            print('  %-12s ~%5.1f s' % (slug, secs))
        if problems:
            for p in problems:
                print('ERROR:', p)
            raise SystemExit(1)
        print('troceado correcto:', len(spans), 'trozos')
        return
    ffmpeg = ffmpeg_bin()
    if not ffmpeg:
        raise SystemExit('hace falta ffmpeg (o `pip install imageio-ffmpeg`)')
    samples = decode(ffmpeg)
    cuts = cut_points(samples)
    rows = split(ffmpeg, cuts)
    print('cortes:', cuts)
    for slug, label, a, b, dur, size in rows:
        print('  %-12s %-18s %7.2f → %7.2f  %5.2f s  %4d KB' % (slug, label, a, b, dur, size // 1024))
    print('total:', sum(r[5] for r in rows) // 1024, 'KB en', OUT_DIR)


if __name__ == '__main__':
    main()
