const http = require('http');
const fs = require('fs');
const path = require('path');
const root = 'C:/Users/Administrator/Desktop/frey.github.io';
const mime = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p==='/') p='/index.html';
  const f = path.join(root, p);
  fs.readFile(f,(e,d)=>{
    if(e){res.writeHead(404);res.end('404');return;}
    res.writeHead(200,{'Content-Type': mime[path.extname(f)]||'application/octet-stream'});
    res.end(d);
  });
}).listen(8123,()=>console.log('serving 8123'));
