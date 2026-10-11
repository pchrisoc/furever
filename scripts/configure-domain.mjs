import {readFile,writeFile} from 'node:fs/promises';
const argument=process.argv[2];
if(!argument)throw new Error('Use npm run configure-domain -- cats.example.org (or --github-pages).');
const config=JSON.parse(await readFile('deployment.json','utf8'));
if(argument==='--github-pages'){
 const [owner,repo]=config.repository.split('/');config.customDomain='';config.siteOrigin=`https://${owner}.github.io`;config.basePath=`/${repo}`;
}else{
 if(!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(argument))throw new Error('Provide a hostname only, e.g. cats.example.org.');
 config.customDomain=argument.toLowerCase();config.siteOrigin=`https://${config.customDomain}`;config.basePath='';
}
await writeFile('deployment.json',JSON.stringify(config,null,2)+'\n');
const workerFile='oauth-worker/wrangler.toml';
await writeFile(workerFile,(await readFile(workerFile,'utf8')).replace(/^CMS_ORIGIN = .*$/m,`CMS_ORIGIN = "${config.siteOrigin}"`));
console.log(`Site URL: ${config.siteOrigin}${config.basePath}/\nRebuild and push, update GitHub Pages domain/DNS, and redeploy the OAuth Worker.`);
