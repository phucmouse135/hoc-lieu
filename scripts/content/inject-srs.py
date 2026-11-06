import sys
snip=open(sys.argv[1],encoding='utf8').read()
for f in sys.argv[2:]:
    s=open(f,encoding='utf8',newline='').read()
    if 'srsbox' in s: print('skip',f); continue
    for need in ['function finishQuiz(','function qFromKey(','function pracV(','function wrongV(','function startQuiz(']: assert need in s,(f,need)
    i=s.rfind('</body>'); s=s[:i]+snip.replace('__EN__','true' if 'chinese' in f else 'false')+s[i:]
    open(f,'w',encoding='utf8',newline='').write(s); print('ok',f)
