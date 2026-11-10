import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import ts from 'typescript';
function load(file, imports={}) {
 const js=ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const target={exports:{}};
 new Function('require','module','exports',js)(name=>{if(name==='@/lib/request-origin')return load('src/lib/request-origin.ts',{});if (!(name in imports)) throw new Error('Unexpected import '+name); return imports[name];},target,target.exports);
 return target.exports;
}
const model=load('src/lib/enquiries.ts');
const valid={name:'Demo Taylor',email:'demo@example.com',phone:'',category:'Clinic information',contactMethod:'email',message:'Please share the clinic opening hours.',consent:true,requestId:'00000000-0000-4000-8000-000000000001'};
function service(rpc) {return load('src/lib/public-submission.ts',{'server-only':{},'node:crypto':{createHmac},'@/lib/enquiries':model,'@supabase/supabase-js':{createClient:()=>({rpc})}}).submitPublicEnquiry;}
function withEnv(callback) {
 const oldKey=process.env.SUPABASE_SECRET_KEY,oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
 process.env.SUPABASE_SECRET_KEY='fictional-test-secret';process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';
 return Promise.resolve().then(callback).finally(()=>{if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;});
}
test('invalid enquiries, missing consent, honeypot and missing request IDs never write',async()=>{
 let calls=0;const submit=service(async()=>{calls++;});
 for(const input of [{...valid,email:'invalid'},{...valid,consent:false},{...valid,website:'spam'},{...valid,requestId:'bad'}]) assert.equal((await submit(input)).status,422);
 assert.equal(calls,0);
});
test('missing server secret fails closed',async()=>withEnv(async()=>{
 delete process.env.SUPABASE_SECRET_KEY;
 assert.equal((await service(async()=>{throw new Error('must not write');})(valid)).status,503);
}));
test('server writes only validated input and returns only a reference',async()=>withEnv(async()=>{
 let parameters;
 const submit=service(async(name,args)=>{assert.equal(name,'submit_public_enquiry');parameters=args;return {data:'00000000-0000-4000-8000-000000000002',error:null};});
 const result=await submit({...valid,clinic_id:'attacker-clinic',status:'resolved',notes:['injected']});
 assert.deepEqual(result,{status:201,body:{reference:'00000000-0000-4000-8000-000000000002'}});
 assert.deepEqual(parameters.p_input,model.validateEnquiry(valid).value);
 assert.equal(parameters.p_email_hash.length,64);assert.ok(!parameters.p_email_hash.includes('@'));
 assert.equal(parameters.p_request_id,valid.requestId);
}));
test('identical retries retain the same idempotency ID and payload hash',async()=>withEnv(async()=>{
 const calls=[];const submit=service(async(_name,args)=>{calls.push(args);return {data:'00000000-0000-4000-8000-000000000002',error:null};});
 await submit(valid);await submit(valid);assert.deepEqual(calls[0],calls[1]);
}));
test('database limits and request conflicts return actionable errors',async()=>withEnv(async()=>{
 for(const [message,status] of [['submission_limit',429],['request_conflict',409]]) assert.equal((await service(async()=>({data:null,error:{message}}))(valid)).status,status);
}));
test('database failures never expose provider details or claim a successful save',async()=>withEnv(async()=>{
 const result=await service(async()=>({data:null,error:{message:'private database detail'}}))(valid);
 assert.equal(result.status,503);assert.ok(!JSON.stringify(result).includes('private database detail'));
}));
function route() {return load('src/app/api/enquiries/route.ts',{'@/lib/turnstile':{verifyTurnstile:async()=>({ok:true})},'@/lib/public-submission':{submitPublicEnquiry:async()=>({status:201,body:{reference:'safe-reference'}})}});}
function request(body,origin='http://127.0.0.1:3000') {return new Request('http://localhost:3000/api/enquiries',{method:'POST',headers:{host:'127.0.0.1:3000',origin,'content-type':'application/json'},body});}
test('submission route stays closed in production',async()=>{
 const previous={...process.env};process.env.NODE_ENV='production';process.env.APP_ORIGIN='https://clinic.example';delete process.env.PUBLIC_SUBMISSIONS_ENABLED;
 try{assert.equal((await route().POST(request(JSON.stringify(valid),'https://clinic.example'))).status,503);}finally{process.env=previous;}
});
test('local route rejects foreign origins, malformed JSON and oversized bodies',async()=>{
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='development';
 try {
  assert.equal((await route().POST(request('{}','https://untrusted.example'))).status,403);
  assert.equal((await route().POST(request('invalid'))).status,400);
  assert.equal((await route().POST(request('x'.repeat(17000)))).status,413);
  const result=await route().POST(request(JSON.stringify(valid)));assert.equal(result.status,201);assert.deepEqual(await result.json(),{reference:'safe-reference'});
 }finally{process.env.NODE_ENV=previous;}
});
