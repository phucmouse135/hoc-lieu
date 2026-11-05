/* Lõi trang tra chữ Hán dùng chung cho kanji.html (ja) và hanzi.html (zh).
   Cấu hình: window.DICT = {lang:'ja'|'zh', key:'...', voice:'ja-JP'|'zh-CN'} đặt trước khi nạp file này. */
(function(){
'use strict';
const CF=window.DICT, JA=CF.lang==='ja', DATA='../data/';
/* nhúng trong popup của app: ?embed=1&theme=dark|light */
const QS=new URLSearchParams(location.search),EMB=QS.has('embed');
if(EMB)document.documentElement.classList.add('embed');
if(/^(dark|light)$/.test(QS.get('theme')||''))document.documentElement.setAttribute('data-theme',QS.get('theme'));
if(EMB){addEventListener('keydown',e=>{if(e.key==='Escape'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName))parent.postMessage('dict-close','*')});
  document.addEventListener('click',e=>{const a=e.target.closest('a[href*=".html#"]');if(a&&!a.target&&!a.href.includes('embed=1')){const u=new URL(a.href);u.search=location.search;a.href=u.href}},true)}
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isHan=c=>/\p{Script=Han}/u.test(c);
const cache={};
const load=f=>cache[f]||(cache[f]=fetch(DATA+f).then(r=>{if(!r.ok)throw new Error(f);return r.json()}));
let IDX=[],BY={},RAD=[],COMP={},CMP=null;

/* ---------- lưu trữ cục bộ ---------- */
const LS={get(){try{return JSON.parse(localStorage.getItem(CF.key))||{}}catch(e){return {}}},set(v){try{localStorage.setItem(CF.key,JSON.stringify(v))}catch(e){}}};
let ST=Object.assign({saved:[],recent:[]},LS.get());
const save=()=>LS.set(ST);
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2200)}

/* ---------- chuẩn hoá ---------- */
const vnBase=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'d').toLowerCase().trim();
const hasMark=s=>s.normalize('NFD')!==s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')||/đ/i.test(s);
const kata2hira=s=>s.replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const hira2kata=s=>s.replace(/[\u3041-\u3096]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));

/* romaji → hiragana (chép từ app JLPT) */
const RK=(()=>{const t={a:'あ',i:'い',u:'う',e:'え',o:'お'},row={k:'かきくけこ',s:'さしすせそ',t:'たちつてと',n:'なにぬねの',h:'はひふへほ',m:'まみむめも',r:'らりるれろ',g:'がぎぐげご',z:'ざじずぜぞ',d:'だぢづでど',b:'ばびぶべぼ',p:'ぱぴぷぺぽ'};
  for(const c in row)[...'aiueo'].forEach((v,i)=>t[c+v]=row[c][i]);
  Object.assign(t,{ya:'や',yu:'ゆ',yo:'よ',wa:'わ',wo:'を',we:'うぇ',wi:'うぃ',shi:'し',chi:'ち',tsu:'つ',fu:'ふ',ji:'じ',si:'し',ti:'ち',tu:'つ',hu:'ふ',zi:'じ',di:'ぢ',du:'づ',
    fa:'ふぁ',fi:'ふぃ',fe:'ふぇ',fo:'ふぉ',ja:'じゃ',ju:'じゅ',jo:'じょ',je:'じぇ',sha:'しゃ',shu:'しゅ',sho:'しょ',she:'しぇ',cha:'ちゃ',chu:'ちゅ',cho:'ちょ',che:'ちぇ',
    tsa:'つぁ',thi:'てぃ',dhi:'でぃ',xa:'ぁ',xi:'ぃ',xu:'ぅ',xe:'ぇ',xo:'ぉ',la:'ぁ',li:'ぃ',lu:'ぅ',le:'ぇ',lo:'ぉ',xya:'ゃ',xyu:'ゅ',xyo:'ょ',lya:'ゃ',lyu:'ゅ',lyo:'ょ',xtu:'っ',ltu:'っ',nn:'ん',"n'":'ん',vu:'ゔ'});
  for(const c of 'kgnhbpmr')['a','u','o'].forEach(v=>t[c+'y'+v]=row[c][1]+{a:'ゃ',u:'ゅ',o:'ょ'}[v]);
  ['a','u','o'].forEach(v=>{t['zy'+v]=t['j'+v];t['sy'+v]=t['sh'+v];t['ty'+v]=t['ch'+v];t['cy'+v]=t['ch'+v]});return t})();
function toHira(s,done){
  s=s.toLowerCase();let o='',i=0;
  while(i<s.length){const c=s[i];
    if(!/[a-z'-]/.test(c)){o+=c;i++;continue}
    if(c==='-'){o+='ー';i++;continue}
    if(c===s[i+1]&&/[bcdfghjkmpqrstvwxyz]/.test(c)){o+='っ';i++;continue}
    if(c==='n'&&s[i+1]==='n'){o+='ん';i+=s[i+2]&&/[aiueoy]/.test(s[i+2])?1:2;continue}
    if(c==='n'&&s[i+1]!==undefined&&!/[aiueoy'n]/.test(s[i+1])){o+='ん';i++;continue}
    let hit=0;for(let L=3;L>=1;L--){const p=s.substr(i,L);if(RK[p]){o+=RK[p];i+=L;hit=1;break}}
    if(!hit){if(c==='n'&&done&&i===s.length-1){o+='ん';i++;continue}o+=c;i++}}
  return o;
}
/* pinyin số → dấu (chép từ app HSK) */
const PYV={a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù','ü':'ǖǘǚǜ'};
const PYB=(()=>{const m={};for(const v in PYV)[...PYV[v]].forEach(c=>{m[c]=v;m[c.toUpperCase()]=v.toUpperCase()});return m})();
const pyBase=s=>[...s].map(c=>PYB[c]||c).join('');
function pyMark(letters,t){
  let s=letters.replace(/u:|v/g,'ü').replace(/U:|V/g,'Ü');t=+t;if(!t||t===5)return s;
  const low=s.toLowerCase(),m=/[aeiouü]+(?=[^aeiouü]*$)/.exec(low);if(!m)return s;
  const cl=m[0];let k=cl.indexOf('a');if(k<0)k=cl.indexOf('e');if(k<0)k=cl.indexOf('ou');if(k<0)k=cl.length-1;
  const i=m.index+k,v=low[i],ch=PYV[v][t-1];
  return s.slice(0,i)+(s[i]===s[i].toUpperCase()&&s[i]!==v?ch.toUpperCase():ch)+s.slice(i+1);
}
const pyConv=s=>s.replace(/([a-zA-ZüÜ:]+)([1-5])/g,(_,l,t)=>pyMark(l,t));
const pyTone=s=>[...s].some(c=>PYB[c]);

/* ---------- tên thành phần / bộ ---------- */
const radOf=c=>RAD.find(r=>r.c===c||r.v.includes(c));
function compName(c){
  const k=COMP[c];if(k)return `${k.hv.toLowerCase()} – ${k.vi}`;
  const r=radOf(c);if(r)return `bộ ${r.hv} – ${r.m}`;
  const e=BY[c];if(e)return `${(e.hv||[]).join(', ')}${e.vi?' – '+e.vi:''}`;
  return '';
}

/* ---------- tìm kiếm ---------- */
function readingsOf(e){
  if(JA)return [...e.on.map(kata2hira),...e.kun.map(k=>k.replace(/[.\-]/g,''))];
  return e.py.map(p=>p.normalize('NFC').toLowerCase());
}
function search(q){
  q=q.trim();if(!q)return [];
  const hans=[...q].filter(isHan);
  if(hans.length){
    const out=[];for(const c of hans){if(BY[c]&&!out.includes(BY[c]))out.push(BY[c]);
      for(const e of IDX)if(e.t&&e.t.includes(c)&&!out.includes(e))out.push(e)}
    return out;
  }
  // nhiều âm tiết pinyin (ni3hao3, ni hao) → ghép kết quả từng âm tiết
  if(!JA){const syl=q.toLowerCase().trim().split(/\s+|(?<=[1-5])/).filter(Boolean);
    const PYS=/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?(i?ang|i?ong|uang|ian|iao|uai|uan|ai|ao|an|ei|en|eng|er|ia|ie|in|ing|iu|ou|ua|uo|ue|ui|un|üe|ün|a|e|i|o|u|ü|v)[1-5]?$/;
    if(syl.length>1&&syl.every(s=>PYS.test(pyBase(s.normalize('NFC'))))){const out=[];for(const s of syl)for(const e of search(s).slice(0,6))if(!out.includes(e))out.push(e);if(out.length)return out}}
  const low=q.toLowerCase().normalize('NFC'),base=vnBase(q),marked=hasMark(q);
  let kana='',py='',pyT=false;
  if(JA){kana=/[a-z]/i.test(q)?toHira(low,true):kata2hira(q);if(/[a-z]/.test(kana))kana=''}
  else{py=pyConv(low).replace(/\s+/g,'');pyT=pyTone(py)}
  const sc=[];
  IDX.forEach((e,i)=>{
    let s=99;
    const rs=readingsOf(e);
    if(JA&&kana){if(rs.includes(kana))s=1;else if(kana.length>=2&&rs.some(r=>r.startsWith(kana)))s=3}
    if(!JA&&py){if(rs.some(r=>pyT?r===py:pyBase(r)===py))s=1}
    const hv=e.hv||[];
    if(s>2&&hv.some(h=>marked?h.normalize('NFC')===low:vnBase(h)===base))s=2;
    if(s>4&&base.length>=2){
      const vi=(e.vi||'').toLowerCase().normalize('NFC').split(/[,;()]/).map(x=>x.trim());
      const viB=vi.map(vnBase);
      if((marked?vi:viB).includes(marked?low:base))s=4;
      else if((marked?vi:viB).some(x=>(' '+x+' ').includes(' '+(marked?low:base)+' ')))s=4.5;
    }
    if(s>5&&low.length>=3&&/^[a-z \-']+$/.test(low)){
      const en=(JA?e.en.join('; '):e.en).toLowerCase();
      if(en.split(/[;,]\s*/).includes(low))s=5;else if(new RegExp('\\b'+low.replace(/[^a-z ]/g,'')+'\\b').test(en))s=5.5;
    }
    if(s<99)sc.push([s,i,e]);
  });
  sc.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  return sc.slice(0,120).map(x=>x[2]);
}
function tile(e){
  const r=JA?(e.on[0]||e.kun[0]||''):(e.py[0]||'');
  return `<a class="tile" href="#/k/${encodeURIComponent(e.c)}"><span class="big han">${e.c}</span><span class="tx"><b>${esc((e.hv||[]).slice(0,2).join(', ').toUpperCase())}</b><span class="han">${esc(r)}</span><span>${esc(e.vi||(JA?e.en[0]:String(e.en).split(/[;,]/)[0])||'')}</span></span></a>`;
}

/* ---------- vẽ nét ---------- */
async function strokes(c){
  const k=(c.codePointAt(0)%64).toString(16).padStart(2,'0');
  try{const m=await load(CF.lang+'/s/'+k+'.json');return m[c]||null}catch(e){return null}
}
function kSvg(c,s,o={}){
  const up=o.upto==null?s.length:o.upto;
  let h=`<svg viewBox="0 0 109 109" class="ksv" role="img" aria-label="${c}"><path class="grid" d="M54.5 2V107M2 54.5H107"/>`;
  s.forEach((d,i)=>{if(i<up)h+=`<path class="${o.hi&&i===up-1?'hi':''}" d="${d}"/>`});
  if(o.nums)s.forEach((d,i)=>{const m=d.match(/M\s*(-?[\d.]+)[,\s]\s*(-?[\d.]+)/);if(m)h+=`<text x="${Math.max(3,+m[1]-5)}" y="${Math.max(7,+m[2]-1)}">${i+1}</text>`});
  return h+'</svg>';
}
function hSvg(c,h,o={}){
  const up=o.upto==null?h.s.length:o.upto;let g='',t='';
  h.s.forEach((d,i)=>{if(i<up)g+=`<path class="${o.hi&&i===up-1?'hi':''}" d="${d}"/>`});
  if(o.nums)h.md.forEach((m,i)=>{const [x,y]=m.split(' ')[0].split(',').map(Number);t+=`<text x="${Math.max(8,Math.min(960,x-34))}" y="${Math.max(56,Math.min(1010,914-y))}">${i+1}</text>`});
  return `<svg viewBox="0 0 1024 1024" class="hsv" role="img" aria-label="${c}"><path class="grid" d="M512 0V1024M0 512H1024"/><g transform="scale(1,-1) translate(0,-900)">${g}</g>${t}</svg>`;
}
let HID=0;
function animate(box,c,s){
  const svg=$('svg',box);if(!svg||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let t=0;
  if(JA){$$('path:not(.grid)',svg).forEach(p=>{const L=p.getTotalLength(),dur=260+L*7;p.style.transition='none';p.style.strokeDasharray=L;p.style.strokeDashoffset=L;
    setTimeout(()=>{p.style.transition=`stroke-dashoffset ${dur}ms ease-in-out`;p.style.strokeDashoffset=0},t+=30);t+=dur+120});return}
  const g=$('g',svg),id='h'+(++HID);
  g.innerHTML=s.s.map(d=>`<path class="ghost" d="${d}"/>`).join('')+s.s.map((d,i)=>`<clipPath id="${id}-${i}"><path d="${d}"/></clipPath><path class="hm" style="visibility:hidden" clip-path="url(#${id}-${i})" d="M${s.md[i].split(' ').join('L')}"/>`).join('');
  $$('.hm',g).forEach(p=>{const L=p.getTotalLength(),dur=280+L*.8;p.style.strokeDasharray=L;p.style.strokeDashoffset=L;
    setTimeout(()=>{p.style.visibility='visible';p.style.transition=`stroke-dashoffset ${dur}ms ease-in-out`;p.style.strokeDashoffset=0},t+=40);t+=dur+140});
}

/* ---------- giọng đọc ---------- */
let VO=[];
function loadVoices(){try{VO=speechSynthesis.getVoices().filter(v=>v.lang.replace('_','-').toLowerCase().startsWith(CF.voice.slice(0,2)))}catch(e){}}
loadVoices();try{speechSynthesis.addEventListener('voiceschanged',loadVoices)}catch(e){}
function speak(t){
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang=CF.voice;u.rate=.85;
    const v=VO.find(x=>x.lang.replace('_','-')===CF.voice)||VO[0];if(v)u.voice=v;speechSynthesis.speak(u)}
  catch(e){toast('Trình duyệt này không hỗ trợ đọc.')}
}
const SPK='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>';

/* ---------- nhận dạng chữ viết tay ---------- */
const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',NP=6;
let TPL=null;
function normAll(strokes){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const s of strokes)for(const [x,y] of s){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
  const sz=Math.max(x1-x0,y1-y0,1e-6),cx=(x0+x1)/2,cy=(y0+y1)/2;
  return strokes.map(s=>s.map(([x,y])=>[(x-cx)/sz+.5,(y-cy)/sz+.5]));
}
function resample(pts){
  if(pts.length<2)pts=[pts[0],pts[0]];
  const L=[0];for(let i=1;i<pts.length;i++)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const T=L[L.length-1]||1,out=[];let j=0;
  for(let k=0;k<NP;k++){const s=T*k/(NP-1);while(j<L.length-2&&L[j+1]<s)j++;
    const a=pts[j],b=pts[Math.min(j+1,pts.length-1)],seg=(L[j+1]-L[j])||1,t=Math.min(1,Math.max(0,(s-L[j])/seg));
    out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}
  return out;
}
async function templates(){
  if(TPL)return TPL;
  const m=await load(CF.lang+'/medians.json');TPL=[];
  for(const c in m){const st=m[c].split(' ').map(s=>{const p=[];for(let i=0;i<s.length;i+=2)p.push([B64.indexOf(s[i])/63,B64.indexOf(s[i+1])/63]);return p});
    TPL.push({c,s:normAll(st)})}
  return TPL;
}
const sd=(a,b)=>{let d=0;for(let i=0;i<NP;i++)d+=Math.hypot(a[i][0]-b[i][0],a[i][1]-b[i][1]);return d/NP};
function recognize(user){
  const U=normAll(user.map(resample)),n=U.length,out=[];
  for(const t of TPL){
    const m=t.s.length;if(Math.abs(m-n)>(n<=3?1:2))continue;
    const k=Math.min(n,m);let ord=0;for(let i=0;i<k;i++)ord+=sd(U[i],t.s[i]);ord/=k;
    const used=new Set();let gr=0;for(const u of U){let b=9,bi=-1;t.s.forEach((s,j)=>{if(!used.has(j)){const d=sd(u,s);if(d<b){b=d;bi=j}}});if(bi>=0)used.add(bi);gr+=b<9?b:.5}gr/=n;
    out.push([Math.min(ord,gr+.03)+.06*Math.abs(m-n),t.c]);
  }
  out.sort((a,b)=>a[0]-b[0]);
  return out.slice(0,15).map(x=>x[1]);
}

/* ---------- giao diện ---------- */
const V=$('#view');
const POS={left:'trái',right:'phải',top:'trên',bottom:'dưới',kamae:'bao ngoài',kamae1:'bao (phần 1)',kamae2:'bao (phần 2)',tare:'rủ (trên-trái)',nyo:'đỡ (dưới-trái)',tarekamae:'bao rủ',nyoc:'đỡ',left1:'trái',left2:'trái'};
const IDS={'⿰':['trái – phải',2],'⿱':['trên – dưới',2],'⿲':['trái – giữa – phải',3],'⿳':['trên – giữa – dưới',3],'⿴':['bao quanh',2],'⿵':['bao ba mặt, mở dưới',2],'⿶':['bao ba mặt, mở trên',2],'⿷':['bao ba mặt, mở phải',2],'⿸':['bao trên-trái',2],'⿹':['bao trên-phải',2],'⿺':['bao dưới-trái',2],'⿻':['chồng lên nhau',2]};
const ETY={pictographic:'Tượng hình — vẽ lại hình sự vật',ideographic:'Hội ý — ghép ý nghĩa các thành phần',pictophonetic:'Hình thanh — một phần chỉ nghĩa, một phần chỉ âm'};
const LV=e=>JA?(e.lv?`JLPT N${e.lv}`:''):(e.lv?(e.lv>=7?'HSK 7–9':`HSK ${e.lv}`):'');
const cBtn=c=>BY[c]?`<a href="#/k/${encodeURIComponent(c)}" class="c">${c}</a>`:`<span class="c">${c}</span>`;
function tabsHtml(cur){
  const T=[['s','Tìm chữ'],['rad','Bộ & thành phần'],['draw','Vẽ tay'],['saved','Sổ ôn']];
  return `<nav class="tabs" role="tablist">${T.map(([k,l])=>`<button role="tab" aria-selected="${cur===k}" data-go="#/${k}">${l}${k==='saved'&&ST.saved.length?` (${ST.saved.length})`:''}</button>`).join('')}</nav>`;
}

function viewSearch(q=''){
  V.innerHTML=tabsHtml('s')+`<div class="card"><form class="search" id="sf"><input id="q" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(q)}" placeholder="${JA?'Gõ chữ, romaji (kan), kana, Hán-Việt (han) hoặc nghĩa…':'Gõ chữ, pinyin (han4 / hàn / han), Hán-Việt hoặc nghĩa…'}" aria-label="Tìm chữ"><button class="btn on">Tìm</button></form><p class="hint mute" id="hint"></p></div><div class="res" id="res"></div>`;
  const inp=$('#q'),run=()=>{const v=inp.value;
    let h='';if(v&&!/\p{Script=Han}/u.test(v)){if(JA&&/[a-z]/i.test(v)){const k=toHira(v,true);if(!/[a-z]/.test(k))h=`romaji → <span class="han">${k} · ${hira2kata(k)}</span>`}
      if(!JA&&/\d/.test(v))h=`pinyin → <span class="han">${esc(pyConv(v))}</span>`}
    const r=search(v);
    $('#hint').innerHTML=(h?h+' · ':'')+(v?`${r.length} chữ`:(ST.recent.length?'Xem gần đây:':`Ví dụ: ${JA?'<a href="#/s/kan">kan</a>, <a href="#/s/mizu">mizu</a>, <a href="#/s/thủy">thủy</a>, <a href="#/s/water">water</a>, <a href="#/s/語">語</a>':'<a href="#/s/han4">han4</a>, <a href="#/s/shui">shui</a>, <a href="#/s/thủy">thủy</a>, <a href="#/s/love">love</a>, <a href="#/s/愛">愛</a>'}`));
    $('#res').innerHTML=(v?r:ST.recent.map(c=>BY[c]).filter(Boolean)).map(tile).join('')||(v?'<p class="mute">Không thấy chữ nào khớp.</p>':'');
  };
  let tm;inp.oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>{history.replaceState(null,'','#/s/'+encodeURIComponent(inp.value));run()},180)};
  $('#sf').onsubmit=e=>{e.preventDefault();run()};
  run();if(!q)inp.focus();
}

/* bộ & thành phần */
let SEL=[],RADN=0;
async function viewRad(arg){
  if(!CMP)CMP=await load(CF.lang+'/comp.json');
  if(arg&&arg.startsWith('c:')){SEL=[...arg.slice(2)].filter(x=>CMP.idx[x]);RADN=0}
  else if(arg&&/^\d+$/.test(arg)){RADN=+arg;SEL=[]}
  const mode=RADN?'r':'c';
  V.innerHTML=tabsHtml('rad')+`<div class="card"><div class="row"><button class="btn sm ${mode==='c'?'on':''}" data-m="c">Ghép thành phần</button><button class="btn sm ${mode==='r'?'on':''}" data-m="r">214 bộ Khang Hy</button>
    <span class="mute">Số nét:</span><input id="smin" type="number" min="1" max="40" placeholder="từ" style="width:64px" class="btn sm"><input id="smax" type="number" min="1" max="40" placeholder="đến" style="width:64px" class="btn sm"><button class="btn sm line" id="clr">Bỏ chọn</button></div>
    <p class="mute" id="rhint" style="margin:8px 0 0"></p><div class="cgrid" id="cg"></div></div><div class="res" id="res"></div>`;
  const draw=()=>{
    const smin=+$('#smin').value||0,smax=+$('#smax').value||99;
    let cand=null;
    if(mode==='c'){for(const x of SEL){const s=new Set([...CMP.idx[x]]);cand=cand?cand.filter(c=>s.has(c)):[...s]}}
    else if(RADN)cand=IDX.filter(e=>e.r===RADN).map(e=>e.c);
    let list=(cand||[]).map(c=>BY[c]).filter(e=>e&&e.sc>=smin&&e.sc<=smax).sort((a,b)=>a.sc-b.sc);
    const live=new Set();if(mode==='c'&&SEL.length)for(const e of list)for(const x of e.cp||[])live.add(x);
    let h='',last=0;
    if(mode==='c'){for(const [x,s] of CMP.list){if(s!==last){h+=`<span class="sn">${s}</span>`;last=s}
      h+=`<button data-cp="${x}" class="${SEL.includes(x)?'on':(SEL.length&&!live.has(x)?'off':'')}" title="${esc(compName(x))}">${x}</button>`}}
    else{for(const r of RAD){if(r.s!==last){h+=`<span class="sn">${r.s}</span>`;last=r.s}h+=`<button data-rn="${r.n}" class="${RADN===r.n?'on':''}" title="${r.n}. bộ ${esc(r.hv)} – ${esc(r.m)}">${r.c}</button>`}}
    $('#cg').innerHTML=h;
    const R=RAD[RADN-1];
    $('#rhint').innerHTML=mode==='c'?(SEL.length?`Đã chọn: ${SEL.map(x=>`<b class="han">${x}</b> <span class="mute">(${esc(compName(x))})</span>`).join(' + ')} → ${list.length} chữ`:'Chọn một hay nhiều thành phần mà chữ cần tìm có chứa (kiểu tra 部首/部件). Thành phần mờ là không ghép được.')
      :(R?`<b class="han">${R.c}</b>${R.v.length?` <span class="han">(${R.v.join(' ')})</span>`:''} — bộ số ${R.n}: <b>${esc(R.hv.toUpperCase())}</b>, ${esc(R.m)}, ${R.s} nét → ${list.length} chữ`:'Chọn bộ thủ chính (theo từ điển Khang Hy) để xem các chữ thuộc bộ đó.');
    $('#res').innerHTML=list.slice(0,300).map(tile).join('')+(list.length>300?`<p class="mute">… còn ${list.length-300} chữ, lọc thêm số nét.</p>`:'');
  };
  V.onclick=e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.m){RADN=b.dataset.m==='r'?(RADN||1):0;if(b.dataset.m==='c')SEL=SEL||[];location.hash=b.dataset.m==='r'?'#/rad/'+RADN:'#/rad/c:'+SEL.join('');return}
    if(b.dataset.cp){const x=b.dataset.cp;SEL=SEL.includes(x)?SEL.filter(y=>y!==x):[...SEL,x];history.replaceState(null,'','#/rad/c:'+SEL.join(''));draw();return}
    if(b.dataset.rn){RADN=+b.dataset.rn;history.replaceState(null,'','#/rad/'+RADN);draw();return}
    if(b.id==='clr'){SEL=[];$('#smin').value=$('#smax').value='';history.replaceState(null,'','#/rad/'+(mode==='r'?RADN:'c:'));draw()}};
  $('#smin').oninput=$('#smax').oninput=draw;
  draw();
}

/* vẽ tay */
async function viewDraw(){
  V.innerHTML=tabsHtml('draw')+`<div class="split"><div class="card"><div class="pad" id="pad"><svg viewBox="0 0 100 100" aria-hidden="true"><path class="g" d="M50 0V100M0 50H100"/></svg><canvas aria-label="Khung vẽ chữ"></canvas></div>
    <div class="row" style="margin-top:10px"><button class="btn sm line" id="undo">↶ Xoá nét cuối</button><button class="btn sm line" id="wipe">Xoá hết</button><span class="mute" id="cnt">0 nét</span></div>
    <p class="mute">Viết đúng thứ tự và chiều nét để nhận dạng chính xác hơn. Độ chính xác ở mức vừa phải (so khớp hình dạng nét, chạy hoàn toàn trên máy).</p></div>
    <div class="card"><h3 style="margin-top:0">Chữ gợi ý</h3><div class="mini" id="cand"><span class="mute">Đang nạp dữ liệu nét…</span></div></div></div>`;
  await templates();$('#cand').innerHTML='<span class="mute">Hãy viết một chữ vào khung.</span>';
  const cv=$('#pad canvas'),ctx=cv.getContext('2d');let S=[],cur=null;
  const fit=()=>{const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;cv.width=r.width*d;cv.height=r.height*d;ctx.setTransform(d,0,0,d,0,0);paint()};
  const paint=()=>{const r=cv.getBoundingClientRect();ctx.clearRect(0,0,r.width,r.height);ctx.lineWidth=Math.max(4,r.width/45);ctx.lineCap=ctx.lineJoin='round';ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--ink');
    for(const s of S.concat(cur?[cur]:[])){ctx.beginPath();s.forEach(([x,y],i)=>{i?ctx.lineTo(x*r.width,y*r.height):ctx.moveTo(x*r.width,y*r.height)});if(s.length===1)ctx.lineTo(s[0][0]*r.width+.1,s[0][1]*r.height);ctx.stroke()}};
  const pt=e=>{const b=cv.getBoundingClientRect();return [(e.clientX-b.left)/b.width,(e.clientY-b.top)/b.height]};
  const upd=()=>{$('#cnt').textContent=S.length+' nét';$('#cand').innerHTML=S.length?recognize(S).map(c=>`<a href="#/k/${encodeURIComponent(c)}" title="${esc((BY[c]&&BY[c].hv||[]).join(', '))}">${c}</a>`).join(''):'<span class="mute">Hãy viết một chữ vào khung.</span>'};
  cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);cur=[pt(e)];paint()};
  cv.onpointermove=e=>{if(cur){cur.push(pt(e));paint()}};
  cv.onpointerup=cv.onpointercancel=()=>{if(cur){S.push(cur);cur=null;paint();upd()}};
  $('#undo').onclick=()=>{S.pop();paint();upd()};$('#wipe').onclick=()=>{S=[];paint();upd()};
  fit();addEventListener('resize',fit,{once:true});
}

function viewSaved(){
  const L=ST.saved.map(c=>BY[c]).filter(Boolean);
  V.innerHTML=tabsHtml('saved')+`<div class="card"><p style="margin:0">${L.length?`${L.length} chữ đã lưu trên trình duyệt này.`:'Chưa lưu chữ nào. Mở một chữ rồi bấm ☆ Lưu vào sổ ôn.'}</p>${L.length?`<div class="row" style="margin-top:8px"><button class="btn sm line" id="clrs">Xoá toàn bộ sổ</button><span class="mute" id="cf"></span></div>`:''}</div><div class="res">${L.map(tile).join('')}</div>`;
  const b=$('#clrs');if(b)b.onclick=()=>{if(b.dataset.ok){ST.saved=[];save();viewSaved()}else{b.dataset.ok=1;b.textContent='Bấm lần nữa để xoá'}};
}

/* chi tiết chữ */
function kvTree(nodes,d=0){
  if(!nodes||!nodes.length||d>4)return '';
  return `<ul class="${d?'':'tree'}">${nodes.map(([el,pos,kids,rad,orig])=>{
    const nm=el?compName(el):'';
    const label=el?`${cBtn(el)}${nm?`<span class="mute">${esc(nm)}</span>`:''}`:'<span class="mute">(nhóm nét)</span>';
    return `<li><span class="node">${label}${pos?`<span class="p">${esc(POS[pos]||pos)}</span>`:''}${rad?'<span class="rad">BỘ</span>':''}${orig&&orig!==el?`<span class="mute">biến thể của ${cBtn(orig)}</span>`:''}</span>${kvTree(kids,d+1)}</li>`}).join('')}</ul>`;
}
function parseIds(s){let i=0;const ch=[...s];const rec=()=>{const c=ch[i++];if(c===undefined)return null;if(IDS[c]){const k=[];for(let j=0;j<IDS[c][1];j++)k.push(rec());return {op:c,k}}return {c}};return rec()}
function idsTree(n,d=0,seen=new Set()){
  if(!n)return '';
  if(n.op)return `<li><span class="node"><span class="p">${n.op} ${IDS[n.op][0]}</span></span><ul>${n.k.map(x=>idsTree(x,d+1,seen)).join('')}</ul></li>`;
  if(n.c==='？')return '<li><span class="mute">(nét không tách được)</span></li>';
  const e=BY[n.c],nm=compName(n.c);let sub='';
  if(e&&e.ids&&d<5&&!seen.has(n.c)&&e.ids.length>1&&IDS[[...e.ids][0]]){seen.add(n.c);sub=`<ul>${idsTree(parseIds(e.ids),d+1,seen)}</ul>`}
  return `<li><span class="node">${cBtn(n.c)}${nm?`<span class="mute">${esc(nm)}</span>`:''}${radOf(n.c)?'<span class="rad">BỘ</span>':''}</span>${sub}</li>`;
}
function kpLine(kp){return esc(kp).replace(/\p{Script=Han}|[⺀-⿟]/gu,c=>BY[c]?`<a href="#/k/${encodeURIComponent(c)}" class="han">${c}</a>`:`<span class="han">${c}</span>`)}

async function viewChar(c){
  const e=BY[c];
  if(!e){V.innerHTML=tabsHtml('')+`<div class="card"><p>Chưa có chữ <b class="han">${esc(c)}</b> trong bộ dữ liệu ${JA?'kanji':'Hán tự'} này.</p><p><a href="${JA?'hanzi':'kanji'}.html#/k/${encodeURIComponent(c)}">Thử tra bên ${JA?'tiếng Trung':'tiếng Nhật'}</a> · <a href="#/s">Quay lại tìm</a></p></div>`;return}
  ST.recent=[c,...ST.recent.filter(x=>x!==c)].slice(0,24);save();
  const R=RAD[e.r-1],saved=ST.saved.includes(c);
  const rows=JA?[
    ['Hán-Việt',`<span class="bighv">${esc((e.hv||[]).join(', ').toUpperCase())||'—'}</span>`],
    ['Nghĩa',esc(e.vi||'—')],['Tiếng Anh',esc(e.en.join('; '))],
    ['Âm On',`<span class="han">${esc(e.on.join('、')||'—')}</span>`],['Âm Kun',`<span class="han">${esc(e.kun.join('、').replace(/\./g,'·')||'—')}</span>`]]
   :[['Hán-Việt',`<span class="bighv">${esc((e.hv||[]).join(', ').toUpperCase())||'—'}</span>`],['Pinyin',`<span class="han">${esc(e.py.join(', '))}</span>`],
    ['Nghĩa',esc(e.vi||'—')],['Tiếng Anh',esc(e.en)],...(e.t.length?[['Phồn thể',e.t.map(x=>`<a class="han" href="#/k/${encodeURIComponent(x)}">${x}</a>`).join(' ')]]:[])];
  const chips=[LV(e),`${e.sc} nét`,JA&&e.g?(e.g<=6?`Lớp ${e.g} tiểu học`:e.g===8?'Jōyō (trung học)':'Jinmeiyō (tên người)'):'',JA&&e.f?`Tần suất #${e.f}`:''].filter(Boolean);
  if(!CMP)CMP=await load(CF.lang+'/comp.json');
  const holders=CMP.idx[c];
  const ety=!JA&&e.ety?`<p><b>${esc(ETY[e.ety[0]]||e.ety[0])}</b>${e.ety[2]?` · thanh phù (gợi âm): ${cBtn(e.ety[2])}`:''}${e.ety[3]?` · nghĩa phù (gợi nghĩa): ${cBtn(e.ety[3])}`:''}</p>${e.ety[1]?`<p class="mute">${kpLine(e.ety[1])}</p>`:''}`:'';
  V.innerHTML=tabsHtml('')+`<article class="card"><div class="det"><div><div class="fig" id="fig"><div class="loading">…</div></div>
    <div class="row" style="margin-top:8px"><button class="btn sm" id="anim">▶ Thứ tự viết</button><button class="btn sm line" id="say">${SPK} Nghe</button><button class="btn sm line" id="sv">${saved?'★ Đã lưu':'☆ Lưu vào sổ ôn'}</button></div></div>
    <div><h1 class="han" style="font-size:3.2rem;margin:0;line-height:1.1">${c}</h1><p class="chips">${chips.map(x=>`<span>${esc(x)}</span>`).join('')}</p>
    <dl class="kv">${rows.map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></div></div>
    <div class="steps" id="steps"></div>
    <h2>Phân tích bộ thủ &amp; cấu tạo</h2>
    ${R?`<p>Bộ chính: <a class="han" style="font-size:1.4rem" href="#/rad/${R.n}">${R.c}</a>${R.v.length?` <span class="han">(${R.v.join(' ')})</span>`:''} — bộ số ${R.n} <b>${esc(R.hv.toUpperCase())}</b>: ${esc(R.m)} (${R.s} nét)${!JA&&e.rc&&e.rc!==R.c&&!R.v.includes(e.rc)?` · dạng trong chữ: <span class="han">${e.rc}</span>`:''}. <a href="#/rad/${R.n}">Xem các chữ cùng bộ ›</a></p>`:''}
    ${e.kp?`<p>Cấu tạo: ${kpLine(e.kp)}</p>`:''}
    ${e.kh||e.tip?`<div class="tip">${e.kh?`<div>${kpLine(e.kh)}</div>`:''}${e.tip&&e.tip!==e.kh?`<div>${kpLine(e.tip)}</div>`:''}</div>`:''}
    ${ety}
    ${JA?(e.kt&&e.kt.length?`<h3>Cây thành phần (theo KanjiVG)</h3>${kvTree(e.kt)}`:''):(e.ids&&e.ids.length>1?`<h3>Cây thành phần (IDS)</h3><ul class="tree">${idsTree(parseIds(e.ids))}</ul>`:'')}
    ${e.cp&&e.cp.length?`<p>Thành phần để tra: ${e.cp.map(x=>`<a class="han" href="#/rad/c:${encodeURIComponent(x)}" title="${esc(compName(x))}">${x}</a>`).join(' ')} <span class="mute">(bấm để tìm chữ cùng thành phần)</span></p>`:''}
    ${holders?`<h3>Chữ có chứa <span class="han">${c}</span> (${holders.length})</h3><div class="mini">${[...holders].slice(0,40).map(x=>`<a href="#/k/${encodeURIComponent(x)}">${x}</a>`).join('')}</div>`:''}
    ${e.w.length?`<h2>Từ ví dụ</h2><ul class="words">${e.w.map(w=>`<li><button class="say" data-say="${esc(JA?(w[1]||w[0]):w[0])}" aria-label="Nghe">${SPK}</button><span class="w">${esc(w[0])}</span><span class="han">${esc(w[1])}</span><span>${esc(w[2])}</span>${w[3]?`<span class="lv">${JA?'N'+w[3]:(w[3]>=7?'HSK 7–9':'HSK '+w[3])}</span>`:''}</li>`).join('')}</ul>`:''}
    <p class="mute" style="margin-top:14px"><a href="${JA?'hanzi':'kanji'}.html#/k/${encodeURIComponent(c)}">Tra chữ này bên ${JA?'tiếng Trung':'tiếng Nhật'} ›</a></p></article>`;
  const s=await strokes(c),fig=$('#fig');
  if(s){fig.innerHTML=JA?kSvg(c,s,{nums:1}):hSvg(c,s,{nums:1});
    const n=JA?s.length:s.s.length;$('#steps').innerHTML=Array.from({length:n},(_,i)=>JA?kSvg(c,s,{upto:i+1,hi:1}):hSvg(c,s,{upto:i+1,hi:1})).join('');
    $('#anim').onclick=()=>{fig.innerHTML=JA?kSvg(c,s):hSvg(c,s);animate(fig,c,s)}}
  else{fig.innerHTML=`<div class="loading">Chưa có dữ liệu nét</div>`;$('#anim').disabled=true}
  $('#say').onclick=()=>speak(JA?(e.w[0]?e.w[0][1]:kata2hira(e.on[0]||'')||e.kun[0]||c):c);
  $('#sv').onclick=()=>{ST.saved=ST.saved.includes(c)?ST.saved.filter(x=>x!==c):[c,...ST.saved];save();$('#sv').textContent=ST.saved.includes(c)?'★ Đã lưu':'☆ Lưu vào sổ ôn';toast(ST.saved.includes(c)?'Đã lưu vào sổ ôn':'Đã bỏ khỏi sổ ôn')};
  V.onclick=ev=>{const b=ev.target.closest('[data-say]');if(b)speak(b.dataset.say)};
  scrollTo(0,0);
}

/* ---------- định tuyến ---------- */
function route(){
  const h=decodeURIComponent(location.hash.slice(2)),[r,...rest]=h.split('/'),arg=rest.join('/');
  V.onclick=null;
  if(r==='k'&&arg)return viewChar(arg);
  if(r==='rad')return viewRad(arg);
  if(r==='draw')return viewDraw();
  if(r==='saved')return viewSaved();
  return viewSearch(r==='s'?arg:'');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)location.hash=b.dataset.go});
(async function init(){
  try{
    const [idx,rad]=await Promise.all([load(CF.lang+'/index.json'),load('radicals.json')]);
    IDX=idx;for(const e of IDX)BY[e.c]=e;RAD=rad.rad;COMP=rad.comp;
    addEventListener('hashchange',route);route();
  }catch(err){V.innerHTML=`<div class="card"><p>Không nạp được dữ liệu (${esc(err.message)}). Trang này cần mở qua web (http/https), không mở trực tiếp từ file.</p></div>`}
})();
})();
