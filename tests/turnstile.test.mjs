import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function load(file,imports,fetcher=fetch) {
 const source=ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const output={exports:{}};
 new Function('require','module','exports','fetch',source)(name=>{if(name==='@/lib/request-origin')return load('src/lib/request-origin.ts',{});if(!(name in imports))throw new Error('Unexpected import '+name);return imports[name];},output,output.exports,fetcher);
 return output.exports;
}
async function verifyWith(fetcher,callback) {
 const previous=process.env.TURNSTILE_SECRET_KEY;process.env.TURNSTILE_SECRET_KEY='fictional-secret-for-tests';
 try{await callback(load('src/lib/turnstile.ts',{'server-only':{}},fetcher).verifyTurnstile);}finally{if(previous===undefined)delete process.env.TURNSTILE_SECRET_KEY;else process.env.TURNSTILE_SECRET_KEY=previous;}
}
test('missing and oversized Turnstile tokens are rejected without a provider request',async()=>verifyWith(async()=>{throw new Error('must not fetch');},async verify=>{
 for(const token of ['',null,'x'.repeat(2049)])assert.equal((await verify(token,'127.0.0.1')).status,422);
}));
test('missing Turnstile secret fails closed',async()=>verifyWith(async()=>{throw new Error('must not fetch');},async verify=>{
 delete process.env.TURNSTILE_SECRET_KEY;const result=await verify('fictional-token','127.0.0.1');assert.equal(result.ok,false);assert.equal(result.status,503);
}));
test('verification sends the token only to Cloudflare and checks hostname and action',async()=>{
 let sent;
 await verifyWith(async(url,options)=>{sent={url,options};return Response.json({success:true,hostname:'127.0.0.1',action:'clinic_enquiry'});},async verify=>{
  assert.equal((await verify('fictional-token','127.0.0.1')).ok,true);
  assert.equal(sent.url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.deepEqual(JSON.parse(sent.options.body),{secret:'fictional-secret-for-tests',response:'fictional-token'});
  assert.equal(sent.options.cache,'no-store');assert.ok(sent.options.signal);
 });
});
test('failed, expired, wrong-host and wrong-action verification cannot pass',async()=>{
 for(const data of [{success:false,'error-codes':['timeout-or-duplicate']},{success:true,hostname:'attacker.example',action:'clinic_enquiry'},{success:true,hostname:'127.0.0.1',action:'other_form'},{}]) {
  await verifyWith(async()=>Response.json(data),async verify=>{const result=await verify('fictional-token','127.0.0.1');assert.equal(result.ok,false);assert.equal(result.status,422);});
 }
});
test('provider downtime and network failures return safe retry feedback',async()=>{
 for(const fetcher of [async()=>new Response(null,{status:503}),async()=>{throw new Error('private network detail');}])await verifyWith(fetcher,async verify=>{
  const result=await verify('fictional-token','127.0.0.1');assert.equal(result.ok,false);assert.equal(result.status,503);assert.ok(!JSON.stringify(result).includes('private network detail'));
 });
});
test('failed security verification never reaches the database submission function',async()=>{
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='development';let writes=0;
 try {
  const route=load('src/app/api/enquiries/route.ts',{'@/lib/turnstile':{verifyTurnstile:async()=>({ok:false,status:422,error:'Complete the new check.'})},'@/lib/public-submission':{submitPublicEnquiry:async()=>{writes++;return {status:201,body:{reference:'must-not-save'}};}}});
  const request=new Request('http://localhost:3000/api/enquiries',{method:'POST',headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','content-type':'application/json'},body:JSON.stringify({turnstileToken:'expired'})});
  const result=await route.POST(request);assert.equal(result.status,422);assert.equal(writes,0);assert.deepEqual(await result.json(),{error:'Complete the new check.'});
 }finally{process.env.NODE_ENV=previous;}
});
