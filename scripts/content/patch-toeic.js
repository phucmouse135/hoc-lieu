const fs=require('fs');const [app,...banks]=process.argv.slice(2);let src=fs.readFileSync(app,'utf8');const nl=src.includes('\r\n')?'\r\n':'\n';
const L=src.split(nl),i=L.findIndex(l=>/^const RAW=/.test(l));const pre=L[i].match(/^const RAW=/)[0];
const RAW=eval('('+L[i].slice(pre.length).replace(/;\s*$/,'')+')');const old=JSON.stringify(RAW.les);
const key=['"les":'+old,'"les": '+old].find(k=>L[i].split(k).length===2);if(!key)throw new Error('no les');
if(RAW.les.includes('##F5|')){console.log('đã có F5');process.exit(0)}
const add=banks.map(f=>fs.readFileSync(f,'utf8').replace(/\r/g,'').trim()).join('\n\n');
if(RAW.les.split('\n\n##S3').length!==2)throw new Error('no ##S3 anchor');
const nw=RAW.les.replace('\n\n##S3',()=>'\n\n'+add+'\n\n##S3');
L[i]=L[i].replace(key,()=>key.slice(0,key.indexOf(old))+JSON.stringify(nw));fs.writeFileSync(app,L.join(nl));console.log('xong +',add.split('\n').length,'dòng');
