// US15: phương án nhiễu "gần giống" cho câu kanji và từ vựng JLPT.
// Dùng: node scripts/content/patch-sim-jlpt.js public/japanese/jlpt-n*.html
const fs = require('fs');
const HELP = `/* Phương án nhiễu gần giống: chữ chung thành phần, cùng âm Hán Việt, số nét gần; từ cùng chủ đề hoặc chung chữ kanji */
const KCOMP={};function kComp(c){if(KCOMP[c])return KCOMP[c];const s=new Set();const walk=xs=>(xs||[]).forEach(x=>{s.add(x.c);walk(x.sub)});try{walk(KP[c]&&KP[c].tree)}catch(e){}return KCOMP[c]=s}
function simPool(k,pool){
  const a=kComp(k.c),hv=(k.hv||'').split(/[ ,]/)[0],ns=(k.s||[]).length;
  const sc=x=>{if(x===k)return -1;let v=0;const b=kComp(x.c);for(const y of b)if(a.has(y))v+=3;if(a.has(x.c)||b.has(k.c))v+=2;if(hv&&(x.hv||'').split(/[ ,]/)[0]===hv)v+=2;if(Math.abs((x.s||[]).length-ns)<=2)v+=1;return v+RNG()};
  const r=pool.map(x=>[sc(x),x]).sort((p,q)=>q[0]-p[0]).map(z=>z[1]);return shuf(r.slice(0,6)).concat(r.slice(6));
}
let WTH=null;
function simW(w,pool){
  if(!WTH){WTH=new Map();V5.forEach((g,i)=>g.items.forEach(x=>WTH.set(x,i)))}
  const t=WTH.get(w),ks=new Set([...(w.w||'')].filter(c=>/[一-龯]/.test(c))),L=(w.m||'').length;
  const sc=x=>{if(x===w)return -1;let v=0;if(t!=null&&WTH.get(x)===t)v+=3;for(const c of x.w||'')if(ks.has(c))v+=2;if(Math.abs((x.m||'').length-L)<=Math.max(3,L*.3))v+=1;return v+RNG()};
  const r=pool.map(x=>[sc(x),x]).sort((p,q)=>q[0]-p[0]).map(z=>z[1]);return shuf(r.slice(0,6)).concat(r.slice(6));
}
`;
const R = [
  ["if(t===1) return Q('Kanji',`Chữ nào mang nghĩa “${esc(lab(k))}”?`,k.c,shuf(pool).filter(", "if(t===1) return Q('Kanji',`Chữ nào mang nghĩa “${esc(lab(k))}”?`,k.c,simPool(k,pool).filter("],
  ["return Q('Kanji',`Âm Hán Việt và nghĩa của chữ này?<div class=\"qs jp huge\">${k.c}</div>`,lab(k),shuf(pool).filter(", "return Q('Kanji',`Âm Hán Việt và nghĩa của chữ này?<div class=\"qs jp huge\">${k.c}</div>`,lab(k),simPool(k,pool).filter("],
  ["`Từ nào có nghĩa là “${esc(w.m)}”?`,w.w,shuf(pool).filter(", "`Từ nào có nghĩa là “${esc(w.m)}”?`,w.w,simW(w,pool).filter("],
  ["`Từ này nghĩa là gì?<div class=\"qs jp\">${wordHtml(w)}</div>`,w.m,shuf(pool).filter(", "`Từ này nghĩa là gì?<div class=\"qs jp\">${wordHtml(w)}</div>`,w.m,simW(w,pool).filter("],
];
for (const f of process.argv.slice(2)) {
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('function simPool(')) { console.log('bỏ qua', f); continue; }
  for (const [a, b] of R) { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`${f}: cần 1 chỗ, thấy ${n}: ${a.slice(0, 50)}`); s = s.replace(a, () => b); }
  s = s.replace('function qWord(w,type){', () => HELP + 'function qWord(w,type){');
  fs.writeFileSync(f, s); console.log('xong', f);
}
