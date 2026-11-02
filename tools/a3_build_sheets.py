#!/usr/bin/env python3
"""Compone hojas A3 provisionales a partir de la pose caminando original.

Los fotogramas B y aspirado son transformaciones geométricas, no dibujos nuevos:
se podrán sustituir por poses originales más adelante. Uso: python3 tools/a3_build_sheets.py
"""
from pathlib import Path
from PIL import Image
from prepare_assets import figure

ROOT = Path(__file__).resolve().parent.parent
ENEMIES = ROOT / 'assets' / 'enemigos'
BASES = ('bocata-lomo', 'cacahuete-saltarin', 'tostada-tomate', 'chupito')
CELL = 320


def make_sheet(base):
    source = figure(f'enemigos/{base}-andar-a.png')
    source.thumbnail((270, 270), Image.Resampling.LANCZOS)
    # Mantener la dirección del personaje, sin espejar la imagen.
    walk_b = source.rotate(7, resample=Image.Resampling.BICUBIC, expand=True)
    sucked = source.resize((max(1, round(source.width * .72)), source.height), Image.Resampling.LANCZOS)
    sucked = sucked.rotate(-13, resample=Image.Resampling.BICUBIC, expand=True)
    sheet = Image.new('RGB', (3 * CELL, CELL), (0, 255, 0))
    for i, frame in enumerate((source, walk_b, sucked)):
        frame.thumbnail((CELL - 12, CELL - 12), Image.Resampling.LANCZOS)
        x = i * CELL + (CELL - frame.width) // 2
        y = CELL - frame.height - 6
        sheet.paste(frame, (x, y), frame)
    out = ENEMIES / f'{base}-poses.png'
    sheet.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(out, optimize=True)
    if out.stat().st_size > 200 * 1024:
        raise ValueError(f'{out}: supera 200 KB')


if __name__ == '__main__':
    for name in BASES:
        make_sheet(name)
