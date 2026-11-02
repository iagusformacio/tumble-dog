#!/usr/bin/env python3
"""Empaqueta el juego en un solo HTML (sin npm): módulos ES con ámbito propio + imágenes incrustadas.

Uso: python3 tools/bundle.py . salida.html
Reglas para el código: imports `import { a, b as c } from './x.js';` y exports
`export function|const|let|class nombre`.
"""
import base64
import json
import os
import re
import sys

root, out_path = sys.argv[1], sys.argv[2]
IMPORT = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'(\.{1,2}/[^']+)';?[ \t]*\n?")
REEXPORT = re.compile(r"export\s*\{([^}]*)\}\s*from\s*'(\.{1,2}/[^']+)';?[ \t]*\n?")
EXPORT = re.compile(r"\bexport\s+(?:async\s+)?(function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)")

order, seen = [], set()


def visit(rel):
    if rel in seen:
        return
    seen.add(rel)
    src = open(os.path.join(root, rel), encoding='utf-8').read()
    for m in list(IMPORT.finditer(src)) + list(REEXPORT.finditer(src)):
        visit(os.path.normpath(os.path.join(os.path.dirname(rel), m.group(2))))
    order.append(rel)


visit('src/main.js')
mods = []
for rel in order:
    src = open(os.path.join(root, rel), encoding='utf-8').read()

    def imp(m, rel=rel):
        dep = os.path.normpath(os.path.join(os.path.dirname(rel), m.group(2)))
        names = [n.strip() for n in m.group(1).split(',') if n.strip()]
        parts = [(n.split(' as ')[0].strip() + ': ' + n.split(' as ')[1].strip()) if ' as ' in n else n for n in names]
        return 'const { ' + ', '.join(parts) + " } = __m['" + dep + "'];\n"

    src = IMPORT.sub(imp, src)
    reexp = []

    def rex(m, rel=rel):
        dep = os.path.normpath(os.path.join(os.path.dirname(rel), m.group(2)))
        names = [n.strip() for n in m.group(1).split(',') if n.strip()]
        reexp.extend(names)
        return 'const { ' + ', '.join(names) + " } = __m['" + dep + "'];\n"

    src = REEXPORT.sub(rex, src)
    names = [m.group(2) for m in EXPORT.finditer(src)] + reexp
    src = re.sub(r"\bexport\s+(?=(?:async\s+)?(?:function|const|let|class)\b)", '', src)
    mods.append(f"__m['{rel}'] = (() => {{\n{src}\nreturn {{ {', '.join(names)} }};\n}})();")

js = "(() => {\n'use strict';\nconst __m = {};\n" + "\n".join(mods) + "\n})();"


def inline(m):
    path = os.path.join(root, m.group(1))
    if not os.path.exists(path):
        return m.group(0)
    mime = 'image/webp' if path.endswith('.webp') else 'image/png'
    return "'data:" + mime + ';base64,' + base64.b64encode(open(path, 'rb').read()).decode() + "'"


js = re.sub(r"['\"]\./(assets/[^'\"]+\.(?:png|webp))['\"]", inline, js)

# Música del tema (issue #95): los mp3 van incrustados como data URI una sola vez
# (la misma canción se usa en el título, las fases, los jefes y la ronda bonus).
MEDIA = re.compile(r"['\"](\./assets/[^'\"]+\.(?:mp3|ogg|wav|m4a))['\"]")
MEDIA_MIME = {'.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4'}
media = {}


def inline_media(m):
    rel = m.group(1)
    path = os.path.join(root, rel)
    if not os.path.exists(path):
        return m.group(0)
    if rel[2:] not in media:
        mime = MEDIA_MIME[os.path.splitext(path)[1].lower()]
        media[rel[2:]] = 'data:' + mime + ';base64,' + base64.b64encode(open(path, 'rb').read()).decode()
    return "__media['" + rel[2:] + "']"


js = MEDIA.sub(inline_media, js)
if media:
    js = js.replace("const __m = {};", "const __m = {};\nconst __media = " + json.dumps(media) + ";", 1)

html = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
html = re.sub(r'<script type="module"[^>]*></script>', lambda _: '<script>' + js.replace('</script>', '<\\/script>') + '</script>', html)
open(out_path, 'w', encoding='utf-8').write(html)
print(len(order), 'módulos,', round(len(html) / 1024), 'KB')
