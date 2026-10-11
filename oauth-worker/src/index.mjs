const COOKIE = '__Host-furever-oauth';
const TTL = 600;
const encoder = new TextEncoder();
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64 = value => Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), char => char.charCodeAt(0));
const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
const cookie = value => `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${value ? TTL : 0}`;
async function stateKey(secret) {
 return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',encoder.encode(secret)),{name:'AES-GCM'},false,['encrypt','decrypt']);
}
async function seal(data, secret) {
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await stateKey(secret),encoder.encode(JSON.stringify(data)));
 return `${b64(iv)}.${b64(encrypted)}`;
}
async function unseal(value, secret) {
 const [iv,data]=value.split('.');
 return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},await stateKey(secret),unb64(data))));
}
function headers(extra={}) {
 return {'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',...extra};
}
function error(message,status=400) {
 return new Response(message,{status,headers:headers({'Content-Type':'text/plain; charset=utf-8','Set-Cookie':cookie('')})});
}
function success(token,origin) {
 const nonce=random();
 const message=JSON.stringify(`authorization:github:success:${JSON.stringify({token,provider:'github'})}`).replace(/</g,'\\u003c');
 const target=JSON.stringify(origin);
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Furever Home login</title></head><body><p>Completing GitHub login. You can close this window after returning to the CMS.</p><script nonce="${nonce}">
 const target=${target};
 if(window.opener){
  const receive=(event)=>{
   if(event.origin!==target||event.source!==window.opener||event.data!=='authorizing:github')return;
   window.removeEventListener('message',receive);
   window.opener.postMessage(${message},target);
  };
  window.addEventListener('message',receive);
  window.opener.postMessage('authorizing:github',target);
 }else{document.querySelector('p').textContent='Open login from the website CMS so it can receive your sign-in.';}
 </script></body></html>`;
 return new Response(html,{headers:headers({'Content-Type':'text/html; charset=utf-8','Set-Cookie':cookie(''),'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`})});
}
export async function handleRequest(request,env,fetcher=fetch) {
 const url=new URL(request.url);
 const clientId=String(env.GITHUB_CLIENT_ID||'').trim();
 const clientSecret=String(env.GITHUB_CLIENT_SECRET||'').trim();
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:headers({Allow:'GET'})});
 if(url.pathname==='/health')return new Response(JSON.stringify({service:'furever-github-oauth',configured:Boolean(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET&&env.STATE_SECRET)}),{headers:headers({'Content-Type':'application/json'})});
 if(!['/auth','/callback'].includes(url.pathname))return new Response('Furever Home GitHub OAuth. Start login from the website /admin/ page.',{status:url.pathname==='/'?200:404,headers:headers()});
 if(!clientId||!clientSecret||!env.STATE_SECRET||env.STATE_SECRET.length<32)return error('OAuth setup is incomplete. Configure the Worker secrets.',503);
 const origin=new URL(env.CMS_ORIGIN).origin;
 const authOrigin=new URL(env.AUTH_ORIGIN).origin;
 if(url.origin!==authOrigin)return error('Use the configured OAuth domain.',400);
 const callback=`${authOrigin}/callback`;
 if(url.pathname==='/auth') {
  if(url.searchParams.get('provider')!=='github'||url.searchParams.get('site_id')!==new URL(origin).hostname)return error('This login request is not for the configured CMS.',403);
  const state=random(),verifier=random();
  const session={state,verifier,origin,created:Date.now()};
  const authorize=new URL('https://github.com/login/oauth/authorize');
  authorize.search=new URLSearchParams({client_id:clientId,redirect_uri:callback,scope:env.GITHUB_SCOPE||'public_repo',state,code_challenge:b64(await crypto.subtle.digest('SHA-256',encoder.encode(verifier))),code_challenge_method:'S256',allow_signup:'false'}).toString();
  return new Response(null,{status:302,headers:headers({Location:authorize.href,'Set-Cookie':cookie(await seal(session,env.STATE_SECRET))})});
 }
 const rawCookie=request.headers.get('Cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
 let session;
 try{session=await unseal(rawCookie||'',env.STATE_SECRET);}catch{return error('Login session is missing or invalid. Start login again.');}
 const age=Date.now()-session.created;
 if(!Number.isFinite(age)||age<0||age>TTL*1000||session.origin!==origin||!session.state||session.state!==url.searchParams.get('state'))return error('Login session expired or state did not match. Start login again.');
 if(url.searchParams.has('error'))return error('GitHub authorization was cancelled or denied.');
 const code=url.searchParams.get('code');
 if(!code)return error('GitHub did not provide an authorization code.');
 try {
  const response=await fetcher('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:clientId,client_secret:clientSecret,code,redirect_uri:callback,code_verifier:session.verifier})});
  const result=await response.json();
  if(!response.ok||!result.access_token||result.error){
   const messages={
    incorrect_client_credentials:'GitHub rejected the OAuth app credentials. Update GITHUB_CLIENT_SECRET with a Client Secret from the same GitHub OAuth App as GITHUB_CLIENT_ID, then start a new login.',
    redirect_uri_mismatch:'GitHub rejected the callback URL. Set the OAuth App callback to '+callback+', then start a new login.',
    bad_verification_code:'GitHub rejected the authorization code or PKCE verification. Close this popup and start a fresh login from the CMS; do not refresh an old callback page.',
    unverified_user_email:'Verify your primary email address in GitHub account settings, then start a new login.'
   };
   return error(Object.hasOwn(messages,result.error)?messages[result.error]:'GitHub could not complete authorization (HTTP '+response.status+'). Start login again.',502);
  }
  const apiHeaders={Authorization:`Bearer ${result.access_token}`,Accept:'application/vnd.github+json','User-Agent':'furever-github-oauth','X-GitHub-Api-Version':'2022-11-28'};
  const userResponse=await fetcher('https://api.github.com/user',{headers:apiHeaders});
  const user=await userResponse.json();
  const users=String(env.ALLOWED_GITHUB_USERS||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
  if(!userResponse.ok||!users.includes(String(user.login).toLowerCase()))return error('This GitHub account is not an allowed CMS editor.',403);
  if(!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY||''))return error('The Worker repository setting is invalid.',503);
  const repoResponse=await fetcher(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}`,{headers:apiHeaders});
  const repo=await repoResponse.json();
  if(!repoResponse.ok||repo.permissions?.push!==true)return error('This GitHub account needs write access to the content repository.',403);
  return success(result.access_token,origin);
 }catch{return error('The login provider could not be reached. Start login again.',502);}
}
export default {fetch(request,env){return handleRequest(request,env);}};
