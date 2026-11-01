#!/usr/bin/env python3
"""Empaqueta el juego en un solo HTML (sin npm): módulos ES con ámbito propio + imágenes incrustadas.

Uso: python3 tools/bundle.py . salida.html
Reglas para el código: imports `import { a, b as c } from './x.js';` y exports
`export function|const|let|class nombre`.
"""
import base64
import os
import re
import sys

root, out_path = sys.argv[1], sys.argv[2]
IMPORT = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'(\./[^']+)';?[ \t]*\n?")
EXPORT = re.compile(r"\bexport\s+(?:async\s+)?(function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)")

order, seen = [], set()


def visit(rel):
    if rel in seen:
        return
    seen.add(rel)
    src = open(os.path.join(root, rel), encoding='utf-8').read()
    for m in IMPORT.finditer(src):
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
    names = [m.group(2) for m in EXPORT.finditer(src)]
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
html = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
html = re.sub(r'<script type="module"[^>]*></script>', lambda _: '<script>' + js.replace('</script>', '<\\/script>') + '</script>', html)
open(out_path, 'w', encoding='utf-8').write(html)
print(len(order), 'módulos,', round(len(html) / 1024), 'KB')
