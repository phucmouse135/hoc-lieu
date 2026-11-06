// Chèn thêm dòng vào cuối một mục [SEC] trong chuỗi RAW.ex5 của app JLPT (vd mục BP của chế độ "Điền từ theo ngữ cảnh").
// Dùng: node scripts/content/insert-section.js <jlpt-nX.html> <SEC> <tệp dòng mới.txt> [--out <tệp ra>]
'use strict';
const fs = require('fs');
const a = process.argv.slice(2), oi = a.indexOf('--out'), out = oi >= 0 ? a[oi + 1] : null;
const [app, sec, file] = oi >= 0 ? a.filter((_, i) => i !== oi && i !== oi + 1) : a;
const src = fs.readFileSync(app, 'utf8'), nl = src.includes('\r\n') ? '\r\n' : '\n', L = src.split(nl);
const li = L.findIndex(l => l.startsWith('const RAW=')), RAW = eval('(' + L[li].slice(10).replace(/;\s*$/, '') + ')');
const old = JSON.stringify(RAW.ex5), key = ['"ex5": ' + old, '"ex5":' + old].find(k => L[li].split(k).length === 2);
if (!key) throw new Error('không định vị được ex5');
const add = fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n').map(x => x.trim()).filter(Boolean);
const lines = RAW.ex5.split('\n'), h = lines.findIndex(x => x.trim() === `[${sec}]`);
if (h < 0) throw new Error('không có mục [' + sec + ']');
let e = h + 1; while (e < lines.length && !/^\[[A-Z]+\]$/.test(lines[e].trim())) e++;
while (e > h + 1 && !lines[e - 1].trim()) e--;
const have = new Set(lines.slice(h + 1, e).map(x => x.trim())), fresh = add.filter(x => !have.has(x));
lines.splice(e, 0, ...fresh);
L[li] = L[li].replace(key, () => key.slice(0, key.indexOf(old)) + JSON.stringify(lines.join('\n')));
fs.writeFileSync(out || app, L.join(nl));
console.log(`[${sec}] +${fresh.length} dòng` + (fresh.length < add.length ? ` (bỏ ${add.length - fresh.length} dòng trùng)` : ''));
