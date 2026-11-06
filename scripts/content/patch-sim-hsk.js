// US15: phương án nhiễu "gần giống" cho câu Hán tự HSK (chung thành phần, cùng âm pinyin không dấu, số nét gần).
// Dùng: node scripts/content/patch-sim-hsk.js public/chinese/hsk*.html
const fs = require('fs');
const HELP = `/* Phương án nhiễu gần giống cho câu Hán tự */
const HCOMP={};function hComp(c){if(HCOMP[c])return HCOMP[c];const s=new Set();const walk=xs=>(xs||[]).forEach(x=>{s.add(x.c);walk(x.sub)});try{walk(KP[c]&&KP[c].tree)}catch(e){}return HCOMP[c]=s}
function hsim(k,pool){
  const a=hComp(k.c),py=pyBase(hp(k)).toLowerCase(),ns=(k.s||[]).length;
  const sc=x=>{if(!x||x===k)return -1;let v=0;const b=hComp(x.c);for(const y of b)if(a.has(y))v+=3;if(a.has(x.c)||b.has(k.c))v+=2;if(pyBase(hp(x)).toLowerCase()===py)v+=2;if(Math.abs((x.s||[]).length-ns)<=2)v+=1;return v+Math.random()};
  const r=pool.map(x=>[sc(x),x]).sort((p,q)=>q[0]-p[0]).map(z=>z[1]);return shuf(r.slice(0,6)).concat(r.slice(6));
}
`;
const R = [
  ["if(t===1)return mc('Characters',`Which character is “${esc(lab(k))}”?`,k.c,pool.filter(", "if(t===1)return mc('Characters',`Which character is “${esc(lab(k))}”?`,k.c,hsim(k,pool).filter("],
  ["return mc('Characters',`Pinyin and meaning of this character?<div class=\"qs zh huge\">${k.c}</div>`,lab(k),pool.filter(", "return mc('Characters',`Pinyin and meaning of this character?<div class=\"qs zh huge\">${k.c}</div>`,lab(k),hsim(k,pool).filter("],
];
for (const f of process.argv.slice(2)) {
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('function hsim(')) { console.log('bỏ qua', f); continue; }
  for (const [a, b] of R) { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`${f}: cần 1 chỗ, thấy ${n}: ${a.slice(0, 50)}`); s = s.replace(a, () => b); }
  s = s.replace('function qHan(k,t){', () => HELP + 'function qHan(k,t){');
  fs.writeFileSync(f, s); console.log('xong', f);
}
