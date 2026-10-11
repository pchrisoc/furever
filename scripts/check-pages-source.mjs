import {readFile} from 'node:fs/promises';
const deployment=JSON.parse(await readFile('deployment.json','utf8'));
const token=process.env.GITHUB_TOKEN;
if(!token)throw new Error('GitHub Pages configuration requires the workflow GITHUB_TOKEN.');
const response=await fetch(`https://api.github.com/repos/${deployment.repository}/pages`,{
 headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'}
});
if(!response.ok)throw new Error(`Could not verify the Pages publishing source (HTTP ${response.status}). Set Settings → Pages → Source to GitHub Actions.`);
const settings=await response.json();
if(settings.build_type!=='workflow')throw new Error('Pages is publishing from a branch and can overwrite the built website. Set Settings → Pages → Source to GitHub Actions.');
console.log('Verified GitHub Actions is the Pages publishing source.');
