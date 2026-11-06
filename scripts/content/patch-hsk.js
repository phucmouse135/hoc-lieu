// node patch-hsk.js <hskN.html> <bank.txt> — nối ngân hàng đề mới vào DATA.ex
const fs=require('fs');const [app,bank]=process.argv.slice(2);let src=fs.readFileSync(app,'utf8');
const L=src.split('\n'),i=L.findIndex(l=>l.startsWith('const DATA='));const D=eval('('+L[i].slice(11).replace(/;\s*$/,'')+')');
const oldJ=JSON.stringify(D.ex);const key=['"ex":'+oldJ,'"ex": '+oldJ].find(k=>L[i].split(k).length===2);if(!key)throw new Error('không định vị được ex');
const add=fs.readFileSync(bank,'utf8').replace(/\r/g,'').trim();const head=add.split('\n')[0];if(D.ex.includes(head)){console.log('đã có',head,'bỏ qua');process.exit(0)}
L[i]=L[i].replace(key,()=>key.slice(0,key.indexOf(oldJ))+JSON.stringify(D.ex.replace(/\n*$/,'')+'\n'+add));fs.writeFileSync(app,L.join('\n'));console.log('xong',app,'+',add.split('\n').length,'dòng');
