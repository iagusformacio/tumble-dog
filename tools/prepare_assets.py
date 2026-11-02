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

# ---------------------------------------------------------------------------
# DIETA DE MARCOS · A5 · Jefa de Sala del Bar Pols (10 poses, 2026-11-02)
# Un PNG por pose en assets/enemigos/jefa-sala-*.png (sin hoja de viñetas:
# jefa-sala-poses.png es una hoja derivada, aquí se leen los PNG sueltos).
# Bloque propio: no toca nada de lo anterior.
# ---------------------------------------------------------------------------
JEFA = E + 'jefa-sala-'
FAMILIES['jefa'] = (320, (JEFA + 'reposo.png', None), {
    'boss-jefa-walkA': (JEFA + 'andar-a.png', None),
    'boss-jefa-walkB': (JEFA + 'andar-b.png', None),
    'boss-jefa-stun': (JEFA + 'herida.png', None),
    'boss-jefa-idle': (JEFA + 'reposo.png', None),
    'boss-jefa-throw': (JEFA + 'bandeja.png', None),
    'boss-jefa-shout': (JEFA + 'grito.png', None),
    'boss-jefa-angry': (JEFA + 'enfadada.png', None),
    'boss-jefa-win': (JEFA + 'victoria.png', None),
})
SINGLES.update({
    'boss-jefa-down': (JEFA + 'derrotada.png', 160),
    'boss-jefa-portrait': (JEFA + 'retrato.png', 360),
})


# --- Bloque A4 (arena/79932f6e · issue #57): Dieta de Marcos, escenario y UI ---
# Los fondos de bar NO llevan croma: se copian tal cual (ya son 1280×720) a sprites/.
FONDOS_MARCOS = {
    'fondo-barra': 'escenario/barra-bar-valenciano.png',
    'fondo-terraza': 'escenario/terraza-bar-valenciano.png',
    'fondo-mercado': 'escenario/mercado-valenciano.png',
    'fondo-playa': 'escenario/chiringuito-playa.png',
}

UI_MARCOS = {
    # nombre: (ruta, altura objetivo) — con recorte de croma.
    'ui-bola-vomito': (U + 'bola-vomito.png', 160),
    'ui-logo-marcos': (U + 'logo-dieta-de-marcos.png', 240),
    'ui-bleeeh': (U + 'onomatopeya-bleeeh.png', 220),
    'ui-glup': (U + 'onomatopeya-glup.png', 220),
    'ui-plaf': (U + 'onomatopeya-plaf.png', 220),
}


def save_fondo(rel, name):
    """Fondo de escenario: sin croma, se copia a PNG (los fondos son opacos)."""
    src = os.path.join(SRC, rel)
    im = Image.open(src).convert('RGB')
    os.makedirs(OUT, exist_ok=True)
    dst = os.path.join(OUT, name + '.png')
    im.save(dst, 'PNG', optimize=True)
    return im.size


# --- Bloque A2 (arena/718a6f93 · issue #56): enemigos 1-4 y jefe bocata ---
# A2 · Enemigos 1-4 y jefe del tema «Dieta de Marcos» (bloque propio).
# Los tres fotogramas (andar A, andar B y aspirado) van en una hoja 3×1 de
# 512×512 por celda; andar B y aspirado se derivan del andar A con aplastado y
# giro leve (mismo criterio que las hojas derivadas de ART anteriores).
DIETA_ENEMIES = {
    'calamares': 'bocadillo-calamares',
    'carajillo': 'carajillo',
    'tortilla': 'tortilla',
    'cafe': 'cafe-con-leche',
}
for key, base in DIETA_ENEMIES.items():
    sheet = E + base + '-poses.png'
    FAMILIES['dm-' + key] = (200, (sheet, (0, 3)), {
        'dm-' + key + '-walkA': (sheet, (0, 3)),
        'dm-' + key + '-walkB': (sheet, (1, 3)),
        'dm-' + key + '-stun': (sheet, (2, 3)),
    })
for key, base in DIETA_ENEMIES.items():
    SINGLES['dm-' + key + '-down'] = (E + base + '-derrotado.png', 110)
# Jefe del primer bar: bocata gigante (reposo y derrotado). La hoja de poses
# del jefe se monta con reposo, el segundo fotograma de andar y el golpe.
SINGLES['dm-bocata-reposo'] = (E + 'jefe-bocata-gigante-reposo.png', 300)
SINGLES['dm-bocata-down'] = (E + 'jefe-bocata-gigante-derrotado.png', 190)


# Sprites de jefes que se sirven tal cual desde assets/enemigos/ (sin recorte
# de chroma): se registran aparte para que volver a ejecutar este script no los
# borre de src/sprite-list.js.
EXTRA_FILES = [
    'boss-tertuliano-walkA', 'boss-tertuliano-walkB', 'boss-tertuliano-stun',
    'boss-tertuliano-down', 'boss-tertuliano-shout',
    'boss-lider-walkA', 'boss-lider-walkB', 'boss-lider-stun',
    'boss-lider-down', 'boss-lider-shout',
]


def main():
    manifest = {}
    for name, rel in FONDOS_MARCOS.items():
        save_fondo(rel, name)
    for name, (rel, target) in UI_MARCOS.items():
        img = figure(rel)
        manifest[name] = save(img, name, target / img.size[1])
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
    if FONDOS_MARCOS:
        lines.append('  // Fondos de bar del tema «Dieta de Marcos» (bloque A4, opacos, 1280×720)')
        for k in sorted(FONDOS_MARCOS):
            with Image.open(os.path.join(OUT, k + '.png')) as im:
                lines.append(f"  '{k}': ['./assets/sprites/{k}.png', {im.size[0]}, {im.size[1]}],")
    if EXTRA_FILES:
        lines.append('  // Sprites propios de jefes (arte de sesión, norma 20)')
        for k in EXTRA_FILES:
            with Image.open(os.path.join(SRC, E, k + '.png')) as im:
                lines.append(f"  '{k}': ['./assets/enemigos/{k}.png', {im.size[0]}, {im.size[1]}],")
    lines.append('};')
    with open(os.path.join(ROOT, 'src', 'sprite-list.js'), 'w') as f:
        f.write('\n'.join(lines) + '\n')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'{len(manifest)} sprites, {total / 1024:.0f} KB')


if __name__ == '__main__':
    main()
