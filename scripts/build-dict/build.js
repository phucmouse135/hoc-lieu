// Sinh dữ liệu tra Kanji/Hán tự cho public/tools/ từ dữ liệu nguồn (xem fetch.sh) + dữ liệu sẵn có trong các app JLPT/HSK.
// Dùng: node scripts/build-dict/build.js <RAW>   → ghi vào public/data/
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const RAWDIR = process.argv[2] || path.join(__dirname, 'raw');
const ROOT = path.resolve(__dirname, '../..'), PUB = path.join(ROOT, 'public'), OUT = path.join(PUB, 'data');
const rd = f => fs.readFileSync(path.join(RAWDIR, f));
const gz = f => zlib.gunzipSync(rd(f)).toString('utf8');
const euc = f => new TextDecoder('euc-jp').decode(rd(f));
const cp = c => c.codePointAt(0);
const chunk = c => (cp(c) % 64).toString(16).padStart(2, '0');
const uniq = a => [...new Set(a)];
const write = (rel, obj) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(obj)); return fs.statSync(f).size; };

// ---------- Bộ thủ Khang Hy (bảng tự soạn) ----------
const RAD = fs.readFileSync(path.join(__dirname, 'radicals.txt'), 'utf8').split('\n').filter(l => l && l[0] !== '#').map(l => {
  const [n, c, v, s, hv, m] = l.split('|'); return { n: +n, c, v: [...v], s: +s, hv, m };
});
if (RAD.length !== 214) throw new Error('radicals.txt phải có 214 dòng');

// ---------- Dữ liệu trong app (đọc bằng eval vì là file của chính repo) ----------
function appObj(file, prefix) {
  const L = fs.readFileSync(path.join(PUB, file), 'utf8').split('\n');
  const i = L.findIndex(l => l.startsWith(prefix));
  return eval('(' + L[i].slice(prefix.length).replace(/;\s*$/, '') + ')');
}
const lines = s => (s || '').split('\n').map(x => x.trim()).filter(Boolean);
const JA = {}, JW = {}, COMP = {}; // JA[c]={hv,vi,tip,kp,kh,lv}; JW[c]=[[w,r,m,lv]]; COMP[comp]={hv,vi,base}
for (const lv of [5, 4, 3, 2, 1]) {
  const R = appObj(`japanese/jlpt-n${lv}.html`, 'const RAW=');
  for (const k of [5, 4, 3, 2, 1]) for (const ln of lines(R['k' + k])) {
    const [c, hv, m, tip, ws] = ln.split('|');
    const e = JA[c] || (JA[c] = { lv: k });
    e.lv = Math.max(e.lv, k); e.hv = e.hv || hv; e.vi = e.vi || m; e.tip = e.tip || tip || '';
    for (const x of (ws || '').split(';').filter(Boolean)) { const [w, r, mm] = x.split('='); addJW(w, r, mm, k); }
  }
  for (const ln of lines(R.kp)) { const [c, kp, kh] = ln.split('|'); const e = JA[c] || (JA[c] = {}); if (kp && !e.kp) e.kp = kp; if (kh && !e.kh) e.kh = kh; }
  for (const ln of lines(R.kc)) { const [c, hv, m, b] = ln.split('|'); if (!COMP[c]) COMP[c] = { hv, vi: m, b: b || '' }; }
  for (const ln of lines(R.v5)) { if (ln[0] === '#') continue; const [w, r, m] = ln.split('|'); if (w) addJW(w, r, m, lv); }
}
function addJW(w, r, m, lv) {
  for (const c of new Set([...w])) {
    if (!/\p{Script=Han}/u.test(c)) continue;
    const a = JW[c] || (JW[c] = []);
    const old = a.find(x => x[0] === w); if (old) { old[3] = Math.max(old[3], lv); continue; }
    a.push([w, r, m, lv]);
  }
}
const HZA = {}, HW = {}; // HSK app: hanzi hint & component tree
for (let lv = 1; lv <= 6; lv++) {
  const D = appObj(`chinese/hsk${lv}.html`, 'const DATA=');
  for (const ln of lines(D.kp)) { const [c, kp, kh] = ln.split('|'); if (!HZA[c]) HZA[c] = { kp, kh }; }
  for (const c in D.HZ) { const e = HZA[c] || (HZA[c] = {}); e.t = e.t || D.HZ[c].t; e.app = Math.min(e.app || 9, lv); }
}

// ---------- KANJIDIC2 ----------
const KD = {};
for (const m of gz('kanjidic2.xml.gz').matchAll(/<character>([\s\S]*?)<\/character>/g)) {
  const x = m[1], c = /<literal>(.*?)<\/literal>/.exec(x)[1];
  const all = (re) => [...x.matchAll(re)].map(r => r[1]);
  const num = (re) => { const r = re.exec(x); return r ? +r[1] : 0; };
  KD[c] = {
    on: all(/<reading r_type="ja_on">(.*?)<\/reading>/g), kun: all(/<reading r_type="ja_kun">(.*?)<\/reading>/g),
    vn: all(/<reading r_type="vietnam">(.*?)<\/reading>/g), py: all(/<reading r_type="pinyin">(.*?)<\/reading>/g),
    en: all(/<meaning>(.*?)<\/meaning>/g), nan: all(/<nanori>(.*?)<\/nanori>/g),
    r: num(/<rad_value rad_type="classical">(\d+)/), sc: num(/<stroke_count>(\d+)/), g: num(/<grade>(\d+)/),
    f: num(/<freq>(\d+)/), jo: num(/<jlpt>(\d+)/),
  };
}

// ---------- Unihan ----------
const UH = {};
for (const f of fs.readdirSync(path.join(RAWDIR, 'unihan'))) {
  for (const ln of fs.readFileSync(path.join(RAWDIR, 'unihan', f), 'utf8').split('\n')) {
    if (!ln.startsWith('U+')) continue;
    const [u, k, v] = ln.split('\t');
    if (!['kVietnamese', 'kRSUnicode', 'kTotalStrokes', 'kTraditionalVariant', 'kSimplifiedVariant', 'kMandarin', 'kDefinition'].includes(k)) continue;
    const c = String.fromCodePoint(parseInt(u.slice(2), 16));
    (UH[c] || (UH[c] = {}))[k] = v;
  }
}
const uvar = v => (v || '').split(' ').filter(Boolean).map(u => String.fromCodePoint(parseInt(u.slice(2), 16)));
const rsu = c => { const v = (UH[c] || {}).kRSUnicode; if (!v) return [0, 0]; const [r, s] = v.split(' ')[0].split('.'); return [parseInt(r), +s]; };

// ---------- Âm Hán-Việt (ưu tiên: app → KANJIDIC2 → Unihan) ----------
const hvOf = (c, seen = new Set()) => {
  if (seen.has(c)) return []; seen.add(c);
  if (JA[c] && JA[c].hv) return JA[c].hv.toLowerCase().split(/[,、;\/]\s*/).map(s => s.trim()).filter(Boolean);
  if (KD[c] && KD[c].vn.length) return uniq(KD[c].vn.map(s => s.toLowerCase()));
  if (UH[c] && UH[c].kVietnamese) return UH[c].kVietnamese.split(' ').slice(0, 2);
  for (const t of uvar((UH[c] || {}).kTraditionalVariant)) { const r = hvOf(t, seen); if (r.length) return r; }
  return [];
};

// ---------- Đường nét: path SVG → điểm (trung vị) ----------
function pathPoints(d) {
  const toks = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+)(?:e-?\d+)?/g); let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0; const pts = [];
  const n = () => +toks[i++];
  const cubic = (x1, y1, x2, y2, x3, y3) => { for (let t = 1; t <= 8; t++) { const s = t / 8, u = 1 - s; pts.push([u*u*u*x + 3*u*u*s*x1 + 3*u*s*s*x2 + s*s*s*x3, u*u*u*y + 3*u*u*s*y1 + 3*u*s*s*y2 + s*s*s*y3]); } cx = x2; cy = y2; x = x3; y = y3; };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M': x = ox + n(); y = oy + n(); sx = x; sy = y; pts.push([x, y]); cmd = rel ? 'l' : 'L'; break;
      case 'L': x = ox + n(); y = oy + n(); pts.push([x, y]); cx = x; cy = y; break;
      case 'H': x = ox + n(); pts.push([x, y]); break;
      case 'V': y = oy + n(); pts.push([x, y]); break;
      case 'C': { const a = [n(), n(), n(), n(), n(), n()]; cubic(ox + a[0], oy + a[1], ox + a[2], oy + a[3], ox + a[4], oy + a[5]); break; }
      case 'S': { const a = [n(), n(), n(), n()]; cubic(2 * x - cx, 2 * y - cy, ox + a[0], oy + a[1], ox + a[2], oy + a[3]); break; }
      case 'Z': x = sx; y = sy; break;
      default: i++;
    }
  }
  return pts;
}
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', NP = 6;
function resample(pts) {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const T = L[L.length - 1] || 1, out = []; let j = 0;
  for (let k = 0; k < NP; k++) { const s = T * k / (NP - 1); while (j < L.length - 2 && L[j + 1] < s) j++;
    const a = pts[j], b = pts[Math.min(j + 1, pts.length - 1)], seg = (L[j + 1] - L[j]) || 1, t = Math.min(1, Math.max(0, (s - L[j]) / seg));
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  return out;
}
// điểm đã chuẩn hoá về 0..1 → chuỗi base64 (2 ký tự/điểm)
const enc = strokes => strokes.map(st => resample(st).map(([x, y]) => B64[Math.max(0, Math.min(63, Math.round(x * 63)))] + B64[Math.max(0, Math.min(63, Math.round(y * 63)))]).join('')).join(' ');

// ================= TIẾNG NHẬT =================
const krad = {}; for (const ln of euc('krad/kradfile').split('\n')) { if (!ln || ln[0] === '#') continue; const [k, r] = ln.split(' : '); if (r) krad[k.trim()] = r.trim().split(/\s+/); }
const radkInfo = {}; for (const ln of euc('krad/radkfile').split('\n')) if (ln[0] === '$') { const [, c, s] = ln.split(/\s+/); radkInfo[c] = +s; }
// RADKFILE dùng chữ thay thế cho một số thành phần → ký tự hiển thị
const RADK_SHOW = { 'ノ': '丿', '｜': '丨', 'ハ': '八', '化': '亻', '个': '𠆢', '并': '丷', '刈': '刂', '込': '⻌', '尚': '⺌', '忙': '忄', '扎': '扌', '汁': '氵', '犯': '犭', '艾': '艹', '邦': '⻏', '阡': '⻖', '老': '耂', '杰': '灬', '礼': '礻', '疔': '疒', '禹': '禸', '初': '衤', '買': '罒', '滴': '啇', '乞': '𠂉', '晴': '龶', '箕': '其', '亡': '亡', '吟': '今', '奄': '奄', '浅': '戋', '耒': '耒', '無': '無', '巳': '巳', '勿': '勿', '五': '五', '元': '元', '屯': '屯', '世': '世' };

const KVG = {};
for (const m of gz('kanjivg.xml.gz').matchAll(/<kanji id="kvg:kanji_([0-9a-f]+)">([\s\S]*?)<\/kanji>/g)) {
  const c = String.fromCodePoint(parseInt(m[1], 16)), x = m[2];
  const paths = [...x.matchAll(/<path [^>]*\bd="([^"]+)"/g)].map(r => r[1]);
  // cây thành phần: g có element/position, sâu tối đa 3 tầng
  const stack = [{ k: [] }];
  for (const t of x.matchAll(/<g\b([^>]*)>|<\/g>/g)) {
    if (t[0] === '</g>') { const node = stack.pop(); const par = stack[stack.length - 1]; if (node.keep) par.k.push(node.v); else par.k.push(...node.k); continue; }
    const el = /kvg:element="([^"]+)"/.exec(t[1]), pos = /kvg:position="([^"]+)"/.exec(t[1]), rad = /kvg:radical="([^"]+)"/.exec(t[1]), orig = /kvg:original="([^"]+)"/.exec(t[1]);
    const node = { k: [], keep: !!(el || pos) && stack.length > 1 }; node.v = [el ? el[1] : '', pos ? pos[1] : '', node.k, rad ? 1 : 0, orig ? orig[1] : ''];
    stack.push(node);
  }
  KVG[c] = { s: paths, t: stack[0].k };
}

const jaSet = Object.keys(KD).filter(c => (KD[c].g || KD[c].jo || KD[c].f || JA[c]) && KVG[c]);
for (const c in JA) if (!jaSet.includes(c) && KVG[c] && KD[c]) jaSet.push(c);
const jaIdx = [], jaMed = {}, jaStroke = {}, jaRadk = {};
for (const c of jaSet) {
  const k = KD[c], a = JA[c] || {}, kv = KVG[c];
  const comps = (krad[c] || []).map(x => RADK_SHOW[x] || x);
  for (const x of comps) (jaRadk[x] || (jaRadk[x] = [])).push(c);
  const words = (JW[c] || []).sort((p, q) => q[3] - p[3]).slice(0, 8);
  jaIdx.push({ c, on: k.on, kun: k.kun, en: k.en.slice(0, 5), hv: hvOf(c), vi: a.vi || '', tip: a.tip || '', kp: a.kp || '', kh: a.kh || '',
    sc: k.sc || kv.s.length, r: k.r, g: k.g, f: k.f, lv: a.lv || 0, cp: comps, kt: kv.t, w: words });
  jaMed[c] = enc(kv.s.map(d => pathPoints(d).map(([x, y]) => [x / 109, y / 109])));
  (jaStroke[chunk(c)] || (jaStroke[chunk(c)] = {}))[c] = kv.s;
}
jaIdx.sort((p, q) => (q.lv - p.lv) || ((p.f || 9999) - (q.f || 9999)) || (p.sc - q.sc));
const jaComps = Object.keys(jaRadk).map(x => [x, radkInfo[Object.keys(RADK_SHOW).find(k => RADK_SHOW[k] === x) || x] || (KD[x] && KD[x].sc) || 0, jaRadk[x].length]).filter(x => x[1]).sort((p, q) => p[1] - q[1] || q[2] - p[2]);

// ================= TIẾNG TRUNG =================
const MD = {}; for (const ln of rd('mmah-dict.txt').toString('utf8').split('\n')) if (ln) { const o = JSON.parse(ln); MD[o.character] = o; }
const MG = {}; for (const ln of rd('mmah-graphics.txt').toString('utf8').split('\n')) if (ln) { const o = JSON.parse(ln); MG[o.character] = o; }
const HSK = JSON.parse(rd('hsk-complete.min.json').toString('utf8'));
const lvNew = l => { const n = l.filter(x => x[0] === 'n').map(x => +x.slice(1)); return n.length ? Math.min(...n) : 0; };
const zhLv = {}, ZW = {};
for (const e of HSK) {
  const L = lvNew(e.l); if (!L) continue; const f = e.f[0];
  for (const c of new Set([...e.s])) {
    if (!/\p{Script=Han}/u.test(c)) continue;
    zhLv[c] = Math.min(zhLv[c] || 9, L);
    (ZW[c] || (ZW[c] = [])).push([e.s, f.i.y, (f.m || []).slice(0, 2).join('; '), L, e.q || 99999]);
  }
}
const zhSet = uniq([...Object.keys(zhLv), ...Object.keys(HZA)]).filter(c => MG[c] && MD[c]);
// thành phần: tách đệ quy theo IDS của Make Me a Hanzi
const parts = (c, d = 0, seen = new Set()) => {
  if (d > 4 || seen.has(c)) return []; seen.add(c);
  const ids = (MD[c] || {}).decomposition || ''; const out = [];
  for (const x of [...ids]) if (/\p{Script=Han}|[⺀-⿟㇀-㇯]/u.test(x) && x !== c) { out.push(x); out.push(...parts(x, d + 1, seen)); }
  return out;
};
const zhIdx = [], zhMed = {}, zhStroke = {}, zhComp = {};
for (const c of zhSet) {
  const m = MD[c], g = MG[c], u = UH[c] || {}, [r] = rsu(c);
  const comps = uniq(parts(c));
  for (const x of comps) (zhComp[x] || (zhComp[x] = [])).push(c);
  const trad = uvar(u.kTraditionalVariant).filter(t => t !== c);
  const viSrc = [c, ...trad].find(x => JA[x] && JA[x].vi);
  const words = (ZW[c] || []).sort((p, q) => p[3] - q[3] || p[4] - q[4]).slice(0, 8).map(w => w.slice(0, 4));
  const ety = m.etymology ? [m.etymology.type, m.etymology.hint || '', m.etymology.phonetic || '', m.etymology.semantic || ''] : 0;
  zhIdx.push({ c, py: m.pinyin, en: m.definition || u.kDefinition || '', hv: hvOf(c), vi: viSrc ? JA[viSrc].vi : '', t: trad,
    sc: g.strokes.length, r, rc: m.radical, ids: m.decomposition, ety, kp: (HZA[c] || {}).kp || '', kh: (HZA[c] || {}).kh || (HZA[c] || {}).t || '',
    lv: zhLv[c] || 0, cp: comps, w: words });
  zhMed[c] = enc(g.medians.map(st => st.map(([x, y]) => [x / 1024, (900 - y) / 1024])));
  (zhStroke[chunk(c)] || (zhStroke[chunk(c)] = {}))[c] = { s: g.strokes, md: g.medians.map(st => st.map(p => p.join(',')).join(' ')) };
}
zhIdx.sort((p, q) => ((p.lv || 99) - (q.lv || 99)) || (p.sc - q.sc));
const zhComps = Object.keys(zhComp).filter(x => zhComp[x].length >= 3).map(x => [x, (MG[x] ? MG[x].strokes.length : 0) || +((UH[x] || {}).kTotalStrokes || '0').split(' ')[0] || 0, zhComp[x].length]).filter(x => x[1]).sort((p, q) => p[1] - q[1] || q[2] - p[2]);
const zhCompIdx = {}; for (const [x] of zhComps) zhCompIdx[x] = zhComp[x].join('');

// ---------- Ghi file ----------
for (const d of ['ja', 'zh']) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
const sizes = {};
sizes['radicals.json'] = write('radicals.json', { rad: RAD, comp: COMP });
sizes['ja/index.json'] = write('ja/index.json', jaIdx);
sizes['ja/comp.json'] = write('ja/comp.json', { list: jaComps, idx: Object.fromEntries(jaComps.map(([x]) => [x, jaRadk[x].join('')])) });
sizes['ja/medians.json'] = write('ja/medians.json', jaMed);
for (const k in jaStroke) write(`ja/s/${k}.json`, jaStroke[k]);
sizes['zh/index.json'] = write('zh/index.json', zhIdx);
sizes['zh/comp.json'] = write('zh/comp.json', { list: zhComps, idx: zhCompIdx });
sizes['zh/medians.json'] = write('zh/medians.json', zhMed);
for (const k in zhStroke) write(`zh/s/${k}.json`, zhStroke[k]);
console.log('ja:', jaIdx.length, 'chữ,', jaComps.length, 'thành phần | zh:', zhIdx.length, 'chữ,', zhComps.length, 'thành phần');
console.log('ja có HV:', jaIdx.filter(x => x.hv.length).length, '| zh có HV:', zhIdx.filter(x => x.hv.length).length, '| zh có nghĩa Việt:', zhIdx.filter(x => x.vi).length);
for (const k in sizes) console.log(k, (sizes[k] / 1024).toFixed(0) + 'KB');
