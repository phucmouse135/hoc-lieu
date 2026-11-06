// node patch-ielts.js <ielts.html> <ielts-full.txt> — thêm 2 đề IELTS full (mã đơn vị 901+)
const fs = require('fs');
const [app, bank] = process.argv.slice(2);
let src = fs.readFileSync(app, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';
if (src.includes('function startFull(')) { console.log('đã cài'); process.exit(0); }
const rep = (a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error(`cần 1 chỗ "${a.slice(0, 50)}", thấy ${n}`); src = src.replace(a, () => b); };

// 1) tách 4 mục, đánh số lại ##n → ##900+n
const txt = fs.readFileSync(bank, 'utf8').replace(/\r/g, '');
const sec = {}; let cur = null;
for (const ln of txt.split('\n')) { if (/^\[(FL|FR|FW|FS)\]$/.test(ln.trim())) { cur = ln.trim().slice(1, -1); sec[cur] = []; continue; } if (cur) sec[cur].push(ln.replace(/^##(\d+)\|/, (_, n) => '##' + (900 + +n) + '|')); }
for (const k of ['FL', 'FR', 'FW', 'FS']) if (!sec[k]) throw new Error('thiếu ' + k);
const L = src.split(nl), li = L.findIndex(l => l.startsWith('const RAW='));
const RAW = eval('(' + L[li].slice(10).replace(/;\s*$/, '') + ')');
for (const [key, s] of [['l', 'FL'], ['r', 'FR'], ['w', 'FW'], ['s', 'FS']]) {
  const old = JSON.stringify(RAW[key]); const k = ['"' + key + '":' + old, '"' + key + '": ' + old].find(x => L[li].split(x).length === 2);
  if (!k) throw new Error('không định vị RAW.' + key);
  L[li] = L[li].replace(k, () => k.slice(0, k.indexOf(old)) + JSON.stringify(RAW[key].replace(/\n*$/, '') + '\n' + sec[s].join('\n').trim()));
}
src = L.join(nl);

// 2) dựng đề full
const CODE = `
/* ================= Đề full 4 kỹ năng (đơn vị 901+ trong RAW.l/r/w/s) ================= */
const FULL=[{L:[901,902,903,904],R:[901,902,903],W:901,S:901},{L:[905,906,907,908],R:[904,905,906],W:902,S:902}];
function startFull(k,cb){const f=FULL[k-1];
  EXS={k,full:k,parts:[{title:'Listening',min:30,qs:f.L.map(w=>setL(w,true))},{title:'Reading',min:60,qs:f.R.map(setR)}],i:0,done:[],cb};examIntro();
}`;
rep('function examIntro(){', CODE.trim().replace(/\n/g, nl) + nl + 'function examIntro(){');
rep('<b>Đề tổng hợp số ${e.k}</b>', "<b>${e.full?'Đề full số '+e.full:'Đề tổng hợp số '+e.k}</b>");
rep("ST.exams['m'+e.k]={d:today(),L:raw[0],R:raw[1],lb,rb};", "ST.exams[(e.full?'f':'m')+e.k]={d:today(),L:raw[0],R:raw[1],lb,rb};");
rep('<b>Kết quả đề tổng hợp số ${e.k}</b>', "<b>Kết quả ${e.full?'đề full số':'đề tổng hợp số'} ${e.k}</b>");
rep('<p class="mute">Đề này dùng lại các bài đã học nên band ở đây thường cao hơn thực tế. Con số đáng tin hơn là điểm đề Cambridge bạn ghi ở mục Điểm số.</p></div>',
  `\${e.full?\`<p class="mute">Bài đọc và bài nghe của đề full chưa xuất hiện trong bài học. Làm tiếp hai kỹ năng còn lại của đề này:</p><div class="row"><button class="btn" data-act="fwrite" data-k="\${e.k}">Writing 60 phút</button><button class="btn line" data-act="fspeak" data-k="\${e.k}">Speaking 11–14 phút</button></div>\`:'<p class="mute">Đề này dùng lại các bài đã học nên band ở đây thường cao hơn thực tế. Con số đáng tin hơn là điểm đề Cambridge bạn ghi ở mục Điểm số.</p>'}</div>`);
rep("  else if(a==='mix'){", "  else if(a==='full'){startFull(+t.dataset.k)}" + nl +
  "  else if(a==='fwrite'){const k=+t.dataset.k,w=FULL[k-1].W;openWriter(Object.assign(wrCfg(w,p=>{ST.exams['fw'+k]={d:today(),p};save()}),{title:'Đề full số '+k+': Writing 60 phút'}))}" + nl +
  "  else if(a==='fspeak'){const k=+t.dataset.k,w=FULL[k-1].S;openSpeak({title:'Đề full số '+k+': Speaking',steps:spSteps(w),done:p=>{ST.exams['fs'+k]={d:today(),p};save()}})}" + nl +
  "  else if(a==='mix'){");
rep('  <section class="sec"><h2>Đề tổng hợp có tính giờ</h2>',
  `  <section class="sec"><h2>Đề full 4 kỹ năng (tự soạn)</h2><p>Listening 4 section, 40 câu, 30 phút và Reading 3 bài, 40 câu, 60 phút, hoàn toàn mới; sau đó làm Writing (Task 1 + Task 2, 60 phút) và Speaking (Part 1–3) của cùng đề.</p>
  <div class="cards">\${[1,2].map(i=>\`<button class="pcard" data-act="full" data-k="\${i}"><b>Đề full số \${i}</b><span>\${ex['f'+i]?\`Listening \${b1(ex['f'+i].lb)}, Reading \${b1(ex['f'+i].rb)} (\${fmtY(pd(ex['f'+i].d))})\`:'Chưa làm'}</span></button>\`).join('')}</div></section>
  <section class="sec"><h2>Đề tổng hợp có tính giờ</h2>`);
rep('${Object.keys(LI).length} bài Listening và ${Object.keys(RD).length} bài Reading soạn sẵn.', '${Object.keys(LI).filter(w=>w<900).length} bài Listening và ${Object.keys(RD).filter(w=>w<900).length} bài Reading soạn sẵn, cùng 2 đề full.');
fs.writeFileSync(app, src);
console.log('xong', Object.fromEntries(Object.entries(sec).map(([k, v]) => [k, v.length])));
