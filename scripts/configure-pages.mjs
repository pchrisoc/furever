import {readFile} from 'node:fs/promises';
const deployment=JSON.parse(await readFile('deployment.json','utf8'));
const token=process.env.GITHUB_TOKEN;
if(!token)throw new Error('GitHub Pages configuration requires the workflow GITHUB_TOKEN.');
const response=await fetch(`https://api.github.com/repos/${deployment.repository}/pages`,{
 method:'PUT',
 headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},
 body:JSON.stringify({build_type:'workflow'})
});
if(!response.ok)throw new Error(`Could not select GitHub Actions as the Pages publishing source (HTTP ${response.status}). Set Settings → Pages → Source to GitHub Actions.`);
console.log('GitHub Pages publishing source set to GitHub Actions.');
