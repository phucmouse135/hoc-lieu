// Áp dụng tệp viết lại phương án vào một app.
// Dùng: node scripts/content/apply-rewrite.js <app.html> <rewrite.json> [--out <tệp ra>]
// rewrite.json: [{"old": dòng gốc nguyên văn (như lint --items in ra), "new": dòng mới}]
//   AWS: [{"old": "chỉ số đề:chỉ số câu", "o": [phương án mới], "a": [chỉ số đúng]}]
// Mặc định ghi đè app; --out ghi sang tệp khác (để kiểm thử bằng lint trước).
'use strict';
const fs = require('fs');
const a = process.argv.slice(2), oi = a.indexOf('--out'), out = oi >= 0 ? a[oi + 1] : null;
const [app, rw] = oi >= 0 ? a.filter((_, i) => i !== oi && i !== oi + 1) : a;
let src = fs.readFileSync(app, 'utf8');
const list = JSON.parse(fs.readFileSync(rw, 'utf8'));
let ok = 0; const err = [];
if (/aws/.test(app)) {
  const m = src.match(/(<script type="application\/json" id="d-pt">)([\s\S]*?)(<\/script>)/), pt = JSON.parse(m[2]);
  for (const r of list) {
    const [ti, qi] = String(r.old).split(':').map(Number), q = pt[ti] && pt[ti][qi];
    if (!q || !Array.isArray(r.o) || !Array.isArray(r.a)) { err.push('không hợp lệ: ' + r.old); continue; }
    if (r.o.length !== q.o.length || r.a.length !== q.a.length) { err.push(`${r.old}: số phương án hoặc số đáp án khác bản gốc`); continue; }
    q.o = r.o; q.a = r.a; ok++;
  }
  const body = JSON.stringify(pt).replace(/<\//g, '<\\/');
  src = src.slice(0, m.index) + m[1] + body + m[3] + src.slice(m.index + m[0].length);
} else {
  for (const r of list) {
    if (typeof r.old !== 'string' || typeof r.new !== 'string' || r.new.includes('\n')) { err.push('không hợp lệ: ' + String(r.old).slice(0, 60)); continue; }
    const o = JSON.stringify(r.old).slice(1, -1), n = JSON.stringify(r.new).slice(1, -1), c = src.split(o).length - 1;
    if (c !== 1) { err.push(`xuất hiện ${c} lần: ${r.old.slice(0, 80)}`); continue; }
    if (r.old.split('|').length !== r.new.split('|').length) { err.push(`số dấu | khác nhau: ${r.old.slice(0, 80)}`); continue; }
    src = src.replace(o, () => n); ok++;
  }
}
fs.writeFileSync(out || app, src);
console.log(`áp dụng ${ok}/${list.length}` + (err.length ? `\nBỎ QUA ${err.length}:\n` + err.join('\n') : ''));
process.exit(err.length ? 1 : 0);
