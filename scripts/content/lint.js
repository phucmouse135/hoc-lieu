// Kiểm lỗi "đáp án đúng là phương án dài nhất" trong dữ liệu các app.
// Dùng: node scripts/content/lint.js <app.html>... [--items <mục>] [--max 35] [--json]
//   --items <mục>  in các câu bị lệch của mục đó (dòng gốc nguyên văn) để viết lại
//   --json         xuất JSON {file, sections:[{sec,n,long,pct}], items:[...]}
// Quy ước: đáp án đúng là phương án đầu tiên (AWS dùng trường a). Thoát mã 1 khi có mục ≥ 8 câu vượt ngưỡng.
'use strict';
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), files = [], opt = { max: 35, items: null, json: false };
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--max') opt.max = +args[++i]; else if (args[i] === '--items') opt.items = args[++i]; else if (args[i] === '--json') opt.json = true; else files.push(args[i]);
}
const strip = s => String(s).replace(/<[^>]+>/g, '').replace(/\([ぁ-ゖー]+\)/g, '').replace(/\s+/g, ' ').trim();
const evalObj = (src, prefix) => { const L = src.split(/\r?\n/), i = L.findIndex(l => l.startsWith(prefix)); return i < 0 ? null : eval('(' + L[i].slice(prefix.length).replace(/;\s*$/, '') + ')'); };
const isLong = opts => { const L = opts.map(o => strip(o).length), mx = Math.max(...L); return L[0] === mx && L.filter(x => x === mx).length === 1; };
const ratio = opts => { const L = opts.map(o => strip(o).length).sort((a, b) => b - a); return L[1] ? L[0] / L[1] : 1; };

// Gom nhóm phương án (đáp án đúng đứng đầu) từ một chuỗi dữ liệu dạng dòng
function groupsFromText(text, secOf) {
  const out = []; let sec = '';
  for (const raw of text.split('\n')) {
    const ln = raw.trim(); if (!ln) continue;
    const h = ln.match(/^\[([A-Z][A-Z0-9]*(?:\.\d+)?)\]$/); if (h) { sec = h[1]; continue; }
    const S = secOf(sec), body = ln.split(' >> ')[0];
    if (body[0] === '?') { const p = body.slice(1).split('|'); const o = p.slice(1).filter(x => x !== ''); if (o.length >= 3) out.push({ sec: S, raw, opts: o }); continue; }
    const qi = body.indexOf('?|'); if (qi > 0) { const o = body.slice(qi + 2).split('|').filter(x => x !== ''); if (o.length >= 3 && !/^[\p{Extended_Pictographic}\s‍️]+$/u.test(o[0])) out.push({ sec: S, raw, opts: o }); }
    else if (/^(B|P|BP|H|O|HP|OP|ZB|ZW|ZP|LH|LO)$/.test(sec) && body.includes('|')) { const o = body.split('|').slice(1); if (o.length >= 3) out.push({ sec: S, raw, opts: o }); }
    else if (/^(U|ZU)$/.test(sec) && body.includes('|')) { const o = body.split('|').slice(1); if (o.length >= 3) out.push({ sec: S, raw, opts: o.map(x => x.replace(/[＜＞]/g, '')) }); }
    for (const g of body.match(/【[^】]+】/g) || []) { const o = g.slice(1, -1).split('|'); if (o.length >= 3) out.push({ sec: S + '【】', raw, opts: o }); }
  }
  return out;
}

function collect(file) {
  const src = fs.readFileSync(file, 'utf8'), base = path.basename(file), G = [];
  if (/jlpt-n\d/.test(base)) {
    const R = evalObj(src, 'const RAW=');
    for (const k of ['rd', 'kw5', 'r5']) if (R[k]) G.push(...groupsFromText(R[k], () => 'bài học:' + k));
    if (R.ex5) G.push(...groupsFromText(R.ex5, s => 'đề:' + s));
  } else if (/hsk\d/.test(base)) {
    const D = evalObj(src, 'const DATA=');
    for (const k of ['kw', 'rd']) if (typeof D[k] === 'string') G.push(...groupsFromText(D[k], () => 'bài học:' + k));
    G.push(...groupsFromText(D.ex, s => 'đề:' + (s.split('.')[1] || '?')));
  } else if (/ielts/.test(base)) {
    const R = evalObj(src, 'const RAW=');
    for (const k of ['l', 'r']) { const [les, ...full] = R[k].split(/\n(?=##9\d\d\|)/); G.push(...groupsFromText(les, () => 'bài học:' + k)); G.push(...groupsFromText(full.join('\n'), () => 'đề full:' + k)); }
  } else if (/toeic/.test(base)) {
    const R = evalObj(src, 'const RAW='); let id = '';
    for (const blk of R.les.split(/\n(?=##)/)) { const m = blk.match(/^##([A-Z]+)(\d*)/); id = m ? (m[1] === 'F' ? 'đề ' + m[1] + m[2] : 'bài ' + m[1]) : id; G.push(...groupsFromText(blk, () => id)); }
  } else if (/aws/.test(base)) {
    const pt = JSON.parse(src.match(/<script type="application\/json" id="d-pt">([\s\S]*?)<\/script>/)[1]);
    pt.forEach((t, ti) => t.forEach((q, qi) => { if (q.a.length === 1) { const o = [q.o[q.a[0]], ...q.o.filter((_, i) => i !== q.a[0])]; G.push({ sec: 'đề luyện ' + (ti + 1), raw: `${ti}:${qi}`, opts: o }); } }));
  } else if (/ocp/.test(base)) {
    for (const m of src.matchAll(/<script type="text\/plain" class="wk"[^>]*>([\s\S]*?)<\/script>/g)) {
      let cur = null, sec = 'bài học';
      const flush = () => { if (cur && cur.ok.length === 1 && cur.bad.length >= 2) G.push({ sec, raw: cur.q, opts: [cur.ok[0], ...cur.bad] }); };
      for (const ln of m[1].split(/\r?\n/)) { const e = ln.match(/^##(E\d+)/); if (e) { flush(); cur = null; sec = 'đề ' + e[1]; continue; }
        if (ln[0] === '?') { flush(); cur = { q: ln, ok: [], bad: [] }; } else if (cur && ln.startsWith('+ ')) cur.ok.push(ln.slice(2)); else if (cur && ln.startsWith('- ')) cur.bad.push(ln.slice(2)); }
      flush();
    }
  }
  return G;
}

let fail = false; const report = [];
for (const f of files) {
  const G = collect(f), by = {};
  for (const g of G) (by[g.sec] = by[g.sec] || []).push(g);
  const secs = Object.entries(by).map(([sec, a]) => { const long = a.filter(g => isLong(g.opts)).length; return { sec, n: a.length, long, pct: Math.round(long / a.length * 100) }; });
  const items = opt.items ? (by[opt.items] || []).filter(g => isLong(g.opts)).map(g => ({ raw: g.raw, ratio: +ratio(g.opts).toFixed(2) })) : [];
  report.push({ file: f, sections: secs, items });
  for (const s of secs) if (s.n >= 8 && s.pct > opt.max) fail = true;
}
if (opt.json) console.log(JSON.stringify(report, null, 1));
else for (const r of report) {
  console.log('\n' + r.file);
  for (const s of r.sections) console.log(`  ${s.n >= 8 && s.pct > opt.max ? '✗' : s.pct > opt.max ? '·' : '✓'} ${s.sec.padEnd(22)} ${String(s.long).padStart(4)}/${String(s.n).padEnd(5)} ${s.pct}%`);
  if (opt.items) for (const it of r.items) console.log(`    [${it.ratio}] ${it.raw}`);
}
process.exit(fail ? 1 : 0);
