// node patch-jlpt.js <level n5..n1> <app.html> <bank1.txt> [bank2.txt]
// Ghép ngân hàng đề mới vào RAW.ex5 và cài bộ dựng đề dạng mới (buildExamZ). Chạy lại an toàn: bỏ qua nếu đã cài.
const fs = require('fs'), SPEC = require('./spec.js');
const [lv, app, ...banks] = process.argv.slice(2);
let src = fs.readFileSync(app, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';
if (src.includes('function buildExamZ(')) { console.log('đã cài, bỏ qua', app); process.exit(0); }
const rep = (a, b, all) => { const n = src.split(a).length - 1; if (n !== 1 && !(all && n > 0)) throw new Error(`[${app}] cần đúng 1 chỗ "${a.slice(0, 60)}", thấy ${n}`); src = all ? src.split(a).join(b) : src.replace(a, () => b); };

// 1) dữ liệu
const L = src.split(nl), li = L.findIndex(l => l.startsWith('const RAW='));
const RAW = eval('(' + L[li].slice(10).replace(/;\s*$/, '') + ')');
const oldJ = JSON.stringify(RAW.ex5);
if (L[li].split('"ex5": ' + oldJ).length !== 2) throw new Error('không định vị được ex5 trong RAW');
const add = banks.map(f => fs.readFileSync(f, 'utf8').replace(/\r/g, '').trim()).join('\n');
L[li] = L[li].replace('"ex5": ' + oldJ, () => '"ex5": ' + JSON.stringify(RAW.ex5.replace(/\n*$/, '') + '\n' + add));
src = L.join(nl);

// 2) bộ phân tích: thêm các mục mới
rep("const blk={S:[],M:[],I:[]},dlg={L:1,WL:1},rawS={C:1,X:1,G:1,T:1};",
  "const blk={S:[],M:[],I:[],ZS:[],ZM:[],ZL:[],ZI:[],ZA:[],ZF:[]},dlg={L:1,WL:1,LT:1,LP:1,LG:1,LI:1},rawS={C:1,X:1,G:1,T:1,ZR:1,ZO:1,ZG:1,ZT:1,ZC:1};");

// 3) cấu hình đề theo cấp
const T = { ZR: 'Cách đọc kanji (漢字読み)', ZO: 'Chọn chữ viết đúng (表記)', ZW: 'Cấu tạo từ (語形成)', ZB: 'Điền từ theo ngữ cảnh (文脈規定)', ZP: 'Từ gần nghĩa (言い換え類義)', ZU: 'Cách dùng từ (用法)',
  ZG: 'Chọn ngữ pháp (文法形式の判断)', ZT: 'Sắp xếp câu (文の組み立て)', ZC: 'Ngữ pháp trong đoạn văn (文章の文法)', ZS: 'Đọc đoạn ngắn (内容理解・短文)', ZM: 'Đọc đoạn vừa (内容理解・中文)', ZL: 'Đọc đoạn dài (内容理解・長文)',
  ZI: 'Đọc so sánh hai bài (統合理解)', ZA: 'Đọc nắm luận điểm (主張理解)', ZF: 'Tìm thông tin (情報検索)', LT: 'Nghe nhiệm vụ (課題理解)', LP: 'Nghe điểm chính (ポイント理解)', LG: 'Nghe khái quát (概要理解)',
  LH: 'Chọn câu nói (発話表現)', LO: 'Đáp lời nhanh (即時応答)', LI: 'Nghe tổng hợp (統合理解)' };
const GRP = k => k[0] === 'L' ? 'l' : ['ZS', 'ZM', 'ZL', 'ZI', 'ZA', 'ZF'].includes(k) ? 'r' : 'v';
const S = SPEC[lv].secs, sec = ks => ks.filter(k => S[k]).map((k, i) => [k, Array.isArray(S[k]) ? S[k][0] : S[k], `もんだい${i + 1} · ${T[k]}`, GRP(k)]);
const V = ['ZR', 'ZO', 'ZW', 'ZB', 'ZP', 'ZU'], G = ['ZG', 'ZT', 'ZC'], R = ['ZS', 'ZM', 'ZL', 'ZI', 'ZA', 'ZF'], LS = ['LT', 'LP', 'LG', 'LH', 'LO', 'LI'];
const CFG = {
  n5: { off: 3, n: 6, pass: 80, three: 0, parts: [['Phần 1: Chữ và từ vựng', 20, V], ['Phần 2: Ngữ pháp và đọc hiểu', 40, [...G, ...R]], ['Phần 3: Nghe hiểu', 30, LS]] },
  n4: { off: 2, n: 4, pass: 90, three: 0, parts: [['Phần 1: Chữ và từ vựng', 25, V], ['Phần 2: Ngữ pháp và đọc hiểu', 55, [...G, ...R]], ['Phần 3: Nghe hiểu', 35, LS]] },
  n3: { off: 0, n: 3, pass: 95, three: 1, parts: [['Phần 1: Kiến thức ngôn ngữ (chữ, từ vựng)', 30, V], ['Phần 2: Kiến thức ngôn ngữ (ngữ pháp) và đọc hiểu', 70, [...G, ...R]], ['Phần 3: Nghe hiểu', 40, LS]] },
  n2: { off: 0, n: 3, pass: 90, three: 1, parts: [['Phần 1: Kiến thức ngôn ngữ (chữ, từ vựng, ngữ pháp) và đọc hiểu', 105, [...V, ...G, ...R]], ['Phần 2: Nghe hiểu', 50, LS]] },
  n1: { off: 0, n: 3, pass: 100, three: 1, parts: [['Phần 1: Kiến thức ngôn ngữ (chữ, từ vựng, ngữ pháp) và đọc hiểu', 110, [...V, ...G, ...R]], ['Phần 2: Nghe hiểu', 55, LS]] },
}[lv];
const ZSPEC = { off: CFG.off, n: CFG.n, pass: CFG.pass, three: CFG.three, parts: CFG.parts.map(([t, min, ks]) => ({ t, min, secs: sec(ks) })) };

const CODE = `
/* ================= Đề thi thử dạng mới (mỗi đề lấy một khối câu liên tiếp trong các mục Z*, L*) ================= */
const ZSPEC=${JSON.stringify(ZSPEC)};
const qPara2=x=>{const q=Q('Từ gần nghĩa',\`Chọn từ hoặc cách nói gần nghĩa nhất với phần gạch chân.<div class="qs jp">\${ruby(x.q).replace('＜','<u>').replace('＞','</u>')}</div>\`,x.opts[0],x.opts.slice(1),\`<span class="jp">\${ruby(x.q).replace(/＜[^＞]*＞/,'<mark>'+ruby(x.opts[0])+'</mark>')}</span>\`,null);return q};
function buildExamZ(no){
  let s=no>0?no*7919+13:Date.now()%1e6;const old=RNG;RNG=()=>(s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff;
  const k=no>0?no-ZSPEC.off:0,pick=(a,n)=>(a=a||[],k>0?a.slice((k-1)*n,k*n):shuf(a).slice(0,n));
  const mk={ZR:x=>qX(x,'r'),ZO:x=>qX(x,'o'),ZW:qBank,ZB:qBank,ZP:qPara2,ZU:x=>qU(x),ZG:qG,ZT:qStar,ZC:qPass,ZS:qRead,ZM:qRead,ZL:qRead,ZI:qRead,ZA:qRead,ZF:qRead,
    LT:qListenX,LP:qListenX,LG:qListenX,LI:qListenX,LH:x=>qSpoken(x,'h'),LO:x=>qSpoken(x,'o')};
  const parts=ZSPEC.parts.map(p=>({title:p.t,min:p.min,qs:p.secs.flatMap(([sc,n,tag,grp])=>pick(EX[sc],n).flatMap(x=>{const q=mk[sc](x);return Array.isArray(q)?q:[q]}).filter(Boolean).map(q=>(q.tag=tag,q.grp=grp,q)))}));
  RNG=old;return parts;
}
function examResultZ(){
  const e=EXS,all=e.done.flatMap(z=>z.qs.map((q,i)=>[q.grp,z.res[i]===true])),g=t=>{const a=all.filter(x=>x[0]===t);return [a.filter(x=>x[1]).length,a.length||1]};
  const [vc,vn]=g('v'),[rc,rn]=g('r'),[lc,ln]=g('l'),sv=Math.round(vc/vn*60),sr=Math.round(rc/rn*60),sl=Math.round(lc/ln*60),tot=sv+sr+sl,pass=tot>=ZSPEC.pass&&sv>=19&&sr>=19&&sl>=19,p=P();
  if(e.no)(p.exams=p.exams||{})[e.no]={d:today(),tot,lang:sv+sr,lis:sl,pass};p.act[today()]=1;save();if(e.cb)e.cb(Math.round(tot/180*100));
  $('#quiz').innerHTML=\`<div class="qwrap"><header class="qhead"><button class="x" data-act="qclose" aria-label="Đóng">×</button><b>Kết quả \${e.no?'đề số '+e.no:'đề trộn lại'}</b><span></span></header>
  <div class="result"><div class="stamp big \${pass?'':'fail'}">\${pass?'合格':'再'}</div><h2>\${tot}/180 điểm: \${pass?'ĐẠT':'CHƯA ĐẠT'}</h2>
  <table class="tb"><tr><th>Phần điểm</th><th>Số câu đúng</th><th>Điểm quy đổi</th><th>Điểm liệt</th></tr>
  <tr><td>Kiến thức ngôn ngữ (chữ, từ vựng, ngữ pháp)</td><td>\${vc}/\${vn}</td><td>\${sv}/60</td><td>19</td></tr>
  <tr><td>Đọc hiểu</td><td>\${rc}/\${rn}</td><td>\${sr}/60</td><td>19</td></tr>
  <tr><td>Nghe hiểu</td><td>\${lc}/\${ln}</td><td>\${sl}/60</td><td>19</td></tr></table>
  <p class="mute">Đề thật đỗ khi tổng từ \${ZSPEC.pass}/180 và không phần điểm nào dưới 19/60. Điểm ở đây quy đổi theo tỉ lệ câu đúng nên chỉ để tham khảo; đề thật chấm theo thang điểm chuẩn hoá.</p></div>
  \${e.done.map((z,i)=>{const bad=z.qs.map((q,j)=>z.res[j]===true?'':revItem(q,z.ans[j])).join('');return bad?\`<h3>\${e.parts[i].title}: câu cần xem lại</h3>\${bad}\`:''}).join('')}
  <div class="row"><button class="btn" data-act="qclose">Xong</button></div></div>\`;
  $('#quiz').scrollTop=0;QZ={fin:true};EXS=null;
}
`;
// 4) chèn code sau examResult cũ, và chuyển hướng
const er = src.indexOf('function examResult(){'), end = src.indexOf(nl + '}' + nl, er) + nl.length + 1 + nl.length;
src = src.slice(0, end) + CODE.replace(/\n/g, nl) + src.slice(end);
rep('function buildExam(no){', 'function buildExam(no){' + nl + '  if(!ZSPEC.off||no>ZSPEC.off)return buildExamZ(no);');
rep('function examResult(){', 'function examResult(){' + nl + '  if(ZSPEC.three)return examResultZ();');
rep("if(++ex.i<3)examIntro()", "if(++ex.i<ex.parts.length)examIntro()");
rep("<span>${e.i+1}/3</span>", "<span>${e.i+1}/${e.parts.length}</span>");
rep("${e.i===2?'<p class=\"note\">Phần nghe", "${e.i===e.parts.length-1?'<p class=\"note\">Phần nghe");

// 5) trang Đề thi thử
const rows = ZSPEC.parts.map(p => `<tr><td>${p.t.replace(/^Phần \d+: /, '')}</td><td>${p.min} phút</td><td>${p.secs.map(([k, n]) => {
  const per = Array.isArray(S[k]) ? S[k] : null; const cnt = per ? (['ZC'].includes(k) ? per[1] : per[0] * per[1]) : n; return `${T[k].replace(/ \(.*\)$/, '')} ${cnt}`; }).join(' · ')}</td><td>${p.secs.reduce((a, [k, n]) => { const per = Array.isArray(S[k]) ? S[k] : null; return a + (per ? (k === 'ZC' ? per[1] : per[0] * per[1]) : n); }, 0)}</td></tr>`).join('');
const ei = src.indexOf('function examV(){'), ee = src.indexOf(nl + '}' + nl, ei) + nl.length + 1;
const lvU = lv.toUpperCase(), off = ZSPEC.off;
const intro = off ? `${off} đề cũ cùng ${ZSPEC.n - off} đề bổ sung (số ${off + 1}–${ZSPEC.n}), dựng theo cấu trúc và thời lượng của đề ${lvU} hiện hành.` : `${ZSPEC.n} đề cố định dựng theo cấu trúc 大問 và thời lượng chính thức của đề ${lvU} (jlpt.jp).`;
const scoreNote = ZSPEC.three ? `Ba phần điểm (kiến thức ngôn ngữ, đọc hiểu, nghe hiểu) mỗi phần 60, đỗ khi tổng từ ${ZSPEC.pass}/180 và không phần nào dưới 19.` : `Điểm quy đổi về thang 180 (đỗ từ ${ZSPEC.pass}, điểm liệt 38/120 và 19/60).`;
const newV = `function examV(){
  const ex=P().exams||{};
  return \`<h1>Đề thi thử ${lvU}</h1><p class="lead">${intro} Câu hỏi không trùng với bài học và các đề không trùng nhau. Số câu mỗi dạng theo đề mẫu, đề thật có thể chênh vài câu.</p>
  <table class="tb"><tr><th>Phần</th><th>Thời gian</th><th>Dạng câu</th><th>Số câu</th></tr>${rows}</table>
  <p class="mute">${scoreNote} Phần nghe dùng giọng đọc của trình duyệt, mỗi câu chỉ nghe một lần; hãy luyện thêm bằng đề mẫu chính thức trên jlpt.jp trước ngày thi.</p>
  <div class="cards">\${[...Array(${ZSPEC.n})].map((_,j)=>j+1).map(i=>\`<button class="pcard" data-act="exam" data-no="\${i}"><b>Đề số \${i}</b><span>\${ex[i]?\`\${ex[i].tot}/180, \${ex[i].pass?'đạt':'chưa đạt'} (\${fmtY(pd(ex[i].d))})\`:'Chưa làm'}</span></button>\`).join('')}
  <button class="pcard" data-act="exam" data-no="0"><b>Đề trộn lại</b><span>Trộn câu của các đề. Chỉ nên làm sau khi xong các đề trên.</span></button></div>\`;
}`.replace(/\n/g, nl);
src = src.slice(0, ei) + newV + src.slice(ee);

rep("const VOI={A:'f',B:'m'};", "const VOI={A:'f',B:'m',C:'n'};");
// 6) lịch luyện đề cho N3/N2/N1
if (lv === 'n3') rep('if(EX.X&&mk[dow])', 'if(EX.ZR&&mk[dow])');
if (lv === 'n2' || lv === 'n1') rep("const mk={};if(EX.X&&mk[dow])", "const mk=({46:{3:1},49:{3:2},51:{3:3}})[w]||{};if(EX.ZR&&mk[dow])");
if (['n3', 'n2', 'n1'].includes(lv)) rep('Đề thi thử chưa có trong bản này.', 'Ba đề thi thử nằm rải trong các tuần này, xem thêm ở mục Đề thi.');
fs.writeFileSync(app, src);
console.log('xong', app, 'ex5 +', add.split('\n').length, 'dòng');
