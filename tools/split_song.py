#!/usr/bin/env python3
"""Parte la canción de Dieta de Marcos en un trozo por escena (issue #101).

La canción completa (assets/audio/dieta-de-marcos.mp3, 2:28 y 2,4 MB) tardaba
mucho en sonar: el navegador tenía que bajarla entera antes de empezar. Aquí se
corta en trozos cortos (uno por escena de la campaña), cada uno con fundido de
0,3 s en los dos extremos para que el bucle y los cambios de bar no suenen a
corte. El original NO se borra: queda en el repo por si hace falta recortar.

Uso:
    python3 tools/split_song.py                 # regenera assets/audio/dieta-de-marcos/
    python3 tools/split_song.py --analizar      # solo mide valles de volumen

Sin ffmpeg en el PATH se usa el binario de `pip install imageio-ffmpeg`.

Los cortes están en valles de volumen medidos con `--analizar` (no se puede
escuchar la canción desde el agente): se corta donde la envolvente cae, así el
fundido tapa la unión. La canción tiene 8,2 s de silencio inicial: se descarta,
que es parte de por qué «tardaba en empezar».
"""
import argparse
import os
import shutil
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANCION = 'assets/audio/dieta-de-marcos.mp3'
SALIDA = 'assets/audio/dieta-de-marcos'

# Fundido en cada extremo (s): tapa el corte y hace limpio el bucle.
FUNDIDO = 0.30
# Mono y 112 kbps: la mitad de peso que el original estéreo y sin pérdida audible
# en un juego. Cada trozo queda por debajo de ~300 KB (carga en < 1 s).
BITRATE = '112k'
CANALES = 1

# (fichero, inicio, fin, escena) — cortes en valles medidos de la envolvente.
PIEZAS = [
    ('01-titulo', 8.10, 25.69, 'título y pantalla de ruta'),
    ('02-bar-la-taca', 25.69, 44.65, 'Bar La Taca'),
    ('03-bar-los-concursos', 44.65, 66.52, 'Bar Los Concursos'),
    ('04-bar-pols', 66.52, 84.54, 'Bar Pols'),
    ('05-bar-del-jefe', 84.54, 107.85, 'Bar del Jefe'),
    ('06-jefes', 107.85, 122.52, 'jefes de bar'),
    ('07-bonus', 122.52, 144.30, 'ronda bonus y final'),
]


def ffmpeg():
    """Binario de ffmpeg: PATH primero, si no el de imageio-ffmpeg."""
    found = shutil.which('ffmpeg')
    if found:
        return found
    try:
        import imageio_ffmpeg  # pip install imageio-ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit('falta ffmpeg: instálalo o haz `pip install imageio-ffmpeg`')


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit('ffmpeg ha fallado:\n' + (p.stderr or p.stdout))
    return p.stderr or ''


def analizar(ff, fuente):
    """Valles de volumen: candidatos a punto de corte (misma medida que se usó)."""
    import tempfile
    wav = os.path.join(tempfile.gettempdir(), 'dieta-analisis.wav')
    run([ff, '-hide_banner', '-loglevel', 'error', '-i', fuente, '-ac', '1', '-ar', '22050', '-f', 's16le', wav, '-y'])
    import array
    import math
    datos = array.array('h')
    with open(wav, 'rb') as f:
        datos.frombytes(f.read())
    os.remove(wav)
    sr = 22050
    win = int(0.025 * sr)
    rms = []
    for i in range(len(datos) // win):
        trozo = datos[i * win:(i + 1) * win]
        rms.append(math.sqrt(sum(x * x for x in trozo) / len(trozo)))
    suave = [sum(rms[max(0, i - 8):i + 9]) / len(rms[max(0, i - 8):i + 9]) for i in range(len(rms))]
    print(f'duración: {len(datos) / sr:.2f} s · ventanas: {len(rms)}')
    print('valles (menor energía en ±1 s):')
    for i in range(40, len(suave) - 40):
        if suave[i] == min(suave[i - 40:i + 41]):
            db = 20 * math.log10(rms[i] / 32768 + 1e-9)
            if db > -100:
                print(f'  {i * win / sr:7.2f} s  {db:6.1f} dB')


def cortar(ff, fuente, nombre, inicio, fin, escena):
    dur = round(fin - inicio, 3)
    destino = os.path.join(SALIDA, nombre + '.mp3')
    fade_out = max(0, round(dur - FUNDIDO, 3))
    run([
        ff, '-hide_banner', '-loglevel', 'error',
        '-ss', str(inicio), '-i', fuente, '-t', str(dur),
        '-af', f'afade=t=in:st=0:d={FUNDIDO},afade=t=out:st={fade_out}:d={FUNDIDO}',
        '-ac', str(CANALES), '-codec:a', 'libmp3lame', '-b:a', BITRATE,
        '-map_metadata', '-1',
        destino, '-y',
    ])
    kb = os.path.getsize(destino) / 1024
    print(f'  {nombre:22s} {inicio:7.2f}→{fin:7.2f}  {dur:5.1f} s  {kb:6.0f} KB  · {escena}')
    return destino


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--analizar', action='store_true', help='solo medir valles de volumen')
    args = ap.parse_args()

    os.chdir(RAIZ)
    ff = ffmpeg()
    if not os.path.exists(CANCION):
        sys.exit(f'falta {CANCION}')
    fuente = CANCION

    if args.analizar:
        analizar(ff, fuente)
        return

    os.makedirs(SALIDA, exist_ok=True)
    print(f'partiendo {CANCION} en {len(PIEZAS)} trozos (fundido {FUNDIDO} s, mono {BITRATE}):')
    total = 0
    for nombre, inicio, fin, escena in PIEZAS:
        total += os.path.getsize(cortar(ff, fuente, nombre, inicio, fin, escena))
    print(f'total: {total / 1024:.0f} KB en {len(PIEZAS)} trozos '
          f'(el original sigue en {CANCION}, {os.path.getsize(fuente) / 1024:.0f} KB)')


if __name__ == '__main__':
    main()
