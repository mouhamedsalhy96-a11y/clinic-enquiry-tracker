import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function load(file, imports) {
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loadedModule = { exports: {} };
  new Function('require', 'module', 'exports', js)(name => {
    if (name === '@/lib/request-origin') return load('src/lib/request-origin.ts', {});
    if (!(name in imports)) throw new Error('Unexpected import: ' + name);
    return imports[name];
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

function authActions(client) { return load('src/lib/login.ts', { '@/lib/supabase/server': {createClient: async () => client} }); }
function form(email = 'staff@example.com', password = 'fictional-test-password') { const value = new FormData(); value.set('email', email); value.set('password', password); return value; }
test('login rejects missing credentials before contacting auth', async () => {
  const actions = authActions({});
  assert.match((await actions.login(form('', ''))).error, /Enter your email/);
});
test('invalid credentials never query clinic membership', async () => {
  const actions = authActions({auth:{signInWithPassword:async () => ({data:{user:null},error:{message:'private auth detail'}})}});
  assert.equal((await actions.login(form())).error, 'Unable to sign in. Check your details and try again.');
});
test('a valid account without active membership is signed out and denied', async () => {
  let signedOut = false;
  const actions = authActions({auth:{signInWithPassword:async()=>({data:{user:{id:'staff-id'}},error:null}),signOut:async()=>{signedOut=true;return {error:null};}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{active:false},error:null})})})})});
  assert.match((await actions.login(form())).error,/Staff access is unavailable/);
  assert.equal(signedOut,true);
});
test('active staff login redirects to the protected workspace', async () => {
  const actions = authActions({auth:{signInWithPassword:async()=>({data:{user:{id:'staff-id'}},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{active:true},error:null})})})})});
  assert.equal((await actions.login(form())).error, '');
});
test('status writes are scoped to the verified clinic and only change status', async () => {
  const calls = [];
  const query = {eq:(...args)=>{calls.push(['eq',...args]);return query;},select:()=>query,single:async()=>({data:{status:'resolved',updated_at:'2026-11-09T12:00:00Z'},error:null})};
  const client = {from:table=>{calls.push(['table',table]);return {update:value=>{calls.push(['update',value]);return query;}};}};
  const actions = load('src/lib/staff-mutations.ts', {'server-only':{},'@/lib/staff-api':{requireStaff:async()=>({client,clinicId:'verified-clinic',user:{id:'verified-user'}})},'@/lib/enquiries':{statuses:['new','in_progress','resolved']}});
  const id = 'e1b80340-0501-4ed1-af34-8691847e419a';
  assert.equal((await actions.saveStatus(id,'resolved')).status,'resolved');
  assert.deepEqual(calls,[['table','enquiries'],['update',{status:'resolved'}],['eq','id',id],['eq','clinic_id','verified-clinic']]);
  assert.ok((await actions.saveStatus(id,'unknown')).error);
});
test('note writes cannot proceed when membership verification fails', async () => {
  const actions = load('src/lib/staff-mutations.ts', {'server-only':{},'@/lib/staff-api':{requireStaff:async()=>{throw new Error('DENIED');}},'@/lib/enquiries':{statuses:['new','in_progress','resolved']}});
  await assert.rejects(actions.saveNote('e1b80340-0501-4ed1-af34-8691847e419a','Sample administrative note'),/DENIED/);
});


function logoutRoute(signOut, onCreate = () => {}) {
  return load('src/app/auth/logout/route.ts', {
    'next/server': { NextResponse: { redirect: (url, status) => new Response(null, {status, headers:{location:String(url)}}) } },
    '@/lib/supabase/server': { createClient: async options => { onCreate(options); return {auth:{signOut}}; } },
  });
}
const logoutRequest = origin => new Request('http://localhost:3000/auth/logout', {method:'POST', headers: origin ? {origin,host:"localhost:3000"} : {host:"localhost:3000"}});
test('logout uses a cookie-writing client and redirects with 303 after success', async () => {
  let options, scope;
  const route = logoutRoute(async value => {scope=value;return {error:null};}, value => {options=value;});
  const response = await route.POST(logoutRequest('http://localhost:3000'));
  assert.deepEqual(options,{writable:true});
  assert.deepEqual(scope,{scope:'local'});
  assert.equal(response.status,303);
  assert.equal(response.headers.get('location'),'http://localhost:3000/login');
  assert.equal(response.headers.get('cache-control'),'private, no-store');
});
test('logout rejects cross-site and missing-origin requests without touching auth', async () => {
  let calls=0;
  const route = logoutRoute(async()=>{calls++;return {error:null};});
  assert.equal((await route.POST(logoutRequest('https://untrusted.example'))).status,403);
  assert.equal((await route.POST(logoutRequest(null))).status,403);
  assert.equal(calls,0);
});
test('logout failures redirect to recoverable feedback instead of crashing the inbox', async () => {
  for (const signOut of [async()=>({error:{message:'private detail'}}),async()=>{throw new Error('network failed');}]) {
    const response = await logoutRoute(signOut).POST(logoutRequest('http://localhost:3000'));
    assert.equal(response.status,303);
    assert.equal(response.headers.get('location'),'http://localhost:3000/login?reason=signout');
  }
});


function loginRoute(login) {
  return load('src/app/auth/login/route.ts', {
    'next/server': { NextResponse: { redirect: (url,status) => new Response(null,{status,headers:{location:String(url)}}) } },
    '@/lib/login': {login},
  });
}
function loginRequest(origin='http://localhost:3000', body='email=staff%40example.com&password=fictional-test-password') {
  return new Request('http://localhost:3000/auth/login',{method:'POST',headers:{host:'localhost:3000',origin,'content-type':'application/x-www-form-urlencoded'},body});
}
test('login endpoint redirects active staff without exposing submitted credentials', async () => {
  let submitted;
  const route=loginRoute(async value=>{submitted=value;return {error:'',reason:''};});
  const response=await route.POST(loginRequest());
  assert.equal(submitted.get('email'),'staff@example.com');
  assert.equal(response.status,303);
  assert.equal(response.headers.get('location'),'http://localhost:3000/staff');
  assert.equal(response.headers.get('cache-control'),'private, no-store');
});
test('login endpoint redirects failures with only a fixed reason code', async () => {
  const response=await loginRoute(async()=>({error:'private auth message',reason:'credentials'})).POST(loginRequest());
  assert.equal(response.status,303);
  assert.equal(response.headers.get('location'),'http://localhost:3000/login?reason=credentials');
});
test('cross-site login cannot invoke authentication', async () => {
  let calls=0;
  const route=loginRoute(async()=>{calls++;return {error:'',reason:''};});
  assert.equal((await route.POST(loginRequest('https://untrusted.example'))).status,403);
  assert.equal(calls,0);
});
test('oversized login bodies are rejected before authentication', async () => {
  const response=await loginRoute(async()=>{throw new Error('must not authenticate');}).POST(loginRequest('http://localhost:3000','password='+ 'x'.repeat(17000)));
  assert.equal(response.status,413);
});
class ApiError extends Error {constructor(status,message){super(message);this.status=status;}}
function staffRoute(mutations) { return load('src/app/api/staff/enquiries/[id]/route.ts',{'@/lib/staff-mutations':mutations,'@/lib/staff-api':{StaffApiError:ApiError}}); }
const staffContext={params:Promise.resolve({id:'e1b80340-0501-4ed1-af34-8691847e419a'})};
function staffRequest(method,body,origin='http://127.0.0.1:3000') {return new Request('http://localhost:3000/api/staff/enquiries/e1b80340-0501-4ed1-af34-8691847e419a',{method,headers:{host:'127.0.0.1:3000',origin,'content-type':'application/json'},body:JSON.stringify(body)});}
test('note endpoint returns JSON and passes only text and route ID to the save function',async()=>{
 let args;
 const route=staffRoute({saveNote:async(...values)=>{args=values;return {note:{id:'note-id',text:values[1],createdAt:'2026-11-09T12:00:00Z'}};}});
 const response=await route.POST(staffRequest('POST',{text:'Opening hours checked.',author_id:'attacker',clinic_id:'wrong'}),staffContext);
 assert.equal(response.status,200);assert.ok(response.headers.get('content-type').includes('application/json'));
 assert.deepEqual(args,['e1b80340-0501-4ed1-af34-8691847e419a','Opening hours checked.']);
 assert.equal((await response.json()).note.text,'Opening hours checked.');
});
test('staff note and status endpoints return session errors without HTML redirects',async()=>{
 const route=staffRoute({saveNote:async()=>{throw new ApiError(401,'Sign in again.');},saveStatus:async()=>{throw new ApiError(403,'No clinic access.');}});
 const note=await route.POST(staffRequest('POST',{text:'Sample note'}),staffContext);
 assert.equal(note.status,401);assert.deepEqual(await note.json(),{error:'Sign in again.'});
 const status=await route.PATCH(staffRequest('PATCH',{status:'resolved'}),staffContext);assert.equal(status.status,403);
});
test('staff mutations reject foreign origins before performing writes',async()=>{
 const route=staffRoute({saveNote:async()=>{throw new Error('must not write');}});
 assert.equal((await route.POST(staffRequest('POST',{text:'Sample note'},'https://untrusted.example'),staffContext)).status,403);
});
test('note insertion uses the verified author and checks the assigned clinic',async()=>{
 const calls=[];let payload;
 const query={eq:(...args)=>{calls.push(args);return query;},single:async()=>({data:{id:'enquiry'},error:null})};
 const client={from:table=>table==='enquiries'?{select:()=>query}:{insert:value=>{payload=value;return {select:()=>({single:async()=>({data:{id:'saved-note',text:value.text,created_at:'2026-11-09T12:00:00Z'},error:null})})};}}};
 const actions=load('src/lib/staff-mutations.ts',{'server-only':{},'@/lib/staff-api':{requireStaff:async()=>({client,user:{id:'verified-user'},clinicId:'verified-clinic'})},'@/lib/enquiries':{statuses:['new','in_progress','resolved']}});
 const id='e1b80340-0501-4ed1-af34-8691847e419a';
 const result=await actions.saveNote(id,'  Opening hours checked.  ');
 assert.equal(result.note.id,'saved-note');assert.deepEqual(payload,{enquiry_id:id,author_id:'verified-user',text:'Opening hours checked.'});assert.deepEqual(calls,[['id',id],['clinic_id','verified-clinic']]);
});
