import { readFile, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { renderPage } from '../web/assets/render-page.mjs';
const root = new URL('../', import.meta.url);
const deployment = JSON.parse(await readFile(new URL('deployment.json',root),'utf8'));
const basePath = process.env.SITE_BASE_PATH ?? (deployment.customDomain ? '' : deployment.basePath);
if(basePath && !/^\/[\w/-]+$/.test(basePath))throw new Error('Invalid site base path.');
const content = JSON.parse(await readFile(new URL('web/content.json', root), 'utf8'));
const template = await readFile(new URL('web/index.html', root), 'utf8');
const embedFallback = await readFile(new URL('web/petfinder-embed.html', root), 'utf8');
const html = renderPage(content, template, {embedFallback,basePath,siteUrl:(deployment.customDomain?'https://'+deployment.customDomain:deployment.siteOrigin)+basePath+'/'});
await rm(new URL('dist/', root), { recursive: true, force: true });
await mkdir(new URL('dist/', root), { recursive: true });
await cp(new URL('web/assets/', root), new URL('dist/assets/', root), { recursive: true });
await cp(new URL('node_modules/decap-cms/dist/',root),new URL('dist/admin/',root),{recursive:true,filter:source=>!source.endsWith('.map')});
await cp(new URL('web/admin/', root), new URL('dist/admin/', root), { recursive: true });
const config=JSON.parse(await readFile(new URL('web/admin/config.yml',root),'utf8'));
config.backend.repo=deployment.repository;
config.backend.base_url=deployment.oauthOrigin;
config.public_folder=`${basePath}/assets/uploads`;
await writeFile(new URL('dist/admin/config.yml',root),JSON.stringify(config,null,2)+'\n');
await writeFile(new URL('dist/assets/page-template.html', root), template);
await writeFile(new URL('dist/index.html', root), html);
await writeFile(new URL('dist/.nojekyll',root),'');
const icon=content.seo.appIcon || content.branding.logo;
const iconPath=icon?.startsWith('/') && !icon.startsWith(basePath+'/') ? basePath+icon : icon;
await writeFile(new URL('dist/site.webmanifest',root),JSON.stringify({
 name:content.branding.name,short_name:content.branding.name,start_url:basePath+'/',scope:basePath+'/',display:'standalone',
 background_color:content.theme.background,theme_color:content.theme.lightBlue,
 icons:iconPath?[{src:iconPath,sizes:'512x512',type:'image/png',purpose:'any'}]:[]
},null,2)+'\n');
if(deployment.customDomain)await writeFile(new URL('dist/CNAME',root),deployment.customDomain+'\n');
console.log(`Built Kitten Rescue CA for ${deployment.customDomain || deployment.siteOrigin+basePath} (self-hosted CMS).`);
