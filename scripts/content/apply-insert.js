// Chèn văn bản ngay sau các mốc (anchor) duy nhất trong một app.
// Dùng: node scripts/content/apply-insert.js <app.html> <insert.json> [--out <tệp ra>]
// insert.json: [{"anchor": chuỗi con xuất hiện đúng 1 lần, "insert": văn bản chèn sau mốc}]
'use strict';
const fs = require('fs');
const a = process.argv.slice(2), oi = a.indexOf('--out'), out = oi >= 0 ? a[oi + 1] : null;
const [app, file] = oi >= 0 ? a.filter((_, i) => i !== oi && i !== oi + 1) : a;
let src = fs.readFileSync(app, 'utf8');
const list = JSON.parse(fs.readFileSync(file, 'utf8')), err = [];
for (const r of list) { if (src.split(r.anchor).length !== 2) err.push(`mốc xuất hiện ${src.split(r.anchor).length - 1} lần: ${String(r.anchor).slice(0, 80)}`); }
if (err.length) { console.log('KHÔNG áp dụng, lỗi mốc:\n' + err.join('\n')); process.exit(1); }
for (const r of list) { const i = src.indexOf(r.anchor) + r.anchor.length; src = src.slice(0, i) + r.insert + src.slice(i); }
fs.writeFileSync(out || app, src);
console.log(`đã chèn ${list.length} khối`);
