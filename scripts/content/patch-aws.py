import sys, json, re  # dùng: python patch-aws.py <thư mục chứa aws-pt-new.json, aws-pt2-retag.json>
B = sys.argv[1].rstrip('/') + '/'
P = 'D:/hoc-lieu/public/tech/aws-saa-c03.html'
s = open(P, encoding='utf8', newline='').read()
m = re.search(r'(<script type="application/json" id="d-pt">)(.*?)(</script>)', s, re.S)
pt = json.loads(m.group(2))
if len(pt) != 6:
    raise SystemExit('đã vá (có %d đề)' % len(pt))
new = json.load(open(B + 'aws-pt-new.json', encoding='utf8'))
assert len(new) == 3 and all(len(t) == 65 for t in new)
for i, d in json.load(open(B + 'aws-pt2-retag.json', encoding='utf8')).items():
    assert pt[1][int(i)]['d'] == 'U'
    pt[1][int(i)]['d'] = d
assert not any(q['d'] == 'U' for t in pt for q in t)
pt += new
body = json.dumps(pt, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
s = s[:m.start(2)] + body + s[m.end(2):]
old = '<h2>Sáu đề luyện tiếng Anh</h2><p class="mute">Lấy nguyên từ bộ đề của khoá học mà bạn cung cấp, kèm giải thích gốc.'
assert s.count(old) == 1
s = s.replace(old, '<h2>Chín đề luyện tiếng Anh</h2><p class="mute">Đề 1–6 lấy nguyên từ bộ đề của khoá học mà bạn cung cấp, kèm giải thích gốc; đề 7–9 tự soạn mới theo tỉ lệ bốn lĩnh vực của đề thật (bảo mật 30%, phục hồi 26%, hiệu năng 24%, chi phí 20%).')
open(P, 'w', encoding='utf8', newline='').write(s)
print('ok', len(pt))
