import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker, {handleRequest} from '../oauth-worker/src/index.mjs';
const env={CMS_ORIGIN:'https://pchrisoc.github.io',AUTH_ORIGIN:'https://redirect.simplyhost.org',GITHUB_CLIENT_ID:'test-id',GITHUB_CLIENT_SECRET:'test-secret',STATE_SECRET:'test-state-secret-at-least-thirty-two-characters',GITHUB_REPOSITORY:'pchrisoc/furever',ALLOWED_GITHUB_USERS:'pchrisoc',GITHUB_SCOPE:'public_repo'};
const start=()=>handleRequest(new Request(env.AUTH_ORIGIN+'/auth?provider=github&site_id=pchrisoc.github.io'),env);
async function session(){const response=await start();return{response,state:new URL(response.headers.get('Location')).searchParams.get('state'),cookie:response.headers.get('Set-Cookie').split(';')[0]};}
test('authorization uses fixed callback, limited scope, PKCE, and an encrypted secure cookie',async()=>{
 const {response,state,cookie}=await session();assert.equal(response.status,302);
 const location=new URL(response.headers.get('Location'));assert.equal(location.searchParams.get('redirect_uri'),env.AUTH_ORIGIN+'/callback');assert.equal(location.searchParams.get('scope'),'public_repo');assert.equal(location.searchParams.get('code_challenge_method'),'S256');assert(state.length>=43);assert(!cookie.includes(state));assert(response.headers.get('Set-Cookie').includes('HttpOnly; Secure; SameSite=Lax'));
});
test('rejects another CMS, unsafe methods, missing setup, and callback without session',async()=>{
 assert.equal((await handleRequest(new Request(env.AUTH_ORIGIN+'/auth?provider=github&site_id=evil.example'),env)).status,403);
 assert.equal((await handleRequest(new Request(env.AUTH_ORIGIN+'/auth',{method:'POST'}),env)).status,405);
 assert.equal((await handleRequest(new Request(env.AUTH_ORIGIN+'/auth'),{})).status,503);
 assert.equal((await handleRequest(new Request(env.AUTH_ORIGIN+'/callback?code=x&state=x'),env)).status,400);
});
test('tampered state never reaches token exchange',async()=>{
 const {cookie}=await session();let calls=0;
 const response=await handleRequest(new Request(env.AUTH_ORIGIN+'/callback?code=x&state=wrong',{headers:{Cookie:cookie}}),env,async()=>{calls++;});assert.equal(response.status,400);assert.equal(calls,0);
});
test('successful callback verifies editor and repository, then uses exact-origin Decap handshake',async()=>{
 const {cookie,state}=await session();const calls=[];
 const fetcher=async(url,options)=>{calls.push({url,options});return Response.json(url.includes('access_token')?{access_token:'test-oauth-token'}:url.endsWith('/user')?{login:'pchrisoc'}:{permissions:{push:true}});};
 const response=await handleRequest(new Request(env.AUTH_ORIGIN+'/callback?code=x&state='+state,{headers:{Cookie:cookie}}),env,fetcher);
 assert.equal(response.status,200);const html=await response.text();assert(html.includes('authorization:github:success:'));assert(html.includes('event.source!==window.opener'));assert(html.includes('https://pchrisoc.github.io'));assert(!html.includes('postMessage('+'"*"'));assert(response.headers.get('Content-Security-Policy').includes("script-src 'nonce-"));assert(response.headers.get('Set-Cookie').includes('Max-Age=0'));assert(JSON.parse(calls[0].options.body).code_verifier);assert.equal(calls.length,3);
});
test('denies unauthorized users and accounts without write permission',async()=>{
 for(const [login,push] of [['someone-else',true],['pchrisoc',false]]){
  const {cookie,state}=await session();const fetcher=async url=>Response.json(url.includes('access_token')?{access_token:'test-token'}:url.endsWith('/user')?{login}:{permissions:{push}});
  const response=await handleRequest(new Request(env.AUTH_ORIGIN+'/callback?code=x&state='+state,{headers:{Cookie:cookie}}),env,fetcher);assert.equal(response.status,403);assert(!(await response.text()).includes('test-token'));
 }
});

test('Cloudflare execution context is not treated as the fetch function',async t=>{
 const {cookie,state}=await session();
 t.mock.method(globalThis,'fetch',async url=>Response.json(url.includes('access_token')?{access_token:'context-test-token'}:url.endsWith('/user')?{login:'pchrisoc'}:{permissions:{push:true}}));
 const response=await worker.fetch(new Request(env.AUTH_ORIGIN+'/callback?code=x&state='+state,{headers:{Cookie:cookie}}),env,{waitUntil(){}});
 assert.equal(response.status,200);
});

test('token exchange errors explain recovery without exposing upstream secrets',async()=>{
 const cases={incorrect_client_credentials:'Update GITHUB_CLIENT_SECRET',redirect_uri_mismatch:'Set the OAuth App callback',bad_verification_code:'start a fresh login',unverified_user_email:'Verify your primary email address'};
 for(const [code,message] of Object.entries(cases)){
  const {cookie,state}=await session();
  const response=await handleRequest(new Request(env.AUTH_ORIGIN+'/callback?code=x&state='+state,{headers:{Cookie:cookie}}),env,async()=>Response.json({error:code,error_description:'private-upstream-secret'}));
  assert.equal(response.status,502);const text=await response.text();assert(text.includes(message));assert(!text.includes('private-upstream-secret'));
 }
});
test('app credentials tolerate accidental whitespace in secret prompts',async()=>{
 const padded={...env,GITHUB_CLIENT_ID:' '+env.GITHUB_CLIENT_ID+' ',GITHUB_CLIENT_SECRET:' '+env.GITHUB_CLIENT_SECRET+' '};
 const auth=await handleRequest(new Request(env.AUTH_ORIGIN+'/auth?provider=github&site_id=pchrisoc.github.io'),padded);
 const location=new URL(auth.headers.get('Location'));assert.equal(location.searchParams.get('client_id'),env.GITHUB_CLIENT_ID);
 const cookie=auth.headers.get('Set-Cookie').split(';')[0];
 const response=await handleRequest(new Request(env.AUTH_ORIGIN+'/callback?code=x&state='+location.searchParams.get('state'),{headers:{Cookie:cookie}}),padded,async(url,options)=>{
  if(url.includes('access_token')){const body=JSON.parse(options.body);assert.equal(body.client_id,env.GITHUB_CLIENT_ID);assert.equal(body.client_secret,env.GITHUB_CLIENT_SECRET);return Response.json({access_token:'test-token'});}
  return Response.json(url.endsWith('/user')?{login:'pchrisoc'}:{permissions:{push:true}});
 });
 assert.equal(response.status,200);
});
