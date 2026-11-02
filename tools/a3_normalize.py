#!/usr/bin/env python3
"""Normaliza las diez imágenes de A3 y recompone sus hojas provisionales.

Requiere Pillow, NumPy y SciPy. El croma conectado al borde se convierte a
#00FF00; los verdes interiores se conservan. Se limita el tamaño del PNG y se
crean hojas a partir de la pose andando (B y aspirado son transformaciones).
Uso: python3 tools/a3_normalize.py
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
from a3_build_sheets import BASES, ENEMIES, make_sheet

FILES = [f'{base}-{pose}.png' for base in BASES for pose in ('andar-a', 'derrotado')]
FILES += ['paella-gigante-reposo.png', 'paella-gigante-derrotada.png']


def normalize(path: Path):
    image = Image.open(path).convert('RGB')
    image.thumbnail((640, 640), Image.Resampling.LANCZOS)
    pixels = np.asarray(image).copy()
    signed = pixels.astype(np.int16)  # Evita desbordamiento al restar canales.
    r, g, b = (signed[:, :, i] for i in range(3))
    candidate = (g > 120) & (g - np.maximum(r, b) > 60)
    seed = np.zeros(candidate.shape, dtype=bool)
    seed[0, :] = candidate[0, :]
    seed[-1, :] = candidate[-1, :]
    seed[:, 0] |= candidate[:, 0]
    seed[:, -1] |= candidate[:, -1]
    background = ndimage.binary_propagation(seed, mask=candidate)
    pixels[background] = (0, 255, 0)
    result = Image.fromarray(pixels).quantize(
        colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    result.save(path, optimize=True)
    if path.stat().st_size > 200 * 1024:
        raise ValueError(f'{path}: supera 200 KB')


if __name__ == '__main__':
    for name in FILES:
        normalize(ENEMIES / name)
    for base in BASES:
        make_sheet(base)
