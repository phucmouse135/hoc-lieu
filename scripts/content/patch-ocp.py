import sys  # dùng: python patch-ocp.py <thư mục chứa ocp-exams.txt>
B = sys.argv[1].rstrip('/') + '/'
P = 'D:/hoc-lieu/public/tech/ocp-java25.html'
s = open(P, encoding='utf8', newline='').read()
if '##E4' in s:
    raise SystemExit('đã vá')
nl = '\r\n' if '\r\n' in s else '\n'
add = open(B + 'ocp-exams.txt', encoding='utf8', newline='').read().replace('\r\n', '\n').strip().replace('\n', nl)
i = s.index('##E3')
j = s.index('</script>', i) + len('</script>')
s = s[:j] + nl + add + s[j:]
old = '<div class="cards">${[1,2,3].map(i=>EXAMS[i]?'
assert s.count(old) == 1
s = s.replace(old, '<div class="cards">${Object.keys(EXAMS).map(Number).sort((a,b)=>a-b).map(i=>EXAMS[i]?')
open(P, 'w', encoding='utf8', newline='').write(s)
print('ok')
