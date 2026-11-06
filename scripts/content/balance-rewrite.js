// Tránh lệch ngược: giữ lại bản gốc cho một phần câu để tỉ lệ "đúng = dài nhất" ở mỗi mục quanh mức mục tiêu (mặc định 20%).
// Dùng: node scripts/content/balance-rewrite.js <app.html> <rewrite.json> <ra.json> [--target 20]
// Câu được giữ bản gốc là câu có đáp án đúng chỉ dài hơn phương án dài nhì rất ít (tỉ lệ nhỏ nhất).
'use strict';
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const a = process.argv.slice(2), ti = a.indexOf('--target'), target = ti >= 0 ? +a[ti + 1] : 20;
const [app, inF, outF] = ti >= 0 ? a.filter((_, i) => i !== ti && i !== ti + 1) : a;
const lint = (...x) => JSON.parse(spawnSync(process.execPath, [path.join(__dirname, 'lint.js'), app, '--json', ...x], { maxBuffer: 1 << 28 }).stdout.toString())[0];
const list = JSON.parse(fs.readFileSync(inF, 'utf8')), byOld = new Map(list.map(r => [r.old, r]));
const drop = new Set();
for (const s of lint().sections) {
  const items = lint('--items', s.sec).items.filter(it => byOld.has(it.raw));
  if (!items.length) continue;
  const keep = Math.max(0, Math.round(s.n * target / 100) - (s.long - items.length));
  items.sort((p, q) => p.ratio - q.ratio).slice(0, keep).forEach(it => drop.add(it.raw));
  console.log(`${s.sec}: ${s.n} câu, đang lệch ${s.long}, trong lô ${items.length}, giữ bản gốc ${Math.min(keep, items.length)}`);
}
const out = list.filter(r => !drop.has(r.old));
fs.writeFileSync(outF, JSON.stringify(out, null, 1));
console.log(`giữ ${out.length}/${list.length} mục`);
