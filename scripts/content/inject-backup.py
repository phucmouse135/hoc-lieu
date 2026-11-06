import sys,re,os
snip=open(sys.argv[1],encoding='utf8').read()
for f in sys.argv[2:]:
    s=open(f,encoding='utf8',newline='').read()
    if 'id="bkpop"' in s: print('skip',f); continue
    app=os.path.basename(f)[:-5]; en='chinese' in f
    pat=re.compile(r"else if\(t\.id==='imp'&&t\.files\[0\]\)\{const f=new FileReader\(\);f\.onload=.*?f\.readAsText\(t\.files\[0\]\)\}")
    m=pat.findall(s); assert len(m)==1,(f,len(m))
    s=pat.sub(lambda _:"else if(t.id==='imp'&&t.files[0]){bkRestore(t.files[0]);t.value=''}",s)
    i=s.rfind('</body>'); s=s[:i]+snip.replace('__APP__',app).replace('__EN__','true' if en else 'false')+s[i:]
    open(f,'w',encoding='utf8',newline='').write(s); print('ok',f,app)
