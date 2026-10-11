import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist');
const config=JSON.parse(await readFile('deployment.json','utf8'));
const prefix=process.env.SITE_BASE_PATH ?? (config.customDomain?'':config.basePath);
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.yml':'text/yaml','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
createServer(async(req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(prefix&&pathname==='/'){res.writeHead(302,{Location:prefix+'/'});return res.end();}
  if(prefix&&pathname!==prefix&&!pathname.startsWith(prefix+'/')){res.writeHead(404);return res.end('Not found');}
  if(prefix)pathname=pathname.slice(prefix.length);
  let file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);return res.end();}
  if((await stat(file)).isDirectory())file=resolve(file,'index.html');
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(8888,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:8888${prefix}/`));
