import re,sys,os
root=sys.argv[1]; entry='src/main.js'
order=[];seen=set()
def visit(f):
    if f in seen: return
    seen.add(f)
    s=open(os.path.join(root,f)).read()
    for m in re.finditer(r"import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+'(\./[^']+)'",s):
        visit(os.path.normpath(os.path.join(os.path.dirname(f),m.group(1))))
    order.append(f)
visit(entry)
out=[]
for f in order:
    s=open(os.path.join(root,f)).read()
    s=re.sub(r"import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+'[^']+';?\n","",s)
    s=re.sub(r"\bexport\s+default\s+","",s)
    s=re.sub(r"\bexport\s+(?=(function|const|let|class|async)\b)","",s)
    s=re.sub(r"^export\s*\{[^}]*\};?\n?","",s,flags=re.M)
    out.append(f"// ---- {f}\n{s}")
js="(()=>{\n"+"\n".join(out)+"\n})();"
import base64
def inline(m):
    f=os.path.join(root,m.group(1))
    if not os.path.exists(f): return m.group(0)
    return "'data:image/png;base64,"+base64.b64encode(open(f,'rb').read()).decode()+"'"
js=re.sub(r"['\"]\./(assets/[^'\"]+\.png)['\"]",inline,js)
h=open(os.path.join(root,'index.html')).read()
h=re.sub(r'<script type="module".*?</script>',lambda m:'<script>'+js.replace('</script>','<\\/script>')+'</script>',h,flags=re.S)
open(sys.argv[2],'w').write(h); print(order,len(h))
