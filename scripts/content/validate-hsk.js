// node validate-hsk.js <hskN.html> <newfile> <examNos e.g. 3,4>
const fs=require('fs');const [app,file,nos]=process.argv.slice(2);
const L=fs.readFileSync(app,'utf8').split('\n');const D=eval('('+L[L.findIndex(l=>l.startsWith('const DATA='))].slice(11).replace(/;\s*$/,'')+')');
const parse=t=>{const o={};let s;for(const ln of t.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean)){if(/^\[[\w.]+\]$/.test(ln)){s=ln.slice(1,-1);if(o[s])throw new Error('lặp '+s);o[s]=[];continue}if(!s)throw new Error('dòng ngoài mục: '+ln);o[s].push(ln)}return o};
const A=parse(D.ex),N=parse(fs.readFileSync(file,'utf8'));const err=[];
const bases=Object.keys(A).filter(k=>k.endsWith('.1')).map(k=>k.slice(0,-2));
const shape=a=>a.map(l=>l==='##'?'#':l[0]==='?'?'?'+l.split('|').length:/【/.test(l)?'【'+(l.match(/【/g)||[]).length:'t'+l.split('|').length);
for(const no of nos.split(','))for(const b of bases){const ref=A[b+'.1'],got=N[b+'.'+no];
  if(!got){err.push(`thiếu [${b}.${no}]`);continue}
  const r=shape(ref),g=shape(got);
  if(r.length!==g.length)err.push(`[${b}.${no}] cần ${r.length} dòng như [${b}.1], có ${g.length}`);
  else r.forEach((x,i)=>{if(x[0]!=='t'&&x!==g[i]||x[0]==='t'&&g[i][0]!=='t'&&g[i][0]!=='【')err.push(`[${b}.${no}] dòng ${i+1}: dạng ${g[i]} khác mẫu ${x} (#=khối, ?n=câu hỏi n phần, 【n=số chỗ trống)`)});
  got.forEach((l,i)=>{const ps=l.split('|');if(l[0]==='?'||/^[^【]*\?/.test(l)){const o=ps.slice(1).filter(Boolean);if(new Set(o).size!==o.length)err.push(`[${b}.${no}] dòng ${i+1}: lựa chọn trùng`)}
    for(const m of l.match(/【[^】]*】/g)||[]){const o=m.slice(1,-1).split('|');if(o.length>1&&new Set(o).size!==o.length)err.push(`[${b}.${no}] dòng ${i+1}: lựa chọn trùng trong 【】`)}});
  for(const k of Object.keys(A))if(k.startsWith(b+'.')&&k!==b+'.'+no){const old=new Set(A[k]);got.forEach((l,i)=>{if(l!=='##'&&old.has(l))err.push(`[${b}.${no}] dòng ${i+1}: trùng nguyên văn với [${k}]`)})}
}
for(const k of Object.keys(N))if(!nos.split(',').some(no=>k.endsWith('.'+no)))err.push(`mục thừa [${k}]`);
{const st=x=>x.trim();const per={};for(const k of Object.keys(N)){const no=k.split('.')[1];for(const l of N[k]){let o=null;if(l[0]==='?')o=l.slice(1).split('|').slice(1);else{const i=l.indexOf('?|');if(i>0)o=l.slice(i+2).split('|')}if(o&&o.length>=3&&!/^[\p{Extended_Pictographic}\s‍️]+$/u.test(o[0]))(per[no]=per[no]||[]).push(o.filter(Boolean))}}
for(const no in per){const a=per[no];let c=0;for(const o of a){const L=o.map(x=>st(x).length),mx=Math.max(...L);if(L[0]===mx&&L.filter(x=>x===mx).length===1)c++}const pct=Math.round(c/a.length*100);if(a.length>=8&&pct>35)err.push(`đề ${no}: đáp án đúng là phương án dài nhất ở ${pct}% câu (${c}/${a.length}); tối đa 35%`)}}
if(err.length){console.log('LỖI ('+err.length+'):\n'+err.slice(0,80).join('\n'));process.exit(1)}console.log('OK — đề '+nos+' khớp cấu trúc đề 1 của '+app);
