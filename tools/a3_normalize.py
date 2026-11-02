#!/usr/bin/env python3
"""Normaliza y optimiza el arte de A3 (enemigos 5-8 + jefa paella gigante).

Pasos por imagen:
1. Recorta los marcos blancos de la hoja y localiza las 3 viñetas.
2. Quita el fondo verde desde los bordes (relleno por conectividad): así NO se
   comen verdes interiores del personaje (lechuga, perejil, etc.).
3. Recolorea el fondo a #00FF00 exacto y desactiva halos verdes del borde.
4. Escala y recompone en una cuadrícula limpia de 3 celdas iguales (misma
   escala y mismo alto) o recorta el personaje si es una imagen suelta.
5. PNG con paleta de 128 colores, ≤ 200 KB.

OJO: todas las operaciones se hacen en int16/int32, nunca en uint8, para evitar
desbordamientos al sumar tolerancias.

Uso: python3 tools/a3_normalize.py   (desde la raíz del repo)
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E = os.path.join(ROOT, 'assets', 'enemigos')

CELL = 320          # lado de cada celda de la hoja
GAP = 6             # separación entre celdas (fondo verde, sin línea negra)
TARGET_H = 296      # alto del personaje dentro de la celda
MAX_KB = 200

SHEETS = ['bocata-lomo', 'cacahuete-saltarin', 'tostada-tomate', 'chupito']
SINGLES = [
    'bocata-lomo-derrotado', 'cacahuete-saltarin-derrotado', 'tostada-tomate-derrotado',
    'chupito-derrotado', 'paella-gigante-reposo', 'paella-gigante-derrotada',
]


def chroma_candidates(a):
    """Píxeles sospechosos de ser croma: verdes vivos y claros. int16 siempre."""
    x = a.astype(np.int16)
    r, g, b = x[..., 0], x[..., 1], x[..., 2]
    dom = g - np.maximum(r, b)
    return (g > 110) & (dom > 45) & (b < 160)


def background_mask(a):
    """Fondo = croma conectado con el borde de la imagen (relleno por vecindad)."""
    cand = chroma_candidates(a)
    h, w = cand.shape
    bg = np.zeros_like(cand)
    stack = []
    for x in range(w):
        for y in (0, h - 1):
            if cand[y, x] and not bg[y, x]:
                bg[y, x] = True
                stack.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if cand[y, x] and not bg[y, x]:
                bg[y, x] = True
                stack.append((y, x))
    while stack:
        y, x = stack.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                stack.append((ny, nx))
    return bg


def clean(a):
    """Fondo a #00FF00 exacto y despill en el borde (quita el halo verdoso)."""
    a = a.astype(np.uint8).copy()
    bg = background_mask(a)
    # halo: píxeles verdes pegados al fondo que aún no son croma puro
    x = a.astype(np.int16)
    halo = (~bg) & (x[..., 1] - np.maximum(x[..., 0], x[..., 2]) > 22) & (x[..., 1] > 110)
    a[halo] = (0, 255, 0)
    bg = bg | halo
    a[bg] = (0, 255, 0)
    # Despill del filo: baja el canal verde al máximo de rojo/azul en las franjas
    # con dominancia verde suave, para que el recorte no saque reborde.
    x = a.astype(np.int16)
    r, g, b = x[..., 0], x[..., 1], x[..., 2]
    spill = (g - np.maximum(r, b) > 0) & (g < 200) & ~bg
    out = a.copy()
    out[..., 1] = np.where(spill, np.minimum(a[..., 1], np.maximum(a[..., 0], a[..., 2]) + 8), a[..., 1])
    return out, bg


def split_cells(a):
    """Devuelve las 3 viñetas recortadas, usando los marcos blancos de la hoja."""
    h, w, _ = a.shape
    white = (a.astype(np.int16) > 235).all(axis=2)
    inner_rows = np.nonzero(white[5:h - 5].mean(axis=1) < 0.5)[0]
    y0, y1 = inner_rows.min(), inner_rows.max() + 1
    colw = white[y0:y1].mean(axis=0)
    runs, start = [], None
    for x in range(w):
        if colw[x] > 0.8:
            if start is None:
                start = x
        elif start is not None:
            runs.append((start, x))
            start = None
    if start is not None:
        runs.append((start, w))
    inner = [(runs[i][1], runs[i + 1][0]) for i in range(len(runs) - 1)]
    if len(inner) < 3:
        inner = [(int(w * i / 3), int(w * (i + 1) / 3)) for i in range(3)]
    cells = []
    if len(inner) < 3:
        inner = [(int(w * i / 3), int(w * (i + 1) / 3)) for i in range(3)]
    out = []
    for x0, x1 in inner[:3]:
        cell = a[y0:y1, x0 + 3:x1 - 3]
        if cell.size == 0:
            cell = a[y0:y1, x0:x1]
        mask = ~background_mask(cell)
        ys, xs = np.nonzero(mask)
        out.append(cell[max(0, ys.min() - 2):ys.max() + 3, max(0, xs.min() - 2):xs.max() + 3])
    return out


def fit(cell, box_w, box_h):
    """Escala la viñeta entera para caber en la caja, sin deformar."""
    h, w = cell.shape[:2]
    s = min(box_w / w, box_h / h)
    img = Image.fromarray(cell).resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    return np.asarray(img)


def build_sheet(name):
    src = os.path.join(E, name + '-poses.png')
    a, _ = clean(np.asarray(Image.open(src).convert('RGB')))
    cells = split_cells(a)
    w = CELL * 3 + GAP * 2
    out = np.zeros((CELL, w, 3), np.uint8)
    out[..., 1] = 255
    x = 0
    for c in cells:
        img = fit(c, CELL - 26, TARGET_H)
        h, cw = img.shape[:2]
        y = CELL - h - 10
        out[y:y + h, x + (CELL - cw) // 2:x + (CELL - cw) // 2 + cw] = img
        x += CELL + GAP
    save(out, name + '-poses.png')


def build_single(name):
    src = os.path.join(E, name + '.png')
    a, bg = clean(np.asarray(Image.open(src).convert('RGB')))
    ys, xs = np.nonzero(~bg)
    a = a[max(0, ys.min() - 3):ys.max() + 4, max(0, xs.min() - 3):xs.max() + 4]
    h, w = a.shape[:2]
    s = min(1.0, 640 / max(h, w))
    if s < 1.0:
        a = np.asarray(Image.fromarray(a).resize((round(w * s), round(h * s)), Image.LANCZOS))
    save(a, name + '.png')


def save(a, fname):
    path = os.path.join(E, fname)
    img = Image.fromarray(a).convert('RGB')
    for colors in (128, 96, 64):
        img.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB').save(
            path, 'PNG', optimize=True)
        kb = os.path.getsize(path) / 1024
        if kb <= MAX_KB:
            break
    assert kb <= MAX_KB, f'{fname}: {kb:.0f} KB (> {MAX_KB} KB)'
    print(f'{fname}: {img.size[0]}x{img.size[1]} {kb:.0f} KB')


def main():
    for n in SHEETS:
        build_sheet(n)
    for n in SINGLES:
        build_single(n)


if __name__ == '__main__':
    main()
