#!/usr/bin/env python3
"""Prepara los sprites del juego a partir de las imágenes originales de assets/.

- Quita el fondo verde chroma con bordes suaves y elimina el halo verde (despill).
- Separa las poses de las hojas (3 viñetas) y descarta los marcos de viñeta.
- Recorta, escala con la MISMA escala por familia (para que la animación no «baile")
  y guarda WebP con alfa en assets/sprites/.

Uso: python3 tools/prepare_assets.py   (desde la raíz del repo)
"""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets')
OUT = os.path.join(ROOT, 'assets', 'sprites')


def load(rel, cell=None):
    im = Image.open(os.path.join(SRC, rel)).convert('RGB')
    if cell is not None:
        idx, n = cell
        w, h = im.size
        cw = w / n
        im = im.crop((int(idx * cw), 0, int((idx + 1) * cw), h))
    return np.asarray(im).astype(np.float32)


def key_green(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    spill = g - np.maximum(r, b)
    alpha = np.clip(1.0 - (spill - 35.0) / 70.0, 0.0, 1.0)
    alpha[(g > 150) & (r < 90) & (b < 90)] = 0.0
    out = a.copy()
    mx = np.maximum(r, b)
    out[..., 1] = np.where(spill > 0, np.minimum(g, mx + 10), g)
    return out, alpha


def clean_components(alpha):
    mask = alpha > 0.5
    lab, n = ndimage.label(mask)
    if n == 0:
        return alpha
    h, w = mask.shape
    objs = ndimage.find_objects(lab)
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    keep = np.zeros(n + 1, bool)
    biggest = sizes.max()
    for i, sl in enumerate(objs, start=1):
        bh = sl[0].stop - sl[0].start
        bw = sl[1].stop - sl[1].start
        fill = sizes[i - 1] / max(1, bh * bw)
        is_line = (bw > 0.7 * w or bh > 0.7 * h) and fill < 0.12
        if is_line or sizes[i - 1] < 0.015 * biggest:
            continue
        keep[i] = True
    km = keep[lab]
    km = ndimage.binary_dilation(km, iterations=2)
    return alpha * km


def figure(rel, cell=None):
    a, alpha = key_green(load(rel, cell))
    alpha = clean_components(alpha)
    ys, xs = np.nonzero(alpha > 0.05)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([a, alpha * 255.0])[y0:y1, x0:x1]
    return Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA')


def save(img, name, scale):
    w, h = img.size
    img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True)
    img.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=90, method=6)
    return img.size


P = 'personajes/'
E = 'enemigos/'
U = 'ui/'

# familia: (altura objetivo de la referencia, (ruta, viñeta) referencia, {nombre: (ruta, viñeta)})
FAMILIES = {
    'presi': (220, (P + 'don-presi-quieto.png', None), {
        'presi-idle': (P + 'don-presi-quieto.png', None),
        'presi-walkA': (P + 'don-presi-andar-a.png', None),
        'presi-walkB': (P + 'don-presi-andar-b.png', None),
        'presi-jump': (P + 'don-presi-saltar.png', None),
        'presi-fall': (P + 'don-presi-caer.png', None),
        'presi-suck': (P + 'don-presi-aspirar.png', None),
        'presi-throw': (P + 'don-presi-lanzar.png', None),
        'presi-hurt': (P + 'don-presi-aturdido.png', None),
        'presi-win': (P + 'don-presi-victoria.png', None),
        'presi-intro': (P + 'don-presi-presentacion.png', None),
    }),
}

SHEET_ENEMIES = {
    'portavoz': 'portavoz-airada', 'tertuliano': 'tertuliano', 'asesor': 'asesor-misterioso',
    'influencer': 'influencer-bulero', 'activista': 'activista-municipal', 'diputado': 'diputado-grunon',
}
for key, base in SHEET_ENEMIES.items():
    sheet = E + base + '-poses.png'
    FAMILIES[key] = (200, (sheet, (0, 3)), {
        key + '-walkA': (sheet, (0, 3)),
        key + '-walkB': (sheet, (1, 3)),
        key + '-stun': (sheet, (2, 3)),
    })
for key, base in {'lider': 'lider-eterno-oposicion', 'baron': 'baron-regional'}.items():
    FAMILIES[key] = (200, (E + base + '-andar.png', None), {
        key + '-walkA': (E + base + '-andar.png', None),
        key + '-walkB': (E + base + '-andar-b.png', None),
        key + '-stun': (E + base + '-aspirado.png', None),
    })

SINGLES = {
    # nombre: (ruta, altura objetivo)
    **{k + '-down': (E + v + '-derrotada.png', 120) for k, v in {**SHEET_ENEMIES, 'lider': 'lider-eterno-oposicion', 'baron': 'baron-regional'}.items()},
    'ui-life': (U + 'icono-vida.png', 96),
    'ui-gameover': (U + 'cartel-game-over.png', 300),
    'ui-crac': (U + 'onomatopeya-crac.png', 200),
    'ui-stars': (U + 'efecto-estrellas-aturdido.png', 90),
    'ui-dust': (U + 'efecto-polvo-aplastado.png', 120),
    'portrait-presi': (U + 'retrato-don-presi.png', 360),
    'tertuliano-shout': (E + 'tertuliano-bulos.png', 260),
    'influencer-selfie': (E + 'influencer-ringlight.png', 260),
}


def main():
    manifest = {}
    for fam, (target, ref, frames) in FAMILIES.items():
        ref_img = figure(*ref)
        scale = target / ref_img.size[1]
        for name, src in frames.items():
            manifest[name] = save(figure(*src), name, scale)
    for name, (rel, target) in SINGLES.items():
        img = figure(rel)
        manifest[name] = save(img, name, target / img.size[1])
    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
    lines = ['// Generado por tools/prepare_assets.py — no editar a mano.', 'export const SPRITE_FILES = {']
    for k in sorted(manifest):
        w, h = manifest[k]
        lines.append(f"  '{k}': ['./assets/sprites/{k}.webp', {w}, {h}],")
    lines.append('};')
    with open(os.path.join(ROOT, 'src', 'sprite-list.js'), 'w') as f:
        f.write('\n'.join(lines) + '\n')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'{len(manifest)} sprites, {total / 1024:.0f} KB')


if __name__ == '__main__':
    main()
