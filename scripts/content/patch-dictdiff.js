// US18: tô chỗ sai khi chép chính tả (so khớp từng ký tự bằng LCS).
// Dùng: node scripts/content/patch-dictdiff.js public/japanese/jlpt-n*.html public/chinese/hsk*.html
const fs = require('fs');
const LCS = `function lcsMark(u,t){const n=u.length,m=t.length,d=Array.from({length:n+1},()=>new Uint16Array(m+1));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)d[i][j]=u[i]===t[j]?d[i+1][j+1]+1:Math.max(d[i+1][j],d[i][j+1]);
  const mu=new Array(n).fill(0),mt=new Array(m).fill(0);let i=0,j=0;while(i<n&&j<m){if(u[i]===t[j]){mu[i]=mt[j]=1;i++;j++}else if(d[i+1][j]>=d[i][j+1])i++;else j++}
  return {u:[...u].map((c,k)=>mu[k]?esc(c):'<s style="color:var(--shu,#c0392b)">'+esc(c)+'</s>').join(''),t:[...t].map((c,k)=>mt[k]?esc(c):'<mark>'+esc(c)+'</mark>').join(''),ok:d[0][0]===m&&n===m}}
`;
const JA = LCS + `function dictDiff(q,v){if(!v)return '';const U=[...norm(v)],A=[...norm(strip(q.raw))],B=[...norm(kana(q.raw))],sim=(a,b)=>1-lev(a,b)/Math.max(a.length,b.length,1);
  const T=sim(U,B)>sim(U,A)?B:A,r=lcsMark(U,T);if(r.ok)return '';
  return \`<p class="ddiff">Bạn viết: <span class="jp">\${r.u}</span><br>Cần có: <span class="jp">\${r.t}</span><br><small class="mute">Gạch ngang là chữ thừa hoặc sai, tô vàng là chữ còn thiếu.</small></p>\`}
`;
const ZH = LCS + `function dictDiff(q,v){if(!v)return '';const r=lcsMark([...v.replace(PUNC,'')],[...q.raw.replace(PUNC,'')]);if(r.ok)return '';
  return \`<p class="ddiff">You wrote: <span class="zh">\${r.u}</span><br>Should be: <span class="zh">\${r.t}</span><br><small class="mute">Struck through: extra or wrong. Highlighted: missing.</small></p>\`}
`;
const RJ = [
  ["const more=k==='dict'?`<p>Đáp án: <span class=\"jp\">${ruby(q.raw)}</span>", "const more=k==='dict'?dictDiff(q,a)+`<p>Đáp án: <span class=\"jp\">${ruby(q.raw)}</span>"],
  ["if(k==='dict') return h+`<p>Bạn viết: <span class=\"jp no\">${esc(a||'(bỏ trống)')}</span></p>", "if(k==='dict') return h+(dictDiff(q,a)||`<p>Bạn viết: <span class=\"jp no\">${esc(a||'(bỏ trống)')}</span></p>`)+`"],
];
const RZ = [
  ["const more=k==='dict'?`<p>Answer: <span class=\"zh\">${esc(q.raw)}</span>", "const more=k==='dict'?dictDiff(q,a)+`<p>Answer: <span class=\"zh\">${esc(q.raw)}</span>"],
  ["if(k==='dict')return h+`<p>You wrote: <span class=\"zh no\">${esc(a||'(nothing)')}</span></p>", "if(k==='dict')return h+(dictDiff(q,a)||`<p>You wrote: <span class=\"zh no\">${esc(a||'(nothing)')}</span></p>`)+`"],
];
for (const f of process.argv.slice(2)) {
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('function dictDiff(')) { console.log('bỏ qua', f); continue; }
  const zh = /hsk/.test(f), R = zh ? RZ : RJ;
  for (const [x, y] of R) { const n = s.split(x).length - 1; if (n !== 1) throw new Error(`${f}: cần 1 chỗ, thấy ${n}: ${x.slice(0, 60)}`); s = s.replace(x, () => y); }
  const anchor = zh ? 'function dictOk(q,v){' : 'function dictOk(q,v){';
  if (s.split(anchor).length !== 2) throw new Error(f + ': không thấy dictOk');
  s = s.replace(anchor, () => (zh ? ZH : JA) + anchor);
  fs.writeFileSync(f, s); console.log('xong', f);
}
