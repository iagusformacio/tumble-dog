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

# Arte de Marcos para el tema Dieta de Marcos (A1): diez poses independientes.
FAMILIES['marcos'] = (220, (P + 'marcos-quieto.png', None), {
    'marcos-idle': (P + 'marcos-quieto.png', None),
    'marcos-walkA': (P + 'marcos-andar-a.png', None),
    'marcos-walkB': (P + 'marcos-andar-b.png', None),
    'marcos-jump': (P + 'marcos-saltar.png', None),
    'marcos-fall': (P + 'marcos-caer.png', None),
    'marcos-swallow': (P + 'marcos-tragar.png', None),
    'marcos-vomit': (P + 'marcos-vomitar.png', None),
    'marcos-hurt': (P + 'marcos-herido.png', None),
    'marcos-win': (P + 'marcos-victoria.png', None),
    'marcos-intro': (P + 'marcos-presentacion.png', None),
})

# ---- A3 · Enemigos 5-8 (tema Dieta de Marcos), bloque propio -------------------
# Las hojas -poses.png de A3 se normalizan antes con tools/a3_normalize.py (fondo
# por conectividad + despill, celdas iguales). Solo se registran si el arte ya está
# en el repo: así main sigue generando sprites sin fallar mientras falta el dibujo.
DIETA_SHEET_ENEMIES = {
    'bocata': 'bocata-lomo', 'cacahuete': 'cacahuete-saltarin',
    'tostada': 'tostada-tomate', 'chupito': 'chupito',
}
for key, base in DIETA_SHEET_ENEMIES.items():
    sheet = E + base + '-poses.png'
    if not os.path.exists(os.path.join(SRC, sheet)):
        continue
    FAMILIES[key] = (200, (sheet, (0, 3)), {
        key + '-walkA': (sheet, (0, 3)),
        key + '-walkB': (sheet, (1, 3)),
        key + '-stun': (sheet, (2, 3)),
    })
    SINGLES[key + '-down'] = (E + base + '-derrotado.png', 120)
# Jefa del final (paella gigante): reposo y derrotada.
DIETA_BOSSES = {'paella': 'paella-gigante'}
for key, base in DIETA_BOSSES.items():
    if not os.path.exists(os.path.join(SRC, E + base + '-reposo.png')):
        continue
    FAMILIES[key] = (300, (E + base + '-reposo.png', None), {
        key + '-idle': (E + base + '-reposo.png', None),
        key + '-walkA': (E + base + '-reposo.png', None),
        key + '-walkB': (E + base + '-reposo.png', None),
    })
    SINGLES[key + '-down'] = (E + base + '-derrotada.png', 160)
# -------------------------------------------------------------------------------

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

# --- A7 · Jefes de campaña «Dieta de Marcos» (issue #57) ---------------------
# El Cocinero de la Plancha (Vila-real · Bar La Taca) y El Presentador del Bingo
# (Xirivella · Bar Los Concursos). Cinco poses por jefe, personajes inventados,
# fondo chroma #00FF00. Bloque propio de la tarea A7; no mezclar con otras.
A7_BOSSES = {
    'cocinero-plancha': 'cocinero-plancha',
    'presentador-bingo': 'presentador-bingo',
}
for key, base in A7_BOSSES.items():
    FAMILIES['boss-' + key] = (300, (E + base + '-reposo.png', None), {
        'boss-' + key + '-idle': (E + base + '-reposo.png', None),
        'boss-' + key + '-attack': (E + base + '-atacar.png', None),
        'boss-' + key + '-hurt': (E + base + '-herido.png', None),
        'boss-' + key + '-down': (E + base + '-derrotado.png', None),
        'boss-' + key + '-angry': (E + base + '-enfadado.png', None),
    })
# --- Fin del bloque A7 ------------------------------------------------------


# Estos sprites se entregan como PNG ya preparados y los consume el juego directamente.
# Se conservan aquí para que regenerar el manifiesto no los borre de src/sprite-list.js.
EXTERNAL_SPRITES = {
    'fondo-barra': ('./assets/sprites/fondo-barra.png', 1280, 720),
    'fondo-terraza': ('./assets/sprites/fondo-terraza.png', 1280, 720),
    'fondo-mercado': ('./assets/sprites/fondo-mercado.png', 1280, 720),
    'fondo-playa': ('./assets/sprites/fondo-playa.png', 1280, 720),
    'boss-tertuliano-walkA': ('./assets/enemigos/boss-tertuliano-walkA.png', 825, 450),
    'boss-tertuliano-walkB': ('./assets/enemigos/boss-tertuliano-walkB.png', 825, 450),
    'boss-tertuliano-stun': ('./assets/enemigos/boss-tertuliano-stun.png', 642, 350),
    'boss-tertuliano-down': ('./assets/enemigos/boss-tertuliano-down.png', 404, 220),
    'boss-tertuliano-shout': ('./assets/enemigos/boss-tertuliano-shout.png', 550, 300),
    'boss-lider-walkA': ('./assets/enemigos/boss-lider-walkA.png', 642, 350),
    'boss-lider-walkB': ('./assets/enemigos/boss-lider-walkB.png', 825, 450),
    'boss-lider-stun': ('./assets/enemigos/boss-lider-stun.png', 550, 300),
    'boss-lider-down': ('./assets/enemigos/boss-lider-down.png', 477, 260),
    'boss-lider-shout': ('./assets/enemigos/boss-lider-shout.png', 642, 350),
}

# ---- A8 · Dieta de Marcos: Camarero de la Cuenta y premios (arena/5e565596) ----
# Perseguidor invencible de la prisa del tema «Dieta de Marcos» (Refs #56/#57)
# y premios del tema (café=moneda, flan=gema, antiácido=POW, tila=pausa,
# zumo=turbo, ensaimada=1UP) + retrato de Marcos para HUD/título.
FAMILIES['camarero'] = (200, (P + 'camarero-cuenta-andar-a.png', None), {
    'camarero-walkA': (P + 'camarero-cuenta-andar-a.png', None),
    'camarero-walkB': (P + 'camarero-cuenta-andar-b.png', None),
    'camarero-grito': (P + 'camarero-cuenta-grito.png', None),
})
SINGLES.update({
    'retrato-marcos': (U + 'retrato-marcos.png', 360),
    'premio-cafe': (U + 'premio-cafe.png', 96),
    'premio-flan': (U + 'premio-flan.png', 96),
    'premio-antiacido': (U + 'premio-antiacido.png', 96),
    'premio-tila': (U + 'premio-tila.png', 96),
    'premio-zumo': (U + 'premio-zumo.png', 96),
    'premio-ensaimada': (U + 'premio-ensaimada.png', 96),
})


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
            img = figure(*src)
            # Individual generated poses have different canvas padding; normalize
            # Marcos by the visible figure height so the animation does not jump.
            frame_scale = target / img.size[1] if fam == 'marcos' else scale
            manifest[name] = save(img, name, frame_scale)
    for name, (rel, target) in SINGLES.items():
        img = figure(rel)
        manifest[name] = save(img, name, target / img.size[1])
    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
    lines = ['// Generado por tools/prepare_assets.py — no editar a mano.', 'export const SPRITE_FILES = {']
    for k in sorted(manifest):
        w, h = manifest[k]
        lines.append(f"  '{k}': ['./assets/sprites/{k}.webp', {w}, {h}],")
    for k, (path, w, h) in EXTERNAL_SPRITES.items():
        lines.append(f"  '{k}': ['{path}', {w}, {h}],")
    lines.append('};')
    with open(os.path.join(ROOT, 'src', 'sprite-list.js'), 'w') as f:
        f.write('\n'.join(lines) + '\n')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'{len(manifest)} sprites, {total / 1024:.0f} KB')


if __name__ == '__main__':
    main()
